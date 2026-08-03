"use client";

import {
  ChangeEvent,
  PointerEvent as ReactPointerEvent,
  useEffect,
  useRef,
  useState,
} from "react";

type ElementKind =
  | "laser"
  | "mirror"
  | "beamsplitter"
  | "lens"
  | "sample"
  | "detector"
  | "fiber"
  | "source"
  | "oscilloscope"
  | "amplifier"
  | "photodiode"
  | "daq";

type DiagramElement = {
  id: string;
  kind: ElementKind;
  label: string;
  x: number;
  y: number;
  rotation: number;
  color: string;
};

type Connection = {
  id: string;
  from: string;
  to: string;
  color: string;
};

type Snapshot = {
  elements: DiagramElement[];
  connections: Connection[];
};

const WIDTH = 1200;
const HEIGHT = 700;
const STORAGE_KEY = "setupsketch-diagram-v1";

const elementKinds = new Set<ElementKind>([
  "laser", "mirror", "beamsplitter", "lens", "sample", "detector", "fiber",
  "source", "oscilloscope", "amplifier", "photodiode", "daq",
]);

const componentGroups: Array<{
  title: string;
  items: Array<{ kind: ElementKind; label: string }>;
}> = [
  {
    title: "Optics & photonics",
    items: [
      { kind: "laser", label: "Laser" },
      { kind: "mirror", label: "Mirror" },
      { kind: "beamsplitter", label: "Beam splitter" },
      { kind: "lens", label: "Lens" },
      { kind: "sample", label: "Sample" },
      { kind: "detector", label: "Detector" },
      { kind: "fiber", label: "Optical fiber" },
    ],
  },
  {
    title: "Electronics",
    items: [
      { kind: "source", label: "Source" },
      { kind: "oscilloscope", label: "Oscilloscope" },
      { kind: "amplifier", label: "Amplifier" },
      { kind: "photodiode", label: "Photodiode" },
      { kind: "daq", label: "DAQ" },
    ],
  },
];

const initialElements: DiagramElement[] = [
  { id: "laser-1", kind: "laser", label: "1550 nm laser", x: 180, y: 330, rotation: 0, color: "#e84d3c" },
  { id: "lens-1", kind: "lens", label: "L1", x: 420, y: 330, rotation: 0, color: "#2263d4" },
  { id: "sample-1", kind: "sample", label: "Device under test", x: 650, y: 330, rotation: 0, color: "#7253cf" },
  { id: "detector-1", kind: "detector", label: "InGaAs detector", x: 900, y: 330, rotation: 0, color: "#16846b" },
  { id: "daq-1", kind: "daq", label: "DAQ", x: 900, y: 535, rotation: 0, color: "#242a35" },
];

const initialConnections: Connection[] = [
  { id: "c1", from: "laser-1", to: "lens-1", color: "#e84d3c" },
  { id: "c2", from: "lens-1", to: "sample-1", color: "#e84d3c" },
  { id: "c3", from: "sample-1", to: "detector-1", color: "#e84d3c" },
  { id: "c4", from: "detector-1", to: "daq-1", color: "#242a35" },
];

const cloneSnapshot = (elements: DiagramElement[], connections: Connection[]): Snapshot => ({
  elements: elements.map((element) => ({ ...element })),
  connections: connections.map((connection) => ({ ...connection })),
});

const download = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};

const safeFilename = (name: string) =>
  name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "setup";

const isDiagramFile = (value: unknown): value is { title?: string; elements: DiagramElement[]; connections: Connection[] } => {
  if (!value || typeof value !== "object") return false;
  const diagram = value as Record<string, unknown>;
  if (diagram.title !== undefined && typeof diagram.title !== "string") return false;
  if (!Array.isArray(diagram.elements) || !Array.isArray(diagram.connections)) return false;
  const ids = new Set<string>();
  for (const candidate of diagram.elements) {
    if (!candidate || typeof candidate !== "object") return false;
    const element = candidate as Record<string, unknown>;
    if (
      typeof element.id !== "string" || ids.has(element.id) ||
      typeof element.kind !== "string" || !elementKinds.has(element.kind as ElementKind) ||
      typeof element.label !== "string" || typeof element.color !== "string" ||
      typeof element.x !== "number" || !Number.isFinite(element.x) ||
      typeof element.y !== "number" || !Number.isFinite(element.y) ||
      typeof element.rotation !== "number" || !Number.isFinite(element.rotation)
    ) return false;
    ids.add(element.id);
  }
  return diagram.connections.every((candidate) => {
    if (!candidate || typeof candidate !== "object") return false;
    const connection = candidate as Record<string, unknown>;
    return typeof connection.id === "string" && typeof connection.from === "string" &&
      typeof connection.to === "string" && typeof connection.color === "string" &&
      ids.has(connection.from) && ids.has(connection.to);
  });
};

function ComponentShape({ element }: { element: DiagramElement }) {
  const common = { stroke: element.color, strokeWidth: 4, fill: "#ffffff", vectorEffect: "non-scaling-stroke" as const };

  switch (element.kind) {
    case "laser":
      return <><rect x="-48" y="-24" width="96" height="48" rx="8" {...common} /><circle cx="28" cy="0" r="8" fill={element.color} /><path d="M-30 0h38" stroke={element.color} strokeWidth="4" /><path d="M-26 -10v20M-15 -10v20" stroke={element.color} strokeWidth="2" /></>;
    case "mirror":
      return <><path d="M-32 30L32 -30" stroke={element.color} strokeWidth="8" strokeLinecap="round" /><path d="M-25 35L39 -29" stroke="#b8c0cc" strokeWidth="3" /></>;
    case "beamsplitter":
      return <><rect x="-31" y="-31" width="62" height="62" rx="4" transform="rotate(45)" {...common} /><path d="M-43 43L43 -43" stroke={element.color} strokeWidth="3" /></>;
    case "lens":
      return <><path d="M0 -42C-22 -27 -22 27 0 42C22 27 22 -27 0 -42Z" {...common} /><path d="M-8 -25Q0 0 -8 25" fill="none" stroke="#9fc7ff" strokeWidth="3" /></>;
    case "sample":
      return <><rect x="-50" y="-30" width="100" height="60" rx="5" {...common} /><path d="M-34 -18L34 18M-34 0L0 18M0 -18L34 0" stroke={element.color} strokeWidth="2" opacity="0.55" /></>;
    case "detector":
      return <><path d="M-38 -34H8A34 34 0 010 34H-38Z" {...common} /><path d="M-22 -16L6 0L-22 16Z" fill={element.color} stroke="none" /></>;
    case "fiber":
      return <><path d="M-50 16C-20 -34 20 34 50 -16" fill="none" stroke={element.color} strokeWidth="7" strokeLinecap="round" /><circle cx="-50" cy="16" r="6" fill="#fff" stroke={element.color} strokeWidth="3" /><circle cx="50" cy="-16" r="6" fill="#fff" stroke={element.color} strokeWidth="3" /></>;
    case "source":
      return <><circle r="36" {...common} /><path d="M-16 -9h13M-9 -16v14M5 10h14" stroke={element.color} strokeWidth="4" strokeLinecap="round" /></>;
    case "oscilloscope":
      return <><rect x="-52" y="-34" width="104" height="68" rx="7" {...common} /><path d="M-38 4C-27 -24 -15 25 -3 0S21 -24 38 2" fill="none" stroke={element.color} strokeWidth="4" /></>;
    case "amplifier":
      return <><path d="M-42 -36L45 0L-42 36Z" {...common} /><path d="M-27 0h18M-18 -9v18" stroke={element.color} strokeWidth="3" /></>;
    case "photodiode":
      return <><path d="M-32 -31L24 0L-32 31Z" {...common} /><path d="M25 -34v68M-13 -48l14 13M4 -50l14 13" stroke={element.color} strokeWidth="4" /></>;
    case "daq":
      return <><rect x="-48" y="-31" width="96" height="62" rx="7" {...common} /><path d="M-29 10v-20M-12 10V0M5 10v-30M22 10v-12" stroke={element.color} strokeWidth="5" /><circle cx="34" cy="-18" r="4" fill={element.color} /></>;
  }
}

export default function Home() {
  const [elements, setElements] = useState(initialElements);
  const [connections, setConnections] = useState(initialConnections);
  const [title, setTitle] = useState("Optical characterization setup");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null);
  const [connectFrom, setConnectFrom] = useState<string | null>(null);
  const [connectMode, setConnectMode] = useState(false);
  const [past, setPast] = useState<Snapshot[]>([]);
  const [future, setFuture] = useState<Snapshot[]>([]);
  const [notice, setNotice] = useState("Autosaved locally");
  const svgRef = useRef<SVGSVGElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const hydrated = useRef(false);
  const drag = useRef<{
    id: string;
    offsetX: number;
    offsetY: number;
    before: Snapshot;
    moved: boolean;
  } | null>(null);

  const selected = elements.find((element) => element.id === selectedId) ?? null;

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed: unknown = JSON.parse(stored);
        if (isDiagramFile(parsed)) {
          setTitle(parsed.title || title);
          setElements(parsed.elements);
          setConnections(parsed.connections);
        }
      } catch {
        setNotice("Local draft could not be read");
      }
    }
    hydrated.current = true;
  // The starter title is intentionally read only once.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, title, elements, connections }));
  }, [title, elements, connections]);

  const pointFromEvent = (event: ReactPointerEvent<SVGSVGElement | SVGGElement>) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    return point.matrixTransform(svg.getScreenCTM()?.inverse());
  };

  const commit = (nextElements: DiagramElement[], nextConnections = connections) => {
    setPast((items) => [...items.slice(-39), cloneSnapshot(elements, connections)]);
    setFuture([]);
    setElements(nextElements);
    setConnections(nextConnections);
  };

  const undo = () => {
    const previous = past.at(-1);
    if (!previous) return;
    setFuture((items) => [cloneSnapshot(elements, connections), ...items]);
    setPast((items) => items.slice(0, -1));
    setElements(previous.elements);
    setConnections(previous.connections);
    setSelectedId(null);
  };

  const redo = () => {
    const next = future[0];
    if (!next) return;
    setPast((items) => [...items, cloneSnapshot(elements, connections)]);
    setFuture((items) => items.slice(1));
    setElements(next.elements);
    setConnections(next.connections);
    setSelectedId(null);
  };

  const addElement = (kind: ElementKind, label: string) => {
    const index = elements.length;
    const element: DiagramElement = {
      id: `${kind}-${Date.now()}`,
      kind,
      label,
      x: 170 + (index % 4) * 250,
      y: 170 + (Math.floor(index / 4) % 3) * 190,
      rotation: 0,
      color: kind === "laser" ? "#e84d3c" : kind === "sample" ? "#7253cf" : "#2263d4",
    };
    commit([...elements, element]);
    setSelectedId(element.id);
    setSelectedConnectionId(null);
  };

  const removeSelected = () => {
    if (selectedId) {
      commit(
        elements.filter((element) => element.id !== selectedId),
        connections.filter((connection) => connection.from !== selectedId && connection.to !== selectedId),
      );
      setSelectedId(null);
    } else if (selectedConnectionId) {
      commit(elements, connections.filter((connection) => connection.id !== selectedConnectionId));
      setSelectedConnectionId(null);
    }
  };

  const updateSelected = (changes: Partial<DiagramElement>) =>
    setElements((items) => items.map((element) => element.id === selectedId ? { ...element, ...changes } : element));

  const duplicateSelected = () => {
    if (!selected) return;
    const copy = { ...selected, id: `${selected.kind}-${Date.now()}`, x: selected.x + 35, y: selected.y + 35, label: `${selected.label} copy` };
    commit([...elements, copy]);
    setSelectedId(copy.id);
  };

  const selectElement = (event: ReactPointerEvent<SVGGElement>, id: string) => {
    event.stopPropagation();
    if (connectMode) {
      if (!connectFrom) {
        setConnectFrom(id);
        setNotice("Select the destination component");
      } else if (connectFrom !== id) {
        const connection: Connection = { id: `connection-${Date.now()}`, from: connectFrom, to: id, color: "#303844" };
        commit(elements, [...connections, connection]);
        setConnectFrom(null);
        setConnectMode(false);
        setNotice("Connection added");
      }
      return;
    }
    setSelectedId(id);
    setSelectedConnectionId(null);
    const point = pointFromEvent(event);
    const element = elements.find((item) => item.id === id);
    if (!element) return;
    drag.current = {
      id,
      offsetX: point.x - element.x,
      offsetY: point.y - element.y,
      before: cloneSnapshot(elements, connections),
      moved: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const moveElement = (event: ReactPointerEvent<SVGGElement>) => {
    if (!drag.current || connectMode) return;
    const point = pointFromEvent(event);
    const x = Math.max(60, Math.min(WIDTH - 60, Math.round((point.x - drag.current.offsetX) / 10) * 10));
    const y = Math.max(60, Math.min(HEIGHT - 60, Math.round((point.y - drag.current.offsetY) / 10) * 10));
    drag.current.moved = true;
    setElements((items) => items.map((item) => item.id === drag.current?.id ? { ...item, x, y } : item));
  };

  const finishDrag = () => {
    if (drag.current?.moved) {
      setPast((items) => [...items.slice(-39), drag.current!.before]);
      setFuture([]);
    }
    drag.current = null;
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const editing = event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement;
      if (!editing && (event.key === "Delete" || event.key === "Backspace")) removeSelected();
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "y") {
        event.preventDefault();
        redo();
      }
      if (event.key === "Escape") {
        setConnectMode(false);
        setConnectFrom(null);
        setSelectedId(null);
        setSelectedConnectionId(null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  const svgSource = () => {
    if (!svgRef.current) return "";
    const clone = svgRef.current.cloneNode(true) as SVGSVGElement;
    clone.querySelectorAll(".selection-outline, .connection-hit, .grid-layer").forEach((node) => node.remove());
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    clone.setAttribute("width", String(WIDTH));
    clone.setAttribute("height", String(HEIGHT));
    return `<?xml version="1.0" encoding="UTF-8"?>\n${new XMLSerializer().serializeToString(clone)}`;
  };

  const exportSvg = () => download(new Blob([svgSource()], { type: "image/svg+xml" }), `${safeFilename(title)}.svg`);

  const exportPng = async () => {
    const image = new Image();
    const url = URL.createObjectURL(new Blob([svgSource()], { type: "image/svg+xml" }));
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = WIDTH * 2;
      canvas.height = HEIGHT * 2;
      const context = canvas.getContext("2d");
      if (!context) return;
      context.fillStyle = "white";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => blob && download(blob, `${safeFilename(title)}.png`), "image/png");
      URL.revokeObjectURL(url);
    };
    image.src = url;
  };

  const saveJson = () => download(
    new Blob([JSON.stringify({ version: 1, title, elements, connections }, null, 2)], { type: "application/json" }),
    `${safeFilename(title)}.json`,
  );

  const loadJson = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const parsed: unknown = JSON.parse(await file.text());
      if (!isDiagramFile(parsed)) throw new Error("Invalid diagram");
      setPast((items) => [...items, cloneSnapshot(elements, connections)]);
      setTitle(parsed.title || "Untitled setup");
      setElements(parsed.elements);
      setConnections(parsed.connections);
      setFuture([]);
      setNotice("Diagram loaded");
    } catch {
      setNotice("That file is not a valid SetupSketch diagram");
    } finally {
      event.target.value = "";
    }
  };

  const clearDiagram = () => {
    if ((elements.length || connections.length) && !window.confirm("Clear the current diagram? You can still undo this action.")) return;
    commit([], []);
    setSelectedId(null);
    setSelectedConnectionId(null);
  };

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand" aria-label="SetupSketch">
          <span className="brand-mark" aria-hidden="true">S</span>
          <span><strong>SetupSketch</strong><small>Scientific diagram editor</small></span>
        </div>
        <label className="project-title">
          <span className="sr-only">Diagram title</span>
          <input value={title} onChange={(event) => setTitle(event.target.value)} />
        </label>
        <div className="toolbar" aria-label="Diagram actions">
          <button onClick={undo} disabled={!past.length} title="Undo (Ctrl+Z)">Undo</button>
          <button onClick={redo} disabled={!future.length} title="Redo (Ctrl+Y)">Redo</button>
          <button className={connectMode ? "active" : ""} onClick={() => { setConnectMode(!connectMode); setConnectFrom(null); }}>
            {connectFrom ? "Choose target" : "Connect"}
          </button>
          <span className="toolbar-divider" />
          <button onClick={saveJson}>JSON</button>
          <button onClick={() => fileRef.current?.click()}>Open</button>
          <input ref={fileRef} className="sr-only" type="file" accept="application/json,.json" onChange={loadJson} />
          <button onClick={exportSvg}>SVG</button>
          <button onClick={exportPng}>PNG</button>
          <button className="primary" onClick={() => window.print()}>PDF</button>
        </div>
      </header>

      <section className="workspace">
        <aside className="library" aria-label="Component library">
          <div className="panel-heading">
            <span>Library</span>
            <button className="text-button danger" onClick={clearDiagram}>Clear</button>
          </div>
          {componentGroups.map((group) => (
            <section className="library-group" key={group.title}>
              <h2>{group.title}</h2>
              <div className="component-grid">
                {group.items.map((item) => (
                  <button key={item.kind} onClick={() => addElement(item.kind, item.label)}>
                    <span className={`mini-icon mini-${item.kind}`} aria-hidden="true" />
                    {item.label}
                  </button>
                ))}
              </div>
            </section>
          ))}
          <p className="library-help">Add a component, drag it into place, then use Connect to draw signal paths.</p>
        </aside>

        <section className="stage-wrap" aria-label="Diagram workspace">
          <div className="stage-meta">
            <span>{elements.length} components · {connections.length} connections</span>
            <span className={connectMode ? "mode-note active" : "mode-note"}>{connectMode ? (connectFrom ? "Select destination" : "Select source") : notice}</span>
          </div>
          <div className="stage">
            <svg
              ref={svgRef}
              className="diagram"
              viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
              role="img"
              aria-label={`${title}, editable scientific setup diagram`}
              onPointerDown={() => { setSelectedId(null); setSelectedConnectionId(null); }}
            >
              <defs>
                <pattern id="minorGrid" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M20 0H0V20" fill="none" stroke="#e8ebef" strokeWidth="1" />
                </pattern>
                <pattern id="majorGrid" width="100" height="100" patternUnits="userSpaceOnUse">
                  <rect width="100" height="100" fill="url(#minorGrid)" />
                  <path d="M100 0H0V100" fill="none" stroke="#d6dbe2" strokeWidth="1.2" />
                </pattern>
                <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                  <path d="M0 0L10 5L0 10Z" fill="context-stroke" />
                </marker>
              </defs>
              <rect width={WIDTH} height={HEIGHT} fill="#ffffff" />
              <rect className="grid-layer" width={WIDTH} height={HEIGHT} fill="url(#majorGrid)" />
              <text x="42" y="54" fill="#171b22" fontSize="25" fontWeight="700" fontFamily="Arial, sans-serif">{title}</text>
              <text x="42" y="80" fill="#6d7580" fontSize="12" fontFamily="Arial, sans-serif">Created with SetupSketch</text>

              {connections.map((connection) => {
                const from = elements.find((element) => element.id === connection.from);
                const to = elements.find((element) => element.id === connection.to);
                if (!from || !to) return null;
                const selectedEdge = selectedConnectionId === connection.id;
                const dx = to.x - from.x;
                const dy = to.y - from.y;
                const distance = Math.hypot(dx, dy) || 1;
                const offset = Math.min(58, distance / 3);
                const x1 = from.x + dx / distance * offset;
                const y1 = from.y + dy / distance * offset;
                const x2 = to.x - dx / distance * offset;
                const y2 = to.y - dy / distance * offset;
                return (
                  <g key={connection.id}>
                    <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={connection.color} strokeWidth={selectedEdge ? 5 : 3} markerEnd="url(#arrow)" />
                    <line
                      className="connection-hit"
                      x1={x1} y1={y1} x2={x2} y2={y2}
                      stroke="transparent" strokeWidth="18"
                      onPointerDown={(event) => { event.stopPropagation(); setSelectedConnectionId(connection.id); setSelectedId(null); }}
                    />
                  </g>
                );
              })}

              {elements.map((element) => (
                <g
                  key={element.id}
                  className={`diagram-element${connectFrom === element.id ? " connection-source" : ""}`}
                  transform={`translate(${element.x} ${element.y}) rotate(${element.rotation})`}
                  onPointerDown={(event) => selectElement(event, element.id)}
                  onPointerMove={moveElement}
                  onPointerUp={finishDrag}
                  onPointerCancel={finishDrag}
                >
                  {selectedId === element.id && <rect className="selection-outline" x="-64" y="-58" width="128" height="116" rx="9" fill="none" stroke="#1665d8" strokeWidth="2" strokeDasharray="6 5" />}
                  <ComponentShape element={element} />
                  <rect x="-66" y="-54" width="132" height="108" fill="transparent" />
                  <text y="65" textAnchor="middle" fill="#252b33" fontSize="14" fontWeight="600" fontFamily="Arial, sans-serif" transform={`rotate(${-element.rotation})`}>{element.label}</text>
                </g>
              ))}
            </svg>
          </div>
        </section>

        <aside className="inspector" aria-label="Properties">
          <div className="panel-heading"><span>Properties</span></div>
          {selected ? (
            <div className="property-form">
              <label>Label<input value={selected.label} onChange={(event) => updateSelected({ label: event.target.value })} /></label>
              <div className="property-row">
                <label>X<input type="number" value={selected.x} min="0" max={WIDTH} onChange={(event) => updateSelected({ x: Number(event.target.value) })} /></label>
                <label>Y<input type="number" value={selected.y} min="0" max={HEIGHT} onChange={(event) => updateSelected({ y: Number(event.target.value) })} /></label>
              </div>
              <label>Rotation<input type="range" min="0" max="345" step="15" value={selected.rotation} onChange={(event) => updateSelected({ rotation: Number(event.target.value) })} /><output>{selected.rotation}°</output></label>
              <label>Color<input className="color-input" type="color" value={selected.color} onChange={(event) => updateSelected({ color: event.target.value })} /></label>
              <div className="property-actions">
                <button onClick={duplicateSelected}>Duplicate</button>
                <button className="danger" onClick={removeSelected}>Delete</button>
              </div>
            </div>
          ) : selectedConnectionId ? (
            <div className="empty-inspector"><p>Connection selected.</p><button className="danger" onClick={removeSelected}>Delete connection</button></div>
          ) : (
            <div className="empty-inspector"><p>Select a component to edit its label, position, rotation, and color.</p><span>Tip: press Delete to remove a selection.</span></div>
          )}
        </aside>
      </section>
    </main>
  );
}
