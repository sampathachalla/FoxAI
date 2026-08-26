import { HermesMessage } from './types';

export class HermesMemory {
  private history: HermesMessage[] = [];
  private scratchpad: string[] = [];
  private maxHistory: number;

  constructor(maxHistory = 20) {
    this.maxHistory = maxHistory;
  }

  addMessage(msg: HermesMessage): void {
    this.history.push(msg);
    if (this.history.length > this.maxHistory) {
      // Retain system prompt at index 0 if present
      if (this.history[0]?.role === 'system') {
        const sys = this.history[0];
        this.history = [sys, ...this.history.slice(-(this.maxHistory - 1))];
      } else {
        this.history = this.history.slice(-this.maxHistory);
      }
    }
  }

  getMessages(): HermesMessage[] {
    return [...this.history];
  }

  setMessages(messages: HermesMessage[]): void {
    this.history = [...messages];
  }

  appendScratchpad(note: string): void {
    this.scratchpad.push(note);
  }

  getScratchpad(): string[] {
    return [...this.scratchpad];
  }

  clearScratchpad(): void {
    this.scratchpad = [];
  }

  clear(): void {
    this.history = [];
    this.scratchpad = [];
  }
}
