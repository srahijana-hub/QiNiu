import { create } from 'zustand';
import type { Shape, CanvasState, HistoryEntry } from '../types/canvas';

// ============================================================
// 默认值（与需求文档对齐）
// ============================================================

const DEFAULT_CANVAS_WIDTH = 1200;
const DEFAULT_CANVAS_HEIGHT = 800;

const DEFAULT_STYLE = {
  fill: '',
  stroke: '#000000',
  strokeWidth: 2,
} as const;

// ============================================================
// 辅助函数
// ============================================================

/** 颜色名到中文的映射（只覆盖常见颜色，其余原样返回） */
const COLOR_NAME_MAP: Record<string, string> = {
  '#FF0000': '红', '#ff0000': '红',
  '#0000FF': '蓝', '#0000ff': '蓝',
  '#00FF00': '绿', '#00ff00': '绿',
  '#FFFF00': '黄', '#ffff00': '黄',
  '#000000': '黑', '#000000': '黑',
  '#FFFFFF': '白', '#ffffff': '白',
  '#800080': '紫', '#FFA500': '橙',
  '#FFC0CB': '粉', '#808080': '灰',
};

function getColorName(hex: string): string {
  return COLOR_NAME_MAP[hex] || hex;
}

/** 生成图形的中文描述，用于注入 LLM 的 CanvasState */
function buildShapeDescription(shape: Shape): string {
  const typeMap: Record<string, string> = {
    circle: '圆形',
    rect: '矩形',
    line: '线段',
    triangle: '三角形',
    ellipse: '椭圆',
    polygon: '多边形',
    text: '文字',
  };

  const typeName = typeMap[shape.type] || shape.type;
  const colorPrefix = shape.style.fill ? `${getColorName(shape.style.fill)}色` : '';
  const posStr = `位于(${Math.round(shape.x)},${Math.round(shape.y)})`;

  let sizeStr = '';
  switch (shape.type) {
    case 'circle':
      sizeStr = `半径${shape.props.radius ?? '?'}`;
      break;
    case 'rect':
      sizeStr = `宽${shape.props.width ?? '?'}高${shape.props.height ?? '?'}`;
      if (shape.props.borderRadius) sizeStr += `，圆角${shape.props.borderRadius}`;
      break;
    case 'line':
      return `${getColorName(shape.style.stroke)}色线段，从(${Math.round(shape.props.x1 as number ?? 0)},${Math.round(shape.props.y1 as number ?? 0)})到(${Math.round(shape.props.x2 as number ?? 0)},${Math.round(shape.props.y2 as number ?? 0)})`.replace(/undefined/g, '?');
    case 'triangle':
      sizeStr = `底${shape.props.width ?? '?'}高${shape.props.height ?? '?'}`;
      break;
    case 'ellipse':
      sizeStr = `x半径${shape.props.rx ?? '?'}，y半径${shape.props.ry ?? '?'}`;
      break;
    case 'polygon': {
      const count = Array.isArray(shape.props.points) ? shape.props.points.length : 0;
      sizeStr = `${count}个顶点`;
      break;
    }
    case 'text':
      sizeStr = `内容"${String(shape.props.content ?? '')}"，字号${shape.props.fontSize ?? 16}`;
      break;
  }

  return [colorPrefix + typeName, sizeStr, posStr].filter(Boolean).join('，');
}

// ============================================================
// Drawing Store
// ============================================================

interface DrawingState {
  // --- 状态 ---
  shapes: Shape[];
  selectedShapeId: string | null;
  currentStyle: { fill: string; stroke: string; strokeWidth: number };
  history: HistoryEntry[];
  historyIndex: number;

  // --- Actions ---
  addShape: (shape: Shape) => void;
  removeShape: (id: string) => void;
  updateShape: (id: string, updates: Partial<Shape>) => void;
  selectShape: (id: string | null) => void;
  undo: () => void;
  redo: () => void;
  clearAll: () => void;
  getCanvasState: () => CanvasState;
}

export const useDrawingStore = create<DrawingState>()((set, get) => ({
  // ========== 初始状态 ==========
  shapes: [],
  selectedShapeId: null,
  currentStyle: { ...DEFAULT_STYLE },
  history: [{ shapes: [], timestamp: Date.now() }],
  historyIndex: 0,

  // ========== Actions ==========

  /**
   * 添加图形到画布
   * - 图形追加到 shapes 末尾
   * - 自动记录历史快照
   * - 丢弃 undo 之后的"未来"历史
   */
  addShape: (shape: Shape) => {
    set((state) => {
      const newShapes = [...state.shapes, shape];
      const newHistory = state.history.slice(0, state.historyIndex + 1);
      newHistory.push({ shapes: newShapes, timestamp: Date.now() });

      return {
        shapes: newShapes,
        history: newHistory,
        historyIndex: newHistory.length - 1,
      };
    });
  },

  /**
   * 根据 ID 删除图形
   * - 图形不存在时静默忽略（不影响画布）
   * - 自动记录历史快照
   */
  removeShape: (id: string) => {
    set((state) => {
      const newShapes = state.shapes.filter((s) => s.id !== id);
      // 图形不存在，跳过
      if (newShapes.length === state.shapes.length) return state;

      const newHistory = state.history.slice(0, state.historyIndex + 1);
      newHistory.push({ shapes: newShapes, timestamp: Date.now() });

      return {
        shapes: newShapes,
        selectedShapeId: state.selectedShapeId === id ? null : state.selectedShapeId,
        history: newHistory,
        historyIndex: newHistory.length - 1,
      };
    });
  },

  /**
   * 更新图形属性
   * - style 和 props 采用浅合并（保留未指定的字段）
   * - 其余顶层字段直接覆盖
   * - 图形不存在时静默忽略
   */
  updateShape: (id: string, updates: Partial<Shape>) => {
    set((state) => {
      const found = state.shapes.some((s) => s.id === id);
      if (!found) return state;

      const newShapes = state.shapes.map((s) => {
        if (s.id !== id) return s;

        const merged: Shape = {
          ...s,
          ...updates,
        };

        // 浅合并 style（防止调用方只传 style.stroke 时把整个 style 替换掉）
        if (updates.style) {
          merged.style = { ...s.style, ...updates.style };
        }

        // 浅合并 props
        if (updates.props) {
          merged.props = { ...s.props, ...updates.props };
        }

        return merged;
      });

      const newHistory = state.history.slice(0, state.historyIndex + 1);
      newHistory.push({ shapes: newShapes, timestamp: Date.now() });

      return {
        shapes: newShapes,
        history: newHistory,
        historyIndex: newHistory.length - 1,
      };
    });
  },

  /**
   * 选中 / 取消选中图形
   * - 传 null 取消选中
   * - 传入不存在的 ID 时静默忽略（保持原选中状态）
   */
  selectShape: (id: string | null) => {
    set((state) => {
      if (id !== null && !state.shapes.some((s) => s.id === id)) {
        return state;
      }
      return { selectedShapeId: id };
    });
  },

  /**
   * 撤销到上一个历史状态
   * - 已在最初状态时（historyIndex === 0）不执行任何操作
   * - 撤销时清除选中状态
   */
  undo: () => {
    set((state) => {
      if (state.historyIndex <= 0) return state;

      const newIndex = state.historyIndex - 1;
      return {
        shapes: state.history[newIndex].shapes,
        historyIndex: newIndex,
        selectedShapeId: null,
      };
    });
  },

  /**
   * 重做到下一个历史状态
   * - 已在最新状态时（historyIndex === history.length - 1）不执行任何操作
   */
  redo: () => {
    set((state) => {
      if (state.historyIndex >= state.history.length - 1) return state;

      const newIndex = state.historyIndex + 1;
      return {
        shapes: state.history[newIndex].shapes,
        historyIndex: newIndex,
        selectedShapeId: null,
      };
    });
  },

  /**
   * 清除所有图形
   * - 高风险操作，调用方应在 UI 层做确认
   * - 记录历史以支持撤销恢复
   * - 重置选中状态
   */
  clearAll: () => {
    set((state) => {
      if (state.shapes.length === 0) return state;

      const newHistory = state.history.slice(0, state.historyIndex + 1);
      newHistory.push({ shapes: [], timestamp: Date.now() });

      return {
        shapes: [],
        selectedShapeId: null,
        history: newHistory,
        historyIndex: newHistory.length - 1,
      };
    });
  },

  /**
   * 返回当前 CanvasState
   * - 供 AI-B 调用，将画布状态注入 LLM 的 Prompt 上下文
   * - 这是一个纯读取操作，不会修改状态
   */
  getCanvasState: (): CanvasState => {
    const state = get();

    return {
      width: DEFAULT_CANVAS_WIDTH,
      height: DEFAULT_CANVAS_HEIGHT,
      shapes: state.shapes.map((s) => ({
        id: s.id,
        type: s.type,
        description: buildShapeDescription(s),
      })),
      selectedShapeId: state.selectedShapeId,
      currentStyle: { ...state.currentStyle },
      totalShapes: state.shapes.length,
    };
  },
}));
