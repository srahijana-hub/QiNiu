import type { LLMResponse } from '../../types/llm';

const COLOR_MAP: Record<string, string> = {
  红: '#FF0000', 蓝: '#0000FF', 绿: '#00FF00',
  黄: '#FFFF00', 黑: '#000000', 白: '#FFFFFF',
  紫: '#800080', 橙: '#FFA500', 粉: '#FFC0CB', 灰: '#808080',
};

export class RuleEngine {
  parse(rawText: string): LLMResponse {
    const text = rawText.trim();

    if (/撤销|回退|上一步/.test(text)) {
      return this.makeResponse([{ action: 'undo', params: {} }], '好的，已撤销', 0.9, text);
    }
    if (/重做|恢复/.test(text)) {
      return this.makeResponse([{ action: 'redo', params: {} }], '好的，已重做', 0.9, text);
    }
    if (/清除|清空|全部删除/.test(text)) {
      return this.makeResponse([{ action: 'clear', params: {} }], '确定要清除画布吗？', 0.8, text);
    }
    if (/保存|导出/.test(text)) {
      return this.makeResponse([{ action: 'save', params: {} }], '好的，已保存', 0.9, text);
    }

    const color = this.extractColor(text);
    const shapeMatch = text.match(/画一个?(.*)/);
    if (shapeMatch) {
      const shape = shapeMatch[1];
      if (/圆|原/.test(shape)) {
        const params: Record<string, unknown> = { x: 'center', y: 'center', radius: 50 };
        if (color) params.fill = color;
        return this.makeResponse([{ action: 'create_circle', params }], `好的，${text}`, 0.8, text);
      }
      if (/矩形|长方形|方形/.test(shape)) {
        const params: Record<string, unknown> = { x: 'center', y: 'center', width: 100, height: 100 };
        if (color) params.fill = color;
        return this.makeResponse([{ action: 'create_rect', params }], `好的，${text}`, 0.8, text);
      }
      if (/线|直线/.test(shape)) {
        return this.makeResponse(
          [{ action: 'create_line', params: { x1: 100, y1: 100, x2: 500, y2: 500, stroke: color ?? '#000000' } }],
          `好的，${text}`, 0.7, text,
        );
      }
      if (/三角/.test(shape)) {
        const params: Record<string, unknown> = { x: 'center', y: 'center', width: 100, height: 100 };
        if (color) params.fill = color;
        return this.makeResponse([{ action: 'create_triangle', params }], `好的，${text}`, 0.8, text);
      }
      if (/椭圆/.test(shape)) {
        const params: Record<string, unknown> = { x: 'center', y: 'center', rx: 60, ry: 40 };
        if (color) params.fill = color;
        return this.makeResponse([{ action: 'create_ellipse', params }], `好的，${text}`, 0.8, text);
      }
    }

    return this.makeResponse([], '没听清，请再说一遍', 0, text);
  }

  private extractColor(text: string): string | null {
    for (const [name, hex] of Object.entries(COLOR_MAP)) {
      if (text.includes(name)) return hex;
    }
    return null;
  }

  private makeResponse(
    commands: Array<{ action: string; params: Record<string, unknown> }>,
    responseText: string,
    confidence: number,
    rawTranscript: string,
  ): LLMResponse {
    return {
      commands: commands.map((c, i) => ({
        id: `cmd_${Date.now()}_${i}`,
        category: this.inferCategory(c.action),
        action: c.action as LLMResponse['commands'][number]['action'],
        params: c.params as LLMResponse['commands'][number]['params'],
        confidence,
      })),
      responseText,
      confidence,
      needsClarification: confidence < 0.6,
      rawTranscript,
    };
  }

  private inferCategory(action: string): 'create' | 'modify' | 'delete' | 'transform' | 'style' | 'canvas' {
    if (action.startsWith('create_')) return 'create';
    if (action.startsWith('delete_')) return 'delete';
    if (['move', 'scale', 'rotate'].includes(action)) return 'transform';
    if (action.startsWith('set_')) return 'style';
    if (['undo', 'redo', 'clear', 'zoom_in', 'zoom_out', 'save'].includes(action)) return 'canvas';
    return 'modify';
  }
}
