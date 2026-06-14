import type { Shape } from '../../types/canvas';
import type {
  CreateCircleParams,
  CreateRectParams,
  CreateLineParams,
  CreateTriangleParams,
  CreateEllipseParams,
} from '../../types/commands';
import { ShapeFactory } from './ShapeFactory';

// ============================================================
// CanvasEngine
// ============================================================

/**
 * Canvas 绘图引擎 —— AI-A 的核心渲染模块
 *
 * 职责：
 * - 管理 HTML5 Canvas 2D 上下文
 * - 提供 5 种基础图形的绘制方法（circle / rect / line / triangle / ellipse）
 * - 每个绘制方法返回创建好的 Shape 对象，供调用方存入 Zustand Store
 * - 支持 clear() 清空画布和 redrawAll() 批量重绘（用于撤销/重做/初始化）
 */
export class CanvasEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private factory: ShapeFactory;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('[CanvasEngine] 无法获取 2D 渲染上下文');
    }
    this.ctx = ctx;
    this.factory = new ShapeFactory(canvas.width, canvas.height);
  }

  /** 获取关联的 Canvas 元素 */
  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  /** 更新画布尺寸（响应窗口 resize） */
  resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
    this.factory.setCanvasSize(width, height);
  }

  // ============================================================
  // 公开绘制方法（每个方法：工厂创建 → 绘制 → 返回 Shape）
  // ============================================================

  /** 绘制圆形 */
  drawCircle(params: CreateCircleParams): Shape {
    const shape = this.factory.createCircle(params);
    this.renderShape(shape);
    return shape;
  }

  /** 绘制矩形 */
  drawRect(params: CreateRectParams): Shape {
    const shape = this.factory.createRect(params);
    this.renderShape(shape);
    return shape;
  }

  /** 绘制线段 */
  drawLine(params: CreateLineParams): Shape {
    const shape = this.factory.createLine(params);
    this.renderShape(shape);
    return shape;
  }

  /** 绘制三角形（等腰三角形，底边在下） */
  drawTriangle(params: CreateTriangleParams): Shape {
    const shape = this.factory.createTriangle(params);
    this.renderShape(shape);
    return shape;
  }

  /** 绘制椭圆 */
  drawEllipse(params: CreateEllipseParams): Shape {
    const shape = this.factory.createEllipse(params);
    this.renderShape(shape);
    return shape;
  }

  // ============================================================
  // 画布级操作
  // ============================================================

  /** 清空整个画布 */
  clear(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  /**
   * 批量重绘所有图形
   * - 先清空画布，再按顺序绘制所有 Shape
   * - 用于撤销/重做后恢复画面、以及初始化加载
   */
  redrawAll(shapes: Shape[]): void {
    this.clear();
    for (const shape of shapes) {
      this.renderShape(shape);
    }
  }

  // ============================================================
  // 内部渲染方法
  // ============================================================

  /**
   * 根据 Shape 对象执行实际绘制
   * 统一处理样式应用 → 路径构建 → 填充/描边
   */
  private renderShape(shape: Shape): void {
    const ctx = this.ctx;

    ctx.save();

    // --- 应用样式 ---
    ctx.globalAlpha = shape.style.opacity;
    ctx.strokeStyle = shape.style.stroke;
    ctx.lineWidth = shape.style.strokeWidth;
    ctx.fillStyle = shape.style.fill ?? 'transparent';

    // 线条样式
    switch (shape.style.lineStyle) {
      case 'dashed':
        ctx.setLineDash([8, 4]);
        break;
      case 'dotted':
        ctx.setLineDash([3, 4]);
        break;
      default:
        ctx.setLineDash([]);
        break;
    }

    // --- 构建路径 ---
    switch (shape.type) {
      case 'circle':
        this.buildCirclePath(shape);
        break;
      case 'rect':
        this.buildRectPath(shape);
        break;
      case 'line':
        this.buildLinePath(shape);
        break;
      case 'triangle':
        this.buildTrianglePath(shape);
        break;
      case 'ellipse':
        this.buildEllipsePath(shape);
        break;
      default:
        // polygon / text 暂未实现
        console.warn(`[CanvasEngine] 不支持的图形类型: ${shape.type}`);
        ctx.restore();
        return;
    }

    // --- 填充与描边 ---
    if (shape.style.fill) {
      ctx.fill();
    }
    ctx.stroke();

    ctx.restore();
  }

  // ============================================================
  // 路径构建方法（只构建路径，不设置样式、不执行 fill/stroke）
  // ============================================================

  private buildCirclePath(shape: Shape): void {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.arc(shape.x, shape.y, shape.props.radius, 0, Math.PI * 2);
    ctx.closePath();
  }

  private buildRectPath(shape: Shape): void {
    const ctx = this.ctx;
    const { width, height, borderRadius = 0 } = shape.props;

    ctx.beginPath();
    if (borderRadius > 0) {
      ctx.roundRect(shape.x, shape.y, width, height, borderRadius);
    } else {
      ctx.rect(shape.x, shape.y, width, height);
    }
    ctx.closePath();
  }

  private buildLinePath(shape: Shape): void {
    const ctx = this.ctx;
    const { x1, y1, x2, y2 } = shape.props;

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    // 线段不 closePath()
  }

  private buildTrianglePath(shape: Shape): void {
    const ctx = this.ctx;
    const { width, height } = shape.props;
    const x = shape.x;
    const y = shape.y;

    ctx.beginPath();
    ctx.moveTo(x + width / 2, y);       // 顶点（顶边中点）
    ctx.lineTo(x + width, y + height);   // 右下角
    ctx.lineTo(x, y + height);           // 左下角
    ctx.closePath();
  }

  private buildEllipsePath(shape: Shape): void {
    const ctx = this.ctx;
    const { rx, ry } = shape.props;

    ctx.beginPath();
    ctx.ellipse(shape.x, shape.y, rx, ry, 0, 0, Math.PI * 2);
    ctx.closePath();
  }
}
