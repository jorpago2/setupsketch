import type { Connection, DiagramElement, ExperimentRecord, PublicationSettings, Snapshot } from "../editorTypes";

export const cloneSnapshot = (elements: DiagramElement[], connections: Connection[], publication: PublicationSettings, experiment: ExperimentRecord): Snapshot => ({
  elements: elements.map((element) => ({ ...element })),
  connections: connections.map((connection) => ({ ...connection, waypoints: connection.waypoints?.map((point) => ({ ...point })) })),
  publication: { ...publication },
  experiment: { procedure: experiment.procedure, checklist: experiment.checklist.map((item) => ({ ...item })) },
});

export const download = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};

export const safeFilename = (name: string) => name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "setup";
