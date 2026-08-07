import type { Viewport } from "@xyflow/react";
import { componentGroups, type ElementKind } from "./library/componentCatalog";
import type { ExperimentRecord, PagePreset, PublicationSettings } from "./editorTypes";

export const WIDTH = 1200;
export const HEIGHT = 700;
export const DIAGRAM_VERSION = 12;
export const STORAGE_KEY = "setupsketch-diagram-v1";
export const FAVORITES_KEY = "setupsketch-favorites-v1";
export const MODULES_KEY = "setupsketch-modules-v1";
export const GRID_STEP = 20;
export const FLOW_SNAP_GRID: [number, number] = [GRID_STEP, GRID_STEP];
export const DEFAULT_VIEWPORT: Viewport = { x: 0, y: 0, zoom: 1 };
export const resizableAnnotationKinds = new Set<ElementKind>(["textnote", "equation", "region", "legend"]);
export const annotationDefaultSizes: Partial<Record<ElementKind, { width: number; height: number }>> = {
  textnote: { width: 150, height: 70 }, equation: { width: 180, height: 60 }, region: { width: 220, height: 150 },
  dimension: { width: 180, height: 60 }, brace: { width: 180, height: 60 }, legend: { width: 180, height: 100 },
};
export const pagePresets: Record<PagePreset, { label: string; width: number; height: number }> = {
  canvas: { label: "Canvas 12:7", width: WIDTH, height: HEIGHT }, a4: { label: "A4 landscape", width: 1120, height: 792 },
  a3: { label: "A3 landscape", width: 1400, height: 990 }, single: { label: "Single column", width: 850, height: 700 }, double: { label: "Double column", width: 1200, height: 700 },
};
export const defaultPublication: PublicationSettings = { pagePreset: "canvas", monochrome: false, showCredit: true, labelScale: 1, cropToContent: false };
export const defaultExperiment: ExperimentRecord = { procedure: "", checklist: [] };
export const defaultCollapsedGroups = componentGroups.map((group) => group.title);
