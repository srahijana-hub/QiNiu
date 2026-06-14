import type { Command, CommandParams } from '../../types/commands';
import type { Shape, ShapeStyle } from '../../types/canvas';
import { Canvas } from '../canvas/Canvas';

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

export class CommandExecutor {
  private canvas: Canvas;

  constructor(canvas: Canvas) {
    this.canvas = canvas;
  }

  execute(command: Command): { success: boolean; message: string } {
    try {
      switch (command.category) {
        case 'create':
          return this.handleCreate(command);
        case 'modify':
          return this.handleModify(command);
        case 'delete':
          return this.handleDelete(command);
        case 'transform':
          return this.handleTransform(command);
        case 'style':
          return this.handleStyle(command);
        case 'canvas':
          return this.handleCanvas(command);
        default:
          return { success: false, message: `未知命令类别: ${command.category}` };
      }
    } catch (err) {
      return { success: false, message: `执行失败: ${err instanceof Error ? err.message : err}` };
    }
  }

  executeAll(commands: Command[]): { success: boolean; message: string }[] {
    return commands.map((cmd) => this.execute(cmd));
  }

  // ======================== create ========================

  private handleCreate(command: Command): { success: boolean; message: string } {
    const p = command.params as Record<string, unknown>;
    const cx = this.canvas.getWidth() / 2;
    const cy = this.canvas.getHeight() / 2;

    let shape: Shape;

    switch (command.action) {
      case 'create_circle': {
        const x = p.x === 'center' ? cx : (p.x as number) ?? cx;
        const y = p.y === 'center' ? cy : (p.y as number) ?? cy;
        shape = {
          id: genId(), type: 'circle', x, y,
          props: { radius: (p.radius as number) ?? 50 },
          style: this.buildStyle(p),
          createdAt: Date.now(),
        };
        break;
      }
      case 'create_rect': {
        const x = p.x === 'center' ? cx : (p.x as number) ?? cx;
        const y = p.y === 'center' ? cy : (p.y as number) ?? cy;
        shape = {
          id: genId(), type: 'rect', x, y,
          props: { width: (p.width as number) ?? 100, height: (p.height as number) ?? 100, borderRadius: p.borderRadius as number | undefined },
          style: this.buildStyle(p),
          createdAt: Date.now(),
        };
        break;
      }
      case 'create_line': {
        shape = {
          id: genId(), type: 'line', x: (p.x1 as number) ?? 0, y: (p.y1 as number) ?? 0,
          props: { x1: (p.x1 as number) ?? 0, y1: (p.y1 as number) ?? 0, x2: (p.x2 as number) ?? 100, y2: (p.y2 as number) ?? 100 },
          style: { ...this.buildStyle(p), fill: 'transparent' },
          createdAt: Date.now(),
        };
        break;
      }
      case 'create_triangle': {
        const x = p.x === 'center' ? cx : (p.x as number) ?? cx;
        const y = p.y === 'center' ? cy : (p.y as number) ?? cy;
        shape = {
          id: genId(), type: 'triangle', x, y,
          props: { width: (p.width as number) ?? 100, height: (p.height as number) ?? 100 },
          style: this.buildStyle(p),
          createdAt: Date.now(),
        };
        break;
      }
      case 'create_ellipse': {
        const x = p.x === 'center' ? cx : (p.x as number) ?? cx;
        const y = p.y === 'center' ? cy : (p.y as number) ?? cy;
        shape = {
          id: genId(), type: 'ellipse', x, y,
          props: { rx: (p.rx as number) ?? 60, ry: (p.ry as number) ?? 40 },
          style: this.buildStyle(p),
          createdAt: Date.now(),
        };
        break;
      }
      case 'create_polygon': {
        const points = (p.points as Array<{ x: number; y: number }>) ?? [];
        const avgX = points.reduce((s, pt) => s + pt.x, 0) / (points.length || 1);
        const avgY = points.reduce((s, pt) => s + pt.y, 0) / (points.length || 1);
        shape = {
          id: genId(), type: 'polygon', x: avgX, y: avgY,
          props: { points },
          style: this.buildStyle(p),
          createdAt: Date.now(),
        };
        break;
      }
      case 'create_text': {
        const x = p.x === 'center' ? cx : (p.x as number) ?? cx;
        const y = p.y === 'center' ? cy : (p.y as number) ?? cy;
        shape = {
          id: genId(), type: 'text', x, y,
          props: { content: (p.content as string) ?? '', fontSize: p.fontSize as number | undefined, fontFamily: p.fontFamily as string | undefined },
          style: { ...this.buildStyle(p), fill: (p.fill as string) ?? '#000000' },
          createdAt: Date.now(),
        };
        break;
      }
      default:
        return { success: false, message: `未知创建动作: ${command.action}` };
    }

    this.canvas.addShape(shape);
    return { success: true, message: `已创建 ${shape.type}` };
  }

  private buildStyle(p: Record<string, unknown>): ShapeStyle {
    return {
      fill: (p.fill as string) ?? DEFAULT_STYLE.fill,
      stroke: (p.stroke as string) ?? DEFAULT_STYLE.stroke,
      strokeWidth: (p.strokeWidth as number) ?? DEFAULT_STYLE.strokeWidth,
      lineStyle: DEFAULT_STYLE.lineStyle,
      opacity: (p.opacity as number) ?? DEFAULT_STYLE.opacity,
    };
  }

  // ======================== delete ========================

  private handleDelete(command: Command): { success: boolean; message: string } {
    const p = command.params as Record<string, unknown>;
    if (command.action === 'delete_all') {
      this.canvas.clear();
      return { success: true, message: '已清空画布' };
    }
    const targetId = (p.targetId as string) ?? 'last';
    if (this.canvas.deleteShape(targetId)) {
      return { success: true, message: '已删除图形' };
    }
    return { success: false, message: '未找到目标图形' };
  }

  // ======================== transform ========================

  private handleTransform(command: Command): { success: boolean; message: string } {
    const p = command.params as Record<string, unknown>;
    const targetId = (p.targetId as string) ?? 'last';

    switch (command.action) {
      case 'move': {
        const dx = (p.dx as number) ?? 0;
        const dy = (p.dy as number) ?? 0;
        if (this.canvas.moveShape(targetId, dx, dy)) return { success: true, message: `已移动 (${dx}, ${dy})` };
        return { success: false, message: '移动失败，未找到目标' };
      }
      case 'scale': {
        const factor = (p.factor as number) ?? 1;
        if (this.canvas.scaleShape(targetId, factor)) return { success: true, message: `已缩放 ${factor}x` };
        return { success: false, message: '缩放失败，未找到目标' };
      }
      case 'rotate': {
        const angle = (p.angle as number) ?? 0;
        if (this.canvas.rotateShape(targetId, angle)) return { success: true, message: `已旋转 ${angle}°` };
        return { success: false, message: '旋转失败，未找到目标' };
      }
      default:
        return { success: false, message: `未知变换动作: ${command.action}` };
    }
  }

  // ======================== modify ========================

  private handleModify(command: Command): { success: boolean; message: string } {
    const p = command.params as Record<string, unknown>;
    const targetId = (p.targetId as string) ?? 'last';

    switch (command.action) {
      case 'modify_position': {
        const x = p.x as number;
        const y = p.y as number;
        const shape = this.canvas.resolveTarget(targetId);
        if (!shape) return { success: false, message: '未找到目标图形' };
        const dx = x - shape.x;
        const dy = y - shape.y;
        this.canvas.moveShape(targetId, dx, dy);
        return { success: true, message: `已移动到 (${x}, ${y})` };
      }
      case 'modify_size': {
        const factor = (p.factor as number) ?? 1;
        this.canvas.scaleShape(targetId, factor);
        return { success: true, message: `已调整大小` };
      }
      case 'modify_props': {
        const shape = this.canvas.resolveTarget(targetId);
        if (!shape) return { success: false, message: '未找到目标图形' };
        Object.assign(shape.props, p.props ?? {});
        return { success: true, message: '已修改属性' };
      }
      default:
        return { success: false, message: `未知修改动作: ${command.action}` };
    }
  }

  // ======================== style ========================

  private handleStyle(command: Command): { success: boolean; message: string } {
    const p = command.params as Record<string, unknown>;
    const targetId = (p.targetId as string) ?? 'last';

    switch (command.action) {
      case 'set_color': {
        this.canvas.setShapeColor(targetId, (p.property as 'fill' | 'stroke' | 'both') ?? 'both', (p.color as string) ?? '#000000');
        return { success: true, message: `已设置颜色 ${(p.color as string) ?? ''}` };
      }
      case 'set_fill': {
        this.canvas.setShapeFill(targetId, (p.filled as boolean) ?? true, p.color as string | undefined);
        return { success: true, message: '已设置填充' };
      }
      case 'set_stroke_width': {
        this.canvas.setShapeStrokeWidth(targetId, (p.width as number) ?? 2);
        return { success: true, message: `已设置线宽 ${(p.width as number) ?? 2}` };
      }
      case 'set_opacity': {
        this.canvas.setShapeOpacity(targetId, (p.opacity as number) ?? 1);
        return { success: true, message: `已设置透明度` };
      }
      case 'set_line_style': {
        this.canvas.setShapeLineStyle(targetId, (p.style as 'solid' | 'dashed' | 'dotted') ?? 'solid');
        return { success: true, message: `已设置线型` };
      }
      default:
        return { success: false, message: `未知样式动作: ${command.action}` };
    }
  }

  // ======================== canvas ========================

  private handleCanvas(command: Command): { success: boolean; message: string } {
    switch (command.action) {
      case 'undo':
        return this.canvas.undo()
          ? { success: true, message: '已撤销' }
          : { success: false, message: '没有可撤销的操作' };
      case 'redo':
        return this.canvas.redo()
          ? { success: true, message: '已重做' }
          : { success: false, message: '没有可重做的操作' };
      case 'clear':
        this.canvas.clear();
        return { success: true, message: '已清空画布' };
      case 'zoom_in':
      case 'zoom_out':
      case 'save':
        return { success: true, message: `${command.action} 暂未实现` };
      default:
        return { success: false, message: `未知画布动作: ${command.action}` };
    }
  }
}
