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
type WaypointEdgeData = { waypoints?: CanvasPoint[] };
type WaypointEdge = Edge<WaypointEdgeData, "waypoint">;

const pointsToPath = (points: CanvasPoint[]) => {
  const compact = points.filter((point, index) => {
    const previous = points[index - 1];
    return !previous || previous.x !== point.x || previous.y !== point.y;
  });
  return `M ${compact.map((point) => `${point.x} ${point.y}`).join(" L ")}`;
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
      path={pointsToPath([
        { x: sourceX, y: sourceY },
        ...(data?.waypoints ?? []),
        { x: targetX, y: targetY },
      ])}
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
