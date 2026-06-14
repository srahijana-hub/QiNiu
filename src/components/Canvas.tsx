import { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';

const DEFAULT_W = 1200;
const DEFAULT_H = 800;

export interface CanvasHandle {
  canvas: HTMLCanvasElement | null;
}

export const Canvas = forwardRef<CanvasHandle>((_, ref) => {
  const canvasElRef = useRef<HTMLCanvasElement | null>(null);

  useImperativeHandle(ref, () => ({
    canvas: canvasElRef.current,
  }));

  useEffect(() => {
    const el = canvasElRef.current;
    if (!el) return;
    el.width = DEFAULT_W;
    el.height = DEFAULT_H;
    const ctx = el.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, DEFAULT_W, DEFAULT_H);
    }
  }, []);

  return (
    <canvas
      ref={canvasElRef}
      className="drawing-canvas"
      style={{ display: 'block', width: '100%', height: '100%' }}
    />
  );
});

Canvas.displayName = 'Canvas';
