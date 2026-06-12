// ============================================================
// Command 类型定义 —— AI-A 和 AI-B 的核心数据契约
// 任何修改必须双方同步
// ============================================================

export type CommandAction =
  // create 类
  | 'create_circle'
  | 'create_rect'
  | 'create_line'
  | 'create_triangle'
  | 'create_ellipse'
  | 'create_polygon'
  | 'create_text'
  // modify 类
  | 'modify_position'
  | 'modify_size'
  | 'modify_props'
  // delete 类
  | 'delete_shape'
  | 'delete_all'
  // transform 类
  | 'move'
  | 'scale'
  | 'rotate'
  // style 类
  | 'set_color'
  | 'set_stroke_width'
  | 'set_fill'
  | 'set_line_style'
  | 'set_opacity'
  // canvas 类
  | 'undo'
  | 'redo'
  | 'clear'
  | 'zoom_in'
  | 'zoom_out'
  | 'save';

export interface Command {
  id: string;
  category: 'create' | 'modify' | 'delete' | 'transform' | 'style' | 'canvas';
  action: CommandAction;
  params: CommandParams;
  confidence: number;
}

// ============================================================
// create 类参数
// ============================================================

export interface CreateCircleParams {
  x: number | 'center';
  y: number | 'center';
  radius: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
}

export interface CreateRectParams {
  x: number | 'center';
  y: number | 'center';
  width: number;
  height: number;
  borderRadius?: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
}

export interface CreateLineParams {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
}

export interface CreateTriangleParams {
  x: number | 'center';
  y: number | 'center';
  width: number;
  height: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
}

export interface CreateEllipseParams {
  x: number | 'center';
  y: number | 'center';
  rx: number;
  ry: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
}

export interface CreatePolygonParams {
  points: Array<{ x: number; y: number }>;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
}

export interface CreateTextParams {
  x: number | 'center';
  y: number | 'center';
  content: string;
  fontSize?: number;
  fontFamily?: string;
  fill?: string;
}

// ============================================================
// transform / modify 类参数
// ============================================================

export interface MoveParams {
  targetId: string | 'last';
  dx: number;
  dy: number;
}

export interface ScaleParams {
  targetId: string | 'last';
  factor: number;
}

export interface RotateParams {
  targetId: string | 'last';
  angle: number;
}

export interface DeleteShapeParams {
  targetId: string | 'last';
}

export interface SetColorParams {
  targetId: string | 'last' | 'all';
  property: 'fill' | 'stroke' | 'both';
  color: string;
}

export interface SetStrokeWidthParams {
  targetId: string | 'last' | 'all';
  width: number;
}

export interface SetFillParams {
  targetId: string | 'last' | 'all';
  filled: boolean;
  color?: string;
}

export interface SetLineStyleParams {
  targetId: string | 'last' | 'all';
  style: 'solid' | 'dashed' | 'dotted';
}

export interface SetOpacityParams {
  targetId: string | 'last' | 'all';
  opacity: number;
}

export interface CanvasParams {
  factor?: number;
  filename?: string;
}

// ============================================================
// 联合类型
// ============================================================

export type CommandParams =
  | CreateCircleParams
  | CreateRectParams
  | CreateLineParams
  | CreateTriangleParams
  | CreateEllipseParams
  | CreatePolygonParams
  | CreateTextParams
  | MoveParams
  | ScaleParams
  | RotateParams
  | DeleteShapeParams
  | SetColorParams
  | SetStrokeWidthParams
  | SetFillParams
  | SetLineStyleParams
  | SetOpacityParams
  | CanvasParams;
