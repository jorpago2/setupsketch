import type { ConnectionType, ElementKind, PortType } from "./library/componentCatalog";

export type LayerVisibility = { grid: boolean; labels: boolean; optics: boolean; electronics: boolean; beams: boolean; signals: boolean; annotations: boolean };
export type Point = { x: number; y: number };
export type Routing = "straight" | "orthogonal";
export type PagePreset = "canvas" | "a4" | "a3" | "single" | "double";
export type InspectorMode = "document" | "experiment" | "review" | "selection";
export type ViewportMode = "narrow" | "wide";
export type PublicationSettings = { pagePreset: PagePreset; monochrome: boolean; showCredit: boolean; labelScale: number; cropToContent: boolean };
export type DiagramElement = {
  id: string; kind: ElementKind; label: string; x: number; y: number; rotation: number; color: string;
  manufacturer?: string; model?: string; specs?: string; notes?: string; groupId?: string; scale?: number;
  flipX?: boolean; flipY?: boolean; locked?: boolean; width?: number; height?: number; powerDbm?: number;
  gainDb?: number; lossDb?: number; noiseFigureDb?: number; bandwidthHz?: number; wavelengthNm?: number;
  serialNumber?: string; calibrationDate?: string; calibrationDueDate?: string; uncertainty?: string; datasheetUrl?: string;
};
export type Connection = { id: string; from: string; to: string; color: string; type?: ConnectionType; fromPort?: string; toPort?: string; routing?: Routing; waypoints?: Point[]; portType?: PortType; lossDb?: number; bandwidthHz?: number };
export type ChecklistItem = { id: string; text: string; done: boolean };
export type ExperimentRecord = { procedure: string; checklist: ChecklistItem[] };
export type Snapshot = { elements: DiagramElement[]; connections: Connection[]; publication: PublicationSettings; experiment: ExperimentRecord };
export type SavedModule = { id: string; name: string; elements: DiagramElement[]; connections: Connection[] };
