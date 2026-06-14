import type { Shape, ShapeStyle, HistoryEntry } from '../../types/canvas';

let nextId = 1;
function genId(): string {
  return `shape_${nextId++}`;
}

const DEFAULT_STYLE: ShapeStyle = {
  fill: 'transparent',
  stroke: '#000000',
  strokeWidth: 2,
  lineStyle: 'solid',
  opacity: 1,
};

export class Canvas {
  private shapes: Shape[] = [];
  private history: HistoryEntry[] = [];
  private historyIndex = -1;
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;

  constructor(ctx: CanvasRenderingContext2D, width: number, height: number) {
    this.ctx = ctx;
    this.width = width;
    this.height = height;
    this.saveHistory();
  }

  // ======================== Shape 管理 ========================

  addShape(shape: Shape): void {
    this.shapes.push(shape);
    this.saveHistory();
    this.redraw();
  }

  deleteShape(id: string): boolean {
    const idx = this.shapes.findIndex((s) => s.id === id);
    if (idx === -1) return false;
    this.shapes.splice(idx, 1);
    this.saveHistory();
    this.redraw();
    return true;
  }

  getShape(id: string): Shape | undefined {
    return this.shapes.find((s) => s.id === id);
  }

  getLastShape(): Shape | undefined {
    return this.shapes[this.shapes.length - 1];
  }

  getAllShapes(): Shape[] {
    return [...this.shapes];
  }

  resolveTarget(targetId: string | 'last'): Shape | undefined {
    if (targetId === 'last') return this.getLastShape();
    return this.getShape(targetId);
  }

  resolveTargets(targetId: string | 'last' | 'all'): Shape[] {
    if (targetId === 'all') return [...this.shapes];
    const shape = this.resolveTarget(targetId);
    return shape ? [shape] : [];
  }

  // ======================== Undo / Redo ========================

  undo(): boolean {
    if (this.historyIndex <= 0) return false;
    this.historyIndex--;
    this.shapes = JSON.parse(JSON.stringify(this.history[this.historyIndex].shapes));
    this.redraw();
    return true;
  }

  redo(): boolean {
    if (this.historyIndex >= this.history.length - 1) return false;
    this.historyIndex++;
    this.shapes = JSON.parse(JSON.stringify(this.history[this.historyIndex].shapes));
    this.redraw();
    return true;
  }

  private saveHistory(): void {
    this.history = this.history.slice(0, this.historyIndex + 1);
    this.history.push({ shapes: JSON.parse(JSON.stringify(this.shapes)), timestamp: Date.now() });
    this.historyIndex = this.history.length - 1;
  }

  // ======================== 清空 ========================

  clear(): void {
    this.shapes = [];
    this.saveHistory();
    this.redraw();
  }

  // ======================== 渲染 ========================

  redraw(): void {
    this.ctx.clearRect(0, 0, this.width, this.height);
    for (const shape of this.shapes) {
      this.drawShape(shape);
    }
  }

  private drawShape(shape: Shape): void {
    const { ctx } = this;
    ctx.save();
    ctx.globalAlpha = shape.style.opacity;

    if (shape.style.lineStyle !== 'solid') {
      const dash = shape.style.lineStyle === 'dashed' ? [8, 4] : [2, 4];
      ctx.setLineDash(dash);
    } else {
      ctx.setLineDash([]);
    }

    switch (shape.type) {
      case 'circle':
        this.drawCircle(shape);
        break;
      case 'rect':
        this.drawRect(shape);
        break;
      case 'line':
        this.drawLine(shape);
        break;
      case 'triangle':
        this.drawTriangle(shape);
        break;
      case 'ellipse':
        this.drawEllipse(shape);
        break;
      case 'polygon':
        this.drawPolygon(shape);
        break;
      case 'text':
        this.drawText(shape);
        break;
    }

    ctx.restore();
  }

  private applyFillStroke(style: ShapeStyle): void {
    const { ctx } = this;
    if (style.fill && style.fill !== 'transparent') {
      ctx.fillStyle = style.fill;
      ctx.fill();
    }
    ctx.strokeStyle = style.stroke;
    ctx.lineWidth = style.strokeWidth;
    ctx.stroke();
  }

  private drawCircle(shape: Shape): void {
    const { ctx } = this;
    const { radius } = shape.props as { radius: number };
    ctx.beginPath();
    ctx.arc(shape.x, shape.y, radius, 0, Math.PI * 2);
    this.applyFillStroke(shape.style);
  }

  private drawRect(shape: Shape): void {
    const { ctx } = this;
    const { width, height, borderRadius } = shape.props as { width: number; height: number; borderRadius?: number };
    const x = shape.x - width / 2;
    const y = shape.y - height / 2;
    ctx.beginPath();
    if (borderRadius && borderRadius > 0) {
      ctx.roundRect(x, y, width, height, borderRadius);
    } else {
      ctx.rect(x, y, width, height);
    }
    this.applyFillStroke(shape.style);
  }

  private drawLine(shape: Shape): void {
    const { ctx } = this;
    const { x1, y1, x2, y2 } = shape.props as { x1: number; y1: number; x2: number; y2: number };
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = shape.style.stroke;
    ctx.lineWidth = shape.style.strokeWidth;
    ctx.stroke();
  }

  private drawTriangle(shape: Shape): void {
    const { ctx } = this;
    const { width, height } = shape.props as { width: number; height: number };
    const cx = shape.x;
    const cy = shape.y;
    ctx.beginPath();
    ctx.moveTo(cx, cy - height / 2);
    ctx.lineTo(cx - width / 2, cy + height / 2);
    ctx.lineTo(cx + width / 2, cy + height / 2);
    ctx.closePath();
    this.applyFillStroke(shape.style);
  }

  private drawEllipse(shape: Shape): void {
    const { ctx } = this;
    const { rx, ry } = shape.props as { rx: number; ry: number };
    ctx.beginPath();
    ctx.ellipse(shape.x, shape.y, rx, ry, 0, 0, Math.PI * 2);
    this.applyFillStroke(shape.style);
  }

  private drawPolygon(shape: Shape): void {
    const { ctx } = this;
    const { points } = shape.props as { points: Array<{ x: number; y: number }> };
    if (points.length < 3) return;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.closePath();
    this.applyFillStroke(shape.style);
  }

  private drawText(shape: Shape): void {
    const { ctx } = this;
    const { content, fontSize, fontFamily } = shape.props as { content: string; fontSize?: number; fontFamily?: number };
    ctx.font = `${fontSize ?? 16}px ${fontFamily ?? 'sans-serif'}`;
    ctx.fillStyle = shape.style.fill !== 'transparent' ? shape.style.fill : shape.style.stroke;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(content, shape.x, shape.y);
  }

  // ======================== 变换 ========================

  moveShape(id: string, dx: number, dy: number): boolean {
    const shape = this.resolveTarget(id);
    if (!shape) return false;
    shape.x += dx;
    shape.y += dy;
    if (shape.type === 'line') {
      const props = shape.props as { x1: number; y1: number; x2: number; y2: number };
      props.x1 += dx;
      props.y1 += dy;
      props.x2 += dx;
      props.y2 += dy;
    }
    this.saveHistory();
    this.redraw();
    return true;
  }

  scaleShape(id: string, factor: number): boolean {
    const shape = this.resolveTarget(id);
    if (!shape) return false;
    const props = shape.props;
    if ('radius' in props) (props as { radius: number }).radius *= factor;
    if ('width' in props) (props as { width: number }).width *= factor;
    if ('height' in props) (props as { height: number }).height *= factor;
    if ('rx' in props) (props as { rx: number }).rx *= factor;
    if ('ry' in props) (props as { ry: number }).ry *= factor;
    this.saveHistory();
    this.redraw();
    return true;
  }

  rotateShape(id: string, _angle: number): boolean {
    const shape = this.resolveTarget(id);
    if (!shape) return false;
    // Canvas 2D rotate is context-level; for simplicity, store angle in props
    shape.props.rotation = ((shape.props.rotation ?? 0) + _angle) % 360;
    this.saveHistory();
    this.redraw();
    return true;
  }

  // ======================== 样式 ========================

  setShapeColor(id: string, property: 'fill' | 'stroke' | 'both', color: string): void {
    for (const shape of this.resolveTargets(id)) {
      if (property === 'fill' || property === 'both') shape.style.fill = color;
      if (property === 'stroke' || property === 'both') shape.style.stroke = color;
    }
    this.saveHistory();
    this.redraw();
  }

  setShapeFill(id: string, filled: boolean, color?: string): void {
    for (const shape of this.resolveTargets(id)) {
      shape.style.fill = filled ? (color ?? shape.style.fill) : 'transparent';
    }
    this.saveHistory();
    this.redraw();
  }

  setShapeStrokeWidth(id: string, width: number): void {
    for (const shape of this.resolveTargets(id)) {
      shape.style.strokeWidth = width;
    }
    this.saveHistory();
    this.redraw();
  }

  setShapeOpacity(id: string, opacity: number): void {
    for (const shape of this.resolveTargets(id)) {
      shape.style.opacity = opacity;
    }
    this.saveHistory();
    this.redraw();
  }

  setShapeLineStyle(id: string, style: 'solid' | 'dashed' | 'dotted'): void {
    for (const shape of this.resolveTargets(id)) {
      shape.style.lineStyle = style;
    }
    this.saveHistory();
    this.redraw();
  }

  // ======================== Canvas 状态 ========================

  getWidth(): number {
    return this.width;
  }

  getHeight(): number {
    return this.height;
  }

  getShapeCount(): number {
    return this.shapes.length;
  }
}
