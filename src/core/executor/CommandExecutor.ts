import type { Shape } from '../../types/canvas';
import type { LLMResponse } from '../../types/llm';
import type {
  Command,
  CreateCircleParams,
  CreateRectParams,
  CreateLineParams,
  CreateTriangleParams,
  CreateEllipseParams,
  CreatePolygonParams,
  CreateTextParams,
  MoveParams,
  ScaleParams,
  RotateParams,
  DeleteShapeParams,
  SetColorParams,
  SetStrokeWidthParams,
  SetFillParams,
  SetLineStyleParams,
  SetOpacityParams,
  CanvasParams,
} from '../../types/commands';
import { CanvasEngine } from '../canvas/CanvasEngine';
import { ShapeFactory } from '../canvas/ShapeFactory';
import { TransformManager } from '../canvas/TransformManager';
import { useDrawingStore } from '../../store/drawingStore';

// ============================================================
// 回调接口
// ============================================================

/**
 * CommandExecutor 的回调钩子
 * 由 UI 层注入，用于处理需要用户交互的场景
 */
export interface CommandExecutorCallbacks {
  /**
   * 指令置信度低于 0.6 时触发
   * 返回 true 表示用户确认执行，false 表示跳过该指令
   * 未提供时默认跳过低置信度指令
   */
  onLowConfidence?: (command: Command) => Promise<boolean>;

  /**
   * LLM 发起澄清对话时触发
   * 此时 commands 不会被执行，调用方应朗读澄清问题并等待用户回复
   */
  onClarificationNeeded?: (question: string) => void;

  /**
   * 单条指令执行失败时触发
   * 不影响后续指令继续执行
   */
  onExecutionError?: (commandId: string, error: string) => void;

  /**
   * 语音反馈：每次执行完一轮 commands 后，将 responseText 传给 TTS 朗读
   */
  onFeedback?: (text: string) => void;
}

// ============================================================
// CommandExecutor
// ============================================================

/**
 * 指令执行器 —— AI-A 的核心调度模块
 *
 * 职责：
 * - 接收 LLMResponse，遍历 commands[] 逐条执行
 * - 将 command.action 分发到对应的 ShapeFactory / TransformManager / Store 操作
 * - 处理 targetId === 'last' 解析
 * - 处理 confidence < 0.6 确认流程
 * - 处理 needsClarification 暂停流程
 * - 单条失败时跳过，不中断后续指令
 * - 执行完毕后调用 CanvasEngine.redrawAll() 统一渲染
 */
export class CommandExecutor {
  private canvasEngine: CanvasEngine;
  private shapeFactory: ShapeFactory;
  private transformManager: TransformManager;

  constructor(canvasEngine: CanvasEngine, shapeFactory: ShapeFactory) {
    this.canvasEngine = canvasEngine;
    this.shapeFactory = shapeFactory;
    this.transformManager = new TransformManager();
  }

  // ============================================================
  // 主入口
  // ============================================================

  /**
   * 执行 LLMResponse 中的所有绘图指令
   *
   * @param response   AI-B 传来的 LLMResponse
   * @param callbacks  交互回调（低置信度确认 / 澄清 / 错误 / 语音反馈）
   */
  async execute(
    response: LLMResponse,
    callbacks?: CommandExecutorCallbacks,
  ): Promise<void> {
    // --- 澄清优先：暂停执行命令，朗读澄清问题 ---
    if (response.needsClarification && response.clarificationQuestion) {
      callbacks?.onClarificationNeeded?.(response.clarificationQuestion);
      callbacks?.onFeedback?.(response.clarificationQuestion);
      return;
    }

    // --- 语音反馈 ---
    if (response.responseText) {
      callbacks?.onFeedback?.(response.responseText);
    }

    // --- 遍历执行 ---
    for (const command of response.commands) {
      try {
        // 低置信度确认
        if (command.confidence < 0.6) {
          const confirmed = callbacks?.onLowConfidence
            ? await callbacks.onLowConfidence(command)
            : false; // 无回调时默认跳过
          if (!confirmed) continue;
        }

        this.dispatch(command);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : String(error);
        console.error(
          `[CommandExecutor] 指令执行失败 id=${command.id} action=${command.action}: ${message}`,
        );
        callbacks?.onExecutionError?.(command.id, message);
        // 继续执行后续指令
      }
    }

    // --- 执行完毕后统一重绘画布 ---
    const { shapes } = useDrawingStore.getState();
    this.canvasEngine.redrawAll(shapes);
  }

  // ============================================================
  // 指令分发
  // ============================================================

  private dispatch(command: Command): void {
    switch (command.action) {
      // ========== create ==========
      case 'create_circle':
        this.handleCreateCircle(command.params as CreateCircleParams);
        break;
      case 'create_rect':
        this.handleCreateRect(command.params as CreateRectParams);
        break;
      case 'create_line':
        this.handleCreateLine(command.params as CreateLineParams);
        break;
      case 'create_triangle':
        this.handleCreateTriangle(command.params as CreateTriangleParams);
        break;
      case 'create_ellipse':
        this.handleCreateEllipse(command.params as CreateEllipseParams);
        break;
      case 'create_polygon':
        this.handleCreatePolygon(command.params as CreatePolygonParams);
        break;
      case 'create_text':
        this.handleCreateText(command.params as CreateTextParams);
        break;

      // ========== transform ==========
      case 'move':
        this.handleMove(command.params as MoveParams);
        break;
      case 'scale':
        this.handleScale(command.params as ScaleParams);
        break;
      case 'rotate':
        this.handleRotate(command.params as RotateParams);
        break;

      // ========== delete ==========
      case 'delete_shape':
        this.handleDeleteShape(command.params as DeleteShapeParams);
        break;
      case 'delete_all':
        this.handleClearAll();
        break;

      // ========== style ==========
      case 'set_color':
        this.handleSetColor(command.params as SetColorParams);
        break;
      case 'set_stroke_width':
        this.handleSetStrokeWidth(command.params as SetStrokeWidthParams);
        break;
      case 'set_fill':
        this.handleSetFill(command.params as SetFillParams);
        break;
      case 'set_line_style':
        this.handleSetLineStyle(command.params as SetLineStyleParams);
        break;
      case 'set_opacity':
        this.handleSetOpacity(command.params as SetOpacityParams);
        break;

      // ========== canvas ==========
      case 'undo':
        useDrawingStore.getState().undo();
        break;
      case 'redo':
        useDrawingStore.getState().redo();
        break;
      case 'clear':
        this.handleClearAll();
        break;
      case 'save':
        this.handleSave(command.params as CanvasParams);
        break;

      // ========== 暂未实现（zoom_in / zoom_out / modify_*）==========
      case 'zoom_in':
      case 'zoom_out':
        console.warn(
          `[CommandExecutor] 画布缩放暂未实现: ${command.action}`,
        );
        break;
      case 'modify_position':
      case 'modify_size':
      case 'modify_props':
        console.warn(
          `[CommandExecutor] modify 类指令请使用 move/scale/rotate: ${command.action}`,
        );
        break;

      default:
        console.warn(
          `[CommandExecutor] 未知指令: ${(command as Command).action}`,
        );
    }
  }

  // ============================================================
  // create 处理器
  // ============================================================

  private handleCreateCircle(params: CreateCircleParams): void {
    const shape = this.shapeFactory.createCircle(params);
    useDrawingStore.getState().addShape(shape);
  }

  private handleCreateRect(params: CreateRectParams): void {
    const shape = this.shapeFactory.createRect(params);
    useDrawingStore.getState().addShape(shape);
  }

  private handleCreateLine(params: CreateLineParams): void {
    const shape = this.shapeFactory.createLine(params);
    useDrawingStore.getState().addShape(shape);
  }

  private handleCreateTriangle(params: CreateTriangleParams): void {
    const shape = this.shapeFactory.createTriangle(params);
    useDrawingStore.getState().addShape(shape);
  }

  private handleCreateEllipse(params: CreateEllipseParams): void {
    const shape = this.shapeFactory.createEllipse(params);
    useDrawingStore.getState().addShape(shape);
  }

  private handleCreatePolygon(params: CreatePolygonParams): void {
    const shape = this.shapeFactory.createPolygon(params);
    useDrawingStore.getState().addShape(shape);
  }

  private handleCreateText(params: CreateTextParams): void {
    const shape = this.shapeFactory.createText(params);
    useDrawingStore.getState().addShape(shape);
  }

  // ============================================================
  // transform 处理器
  // ============================================================

  private handleMove(params: MoveParams): void {
    const store = useDrawingStore.getState();
    const targetId = this.resolveTargetId(params.targetId, store.shapes);
    if (!targetId) return;

    const shape = store.shapes.find((s) => s.id === targetId);
    if (!shape) return;

    const moved = this.transformManager.moveShape(shape, params.dx, params.dy);
    store.updateShape(targetId, moved);
  }

  private handleScale(params: ScaleParams): void {
    const store = useDrawingStore.getState();
    const targetId = this.resolveTargetId(params.targetId, store.shapes);
    if (!targetId) return;

    const shape = store.shapes.find((s) => s.id === targetId);
    if (!shape) return;

    const scaled = this.transformManager.scaleShape(shape, params.factor);
    store.updateShape(targetId, scaled);
  }

  private handleRotate(params: RotateParams): void {
    const store = useDrawingStore.getState();
    const targetId = this.resolveTargetId(params.targetId, store.shapes);
    if (!targetId) return;

    const shape = store.shapes.find((s) => s.id === targetId);
    if (!shape) return;

    const rotated = this.transformManager.rotateShape(shape, params.angle);
    store.updateShape(targetId, rotated);
  }

  // ============================================================
  // delete 处理器
  // ============================================================

  private handleDeleteShape(params: DeleteShapeParams): void {
    const store = useDrawingStore.getState();
    const targetId = this.resolveTargetId(params.targetId, store.shapes);
    if (targetId) {
      store.removeShape(targetId);
    }
  }

  private handleClearAll(): void {
    useDrawingStore.getState().clearAll();
  }

  // ============================================================
  // style 处理器
  // ============================================================

  private handleSetColor(params: SetColorParams): void {
    const store = useDrawingStore.getState();
    const targets = this.resolveTargetIds(params.targetId, store.shapes);

    for (const id of targets) {
      const styleUpdate: Record<string, unknown> = {};

      if (params.property === 'fill' || params.property === 'both') {
        styleUpdate.fill = params.color;
      }
      if (params.property === 'stroke' || params.property === 'both') {
        styleUpdate.stroke = params.color;
      }

      store.updateShape(id, {
        style: styleUpdate as Partial<Shape['style']>,
      } as Partial<Shape>);
    }
  }

  private handleSetStrokeWidth(params: SetStrokeWidthParams): void {
    const store = useDrawingStore.getState();
    const targets = this.resolveTargetIds(params.targetId, store.shapes);

    for (const id of targets) {
      store.updateShape(id, {
        style: { strokeWidth: params.width },
      } as Partial<Shape>);
    }
  }

  private handleSetFill(params: SetFillParams): void {
    const store = useDrawingStore.getState();
    const targets = this.resolveTargetIds(params.targetId, store.shapes);

    for (const id of targets) {
      const shape = store.shapes.find((s) => s.id === id);
      const fillColor = params.filled
        ? (params.color ?? shape?.style.stroke ?? '#000000')
        : undefined;

      store.updateShape(id, {
        style: { fill: fillColor },
      } as Partial<Shape>);
    }
  }

  private handleSetLineStyle(params: SetLineStyleParams): void {
    const store = useDrawingStore.getState();
    const targets = this.resolveTargetIds(params.targetId, store.shapes);

    for (const id of targets) {
      store.updateShape(id, {
        style: { lineStyle: params.style },
      } as Partial<Shape>);
    }
  }

  private handleSetOpacity(params: SetOpacityParams): void {
    const store = useDrawingStore.getState();
    const targets = this.resolveTargetIds(params.targetId, store.shapes);

    for (const id of targets) {
      store.updateShape(id, {
        style: { opacity: params.opacity },
      } as Partial<Shape>);
    }
  }

  // ============================================================
  // canvas 处理器
  // ============================================================

  /** 保存画布为 PNG 并触发浏览器下载 */
  private handleSave(params: CanvasParams): void {
    const filename = params.filename ?? 'voice-drawing';
    const canvas = this.canvasEngine.getCanvas();
    const dataURL = canvas.toDataURL('image/png');

    const link = document.createElement('a');
    link.download = `${filename}.png`;
    link.href = dataURL;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // ============================================================
  // targetId 解析
  // ============================================================

  /**
   * 解析 targetId
   * - 'last' → shapes 数组最后一个图形的 id
   * - 其他字符串 → 原样返回
   * - shapes 为空且 targetId='last' → 返回 null
   */
  private resolveTargetId(
    targetId: string,
    shapes: Shape[],
  ): string | null {
    if (targetId === 'last') {
      return shapes.length > 0 ? shapes[shapes.length - 1].id : null;
    }
    return targetId;
  }

  /**
   * 解析 targetId（支持 'all'）
   * - 'all' → 所有图形的 id[]
   * - 'last' / 具体 id → 单元素数组
   */
  private resolveTargetIds(
    targetId: string,
    shapes: Shape[],
  ): string[] {
    if (targetId === 'all') {
      return shapes.map((s) => s.id);
    }
    const id = this.resolveTargetId(targetId, shapes);
    return id ? [id] : [];
  }
}
