export type ModelPoint = { x: number; y: number };

export type ModelElement = {
  id: string;
  kind: string;
  label: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  scale?: number;
  locked?: boolean;
};

export type ModelConnection = {
  id: string;
  from: string;
  to: string;
  type?: "beam" | "signal";
  fromPort?: string;
  toPort?: string;
};

export type ValidationIssue = {
  severity: "error" | "warning";
  message: string;
  elementIds: string[];
};

export const moveElements = <T extends ModelElement>(
  elements: T[],
  selectedIds: Set<string>,
  dx: number,
  dy: number,
  bounds: { width: number; height: number },
): T[] => elements.map((element) => selectedIds.has(element.id) && !element.locked ? {
  ...element,
  x: Math.max(60, Math.min(bounds.width - 60, element.x + dx)),
  y: Math.max(60, Math.min(bounds.height - 60, element.y + dy)),
} : element);

const compactPoints = (points: ModelPoint[]) => points.filter((point, index) => {
  const previous = points[index - 1];
  return !previous || point.x !== previous.x || point.y !== previous.y;
});

const segmentHitsBox = (start: ModelPoint, end: ModelPoint, element: ModelElement) => {
  const halfWidth = Math.max(65, (element.width ?? 120) * (element.scale ?? 1) / 2) + 12;
  const halfHeight = Math.max(55, (element.height ?? 100) * (element.scale ?? 1) / 2) + 12;
  const left = element.x - halfWidth;
  const right = element.x + halfWidth;
  const top = element.y - halfHeight;
  const bottom = element.y + halfHeight;
  if (start.y === end.y) {
    return start.y >= top && start.y <= bottom && Math.max(start.x, end.x) >= left && Math.min(start.x, end.x) <= right;
  }
  if (start.x === end.x) {
    return start.x >= left && start.x <= right && Math.max(start.y, end.y) >= top && Math.min(start.y, end.y) <= bottom;
  }
  return false;
};

export const routeOrthogonal = (
  source: ModelPoint,
  target: ModelPoint,
  elements: ModelElement[],
  excludedIds: string[],
): ModelPoint[] => {
  const obstacles = elements.filter((element) => !excludedIds.includes(element.id));
  const middleX = (source.x + target.x) / 2;
  const middleY = (source.y + target.y) / 2;
  const top = Math.min(source.y, target.y, ...obstacles.map((element) => element.y - 85));
  const bottom = Math.max(source.y, target.y, ...obstacles.map((element) => element.y + 85));
  const left = Math.min(source.x, target.x, ...obstacles.map((element) => element.x - 95));
  const right = Math.max(source.x, target.x, ...obstacles.map((element) => element.x + 95));
  const candidates = [
    [source, { x: middleX, y: source.y }, { x: middleX, y: target.y }, target],
    [source, { x: source.x, y: middleY }, { x: target.x, y: middleY }, target],
    [source, { x: source.x, y: top }, { x: target.x, y: top }, target],
    [source, { x: source.x, y: bottom }, { x: target.x, y: bottom }, target],
    [source, { x: left, y: source.y }, { x: left, y: target.y }, target],
    [source, { x: right, y: source.y }, { x: right, y: target.y }, target],
  ].map(compactPoints);
  const score = (points: ModelPoint[]) => {
    let collisions = 0;
    let length = 0;
    for (let index = 1; index < points.length; index += 1) {
      length += Math.abs(points[index].x - points[index - 1].x) + Math.abs(points[index].y - points[index - 1].y);
      collisions += obstacles.filter((element) => segmentHitsBox(points[index - 1], points[index], element)).length;
    }
    return collisions * 1_000_000 + length;
  };
  return candidates.reduce((best, candidate) => score(candidate) < score(best) ? candidate : best);
};

export const parseCsv = (source: string): string[][] => {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (character === '"' && quoted && source[index + 1] === '"') {
      cell += '"';
      index += 1;
    } else if (character === '"') quoted = !quoted;
    else if (character === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && source[index + 1] === "\n") index += 1;
      row.push(cell);
      if (row.some(Boolean)) rows.push(row);
      row = [];
      cell = "";
    } else cell += character;
  }
  row.push(cell);
  if (row.some(Boolean)) rows.push(row);
  if (quoted) throw new Error("Unclosed quoted CSV field");
  return rows;
};

export const validateSetup = (
  elements: ModelElement[],
  connections: ModelConnection[],
  electronicKinds: Set<string>,
  annotationKinds: Set<string>,
): ValidationIssue[] => {
  const issues: ValidationIssue[] = [];
  const byId = new Map(elements.map((element) => [element.id, element]));
  const connectedIds = new Set(connections.flatMap((connection) => [connection.from, connection.to]));
  const degree = new Map(elements.map((element) => [element.id, connections.filter((connection) => connection.from === element.id || connection.to === element.id).length]));
  const minimumDegree = new Map<string, number>([["splitter", 3], ["biastee", 3], ["mixer", 2], ["networkanalyzer", 2], ["cavity", 2]]);
  for (const element of elements) {
    if (!annotationKinds.has(element.kind) && !connectedIds.has(element.id)) {
      issues.push({ severity: "warning", message: `${element.label} is not connected`, elementIds: [element.id] });
    }
    if (element.kind === "termination" && connections.filter((connection) => connection.from === element.id || connection.to === element.id).length !== 1) {
      issues.push({ severity: "warning", message: `${element.label} should terminate exactly one RF path`, elementIds: [element.id] });
    }
    const expected = minimumDegree.get(element.kind);
    if (expected && (degree.get(element.id) ?? 0) > 0 && (degree.get(element.id) ?? 0) < expected) {
      issues.push({ severity: "warning", message: `${element.label} has an incomplete ${expected}-port path`, elementIds: [element.id] });
    }
  }
  const labels = new Map<string, string[]>();
  for (const element of elements.filter((item) => !annotationKinds.has(item.kind))) {
    const key = element.label.trim().toLowerCase();
    if (key) labels.set(key, [...(labels.get(key) ?? []), element.id]);
  }
  for (const [label, ids] of labels) {
    if (ids.length > 1) issues.push({ severity: "warning", message: `Duplicate label: ${label}`, elementIds: ids });
  }
  for (const connection of connections) {
    const from = byId.get(connection.from);
    const to = byId.get(connection.to);
    if (!from || !to) issues.push({ severity: "error", message: `Connection ${connection.id} has a missing endpoint`, elementIds: [] });
    else if (connection.from === connection.to) issues.push({ severity: "error", message: `${from.label} is connected to itself`, elementIds: [from.id] });
    else if (connection.type === "beam" && (electronicKinds.has(from.kind) || electronicKinds.has(to.kind))) {
      issues.push({ severity: "warning", message: `Optical beam reaches an electronic-only component`, elementIds: [from.id, to.id] });
    } else if (annotationKinds.has(from.kind) || annotationKinds.has(to.kind)) {
      issues.push({ severity: "warning", message: `A signal path is attached to an annotation`, elementIds: [from.id, to.id] });
    }
  }
  const occupiedPorts = new Map<string, string[]>();
  for (const connection of connections) {
    for (const [elementId, port] of [[connection.from, connection.fromPort], [connection.to, connection.toPort]]) {
      if (!port) continue;
      const key = `${elementId}:${port}`;
      occupiedPorts.set(key, [...(occupiedPorts.get(key) ?? []), connection.id]);
    }
  }
  for (const [port, connectionIds] of occupiedPorts) {
    if (connectionIds.length > 1) issues.push({ severity: "warning", message: `Port ${port} is used by ${connectionIds.length} paths`, elementIds: [port.split(":")[0]] });
  }
  return issues;
};
