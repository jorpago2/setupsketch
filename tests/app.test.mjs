import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";

test("builds a static TypeScript, React, and Vite app", async () => {
  const html = await readFile(new URL("../dist/index.html", import.meta.url), "utf8");
  const assets = await readdir(new URL("../dist/assets/", import.meta.url));
  const editor = await readFile(new URL("../src/features/diagram-editor/DiagramEditor.tsx", import.meta.url), "utf8");
  const workspaceNavigation = await readFile(new URL("../src/components/ui/WorkspaceNavigation.tsx", import.meta.url), "utf8");
  const componentLibrary = await readFile(new URL("../src/features/diagram-editor/library/ComponentLibrary.tsx", import.meta.url), "utf8");
  const inspectorPanel = await readFile(new URL("../src/features/diagram-editor/inspector/InspectorPanel.tsx", import.meta.url), "utf8");
  const diagramCanvas = await readFile(new URL("../src/features/diagram-editor/canvas/DiagramCanvas.tsx", import.meta.url), "utf8");
  const canvasRouting = await readFile(new URL("../src/features/diagram-editor/canvas/canvasRouting.ts", import.meta.url), "utf8");
  const styles = await readFile(new URL("../src/styles.scss", import.meta.url), "utf8");
  const workspaceStyles = await readFile(new URL("../src/workspace.css", import.meta.url), "utf8");
  const main = await readFile(new URL("../src/main.tsx", import.meta.url), "utf8");
  const viteConfig = await readFile(new URL("../vite.config.ts", import.meta.url), "utf8");
  const catalog = await readFile(new URL("../src/features/diagram-editor/library/componentCatalog.ts", import.meta.url), "utf8");
  const templates = await readFile(new URL("../src/features/diagram-editor/model/templates.ts", import.meta.url), "utf8");
  const model = await readFile(new URL("../src/features/diagram-editor/model/editorModel.ts", import.meta.url), "utf8");
  const editorConfig = await readFile(new URL("../src/features/diagram-editor/editorConfig.ts", import.meta.url), "utf8");
  const editorControls = await readFile(new URL("../src/components/ui/EditorControls.tsx", import.meta.url), "utf8");
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
  for (const feature of ["connectionPath", "orthogonal", "fromPort", "selectedIds", "exportBom", "Publication"]) {
    assert.match(editor, new RegExp(feature));
  }
  assert.match(componentLibrary, /Search components/);
  for (const feature of ["saveSelectionAsModule", "reconnectFlowEdge", "cropToContent", "loadBom", "Setup checks", "Flip horizontal"]) {
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
    'aria-label="Edit actions"',
    'aria-label="File actions"',
    'className="toolbar-export-mobile"',
  ]) assert.match(editor, new RegExp(feature));
  assert.match(componentLibrary, /labelText="Search components"/);
  assert.doesNotMatch(editor, /ref=\{(?:fileRef|bomRef)\} className="sr-only"/);
  assert.match(editor, /useState<DiagramElement\[]>\(\[\]\)/);
  assert.match(editorConfig, /componentGroups\.map\(\(group\) => group\.title\)/);
  assert.match(editor, /Start with a component/);
  assert.match(editor, /buttonId="publication-title" label="Publication"/);
  assert.doesNotMatch(editor, /toolbar-export-desktop/);
  assert.equal([...editor.matchAll(/<Popover as="div" className="toolbar-/g)].length, 2);
  assert.doesNotMatch(editor, /<details|<summary|uiIconPaths/);
  assert.match(editor, /from "@carbon\/react"/);
  assert.match(editor, /from "@carbon\/react\/icons"/);
  assert.match(editorControls, /<Accordion /);
  assert.match(editor, /<PopoverContent/);
  assert.match(editor, /<PopoverContent>\s*<Layer id="project-menu" withBackground className="toolbar-menu-actions">/);
  assert.match(editor, /<PopoverContent>\s*<Layer id="export-menu" withBackground className="toolbar-export-actions">/);
  assert.equal([...editor.matchAll(/<Popover[^>]*align="bottom-end"/g)].length, 2);
  assert.equal([...editor.matchAll(/<IconButton[^>]*align="bottom-end"/g)].length, 6);
  assert.equal([...editor.matchAll(/aria-expanded=\{(?:project|export)MenuOpen\}/g)].length, 2);
  assert.match(editor, /<IconButton/);
  assert.match(editor, /if \(narrowWorkspace\) openSelectionInspector\(\)/);
  assert.match(editor, /setSelectedIds\(\[id\]\);\s+openSelectionInspector\(\)/);
  assert.match(editor, /const nextEdgeId = nextIds\.length \? null : edges\[0\]\?\.id \?\? null/);
  assert.match(editor, /current === mode \? null : mode/);
  assert.match(editor, /data-library-open=\{libraryOpen\}/);
  assert.match(editor, /data-inspector-open=\{Boolean\(inspectorMode\)\}/);
  assert.match(editor, /has-workspace-panel/);
  assert.match(workspaceNavigation, /controls: "component-library"/);
  assert.match(workspaceNavigation, /<ScientificToolRail/);
  assert.match(workspaceNavigation, /activeId=\{activeId\}/);
  assert.match(workspaceNavigation, /expandedId=\{activeId\}/);
  assert.match(workspaceNavigation, /controlsId: controls/);
  assert.match(editor, /id="selection-inspector"/);
  assert.doesNotMatch(editor, /id="property-inspector"/);
  const selectionInspector = editor.slice(editor.indexOf('id="selection-inspector"'), editor.indexOf('id="document-inspector"'));
  const documentInspector = editor.slice(editor.indexOf('id="document-inspector"'));
  assert.match(selectionInspector, /Engineering parameters/);
  assert.doesNotMatch(selectionInspector, /buttonId="layout-title"/);
  assert.match(documentInspector, /buttonId="layout-title"/);
  assert.doesNotMatch(documentInspector, /Engineering parameters/);
  for (const icon of ["undo", "redo", "link", "project", "export", "fit"]) {
    assert.match(editor, new RegExp(`<UiIcon name="${icon}"`));
  }
  assert.doesNotMatch(editor, /<UiIcon name="map"|<MiniMap/);
  for (const icon of ["SettingsAdjust", "Copy", "TrashCan", "Locked", "Unlocked", "Corner", "ReflectHorizontal", "ReflectVertical", "BringToFront", "SendToBack"]) {
    assert.match(editor, new RegExp(`(?:renderIcon=\\{(?:[^}]* )?${icon}|<${icon} size=\\{16\\})`));
  }
  for (const icon of ["GridIcon", "Layers", "Chemistry", "Inspection"]) assert.match(workspaceNavigation, new RegExp(`icon: ${icon}`));
  assert.match(workspaceNavigation, /icon: <Icon size=\{20\}/);
  for (const component of ["Grid", "Column", "TextInput", "NumberInput", "Select", "Slider", "Checkbox", "TextArea"]) {
    assert.match(editor, new RegExp(`<${component}`));
  }
  assert.match(componentLibrary, /<Search/);
  assert.match(componentLibrary, /<TrashCan size=\{16\}/);
  assert.match(componentLibrary, /<ScientificTaskPanel/);
  assert.match(componentLibrary, /bodyClassName="sidebar-content"/);
  assert.match(inspectorPanel, /<ScientificTaskPanel/);
  assert.match(inspectorPanel, /bodyClassName="sidebar-content"/);
  assert.doesNotMatch(editor, /↶|↷|toolbar-label-compact/);
  assert.match(editor, /const contentNodes = nodes\.filter\(\(node\) => node\.id !== "__paper__"\)/);
  assert.match(editor, /minZoom: 0\.25/);
  assert.match(editor, /const \[notice, setNotice\] = useState\("Saved"\)/);
  for (const feature of ['NodeToolbar', 'EdgeToolbar', 'NodeResizer', 'ControlButton', 'onConnectStart', 'onMoveEnd', 'diagram-export', 'role="group"', 'className="property-section"', 'BOM CSV', 'Import BOM', 'Arrange overlaps']) assert.match(editor, new RegExp(feature));
  for (const feature of ['ReactFlow', 'ConnectionMode.Loose', 'BaseEdge']) assert.match(diagramCanvas, new RegExp(feature));
  assert.doesNotMatch(diagramCanvas, /<Background|gridVisible/);
  assert.match(editor, /<DiagramCanvas<CanvasFlowNode, ScientificFlowEdge>/);
  assert.match(editor, /connectionLineType=\{flowConnectionLineType\}/);
  assert.doesNotMatch(editor, /ScientificFlowEdgeComponent|routeOrthogonal\(sourceStub/);
  for (const edgeType of ['straight', 'bezier', 'smoothstep', 'waypoint']) assert.match(canvasRouting, new RegExp(`"${edgeType}"`));
  assert.match(editor, /viewport: savedViewport/);
  assert.match(editor, /isViewport\(diagram\.viewport\)/);
  assert.match(editor, /parsed\.viewportMode === viewportMode/);
  assert.match(editor, /viewportMode === "wide"/);
  assert.match(editor, /widthRatio >= 0\.95 && widthRatio <= 1\.05/);
  assert.doesNotMatch(editor, /window\.addEventListener\("resize", scheduleWorkspaceFit\)/);
  assert.match(editor, /Overview fitted · zoom in to edit labels and ports/);
  assert.match(editor, /image\.onerror/);
  assert.match(editor, /if \(exportPdf\(\)\) recordExport/);
  assert.doesNotMatch(editor, /window\.confirm/);
  assert.match(editor, /modalHeading=\{pendingDestructiveAction/);
  assert.match(editor, /noiseTemperatureK/);
  assert.match(editor, /budgetAnalysis/);
  assert.match(editor, /Showing \{budgetCountLabel\} calculated paths/);
  assert.equal([...editor.matchAll(/\(min-width: 99rem\)/g)].length, 1);
  assert.match(editor, /\(max-width: 65\.99rem\)/);
  assert.match(editor, /label="Properties"/);
  assert.match(editorConfig, /textnote: \{ width: 150, height: 70 \}/);
  assert.match(editor, /annotation \? 48 : 128/);
  assert.match(editor, /orientation=\{narrowWorkspace \? "horizontal" : "vertical"\}/);
  assert.doesNotMatch(editor, /@container\/sidebar|bg-ui-/);
  assert.doesNotMatch(editor, /stroke="#1665d8"|BOM↓|BOM↑/);
  assert.doesNotMatch(styles, /100vw|#[0-9a-fA-F]{3,8}|font-family:\s*Arial/);
  assert.doesNotMatch(styles, /@media\s*\(max-width/);
  assert.match(styles, /\.react-flow__controls-button\s*\{[^}]*width:\s*44px;[^}]*height:\s*44px;/s);
  assert.match(styles, /\.component-card\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\) 44px;[^}]*min-width:\s*0;/s);
  assert.match(styles, /\.library-icon\s*\{[^}]*width:\s*44px;[^}]*height:\s*36px;/s);
  assert.match(styles, /\.component-grid \.component-add\s*\{[^}]*width:\s*100%;[^}]*min-width:\s*0;/s);
  assert.match(styles, /\.scientific-handle\.connectingto\.valid/);
  assert.match(styles, /\.context-toolbar\s*\{/);
  assert.match(editorControls, /<Accordion align="end" isFlush/);
  assert.doesNotMatch(styles, /\.cds--accordion__|\.cds--popover-content/);
  assert.match(workspaceStyles, /workspace\[data-library-open="true"\]/);
  assert.match(workspaceStyles, /has-workspace-panel > \.scientific-recovery-notice/);
  assert.match(workspaceStyles, /workspace\[data-inspector-open="true"\]/);
  assert.match(workspaceStyles, /container:\s*sidebar \/ inline-size/);
  assert.match(workspaceStyles, /workspace\[data-inspector="document"\]/);
  assert.match(workspaceStyles, /workspace\[data-library-open="true"\]\[data-inspector="selection"\]/);
  assert.match(editor, /if \(next && \(!dualPanelWorkspace \|\| inspectorMode !== "selection"\)\) setInspectorMode\(null\)/);
  assert.match(editor, /const toggleInspector = \(mode:[\s\S]*?setLibraryOpen\(false\)/);
  assert.match(packageJson.dependencies["@jorpago2/scientific-ui"], /scientific-ui-\d+\.\d+\.\d+\.tgz$/);
  assert.match(editor, /<ScientificHeader\b/);
  assert.match(editor, /product="SetupSketch"/);
  assert.match(editor, /productIcon="setup-sketch"/);
  assert.match(editor, /<ScientificAppShell\b/);
  assert.match(editor, /onKeyDownCapture=\{handleEditorKeyDown\}/);
  assert.match(workspaceNavigation, /registerItemRef=\{registerItemRef\}/);
  assert.doesNotMatch(editor, /(?:document|window)\.addEventListener\("keydown"/);
  assert.doesNotMatch(editor, /document\.getElementById|window\.prompt/);
  assert.match(editor, /data\.gridVisible \? " has-grid"/);
  assert.match(styles, /\.flow-paper\.has-grid/);
  assert.match(editor, /modalHeading="Save selection as module"/);
  assert.match(editor, /primaryButtonDisabled=\{!moduleName\.trim\(\)\}/);
  assert.match(editor, /status=\{shellStatus\}/);
  assert.match(editor, /<ScientificStatusBar\b[^>]*status=\{shellStatus\}/);
  assert.match(editor, /<Grid as="section"[^>]*aria-labelledby="app-title"/);
  assert.doesNotMatch(editor, /All tools|document-bar|suite-link/);
  assert.match(styles, /@use "@carbon\/react"/);
  assert.doesNotMatch(styles, /tailwindcss|@theme inline/);
  assert.match(main, /<ScientificUiProvider>/);
  assert.doesNotMatch(main, /<Theme theme="g10">/);
  assert.doesNotMatch(viteConfig, /tailwind/);
  assert.match(model, /calculateBudgets/);
  assert.equal(packageJson.dependencies.pptxgenjs, "^4.0.1");
  assert.equal(packageJson.dependencies["@xyflow/react"], "12.11.2");
  assert.equal(packageJson.dependencies["@carbon/react"], "1.113.0");
  assert.equal(packageJson.dependencies["@ibm/plex"], "6.4.1");
  assert.equal(packageJson.dependencies["react-is"], "19.2.8");
  assert.equal(packageJson.devDependencies.sass, "1.102.0");
  assert.equal(packageJson.scripts["test:ui"], "playwright test");
  assert.equal(packageJson.devDependencies["@axe-core/playwright"], "4.10.2");
  for (const removed of ["@headlessui/react", "@heroicons/react", "@tailwindcss/vite", "tailwindcss"]) {
    assert.equal(packageJson.dependencies[removed] ?? packageJson.devDependencies[removed], undefined);
  }
});
