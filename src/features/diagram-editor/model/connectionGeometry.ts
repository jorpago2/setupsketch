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

export const normalizeConnectionPorts = (elements: DiagramElement[], connections: Connection[]): Connection[] => {
  const byId = new Map(elements.map((element) => [element.id, element]));
  const nearest = <T extends { x: number; y: number }>(origin: T, candidates: T[]) =>
    candidates.reduce((best, candidate) => Math.hypot(candidate.x - origin.x, candidate.y - origin.y) < Math.hypot(best.x - origin.x, best.y - origin.y) ? candidate : best);

  return connections.map((connection) => {
    const from = byId.get(connection.from);
    const to = byId.get(connection.to);
    if (!from || !to) return connection;
    const domain = getConnectionDomain(connection, from);
    const sourcePorts = portsFor(from).filter((port) => port.type === domain);
    const targetPorts = portsFor(to).filter((port) => port.type === domain);
    const source = sourcePorts.find((port) => port.id === connection.fromPort);
    const target = targetPorts.find((port) => port.id === connection.toPort);
    if (source && target) return connection.portType ? connection : { ...connection, portType: domain };
    if (source && targetPorts.length) return { ...connection, portType: domain, toPort: nearest(source, targetPorts).id };
    if (target && sourcePorts.length) return { ...connection, portType: domain, fromPort: nearest(target, sourcePorts).id };
    const pair = sourcePorts.length && targetPorts.length
      ? sourcePorts.flatMap((candidateSource) => targetPorts.map((candidateTarget) => ({
        source: candidateSource,
        target: candidateTarget,
        distance: Math.hypot(candidateTarget.x - candidateSource.x, candidateTarget.y - candidateSource.y),
      }))).reduce((best, candidate) => candidate.distance < best.distance ? candidate : best)
      : closestPortPair(from, to);
    return { ...connection, portType: domain, fromPort: pair.source.id, toPort: pair.target.id };
  });
};
