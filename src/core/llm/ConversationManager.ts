import type { Message } from '../../types/llm';

export class ConversationManager {
  private messages: Message[] = [];
  private maxHistory = 20;

  addMessage(role: 'user' | 'assistant', content: string): void {
    this.messages.push({ role, content, timestamp: Date.now() });
    if (this.messages.length > this.maxHistory) {
      this.messages = this.messages.slice(-this.maxHistory);
    }
  }

  getHistory(): Message[] {
    return [...this.messages];
  }

  getRecentHistory(count: number): Message[] {
    return this.messages.slice(-count);
  }

  clearHistory(): void {
    this.messages = [];
  }

  getFormattedHistory(): string {
    return this.messages
      .map((m) => `${m.role === 'user' ? '用户' : '助手'}: ${m.content}`)
      .join('\n');
  }
}
