import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const expectNoSeriousAccessibilityViolations = async (page: Page) => {
  const result = await new AxeBuilder({ page }).exclude(".react-flow").analyze();
  expect(result.violations.filter((violation) => ["serious", "critical"].includes(violation.impact ?? ""))).toEqual([]);
};

const importDiagram = async (page: Page, body: object, expectedComponents = 42) => {
  await page.locator('input[aria-label="Open diagram JSON"]').setInputFiles({
    name: "diagram.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(body)),
  });
  await expect(page.locator(".react-flow__node-scientific")).toHaveCount(expectedComponents);
};

const openHeaderActions = async (page: Page) => {
  await page.getByRole("button", { name: "More actions" }).click();
};

const branchedRfDiagram = () => {
  const sinks = Array.from({ length: 41 }, (_, index) => ({
    id: `sink-${index}`,
    kind: "termination",
    label: `Load ${index + 1}`,
    x: 350 + index * 10,
    y: 160 + index * 5,
    rotation: 0,
    color: "#20242a",
  }));
  return {
    version: 12,
    title: "Branched RF budget",
    noiseTemperatureK: 580,
    elements: [{ id: "source", kind: "networkanalyzer", label: "VNA", x: 120, y: 160, rotation: 0, color: "#20242a", powerDbm: 0, bandwidthHz: 1e6 }, ...sinks],
    connections: sinks.map((sink, index) => ({ id: `path-${index}`, from: "source", to: sink.id, color: "#20242a", type: "signal", portType: "rf" })),
  };
};

test("destructive actions use a keyboard-operable modal and preserve undo", async ({ page }) => {
  await page.goto("./");
  await importDiagram(page, branchedRfDiagram());
  await openHeaderActions(page);
  await page.getByRole("button", { name: "Reset diagram" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText("Clear the current diagram?", { exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(page.getByRole("button", { name: "More actions" })).toBeFocused();

  await openHeaderActions(page);
  await page.getByRole("button", { name: "Reset diagram" }).click();
  await page.getByRole("button", { name: "Clear diagram" }).click();
  await expect(page.locator(".react-flow__node-scientific")).toHaveCount(0);
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(page.locator(".react-flow__node-scientific")).toHaveCount(42);
  await expectNoSeriousAccessibilityViolations(page);
});

test("budget truncation and kT provenance are visible and exported", async ({ page }) => {
  await page.goto("./");
  await importDiagram(page, branchedRfDiagram());
  await page.getByRole("button", { name: "Review" }).click();
  await page.getByRole("button", { name: /Path budgets/ }).click();
  await expect(page.getByText(/Showing 40 of 41 calculated paths/)).toBeVisible();
  await expect(page.getByText(/kT = -170\.96 dBm\/Hz at 580\.0 K/)).toBeVisible();

  const downloadPromise = page.waitForEvent("download");
  await openHeaderActions(page);
  await page.getByRole("button", { name: "Save JSON" }).click();
  const download = await downloadPromise;
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  const exported = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  expect(exported.noiseTemperatureK).toBe(580);
  expect(exported.budgetAnalysis).toMatchObject({ included: 40, total: 41, truncated: true, totalIsExact: true });
  await expectNoSeriousAccessibilityViolations(page);
});

test("project history restores imported metadata and edited analysis settings", async ({ page }) => {
  await page.goto("./");
  const originalTitle = await page.getByRole("textbox", { name: "Diagram title" }).inputValue();
  await importDiagram(page, branchedRfDiagram());
  await expect(page.getByRole("textbox", { name: "Diagram title" })).toHaveValue("Branched RF budget");

  await page.getByRole("button", { name: "Undo" }).click();
  await expect(page.getByRole("textbox", { name: "Diagram title" })).toHaveValue(originalTitle);
  if ((page.viewportSize()?.width ?? 0) <= 1055) {
    await page.getByRole("button", { name: "Project" }).click();
    await expect(page.getByRole("button", { name: "Project" })).toHaveAttribute("aria-expanded", "true");
    await page.locator("#project-menu").getByRole("button", { name: "Redo" }).click();
  } else {
    await page.getByRole("button", { name: "Redo" }).click();
  }
  await expect(page.getByRole("textbox", { name: "Diagram title" })).toHaveValue("Branched RF budget");

  await page.getByRole("button", { name: "Review" }).click();
  await page.getByRole("button", { name: /Path budgets/ }).click();
  const noiseTemperature = page.getByRole("spinbutton", { name: "RF noise temperature (K)" });
  await expect(noiseTemperature).toHaveValue("580");
  await noiseTemperature.fill("600");
  await noiseTemperature.press("Tab");
  await expect(noiseTemperature).toHaveValue("600");
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(noiseTemperature).toHaveValue("580");
});

test("legacy connection handles are repaired before React Flow renders them", async ({ page }) => {
  const reactFlowWarnings: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "warning" && message.text().includes("Couldn't create edge")) reactFlowWarnings.push(message.text());
  });
  await page.goto("./");
  await importDiagram(page, {
    version: 7,
    title: "Legacy optical path",
    elements: [
      { id: "source", kind: "laser", label: "Source", x: 240, y: 320, rotation: 0, color: "#20242a" },
      { id: "detector", kind: "detector", label: "Detector", x: 760, y: 320, rotation: 0, color: "#20242a" },
    ],
    connections: [{ id: "legacy", from: "source", to: "detector", fromPort: "out", toPort: "in", portType: "optical-free-space", type: "beam", color: "#d55e00" }],
  }, 2);
  await expect(page.locator(".react-flow__edge-path")).toHaveCount(1);
  await expect(page.locator(".react-flow__node-scientific text").filter({ hasText: "Source" })).toHaveAttribute("fill", "currentColor");
  expect(reactFlowWarnings).toEqual([]);
});

test("incompatible legacy endpoints remain visible but are reported as scientific errors", async ({ page }) => {
  await page.goto("./");
  await importDiagram(page, {
    version: 7,
    title: "Invalid mixed-domain path",
    elements: [
      { id: "laser", kind: "laser", label: "Laser", x: 240, y: 320, rotation: 0, color: "#20242a" },
      { id: "vna", kind: "networkanalyzer", label: "VNA", x: 760, y: 320, rotation: 0, color: "#20242a" },
    ],
    connections: [{ id: "mixed", from: "laser", to: "vna", type: "signal", color: "#30343b" }],
  }, 2);
  await expect(page.locator(".react-flow__edge-path")).toHaveCount(1);
  await page.getByRole("button", { name: "Review" }).click();
  await expect(page.getByText("rf path uses an incompatible port", { exact: false })).toBeVisible();
});

test("manual orthogonal waypoints use right-angle segments on screen and in export", async ({ page }) => {
  await page.goto("./");
  await importDiagram(page, {
    version: 12,
    title: "Orthogonal route",
    elements: [
      { id: "source", kind: "networkanalyzer", label: "Source", x: 180, y: 180, rotation: 0, color: "#20242a" },
      { id: "load", kind: "termination", label: "Load", x: 820, y: 480, rotation: 0, color: "#20242a" },
    ],
    connections: [{ id: "route", from: "source", to: "load", fromPort: "output", toPort: "input", portType: "rf", type: "signal", routing: "orthogonal", waypoints: [{ x: 400, y: 300 }], color: "#30343b" }],
  }, 2);
  const renderedPath = await page.locator(".react-flow__edge-path").getAttribute("d");
  const exportedPoints = await page.locator(".diagram-export polyline").getAttribute("points");
  const assertOrthogonal = (source: string | null) => {
    const numbers = (source?.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
    const points = Array.from({ length: numbers.length / 2 }, (_, index) => ({ x: numbers[index * 2], y: numbers[index * 2 + 1] }));
    expect(points.length).toBeGreaterThan(2);
    for (let index = 1; index < points.length; index += 1) {
      expect(points[index].x === points[index - 1].x || points[index].y === points[index - 1].y).toBe(true);
    }
  };
  assertOrthogonal(renderedPath);
  assertOrthogonal(exportedPoints);
});

test("cropped SVG exports resolve colors and include rotated geometry", async ({ page }) => {
  await page.goto("./");
  await importDiagram(page, {
    version: 12,
    title: "Rotated export",
    publication: { pagePreset: "canvas", monochrome: false, showCredit: true, labelScale: 1, cropToContent: true },
    elements: [{ id: "region", kind: "region", label: "Large rotated region", x: 600, y: 400, width: 600, height: 500, rotation: 45, color: "#20242a" }],
    connections: [],
  }, 1);
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export" }).click();
  await page.getByRole("button", { name: "SVG", exact: true }).click();
  const download = await downloadPromise;
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  const svg = Buffer.concat(chunks).toString("utf8");
  expect(svg).not.toContain("var(--color-canvas");
  expect(svg).toContain('fill="#ffffff"');
  const viewBox = svg.match(/viewBox="([^"]+)"/)?.[1].split(/\s+/).map(Number);
  expect(viewBox).toHaveLength(4);
  const [x, y, width, height] = viewBox!;
  expect(x).toBeLessThanOrEqual(212);
  expect(x + width).toBeGreaterThanOrEqual(988);
  expect(y).toBeLessThanOrEqual(12);
  expect(y + height).toBeGreaterThanOrEqual(788);
});

test("duplicate connection identifiers are rejected without replacing the project", async ({ page }) => {
  await page.goto("./");
  await importDiagram(page, {
    version: 12,
    title: "Valid project",
    elements: [
      { id: "source", kind: "laser", label: "Source", x: 240, y: 320, rotation: 0, color: "#20242a" },
      { id: "detector", kind: "detector", label: "Detector", x: 760, y: 320, rotation: 0, color: "#20242a" },
    ],
    connections: [],
  }, 2);
  await page.locator('input[aria-label="Open diagram JSON"]').setInputFiles({
    name: "duplicate-edges.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify({
      version: 12,
      title: "Broken project",
      elements: [
        { id: "source", kind: "laser", label: "Source", x: 240, y: 320, rotation: 0, color: "#20242a" },
        { id: "detector", kind: "detector", label: "Detector", x: 760, y: 320, rotation: 0, color: "#20242a" },
      ],
      connections: [
        { id: "same", from: "source", to: "detector", color: "#d55e00", type: "beam" },
        { id: "same", from: "source", to: "detector", color: "#d55e00", type: "beam" },
      ],
    })),
  });
  await expect(page.locator("body")).toContainText("Invalid diagram");
  await expect(page.getByRole("textbox", { name: "Diagram title" })).toHaveValue("Valid project");
  await expect(page.locator(".react-flow__node-scientific")).toHaveCount(2);
});

test("fit, import errors and blocked PDF export remain usable", async ({ page }) => {
  await page.goto("./");
  await importDiagram(page, branchedRfDiagram());
  await page.locator(".react-flow__node-scientific").first().click();
  const closeSelection = page.locator("#selection-inspector .scientific-task-panel__actions button");
  if (await closeSelection.isVisible()) {
    await closeSelection.click();
    await expect(page.locator("#selection-inspector")).toBeHidden();
  }
  await page.getByRole("button", { name: "Fit selection for editing" }).click();
  const transform = await page.locator(".react-flow__viewport").evaluate((element) => getComputedStyle(element).transform);
  expect(transform.startsWith("matrix(")).toBe(true);
  const scale = Number(transform.split("(")[1].split(",")[0]);
  expect(scale).toBeGreaterThanOrEqual(0.69);

  await page.locator('input[aria-label="Open diagram JSON"]').setInputFiles({ name: "bad.json", mimeType: "application/json", buffer: Buffer.from("{}") });
  await expect(page.locator("body")).toContainText("Invalid diagram");
  await page.evaluate(() => { window.open = () => null; });
  await openHeaderActions(page);
  await page.getByRole("button", { name: "PDF", exact: true }).click();
  await expect(page.locator("body")).toContainText("Allow pop-ups to export the vector PDF");
  await expect(page.locator(".setup-export-receipt")).toHaveCount(0);
});

test("selection tools stay in React and Escape closes one visual layer at a time", async ({ page }) => {
  await page.goto("./");
  await importDiagram(page, {
    version: 12,
    title: "Selection workflow",
    elements: [
      { id: "source", kind: "laser", label: "Source", x: 280, y: 320, rotation: 0, color: "#20242a" },
      { id: "detector", kind: "detector", label: "Detector", x: 760, y: 320, rotation: 0, color: "#20242a" },
    ],
    connections: [],
  }, 2);
  const nodes = page.locator(".react-flow__node-scientific");
  await nodes.first().click();

  if ((page.viewportSize()?.width ?? 0) > 1055) {
    await nodes.nth(1).click({ modifiers: ["Shift"] });
    await expect(page.locator(".react-flow__node-scientific.selected")).toHaveCount(2);
    await page.getByRole("button", { name: "Properties" }).click();
  }

  await expect(page.locator("#selection-inspector")).toBeVisible();
  const selectedCount = (page.viewportSize()?.width ?? 0) > 1055 ? 2 : 1;
  await expect(page.locator(".react-flow__node-scientific.selected")).toHaveCount(selectedCount);
  if (selectedCount === 1) {
    await expect(page.locator("#selection-inspector")).toBeFocused();
    await expect(page.locator(".stage-wrap")).toHaveAttribute("inert", "");
    await expect(page.locator(".stage-wrap")).toHaveAttribute("aria-hidden", "true");
  }

  if (selectedCount > 1) {
    await page.getByRole("button", { name: "Save module" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText("Save selection as module", { exact: true })).toBeVisible();
    await dialog.getByLabel("Module name").fill("RF source module");
    await dialog.getByRole("button", { name: "Save module" }).click();
    await expect(dialog).toBeHidden();
    await expect(page.locator("body")).toContainText("Reusable module saved");
  }

  await page.keyboard.press("Escape");
  await expect(page.locator("#selection-inspector")).toBeHidden();
  await expect(page.locator(".stage-wrap")).not.toHaveAttribute("inert", "");
  await expect(page.locator("#diagram-workspace")).toBeFocused();
  await expect(page.locator(".react-flow__node-scientific.selected")).toHaveCount(selectedCount);

  await page.keyboard.press("Escape");
  await expect(page.locator(".react-flow__node-scientific.selected")).toHaveCount(0);
});

test("Carbon layout controls update the React-owned document state", async ({ page }) => {
  await page.goto("./");
  await page.getByRole("button", { name: "Layout", exact: true }).click();

  const snap = page.getByRole("checkbox", { name: "Snap to grid" });
  await expect(snap).toBeChecked();
  await snap.focus();
  await page.keyboard.press("Space");
  await expect(snap).not.toBeChecked();

  await page.getByRole("button", { name: "Publication", exact: true }).click();
  await page.getByRole("combobox", { name: "Page" }).selectOption("a3");
  await expect(page.getByRole("combobox", { name: "Page" })).toHaveValue("a3");

  const monochrome = page.getByRole("checkbox", { name: "Monochrome" });
  await monochrome.focus();
  await page.keyboard.press("Space");
  await expect(monochrome).toBeChecked();

  const labelScale = page.getByRole("slider", { name: /Label scale/ });
  await labelScale.focus();
  await page.keyboard.press("ArrowRight");
  await expect(labelScale).toHaveAttribute("aria-valuenow", "1.1");
});

test("the scientific viewport follows layout changes without feedback shifting the stage", async ({ page }) => {
  await page.goto("./");
  await importDiagram(page, {
    version: 12,
    title: "Ring cavity",
    viewport: { x: -5000, y: -5000, zoom: 1 },
    viewportMode: "wide",
    viewportWidth: 1440,
    elements: [
      { id: "left", kind: "laser", label: "Source", x: 100, y: 350, rotation: 0, color: "#20242a" },
      { id: "center", kind: "beamsplitter", label: "Coupler", x: 600, y: 350, rotation: 0, color: "#20242a" },
      { id: "right", kind: "detector", label: "Detector", x: 1100, y: 350, rotation: 0, color: "#20242a" },
    ],
    connections: [],
  }, 3);

  await expect.poll(async () => page.evaluate(() => {
    const stage = document.querySelector(".diagram-flow")?.getBoundingClientRect();
    if (!stage) return false;
    return [...document.querySelectorAll(".react-flow__node-scientific")].every((node) => {
      const rect = node.getBoundingClientRect();
      return rect.left >= stage.left - 1 && rect.right <= stage.right + 1 && rect.top >= stage.top - 1 && rect.bottom <= stage.bottom + 1;
    });
  })).toBe(true);

  if ((page.viewportSize()?.width ?? 0) > 1055) {
    await page.getByRole("button", { name: "Components", exact: true }).click();
    await expect.poll(async () => page.evaluate(() => {
      const stage = document.querySelector(".diagram-flow")?.getBoundingClientRect();
      if (!stage) return false;
      return [...document.querySelectorAll(".react-flow__node-scientific")].every((node) => {
        const rect = node.getBoundingClientRect();
        return rect.left >= stage.left - 1 && rect.right <= stage.right + 1 && rect.top >= stage.top - 1 && rect.bottom <= stage.bottom + 1;
      });
    })).toBe(true);
    await page.getByRole("button", { name: "Components", exact: true }).click();
  } else {
    const titleFits = await page.locator("#diagram-title").evaluate((input) => input.scrollWidth <= input.clientWidth);
    expect(titleFits).toBe(true);
    await expect(page.locator(".scientific-header__compact-product")).toHaveCount(0);
  }

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export" }).click();
  await page.getByRole("button", { name: "SVG", exact: true }).click();
  await downloadPromise;
  await expect(page.locator(".setup-export-receipt")).toBeVisible();
  const stageOverflow = await page.locator(".scientific-workbench__stage").evaluate((stage) => stage.scrollHeight - stage.clientHeight);
  expect(stageOverflow).toBeLessThanOrEqual(1);

  await page.getByRole("button", { name: "Fit overview" }).click();
  await expect(page.locator(".scientific-status").filter({ visible: true }).first()).toContainText("Overview fitted");
  await expect(page.locator(".scientific-status").filter({ visible: true }).first()).toContainText("Saved", { timeout: 7_000 });
});
