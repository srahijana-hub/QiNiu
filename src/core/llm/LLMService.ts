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
      if (err instanceof Error && err.message === 'LLM returned invalid JSON') {
        try {
          const result = await this.callLLM(systemPrompt, userPrompt);
          this.conversationManager.addMessage('assistant', result.responseText);
          return result;
        } catch {
          return this.fallback(rawText);
        }
      }
      return this.fallback(rawText);
    }
  }

  private async callLLM(systemPrompt: string, userPrompt: string): Promise<LLMResponse> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);

    try {
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
          system: systemPrompt,
          messages: [{ role: 'user', content: userPrompt }],
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        throw new Error(`API error: ${res.status}`);
      }

      const data = await res.json();
      const text: string = data.content[0].text;
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
      const parsed = JSON.parse(text) as Partial<LLMResponse>;

      if (!Array.isArray(parsed.commands) || typeof parsed.responseText !== 'string') {
        throw new Error('Invalid LLM response structure');
      }

      return {
        commands: parsed.commands,
        responseText: parsed.responseText,
        confidence: parsed.confidence ?? 0.8,
        needsClarification: parsed.needsClarification ?? false,
        rawTranscript: '',
      };
    } catch {
      throw new Error('LLM returned invalid JSON');
    }
  }

  private fallback(rawText: string): LLMResponse {
    return this.ruleEngine.parse(rawText);
  }
}
