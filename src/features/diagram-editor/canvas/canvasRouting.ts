import type { PortType } from "../library/componentCatalog";

export type CanvasEdgeType = "straight" | "bezier" | "smoothstep" | "waypoint";

export const canvasEdgeTypeFor = (
  domain: PortType,
  routing: "straight" | "orthogonal" | undefined,
  hasWaypoints: boolean,
): CanvasEdgeType => {
  if (hasWaypoints) return "waypoint";
  if (routing === "straight") return "straight";
  if (routing === "orthogonal") return "smoothstep";
  if (domain === "optical-free-space") return "straight";
  if (domain === "fiber") return "bezier";
  return "smoothstep";
};

export const defaultRoutingLabel = (domain: PortType): string => {
  if (domain === "optical-free-space") return "Straight · free-space optics";
  if (domain === "fiber") return "Curved · fiber";
  return "Orthogonal · signal";
};

type RoutableConnection = {
  type?: "beam" | "signal";
  portType?: PortType;
  routing?: "straight" | "orthogonal";
  waypoints?: Array<{ x: number; y: number }>;
};

export const migrateCanvasRouting = <ConnectionType extends RoutableConnection>(
  connections: ConnectionType[],
  version: number,
): ConnectionType[] => {
  if (version >= 8) return connections;
  return connections.map((connection) => {
    if (connection.waypoints?.length) return connection;
    const beam = connection.type === "beam" || connection.portType === "optical-free-space" || connection.portType === "fiber";
    const legacyDefault = beam ? "straight" : "orthogonal";
    return connection.routing === legacyDefault ? { ...connection, routing: undefined } : connection;
  });
};
