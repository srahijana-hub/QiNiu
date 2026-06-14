import React, { useEffect, forwardRef } from 'react';
import { useCanvas } from '../hooks/useCanvas';

// ============================================================
// Canvas 组件
// ============================================================

export interface CanvasProps {
  /**
   * 可选的外部 ref —— 当父组件需要共享 canvas 元素（如 App 层创建
   * CommandExecutor 时需要拿到 CanvasEngine）时传入。
   * 不传则组件内部自管 ref。
   */
  canvasRef?: React.RefObject<HTMLCanvasElement | null>;
}

/**
 * AI 语音绘图工具的画布组件
 *
 * - 渲染 HTML5 canvas 元素
 * - 内部分辨率 1200×800，CSS 自适应父容器
 * - 自动管理 CanvasEngine 生命周期
 * - 支持 forwardRef 暴露 canvas DOM 给外部
 *
 * 使用方式：
 * ```tsx
 * // 普通使用（自管 ref）
 * const { canvasRef, engine } = useCanvas()
 * <Canvas canvasRef={canvasRef} />
 * ```
 */
export const Canvas = forwardRef<HTMLCanvasElement, CanvasProps>(
  function Canvas({ canvasRef: externalRef }, ref) {
    const { canvasRef } = useCanvas(externalRef);

    // ========== 同步 forwarded ref ==========
    useEffect(() => {
      if (!ref) return;

      const current = canvasRef.current;
      if (typeof ref === 'function') {
        ref(current);
      } else {
        ref.current = current;
      }
    });

    // ========== 渲染 ==========
    return (
      <canvas
        ref={canvasRef}
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
          imageRendering: 'auto',
        }}
        data-testid="voice-drawing-canvas"
      />
    );
  },
);

Canvas.displayName = 'Canvas';
