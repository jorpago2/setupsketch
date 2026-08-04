import assert from "node:assert/strict";
import test from "node:test";
import { moveElements, parseCsv, routeOrthogonal, validateSetup } from "../src/editorModel.ts";

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
