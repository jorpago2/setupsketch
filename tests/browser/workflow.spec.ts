import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const expectNoSeriousAccessibilityViolations = async (page: Page) => {
  const result = await new AxeBuilder({ page }).exclude(".react-flow").analyze();
  expect(result.violations.filter((violation) => ["serious", "critical"].includes(violation.impact ?? ""))).toEqual([]);
};

const importDiagram = async (page: Page, body: object) => {
  await page.locator('input[aria-label="Open diagram JSON"]').setInputFiles({
    name: "diagram.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(body)),
  });
  await expect(page.locator(".react-flow__node-scientific")).toHaveCount(42);
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
  await page.getByRole("button", { name: "Project" }).click();
  await page.getByRole("button", { name: "Reset diagram" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText("Clear the current diagram?", { exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(page.getByRole("button", { name: "Project" })).toBeFocused();

  await page.getByRole("button", { name: "Project" }).click();
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
  await page.getByRole("button", { name: "Project" }).click();
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
  await page.getByRole("button", { name: "Export" }).click();
  await page.getByRole("button", { name: "PDF", exact: true }).click();
  await expect(page.locator("body")).toContainText("Allow pop-ups to export the vector PDF");
  await expect(page.locator(".setup-export-receipt")).toHaveCount(0);
});
