import type { CanvasState } from '../../types/canvas';
import type { LLMResponse } from '../../types/llm';
import { PromptBuilder } from './PromptBuilder';
import { ConversationManager } from './ConversationManager';
import { RuleEngine } from '../nlu';

export class LLMService {
  private apiKey: string;
  private apiUrl: string;
  private model: string;
  private promptBuilder: PromptBuilder;
  private conversationManager: ConversationManager;
  private ruleEngine: RuleEngine;

  constructor(apiKey: string, apiUrl: string, model: string) {
    this.apiKey = apiKey;
    this.apiUrl = apiUrl;
    this.model = model;
    this.promptBuilder = new PromptBuilder();
    this.conversationManager = new ConversationManager();
    this.ruleEngine = new RuleEngine();
  }

  async parseCommand(rawText: string, canvasState: CanvasState): Promise<LLMResponse> {
    const systemPrompt = this.promptBuilder.buildSystemPrompt();
    const history = this.conversationManager.getRecentHistory(5);
    const userPrompt = this.promptBuilder.buildUserPrompt(rawText, canvasState, history);

    this.conversationManager.addMessage('user', rawText);

    try {
      const result = await this.callLLM(systemPrompt, userPrompt);
      this.conversationManager.addMessage('assistant', result.responseText);
      return result;
    } catch (err) {
      console.warn('[LLM] first attempt failed:', err instanceof Error ? err.message : err);
      try {
        console.log('[LLM] retrying...');
        const result = await this.callLLM(systemPrompt, userPrompt);
        this.conversationManager.addMessage('assistant', result.responseText);
        return result;
      } catch (err2) {
        console.warn('[LLM] retry also failed:', err2 instanceof Error ? err2.message : err2);
        return this.fallback(rawText);
      }
    }
  }

  private async callLLM(systemPrompt: string, userPrompt: string): Promise<LLMResponse> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60_000);

    try {
      console.log('[LLM] sending request...');
      const res = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: 1024,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
        }),
        signal: controller.signal,
      });

      console.log('[LLM] response status:', res.status);
      if (!res.ok) {
        const errBody = await res.text().catch(() => '');
        console.warn('[LLM] error body:', errBody.slice(0, 300));
        throw new Error(`API error: ${res.status}`);
      }

      const data = await res.json();
      const text: string = data.choices?.[0]?.message?.content ?? data.content?.[0]?.text ?? '';
      console.log('[LLM] raw text:', text.slice(0, 800));
      if (!text.trim()) {
        console.warn('[LLM] empty response content');
        throw new Error('LLM returned empty content');
      }
      return this.parseResponse(text);
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        throw new Error('LLM request timeout');
      }
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  }

  private parseResponse(text: string): LLMResponse {
    try {
      const cleaned = text.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '').trim();
      const parsed = JSON.parse(cleaned) as Partial<LLMResponse>;

      if (!Array.isArray(parsed.commands) || typeof parsed.responseText !== 'string') {
        throw new Error('Invalid LLM response structure');
      }

      return {
        commands: parsed.commands.map((cmd, i) => {
          const params = { ...(cmd.params as Record<string, unknown>) };
          if ('color' in params && !('fill' in params)) {
            params.fill = params.color;
            delete params.color;
          }
          const action = cmd.action as string;
          const category = (cmd.category as string) ?? this.inferCategory(action);
          return { id: cmd.id ?? `cmd_${Date.now()}_${i}`, category, action, params, confidence: cmd.confidence ?? 0.8 };
        }),
        responseText: parsed.responseText,
        confidence: parsed.confidence ?? 0.8,
        needsClarification: parsed.needsClarification ?? false,
        rawTranscript: '',
      };
    } catch {
      throw new Error('LLM returned invalid JSON');
    }
  }

  private inferCategory(action: string): string {
    if (action.startsWith('create_')) return 'create';
    if (action.startsWith('modify_')) return 'modify';
    if (action.startsWith('delete_')) return 'delete';
    if (['move', 'scale', 'rotate'].includes(action)) return 'transform';
    if (action.startsWith('set_')) return 'style';
    return 'canvas';
  }

  private fallback(rawText: string): LLMResponse {
    return this.ruleEngine.parse(rawText);
  }
}
