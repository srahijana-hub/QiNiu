import type { Shape, ShapeStyle } from '../../types/canvas';
import type {
  CreateCircleParams,
  CreateRectParams,
  CreateLineParams,
  CreateTriangleParams,
  CreateEllipseParams,
  CreatePolygonParams,
  CreateTextParams,
} from '../../types/commands';

// ============================================================
// 默认样式值（与需求文档对齐）
// ============================================================

const DEFAULT_STYLE = {
  stroke: '#000000',
  strokeWidth: 2,
  lineStyle: 'solid' as const,
  opacity: 1,
} as const;

// ============================================================
// ShapeFactory
// ============================================================

/**
 * 图形工厂 —— 将 AI-B 传来的 Create*Params 转为 AI-A 内部的 Shape 对象
 *
 * 职责：
 * - 解析 'center' 坐标 → 实际像素
 * - 生成唯一 ID（crypto.randomUUID()）
 * - 填充默认样式值
 * - 将 params 映射到 Shape.props（供后续重绘使用）
 */
export class ShapeFactory {
  private canvasWidth: number;
  private canvasHeight: number;

  constructor(canvasWidth: number, canvasHeight: number) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
  }

  /** 更新画布尺寸（窗口 resize 时调用） */
  setCanvasSize(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
  }

  // ============================================================
  // 公开工厂方法
  // ============================================================

  createCircle(params: CreateCircleParams): Shape {
    const cx = this.resolveX(params.x);
    const cy = this.resolveY(params.y);

    return {
      id: crypto.randomUUID(),
      type: 'circle',
      x: cx,
      y: cy,
      props: { radius: params.radius },
      style: this.buildStyle(params),
      createdAt: Date.now(),
    };
  }

  createRect(params: CreateRectParams): Shape {
    const x = this.resolveX(params.x);
    const y = this.resolveY(params.y);

    return {
      id: crypto.randomUUID(),
      type: 'rect',
      x,
      y,
      props: {
        width: params.width,
        height: params.height,
        borderRadius: params.borderRadius ?? 0,
      },
      style: this.buildStyle(params),
      createdAt: Date.now(),
    };
  }

  createLine(params: CreateLineParams): Shape {
    // 线段以两端点的中点为 "位置"
    const midX = (params.x1 + params.x2) / 2;
    const midY = (params.y1 + params.y2) / 2;

    return {
      id: crypto.randomUUID(),
      type: 'line',
      x: midX,
      y: midY,
      props: {
        x1: params.x1,
        y1: params.y1,
        x2: params.x2,
        y2: params.y2,
      },
      style: {
        ...this.buildStyle(params),
        fill: undefined, // 线段不允许填充
      },
      createdAt: Date.now(),
    };
  }

  createTriangle(params: CreateTriangleParams): Shape {
    const x = this.resolveX(params.x);
    const y = this.resolveY(params.y);

    return {
      id: crypto.randomUUID(),
      type: 'triangle',
      x,
      y,
      props: {
        width: params.width,
        height: params.height,
      },
      style: this.buildStyle(params),
      createdAt: Date.now(),
    };
  }

  createEllipse(params: CreateEllipseParams): Shape {
    const cx = this.resolveX(params.x);
    const cy = this.resolveY(params.y);

    return {
      id: crypto.randomUUID(),
      type: 'ellipse',
      x: cx,
      y: cy,
      props: {
        rx: params.rx,
        ry: params.ry,
      },
      style: this.buildStyle(params),
      createdAt: Date.now(),
    };
  }

  createPolygon(params: CreatePolygonParams): Shape {
    // 以多边形各顶点的几何中心为 Shape 的 "位置"
    const centroid = this.computeCentroid(params.points);

    return {
      id: crypto.randomUUID(),
      type: 'polygon',
      x: centroid.x,
      y: centroid.y,
      props: {
        points: params.points,
      },
      style: this.buildStyle(params),
      createdAt: Date.now(),
    };
  }

  createText(params: CreateTextParams): Shape {
    const x = this.resolveX(params.x);
    const y = this.resolveY(params.y);

    return {
      id: crypto.randomUUID(),
      type: 'text',
      x,
      y,
      props: {
        content: params.content,
        fontSize: params.fontSize ?? 16,
        fontFamily: params.fontFamily ?? 'Arial',
      },
      style: {
        fill: params.fill ?? '#000000',
        stroke: 'transparent',    // 文字不描边
        strokeWidth: 0,
        lineStyle: 'solid',
        opacity: 1,
      },
      createdAt: Date.now(),
    };
  }

  // ============================================================
  // 内部辅助方法
  // ============================================================

  /** 解析 x 坐标："center" → canvasWidth / 2 */
  private resolveX(x: number | 'center'): number {
    return x === 'center' ? this.canvasWidth / 2 : x;
  }

  /** 解析 y 坐标："center" → canvasHeight / 2 */
  private resolveY(y: number | 'center'): number {
    return y === 'center' ? this.canvasHeight / 2 : y;
  }

  /** 用默认值补全样式字段 */
  private buildStyle(overrides: {
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
    opacity?: number;
  }): ShapeStyle {
    return {
      fill: overrides.fill,
      stroke: overrides.stroke ?? DEFAULT_STYLE.stroke,
      strokeWidth: overrides.strokeWidth ?? DEFAULT_STYLE.strokeWidth,
      lineStyle: DEFAULT_STYLE.lineStyle,
      opacity: overrides.opacity ?? DEFAULT_STYLE.opacity,
    };
  }

  /** 计算多边形各顶点的几何中心 */
  private computeCentroid(points: Array<{ x: number; y: number }>): { x: number; y: number } {
    const n = points.length;
    if (n === 0) return { x: 0, y: 0 };

    const sumX = points.reduce((s, p) => s + p.x, 0);
    const sumY = points.reduce((s, p) => s + p.y, 0);
    return { x: sumX / n, y: sumY / n };
  }
}
