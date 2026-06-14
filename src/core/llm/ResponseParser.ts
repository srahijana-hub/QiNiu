import type { Command, CommandAction } from '../../types/commands';
import type { LLMResponse } from '../../types/llm';

const VALID_ACTIONS: ReadonlySet<string> = new Set<CommandAction>([
  'create_circle', 'create_rect', 'create_line', 'create_triangle',
  'create_ellipse', 'create_polygon', 'create_text',
  'modify_position', 'modify_size', 'modify_props',
  'delete_shape', 'delete_all',
  'move', 'scale', 'rotate',
  'set_color', 'set_stroke_width', 'set_fill', 'set_line_style', 'set_opacity',
  'undo', 'redo', 'clear', 'zoom_in', 'zoom_out', 'save',
]);

export class ResponseParser {
  parse(rawJson: string): LLMResponse {
    let parsed: unknown;
    try {
      parsed = JSON.parse(rawJson);
    } catch {
      throw new Error('Invalid JSON');
    }

    if (!this.validate(parsed)) {
      throw new Error('Invalid LLM response structure');
    }

    return this.normalize(parsed);
  }

  validate(response: unknown): boolean {
    if (typeof response !== 'object' || response === null) return false;

    const obj = response as Record<string, unknown>;

    if (!Array.isArray(obj.commands)) return false;

    for (const cmd of obj.commands) {
      if (typeof cmd !== 'object' || cmd === null) return false;
      const c = cmd as Record<string, unknown>;
      if (typeof c.action !== 'string') return false;
      if (typeof c.params !== 'object' || c.params === null) return false;
      if (!VALID_ACTIONS.has(c.action)) return false;
    }

    if (obj.responseText !== undefined && typeof obj.responseText !== 'string') return false;
    if (obj.confidence !== undefined && (typeof obj.confidence !== 'number' || obj.confidence < 0 || obj.confidence > 1)) return false;
    if (obj.needsClarification !== undefined && typeof obj.needsClarification !== 'boolean') return false;

    return true;
  }

  normalize(response: Record<string, unknown>): LLMResponse {
    const rawCommands = response.commands as Array<Record<string, unknown>>;

    const commands: Command[] = rawCommands.map((cmd, i) => ({
      id: (cmd.id as string) ?? `cmd_${Date.now()}_${i}`,
      category: (cmd.category as Command['category']) ?? this.inferCategory(cmd.action as string),
      action: cmd.action as CommandAction,
      params: this.normalizeParams(cmd.params as Record<string, unknown>),
      confidence: (cmd.confidence as number) ?? 0.8,
    }));

    return {
      commands,
      responseText: (response.responseText as string) ?? '好的',
      confidence: (response.confidence as number) ?? 0.8,
      needsClarification: (response.needsClarification as boolean) ?? false,
      rawTranscript: (response.rawTranscript as string) ?? '',
    };
  }

  private normalizeParams(params: Record<string, unknown>): Record<string, unknown> {
    if (!params || typeof params !== 'object') return params;
    const p = { ...params };
    if ('color' in p && !('fill' in p)) {
      p.fill = p.color;
      delete p.color;
    }
    return p;
  }

  private inferCategory(action: string): Command['category'] {
    if (action.startsWith('create_')) return 'create';
    if (action.startsWith('modify_')) return 'modify';
    if (action.startsWith('delete_')) return 'delete';
    if (['move', 'scale', 'rotate'].includes(action)) return 'transform';
    if (action.startsWith('set_')) return 'style';
    return 'canvas';
  }
}
