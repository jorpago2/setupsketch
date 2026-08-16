import assert from "node:assert/strict";
import test from "node:test";
import { arrangeOverlaps, calculateBudgets, findOpenPosition, moveElements, parseCsv, routeOrthogonal, validateSetup } from "../src/features/diagram-editor/model/editorModel.ts";
import { componentByKind, componentPortLayouts, portTypeFor } from "../src/features/diagram-editor/library/componentCatalog.ts";
import { setupTemplates } from "../src/features/diagram-editor/model/templates.ts";
import { canvasEdgeTypeFor, defaultRoutingLabel, migrateCanvasRouting } from "../src/features/diagram-editor/canvas/canvasRouting.ts";

test("React Flow edge families follow the physical connection domain", () => {
  assert.equal(canvasEdgeTypeFor("optical-free-space", undefined, false), "straight");
  assert.equal(canvasEdgeTypeFor("fiber", undefined, false), "bezier");
  assert.equal(canvasEdgeTypeFor("rf", undefined, false), "smoothstep");
  assert.equal(canvasEdgeTypeFor("dc", "straight", false), "straight");
  assert.equal(canvasEdgeTypeFor("optical-free-space", "orthogonal", false), "smoothstep");
  assert.equal(canvasEdgeTypeFor("fiber", undefined, true), "waypoint");
  assert.match(defaultRoutingLabel("fiber"), /fiber/);
});

test("the ring cavity loads as one closed chain of straight optical edges", () => {
  const ring = setupTemplates.find((template) => template.id === "ring-cavity")!;
  assert.equal(ring.connections.length, 6);
  assert.ok(ring.connections.every((connection) =>
    canvasEdgeTypeFor(connection.portType, connection.routing, Boolean(connection.waypoints?.length)) === "straight"));
  const adjacency = new Map<string, number>();
  for (const connection of ring.connections) {
    adjacency.set(connection.from, (adjacency.get(connection.from) ?? 0) + 1);
    adjacency.set(connection.to, (adjacency.get(connection.to) ?? 0) + 1);
  }
  for (const id of ["input", "m1", "sample", "m2"]) assert.ok((adjacency.get(id) ?? 0) >= 2, `${id} must remain in the cavity loop`);
});

test("legacy automatic routing migrates without changing manual bends", () => {
  const migrated = migrateCanvasRouting([
    { id: "fiber", type: "beam" as const, portType: "fiber" as const, routing: "straight" as const },
    { id: "rf", type: "signal" as const, portType: "rf" as const, routing: "orthogonal" as const },
    { id: "manual", type: "signal" as const, portType: "rf" as const, routing: "orthogonal" as const, waypoints: [{ x: 4, y: 8 }] },
  ], 7);
  assert.equal(migrated[0].routing, undefined);
  assert.equal(migrated[1].routing, undefined);
  assert.equal(migrated[2].routing, "orthogonal");
});

test("orthogonal routing detours around a component", () => {
  const path = routeOrthogonal(
    { x: 0, y: 0 },
    { x: 400, y: 0 },
    [{ id: "obstacle", kind: "sample", label: "DUT", x: 200, y: 0 }],
    [],
  );
  assert.ok(path.some((point) => Math.abs(point.y) >= 85));
  assert.deepEqual(path[0], { x: 0, y: 0 });
  assert.deepEqual(path.at(-1), { x: 400, y: 0 });
});

test("BOM CSV parser preserves commas and quotes", () => {
  assert.deepEqual(parseCsv('Quantity,Notes\r\n2,"10 GHz, ""low noise"""'), [
    ["Quantity", "Notes"],
    ["2", '10 GHz, "low noise"'],
  ]);
  assert.throws(() => parseCsv('1,"unfinished'));
});

test("setup validation reports disconnected and incompatible elements", () => {
  const issues = validateSetup(
    [
      { id: "laser", kind: "laser", label: "Laser", x: 0, y: 0 },
      { id: "scope", kind: "oscilloscope", label: "Scope", x: 100, y: 0 },
      { id: "loose", kind: "lens", label: "Loose lens", x: 200, y: 0 },
    ],
    [{ id: "beam", from: "laser", to: "scope", type: "beam" }],
    new Set(["oscilloscope"]),
    new Set(),
  );
  assert.ok(issues.some((issue) => issue.message.includes("not connected")));
  assert.ok(issues.some((issue) => issue.message.includes("electronic-only")));
});

test("keyboard movement updates a multi-selection, respects bounds and locks", () => {
  const moved = moveElements(
    [
      { id: "a", kind: "lens", label: "A", x: 100, y: 100 },
      { id: "b", kind: "mirror", label: "B", x: 80, y: 80, locked: true },
    ],
    new Set(["a", "b"]),
    -100,
    20,
    { width: 1200, height: 700 },
  );
  assert.deepEqual([moved[0].x, moved[0].y], [60, 120]);
  assert.deepEqual([moved[1].x, moved[1].y], [80, 80]);
});

test("automatic placement avoids occupied component cells", () => {
  const occupied = Array.from({ length: 13 }, (_, index) => ({
    x: 120 + index % 7 * 160,
    y: 120 + Math.floor(index / 7) * 140,
  }));
  const position = findOpenPosition(occupied, { width: 1200, height: 700 });
  assert.ok(occupied.every((element) => Math.abs(element.x - position.x) >= 140 || Math.abs(element.y - position.y) >= 120));
});

test("arranging overlaps preserves locked and already clear components", () => {
  const arranged = arrangeOverlaps([
    { id: "locked", kind: "sample", label: "Locked", x: 120, y: 120, locked: true },
    { id: "overlap", kind: "lens", label: "Overlap", x: 140, y: 140 },
    { id: "clear", kind: "detector", label: "Clear", x: 600, y: 400 },
  ], { width: 1200, height: 700 });
  assert.deepEqual([arranged[0].x, arranged[0].y], [120, 120]);
  assert.ok(Math.abs(arranged[1].x - 120) >= 140 || Math.abs(arranged[1].y - 120) >= 120);
  assert.deepEqual([arranged[2].x, arranged[2].y], [600, 400]);
});

test("typed ports distinguish optical, fiber, RF, DC, trigger and digital domains", () => {
  assert.equal(portTypeFor("laser", "right"), "optical-free-space");
  assert.equal(portTypeFor("fibercoupler", "left-top"), "fiber");
  assert.equal(portTypeFor("networkanalyzer", "input"), "rf");
  assert.equal(portTypeFor("powersupply", "output"), "dc");
  assert.equal(portTypeFor("oscilloscope", "trigger"), "trigger");
  assert.equal(portTypeFor("daq", "digital"), "digital");
  assert.equal(portTypeFor("mzm", "left"), "fiber");
  assert.equal(portTypeFor("mzm", "top"), "rf");
  assert.equal(portTypeFor("gratingcoupler", "left"), "fiber");
  assert.equal(portTypeFor("gratingcoupler", "top"), "optical-free-space");
  assert.equal(portTypeFor("opticalspectrumanalyzer", "input"), "fiber");
  assert.equal(portTypeFor("camera", "input"), "optical-free-space");
  const issues = validateSetup(
    [
      { id: "laser", kind: "laser", label: "Laser", x: 0, y: 0 },
      { id: "scope", kind: "oscilloscope", label: "Scope", x: 100, y: 0 },
    ],
    [{ id: "bad", from: "laser", to: "scope", type: "signal", portType: "rf", fromPort: "right", toPort: "input" }],
    new Set(["oscilloscope"]),
    new Set(),
    new Set(),
    (kind, port) => portTypeFor(kind as Parameters<typeof portTypeFor>[0], port),
  );
  assert.ok(issues.some((issue) => issue.message.includes("incompatible port")));
});

test("reflector ports meet at the optical surface", () => {
  assert.ok(componentPortLayouts.reflector.every((port) => Math.hypot(port.x, port.y) <= 8));
  const ring = setupTemplates.find((template) => template.id === "ring-cavity")!;
  assert.equal(ring.elements.find((element) => element.id === "sample")?.rotation, 47);
  assert.equal(ring.elements.find((element) => element.id === "detector")?.rotation, 90);
});

test("every template connects existing, compatible and unoccupied ports", () => {
  for (const template of setupTemplates) {
    const elements = new Map(template.elements.map((element) => [element.id, element]));
    const occupied = new Set<string>();
    for (const connection of template.connections) {
      const from = elements.get(connection.from);
      const to = elements.get(connection.to);
      assert.ok(from && to, `${template.id}: missing endpoint`);
      for (const [element, port] of [[from, connection.fromPort], [to, connection.toPort]] as const) {
        const layout = componentByKind.get(element.kind)?.ports;
        assert.ok(layout && componentPortLayouts[layout].some((candidate) => candidate.id === port), `${template.id}: ${element.id}.${port} does not exist`);
        assert.equal(portTypeFor(element.kind, port), connection.portType, `${template.id}: ${element.id}.${port} has the wrong domain`);
        const key = `${element.id}:${port}`;
        assert.ok(!occupied.has(key), `${template.id}: ${key} is connected more than once`);
        occupied.add(key);
      }
    }
  }
});

test("path budgets combine dB values, bottleneck bandwidth and Friis noise", () => {
  const { items: [budget] } = calculateBudgets(
    [
      { id: "source", kind: "source", label: "Source", x: 0, y: 0, powerDbm: 0, gainDb: 10, noiseFigureDb: 3, bandwidthHz: 2e9 },
      { id: "amp", kind: "amplifier", label: "Amp", x: 100, y: 0, gainDb: 20, lossDb: 1, noiseFigureDb: 6, bandwidthHz: 1e9 },
    ],
    [{ id: "rf", from: "source", to: "amp", type: "signal", portType: "rf", lossDb: 2, bandwidthHz: 1.5e9 }],
  );
  assert.equal(budget.outputPowerDbm, 27);
  assert.equal(budget.totalLossDb, 3);
  assert.equal(budget.bandwidthHz, 1e9);
  assert.ok(budget.noiseFigureDb! > 3.9 && budget.noiseFigureDb! < 4.2);
  assert.ok(budget.outputNoiseDbm! > -54 && budget.outputNoiseDbm! < -52);
  assert.ok(budget.snrDb! > 79 && budget.snrDb! < 81);
  assert.equal(budget.noiseTemperatureK, 290);
  assert.ok(budget.noiseDensityDbmHz! > -174 && budget.noiseDensityDbmHz! < -173.9);
});

test("legacy beam chains infer one optical domain for every link", () => {
  const summary = calculateBudgets(
    [
      { id: "source", kind: "laser", label: "Source", x: 0, y: 0, powerDbm: 0 },
      { id: "mirror", kind: "mirror", label: "Mirror", x: 100, y: 0 },
      { id: "detector", kind: "detector", label: "Detector", x: 200, y: 0 },
    ],
    [
      { id: "first", from: "source", to: "mirror", type: "beam" },
      { id: "second", from: "mirror", to: "detector", type: "beam" },
    ],
  );
  assert.equal(summary.total, 1);
  assert.deepEqual(summary.items[0].labels, ["Source", "Mirror", "Detector"]);
  assert.equal(summary.items[0].id, "first-second");
  assert.equal(summary.items[0].domain, "optical-free-space");
});

test("closed loops are not reported as terminated path budgets", () => {
  const summary = calculateBudgets(
    [
      { id: "source", kind: "source", label: "Source", x: 0, y: 0, powerDbm: 0 },
      { id: "loop", kind: "load", label: "Loop", x: 100, y: 0 },
    ],
    [
      { id: "out", from: "source", to: "loop", portType: "rf" },
      { id: "return", from: "loop", to: "source", portType: "rf" },
    ],
  );
  assert.deepEqual(summary, { items: [], included: 0, total: 0, truncated: false, totalIsExact: true });
});

test("path budget noise follows kT and reports truncation explicitly", () => {
  const source = { id: "source", kind: "source", label: "Source", x: 0, y: 0, powerDbm: 0, bandwidthHz: 1e6 };
  const sinks = Array.from({ length: 41 }, (_, index) => ({ id: `sink-${index}`, kind: "sink", label: `Sink ${index}`, x: index, y: 1 }));
  const connections = sinks.map((sink, index) => ({ id: `path-${index}`, from: source.id, to: sink.id, portType: "rf" as const }));
  const nominal = calculateBudgets([source, ...sinks], connections, 290);
  const hot = calculateBudgets([source, ...sinks], connections, 580);
  assert.deepEqual({ included: nominal.included, total: nominal.total, truncated: nominal.truncated, totalIsExact: nominal.totalIsExact }, {
    included: 40,
    total: 41,
    truncated: true,
    totalIsExact: true,
  });
  assert.ok(Math.abs(hot.items[0].noiseDensityDbmHz! - nominal.items[0].noiseDensityDbmHz! - 10 * Math.log10(2)) < 1e-12);
});
