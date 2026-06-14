import type { Shape } from '../../types/canvas';

// ============================================================
// TransformManager
// ============================================================

/**
 * 图形变换管理器 —— 对 Shape 执行移动、缩放、旋转
 *
 * 所有方法均为纯函数：返回新 Shape，不修改原始对象。
 * 调用方负责将返回的新 Shape 写入 Zustand Store。
 */
export class TransformManager {
  // ============================================================
  // 移动
  // ============================================================

  /**
   * 平移图形
   * - 所有图形：x/y 增加 dx/dy
   * - line：同时移动 x1/y1/x2/y2 端点
   * - polygon：同时移动每个顶点
   * - 返回新 Shape
   */
  moveShape(shape: Shape, dx: number, dy: number): Shape {
    const moved: Shape = {
      ...shape,
      x: shape.x + dx,
      y: shape.y + dy,
      props: { ...shape.props },
    };

    switch (shape.type) {
      case 'line': {
        moved.props.x1 = (shape.props.x1 as number) + dx;
        moved.props.y1 = (shape.props.y1 as number) + dy;
        moved.props.x2 = (shape.props.x2 as number) + dx;
        moved.props.y2 = (shape.props.y2 as number) + dy;
        break;
      }
      case 'polygon': {
        const points = shape.props.points as Array<{ x: number; y: number }> | undefined;
        if (points) {
          moved.props.points = points.map((p) => ({
            x: p.x + dx,
            y: p.y + dy,
          }));
        }
        break;
      }
      // circle / rect / triangle / ellipse / text：仅 x/y 移动即可
    }

    return moved;
  }

  // ============================================================
  // 缩放
  // ============================================================

  /**
   * 缩放图形尺寸
   * - circle：radius 乘以 factor，圆心不变
   * - rect：width / height（及 borderRadius）乘以 factor，左上角不变
   * - triangle：width / height 乘以 factor，左上角不变
   * - ellipse：rx / ry 乘以 factor，中心不变
   * - line：以中点为基准缩放两端点
   * - polygon：以几何中心为基准缩放各顶点
   * - text：fontSize 乘以 factor
   * - 返回新 Shape
   */
  scaleShape(shape: Shape, factor: number): Shape {
    const scaled: Shape = {
      ...shape,
      props: { ...shape.props },
    };

    switch (shape.type) {
      case 'circle':
        scaled.props.radius = (shape.props.radius as number) * factor;
        break;

      case 'rect':
        scaled.props.width = (shape.props.width as number) * factor;
        scaled.props.height = (shape.props.height as number) * factor;
        if (shape.props.borderRadius != null) {
          scaled.props.borderRadius = (shape.props.borderRadius as number) * factor;
        }
        break;

      case 'triangle':
        scaled.props.width = (shape.props.width as number) * factor;
        scaled.props.height = (shape.props.height as number) * factor;
        break;

      case 'ellipse':
        scaled.props.rx = (shape.props.rx as number) * factor;
        scaled.props.ry = (shape.props.ry as number) * factor;
        break;

      case 'line': {
        // 以中点 (shape.x, shape.y) 为基准缩放
        const cx = shape.x;
        const cy = shape.y;
        scaled.props.x1 = cx + ((shape.props.x1 as number) - cx) * factor;
        scaled.props.y1 = cy + ((shape.props.y1 as number) - cy) * factor;
        scaled.props.x2 = cx + ((shape.props.x2 as number) - cx) * factor;
        scaled.props.y2 = cy + ((shape.props.y2 as number) - cy) * factor;
        break;
      }

      case 'polygon': {
        const points = shape.props.points as Array<{ x: number; y: number }> | undefined;
        if (points && points.length > 0) {
          const cx = shape.x;
          const cy = shape.y;
          scaled.props.points = points.map((p) => ({
            x: cx + (p.x - cx) * factor,
            y: cy + (p.y - cy) * factor,
          }));
        }
        break;
      }

      case 'text':
        scaled.props.fontSize = Math.max(
          1,
          ((shape.props.fontSize ?? 16) as number) * factor,
        );
        break;
    }

    return scaled;
  }

  // ============================================================
  // 旋转
  // ============================================================

  /**
   * 旋转图形
   * - 在 props.rotation 中累加旋转角度（度）
   * - 正数顺时针，负数逆时针
   * - 返回新 Shape
   */
  rotateShape(shape: Shape, angle: number): Shape {
    const currentRotation = (shape.props.rotation as number) ?? 0;

    return {
      ...shape,
      props: {
        ...shape.props,
        rotation: currentRotation + angle,
      },
    };
  }
}
