"use client";

import {
  ChangeEvent,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Button,
  Checkbox,
  Column,
  Grid,
  IconButton,
  Layer,
  NumberInput,
  Popover,
  PopoverContent,
  Select,
  Slider,
  SkipToContent,
  TextArea,
  TextInput,
} from "@carbon/react";
import {
  BringToFront,
  Corner,
  Locked,
  ReflectHorizontal,
  ReflectVertical,
  SendToBack,
  SettingsAdjust,
  Unlocked,
  Copy, TrashCan,
} from "@carbon/react/icons";
import {
  ConnectionLineType,
  ControlButton,
  Controls,
  EdgeToolbar,
  Handle,
  MarkerType,
  NodeResizer,
  NodeToolbar,
  Position,
  useNodesState,
  type Connection as ReactFlowConnection,
  type Edge as ReactFlowEdge,
  type Node as ReactFlowNode,
  type NodeChange,
  type NodeMouseHandler,
  type NodeProps,
  type NodeTypes,
  type OnConnectEnd,
  type OnConnectStart,
  type OnNodeDrag,
  type OnSelectionChangeFunc,
  type ReactFlowInstance,
  type Viewport,
} from "@xyflow/react";
import { canvasEdgeTypeFor, defaultRoutingLabel, migrateCanvasRouting } from "./canvas/canvasRouting";
import {
  annotationKinds,
  componentByKind,
  componentDefinitions,
  componentGroups,
  componentPortLayouts,
  defaultColor,
  electronicKinds,
  elementKinds,
  mechanicalKinds,
  portTypeColors,
  portTypeFor,
  portTypeLabels,
  type ConnectionType,
  type ElementKind,
  type PortType,
} from "./library/componentCatalog";
import { arrangeOverlaps, calculateBudgets, findOpenPosition, moveElements, parseCsv, routeOrthogonal, validateSetup } from "./model/editorModel";
import { DiagramCanvas, WaypointEdgeComponent } from "./canvas/DiagramCanvas";
import { setupTemplates } from "./model/templates";
import { ComponentLibrary } from "./library/ComponentLibrary";
import { InspectorPanel } from "./inspector/InspectorPanel";
import { WorkspaceNavigation } from "../../components/ui/WorkspaceNavigation";
import { useWorkspaceMediaQuery } from "../../hooks/useWorkspaceMediaQuery";
import { InspectorDisclosure, UiIcon } from "../../components/ui/EditorControls";
import type { Connection, DiagramElement, ExperimentRecord, InspectorMode, LayerVisibility, PagePreset, Point, PublicationSettings, Routing, SavedModule, Snapshot, ViewportMode } from "./editorTypes";
import { annotationDefaultSizes, defaultCollapsedGroups, defaultExperiment, defaultPublication, DEFAULT_VIEWPORT, DIAGRAM_VERSION, FLOW_SNAP_GRID, FAVORITES_KEY, GRID_STEP, MODULES_KEY, pagePresets, resizableAnnotationKinds, STORAGE_KEY } from "./editorConfig";
import { cloneSnapshot, download, safeFilename } from "./model/editorPersistence";
import { closestPortPair, getConnectionDomain, getConnectionType, portsFor } from "./model/connectionGeometry";
import { csvCell, escapeLatex, formatBandwidth, optionalNumber, svgDataUri } from "./model/exportFormatting";
import { ExportReceipt, ScientificAppShell, ScientificHeader, ScientificStatusBar } from "@jorpago2/scientific-ui";

type DiagramFile = {
  version?: number;
  title?: string;
  elements: DiagramElement[];
  connections: Connection[];
  publication?: PublicationSettings;
  experiment?: ExperimentRecord;
  viewport?: Viewport;
  viewportMode?: ViewportMode;
  viewportWidth?: number;
};

const isViewport = (value: unknown): value is Viewport => {
  if (!value || typeof value !== "object") return false;
  const viewport = value as Record<string, unknown>;
  return ["x", "y", "zoom"].every((key) => typeof viewport[key] === "number" && Number.isFinite(viewport[key])) &&
    (viewport.zoom as number) >= 0.25 && (viewport.zoom as number) <= 2.5;
};

const isExperimentRecord = (value: unknown): value is ExperimentRecord => {
  if (!value || typeof value !== "object") return false;
  const experiment = value as Record<string, unknown>;
  return typeof experiment.procedure === "string" && Array.isArray(experiment.checklist) && experiment.checklist.every((item) => {
    if (!item || typeof item !== "object") return false;
    const candidate = item as Record<string, unknown>;
    return typeof candidate.id === "string" && typeof candidate.text === "string" && typeof candidate.done === "boolean";
  });
};

const isPublicationSettings = (value: unknown): value is PublicationSettings => {
  if (!value || typeof value !== "object") return false;
  const settings = value as Record<string, unknown>;
  return typeof settings.pagePreset === "string" && settings.pagePreset in pagePresets &&
    typeof settings.monochrome === "boolean" && typeof settings.showCredit === "boolean" &&
    (settings.cropToContent === undefined || typeof settings.cropToContent === "boolean") &&
    typeof settings.labelScale === "number" && Number.isFinite(settings.labelScale) &&
    settings.labelScale >= 0.7 && settings.labelScale <= 1.5;
};

const isDiagramFile = (value: unknown): value is DiagramFile => {
  if (!value || typeof value !== "object") return false;
  const diagram = value as Record<string, unknown>;
  if (diagram.title !== undefined && typeof diagram.title !== "string") return false;
  if (diagram.publication !== undefined && !isPublicationSettings(diagram.publication)) return false;
  if (diagram.experiment !== undefined && !isExperimentRecord(diagram.experiment)) return false;
  if (diagram.viewport !== undefined && !isViewport(diagram.viewport)) return false;
  if (diagram.viewportMode !== undefined && diagram.viewportMode !== "narrow" && diagram.viewportMode !== "wide") return false;
  if (diagram.viewportWidth !== undefined && (typeof diagram.viewportWidth !== "number" || !Number.isFinite(diagram.viewportWidth) || diagram.viewportWidth <= 0)) return false;
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
      typeof element.rotation !== "number" || !Number.isFinite(element.rotation) ||
      ["manufacturer", "model", "specs", "notes", "groupId"].some((key) =>
        element[key] !== undefined && typeof element[key] !== "string") ||
      ["serialNumber", "calibrationDate", "calibrationDueDate", "uncertainty", "datasheetUrl"].some((key) =>
        element[key] !== undefined && typeof element[key] !== "string") ||
      ["flipX", "flipY", "locked"].some((key) => element[key] !== undefined && typeof element[key] !== "boolean") ||
      ["scale", "width", "height", "powerDbm", "gainDb", "lossDb", "noiseFigureDb", "bandwidthHz", "wavelengthNm"].some((key) => element[key] !== undefined &&
        (typeof element[key] !== "number" || !Number.isFinite(element[key] as number)))
    ) return false;
    ids.add(element.id);
  }
  return diagram.connections.every((candidate) => {
    if (!candidate || typeof candidate !== "object") return false;
    const connection = candidate as Record<string, unknown>;
    return typeof connection.id === "string" && typeof connection.from === "string" &&
      typeof connection.to === "string" && typeof connection.color === "string" &&
      (connection.type === undefined || connection.type === "beam" || connection.type === "signal") &&
      (connection.routing === undefined || connection.routing === "straight" || connection.routing === "orthogonal") &&
      (connection.fromPort === undefined || typeof connection.fromPort === "string") &&
      (connection.toPort === undefined || typeof connection.toPort === "string") &&
      (connection.portType === undefined || Object.hasOwn(portTypeLabels, connection.portType as PortType)) &&
      ["lossDb", "bandwidthHz"].every((key) => connection[key] === undefined ||
        typeof connection[key] === "number" && Number.isFinite(connection[key] as number)) &&
      (connection.waypoints === undefined || Array.isArray(connection.waypoints) && connection.waypoints.every((point) =>
        point && typeof point === "object" && Number.isFinite((point as Point).x) && Number.isFinite((point as Point).y))) &&
      ids.has(connection.from) && ids.has(connection.to);
  });
};

const isSavedModule = (value: unknown): value is SavedModule => {
  if (!value || typeof value !== "object") return false;
  const module = value as Record<string, unknown>;
  return typeof module.id === "string" && typeof module.name === "string" &&
    isDiagramFile({ elements: module.elements, connections: module.connections });
};

const connectionPath = (connection: Connection, from: DiagramElement, to: DiagramElement, elements: DiagramElement[]): Point[] => {
  const nearest = closestPortPair(from, to);
  const sourcePort = portsFor(from).find((port) => port.id === connection.fromPort) ?? nearest.source;
  const targetPort = portsFor(to).find((port) => port.id === connection.toPort) ?? nearest.target;
  const source = sourcePort;
  const target = targetPort;
  if (connection.waypoints?.length) {
    if (connection.routing !== "orthogonal") return [source, ...connection.waypoints, target];
    const points: Point[] = [source];
    for (const waypoint of connection.waypoints) {
      const previous = points.at(-1)!;
      points.push({ x: waypoint.x, y: previous.y }, waypoint);
    }
    const previous = points.at(-1)!;
    return [...points, { x: target.x, y: previous.y }, target];
  }
  if ((connection.routing ?? (getConnectionType(connection) === "signal" ? "orthogonal" : "straight")) === "straight") {
    return [source, target];
  }
  return routeOrthogonal(source, target, elements, [from.id, to.id]);
};

function ComponentPortStubs({ element }: { element: DiagramElement }) {
  if (annotationKinds.has(element.kind) || mechanicalKinds.has(element.kind)) return null;
  const layout = componentByKind.get(element.kind)?.ports ?? "lr";
  return <>{componentPortLayouts[layout].map((port) => (
    <line
      key={port.id}
      x1={port.x * 0.58}
      y1={port.y * 0.58}
      x2={port.x}
      y2={port.y}
      stroke={element.color === "#20242a" ? element.color : portTypeColors[portTypeFor(element.kind, port.id)]}
      strokeWidth="3.2"
      strokeLinecap="round"
      vectorEffect="non-scaling-stroke"
    />
  ))}</>;
}

function ComponentShape({ element, monochrome = false }: { element: DiagramElement; monochrome?: boolean }) {
  const common = { stroke: element.color, strokeWidth: 3.4, fill: "var(--color-canvas-surface)", vectorEffect: "non-scaling-stroke" as const };

  switch (element.kind) {
    case "laser":
      return <><path d="M-58 0H-29" stroke={monochrome ? element.color : portTypeColors.dc} strokeWidth="3.4" /><path d="M18 0H58" stroke={monochrome ? element.color : portTypeColors["optical-free-space"]} strokeWidth="4" /><circle r="10" {...common} /><circle r="4" fill={element.color} /><path d="M0 -30V-18M0 18V30M-21 -21L-13 -13M13 13L21 21M21 -21L13 -13M-13 13L-21 21M-29 0H-18" fill="none" stroke={element.color} strokeWidth="3.2" strokeLinecap="round" /></>;
    case "mirror":
      return <><path d="M-32 30L32 -30" stroke={element.color} strokeWidth="8" strokeLinecap="round" /><path d="M-25 35L39 -29" stroke="var(--color-canvas-muted)" strokeWidth="3" /></>;
    case "curvedmirror":
      return <><path d="M12 -42Q-22 0 12 42" fill="none" stroke={element.color} strokeWidth="8" strokeLinecap="round" /><path d="M20 -39Q-10 0 20 39" fill="none" stroke="var(--color-canvas-muted)" strokeWidth="3" /></>;
    case "beamsplitter":
      return <><rect x="-34" y="-34" width="68" height="68" rx="3" {...common} /><path d="M-34 34L34 -34" stroke={element.color} strokeWidth="4.2" /><path d="M-24 34L34 -24" stroke={element.color} strokeWidth="1.8" opacity="0.35" /><path d="M-34 -34L-25 -43H43V25L34 34M34 -34L43 -43" fill="none" stroke={element.color} strokeWidth="1.7" opacity="0.55" /></>;
    case "lens":
      return <><path d="M0 -42C-22 -27 -22 27 0 42C22 27 22 -27 0 -42Z" {...common} /><path d="M-8 -27Q0 0 -8 27M8 -27Q0 0 8 27" fill="none" stroke={element.color} strokeWidth="1.8" opacity="0.36" /></>;
    case "waveplate":
      return <><rect x="-9" y="-42" width="18" height="84" rx="2" {...common} /><path d="M-14 28L14 -28M7 -27L14 -28L13 -21M-7 27L-14 28L-13 21" fill="none" stroke={element.color} strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round" /><path d="M-3 -34V34" stroke={element.color} strokeWidth="1.5" opacity="0.35" /></>;
    case "polarizer":
      return <><path d="M-58 0H-37M37 0H58" stroke={element.color} strokeWidth="3.4" /><circle r="37" {...common} /><path d="M-18 24L18 -24M10 -24H18V-16M-10 24H-18V16" fill="none" stroke={element.color} strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" /></>;
    case "pbs":
      return <><path d="M-58 0H-34M34 0H58M0 -58V-34M0 34V58" stroke={element.color} strokeWidth="3.4" /><rect x="-34" y="-34" width="68" height="68" rx="3" {...common} /><path d="M-34 34L34 -34" stroke={element.color} strokeWidth="4" /><text x="-20" y="-13" textAnchor="middle" fill={element.color} fontSize="11" fontWeight="700" fontFamily="Arial, sans-serif">P</text><text x="20" y="22" textAnchor="middle" fill={element.color} fontSize="11" fontWeight="700" fontFamily="Arial, sans-serif">S</text></>;
    case "ndfilter":
      return <><path d="M-58 0H-12M12 0H58" stroke={element.color} strokeWidth="3.4" /><rect x="-12" y="-40" width="24" height="80" rx="2" {...common} /><path d="M-8 -27L8 -12M-8 -8L8 7M-8 12L8 27" stroke={element.color} strokeWidth="2.6" opacity="0.7" /><text x="0" y="4" textAnchor="middle" fill={element.color} fontSize="8" fontWeight="700" fontFamily="Arial, sans-serif">ND</text></>;
    case "dichroic":
      return <><path d="M-26 40L26 -40" stroke="#c7ccd3" strokeWidth="12" strokeLinecap="round" /><path d="M-26 40L26 -40" stroke={element.color} strokeWidth="4.2" strokeLinecap="round" /><circle r="12" fill="#fff" stroke={element.color} strokeWidth="2.4" /><text x="0" y="5" textAnchor="middle" fill={element.color} fontSize="15" fontWeight="700" fontFamily="serif">λ</text></>;
    case "grating":
      return <g transform="rotate(25)"><rect x="-9" y="-42" width="18" height="84" rx="1" {...common} /><path d="M-18 -28H8M-18 -14H8M-18 0H8M-18 14H8M-18 28H8" stroke={element.color} strokeWidth="2.2" strokeLinecap="round" /></g>;
    case "beamdump":
      return <><path d="M-42 -34L42 -20L42 20L-42 34Z" {...common} /><path d="M-29 -27L-5 26M-12 -24L12 23M5 -21L29 26" stroke={element.color} strokeWidth="3" /></>;
    case "crystal":
      return <><path d="M-42 -24L25 -32L43 -14L43 24L-25 32L-42 14Z" {...common} /><path d="M-42 -24L-25 -6L43 -14M-25 -6V32" fill="none" stroke={element.color} strokeWidth="2" opacity="0.7" /></>;
    case "sample":
      return <><rect x="-48" y="-28" width="96" height="56" rx="3" {...common} /><path d="M-36 -13H36V13H-36Z" fill={element.color} fillOpacity="0.08" stroke={element.color} strokeWidth="2" /><circle r="8" fill="#fff" stroke={element.color} strokeWidth="2.6" /><path d="M-28 -19H28M-28 19H28" stroke={element.color} strokeWidth="1.7" opacity="0.55" /></>;
    case "detector":
      return <><path d="M-58 0H-42" stroke={monochrome ? element.color : portTypeColors["optical-free-space"]} strokeWidth="3.4" /><rect x="-42" y="-29" width="84" height="58" rx="4" {...common} /><circle cx="-17" cy="0" r="15" fill="none" stroke={element.color} strokeWidth="2.8" /><circle cx="-17" cy="0" r="4" fill={element.color} /><text x="17" y="5" textAnchor="middle" fill={element.color} fontSize="13" fontWeight="700" fontFamily="Arial, sans-serif">PD</text><path d="M42 0H58" stroke={monochrome ? element.color : portTypeColors.rf} strokeWidth="3.4" /></>;
    case "fiber":
      return <><path d="M-50 16C-20 -34 20 34 50 -16" fill="none" stroke={element.color} strokeWidth="7" strokeLinecap="round" /><circle cx="-50" cy="16" r="6" fill="#fff" stroke={element.color} strokeWidth="3" /><circle cx="50" cy="-16" r="6" fill="#fff" stroke={element.color} strokeWidth="3" /></>;
    case "fibercoupler":
      return <><path d="M-52 -23C-24 -23 -22 21 3 21S25 -23 52 -23M-52 23C-24 23 -22 -21 3 -21S25 23 52 23" fill="none" stroke={element.color} strokeWidth="5" strokeLinecap="round" /><path d="M-13 -8C-5 -3 -5 3 -13 8M13 -8C5 -3 5 3 13 8" fill="none" stroke={element.color} strokeWidth="2.5" opacity="0.7" /></>;
    case "aom":
      return <><rect x="-43" y="-31" width="86" height="62" rx="4" {...common} /><path d="M-27 22L7 -22M-15 24L19 -20M-3 24L31 -20" stroke={element.color} strokeWidth="2" opacity="0.62" /><path d="M0 -51V-31M-9 -44Q0 -52 9 -44M-13 -36Q0 -48 13 -36" fill="none" stroke={element.color} strokeWidth="2.4" strokeLinecap="round" /><text x="27" y="24" textAnchor="middle" fill={element.color} fontSize="11" fontWeight="700" fontFamily="Arial, sans-serif">AOM</text></>;
    case "eom":
      return <><rect x="-43" y="-31" width="86" height="62" rx="4" {...common} /><rect x="-24" y="-20" width="48" height="40" rx="2" fill={element.color} fillOpacity="0.07" stroke={element.color} strokeWidth="1.8" /><path d="M-31 -24H31M-31 24H31M0 -51V-31M-8 -12V12M-13 -7L-8 -12L-3 -7M-13 7L-8 12L-3 7" fill="none" stroke={element.color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /><text x="28" y="17" textAnchor="middle" fill={element.color} fontSize="10" fontWeight="700" fontFamily="Arial, sans-serif">EOM</text></>;
    case "faradayrotator":
      return <><path d="M-58 0H-37M37 0H58" stroke={element.color} strokeWidth="3.4" /><circle r="37" {...common} /><path d="M-17 15A23 23 0 1120 9M20 9L20 -1M20 9L10 9" fill="none" stroke={element.color} strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" /><text x="0" y="6" textAnchor="middle" fill={element.color} fontSize="11" fontWeight="700" fontFamily="Arial, sans-serif">45°</text></>;
    case "mzm":
      return <><path d="M-58 0H-42M42 0H58M0 -58V-31" stroke={element.color} strokeWidth="3.4" /><rect x="-42" y="-31" width="84" height="62" rx="3" {...common} /><path d="M-42 0H-27C-17 0 -17 -16 -7 -16H15C25 -16 25 0 42 0M-27 0C-17 0 -17 16 -7 16H15C25 16 25 0 42 0M-13 -24H21M-13 24H21" fill="none" stroke={element.color} strokeWidth="2.8" strokeLinecap="round" /></>;
    case "isolator":
      return <><circle r="37" {...common} /><path d="M-23 0H17M4 -13L18 0L4 13M24 -18V18" fill="none" stroke={element.color} strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" /></>;
    case "cavity":
      return <><path d="M-38 25L0 -34L40 25Z" fill="none" stroke={element.color} strokeWidth="4" /><path d="M-48 22L-30 32M-9 -38L9 -30M31 32L49 22" stroke={element.color} strokeWidth="7" strokeLinecap="round" /></>;
    case "opticalcirculator":
      return <><path d="M-58 0H-36M36 0H58M0 36V58" stroke={element.color} strokeWidth="3.4" /><circle r="36" {...common} /><path d="M-18 18A25 25 0 1120 13M20 13L20 2M20 13L9 13" fill="none" stroke={element.color} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" /></>;
    case "wdm":
      return <><path d="M-58 0H-42M42 -21H58M42 21H58" stroke={element.color} strokeWidth="3.4" /><rect x="-42" y="-31" width="84" height="62" rx="3" {...common} /><path d="M-42 0H-20L25 -21H42M-20 0L25 21H42" fill="none" stroke={element.color} strokeWidth="3" strokeLinecap="round" /><text x="20" y="-10" fill={element.color} fontSize="10" fontFamily="serif">λ₁</text><text x="20" y="25" fill={element.color} fontSize="10" fontFamily="serif">λ₂</text></>;
    case "fbg":
      return <><path d="M-58 0H58" stroke={element.color} strokeWidth="5" strokeLinecap="round" /><path d="M-24 -20V20M-16 -20V20M-8 -20V20M0 -20V20M8 -20V20M16 -20V20M24 -20V20" stroke="#fff" strokeWidth="2.6" /><path d="M-27 -24H27M-27 24H27" stroke={element.color} strokeWidth="2" opacity="0.55" /></>;
    case "edfa":
      return <><path d="M-58 0H-42M45 0H58" stroke={element.color} strokeWidth="3.4" /><path d="M-42 -36L45 0L-42 36Z" {...common} /><text x="-8" y="6" textAnchor="middle" fill={element.color} fontSize="14" fontWeight="700" fontFamily="Arial, sans-serif">EDFA</text></>;
    case "ringresonator":
      return <><path d="M-58 12H58" stroke={element.color} strokeWidth="5" strokeLinecap="round" /><circle cx="0" cy="-17" r="24" fill="#fff" stroke={element.color} strokeWidth="4" /><path d="M-16 -33A22 22 0 0120 -21" fill="none" stroke={element.color} strokeWidth="2" opacity="0.45" /></>;
    case "opticalswitch":
      return <><path d="M-58 0H-42M42 -21H58M42 21H58" stroke={element.color} strokeWidth="3.4" /><rect x="-42" y="-31" width="84" height="62" rx="3" {...common} /><path d="M-42 0H-17L23 -19M23 -19H42M23 20H42" fill="none" stroke={element.color} strokeWidth="3.4" strokeLinecap="round" /><circle cx="-17" r="4.5" fill={element.color} /><circle cx="23" cy="-19" r="4.5" fill={element.color} /><circle cx="23" cy="20" r="4.5" fill={element.color} /></>;
    case "gratingcoupler":
      return <><path d="M-58 0H-22M0 -58V-31" stroke={element.color} strokeWidth="3.4" /><path d="M-22 -24H30L42 24H-22Z" {...common} /><path d="M-12 -18V18M-3 -18V18M6 -17V18M15 -15V18M24 -12V18" stroke={element.color} strokeWidth="2.2" /><path d="M0 -31C8 -23 14 -18 24 -14" fill="none" stroke={element.color} strokeWidth="2.4" strokeDasharray="4 3" /></>;
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
    case "prism":
      return <path d="M0 -40L43 34H-43Z" {...common} />;
    case "objective":
      return <><path d="M-48 -18H-27L-18 -28H13L31 -17V17L13 28H-18L-27 18H-48Z" {...common} /><path d="M-27 -18V18M-18 -28V28M13 -28V28M31 -17C19 -10 19 10 31 17M31 0H50" fill="none" stroke={element.color} strokeWidth="3" /></>;
    case "shutter":
      return <><rect x="-38" y="-38" width="76" height="76" rx="5" {...common} /><circle r="25" fill="none" stroke={element.color} strokeWidth="3" /><path d="M-27 -27L27 -27L8 15Z" fill={element.color} opacity="0.82" /><circle cx="-27" cy="-27" r="5" fill="#fff" stroke={element.color} strokeWidth="3" /><path d="M-12 -46H12V-38" fill="none" stroke={element.color} strokeWidth="5" strokeLinecap="round" /></>;
    case "iris":
      return <><circle r="39" {...common} /><circle r="14" fill="none" stroke={element.color} strokeWidth="3" /><path d="M0 -38L12 -14M33 -19L14 2M33 19L2 14M0 38L-12 14M-33 19L-14 -2M-33 -19L-2 -14" stroke={element.color} strokeWidth="4" strokeLinecap="round" /></>;
    case "breadboard":
      return <><rect x="-52" y="-34" width="104" height="68" rx="4" {...common} /><path d="M-35 -19h0M-17 -19h0M1 -19h0M19 -19h0M37 -19h0M-35 0h0M-17 0h0M1 0h0M19 0h0M37 0h0M-35 19h0M-17 19h0M1 19h0M19 19h0M37 19h0" stroke={element.color} strokeWidth="7" strokeLinecap="round" /></>;
    case "postholder":
      return <><path d="M0 -45V27M-11 -33H11M-11 -20H11" stroke={element.color} strokeWidth="6" strokeLinecap="round" /><rect x="-17" y="-19" width="34" height="47" rx="6" {...common} /><path d="M-35 38H35L27 27H-27Z" {...common} /><circle cx="11" cy="-8" r="4" fill={element.color} /></>;
    case "flipmount":
      return <><path d="M-42 38H42M-28 38V27M28 38V27" stroke={element.color} strokeWidth="5" strokeLinecap="round" /><path d="M20 27L-10 -13" stroke={element.color} strokeWidth="7" strokeLinecap="round" /><circle cx="-18" cy="-24" r="20" {...common} /><circle cx="20" cy="27" r="6" fill={element.color} /><path d="M30 15A37 37 0 0016 -31M15 -21L16 -31L26 -28" fill="none" stroke={element.color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></>;
    case "motorizedstage":
      return <><path d="M-53 29H28M-45 18H26" stroke={element.color} strokeWidth="5" strokeLinecap="round" /><rect x="-31" y="-23" width="58" height="41" rx="4" {...common} /><rect x="27" y="-15" width="25" height="30" rx="5" {...common} /><path d="M-14 -9H10M-2 -20V8M35 -7V7M43 -7V7" stroke={element.color} strokeWidth="3" /></>;
    case "textnote":
      return <><rect x={-(element.width ?? 150) / 2} y={-(element.height ?? 70) / 2} width={element.width ?? 150} height={element.height ?? 70} rx="5" fill="#fffdf3" stroke={element.color} strokeWidth="2" strokeDasharray="5 4" /><text y="5" textAnchor="middle" fill={element.color} fontSize="16" fontFamily="Arial, sans-serif">{element.label}</text></>;
    case "equation":
      return <><rect x={-(element.width ?? 180) / 2} y={-(element.height ?? 60) / 2} width={element.width ?? 180} height={element.height ?? 60} rx="4" fill="#fff" stroke={element.color} strokeWidth="1.5" /><text y="6" textAnchor="middle" fill={element.color} fontSize="18" fontStyle="italic" fontFamily="Georgia, serif">{element.label}</text></>;
    case "region":
      return <><rect x={-(element.width ?? 220) / 2} y={-(element.height ?? 150) / 2} width={element.width ?? 220} height={element.height ?? 150} rx="10" fill={element.color} fillOpacity="0.06" stroke={element.color} strokeWidth="2" strokeDasharray="9 6" /><text x={-(element.width ?? 220) / 2 + 12} y={-(element.height ?? 150) / 2 + 22} fill={element.color} fontSize="14" fontWeight="700" fontFamily="Arial, sans-serif">{element.label}</text></>;
    case "dimension":
      return <><path d={`M${-(element.width ?? 180) / 2} 0H${(element.width ?? 180) / 2}M${-(element.width ?? 180) / 2} -12V12M${(element.width ?? 180) / 2} -12V12`} fill="none" stroke={element.color} strokeWidth="2" /><path d={`M${-(element.width ?? 180) / 2} 0l12 -6v12zM${(element.width ?? 180) / 2} 0l-12 -6v12z`} fill={element.color} /><text y="-10" textAnchor="middle" fill={element.color} fontSize="14" fontFamily="Arial, sans-serif">{element.label}</text></>;
    case "brace":
      return <><path d={`M${-(element.width ?? 180) / 2} 0C${-(element.width ?? 180) / 4} 0 ${-(element.width ?? 180) / 4} -18 0 -18C${(element.width ?? 180) / 4} -18 ${(element.width ?? 180) / 4} 0 ${(element.width ?? 180) / 2} 0`} fill="none" stroke={element.color} strokeWidth="3" /><text y="-29" textAnchor="middle" fill={element.color} fontSize="14" fontFamily="Arial, sans-serif">{element.label}</text></>;
    case "legend": {
      const width = element.width ?? 180;
      const height = element.height ?? 100;
      const left = -width / 2;
      const top = -height / 2;
      return <><rect x={left} y={top} width={width} height={height} rx="5" fill="#fff" stroke={element.color} strokeWidth="2" /><text x={left + 16} y={top + 23} fill={element.color} fontSize="14" fontWeight="700" fontFamily="Arial, sans-serif">{element.label}</text><path d={`M${left + 18} ${top + 45}h50`} stroke={monochrome ? element.color : portTypeColors["optical-free-space"]} strokeWidth="4" /><text x={left + 80} y={top + 50} fill={element.color} fontSize="12" fontFamily="Arial, sans-serif">Optical beam</text><path d={`M${left + 18} ${top + 75}h50`} stroke={element.color} strokeWidth="3" strokeDasharray="7 4" /><text x={left + 80} y={top + 80} fill={element.color} fontSize="12" fontFamily="Arial, sans-serif">Signal path</text></>;
    }
    case "source":
      return <><circle r="36" {...common} /><path d="M-24 0C-18 -22 -10 -22 -4 0S10 22 16 0S25 -22 29 0" fill="none" stroke={element.color} strokeWidth="4" /></>;
    case "oscilloscope":
      return <><rect x="-52" y="-35" width="104" height="70" rx="6" {...common} /><rect x="-41" y="-24" width="60" height="44" rx="2" fill={element.color} fillOpacity="0.05" stroke={element.color} strokeWidth="2.5" /><path d="M-35 4C-28 -17 -20 17 -11 0S3 -17 12 1" fill="none" stroke={element.color} strokeWidth="2.8" /><circle cx="35" cy="-16" r="7" fill="none" stroke={element.color} strokeWidth="2.5" /><circle cx="31" cy="13" r="5" fill="#fff" stroke={element.color} strokeWidth="2.4" /><circle cx="44" cy="13" r="5" fill="#fff" stroke={element.color} strokeWidth="2.4" /></>;
    case "amplifier":
      return <path d="M-42 -36L45 0L-42 36Z" {...common} />;
    case "hvamplifier":
      return <><path d="M-42 -36L45 0L-42 36Z" {...common} /><path d="M-11 -21L-24 4H-8L-19 24L18 -8H1L12 -21Z" fill={element.color} /></>;
    case "photodiode":
      return <><path d="M-32 -31L24 0L-32 31Z" {...common} /><path d="M25 -34v68M-18 -48L-4 -34M-13 -35L-4 -34L-5 -43M0 -49L14 -35M5 -36L14 -35L13 -44" fill="none" stroke={element.color} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" /></>;
    case "qpd":
      return <><circle r="38" {...common} /><path d="M-38 0H38M0 -38V38" stroke={element.color} strokeWidth="3" /><circle r="7" fill={element.color} /></>;
    case "mixer":
      return <><circle r="37" {...common} /><path d="M-18 -18L18 18M18 -18L-18 18" stroke={element.color} strokeWidth="5" strokeLinecap="round" /></>;
    case "lowpass":
      return <><rect x="-49" y="-31" width="98" height="62" rx="3" {...common} /><path d="M-34 -20V20H36M-31 -15V4C-31 15 -18 16 -8 16H33" fill="none" stroke={element.color} strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" /></>;
    case "highpass":
      return <><rect x="-49" y="-31" width="98" height="62" rx="3" {...common} /><path d="M-34 -20V20H36M-31 16H-8C3 16 3 4 3 -5V-16H33" fill="none" stroke={element.color} strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" /></>;
    case "servo":
      return <><rect x="-48" y="-31" width="96" height="62" rx="5" {...common} /><text y="8" textAnchor="middle" fill={element.color} fontSize="23" fontWeight="700" fontFamily="Arial, sans-serif">PID</text></>;
    case "spectrum":
      return <><rect x="-52" y="-35" width="104" height="70" rx="6" {...common} /><rect x="-41" y="-24" width="65" height="45" rx="2" fill={element.color} fillOpacity="0.05" stroke={element.color} strokeWidth="2.5" /><path d="M-35 15V8M-26 15V-3M-17 15V5M-8 15V-16M1 15V3M10 15V-8M19 15V9" stroke={element.color} strokeWidth="3.2" /><circle cx="38" cy="-14" r="7" fill="none" stroke={element.color} strokeWidth="2.5" /><circle cx="38" cy="14" r="5" fill="#fff" stroke={element.color} strokeWidth="2.4" /></>;
    case "daq":
      return <><rect x="-49" y="-32" width="98" height="64" rx="6" {...common} /><rect x="-35" y="-20" width="52" height="40" rx="2" fill={element.color} fillOpacity="0.05" stroke={element.color} strokeWidth="2.4" /><path d="M-28 10V-8M-17 10V1M-6 10V-14M5 10V-3M25 -16H39M25 -5H39M25 6H39M25 17H39" stroke={element.color} strokeWidth="2.8" strokeLinecap="round" /><circle cx="34" cy="-24" r="3.5" fill={element.color} /></>;
    case "attenuator":
      return <><rect x="-43" y="-27" width="86" height="54" rx="3" {...common} /><text y="8" textAnchor="middle" fill={element.color} fontSize="20" fontWeight="700" fontFamily="Arial, sans-serif">−dB</text></>;
    case "splitter":
      return <><rect x="-43" y="-32" width="86" height="64" rx="3" {...common} /><path d="M-43 0H-23L26 -20H43M-23 0L26 20H43" fill="none" stroke={element.color} strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" /><text x="10" y="5" textAnchor="middle" fill={element.color} fontSize="12" fontWeight="700" fontFamily="Arial, sans-serif">−3 dB</text></>;
    case "directionalcoupler":
      return <><rect x="-46" y="-31" width="92" height="62" rx="5" {...common} /><path d="M-54 -14H54M-54 14H54M-22 -14L-8 -14M-14 -21L-7 -14L-14 -7M8 14H22M14 7L21 14L14 21" fill="none" stroke={element.color} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" /></>;
    case "circulator":
      return <><circle r="36" {...common} /><path d="M-18 18A25 25 0 1120 13M20 13L20 2M20 13L9 13" fill="none" stroke={element.color} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" /></>;
    case "rfisolator":
      return <><rect x="-43" y="-28" width="86" height="56" rx="3" {...common} /><path d="M-27 0H18M5 -13L19 0L5 13M26 -18V18" fill="none" stroke={element.color} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" /></>;
    case "diplexer":
      return <><rect x="-43" y="-32" width="86" height="64" rx="3" {...common} /><path d="M-43 0H-22L22 -20H43M-22 0L22 20H43" fill="none" stroke={element.color} strokeWidth="3.2" strokeLinecap="round" /><text x="20" y="-10" textAnchor="middle" fill={element.color} fontSize="10" fontWeight="700" fontFamily="Arial, sans-serif">LP</text><text x="20" y="25" textAnchor="middle" fill={element.color} fontSize="10" fontWeight="700" fontFamily="Arial, sans-serif">HP</text></>;
    case "biastee":
      return <><rect x="-43" y="-31" width="86" height="62" rx="5" {...common} /><path d="M-54 0H-25M-25 -18V18M-14 -18V18M-14 0H54M10 0V-7C22 -7 22 -17 10 -17S-2 -27 10 -27S22 -37 10 -37V-52" fill="none" stroke={element.color} strokeWidth="3.5" strokeLinecap="round" /><circle cx="10" r="4" fill={element.color} /><text x="10" y="-40" textAnchor="middle" fill={element.color} fontSize="9" fontWeight="700" fontFamily="Arial, sans-serif">DC</text></>;
    case "rfswitch":
      return <><rect x="-45" y="-32" width="90" height="64" rx="5" {...common} /><path d="M-54 0H-18L22 -18M22 -18H54M22 18H54" fill="none" stroke={element.color} strokeWidth="4" strokeLinecap="round" /><circle cx="-18" r="5" fill={element.color} /><circle cx="22" cy="-18" r="5" fill={element.color} /><circle cx="22" cy="18" r="5" fill={element.color} /></>;
    case "bandpass":
      return <><rect x="-49" y="-31" width="98" height="62" rx="3" {...common} /><path d="M-34 -20V20H36M-31 16H-22C-13 16 -13 -16 -4 -16H13C22 -16 22 16 33 16" fill="none" stroke={element.color} strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" /></>;
    case "bandstop":
      return <><rect x="-49" y="-31" width="98" height="62" rx="3" {...common} /><path d="M-34 -20V20H36M-31 -15H-20C-11 -15 -11 16 -2 16H9C18 16 18 -15 33 -15" fill="none" stroke={element.color} strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" /></>;
    case "delayline":
      return <><rect x="-43" y="-28" width="86" height="56" rx="3" {...common} /><path d="M-43 0H-25C-18 -17 -10 -17 -3 0S12 17 20 0H43" fill="none" stroke={element.color} strokeWidth="3.2" strokeLinecap="round" /><text x="25" y="-10" textAnchor="middle" fill={element.color} fontSize="16" fontFamily="serif">τ</text></>;
    case "lna":
      return <><path d="M-42 -36L45 0L-42 36Z" {...common} /><text x="-8" y="6" textAnchor="middle" fill={element.color} fontSize="15" fontWeight="700" fontFamily="Arial, sans-serif">LNA</text></>;
    case "poweramplifier":
      return <><path d="M-42 -36L45 0L-42 36Z" {...common} /><text x="-8" y="6" textAnchor="middle" fill={element.color} fontSize="17" fontWeight="700" fontFamily="Arial, sans-serif">PA</text></>;
    case "iqmixer":
      return <><circle r="36" {...common} /><path d="M-17 -17L17 17M17 -17L-17 17" stroke={element.color} strokeWidth="4" strokeLinecap="round" /><text x="-29" y="-8" fill={element.color} fontSize="9" fontWeight="700" fontFamily="Arial, sans-serif">RF</text><text x="5" y="-24" fill={element.color} fontSize="9" fontWeight="700" fontFamily="Arial, sans-serif">LO</text><text x="25" y="-8" fill={element.color} fontSize="10" fontWeight="700" fontFamily="Arial, sans-serif">I</text><text x="7" y="31" fill={element.color} fontSize="10" fontWeight="700" fontFamily="Arial, sans-serif">Q</text></>;
    case "vco":
      return <><circle r="36" {...common} /><path d="M-23 1C-16 -17 -9 -17 -2 1S12 19 20 1" fill="none" stroke={element.color} strokeWidth="3.2" /><path d="M-30 29L30 -29M21 -29H30V-20" fill="none" stroke={element.color} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" /></>;
    case "termination":
      return <><path d="M-53 0H-38" stroke={element.color} strokeWidth="4" /><rect x="-38" y="-26" width="76" height="52" rx="5" {...common} /><text y="8" textAnchor="middle" fill={element.color} fontSize="19" fontWeight="700" fontFamily="Arial, sans-serif">50 Ω</text></>;
    case "balun":
      return <><rect x="-45" y="-31" width="90" height="62" rx="5" {...common} /><path d="M-54 0H-28M28 -14H54M28 14H54M-28 -18V18M28 -20V20M-28 18V27M-38 27H-18M-34 32H-22" fill="none" stroke={element.color} strokeWidth="3.5" /><path d="M-18 -18C-6 -18 -6 -6 -18 -6S-30 6 -18 6S-6 18 -18 18M18 -20C6 -20 6 -8 18 -8S30 4 18 4S6 16 18 16" fill="none" stroke={element.color} strokeWidth="3" /></>;
    case "dcblock":
      return <><rect x="-45" y="-29" width="90" height="58" rx="5" {...common} /><path d="M-54 0H-9M9 0H54M-9 -20V20M9 -20V20" stroke={element.color} strokeWidth="4" /><text y="-12" textAnchor="middle" fill={element.color} fontSize="10" fontWeight="700" fontFamily="Arial, sans-serif">DC</text></>;
    case "rftransformer":
      return <><rect x="-46" y="-31" width="92" height="62" rx="5" {...common} /><path d="M-54 -16H-31M-54 16H-31M31 -16H54M31 16H54M-31 -16V16M31 -16V16" stroke={element.color} strokeWidth="3.5" /><path d="M-21 -16C-9 -16 -9 -5 -21 -5S-33 6 -21 6S-9 16 -21 16M21 -16C9 -16 9 -5 21 -5S33 6 21 6S9 16 21 16" fill="none" stroke={element.color} strokeWidth="3" /></>;
    case "phaseshifter":
      return <><rect x="-43" y="-28" width="86" height="56" rx="3" {...common} /><text y="10" textAnchor="middle" fill={element.color} fontSize="30" fontFamily="serif">φ</text></>;
    case "frequencymultiplier":
      return <><path d="M-54 0H-43M43 0H54" stroke={element.color} strokeWidth="4" /><rect x="-43" y="-28" width="86" height="56" rx="5" {...common} /><text y="9" textAnchor="middle" fill={element.color} fontSize="25" fontWeight="700" fontFamily="Arial, sans-serif">×N</text></>;
    case "limiter":
      return <><rect x="-47" y="-29" width="94" height="58" rx="5" {...common} /><path d="M-54 0H-34C-26 -19 -18 -19 -10 0S6 19 14 0S30 -19 38 0H54M-31 -14H35M-31 14H35" fill="none" stroke={element.color} strokeWidth="3" strokeLinecap="round" /></>;
    case "rfdetector":
      return <><rect x="-46" y="-30" width="92" height="60" rx="5" {...common} /><path d="M-54 0H-27L-3 -16V16L-27 0M-2 -18V18M-2 0H20M20 -17V17M28 -17V17M28 0H54M24 17V25M16 25H32M19 29H29" fill="none" stroke={element.color} strokeWidth="3.5" strokeLinejoin="round" /></>;
    case "hybridcoupler":
      return <><rect x="-43" y="-32" width="86" height="64" rx="5" {...common} /><path d="M-54 -16H-43M-54 16H-43M43 -16H54M43 16H54M-27 -16H27M-27 16H27M-27 -16V16M27 -16V16" fill="none" stroke={element.color} strokeWidth="3" /><text y="6" textAnchor="middle" fill={element.color} fontSize="17" fontWeight="700" fontFamily="Arial, sans-serif">90°</text></>;
    case "networkanalyzer":
      return <><rect x="-53" y="-35" width="106" height="70" rx="6" {...common} /><rect x="-41" y="-24" width="62" height="42" rx="2" fill={element.color} fillOpacity="0.05" stroke={element.color} strokeWidth="2.5" /><path d="M-35 10C-27 -13 -18 -13 -10 7S5 21 14 -12" fill="none" stroke={element.color} strokeWidth="2.7" /><circle cx="37" cy="-16" r="7" fill="none" stroke={element.color} strokeWidth="2.5" /><circle cx="31" cy="16" r="5" fill="#fff" stroke={element.color} strokeWidth="2.4" /><circle cx="45" cy="16" r="5" fill="#fff" stroke={element.color} strokeWidth="2.4" /><text x="37" y="3" textAnchor="middle" fill={element.color} fontSize="8" fontWeight="700" fontFamily="Arial, sans-serif">VNA</text></>;
    case "dmm":
      return <><rect x="-48" y="-35" width="96" height="70" rx="6" {...common} /><rect x="-35" y="-23" width="49" height="20" rx="2" fill="none" stroke={element.color} strokeWidth="3" /><text x="-10" y="-8" textAnchor="middle" fill={element.color} fontSize="12" fontWeight="700" fontFamily="Arial, sans-serif">0.000</text><circle cx="27" cy="11" r="13" fill="none" stroke={element.color} strokeWidth="3" /><path d="M27 11L35 3" stroke={element.color} strokeWidth="3" /></>;
    case "powersupply":
      return <><rect x="-50" y="-35" width="100" height="70" rx="6" {...common} /><rect x="-38" y="-23" width="50" height="21" rx="2" fill="none" stroke={element.color} strokeWidth="3" /><text x="-13" y="-8" textAnchor="middle" fill={element.color} fontSize="11" fontWeight="700" fontFamily="Arial, sans-serif">12.0 V</text><circle cx="27" cy="-12" r="7" {...common} /><circle cx="27" cy="16" r="7" {...common} /><path d="M23 -12H31M27 -16V-8M23 16H31" stroke={element.color} strokeWidth="2" /></>;
    case "smu":
      return <><rect x="-50" y="-35" width="100" height="70" rx="6" {...common} /><rect x="-38" y="-23" width="54" height="27" rx="2" fill="none" stroke={element.color} strokeWidth="3" /><text x="-11" y="-6" textAnchor="middle" fill={element.color} fontSize="15" fontWeight="700" fontFamily="Arial, sans-serif">SMU</text><path d="M28 -21V20M20 -13L28 -21L36 -13M20 12L28 20L36 12" fill="none" stroke={element.color} strokeWidth="3" /><circle cx="-25" cy="20" r="5" {...common} /><circle cx="-8" cy="20" r="5" {...common} /></>;
    case "electronicload":
      return <><rect x="-50" y="-35" width="100" height="70" rx="6" {...common} /><rect x="-38" y="-23" width="52" height="22" rx="2" fill="none" stroke={element.color} strokeWidth="3" /><text x="-12" y="-8" textAnchor="middle" fill={element.color} fontSize="12" fontWeight="700" fontFamily="Arial, sans-serif">LOAD</text><path d="M24 -20V20L38 13L24 6L38 -1L24 -8L38 -15Z" fill="none" stroke={element.color} strokeWidth="3" /></>;
    case "waveformgenerator":
      return <><rect x="-52" y="-35" width="104" height="70" rx="6" {...common} /><rect x="-41" y="-24" width="61" height="43" rx="2" fill={element.color} fillOpacity="0.05" stroke={element.color} strokeWidth="2.5" /><path d="M-35 -2C-28 -17 -21 -17 -14 -2S0 13 8 -2" fill="none" stroke={element.color} strokeWidth="2.8" /><circle cx="37" cy="-15" r="7" fill="none" stroke={element.color} strokeWidth="2.5" /><circle cx="37" cy="16" r="6" fill="#fff" stroke={element.color} strokeWidth="2.4" /><path d="M30 3H44" stroke={element.color} strokeWidth="2.3" strokeLinecap="round" /></>;
    case "lcrmeter":
      return <><rect x="-50" y="-35" width="100" height="70" rx="6" {...common} /><rect x="-38" y="-23" width="54" height="25" rx="2" fill="none" stroke={element.color} strokeWidth="3" /><text x="-11" y="-6" textAnchor="middle" fill={element.color} fontSize="15" fontWeight="700" fontFamily="Arial, sans-serif">LCR</text><path d="M26 -19C39 -19 39 -5 26 -5S13 9 26 9S39 23 26 23" fill="none" stroke={element.color} strokeWidth="3" /><circle cx="-25" cy="20" r="5" {...common} /><circle cx="-8" cy="20" r="5" {...common} /></>;
    case "rfpowermeter":
      return <><rect x="-50" y="-35" width="100" height="70" rx="6" {...common} /><path d="M-34 8A25 25 0 0116 8M-9 8L7 -10" fill="none" stroke={element.color} strokeWidth="3" /><path d="M-34 8H16" stroke={element.color} strokeWidth="3" /><text x="-9" y="26" textAnchor="middle" fill={element.color} fontSize="11" fontWeight="700" fontFamily="Arial, sans-serif">dBm</text><circle cx="34" cy="16" r="7" {...common} /></>;
    case "camera":
      return <><rect x="-46" y="-30" width="92" height="60" rx="6" {...common} /><path d="M-24 -30L-16 -40H10L18 -30" {...common} /><circle r="18" fill="none" stroke={element.color} strokeWidth="3" /><circle r="7" fill={element.color} fillOpacity="0.12" stroke={element.color} strokeWidth="2.5" /><circle cx="32" cy="-17" r="3.5" fill={element.color} /></>;
    case "opticalspectrumanalyzer":
      return <><rect x="-52" y="-35" width="104" height="70" rx="6" {...common} /><rect x="-41" y="-24" width="65" height="45" rx="2" fill={element.color} fillOpacity="0.05" stroke={element.color} strokeWidth="2.5" /><path d="M-35 15V10L-27 7L-20 12L-12 -17L-4 9L4 5L12 14L19 11" fill="none" stroke={element.color} strokeWidth="2.7" strokeLinejoin="round" /><text x="38" y="-8" textAnchor="middle" fill={element.color} fontSize="10" fontWeight="700" fontFamily="Arial, sans-serif">OSA</text><circle cx="38" cy="14" r="6" fill="#fff" stroke={element.color} strokeWidth="2.4" /></>;
    case "opticalpowermeter":
      return <><rect x="-50" y="-35" width="100" height="70" rx="6" {...common} /><path d="M-35 9A25 25 0 0115 9M-10 9L5 -10M-35 9H15" fill="none" stroke={element.color} strokeWidth="3" /><text x="-10" y="27" textAnchor="middle" fill={element.color} fontSize="11" fontWeight="700" fontFamily="Arial, sans-serif">mW</text><circle cx="34" cy="16" r="7" {...common} /></>;
  }
}

type ScientificNodeData = {
  element: DiagramElement;
  labelsVisible: boolean;
  monochrome: boolean;
  portsVisible: boolean;
  labelScale: number;
};

type PaperNodeData = {
  title: string;
  showCredit: boolean;
  gridVisible: boolean;
  labelScale: number;
};

type ScientificFlowNode = ReactFlowNode<ScientificNodeData, "scientific">;
type PaperFlowNode = ReactFlowNode<PaperNodeData, "paper">;
type CanvasFlowNode = ScientificFlowNode | PaperFlowNode;
type ScientificEdgeData = { connection: Connection; waypoints?: Point[] };
type ScientificFlowEdge = ReactFlowEdge<ScientificEdgeData>;

const scientificNodeSize = (element: DiagramElement) => {
  const defaultSize = annotationDefaultSizes[element.kind] ?? { width: 120, height: 100 };
  const annotation = annotationKinds.has(element.kind);
  return {
    width: Math.max(annotation ? 48 : 128, (element.width ?? defaultSize.width) * (element.scale ?? 1) + 8),
    height: Math.max(annotation ? 58 : 132, (element.height ?? defaultSize.height) * (element.scale ?? 1) + 28),
  };
};

const handlePositionFor = (element: DiagramElement, port: ReturnType<typeof portsFor>[number]) => {
  const dx = port.x - element.x;
  const dy = port.y - element.y;
  return Math.abs(dx) >= Math.abs(dy)
    ? dx < 0 ? Position.Left : Position.Right
    : dy < 0 ? Position.Top : Position.Bottom;
};

const ScientificFlowNodeComponent = memo(function ScientificFlowNodeComponent({ data, selected, width: liveWidth, height: liveHeight }: NodeProps<ScientificFlowNode>) {
  const { element } = data;
  const modelSize = scientificNodeSize(element);
  const width = liveWidth ?? modelSize.width;
  const height = liveHeight ?? modelSize.height;
  const scale = element.scale ?? 1;
  const liveElement = resizableAnnotationKinds.has(element.kind) ? {
    ...element,
    width: Math.max(40, Math.min(600, (width - 8) / scale)),
    height: Math.max(30, Math.min(500, (height - 28) / scale)),
  } : element;
  const renderedElement = data.monochrome ? { ...liveElement, color: "#20242a" } : liveElement;
  return (
    <div className={`scientific-flow-node${selected ? " is-selected" : ""}${element.locked ? " is-locked" : ""}`} style={{ width, height }}>
      <NodeResizer
        isVisible={selected && resizableAnnotationKinds.has(element.kind)}
        minWidth={48}
        minHeight={58}
        maxWidth={608}
        maxHeight={528}
        lineClassName="annotation-resize-line"
        handleClassName="annotation-resize-handle"
      />
      <svg viewBox={`${-width / 2} ${-height / 2} ${width} ${height}`} aria-hidden="true">
        <g transform={`rotate(${element.rotation})`}>
          <g transform={`scale(${(element.scale ?? 1) * (element.flipX ? -1 : 1)} ${(element.scale ?? 1) * (element.flipY ? -1 : 1)})`}>
            <ComponentPortStubs element={renderedElement} />
            <ComponentShape element={renderedElement} monochrome={data.monochrome} />
          </g>
          {data.labelsVisible && !annotationKinds.has(element.kind) && <text y={70 * (element.scale ?? 1)} textAnchor="middle" fill="#252b33" fontSize={14 * data.labelScale} fontWeight="600" fontFamily="Arial, sans-serif" transform={`rotate(${-element.rotation})`}>{element.label}</text>}
        </g>
      </svg>
      {portsFor(element).map((port) => (
        <Handle
          className={`scientific-handle${data.portsVisible ? " is-visible" : ""}`}
          id={port.id}
          key={port.id}
          type="source"
          position={handlePositionFor(element, port)}
          isConnectable={data.portsVisible}
          aria-label={`${port.id}: ${portTypeLabels[port.type]}`}
          style={{ left: width / 2 + port.x - element.x, top: height / 2 + port.y - element.y, background: portTypeColors[port.type] }}
        />
      ))}
    </div>
  );
});

const PaperFlowNodeComponent = memo(function PaperFlowNodeComponent({ data }: NodeProps<PaperFlowNode>) {
  return (
    <div className={`flow-paper${data.gridVisible ? " has-grid" : ""}`}>
      <strong style={{ fontSize: 25 * data.labelScale }}>{data.title}</strong>
      {data.showCredit && <span style={{ fontSize: 12 * data.labelScale }}>Created with SetupSketch</span>}
    </div>
  );
});

const flowNodeTypes = { scientific: ScientificFlowNodeComponent, paper: PaperFlowNodeComponent } satisfies NodeTypes;
const flowEdgeTypes = { waypoint: WaypointEdgeComponent };

export default function Home() {
  const [elements, setElements] = useState<DiagramElement[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [title, setTitle] = useState("Untitled scientific setup");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null);
  const [connectFrom, setConnectFrom] = useState<string | null>(null);
  const [connectMode, setConnectMode] = useState(false);
  const [connectionDomain, setConnectionDomain] = useState<PortType>("optical-free-space");
  const [layers, setLayers] = useState<LayerVisibility>({
    grid: true,
    labels: true,
    optics: true,
    electronics: true,
    beams: true,
    signals: true,
    annotations: true,
  });
  const [past, setPast] = useState<Snapshot[]>([]);
  const [future, setFuture] = useState<Snapshot[]>([]);
  const [notice, setNotice] = useState("Saved");
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [inspectorMode, setInspectorMode] = useState<InspectorMode | null>(null);
  const [projectMenuOpen, setProjectMenuOpen] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [exportReceipt, setExportReceipt] = useState<{ fileName: string; format: string } | null>(null);
  const [publication, setPublication] = useState(defaultPublication);
  const [experiment, setExperiment] = useState(defaultExperiment);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [libraryQuery, setLibraryQuery] = useState("");
  const [favoriteKinds, setFavoriteKinds] = useState<ElementKind[]>([]);
  const [recentKinds, setRecentKinds] = useState<ElementKind[]>([]);
  const [collapsedGroups, setCollapsedGroups] = useState<string[]>(defaultCollapsedGroups);
  const [savedModules, setSavedModules] = useState<SavedModule[]>([]);
  const [checklistDraft, setChecklistDraft] = useState("");
  const [savedViewport, setSavedViewport] = useState<Viewport>(DEFAULT_VIEWPORT);
  const narrowWorkspace = useWorkspaceMediaQuery("(max-width: 63.999rem)");
  const dualPanelWorkspace = useWorkspaceMediaQuery("(min-width: 99rem)");
  const svgRef = useRef<SVGSVGElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const bomRef = useRef<HTMLInputElement>(null);
  const hydrated = useRef(false);
  const skipInitialSave = useRef(true);
  const editBefore = useRef<Snapshot | null>(null);
  const flowDragBefore = useRef<Snapshot | null>(null);
  const flowInstanceRef = useRef<ReactFlowInstance<CanvasFlowNode, ScientificFlowEdge> | null>(null);
  const autoFittingViewportRef = useRef(false);
  const pendingViewportRef = useRef<Viewport | null>(null);

  const dimensions = pagePresets[publication.pagePreset];
  const selected = selectedIds.length === 1 ? elements.find((element) => element.id === selectedIds[0]) ?? null : null;
  const selectedConnection = connections.find((connection) => connection.id === selectedConnectionId) ?? null;
  const hasSelection = selectedIds.length > 0 || selectedConnection !== null;
  const selection = useMemo(() => new Set(selectedIds), [selectedIds]);
  const allSelectedLocked = selectedIds.length > 0 && elements.filter((element) => selection.has(element.id)).every((element) => element.locked);
  const validationIssues = validateSetup(
    elements,
    connections,
    electronicKinds,
    annotationKinds,
    mechanicalKinds,
    (kind, portId) => elementKinds.has(kind as ElementKind) ? portTypeFor(kind as ElementKind, portId) : undefined,
  );
  const budgets = calculateBudgets(elements, connections);
  const modelFlowNodes = useMemo<CanvasFlowNode[]>(() => [
    {
      id: "__paper__",
      type: "paper",
      position: { x: 0, y: 0 },
      width: dimensions.width,
      height: dimensions.height,
      data: { title, showCredit: publication.showCredit, gridVisible: layers.grid, labelScale: publication.labelScale },
      draggable: false,
      selectable: false,
      connectable: false,
      focusable: false,
      deletable: false,
      zIndex: -1,
    },
    ...elements.map((element, index): ScientificFlowNode => {
      const size = scientificNodeSize(element);
      return {
        id: element.id,
        type: "scientific",
        position: { x: element.x - size.width / 2, y: element.y - size.height / 2 },
        width: size.width,
        height: size.height,
        data: {
          element,
          labelsVisible: layers.labels,
          monochrome: publication.monochrome,
          portsVisible: connectMode || selectedIds.includes(element.id),
          labelScale: publication.labelScale,
        },
        selected: selectedIds.includes(element.id),
        draggable: !element.locked,
        hidden: !layers[annotationKinds.has(element.kind) ? "annotations" : electronicKinds.has(element.kind) ? "electronics" : "optics"],
        zIndex: index + 1,
        ariaLabel: `${element.label}, ${componentByKind.get(element.kind)?.label ?? element.kind}${element.locked ? ", locked" : ""}`,
      };
    }),
  ], [connectMode, dimensions, elements, layers, publication.labelScale, publication.monochrome, publication.showCredit, selectedIds, title]);
  const modelFlowEdges = useMemo<ScientificFlowEdge[]>(() => connections.map((connection) => {
    const type = getConnectionType(connection);
    const color = publication.monochrome ? "#20242a" : connection.color;
    const from = elements.find((element) => element.id === connection.from);
    const to = elements.find((element) => element.id === connection.to);
    const domain = getConnectionDomain(connection, from);
    const edgeType = canvasEdgeTypeFor(domain, connection.routing, Boolean(connection.waypoints?.length));
    return {
      id: connection.id,
      type: edgeType,
      source: connection.from,
      target: connection.to,
      sourceHandle: connection.fromPort,
      targetHandle: connection.toPort,
      data: { connection: { ...connection, type }, waypoints: connection.waypoints },
      pathOptions: edgeType === "smoothstep"
        ? { offset: 28, borderRadius: 8 }
        : edgeType === "bezier" ? { curvature: 0.22 } : undefined,
      selected: selectedConnectionId === connection.id,
      hidden: !layers[type === "beam" ? "beams" : "signals"],
      markerEnd: type === "signal" ? { type: MarkerType.ArrowClosed, color } : undefined,
      style: { stroke: color, strokeWidth: selectedConnectionId === connection.id ? 4 : type === "beam" ? 3 : 2.5, strokeDasharray: type === "signal" ? "9 5" : undefined },
      reconnectable: true,
      ariaLabel: `${portTypeLabels[domain]} connection from ${from?.label ?? "unknown source"} to ${to?.label ?? "unknown destination"}`,
    };
  }), [connections, elements, layers, publication.monochrome, selectedConnectionId]);
  const [flowNodes, setFlowNodes, onFlowNodesChange] = useNodesState<CanvasFlowNode>(modelFlowNodes);
  const flowNodeExtent = useMemo(() => [[0, 0], [dimensions.width, dimensions.height]] as [[number, number], [number, number]], [dimensions]);
  const flowTranslateExtent = useMemo(() => [[-160, -160], [dimensions.width + 160, dimensions.height + 160]] as [[number, number], [number, number]], [dimensions]);
  const flowConnectionLineStyle = useMemo(() => ({ stroke: portTypeColors[connectionDomain], strokeWidth: 3 }), [connectionDomain]);
  const flowConnectionLineType = connectionDomain === "optical-free-space"
    ? ConnectionLineType.Straight
    : connectionDomain === "fiber" ? ConnectionLineType.Bezier : ConnectionLineType.SmoothStep;
  const viewportMode: ViewportMode = narrowWorkspace ? "narrow" : "wide";
  const toggleLibrary = () => setLibraryOpen((open) => {
    const next = !open;
    if (next && (!dualPanelWorkspace || inspectorMode !== "selection")) setInspectorMode(null);
    return next;
  });
  const toggleInspector = (mode: Exclude<InspectorMode, "selection">) => {
    setLibraryOpen(false);
    setInspectorMode((current) => current === mode ? null : mode);
  };
  const openSelectionInspector = useCallback(() => {
    if (!dualPanelWorkspace) setLibraryOpen(false);
    setInspectorMode("selection");
  }, [dualPanelWorkspace]);
  const closeLibrary = () => {
    document.getElementById("library-toggle")?.focus();
    setLibraryOpen(false);
  };
  const closeInspector = () => {
    document.getElementById(inspectorMode === "selection" ? "diagram-workspace" : `${inspectorMode}-toggle`)?.focus();
    setInspectorMode(null);
  };

  const restoreFlowViewport = useCallback((viewport: Viewport) => {
    setSavedViewport(viewport);
    pendingViewportRef.current = viewport;
    requestAnimationFrame(() => {
      if (!flowInstanceRef.current) return;
      void flowInstanceRef.current.setViewport(viewport);
      pendingViewportRef.current = null;
    });
  }, []);

  const fitFlowToWorkspace = useCallback((instance: ReactFlowInstance<CanvasFlowNode, ScientificFlowEdge>) => {
    const nodes = instance.getNodes().filter((node) => !node.hidden);
    const contentNodes = nodes.filter((node) => node.id !== "__paper__");
    const paper = nodes.find((node) => node.id === "__paper__");
    const targets = narrowWorkspace && contentNodes.length ? contentNodes : paper ? [paper] : nodes;
    return instance.fitView({
      nodes: targets,
      padding: narrowWorkspace ? 0.12 : 0.04,
      minZoom: 0.25,
      maxZoom: 1,
    });
  }, [narrowWorkspace]);

  const initializeFlow = useCallback((instance: ReactFlowInstance<CanvasFlowNode, ScientificFlowEdge>) => {
    flowInstanceRef.current = instance;
    const viewport = pendingViewportRef.current;
    requestAnimationFrame(() => {
      if (viewport) {
        void instance.setViewport(viewport);
        pendingViewportRef.current = null;
        return;
      }
      requestAnimationFrame(() => {
        void fitFlowToWorkspace(instance);
      });
    });
  }, [fitFlowToWorkspace]);

  const rememberFlowViewport = useCallback((viewport: Viewport) => {
    if (autoFittingViewportRef.current) return;
    setSavedViewport((current) => current.x === viewport.x && current.y === viewport.y && current.zoom === viewport.zoom ? current : viewport);
  }, []);

  const fitCanvas = useCallback(() => {
    const instance = flowInstanceRef.current;
    if (!instance) return;
    const visibleNodes = instance.getNodes().filter((node) => !node.hidden && node.id !== "__paper__");
    const selectedNodes = selectedIds.length ? visibleNodes.filter((node) => selectedIds.includes(node.id)) : [];
    const nodes = selectedNodes.length ? selectedNodes : visibleNodes.length ? visibleNodes : instance.getNodes().filter((node) => node.id === "__paper__");
    void instance.fitView({ nodes, padding: selectedNodes.length ? 0.2 : 0.08, maxZoom: selectedNodes.length ? 1.5 : 1 });
    setNotice(selectedNodes.length ? "Selection fitted" : "Diagram fitted");
  }, [selectedIds]);

  useEffect(() => setFlowNodes(modelFlowNodes), [modelFlowNodes, setFlowNodes]);

  useEffect(() => {
    if (!dualPanelWorkspace && libraryOpen && inspectorMode) setLibraryOpen(false);
  }, [dualPanelWorkspace, inspectorMode, libraryOpen]);

  useEffect(() => {
    let frame = 0;
    const scheduleWorkspaceFit = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        frame = requestAnimationFrame(() => {
          const instance = flowInstanceRef.current;
          if (!instance) return;
          autoFittingViewportRef.current = true;
          void fitFlowToWorkspace(instance)
            .finally(() => { autoFittingViewportRef.current = false; });
        });
      });
    };
    window.addEventListener("resize", scheduleWorkspaceFit);
    scheduleWorkspaceFit();
    return () => {
      window.removeEventListener("resize", scheduleWorkspaceFit);
      cancelAnimationFrame(frame);
    };
  }, [fitFlowToWorkspace, inspectorMode, libraryOpen, narrowWorkspace]);

  useEffect(() => {
    const dismissWithEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (projectMenuOpen) {
        document.getElementById("project-toggle")?.focus();
        setProjectMenuOpen(false);
      } else if (exportMenuOpen) {
        document.getElementById("export-toggle")?.focus();
        setExportMenuOpen(false);
      } else if (inspectorMode) {
        document.getElementById(inspectorMode === "selection" ? "diagram-workspace" : `${inspectorMode}-toggle`)?.focus();
        setInspectorMode(null);
      } else if (libraryOpen) {
        document.getElementById("library-toggle")?.focus();
        setLibraryOpen(false);
      }
    };
    document.addEventListener("keydown", dismissWithEscape);
    return () => document.removeEventListener("keydown", dismissWithEscape);
  }, [exportMenuOpen, inspectorMode, libraryOpen, projectMenuOpen]);

  useEffect(() => {
    if (!hasSelection && inspectorMode === "selection") setInspectorMode(null);
  }, [hasSelection, inspectorMode]);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed: unknown = JSON.parse(stored);
        if (isDiagramFile(parsed)) {
          setTitle(parsed.title || title);
          const storedPage = parsed.publication?.pagePreset ?? defaultPublication.pagePreset;
          let storedElements = (parsed.version ?? 0) < 5 ? arrangeOverlaps(parsed.elements, pagePresets[storedPage]) : parsed.elements;
          if ((parsed.version ?? 0) < DIAGRAM_VERSION && parsed.title === "Ring cavity") {
            storedElements = storedElements.map((element) => element.id === "sample" && element.rotation === -43
              ? { ...element, rotation: 47 }
              : element.id === "detector" && element.rotation === 0 ? { ...element, rotation: 90 } : element);
          }
          setElements(storedElements);
          setConnections(migrateCanvasRouting(parsed.connections, parsed.version ?? 0));
          if (parsed.publication) setPublication({ ...defaultPublication, ...parsed.publication });
          if (parsed.experiment) setExperiment(parsed.experiment);
          const widthRatio = parsed.viewportWidth ? window.innerWidth / parsed.viewportWidth : 0;
          if ((parsed.version ?? 0) >= 12 && parsed.viewport && viewportMode === "wide" && parsed.viewportMode === viewportMode && widthRatio >= 0.95 && widthRatio <= 1.05) restoreFlowViewport(parsed.viewport);
        }
      } catch {
        setNotice("Local draft could not be read");
      }
    }
    try {
      const storedFavorites: unknown = JSON.parse(localStorage.getItem(FAVORITES_KEY) ?? "[]");
      if (Array.isArray(storedFavorites)) {
        setFavoriteKinds(storedFavorites.filter((kind): kind is ElementKind => typeof kind === "string" && elementKinds.has(kind as ElementKind)));
      }
    } catch { /* Ignore a damaged preference; the diagram remains intact. */ }
    try {
      const storedModules: unknown = JSON.parse(localStorage.getItem(MODULES_KEY) ?? "[]");
      if (Array.isArray(storedModules)) setSavedModules(storedModules.filter(isSavedModule));
    } catch { /* Ignore damaged reusable modules. */ }
    hydrated.current = true;
  // The starter title is intentionally read only once.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (skipInitialSave.current) {
      skipInitialSave.current = false;
      return;
    }
    if (!hydrated.current) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: DIAGRAM_VERSION, title, elements, connections, publication, experiment, viewport: savedViewport, viewportMode, viewportWidth: window.innerWidth }));
  }, [title, elements, connections, publication, experiment, savedViewport, viewportMode]);

  useEffect(() => {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favoriteKinds));
  }, [favoriteKinds]);

  useEffect(() => {
    localStorage.setItem(MODULES_KEY, JSON.stringify(savedModules));
  }, [savedModules]);

  const commit = useCallback((nextElements: DiagramElement[], nextConnections = connections) => {
    const before = editBefore.current ?? cloneSnapshot(elements, connections, publication, experiment);
    editBefore.current = null;
    setPast((items) => [...items.slice(-39), before]);
    setFuture([]);
    setElements(nextElements);
    setConnections(nextConnections);
  }, [connections, elements, experiment, publication]);

  const commitPublication = (next: PublicationSettings) => {
    setPast((items) => [...items.slice(-39), cloneSnapshot(elements, connections, publication, experiment)]);
    setFuture([]);
    setPublication(next);
  };

  const commitExperiment = (next: ExperimentRecord) => {
    setPast((items) => [...items.slice(-39), cloneSnapshot(elements, connections, publication, experiment)]);
    setFuture([]);
    setExperiment(next);
  };

  const beginPropertyEdit = () => {
    if (!editBefore.current) editBefore.current = cloneSnapshot(elements, connections, publication, experiment);
  };

  const finishPropertyEdit = (nextTarget: EventTarget | null, container: HTMLElement) => {
    if (nextTarget instanceof Node && container.contains(nextTarget)) return;
    const before = editBefore.current;
    editBefore.current = null;
    if (!before || JSON.stringify(before) === JSON.stringify(cloneSnapshot(elements, connections, publication, experiment))) return;
    setPast((items) => [...items.slice(-39), before]);
    setFuture([]);
  };

  const undo = () => {
    const previous = past.at(-1);
    if (!previous) return;
    setFuture((items) => [cloneSnapshot(elements, connections, publication, experiment), ...items]);
    setPast((items) => items.slice(0, -1));
    setElements(previous.elements);
    setConnections(previous.connections);
    setPublication(previous.publication);
    setExperiment(previous.experiment);
    setSelectedIds([]);
    setSelectedConnectionId(null);
  };

  const redo = () => {
    const next = future[0];
    if (!next) return;
    setPast((items) => [...items, cloneSnapshot(elements, connections, publication, experiment)]);
    setFuture((items) => items.slice(1));
    setElements(next.elements);
    setConnections(next.connections);
    setPublication(next.publication);
    setExperiment(next.experiment);
    setSelectedIds([]);
    setSelectedConnectionId(null);
  };

  const addElement = (kind: ElementKind, label: string) => {
    const position = findOpenPosition(elements, dimensions);
    const element: DiagramElement = {
      id: `${kind}-${Date.now()}`,
      kind,
      label,
      ...position,
      rotation: 0,
      color: defaultColor(kind),
    };
    commit([...elements, element]);
    requestAnimationFrame(() => setSelectedIds([element.id]));
    setSelectedConnectionId(null);
    setRecentKinds((items) => [kind, ...items.filter((item) => item !== kind)].slice(0, 6));
    if (narrowWorkspace) setLibraryOpen(false);
  };

  const arrangeDiagram = () => {
    const arranged = arrangeOverlaps(elements, dimensions);
    if (arranged.every((element, index) => element.x === elements[index].x && element.y === elements[index].y)) {
      setNotice("No overlapping components");
      return;
    }
    commit(arranged);
    setSelectedIds([]);
    setSelectedConnectionId(null);
    setNotice("Overlapping components arranged");
  };

  const removeSelected = () => {
    if (selectedIds.length) {
      const ids = new Set(selectedIds);
      commit(
        elements.filter((element) => !ids.has(element.id)),
        connections.filter((connection) => !ids.has(connection.from) && !ids.has(connection.to)),
      );
      setSelectedIds([]);
    } else if (selectedConnectionId) {
      commit(elements, connections.filter((connection) => connection.id !== selectedConnectionId));
      setSelectedConnectionId(null);
    }
  };

  const updateSelected = (changes: Partial<DiagramElement>) =>
    setElements((items) => items.map((element) => selection.has(element.id) ? { ...element, ...changes } : element));

  const changeSelected = (changes: Partial<DiagramElement>) =>
    commit(elements.map((element) => selection.has(element.id) ? { ...element, ...changes } : element));

  const updateSelectedConnection = (changes: Partial<Connection>) =>
    setConnections((items) => items.map((connection) => connection.id === selectedConnectionId ? { ...connection, ...changes } : connection));

  const duplicateSelected = () => {
    if (!selectedIds.length) return;
    const stamp = Date.now();
    const idMap = new Map(selectedIds.map((id, index) => [id, `${id}-copy-${stamp}-${index}`]));
    const copies = elements.filter((element) => selection.has(element.id)).map((element) => ({
      ...element,
      id: idMap.get(element.id)!,
      x: element.x + 35,
      y: element.y + 35,
      label: `${element.label} copy`,
      groupId: element.groupId ? `group-${stamp}` : undefined,
    }));
    const copiedConnections = connections.filter((connection) => selection.has(connection.from) && selection.has(connection.to)).map((connection, index) => ({
      ...connection,
      id: `connection-copy-${stamp}-${index}`,
      from: idMap.get(connection.from)!,
      to: idMap.get(connection.to)!,
      waypoints: connection.waypoints?.map((point) => ({ x: point.x + 35, y: point.y + 35 })),
    }));
    commit([...elements, ...copies], [...connections, ...copiedConnections]);
    setSelectedIds(copies.map((element) => element.id));
  };

  const connectionFromFlow = useCallback((candidate: { source: string | null; target: string | null; sourceHandle?: string | null; targetHandle?: string | null }, ignoredConnectionId?: string): Omit<Connection, "id"> | null => {
    const from = elements.find((element) => element.id === candidate.source);
    const to = elements.find((element) => element.id === candidate.target);
    if (!from || !to || from.id === to.id || !candidate.sourceHandle || !candidate.targetHandle) return null;
    const sourceType = portTypeFor(from.kind, candidate.sourceHandle);
    const targetType = portTypeFor(to.kind, candidate.targetHandle);
    if (sourceType !== targetType) return null;
    const occupied = connections.some((connection) => connection.id !== ignoredConnectionId && (
      connection.from === from.id && connection.fromPort === candidate.sourceHandle ||
      connection.to === from.id && connection.toPort === candidate.sourceHandle ||
      connection.from === to.id && connection.fromPort === candidate.targetHandle ||
      connection.to === to.id && connection.toPort === candidate.targetHandle
    ));
    if (occupied) return null;
    const type: ConnectionType = sourceType === "optical-free-space" || sourceType === "fiber" ? "beam" : "signal";
    return {
      from: from.id,
      to: to.id,
      color: portTypeColors[sourceType],
      type,
      portType: sourceType,
      fromPort: candidate.sourceHandle,
      toPort: candidate.targetHandle,
    };
  }, [connections, elements]);

  const addFlowConnection = useCallback((candidate: ReactFlowConnection) => {
    const connection = connectionFromFlow(candidate);
    if (!connection) {
      setNotice("Choose two compatible, unused ports");
      return;
    }
    commit(elements, [...connections, { ...connection, id: `connection-${Date.now()}` }]);
    setConnectFrom(null);
    setConnectMode(false);
    setNotice("Connection added");
  }, [commit, connectionFromFlow, connections, elements]);

  const beginFlowConnection = useCallback<OnConnectStart>((_, { nodeId, handleId }) => {
    const element = elements.find((candidate) => candidate.id === nodeId);
    if (!element || !handleId) return;
    const domain = portTypeFor(element.kind, handleId);
    setConnectionDomain(domain);
    setNotice(`Connect to an unused ${portTypeLabels[domain]} port`);
  }, [elements]);

  const finishFlowConnection = useCallback<OnConnectEnd>((_, state) => {
    if (!state.isValid) setNotice("No connection added: choose a compatible unused port");
  }, []);

  const selectFlowNode = useCallback((id: string) => {
    if (!connectMode) {
      if (narrowWorkspace) {
        setSelectedIds([id]);
        openSelectionInspector();
      }
      return;
    }
    if (!connectFrom) {
      setConnectFrom(id);
      setNotice("Select the destination component");
      return;
    }
    if (connectFrom === id) return;
    const from = elements.find((element) => element.id === connectFrom);
    const to = elements.find((element) => element.id === id);
    if (!from || !to || !portsFor(from).some((port) => port.type === connectionDomain) || !portsFor(to).some((port) => port.type === connectionDomain)) {
      setNotice(`Both components need a ${portTypeLabels[connectionDomain]} port`);
      return;
    }
    const pair = closestPortPair(from, to, connectionDomain);
    addFlowConnection({ source: from.id, target: to.id, sourceHandle: pair.source.id, targetHandle: pair.target.id });
  }, [addFlowConnection, connectFrom, connectMode, connectionDomain, elements, narrowWorkspace, openSelectionInspector]);

  const changeFlowSelection = useCallback<OnSelectionChangeFunc<CanvasFlowNode, ScientificFlowEdge>>(({ nodes, edges }) => {
    const nextIds = [...new Set(nodes.flatMap((node) => {
      if (node.id === "__paper__") return [];
      const element = elements.find((candidate) => candidate.id === node.id);
      return element?.groupId ? elements.filter((candidate) => candidate.groupId === element.groupId).map((candidate) => candidate.id) : [node.id];
    }))];
    setSelectedIds((current) => current.length === nextIds.length && current.every((id, index) => id === nextIds[index]) ? current : nextIds);
    const nextEdgeId = nextIds.length ? null : edges[0]?.id ?? null;
    setSelectedConnectionId((current) => current === nextEdgeId ? current : nextEdgeId);
  }, [elements]);

  const handleFlowNodeClick = useCallback<NodeMouseHandler<CanvasFlowNode>>((_, node) => {
    if (node.id !== "__paper__") {
      setSelectedConnectionId(null);
      selectFlowNode(node.id);
    }
  }, [selectFlowNode]);

  const handleFlowEdgeClick = useCallback((_: React.MouseEvent, edge: ScientificFlowEdge) => {
    setSelectedConnectionId(edge.id);
    setSelectedIds([]);
    if (narrowWorkspace) openSelectionInspector();
  }, [narrowWorkspace, openSelectionInspector]);

  const clearFlowSelection = useCallback(() => {
    setSelectedIds([]);
    setSelectedConnectionId(null);
  }, []);

  const beginFlowDrag = useCallback<OnNodeDrag<CanvasFlowNode>>(() => {
    flowDragBefore.current = cloneSnapshot(elements, connections, publication, experiment);
  }, [connections, elements, experiment, publication]);

  const finishFlowDrag = useCallback<OnNodeDrag<CanvasFlowNode>>((_, __, draggedNodes) => {
    const positions = new Map(draggedNodes.filter((node) => node.id !== "__paper__").map((node) => [node.id, node.position]));
    let moved = false;
    const nextElements = elements.map((element) => {
      const position = positions.get(element.id);
      if (!position) return element;
      const size = scientificNodeSize(element);
      const x = Math.max(size.width / 2, Math.min(dimensions.width - size.width / 2, position.x + size.width / 2));
      const y = Math.max(size.height / 2, Math.min(dimensions.height - size.height / 2, position.y + size.height / 2));
      if (element.x === x && element.y === y) return element;
      moved = true;
      return { ...element, x, y };
    });
    const before = flowDragBefore.current;
    if (moved && before) {
      setPast((items) => [...items.slice(-39), before]);
      setFuture([]);
      setElements(nextElements);
    }
    flowDragBefore.current = null;
  }, [dimensions, elements]);

  const changeFlowNodes = useCallback((changes: NodeChange<CanvasFlowNode>[]) => {
    onFlowNodesChange(changes);
    if (flowDragBefore.current) return;
    const positions = new Map(changes.flatMap((change) => change.type === "position" && change.position ? [[change.id, change.position] as const] : []));
    const activeResize = changes.some((change) => change.type === "dimensions" && change.resizing === true);
    if (activeResize) return;
    const resize = changes.find((change) => change.type === "dimensions" && change.resizing === false && change.dimensions);
    if (resize?.type === "dimensions" && resize.dimensions) {
      const resizedElement = elements.find((element) => element.id === resize.id);
      if (!resizedElement || !resizableAnnotationKinds.has(resizedElement.kind)) return;
      const resizedDimensions = resize.dimensions;
      commit(elements.map((element) => {
        if (element.id !== resize.id || !resizableAnnotationKinds.has(element.kind)) return element;
        const scale = element.scale ?? 1;
        const oldSize = scientificNodeSize(element);
        const position = positions.get(element.id) ?? { x: element.x - oldSize.width / 2, y: element.y - oldSize.height / 2 };
        return {
          ...element,
          width: Math.max(40, Math.min(600, (resizedDimensions.width - 8) / scale)),
          height: Math.max(30, Math.min(500, (resizedDimensions.height - 28) / scale)),
          x: Math.max(resizedDimensions.width / 2, Math.min(dimensions.width - resizedDimensions.width / 2, position.x + resizedDimensions.width / 2)),
          y: Math.max(resizedDimensions.height / 2, Math.min(dimensions.height - resizedDimensions.height / 2, position.y + resizedDimensions.height / 2)),
        };
      }));
      return;
    }
    if (!positions.size) return;
    commit(elements.map((element) => {
      const position = positions.get(element.id);
      if (!position) return element;
      const size = scientificNodeSize(element);
      return {
        ...element,
        x: Math.max(size.width / 2, Math.min(dimensions.width - size.width / 2, position.x + size.width / 2)),
        y: Math.max(size.height / 2, Math.min(dimensions.height - size.height / 2, position.y + size.height / 2)),
      };
    }));
  }, [commit, dimensions, elements, onFlowNodesChange]);

  const reconnectFlowEdge = useCallback((edge: ScientificFlowEdge, candidate: ReactFlowConnection) => {
    const replacement = connectionFromFlow(candidate, edge.id);
    if (!replacement) {
      setNotice("Choose a compatible, unused port");
      return;
    }
    commit(elements, connections.map((connection) => connection.id === edge.id ? { ...connection, ...replacement, waypoints: undefined } : connection));
    setNotice("Connection endpoint moved");
  }, [commit, connectionFromFlow, connections, elements]);

  const isValidFlowConnection = useCallback((candidate: ReactFlowConnection | ScientificFlowEdge) => Boolean(connectionFromFlow(candidate)), [connectionFromFlow]);

  const groupSelection = () => {
    if (selectedIds.length < 2) return;
    const groupId = `group-${Date.now()}`;
    commit(elements.map((element) => selection.has(element.id) ? { ...element, groupId } : element));
  };

  const ungroupSelection = () => commit(elements.map((element) => selection.has(element.id) ? { ...element, groupId: undefined } : element));

  const alignSelection = (axis: "x" | "y") => {
    const chosen = elements.filter((element) => selection.has(element.id) && !element.locked);
    if (chosen.length < 2) return;
    const value = chosen.reduce((sum, element) => sum + element[axis], 0) / chosen.length;
    commit(elements.map((element) => selection.has(element.id) && !element.locked ? { ...element, [axis]: value } : element));
  };

  const distributeSelection = () => {
    const chosen = elements.filter((element) => selection.has(element.id) && !element.locked).sort((a, b) => a.x - b.x);
    if (chosen.length < 3) return;
    const step = (chosen.at(-1)!.x - chosen[0].x) / (chosen.length - 1);
    const positions = new Map(chosen.map((element, index) => [element.id, chosen[0].x + index * step]));
    commit(elements.map((element) => positions.has(element.id) ? { ...element, x: positions.get(element.id)! } : element));
  };

  const reorderSelection = (direction: "front" | "back") => {
    const chosen = elements.filter((element) => selection.has(element.id));
    const rest = elements.filter((element) => !selection.has(element.id));
    commit(direction === "front" ? [...rest, ...chosen] : [...chosen, ...rest]);
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setConnectMode(false);
        setConnectFrom(null);
        setSelectedIds([]);
        setSelectedConnectionId(null);
        return;
      }
      const target = event.target instanceof Element ? event.target : null;
      const interfaceControl = target?.closest("input, textarea, select, button, a, [contenteditable='true']");
      if (interfaceControl) return;
      if (target?.closest(".react-flow") && ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
      if (event.key === "Delete" || event.key === "Backspace") removeSelected();
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "y") {
        event.preventDefault();
        redo();
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "d") {
        event.preventDefault();
        duplicateSelected();
      }
      if (selectedIds.length && ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
        event.preventDefault();
        const distance = event.shiftKey ? GRID_STEP : 1;
        const dx = event.key === "ArrowLeft" ? -distance : event.key === "ArrowRight" ? distance : 0;
        const dy = event.key === "ArrowUp" ? -distance : event.key === "ArrowDown" ? distance : 0;
        commit(moveElements(elements, selection, dx, dy, dimensions));
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  const exportFrame = () => {
    if (!publication.cropToContent || !elements.length) return { x: 0, y: 0, width: dimensions.width, height: dimensions.height };
    const points = [
      ...elements.flatMap((element) => {
        const halfWidth = Math.max(75, (element.width ?? 120) * (element.scale ?? 1) / 2);
        const halfHeight = Math.max(65, (element.height ?? 100) * (element.scale ?? 1) / 2);
        return [{ x: element.x - halfWidth, y: element.y - halfHeight }, { x: element.x + halfWidth, y: element.y + halfHeight }];
      }),
      ...connections.flatMap((connection) => connection.waypoints ?? []),
    ];
    const minX = Math.max(0, Math.min(...points.map((point) => point.x)) - 35);
    const minY = Math.max(0, Math.min(...points.map((point) => point.y)) - 95);
    const maxX = Math.min(dimensions.width, Math.max(...points.map((point) => point.x)) + 35);
    const maxY = Math.min(dimensions.height, Math.max(...points.map((point) => point.y)) + 35);
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
  };

  const svgSource = () => {
    if (!svgRef.current) return "";
    const frame = exportFrame();
    const clone = svgRef.current.cloneNode(true) as SVGSVGElement;
    clone.querySelectorAll(".grid-layer").forEach((node) => node.remove());
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    clone.setAttribute("viewBox", `${frame.x} ${frame.y} ${frame.width} ${frame.height}`);
    clone.setAttribute("width", String(frame.width));
    clone.setAttribute("height", String(frame.height));
    return `<?xml version="1.0" encoding="UTF-8"?>\n${new XMLSerializer().serializeToString(clone)}`;
  };

  const exportSvg = () => download(new Blob([svgSource()], { type: "image/svg+xml" }), `${safeFilename(title)}.svg`);

  const exportPng = async () => {
    const image = new Image();
    const url = URL.createObjectURL(new Blob([svgSource()], { type: "image/svg+xml" }));
    image.onload = () => {
      const frame = exportFrame();
      const canvas = document.createElement("canvas");
      canvas.width = frame.width * 2;
      canvas.height = frame.height * 2;
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

  const exportPdf = () => {
    const popup = window.open("", "_blank", "popup");
    if (!popup) {
      setNotice("Allow pop-ups to export the vector PDF");
      return;
    }
    popup.document.title = title;
    const style = popup.document.createElement("style");
    style.textContent = `@page { size: ${publication.pagePreset === "a3" ? "A3 landscape" : "A4 landscape"}; margin: 8mm; } body { margin: 0; display: grid; place-items: center; } svg { width: 100%; height: auto; }`;
    popup.document.head.append(style);
    const parsed = new DOMParser().parseFromString(svgSource(), "image/svg+xml").documentElement;
    popup.document.body.append(popup.document.importNode(parsed, true));
    popup.focus();
    window.setTimeout(() => popup.print(), 250);
  };

  const exportTikz = () => {
    const lines = [
      "% SetupSketch TikZ export — requires \\usepackage{tikz}",
      "\\begin{tikzpicture}[x=0.01cm,y=-0.01cm, every node/.style={font=\\sffamily\\small}]",
      ...connections.map((connection) => {
        const from = elements.find((element) => element.id === connection.from);
        const to = elements.find((element) => element.id === connection.to);
        if (!from || !to) return "";
        const path = connectionPath(connection, from, to, elements).map((point) => `(${point.x.toFixed(1)},${point.y.toFixed(1)})`).join(" -- ");
        const style = getConnectionType(connection) === "beam" ? "red,line width=1.2pt" : "black,dashed,-stealth";
        return `  \\draw[${style}] ${path};`;
      }).filter(Boolean),
      ...elements.map((element, index) => `  \\node[draw,rounded corners=2pt,fill=white,minimum width=1.5cm,minimum height=0.7cm] (n${index}) at (${element.x.toFixed(1)},${element.y.toFixed(1)}) {${escapeLatex(element.label)}};`),
      "\\end{tikzpicture}",
    ];
    download(new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" }), `${safeFilename(title)}.tex`);
  };

  const exportNetlist = () => {
    const quote = (value: string) => `"${value.replaceAll('"', '\\"')}"`;
    const lines = [
      "* SetupSketch research netlist v1",
      `TITLE ${quote(title)}`,
      experiment.procedure ? `PROCEDURE ${quote(experiment.procedure)}` : "",
      ...experiment.checklist.map((item) => `CHECK ${item.id} ${item.done ? "DONE" : "OPEN"} ${quote(item.text)}`),
      ...elements.filter((element) => !annotationKinds.has(element.kind)).map((element) => [
        "COMP", element.id, element.kind, quote(element.label),
        element.manufacturer ? `MFR=${quote(element.manufacturer)}` : "",
        element.model ? `PART=${quote(element.model)}` : "",
        element.serialNumber ? `SERIAL=${quote(element.serialNumber)}` : "",
        element.calibrationDate ? `CAL_DATE=${element.calibrationDate}` : "",
        element.calibrationDueDate ? `CAL_DUE=${element.calibrationDueDate}` : "",
        element.uncertainty ? `UNCERTAINTY=${quote(element.uncertainty)}` : "",
        element.datasheetUrl ? `DATASHEET=${quote(element.datasheetUrl)}` : "",
        element.powerDbm !== undefined ? `POWER_DBM=${element.powerDbm}` : "",
        element.gainDb !== undefined ? `GAIN_DB=${element.gainDb}` : "",
        element.lossDb !== undefined ? `LOSS_DB=${element.lossDb}` : "",
        element.noiseFigureDb !== undefined ? `NF_DB=${element.noiseFigureDb}` : "",
        element.bandwidthHz !== undefined ? `BW_HZ=${element.bandwidthHz}` : "",
        element.wavelengthNm !== undefined ? `WAVELENGTH_NM=${element.wavelengthNm}` : "",
      ].filter(Boolean).join(" ")),
      ...connections.map((connection) => [
        "NET", connection.id, getConnectionDomain(connection, elements.find((element) => element.id === connection.from)),
        `${connection.from}:${connection.fromPort ?? "auto"}`, `${connection.to}:${connection.toPort ?? "auto"}`,
        connection.lossDb !== undefined ? `LOSS_DB=${connection.lossDb}` : "",
        connection.bandwidthHz !== undefined ? `BW_HZ=${connection.bandwidthHz}` : "",
      ].filter(Boolean).join(" ")),
    ].filter(Boolean);
    download(new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" }), `${safeFilename(title)}.net`);
  };

  const exportPowerPoint = async () => {
    try {
      const { default: PptxGenJS } = await import("pptxgenjs");
    const presentation = new PptxGenJS();
    presentation.layout = "LAYOUT_WIDE";
    presentation.author = "SetupSketch";
    presentation.subject = "Scientific setup diagram";
    presentation.title = title;
    presentation.company = "SetupSketch";
    const slide = presentation.addSlide();
    slide.background = { color: "F7F8FA" };
    slide.addText(title, { x: 0.5, y: 0.18, w: 12.33, h: 0.5, fontFace: "Arial", fontSize: 35, bold: true, color: "171B22", margin: 0, breakLine: false, fit: "shrink" });
    const frame = exportFrame();
    const maxWidth = 12.3;
    const maxHeight = 6.25;
    const ratio = frame.width / frame.height;
    const width = Math.min(maxWidth, maxHeight * ratio);
    const height = width / ratio;
    slide.addImage({ data: svgDataUri(svgSource()), x: (13.333 - width) / 2, y: 0.88 + (maxHeight - height) / 2, w: width, h: height });
    if (budgets.length) {
      const summary = presentation.addSlide();
      summary.background = { color: "FFFFFF" };
      summary.addText("Calculated path budgets", { x: 0.55, y: 0.25, w: 12.2, h: 0.5, fontFace: "Arial", fontSize: 35, bold: true, color: "171B22", margin: 0, fit: "shrink" });
      summary.addText("Path", { x: 0.55, y: 1.05, w: 5.6, h: 0.35, fontSize: 18, bold: true, color: "68717D", margin: 0 });
      summary.addText("Input", { x: 6.45, y: 1.05, w: 1.25, h: 0.35, fontSize: 18, bold: true, color: "68717D", margin: 0 });
      summary.addText("Output", { x: 7.8, y: 1.05, w: 1.25, h: 0.35, fontSize: 18, bold: true, color: "68717D", margin: 0 });
      summary.addText("Loss", { x: 9.15, y: 1.05, w: 1.1, h: 0.35, fontSize: 18, bold: true, color: "68717D", margin: 0 });
      summary.addText("Bandwidth", { x: 10.4, y: 1.05, w: 2.3, h: 0.35, fontSize: 18, bold: true, color: "68717D", margin: 0 });
      budgets.slice(0, 8).forEach((budget, index) => {
        const y = 1.55 + index * 0.66;
        summary.addText(budget.labels.join(" → "), { x: 0.55, y, w: 5.6, h: 0.4, fontSize: 16, color: "303844", margin: 0, fit: "shrink" });
        summary.addText(`${budget.inputPowerDbm.toFixed(2)} dBm`, { x: 6.45, y, w: 1.25, h: 0.4, fontSize: 16, color: "303844", margin: 0 });
        summary.addText(`${budget.outputPowerDbm.toFixed(2)} dBm`, { x: 7.8, y, w: 1.25, h: 0.4, fontSize: 16, color: "303844", margin: 0 });
        summary.addText(`${budget.totalLossDb.toFixed(2)} dB`, { x: 9.15, y, w: 1.1, h: 0.4, fontSize: 16, color: "303844", margin: 0 });
        summary.addText(formatBandwidth(budget.bandwidthHz), { x: 10.4, y, w: 2.3, h: 0.4, fontSize: 16, color: "303844", margin: 0 });
      });
    }
    if (experiment.procedure || experiment.checklist.length) {
      const procedureSlide = presentation.addSlide();
      procedureSlide.background = { color: "FFFFFF" };
      procedureSlide.addText("Experimental procedure", { x: 0.55, y: 0.25, w: 12.2, h: 0.5, fontFace: "Arial", fontSize: 35, bold: true, color: "171B22", margin: 0, fit: "shrink" });
      if (experiment.procedure) procedureSlide.addText(experiment.procedure, { x: 0.55, y: 1.05, w: 7.1, h: 5.8, fontFace: "Arial", fontSize: 18, color: "303844", margin: 0.05, breakLine: false, valign: "top", fit: "shrink" });
      if (experiment.checklist.length) procedureSlide.addText(
        experiment.checklist.slice(0, 12).map((item) => `${item.done ? "✓" : "☐"} ${item.text}`).join("\n"),
        { x: 8, y: 1.05, w: 4.75, h: 5.8, fontFace: "Arial", fontSize: 18, color: "303844", margin: 0.05, breakLine: false, valign: "top", fit: "shrink" },
      );
    }
      await presentation.writeFile({ fileName: `${safeFilename(title)}.pptx` });
      setNotice("PowerPoint exported");
    } catch {
      setNotice("PowerPoint export failed");
    }
  };

  const saveJson = () => download(
    new Blob([JSON.stringify({ version: DIAGRAM_VERSION, title, elements, connections, publication, experiment, viewport: savedViewport, viewportMode, viewportWidth: window.innerWidth }, null, 2)], { type: "application/json" }),
    `${safeFilename(title)}.json`,
  );

  const exportBom = () => {
    const rows = new Map<string, { quantity: number; element: DiagramElement }>();
    for (const element of elements) {
      const key = [element.kind, element.manufacturer, element.model, element.serialNumber, element.specs].join("|");
      const row = rows.get(key);
      if (row) row.quantity += 1;
      else rows.set(key, { quantity: 1, element });
    }
    const header = ["Quantity", "Kind", "Component", "Manufacturer", "Part number", "Serial number", "Calibration date", "Calibration due", "Uncertainty", "Datasheet URL", "Power dBm", "Gain dB", "Loss dB", "Noise figure dB", "Bandwidth Hz", "Wavelength nm", "Specifications", "Notes"];
    const lines = [header, ...[...rows.values()].map(({ quantity, element }) => [
      quantity, element.kind, componentByKind.get(element.kind)?.label ?? element.kind, element.manufacturer ?? "",
      element.model ?? "", element.serialNumber ?? "", element.calibrationDate ?? "", element.calibrationDueDate ?? "",
      element.uncertainty ?? "", element.datasheetUrl ?? "", element.powerDbm ?? "", element.gainDb ?? "", element.lossDb ?? "",
      element.noiseFigureDb ?? "", element.bandwidthHz ?? "", element.wavelengthNm ?? "", element.specs ?? "", element.notes ?? "",
    ])].map((row) => row.map(csvCell).join(","));
    download(new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" }), `${safeFilename(title)}-bom.csv`);
  };

  const loadBom = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const [header, ...rows] = parseCsv(await file.text());
      const columns = new Map(header.map((cell, index) => [cell.trim().toLowerCase(), index]));
      const kindColumn = columns.get("kind");
      if (kindColumn === undefined) throw new Error("Missing Kind column");
      const imported: DiagramElement[] = [];
      for (const row of rows) {
        const kind = row[kindColumn]?.trim() as ElementKind;
        if (!elementKinds.has(kind)) continue;
        const quantity = Math.min(100, Math.max(1, Number.parseInt(row[columns.get("quantity") ?? -1] ?? "1", 10) || 1));
        for (let count = 0; count < quantity; count += 1) {
          const position = findOpenPosition([...elements, ...imported], dimensions);
          imported.push({
            id: `${kind}-bom-${Date.now()}-${elements.length + imported.length}`,
            kind,
            label: row[columns.get("component") ?? -1] || componentByKind.get(kind)?.label || kind,
            ...position,
            rotation: 0,
            color: defaultColor(kind),
            manufacturer: row[columns.get("manufacturer") ?? -1] || undefined,
            model: row[columns.get("part number") ?? columns.get("model") ?? -1] || undefined,
            serialNumber: row[columns.get("serial number") ?? -1] || undefined,
            calibrationDate: row[columns.get("calibration date") ?? -1] || undefined,
            calibrationDueDate: row[columns.get("calibration due") ?? -1] || undefined,
            uncertainty: row[columns.get("uncertainty") ?? -1] || undefined,
            datasheetUrl: row[columns.get("datasheet url") ?? -1] || undefined,
            powerDbm: optionalNumber(row[columns.get("power dbm") ?? -1] ?? ""),
            gainDb: optionalNumber(row[columns.get("gain db") ?? -1] ?? ""),
            lossDb: optionalNumber(row[columns.get("loss db") ?? -1] ?? ""),
            noiseFigureDb: optionalNumber(row[columns.get("noise figure db") ?? -1] ?? ""),
            bandwidthHz: optionalNumber(row[columns.get("bandwidth hz") ?? -1] ?? ""),
            wavelengthNm: optionalNumber(row[columns.get("wavelength nm") ?? -1] ?? ""),
            specs: row[columns.get("specifications") ?? -1] || undefined,
            notes: row[columns.get("notes") ?? -1] || undefined,
          });
        }
      }
      if (!imported.length) throw new Error("No recognized components");
      commit([...elements, ...imported]);
      setSelectedIds(imported.map((element) => element.id));
      setNotice(`${imported.length} BOM components imported`);
    } catch {
      setNotice("BOM import failed: use the exported CSV format");
    } finally {
      event.target.value = "";
    }
  };

  const loadJson = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const parsed: unknown = JSON.parse(await file.text());
      if (!isDiagramFile(parsed)) throw new Error("Invalid diagram");
      setPast((items) => [...items, cloneSnapshot(elements, connections, publication, experiment)]);
      setTitle(parsed.title || "Untitled setup");
      setElements(parsed.elements);
      setConnections(migrateCanvasRouting(parsed.connections, parsed.version ?? 0));
      setPublication(parsed.publication ? { ...defaultPublication, ...parsed.publication } : defaultPublication);
      setExperiment(parsed.experiment ?? defaultExperiment);
      restoreFlowViewport(parsed.viewport ?? DEFAULT_VIEWPORT);
      setFuture([]);
      setSelectedIds([]);
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
    setExperiment(defaultExperiment);
    setSelectedIds([]);
    setSelectedConnectionId(null);
  };

  const applyTemplate = (templateId: string) => {
    const template = setupTemplates.find((candidate) => candidate.id === templateId);
    if (!template || (elements.length && !window.confirm("Replace the current diagram with this template?"))) return;
    const prefix = `template-${Date.now()}-`;
    const nextElements: DiagramElement[] = template.elements.map((element) => ({
      ...element,
      id: prefix + element.id,
      rotation: element.rotation ?? 0,
      color: defaultColor(element.kind),
    }));
    const byId = new Map(nextElements.map((element) => [element.id, element]));
    const nextConnections: Connection[] = template.connections.map((connection, index) => {
      const from = byId.get(prefix + connection.from)!;
      const to = byId.get(prefix + connection.to)!;
      const domain = connection.portType;
      const connectionType: ConnectionType = domain === "optical-free-space" || domain === "fiber" ? "beam" : "signal";
      return {
        id: `${prefix}connection-${index}`,
        from: from.id,
        to: to.id,
        type: connectionType,
        portType: domain,
        color: portTypeColors[domain],
        routing: connection.routing,
        fromPort: connection.fromPort,
        toPort: connection.toPort,
        waypoints: connection.waypoints,
      };
    });
    commit(nextElements, nextConnections);
    setTitle(template.title);
    setSelectedIds([]);
    setSelectedConnectionId(null);
    setNotice("Template loaded");
  };

  const saveSelectionAsModule = () => {
    const chosen = elements.filter((element) => selection.has(element.id));
    if (!chosen.length) return;
    const name = window.prompt("Reusable module name:", "Measurement block")?.trim();
    if (!name) return;
    const originX = Math.min(...chosen.map((element) => element.x));
    const originY = Math.min(...chosen.map((element) => element.y));
    const module: SavedModule = {
      id: `module-${Date.now()}`,
      name,
      elements: chosen.map((element) => ({ ...element, x: element.x - originX, y: element.y - originY })),
      connections: connections.filter((connection) => selection.has(connection.from) && selection.has(connection.to)).map((connection) => ({
        ...connection,
        waypoints: connection.waypoints?.map((point) => ({ x: point.x - originX, y: point.y - originY })),
      })),
    };
    setSavedModules((items) => [...items, module]);
    setNotice("Reusable module saved");
  };

  const insertModule = (moduleId: string) => {
    const module = savedModules.find((item) => item.id === moduleId);
    if (!module) return;
    const prefix = `instance-${Date.now()}-`;
    const offsetX = dimensions.width / 2 - Math.max(...module.elements.map((element) => element.x)) / 2;
    const offsetY = dimensions.height / 2 - Math.max(...module.elements.map((element) => element.y)) / 2;
    const idMap = new Map(module.elements.map((element) => [element.id, prefix + element.id]));
    const nextElements = module.elements.map((element) => ({
      ...element,
      id: idMap.get(element.id)!,
      x: element.x + offsetX,
      y: element.y + offsetY,
      groupId: `group-${prefix}`,
    }));
    const nextConnections = module.connections.map((connection, index) => ({
      ...connection,
      id: `${prefix}connection-${index}`,
      from: idMap.get(connection.from)!,
      to: idMap.get(connection.to)!,
      waypoints: connection.waypoints?.map((point) => ({ x: point.x + offsetX, y: point.y + offsetY })),
    }));
    commit([...elements, ...nextElements], [...connections, ...nextConnections]);
    setSelectedIds(nextElements.map((element) => element.id));
    setNotice("Reusable module inserted");
    if (narrowWorkspace) setLibraryOpen(false);
  };

  const toggleFavorite = (kind: ElementKind) => setFavoriteKinds((items) =>
    items.includes(kind) ? items.filter((item) => item !== kind) : [...items, kind]);

  const visibleGroups = [
    ...(recentKinds.length ? [{ title: "Recent", items: componentDefinitions.filter((item) => recentKinds.includes(item.kind)) }] : []),
    ...(favoriteKinds.length ? [{ title: "Favorites", items: componentDefinitions.filter((item) => favoriteKinds.includes(item.kind)) }] : []),
    ...componentGroups,
  ].map((group) => ({
    ...group,
    items: group.items.filter((item) => `${item.label} ${item.kind}`.toLowerCase().includes(libraryQuery.trim().toLowerCase())),
  })).filter((group) => group.items.length);
  const searchIsActive = Boolean(libraryQuery.trim());

  const addConnectionBend = () => {
    if (!selectedConnection) return;
    const from = elements.find((element) => element.id === selectedConnection.from);
    const to = elements.find((element) => element.id === selectedConnection.to);
    if (!from || !to) return;
    const points = connectionPath(selectedConnection, from, to, elements);
    const middle = points[Math.floor(points.length / 2)];
    commit(elements, connections.map((connection) => connection.id === selectedConnection.id ? {
      ...connection,
      waypoints: [...(connection.waypoints ?? []), { ...middle }],
    } : connection));
  };

  const changeConnectionDomain = (domain: PortType) => {
    if (!selectedConnection) return;
    const from = elements.find((element) => element.id === selectedConnection.from);
    const to = elements.find((element) => element.id === selectedConnection.to);
    if (!from || !to || !portsFor(from).some((port) => port.type === domain) || !portsFor(to).some((port) => port.type === domain)) {
      setNotice(`The selected endpoints do not share ${portTypeLabels[domain]} ports`);
      return;
    }
    const pair = closestPortPair(from, to, domain);
    const connectionType: ConnectionType = domain === "optical-free-space" || domain === "fiber" ? "beam" : "signal";
    commit(elements, connections.map((connection) => connection.id === selectedConnection.id ? {
      ...connection,
      portType: domain,
      type: connectionType,
      color: portTypeColors[domain],
      routing: undefined,
      fromPort: pair.source.id,
      toPort: pair.target.id,
      waypoints: undefined,
    } : connection));
  };

  const selectedConnectionToolbarPosition = (() => {
    if (!selectedConnection) return null;
    const from = elements.find((element) => element.id === selectedConnection.from);
    const to = elements.find((element) => element.id === selectedConnection.to);
    if (!from || !to) return null;
    const points = connectionPath(selectedConnection, from, to, elements);
    return points[Math.floor(points.length / 2)];
  })();

  const recordExport = (fileName: string, format: string) => setExportReceipt({ fileName, format });
  const renderExportActions = (close: () => void) => <>
    <Button size="sm" kind="ghost" onClick={() => { exportSvg(); recordExport(`${safeFilename(title)}.svg`, "SVG"); close(); }}>SVG</Button>
    <Button size="sm" kind="ghost" onClick={() => { void exportPng().then(() => recordExport(`${safeFilename(title)}.png`, "PNG")); close(); }}>PNG</Button>
    <Button size="sm" kind="ghost" onClick={() => { exportTikz(); recordExport(`${safeFilename(title)}.tex`, "TeX"); close(); }}>TeX</Button>
    <Button size="sm" kind="ghost" onClick={() => { void exportPowerPoint().then(() => recordExport(`${safeFilename(title)}.pptx`, "PowerPoint")); close(); }}>PPTX</Button>
    <Button size="sm" kind="ghost" onClick={() => { exportNetlist(); recordExport(`${safeFilename(title)}.net`, "Netlist"); close(); }}>Netlist</Button>
    <Button size="sm" kind="ghost" onClick={() => { exportBom(); recordExport(`${safeFilename(title)}-bom.csv`, "BOM CSV"); close(); }}>BOM CSV</Button>
    <Button size="sm" kind="primary" onClick={() => { exportPdf(); recordExport(`${safeFilename(title)}.pdf`, "PDF"); close(); }}>PDF</Button>
  </>;

  const renderLibraryPreview = (kind: ElementKind) => {
    const element = { id: "preview", kind, label: "", x: 0, y: 0, rotation: 0, color: defaultColor(kind) } as DiagramElement;
    return <svg className="library-icon" viewBox="-60 -55 120 110" aria-hidden="true"><ComponentPortStubs element={element} /><ComponentShape element={element} /></svg>;
  };

  const shellStatus = connectMode
    ? { state: "ready" as const, label: connectFrom ? `Select ${portTypeLabels[connectionDomain]} destination` : `Select ${portTypeLabels[connectionDomain]} source` }
    : { state: notice === "Saved" ? "up-to-date" as const : "modified" as const, label: notice };

  return (
    <ScientificAppShell
      className="setupsketch-app"
      header={<ScientificHeader
        aria-label="SetupSketch scientific diagram editor"
        product="SetupSketch"
        productMark="S"
        descriptor="Scientific diagram editor"
        href="./"
        skipLink={<SkipToContent href="#diagram-workspace">Skip to diagram workspace</SkipToContent>}
        context={<TextInput className="setup-header-title scientific-header__field" id="diagram-title" size="sm" hideLabel labelText="Diagram title" value={title} onChange={(event) => setTitle(event.target.value)} />}
        status={shellStatus}
        help={{
          summary: "Add scientific components, connect compatible ports, document the experiment, validate the setup and export the finished diagram.",
          shortcuts: [
            { keys: ["Ctrl/⌘", "Z"], description: "Undo the last edit" },
            { keys: ["Delete"], description: "Remove the current selection" },
          ],
        }}
        secondaryActions={<>
          <div className="toolbar-group" role="group" aria-label="Edit actions">
            <IconButton size="sm" kind="ghost" align="bottom-end" label="Undo" onClick={undo} disabled={!past.length}><UiIcon name="undo" /></IconButton>
            <IconButton size="sm" kind="ghost" align="bottom-end" label="Redo" onClick={redo} disabled={!future.length}><UiIcon name="redo" /></IconButton>
            <IconButton size="sm" kind="ghost" align="bottom-end" label={connectFrom ? "Choose connection target" : "Connect components"} isSelected={connectMode} onClick={() => { setConnectMode(!connectMode); setConnectFrom(null); }}><UiIcon name="link" /></IconButton>
          </div>
          {connectMode && <div className="toolbar-group" role="group" aria-label="Connection settings">
            <Select id="connection-domain" size="sm" hideLabel labelText="Connection domain" className="connection-type connection-type-active" value={connectionDomain} onChange={(event) => setConnectionDomain(event.target.value as PortType)}>
                {(Object.entries(portTypeLabels) as Array<[PortType, string]>).map(([type, label]) => <option value={type} key={type}>{label}</option>)}
            </Select>
          </div>}
          <Popover as="div" className="toolbar-menu toolbar-project" open={projectMenuOpen} align="bottom-end" onRequestClose={() => setProjectMenuOpen(false)}>
            <IconButton id="project-toggle" size="sm" kind="ghost" align="bottom-end" label="Project" aria-expanded={projectMenuOpen} aria-controls="project-menu" aria-haspopup="dialog" onClick={() => setProjectMenuOpen((open) => !open)}><UiIcon name="project" /></IconButton>
            <PopoverContent>
              <Layer id="project-menu" withBackground className="toolbar-menu-actions">
                <Select id="project-template" size="sm" labelText="Template" className="connection-type" defaultValue="" onChange={(event) => { applyTemplate(event.target.value); event.target.value = ""; setProjectMenuOpen(false); }}>
                    <option value="" disabled>Choose setup</option>
                    {setupTemplates.map((template) => <option key={template.id} value={template.id}>{template.title}</option>)}
                </Select>
                <div className="toolbar-group" role="group" aria-label="File actions">
                  <Button size="sm" kind="ghost" onClick={() => { saveJson(); setProjectMenuOpen(false); }}>Save JSON</Button>
                  <Button size="sm" kind="ghost" onClick={() => { fileRef.current?.click(); setProjectMenuOpen(false); }}>Open JSON</Button>
                  <Button size="sm" kind="ghost" onClick={() => { bomRef.current?.click(); setProjectMenuOpen(false); }}>Import BOM</Button>
                  <Button size="sm" kind="ghost" onClick={() => { arrangeDiagram(); setProjectMenuOpen(false); }}>Arrange overlaps</Button>
                  <Button size="sm" kind="danger--ghost" onClick={() => { clearDiagram(); setProjectMenuOpen(false); }}>Reset diagram</Button>
                  <input ref={fileRef} hidden aria-label="Open diagram JSON" type="file" accept="application/json,.json" onChange={loadJson} />
                </div>
              </Layer>
            </PopoverContent>
          </Popover>
          <input ref={bomRef} hidden aria-label="Import bill of materials" type="file" accept="text/csv,.csv" onChange={loadBom} />
        </>}
        primaryAction={
          <Popover as="div" className="toolbar-export-mobile" open={exportMenuOpen} align="bottom-end" onRequestClose={() => setExportMenuOpen(false)}>
            <IconButton id="export-toggle" size="sm" kind="ghost" align="bottom-end" label="Export" aria-expanded={exportMenuOpen} aria-controls="export-menu" aria-haspopup="dialog" onClick={() => setExportMenuOpen((open) => !open)}><UiIcon name="export" /></IconButton>
            <PopoverContent aria-label="Export actions">
              <Layer id="export-menu" withBackground className="toolbar-export-actions">{renderExportActions(() => setExportMenuOpen(false))}</Layer>
            </PopoverContent>
          </Popover>
        }
      />}
      navigation={<WorkspaceNavigation libraryOpen={libraryOpen} activeInspector={inspectorMode} onToggleLibrary={toggleLibrary} onToggleInspector={toggleInspector} />}
      statusBar={<ScientificStatusBar aria-label="Diagram status" status={shellStatus} metadata={<>
        <span>{elements.length} components</span>
        <span>{connections.length} connections</span>
      </>} />}
    >
      <h1 className="sr-only" id="app-title">SetupSketch scientific diagram editor</h1>
      <style>{`@media print { @page { size: ${publication.pagePreset === "a3" ? "A3 landscape" : "A4 landscape"}; margin: 8mm; } }`}</style>

      {exportReceipt && <ExportReceipt className="setup-export-receipt" fileName={exportReceipt.fileName} format={exportReceipt.format} destination="Browser downloads" onDismiss={() => setExportReceipt(null)} />}

      <Grid as="main" fullWidth condensed className="workspace" id="diagram-workspace" aria-labelledby="app-title" data-library-open={libraryOpen} data-inspector-open={Boolean(inspectorMode)} data-inspector={inspectorMode ?? "none"} tabIndex={-1}>
        <ComponentLibrary
          open={libraryOpen}
          groups={visibleGroups}
          savedModules={savedModules}
          query={libraryQuery}
          searchIsActive={searchIsActive}
          collapsedGroups={collapsedGroups}
          favoriteKinds={favoriteKinds}
          onClose={closeLibrary}
          onQueryChange={setLibraryQuery}
          onInsertModule={insertModule}
          onDeleteModule={(id) => setSavedModules((items) => items.filter((item) => item.id !== id))}
          onToggleGroup={(title) => setCollapsedGroups((items) => items.includes(title) ? items.filter((item) => item !== title) : [...items, title])}
          onAddElement={addElement}
          onToggleFavorite={toggleFavorite}
          renderPreview={renderLibraryPreview}
        />

        <Column as="section" sm={4} md={8} lg={16} className="stage-wrap scientific-stage" aria-label="Diagram workspace">
          <div className="stage scientific-stage">
            {elements.length === 0 && <div className="stage-empty"><strong>Start with a component</strong><p>Add one from the library or load a template from the toolbar.</p></div>}
            <div className="diagram-flow" role="group" aria-label={`${title}, editable scientific setup diagram`}>
              <DiagramCanvas<CanvasFlowNode, ScientificFlowEdge>
                nodes={flowNodes}
                edges={modelFlowEdges}
                nodeTypes={flowNodeTypes}
                edgeTypes={flowEdgeTypes}
                onNodesChange={changeFlowNodes}
                onSelectionChange={changeFlowSelection}
                onNodeClick={handleFlowNodeClick}
                onEdgeClick={handleFlowEdgeClick}
                onPaneClick={clearFlowSelection}
                onNodeDragStart={beginFlowDrag}
                onNodeDragStop={finishFlowDrag}
                onConnect={addFlowConnection}
                onConnectStart={beginFlowConnection}
                onConnectEnd={finishFlowConnection}
                onReconnect={reconnectFlowEdge}
                isValidConnection={isValidFlowConnection}
                connectionLineType={flowConnectionLineType}
                connectionLineStyle={flowConnectionLineStyle}
                nodeExtent={flowNodeExtent}
                translateExtent={flowTranslateExtent}
                snapToGrid={snapEnabled}
                snapGrid={FLOW_SNAP_GRID}
                multiSelectionKeyCode="Shift"
                nodesDraggable={!connectMode}
                onInit={initializeFlow}
                onMoveEnd={(_, viewport) => rememberFlowViewport(viewport)}
                attributionPosition="bottom-left"
                gridVisible={layers.grid}
              >
                {selectedIds.length > 0 && <NodeToolbar nodeId={selectedIds} isVisible={inspectorMode !== "selection" && !narrowWorkspace} className="context-toolbar" position={Position.Top}>
                  <IconButton size="sm" kind="ghost" label="Properties" onClick={openSelectionInspector}><SettingsAdjust size={16} aria-hidden={true} /></IconButton>
                  <IconButton size="sm" kind="ghost" label="Duplicate" onClick={duplicateSelected}><Copy size={16} aria-hidden={true} /></IconButton>
                  <IconButton size="sm" kind="ghost" label={allSelectedLocked ? "Unlock" : "Lock"} onClick={() => changeSelected({ locked: !allSelectedLocked })}>{allSelectedLocked ? <Unlocked size={16} aria-hidden={true} /> : <Locked size={16} aria-hidden={true} />}</IconButton>
                  <IconButton size="sm" kind="ghost" className="context-danger" label="Delete" onClick={removeSelected}><TrashCan size={16} aria-hidden={true} /></IconButton>
                </NodeToolbar>}
                {selectedConnection && selectedConnectionToolbarPosition && <EdgeToolbar edgeId={selectedConnection.id} x={selectedConnectionToolbarPosition.x} y={selectedConnectionToolbarPosition.y} isVisible={inspectorMode !== "selection" && !narrowWorkspace} className="context-toolbar">
                  <IconButton size="sm" kind="ghost" label="Properties" onClick={openSelectionInspector}><SettingsAdjust size={16} aria-hidden={true} /></IconButton>
                  <IconButton size="sm" kind="ghost" label="Add bend" onClick={addConnectionBend}><Corner size={16} aria-hidden={true} /></IconButton>
                  <IconButton size="sm" kind="ghost" className="context-danger" label="Delete" onClick={removeSelected}><TrashCan size={16} aria-hidden={true} /></IconButton>
                </EdgeToolbar>}
                <Controls showFitView={false} showInteractive={false} orientation={narrowWorkspace ? "horizontal" : "vertical"}>
                  <ControlButton onClick={fitCanvas} title={selectedIds.length ? "Fit selection" : "Fit diagram"} aria-label={selectedIds.length ? "Fit selection" : "Fit diagram"}><UiIcon name="fit" /></ControlButton>
                </Controls>
              </DiagramCanvas>
            </div>
            <svg
              ref={svgRef}
              className="diagram-export"
              viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
              aria-hidden="true"
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
              <rect width={dimensions.width} height={dimensions.height} fill="var(--color-canvas-surface)" />
              {layers.grid && <rect className="grid-layer" width={dimensions.width} height={dimensions.height} fill="url(#majorGrid)" />}
              {layers.labels && <g className="labels-layer">
                <text x="42" y="54" fill="#171b22" fontSize={25 * publication.labelScale} fontWeight="700" fontFamily="Arial, sans-serif">{title}</text>
                {publication.showCredit && <text x="42" y="80" fill="#6d7580" fontSize={12 * publication.labelScale} fontFamily="Arial, sans-serif">Created with SetupSketch</text>}
              </g>}

              {connections.filter((connection) => layers[getConnectionType(connection) === "beam" ? "beams" : "signals"]).map((connection) => {
                const from = elements.find((element) => element.id === connection.from);
                const to = elements.find((element) => element.id === connection.to);
                if (!from || !to) return null;
                const points = connectionPath(connection, from, to, elements);
                const pointString = points.map((point) => `${point.x},${point.y}`).join(" ");
                return (
                  <g key={connection.id}>
                    <polyline
                      points={pointString}
                      fill="none"
                      stroke={publication.monochrome ? "#20242a" : connection.color}
                      strokeWidth={getConnectionType(connection) === "beam" ? 3 : 2.5}
                      strokeDasharray={getConnectionType(connection) === "signal" ? "9 5" : undefined}
                      markerEnd={getConnectionType(connection) === "signal" ? "url(#arrow)" : undefined}
                      strokeLinejoin="round"
                    />
                  </g>
                );
              })}

              {elements.filter((element) => layers[annotationKinds.has(element.kind) ? "annotations" : electronicKinds.has(element.kind) ? "electronics" : "optics"]).map((element) => (
                <g
                  key={element.id}
                  className="diagram-element"
                  transform={`translate(${element.x} ${element.y}) rotate(${element.rotation})`}
                >
                  <g transform={`scale(${(element.scale ?? 1) * (element.flipX ? -1 : 1)} ${(element.scale ?? 1) * (element.flipY ? -1 : 1)})`}>
                    <ComponentPortStubs element={publication.monochrome ? { ...element, color: "#20242a" } : element} />
                    <ComponentShape element={publication.monochrome ? { ...element, color: "#20242a" } : element} monochrome={publication.monochrome} />
                  </g>
                  {layers.labels && !annotationKinds.has(element.kind) && <text className="labels-layer" y={70 * (element.scale ?? 1)} textAnchor="middle" fill="#252b33" fontSize={14 * publication.labelScale} fontWeight="600" fontFamily="Arial, sans-serif" transform={`rotate(${-element.rotation})`}>{element.label}</text>}
                </g>
              ))}
            </svg>
          </div>
        </Column>

        <InspectorPanel
          id="selection-inspector"
          label={selectedIds.length > 1 ? "Selection properties" : selected ? "Component properties" : selectedConnection ? "Connection properties" : "Properties"}
          ariaLabel="Selection properties"
          hidden={inspectorMode !== "selection"}
          closeLabel="Close selection properties"
          onClose={closeInspector}
        >
          {selected ? (
            <div className="property-form" onFocusCapture={beginPropertyEdit} onBlurCapture={(event) => finishPropertyEdit(event.relatedTarget, event.currentTarget)}>
              <TextInput id="component-label" size="sm" labelText="Label" value={selected.label} onChange={(event) => updateSelected({ label: event.target.value })} />
              <div className="property-row">
                <NumberInput id="component-x" size="sm" label="X" value={selected.x} min={0} max={dimensions.width} onChange={(_, { value }) => updateSelected({ x: Number(value) })} />
                <NumberInput id="component-y" size="sm" label="Y" value={selected.y} min={0} max={dimensions.height} onChange={(_, { value }) => updateSelected({ y: Number(value) })} />
              </div>
              <Slider id="component-rotation" hideTextInput labelText={`Rotation · ${selected.rotation}°`} min={0} max={345} step={15} value={selected.rotation} onChange={({ value }) => updateSelected({ rotation: Number(value) })} />
              <Slider id="component-scale" hideTextInput labelText={`Scale · ${(selected.scale ?? 1).toFixed(1)}×`} min={0.5} max={2} step={0.1} value={selected.scale ?? 1} onChange={({ value }) => updateSelected({ scale: Number(value) })} />
              {annotationKinds.has(selected.kind) && <div className="property-row">
                <NumberInput id="annotation-width" size="sm" label="Width" min={40} max={600} value={selected.width ?? annotationDefaultSizes[selected.kind]?.width ?? 180} onChange={(_, { value }) => updateSelected({ width: Number(value) })} />
                <NumberInput id="annotation-height" size="sm" label="Height" min={30} max={500} value={selected.height ?? annotationDefaultSizes[selected.kind]?.height ?? 70} onChange={(_, { value }) => updateSelected({ height: Number(value) })} />
              </div>}
              <label className="color-control">Color<input className="color-input" aria-label="Component color" type="color" value={selected.color} onChange={(event) => updateSelected({ color: event.target.value })} /></label>
              <InspectorDisclosure className="property-section" label="Engineering parameters" panelClassName="property-section-content">
                  <div className="property-row">
                    <NumberInput id="source-power" size="sm" label="Source power (dBm)" step={0.1} allowEmpty value={selected.powerDbm ?? ""} onChange={(_, { value }) => updateSelected({ powerDbm: optionalNumber(String(value)) })} />
                    <NumberInput id="component-gain" size="sm" label="Gain (dB)" step={0.1} allowEmpty value={selected.gainDb ?? ""} onChange={(_, { value }) => updateSelected({ gainDb: optionalNumber(String(value)) })} />
                  </div>
                  <div className="property-row">
                    <NumberInput id="component-loss" size="sm" label="Loss (dB)" min={0} step={0.1} allowEmpty value={selected.lossDb ?? ""} onChange={(_, { value }) => updateSelected({ lossDb: optionalNumber(String(value)) })} />
                    <NumberInput id="noise-figure" size="sm" label="Noise figure (dB)" min={0} step={0.1} allowEmpty value={selected.noiseFigureDb ?? ""} onChange={(_, { value }) => updateSelected({ noiseFigureDb: optionalNumber(String(value)) })} />
                  </div>
                  <div className="property-row">
                    <NumberInput id="component-bandwidth" size="sm" label="Bandwidth (Hz)" min={0} allowEmpty value={selected.bandwidthHz ?? ""} onChange={(_, { value }) => updateSelected({ bandwidthHz: optionalNumber(String(value)) })} />
                    <NumberInput id="component-wavelength" size="sm" label="Wavelength (nm)" min={0} allowEmpty value={selected.wavelengthNm ?? ""} onChange={(_, { value }) => updateSelected({ wavelengthNm: optionalNumber(String(value)) })} />
                  </div>
              </InspectorDisclosure>
              <InspectorDisclosure className="property-section" label="Traceability" panelClassName="property-section-content">
                  <TextInput id="manufacturer" size="sm" labelText="Manufacturer" list="manufacturers" value={selected.manufacturer ?? ""} onChange={(event) => updateSelected({ manufacturer: event.target.value })} placeholder="e.g. Thorlabs" />
                  <datalist id="manufacturers"><option value="Thorlabs" /><option value="Mini-Circuits" /><option value="Keysight" /></datalist>
                  <TextInput id="part-number" size="sm" labelText="Part number" value={selected.model ?? ""} onChange={(event) => updateSelected({ model: event.target.value })} placeholder="Vendor model / part number" />
                  <TextInput id="specifications" size="sm" labelText="Specifications" value={selected.specs ?? ""} onChange={(event) => updateSelected({ specs: event.target.value })} placeholder="Wavelength, bandwidth…" />
                  <TextInput id="serial-number" size="sm" labelText="Serial number" value={selected.serialNumber ?? ""} onChange={(event) => updateSelected({ serialNumber: event.target.value })} />
                  <div className="property-row">
                    <TextInput id="calibration-date" size="sm" type="date" labelText="Calibrated" value={selected.calibrationDate ?? ""} onChange={(event) => updateSelected({ calibrationDate: event.target.value })} />
                    <TextInput id="calibration-due" size="sm" type="date" labelText="Calibration due" value={selected.calibrationDueDate ?? ""} onChange={(event) => updateSelected({ calibrationDueDate: event.target.value })} />
                  </div>
                  <TextInput id="uncertainty" size="sm" labelText="Uncertainty" value={selected.uncertainty ?? ""} onChange={(event) => updateSelected({ uncertainty: event.target.value })} placeholder="e.g. ±0.2 dB (k=2)" />
                  <TextInput id="datasheet-url" size="sm" type="url" labelText="Datasheet URL" value={selected.datasheetUrl ?? ""} onChange={(event) => updateSelected({ datasheetUrl: event.target.value })} placeholder="https://…" />
                  <TextArea id="component-notes" labelText="Notes" rows={3} value={selected.notes ?? ""} onChange={(event) => updateSelected({ notes: event.target.value })} />
              </InspectorDisclosure>
              <div className="compact-actions">
                <Button size="sm" kind="tertiary" renderIcon={ReflectHorizontal} onClick={() => changeSelected({ flipX: !selected.flipX })}>Flip horizontal</Button>
                <Button size="sm" kind="tertiary" renderIcon={ReflectVertical} onClick={() => changeSelected({ flipY: !selected.flipY })}>Flip vertical</Button>
                <Button size="sm" kind="tertiary" renderIcon={selected.locked ? Unlocked : Locked} onClick={() => changeSelected({ locked: !selected.locked })}>{selected.locked ? "Unlock" : "Lock"}</Button>
                <Button size="sm" kind="tertiary" renderIcon={BringToFront} onClick={() => reorderSelection("front")}>Bring front</Button>
                <Button size="sm" kind="tertiary" renderIcon={SendToBack} onClick={() => reorderSelection("back")}>Send back</Button>
              </div>
              <div className="property-actions">
                <Button size="sm" kind="tertiary" renderIcon={Copy} onClick={duplicateSelected}>Duplicate</Button>
                <Button size="sm" kind="danger--tertiary" renderIcon={TrashCan} onClick={removeSelected}>Delete</Button>
              </div>
            </div>
          ) : selectedIds.length > 1 ? (
            <div className="property-form">
              <p className="selection-count">{selectedIds.length} components selected</p>
              <div className="compact-actions">
                <Button size="sm" kind="tertiary" onClick={() => alignSelection("y")}>Align row</Button>
                <Button size="sm" kind="tertiary" onClick={() => alignSelection("x")}>Align column</Button>
                <Button size="sm" kind="tertiary" onClick={distributeSelection} disabled={selectedIds.length < 3}>Distribute</Button>
                <Button size="sm" kind="tertiary" onClick={groupSelection}>Group</Button>
                <Button size="sm" kind="tertiary" onClick={ungroupSelection}>Ungroup</Button>
                <Button size="sm" kind="tertiary" onClick={saveSelectionAsModule}>Save module</Button>
                <Button size="sm" kind="tertiary" onClick={() => changeSelected({ locked: true })}>Lock</Button>
                <Button size="sm" kind="tertiary" renderIcon={Copy} onClick={duplicateSelected}>Duplicate</Button>
                <Button size="sm" kind="danger--tertiary" renderIcon={TrashCan} onClick={removeSelected}>Delete</Button>
              </div>
            </div>
          ) : selectedConnection ? (
            <div className="property-form" onFocusCapture={beginPropertyEdit} onBlurCapture={(event) => finishPropertyEdit(event.relatedTarget, event.currentTarget)}>
              <Select id="selected-connection-domain" size="sm" labelText="Connection domain" value={getConnectionDomain(selectedConnection, elements.find((element) => element.id === selectedConnection.from))} onChange={(event) => changeConnectionDomain(event.target.value as PortType)}>
                {(Object.entries(portTypeLabels) as Array<[PortType, string]>).map(([type, label]) => <option value={type} key={type}>{label}</option>)}
              </Select>
              {(() => {
                const from = elements.find((element) => element.id === selectedConnection.from);
                const to = elements.find((element) => element.id === selectedConnection.to);
                const domain = getConnectionDomain(selectedConnection, from);
                return <>
                  {from && <Select id="source-port" size="sm" labelText="Source port" value={selectedConnection.fromPort ?? closestPortPair(from, to ?? from, domain).source.id} onChange={(event) => commit(elements, connections.map((connection) => connection.id === selectedConnection.id ? { ...connection, fromPort: event.target.value, waypoints: undefined } : connection))}>{portsFor(from).filter((port) => port.type === domain).map((port) => <option key={port.id} value={port.id}>{from.label}: {port.id} · {portTypeLabels[port.type]}</option>)}</Select>}
                  {to && <Select id="target-port" size="sm" labelText="Target port" value={selectedConnection.toPort ?? closestPortPair(from ?? to, to, domain).target.id} onChange={(event) => commit(elements, connections.map((connection) => connection.id === selectedConnection.id ? { ...connection, toPort: event.target.value, waypoints: undefined } : connection))}>{portsFor(to).filter((port) => port.type === domain).map((port) => <option key={port.id} value={port.id}>{to.label}: {port.id} · {portTypeLabels[port.type]}</option>)}</Select>}
                </>;
              })()}
              <div className="property-row">
                <NumberInput id="path-loss" size="sm" label="Path loss (dB)" min={0} step={0.1} allowEmpty value={selectedConnection.lossDb ?? ""} onChange={(_, { value }) => updateSelectedConnection({ lossDb: optionalNumber(String(value)) })} />
                <NumberInput id="path-bandwidth" size="sm" label="Bandwidth (Hz)" min={0} allowEmpty value={selectedConnection.bandwidthHz ?? ""} onChange={(_, { value }) => updateSelectedConnection({ bandwidthHz: optionalNumber(String(value)) })} />
              </div>
              <Select id="connection-routing" size="sm" labelText="Routing" value={selectedConnection.routing ?? "auto"} onChange={(event) => commit(elements, connections.map((connection) => connection.id === selectedConnection.id ? { ...connection, routing: event.target.value === "auto" ? undefined : event.target.value as Routing, waypoints: undefined } : connection))}>
                <option value="auto">Automatic · {defaultRoutingLabel(getConnectionDomain(selectedConnection, elements.find((element) => element.id === selectedConnection.from)))}</option>
                <option value="straight">Straight</option><option value="orthogonal">Orthogonal</option>
              </Select>
              <div className="property-actions connection-actions">
                <Button size="sm" kind="tertiary" renderIcon={Corner} onClick={addConnectionBend}>Add bend</Button>
                {selectedConnection.waypoints?.length ? <Button size="sm" kind="tertiary" onClick={() => commit(elements, connections.map((connection) => connection.id === selectedConnection.id ? { ...connection, waypoints: undefined } : connection))}>Clear bends</Button> : null}
                <Button size="sm" kind="danger--tertiary" renderIcon={TrashCan} onClick={removeSelected}>Delete connection</Button>
              </div>
            </div>
          ) : (
            <div className="empty-inspector"><p>Select a component to edit it. On desktop, Shift-click selects several.</p><span>Focused components can be nudged with the arrow keys.</span></div>
          )}
        </InspectorPanel>

        <InspectorPanel
          id="document-inspector"
          label={inspectorMode === "experiment" ? "Experiment" : inspectorMode === "review" ? "Review" : "Canvas"}
          ariaLabel={`${inspectorMode ?? "Workspace"} settings`}
          hidden={!inspectorMode || inspectorMode === "selection"}
          closeLabel={`Close ${inspectorMode ?? "workspace"} settings`}
          onClose={closeInspector}
        >
          {inspectorMode === "document" && <InspectorDisclosure className="layers-panel" buttonId="layout-title" label="Layout" initiallyOpen>
            <Checkbox id="snap-to-grid" labelText="Snap to grid" checked={snapEnabled} onChange={(_, { checked }) => setSnapEnabled(checked)} />
            <div className="port-legend">{(Object.entries(portTypeLabels) as Array<[PortType, string]>).map(([type, label]) => <span key={type}><i style={{ background: portTypeColors[type] }} />{label}</span>)}</div>
          </InspectorDisclosure>}
          {inspectorMode === "review" && <InspectorDisclosure className="layers-panel budget-panel" buttonId="budget-title" label="Path budgets" meta={budgets.length}>
            {budgets.length ? budgets.slice(0, 5).map((budget) => <article className="budget-result" key={budget.id}>
              <strong>{budget.labels.join(" → ")}</strong>
              <span>{portTypeLabels[budget.domain]} · {budget.inputPowerDbm.toFixed(2)} → {budget.outputPowerDbm.toFixed(2)} dBm</span>
              <span>Gain {budget.totalGainDb.toFixed(2)} dB · loss {budget.totalLossDb.toFixed(2)} dB</span>
              <span>BW {formatBandwidth(budget.bandwidthHz)}{budget.noiseFigureDb !== undefined ? ` · NF ${budget.noiseFigureDb.toFixed(2)} dB` : ""}</span>
              {budget.outputNoiseDbm !== undefined && <span>Noise {budget.outputNoiseDbm.toFixed(2)} dBm · SNR {budget.snrDb?.toFixed(2)} dB</span>}
            </article>) : <p className="validation-more">Set source power on a component to calculate directed paths.</p>}
            <p className="model-note">Cascaded dB budget; RF noise uses Friis and −174 dBm/Hz at 290 K. Reflections, mismatch and coherent interference are not included.</p>
          </InspectorDisclosure>}
          {inspectorMode === "experiment" && <InspectorDisclosure className="layers-panel experiment-panel" buttonId="experiment-title" label="Procedure and checklist" initiallyOpen>
            <div className="property-form" onFocusCapture={beginPropertyEdit} onBlurCapture={(event) => finishPropertyEdit(event.relatedTarget, event.currentTarget)}>
              <TextArea id="experiment-procedure" labelText="Procedure" rows={4} value={experiment.procedure} onChange={(event) => setExperiment((current) => ({ ...current, procedure: event.target.value }))} placeholder="Alignment, warm-up, acquisition and shutdown procedure…" />
            </div>
            <form className="checklist-add" onSubmit={(event) => {
              event.preventDefault();
              const text = checklistDraft.trim();
              if (!text) return;
              commitExperiment({ ...experiment, checklist: [...experiment.checklist, { id: `check-${Date.now()}`, text, done: false }] });
              setChecklistDraft("");
            }}>
              <TextInput id="checklist-draft" size="sm" hideLabel labelText="New checklist item" value={checklistDraft} onChange={(event) => setChecklistDraft(event.target.value)} placeholder="Add checklist item" />
              <Button size="sm" kind="tertiary" type="submit">Add</Button>
            </form>
            {experiment.checklist.map((item) => <div className="checklist-row" key={item.id}>
              <Checkbox id={`checklist-${item.id}`} labelText={item.text} checked={item.done} onChange={(_, { checked }) => commitExperiment({ ...experiment, checklist: experiment.checklist.map((candidate) => candidate.id === item.id ? { ...candidate, done: checked } : candidate) })} />
              <IconButton size="sm" kind="ghost" label={`Delete ${item.text}`} onClick={() => commitExperiment({ ...experiment, checklist: experiment.checklist.filter((candidate) => candidate.id !== item.id) })}><TrashCan size={16} aria-hidden={true} /></IconButton>
            </div>)}
          </InspectorDisclosure>}
          {inspectorMode === "review" && <InspectorDisclosure className="layers-panel validation-panel" buttonId="validation-title" label="Setup checks" meta={validationIssues.length} initiallyOpen>
            {validationIssues.length ? validationIssues.slice(0, 8).map((issue, index) => (
              <Button type="button" size="sm" kind="ghost" className={`validation-issue ${issue.severity}`} key={`${issue.message}-${index}`} onClick={() => setSelectedIds(issue.elementIds)}>
                <span>{issue.severity === "error" ? "Error" : "Check"}</span>{issue.message}
              </Button>
            )) : <p className="validation-ok">No structural issues found.</p>}
            {validationIssues.length > 8 && <p className="validation-more">+{validationIssues.length - 8} more checks</p>}
          </InspectorDisclosure>}
          {inspectorMode === "document" && <InspectorDisclosure className="layers-panel" buttonId="publication-title" label="Publication">
            <div className="property-form">
              <Select id="publication-page" size="sm" labelText="Page" value={publication.pagePreset} onChange={(event) => commitPublication({ ...publication, pagePreset: event.target.value as PagePreset })}>
                {(Object.entries(pagePresets) as Array<[PagePreset, typeof pagePresets[PagePreset]]>).map(([key, preset]) => <option key={key} value={key}>{preset.label}</option>)}
              </Select>
              <Slider id="publication-label-scale" hideTextInput labelText={`Label scale · ${publication.labelScale.toFixed(1)}×`} min={0.7} max={1.5} step={0.1} value={publication.labelScale} onChange={({ value }) => commitPublication({ ...publication, labelScale: Number(value) })} />
              <Checkbox id="publication-monochrome" labelText="Monochrome" checked={publication.monochrome} onChange={(_, { checked }) => commitPublication({ ...publication, monochrome: checked })} />
              <Checkbox id="publication-credit" labelText="Show credit" checked={publication.showCredit} onChange={(_, { checked }) => commitPublication({ ...publication, showCredit: checked })} />
              <Checkbox id="publication-crop" labelText="Crop exports to content" checked={publication.cropToContent} onChange={(_, { checked }) => commitPublication({ ...publication, cropToContent: checked })} />
            </div>
          </InspectorDisclosure>}
          {inspectorMode === "document" && <InspectorDisclosure className="layers-panel" buttonId="layers-title" label="Layers">
            {([
              ["grid", "Grid"],
              ["labels", "Labels"],
              ["optics", "Optical components"],
              ["electronics", "Electronics"],
              ["beams", "Optical beams"],
              ["signals", "Signal paths"],
              ["annotations", "Annotations"],
            ] as Array<[keyof LayerVisibility, string]>).map(([key, label]) => (
              <Checkbox id={`layer-${key}`} key={key} labelText={label} checked={layers[key]} onChange={(_, { checked }) => setLayers((current) => ({ ...current, [key]: checked }))} />
            ))}
          </InspectorDisclosure>}
        </InspectorPanel>
      </Grid>
    </ScientificAppShell>
  );
}
