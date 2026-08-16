/* Hallmark · subsystem: React Flow canvas · tone: technical-austere · design-system: design.md */

import { memo, type ReactNode } from "react";
import {
  BaseEdge,
  ConnectionMode,
  ReactFlow,
  type Edge,
  type EdgeProps,
  type Node,
  type ReactFlowProps,
} from "@xyflow/react";

type CanvasPoint = { x: number; y: number };
type WaypointEdgeData = { waypoints?: CanvasPoint[]; orthogonal?: boolean };
type WaypointEdge = Edge<WaypointEdgeData, "waypoint">;

const pointsToPath = (points: CanvasPoint[]) => {
  const compact = points.filter((point, index) => {
    const previous = points[index - 1];
    return !previous || previous.x !== point.x || previous.y !== point.y;
  });
  return `M ${compact.map((point) => `${point.x} ${point.y}`).join(" L ")}`;
};

const edgePoints = (source: CanvasPoint, target: CanvasPoint, waypoints: CanvasPoint[], orthogonal: boolean) => {
  if (!orthogonal) return [source, ...waypoints, target];
  const points = [source];
  for (const waypoint of waypoints) {
    const previous = points.at(-1)!;
    points.push({ x: waypoint.x, y: previous.y }, waypoint);
  }
  const previous = points.at(-1)!;
  return [...points, { x: target.x, y: previous.y }, target];
};

export const WaypointEdgeComponent = memo(function WaypointEdgeComponent({
  sourceX,
  sourceY,
  targetX,
  targetY,
  data,
  markerStart,
  markerEnd,
  style,
}: EdgeProps<WaypointEdge>) {
  return (
    <BaseEdge
      path={pointsToPath(edgePoints(
        { x: sourceX, y: sourceY },
        { x: targetX, y: targetY },
        data?.waypoints ?? [],
        Boolean(data?.orthogonal),
      ))}
      markerStart={markerStart}
      markerEnd={markerEnd}
      style={style}
      interactionWidth={20}
    />
  );
});

type DiagramCanvasProps<NodeType extends Node, EdgeType extends Edge> = Omit<
  ReactFlowProps<NodeType, EdgeType>,
  "children" | "connectionMode" | "deleteKeyCode" | "minZoom" | "maxZoom"
> & {
  children?: ReactNode;
};

export function DiagramCanvas<NodeType extends Node, EdgeType extends Edge>({
  children,
  ...props
}: DiagramCanvasProps<NodeType, EdgeType>) {
  return (
    <ReactFlow<NodeType, EdgeType>
      {...props}
      connectionMode={ConnectionMode.Loose}
      deleteKeyCode={null}
      minZoom={0.25}
      maxZoom={2.5}
    >
      {children}
    </ReactFlow>
  );
}
