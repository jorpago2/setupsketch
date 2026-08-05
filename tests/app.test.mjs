import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";

test("builds a static TypeScript, React, and Vite app", async () => {
  const html = await readFile(new URL("../dist/index.html", import.meta.url), "utf8");
  const assets = await readdir(new URL("../dist/assets/", import.meta.url));
  const editor = await readFile(new URL("../src/Editor.tsx", import.meta.url), "utf8");
  const catalog = await readFile(new URL("../src/componentCatalog.ts", import.meta.url), "utf8");
  const templates = await readFile(new URL("../src/templates.ts", import.meta.url), "utf8");
  const model = await readFile(new URL("../src/editorModel.ts", import.meta.url), "utf8");
  const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
  assert.match(html, /SetupSketch/);
  for (const metadata of ["theme-color", "canonical", "og:site_name", "og:url", "og:image:alt", "twitter:title", "twitter:description", "twitter:image:alt"]) {
    assert.match(html, new RegExp(metadata));
  }
  assert.ok(assets.some((name) => name.endsWith(".js")));
  assert.ok(assets.some((name) => name.endsWith(".css")));
  assert.doesNotMatch(html, /_next|codex-preview/);
  for (const component of ["waveplate", "grating", "aom", "eom", "kinematicmount", "fibercollimator", "prism", "iris", "breadboard", "flipmount", "qpd", "mixer", "attenuator", "biastee", "rfswitch", "vco", "balun", "dcblock", "phaseshifter", "limiter", "hybridcoupler", "networkanalyzer", "dmm", "powersupply", "smu", "electronicload", "waveformgenerator", "lcrmeter", "rfpowermeter"]) {
    assert.match(catalog, new RegExp(`kind: \\"${component}\\"`));
  }
  const catalogKinds = [...new Set([...catalog.matchAll(/kind: "([a-z]+)"/g)].map((match) => match[1]))];
  for (const kind of catalogKinds) assert.match(editor, new RegExp(`case "${kind}"`), `${kind} needs a vector symbol`);
  for (const legacyColor of ["#e84d3c", "#2263d4", "#7253cf", "#16846b"]) assert.doesNotMatch(catalog, new RegExp(legacyColor));
  assert.doesNotMatch(editor, /current!\.before/, "drag history must capture the active gesture before clearing its ref");
  for (const layer of ["optics", "electronics", "beams", "signals", "labels", "grid"]) {
    assert.match(editor, new RegExp(`\\[\\"${layer}\\",`));
  }
  for (const feature of ["connectionPath", "orthogonal", "fromPort", "selectedIds", "exportBom", "Publication", "Search components"]) {
    assert.match(editor, new RegExp(feature));
  }
  for (const feature of ["saveSelectionAsModule", "finishEndpoint", "cropToContent", "loadBom", "Setup checks", "Flip horizontal"]) {
    assert.match(editor, new RegExp(feature));
  }
  for (const annotation of ["textnote", "equation", "region", "dimension", "brace", "legend"]) {
    assert.match(catalog, new RegExp(`kind: \\"${annotation}\\"`));
  }
  assert.match(templates, /mach-zehnder/);
  assert.match(templates, /vna-chain/);
  for (const feature of ["portTypeLabels", "Path budgets", "Traceability", "Experiment", "exportTikz", "exportPowerPoint", "exportNetlist"]) {
    assert.match(editor, new RegExp(feature));
  }
  for (const feature of [
    'id="app-title"',
    'href="#diagram-workspace"',
    'id="diagram-workspace"',
    'aria-label="Search components"',
    'aria-label="Edit actions"',
    'aria-label="File actions"',
    'className="toolbar-export-mobile"',
  ]) assert.match(editor, new RegExp(feature));
  assert.doesNotMatch(editor, /ref=\{(?:fileRef|bomRef)\} className="sr-only"/);
  assert.match(editor, /useState<DiagramElement\[]>\(\[\]\)/);
  assert.match(editor, /componentGroups\.map\(\(group\) => group\.title\)/);
  assert.match(editor, /Start with a component/);
  assert.match(editor, /<summary id="publication-title">Publication<\/summary>/);
  assert.doesNotMatch(editor, /toolbar-export-desktop/);
  assert.match(editor, /href="https:\/\/jorpago2\.github\.io\/"/);
  assert.match(model, /calculateBudgets/);
  assert.equal(packageJson.dependencies.pptxgenjs, "^4.0.1");
});
