// ============================================================
// 画布与图形类型 —— AI-A 内部使用的数据结构
// ============================================================

export interface ShapeStyle {
  fill?: string;
  stroke: string;
  strokeWidth: number;
  lineStyle: 'solid' | 'dashed' | 'dotted';
  opacity: number;
}

export interface Shape {
  id: string;
  type: 'circle' | 'rect' | 'line' | 'triangle' | 'ellipse' | 'polygon' | 'text';
  x: number;
  y: number;
  props: Record<string, any>;
  style: ShapeStyle;
  createdAt: number;
}

export interface ShapeSummary {
  id: string;
  type: string;
  description: string;
}

export interface CanvasState {
  width: number;
  height: number;
  shapes: ShapeSummary[];
  selectedShapeId: string | null;
  currentStyle: {
    fill: string;
    stroke: string;
    strokeWidth: number;
  };
  totalShapes: number;
}

export interface HistoryEntry {
  shapes: Shape[];
  timestamp: number;
}
