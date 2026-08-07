import { componentByKind, componentPortLayouts, portTypeFor, portTypeColors, type ConnectionType, type PortType } from "../library/componentCatalog";
import type { Connection, DiagramElement, Point } from "../editorTypes";

const rotatePoint = (point: Point, angle: number): Point => {
  const radians = angle * Math.PI / 180;
  return { x: point.x * Math.cos(radians) - point.y * Math.sin(radians), y: point.x * Math.sin(radians) + point.y * Math.cos(radians) };
};

export const portsFor = (element: DiagramElement) => {
  const layout = componentByKind.get(element.kind)?.ports ?? "lr";
  return componentPortLayouts[layout].map((port) => {
    const scale = element.scale ?? 1;
    const rotated = rotatePoint({ x: port.x * scale * (element.flipX ? -1 : 1), y: port.y * scale * (element.flipY ? -1 : 1) }, element.rotation);
    return { ...port, type: portTypeFor(element.kind, port.id), x: element.x + rotated.x, y: element.y + rotated.y };
  });
};

export const closestPortPair = (from: DiagramElement, to: DiagramElement, requestedType?: PortType) => {
  const pairs = portsFor(from).flatMap((source) => portsFor(to).map((target) => ({ source, target, distance: Math.hypot(target.x - source.x, target.y - source.y) })));
  const compatible = pairs.filter((pair) => pair.source.type === pair.target.type && (!requestedType || pair.source.type === requestedType));
  return (compatible.length ? compatible : pairs).reduce((best, pair) => pair.distance < best.distance ? pair : best);
};

export const getConnectionType = (connection: Connection): ConnectionType => connection.type ?? ([portTypeColors["optical-free-space"], "#e84d3c"].includes(connection.color.toLowerCase()) ? "beam" : "signal");
export const getConnectionDomain = (connection: Connection, from?: DiagramElement): PortType => connection.portType ?? (from && connection.fromPort ? portTypeFor(from.kind, connection.fromPort) : getConnectionType(connection) === "beam" ? "optical-free-space" : "rf");
