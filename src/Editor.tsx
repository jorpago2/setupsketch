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
  | "curvedmirror"
  | "beamsplitter"
  | "lens"
  | "waveplate"
  | "dichroic"
  | "grating"
  | "beamdump"
  | "crystal"
  | "sample"
  | "detector"
  | "fiber"
  | "fibercoupler"
  | "aom"
  | "eom"
  | "isolator"
  | "cavity"
  | "kinematicmount"
  | "translationstage"
  | "rotationmount"
  | "fibercollimator"
  | "cagecube"
  | "source"
  | "oscilloscope"
  | "amplifier"
  | "hvamplifier"
  | "photodiode"
  | "qpd"
  | "mixer"
  | "lowpass"
  | "highpass"
  | "servo"
  | "spectrum"
  | "daq"
  | "attenuator"
  | "splitter"
  | "directionalcoupler"
  | "biastee"
  | "rfswitch"
  | "bandpass"
  | "vco"
  | "termination";

type ConnectionType = "beam" | "signal";

type LayerVisibility = {
  grid: boolean;
  labels: boolean;
  optics: boolean;
  electronics: boolean;
  beams: boolean;
  signals: boolean;
};

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
  type?: ConnectionType;
};

type Snapshot = {
  elements: DiagramElement[];
  connections: Connection[];
};

const WIDTH = 1200;
const HEIGHT = 700;
const STORAGE_KEY = "setupsketch-diagram-v1";

const elementKinds = new Set<ElementKind>([
  "laser", "mirror", "curvedmirror", "beamsplitter", "lens", "waveplate",
  "dichroic", "grating", "beamdump", "crystal", "sample", "detector", "fiber",
  "fibercoupler", "aom", "eom", "isolator", "cavity", "kinematicmount",
  "translationstage", "rotationmount", "fibercollimator", "cagecube", "source", "oscilloscope",
  "amplifier", "hvamplifier", "photodiode", "qpd", "mixer", "lowpass",
  "highpass", "servo", "spectrum", "daq", "attenuator", "splitter",
  "directionalcoupler", "biastee", "rfswitch", "bandpass", "vco", "termination",
]);

const electronicKinds = new Set<ElementKind>([
  "source", "oscilloscope", "amplifier", "hvamplifier", "photodiode", "qpd",
  "mixer", "lowpass", "highpass", "servo", "spectrum", "daq", "attenuator",
  "splitter", "directionalcoupler", "biastee", "rfswitch", "bandpass", "vco",
  "termination",
]);

const defaultColor = (kind: ElementKind) => {
  if (kind === "laser") return "#e84d3c";
  if (["sample", "crystal", "eom", "aom", "cavity"].includes(kind)) return "#7253cf";
  if (["detector", "photodiode", "qpd"].includes(kind)) return "#16846b";
  return electronicKinds.has(kind) ? "#303844" : "#2263d4";
};

const getConnectionType = (connection: Connection): ConnectionType =>
  connection.type ?? (connection.color.toLowerCase() === "#e84d3c" ? "beam" : "signal");

const componentGroups: Array<{
  title: string;
  items: Array<{ kind: ElementKind; label: string }>;
}> = [
  {
    title: "Optics & photonics",
    items: [
      { kind: "laser", label: "Laser" },
      { kind: "mirror", label: "Mirror" },
      { kind: "curvedmirror", label: "Curved mirror" },
      { kind: "beamsplitter", label: "Beam splitter" },
      { kind: "lens", label: "Lens" },
      { kind: "waveplate", label: "Wave plate" },
      { kind: "dichroic", label: "Dichroic mirror" },
      { kind: "grating", label: "Diffraction grating" },
      { kind: "beamdump", label: "Beam dump" },
      { kind: "crystal", label: "Nonlinear crystal" },
      { kind: "sample", label: "Sample" },
      { kind: "fiber", label: "Optical fiber" },
      { kind: "fibercoupler", label: "Fiber coupler" },
    ],
  },
  {
    title: "Modulation & compound",
    items: [
      { kind: "aom", label: "AOM" },
      { kind: "eom", label: "EOM" },
      { kind: "isolator", label: "Optical isolator" },
      { kind: "cavity", label: "Ring cavity" },
      { kind: "detector", label: "Detector" },
    ],
  },
  {
    title: "Lab hardware",
    items: [
      { kind: "kinematicmount", label: "Kinematic mount" },
      { kind: "translationstage", label: "Translation stage" },
      { kind: "rotationmount", label: "Rotation mount" },
      { kind: "fibercollimator", label: "Fiber collimator" },
      { kind: "cagecube", label: "Cage cube" },
    ],
  },
  {
    title: "RF & microwave",
    items: [
      { kind: "attenuator", label: "Attenuator" },
      { kind: "splitter", label: "Power splitter" },
      { kind: "directionalcoupler", label: "Directional coupler" },
      { kind: "biastee", label: "Bias tee" },
      { kind: "rfswitch", label: "RF switch" },
      { kind: "bandpass", label: "Band-pass filter" },
      { kind: "vco", label: "VCO" },
      { kind: "termination", label: "50 Ω termination" },
    ],
  },
  {
    title: "Electronics",
    items: [
      { kind: "source", label: "Source" },
      { kind: "oscilloscope", label: "Oscilloscope" },
      { kind: "amplifier", label: "Amplifier" },
      { kind: "hvamplifier", label: "HV amplifier" },
      { kind: "photodiode", label: "Photodiode" },
      { kind: "qpd", label: "Quadrant detector" },
      { kind: "mixer", label: "Mixer" },
      { kind: "lowpass", label: "Low-pass filter" },
      { kind: "highpass", label: "High-pass filter" },
      { kind: "servo", label: "Servo controller" },
      { kind: "spectrum", label: "Spectrum analyzer" },
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
  { id: "c1", from: "laser-1", to: "lens-1", color: "#e84d3c", type: "beam" },
  { id: "c2", from: "lens-1", to: "sample-1", color: "#e84d3c", type: "beam" },
  { id: "c3", from: "sample-1", to: "detector-1", color: "#e84d3c", type: "beam" },
  { id: "c4", from: "detector-1", to: "daq-1", color: "#242a35", type: "signal" },
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
      (connection.type === undefined || connection.type === "beam" || connection.type === "signal") &&
      ids.has(connection.from) && ids.has(connection.to);
  });
};

function ComponentShape({ element }: { element: DiagramElement }) {
  const common = { stroke: element.color, strokeWidth: 4, fill: "#ffffff", vectorEffect: "non-scaling-stroke" as const };

  switch (element.kind) {
    case "laser":
      return <><rect x="-48" y="-25" width="82" height="50" rx="4" {...common} /><circle cx="16" cy="0" r="8" fill="none" stroke={element.color} strokeWidth="3" /><path d="M-32 0H8M34 0H52M-37 -13L-27 -6M-37 13L-27 6" stroke={element.color} strokeWidth="3" strokeLinecap="round" /></>;
    case "mirror":
      return <><path d="M-32 30L32 -30" stroke={element.color} strokeWidth="8" strokeLinecap="round" /><path d="M-25 35L39 -29" stroke="#b8c0cc" strokeWidth="3" /></>;
    case "curvedmirror":
      return <><path d="M12 -42Q-22 0 12 42" fill="none" stroke={element.color} strokeWidth="8" strokeLinecap="round" /><path d="M20 -39Q-10 0 20 39" fill="none" stroke="#b8c0cc" strokeWidth="3" /></>;
    case "beamsplitter":
      return <><rect x="-34" y="-34" width="68" height="68" rx="3" {...common} /><path d="M-34 34L34 -34" stroke={element.color} strokeWidth="4" /><path d="M-34 -34L34 34" stroke={element.color} strokeWidth="1.5" opacity="0.35" /></>;
    case "lens":
      return <><path d="M0 -42C-22 -27 -22 27 0 42C22 27 22 -27 0 -42Z" {...common} /><path d="M-8 -25Q0 0 -8 25" fill="none" stroke="#9fc7ff" strokeWidth="3" /></>;
    case "waveplate":
      return <><rect x="-9" y="-42" width="18" height="84" rx="2" {...common} /><path d="M-9 25L9 -25M-16 14L-9 25L2 18" fill="none" stroke={element.color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></>;
    case "dichroic":
      return <><path d="M-26 40L26 -40" stroke="#b8c0cc" strokeWidth="12" strokeLinecap="round" /><path d="M-26 40L26 -40" stroke={element.color} strokeWidth="5" strokeLinecap="round" /><path d="M-42 0H42M0 -42V42" stroke="#e84d3c" strokeWidth="2.5" opacity="0.8" /></>;
    case "grating":
      return <><rect x="-40" y="-32" width="80" height="64" rx="4" {...common} /><path d="M-28 -31v62M-18 -31v62M-8 -31v62M2 -31v62M12 -31v62M22 -31v62M32 -31v62" stroke={element.color} strokeWidth="2" /></>;
    case "beamdump":
      return <><path d="M-42 -34L42 -20L42 20L-42 34Z" {...common} /><path d="M-29 -27L-5 26M-12 -24L12 23M5 -21L29 26" stroke={element.color} strokeWidth="3" /></>;
    case "crystal":
      return <><path d="M-42 -24L25 -32L43 -14L43 24L-25 32L-42 14Z" {...common} /><path d="M-42 -24L-25 -6L43 -14M-25 -6V32" fill="none" stroke={element.color} strokeWidth="2" opacity="0.7" /></>;
    case "sample":
      return <><rect x="-48" y="-28" width="96" height="56" rx="3" {...common} /><path d="M-34 14H34M-25 -14H25" stroke={element.color} strokeWidth="3" /><circle r="8" fill="none" stroke={element.color} strokeWidth="3" /></>;
    case "detector":
      return <><path d="M-38 -34H8A34 34 0 010 34H-38Z" {...common} /><path d="M-22 -16L6 0L-22 16Z" fill={element.color} stroke="none" /></>;
    case "fiber":
      return <><path d="M-50 16C-20 -34 20 34 50 -16" fill="none" stroke={element.color} strokeWidth="7" strokeLinecap="round" /><circle cx="-50" cy="16" r="6" fill="#fff" stroke={element.color} strokeWidth="3" /><circle cx="50" cy="-16" r="6" fill="#fff" stroke={element.color} strokeWidth="3" /></>;
    case "fibercoupler":
      return <><circle r="18" {...common} /><path d="M-52 -25C-28 -25 -24 -8 -16 -4M-52 25C-28 25 -24 8 -16 4M16 0H52" fill="none" stroke={element.color} strokeWidth="6" strokeLinecap="round" /><circle r="5" fill={element.color} /></>;
    case "aom":
      return <><rect x="-43" y="-31" width="86" height="62" rx="4" {...common} /><text y="7" textAnchor="middle" fill={element.color} fontSize="22" fontWeight="700" fontFamily="Arial, sans-serif">AOM</text><path d="M-52 0H-43M43 0H52" stroke="#e84d3c" strokeWidth="3" /></>;
    case "eom":
      return <><rect x="-43" y="-31" width="86" height="62" rx="4" {...common} /><text y="7" textAnchor="middle" fill={element.color} fontSize="22" fontWeight="700" fontFamily="Arial, sans-serif">EOM</text><path d="M-52 0H-43M43 0H52" stroke="#e84d3c" strokeWidth="3" /></>;
    case "isolator":
      return <><circle r="37" {...common} /><path d="M-22 0H20M8 -13L22 0L8 13" fill="none" stroke={element.color} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" /><path d="M-28 29L28 -29" stroke={element.color} strokeWidth="3" opacity="0.55" /></>;
    case "cavity":
      return <><path d="M-38 25L0 -34L40 25Z" fill="none" stroke={element.color} strokeWidth="4" /><path d="M-48 22L-30 32M-9 -38L9 -30M31 32L49 22" stroke={element.color} strokeWidth="7" strokeLinecap="round" /></>;
    case "kinematicmount":
      return <><circle cx="-8" r="29" {...common} /><path d="M20 -32L43 -18V25L20 34M-8 29V43M-27 43H28" fill="none" stroke={element.color} strokeWidth="4" strokeLinecap="round" /><circle cx="34" cy="-25" r="6" {...common} /><circle cx="34" cy="25" r="6" {...common} /></>;
    case "translationstage":
      return <><path d="M-51 28H51M-43 17H43" stroke={element.color} strokeWidth="5" strokeLinecap="round" /><rect x="-28" y="-23" width="56" height="40" rx="4" {...common} /><path d="M-12 -10H12M0 -20V8M33 -3H51" stroke={element.color} strokeWidth="3" /><circle cx="42" cy="-3" r="5" {...common} /></>;
    case "rotationmount":
      return <><path d="M-42 35H42M-30 35V24M30 35V24" stroke={element.color} strokeWidth="5" strokeLinecap="round" /><circle cy="-4" r="32" {...common} /><circle cy="-4" r="16" fill="none" stroke={element.color} strokeWidth="3" /><path d="M0 -36V-27M27 -20L20 -15M-27 -20L-20 -15" stroke={element.color} strokeWidth="3" /></>;
    case "fibercollimator":
      return <><path d="M-53 0H-35" stroke={element.color} strokeWidth="6" strokeLinecap="round" /><rect x="-35" y="-18" width="48" height="36" rx="4" {...common} /><path d="M13 -25V25M22 -29C10 -18 10 18 22 29M22 0H51" fill="none" stroke={element.color} strokeWidth="4" /></>;
    case "cagecube":
      return <><rect x="-34" y="-34" width="68" height="68" rx="3" {...common} /><path d="M-34 -34L-20 -45H45V20L34 34M34 -34L45 -45" fill="none" stroke={element.color} strokeWidth="3" /><circle r="17" fill="none" stroke={element.color} strokeWidth="3" /><circle cx="-27" cy="-27" r="4" fill={element.color} /><circle cx="27" cy="27" r="4" fill={element.color} /></>;
    case "source":
      return <><circle r="36" {...common} /><path d="M-24 0C-18 -22 -10 -22 -4 0S10 22 16 0S25 -22 29 0" fill="none" stroke={element.color} strokeWidth="4" /></>;
    case "oscilloscope":
      return <><rect x="-52" y="-34" width="104" height="68" rx="7" {...common} /><path d="M-38 4C-27 -24 -15 25 -3 0S21 -24 38 2" fill="none" stroke={element.color} strokeWidth="4" /></>;
    case "amplifier":
      return <><path d="M-42 -36L45 0L-42 36Z" {...common} /><path d="M-27 0h18M-18 -9v18" stroke={element.color} strokeWidth="3" /></>;
    case "hvamplifier":
      return <><path d="M-42 -36L45 0L-42 36Z" {...common} /><path d="M-11 -21L-24 4H-8L-19 24L18 -8H1L12 -21Z" fill={element.color} /></>;
    case "photodiode":
      return <><path d="M-32 -31L24 0L-32 31Z" {...common} /><path d="M25 -34v68M-13 -48l14 13M4 -50l14 13" stroke={element.color} strokeWidth="4" /></>;
    case "qpd":
      return <><circle r="38" {...common} /><path d="M-38 0H38M0 -38V38" stroke={element.color} strokeWidth="3" /><circle r="7" fill={element.color} /></>;
    case "mixer":
      return <><circle r="37" {...common} /><path d="M-18 -18L18 18M18 -18L-18 18" stroke={element.color} strokeWidth="5" strokeLinecap="round" /></>;
    case "lowpass":
      return <><rect x="-49" y="-31" width="98" height="62" rx="6" {...common} /><path d="M-35 -18V5C-35 18 -20 18 -10 18H35" fill="none" stroke={element.color} strokeWidth="4" /></>;
    case "highpass":
      return <><rect x="-49" y="-31" width="98" height="62" rx="6" {...common} /><path d="M-35 18H-10C3 18 3 3 3 -6V-18H35" fill="none" stroke={element.color} strokeWidth="4" /></>;
    case "servo":
      return <><rect x="-48" y="-31" width="96" height="62" rx="5" {...common} /><text y="8" textAnchor="middle" fill={element.color} fontSize="23" fontWeight="700" fontFamily="Arial, sans-serif">PID</text></>;
    case "spectrum":
      return <><rect x="-51" y="-34" width="102" height="68" rx="7" {...common} /><path d="M-37 22V8M-24 22V-2M-11 22V-20M2 22V10M15 22V-12M28 22V2M39 22V-25" stroke={element.color} strokeWidth="5" /></>;
    case "daq":
      return <><rect x="-48" y="-31" width="96" height="62" rx="7" {...common} /><path d="M-29 10v-20M-12 10V0M5 10v-30M22 10v-12" stroke={element.color} strokeWidth="5" /><circle cx="34" cy="-18" r="4" fill={element.color} /></>;
    case "attenuator":
      return <><path d="M-53 0H-43M43 0H53" stroke={element.color} strokeWidth="4" /><rect x="-43" y="-27" width="86" height="54" rx="5" {...common} /><text y="8" textAnchor="middle" fill={element.color} fontSize="22" fontWeight="700" fontFamily="Arial, sans-serif">ATT</text></>;
    case "splitter":
      return <><path d="M-52 0H-20M-20 0L28 -23H52M-20 0L28 23H52" fill="none" stroke={element.color} strokeWidth="5" strokeLinecap="round" /><circle cx="-20" r="7" fill="#fff" stroke={element.color} strokeWidth="3" /></>;
    case "directionalcoupler":
      return <><rect x="-46" y="-31" width="92" height="62" rx="5" {...common} /><path d="M-54 -14H54M-54 14H54M-20 -14C-8 -14 -8 14 4 14M-1 7L5 14L-2 20" fill="none" stroke={element.color} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" /></>;
    case "biastee":
      return <><circle r="31" {...common} /><path d="M-52 0H52M0 -52V-31" stroke={element.color} strokeWidth="4" /><text x="0" y="8" textAnchor="middle" fill={element.color} fontSize="20" fontWeight="700" fontFamily="Arial, sans-serif">T</text><text x="0" y="-37" textAnchor="middle" fill={element.color} fontSize="11" fontWeight="700" fontFamily="Arial, sans-serif">DC</text></>;
    case "rfswitch":
      return <><rect x="-45" y="-32" width="90" height="64" rx="5" {...common} /><path d="M-54 0H-18L22 -18M22 -18H54M22 18H54" fill="none" stroke={element.color} strokeWidth="4" strokeLinecap="round" /><circle cx="-18" r="5" fill={element.color} /><circle cx="22" cy="-18" r="5" fill={element.color} /><circle cx="22" cy="18" r="5" fill={element.color} /></>;
    case "bandpass":
      return <><rect x="-49" y="-31" width="98" height="62" rx="6" {...common} /><path d="M-35 18H-22C-13 18 -13 -18 -4 -18H13C22 -18 22 18 35 18" fill="none" stroke={element.color} strokeWidth="4" strokeLinecap="round" /></>;
    case "vco":
      return <><circle r="36" {...common} /><path d="M-23 1C-16 -17 -9 -17 -2 1S12 19 20 1" fill="none" stroke={element.color} strokeWidth="4" /><path d="M0 -52V-36M-6 -44L0 -36L6 -44" fill="none" stroke={element.color} strokeWidth="3" /></>;
    case "termination":
      return <><path d="M-53 0H-38" stroke={element.color} strokeWidth="4" /><rect x="-38" y="-26" width="76" height="52" rx="5" {...common} /><text y="8" textAnchor="middle" fill={element.color} fontSize="19" fontWeight="700" fontFamily="Arial, sans-serif">50 Ω</text></>;
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
  const [connectionType, setConnectionType] = useState<ConnectionType>("beam");
  const [layers, setLayers] = useState<LayerVisibility>({
    grid: true,
    labels: true,
    optics: true,
    electronics: true,
    beams: true,
    signals: true,
  });
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
      color: defaultColor(kind),
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
        const connection: Connection = {
          id: `connection-${Date.now()}`,
          from: connectFrom,
          to: id,
          color: connectionType === "beam" ? "#e84d3c" : "#303844",
          type: connectionType,
        };
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
          <label className="connection-type">
            <span className="sr-only">Connection type</span>
            <select value={connectionType} onChange={(event) => setConnectionType(event.target.value as ConnectionType)}>
              <option value="beam">Beam</option>
              <option value="signal">Signal</option>
            </select>
          </label>
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
                    <svg className="library-icon" viewBox="-60 -55 120 110" aria-hidden="true">
                      <ComponentShape element={{ id: "preview", kind: item.kind, label: "", x: 0, y: 0, rotation: 0, color: defaultColor(item.kind) }} />
                    </svg>
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
            <span className={connectMode ? "mode-note active" : "mode-note"} aria-live="polite">{connectMode ? (connectFrom ? `Select ${connectionType} destination` : `Select ${connectionType} source`) : notice}</span>
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
              {layers.grid && <rect className="grid-layer" width={WIDTH} height={HEIGHT} fill="url(#majorGrid)" />}
              {layers.labels && <g className="labels-layer">
                <text x="42" y="54" fill="#171b22" fontSize="25" fontWeight="700" fontFamily="Arial, sans-serif">{title}</text>
                <text x="42" y="80" fill="#6d7580" fontSize="12" fontFamily="Arial, sans-serif">Created with SetupSketch</text>
              </g>}

              {connections.filter((connection) => layers[getConnectionType(connection) === "beam" ? "beams" : "signals"]).map((connection) => {
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
                    <line
                      x1={x1} y1={y1} x2={x2} y2={y2}
                      stroke={connection.color}
                      strokeWidth={selectedEdge ? 5 : getConnectionType(connection) === "beam" ? 3 : 2.5}
                      strokeDasharray={getConnectionType(connection) === "signal" ? "9 5" : undefined}
                      markerEnd={getConnectionType(connection) === "signal" ? "url(#arrow)" : undefined}
                    />
                    <line
                      className="connection-hit"
                      x1={x1} y1={y1} x2={x2} y2={y2}
                      stroke="transparent" strokeWidth="18"
                      onPointerDown={(event) => { event.stopPropagation(); setSelectedConnectionId(connection.id); setSelectedId(null); }}
                    />
                  </g>
                );
              })}

              {elements.filter((element) => layers[electronicKinds.has(element.kind) ? "electronics" : "optics"]).map((element) => (
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
                  {layers.labels && <text className="labels-layer" y="65" textAnchor="middle" fill="#252b33" fontSize="14" fontWeight="600" fontFamily="Arial, sans-serif" transform={`rotate(${-element.rotation})`}>{element.label}</text>}
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
          <section className="layers-panel" aria-labelledby="layers-title">
            <div className="panel-heading"><span id="layers-title">Layers</span></div>
            {([
              ["grid", "Grid"],
              ["labels", "Labels"],
              ["optics", "Optical components"],
              ["electronics", "Electronics"],
              ["beams", "Optical beams"],
              ["signals", "Signal paths"],
            ] as Array<[keyof LayerVisibility, string]>).map(([key, label]) => (
              <label className="layer-toggle" key={key}>
                <input
                  type="checkbox"
                  checked={layers[key]}
                  onChange={(event) => setLayers((current) => ({ ...current, [key]: event.target.checked }))}
                />
                <span>{label}</span>
              </label>
            ))}
          </section>
        </aside>
      </section>
    </main>
  );
}
