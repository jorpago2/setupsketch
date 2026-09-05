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
  powerDbm?: number;
  gainDb?: number;
  lossDb?: number;
  noiseFigureDb?: number;
  bandwidthHz?: number;
  calibrationDueDate?: string;
};

export type ModelConnection = {
  id: string;
  from: string;
  to: string;
  type?: "beam" | "signal";
  fromPort?: string;
  toPort?: string;
  portType?: "optical-free-space" | "fiber" | "rf" | "dc" | "trigger" | "digital";
  lossDb?: number;
  bandwidthHz?: number;
};

export type BudgetResult = {
  id: string;
  labels: string[];
  domain: NonNullable<ModelConnection["portType"]>;
  inputPowerDbm: number;
  outputPowerDbm: number;
  totalGainDb: number;
  totalLossDb: number;
  noiseFigureDb?: number;
  outputNoiseDbm?: number;
  snrDb?: number;
  bandwidthHz?: number;
  noiseTemperatureK?: number;
  noiseDensityDbmHz?: number;
};

export type BudgetSummary = {
  items: BudgetResult[];
  included: number;
  total: number;
  truncated: boolean;
  totalIsExact: boolean;
};

export const DEFAULT_NOISE_TEMPERATURE_K = 290;
const BOLTZMANN_CONSTANT_J_PER_K = 1.380649e-23;
const MAX_INCLUDED_BUDGETS = 40;
const MAX_COUNTED_BUDGETS = 10_000;

export const thermalNoiseDensityDbmHz = (temperatureK: number) => {
  if (!Number.isFinite(temperatureK) || temperatureK <= 0) throw new RangeError("Noise temperature must be a positive finite value.");
  return 10 * Math.log10(BOLTZMANN_CONSTANT_J_PER_K * temperatureK / 1e-3);
};

export type ValidationIssue = {
  severity: "error" | "warning";
  message: string;
  elementIds: string[];
};
export type PortDirection = "input" | "output" | "bidirectional";

// ponytail: fixed cells fit catalog components; use measured bounds if variable-size auto-layout is needed.
const positionsOverlap = (a: ModelPoint, b: ModelPoint) => Math.abs(a.x - b.x) < 140 && Math.abs(a.y - b.y) < 120;

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

export const findOpenPosition = (
  elements: Array<Pick<ModelElement, "x" | "y">>,
  bounds: { width: number; height: number },
): ModelPoint => {
  for (let y = 120; y <= bounds.height - 100; y += 140) {
    for (let x = 120; x <= bounds.width - 100; x += 160) {
      if (elements.every((element) => !positionsOverlap(element, { x, y }))) return { x, y };
    }
  }
  const offset = elements.length % 8 * 20;
  return { x: Math.min(bounds.width - 80, bounds.width / 2 + offset), y: Math.min(bounds.height - 80, bounds.height / 2 + offset) };
};

export const arrangeOverlaps = <T extends ModelElement>(
  elements: T[],
  bounds: { width: number; height: number },
): T[] => {
  const occupied: Array<Pick<ModelElement, "x" | "y">> = elements.filter((element) => element.locked);
  return elements.map((element) => {
    if (element.locked) return element;
    const next = occupied.some((candidate) => positionsOverlap(candidate, element))
      ? { ...element, ...findOpenPosition(occupied, bounds) }
      : element;
    occupied.push(next);
    return next;
  });
};

export const calculateBudgets = (
  elements: ModelElement[],
  connections: ModelConnection[],
  noiseTemperatureK = DEFAULT_NOISE_TEMPERATURE_K,
): BudgetSummary => {
  if (!Number.isFinite(noiseTemperatureK) || noiseTemperatureK <= 0) throw new RangeError("Noise temperature must be a positive finite value.");
  const byId = new Map(elements.map((element) => [element.id, element]));
  const outgoing = new Map<string, ModelConnection[]>();
  for (const connection of connections) outgoing.set(connection.from, [...(outgoing.get(connection.from) ?? []), connection]);
  const domainFor = (connection: ModelConnection): BudgetResult["domain"] =>
    connection.portType ?? (connection.type === "beam" ? "optical-free-space" : "rf");
  const results: BudgetResult[] = [];
  let total = 0;
  let totalIsExact = true;
  const summarize = (path: ModelElement[], links: ModelConnection[], domain: BudgetResult["domain"]) => {
    const sourcePower = path[0].powerDbm;
    if (sourcePower === undefined || path.length < 2) return;
    total += 1;
    if (results.length >= MAX_INCLUDED_BUDGETS) return;
    const totalGainDb = path.reduce((sum, element) => sum + (element.gainDb ?? 0), 0);
    const totalLossDb = path.reduce((sum, element) => sum + (element.lossDb ?? 0), 0) + links.reduce((sum, link) => sum + (link.lossDb ?? 0), 0);
    const bandwidths = [...path.map((element) => element.bandwidthHz), ...links.map((link) => link.bandwidthHz)]
      .filter((value): value is number => typeof value === "number" && value > 0);
    let totalNoiseFactor = 1;
    let precedingGain = 1;
    if (domain === "rf") {
      const stages = path.flatMap((element, index) => {
        const elementStage = { gainDb: (element.gainDb ?? 0) - (element.lossDb ?? 0), noiseFigureDb: element.noiseFigureDb ?? element.lossDb ?? 0 };
        const link = links[index];
        return link ? [elementStage, { gainDb: -(link.lossDb ?? 0), noiseFigureDb: link.lossDb ?? 0 }] : [elementStage];
      });
      stages.forEach((stage, index) => {
        const factor = 10 ** (stage.noiseFigureDb / 10);
        totalNoiseFactor = index === 0 ? factor : totalNoiseFactor + (factor - 1) / Math.max(precedingGain, 1e-12);
        precedingGain *= 10 ** (stage.gainDb / 10);
      });
    }
    const noiseFigureDb = domain === "rf" ? 10 * Math.log10(Math.max(totalNoiseFactor, 1)) : undefined;
    const bandwidthHz = bandwidths.length ? Math.min(...bandwidths) : undefined;
    const outputPowerDbm = sourcePower + totalGainDb - totalLossDb;
    const noiseDensityDbmHz = domain === "rf" ? thermalNoiseDensityDbmHz(noiseTemperatureK) : undefined;
    const outputNoiseDbm = domain === "rf" && bandwidthHz && noiseFigureDb !== undefined
      ? noiseDensityDbmHz! + 10 * Math.log10(bandwidthHz) + noiseFigureDb + totalGainDb - totalLossDb
      : undefined;
    results.push({
      id: links.map((link) => link.id).join("-"),
      labels: path.map((element) => element.label),
      domain,
      inputPowerDbm: sourcePower,
      outputPowerDbm,
      totalGainDb,
      totalLossDb,
      noiseFigureDb,
      outputNoiseDbm,
      snrDb: outputNoiseDbm !== undefined ? outputPowerDbm - outputNoiseDbm : undefined,
      bandwidthHz,
      noiseTemperatureK: domain === "rf" ? noiseTemperatureK : undefined,
      noiseDensityDbmHz,
    });
  };
  const walk = (path: ModelElement[], links: ModelConnection[], domain?: BudgetResult["domain"]) => {
    if (total >= MAX_COUNTED_BUDGETS) {
      totalIsExact = false;
      return;
    }
    const last = path.at(-1)!;
    const nextLinks = (outgoing.get(last.id) ?? []).filter((link) => !domain || domainFor(link) === domain);
    if (!nextLinks.length) {
      if (domain) summarize(path, links, domain);
      return;
    }
    for (const link of nextLinks) {
      const next = byId.get(link.to);
      if (!next || path.some((element) => element.id === next.id)) continue;
      walk([...path, next], [...links, link], domain ?? domainFor(link));
    }
  };
  elements.filter((element) => element.powerDbm !== undefined).forEach((source) => walk([source], []));
  return {
    items: results,
    included: results.length,
    total,
    truncated: !totalIsExact || total > results.length,
    totalIsExact,
  };
};

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
  unconnectedAllowedKinds: Set<string> = new Set(),
  resolvePortType?: (kind: string, portId: string) => ModelConnection["portType"],
  resolvePortDirection?: (kind: string, portId: string) => PortDirection,
  today = new Date().toISOString().slice(0, 10),
): ValidationIssue[] => {
  const issues: ValidationIssue[] = [];
  const byId = new Map(elements.map((element) => [element.id, element]));
  const connectedIds = new Set(connections.flatMap((connection) => [connection.from, connection.to]));
  const degree = new Map(elements.map((element) => [element.id, connections.filter((connection) => connection.from === element.id || connection.to === element.id).length]));
  const minimumDegree = new Map<string, number>([["splitter", 3], ["biastee", 3], ["mixer", 2], ["networkanalyzer", 2], ["cavity", 2]]);
  for (const element of elements) {
    if (!annotationKinds.has(element.kind) && !unconnectedAllowedKinds.has(element.kind) && !connectedIds.has(element.id)) {
      issues.push({ severity: "warning", message: `${element.label} is not connected`, elementIds: [element.id] });
    }
    if (element.kind === "termination" && connections.filter((connection) => connection.from === element.id || connection.to === element.id).length !== 1) {
      issues.push({ severity: "warning", message: `${element.label} should terminate exactly one RF path`, elementIds: [element.id] });
    }
    const expected = minimumDegree.get(element.kind);
    if (expected && (degree.get(element.id) ?? 0) > 0 && (degree.get(element.id) ?? 0) < expected) {
      issues.push({ severity: "warning", message: `${element.label} has an incomplete ${expected}-port path`, elementIds: [element.id] });
    }
    if (element.calibrationDueDate && element.calibrationDueDate < today) {
      issues.push({ severity: "error", message: `${element.label} calibration expired on ${element.calibrationDueDate}`, elementIds: [element.id] });
    }
    if (element.bandwidthHz !== undefined && element.bandwidthHz <= 0) {
      issues.push({ severity: "error", message: `${element.label} bandwidth must be positive`, elementIds: [element.id] });
    }
    if (element.lossDb !== undefined && element.lossDb < 0) {
      issues.push({ severity: "warning", message: `${element.label} uses negative loss; enter gain separately`, elementIds: [element.id] });
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
    } else if (resolvePortType && connection.portType && connection.fromPort && connection.toPort &&
      (resolvePortType(from.kind, connection.fromPort) !== connection.portType || resolvePortType(to.kind, connection.toPort) !== connection.portType)) {
      issues.push({ severity: "error", message: `${connection.portType} path uses an incompatible port`, elementIds: [from.id, to.id] });
    }
    if (from && to && resolvePortDirection && connection.fromPort && connection.toPort) {
      const fromDirection = resolvePortDirection(from.kind, connection.fromPort);
      const toDirection = resolvePortDirection(to.kind, connection.toPort);
      if (fromDirection === "input" || toDirection === "output") {
        issues.push({ severity: "error", message: `Connection ${connection.id} must run from an output to an input`, elementIds: [from.id, to.id] });
      }
    }
    if (connection.bandwidthHz !== undefined && connection.bandwidthHz <= 0) {
      issues.push({ severity: "error", message: `Connection ${connection.id} bandwidth must be positive`, elementIds: [connection.from, connection.to] });
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
