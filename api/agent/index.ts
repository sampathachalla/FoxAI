import { HermesExecutor } from './executor';
import { createDefaultToolRegistry, HermesToolRegistry } from './tools';
import { HermesMemory } from './memory';
import { HermesAgentConfig, HermesAgentResponse, HermesMessage, HermesToolDefinition } from './types';

export * from './types';
export * from './prompt';
export * from './parser';
export * from './memory';
export * from './executor';
export * from './tools';

export class HermesAgent {
  private executor: HermesExecutor;
  private registry: HermesToolRegistry;
  private memory: HermesMemory;

  constructor(config: HermesAgentConfig = {}) {
    this.registry = createDefaultToolRegistry();
    this.memory = new HermesMemory();
    this.executor = new HermesExecutor(config, this.registry, this.memory);
  }

  registerTool(tool: HermesToolDefinition): void {
    this.registry.register(tool);
  }

  getTools(): HermesToolDefinition[] {
    return this.registry.getAll();
  }

  async run(prompt: string, history: HermesMessage[] = []): Promise<HermesAgentResponse> {
    const response = await this.executor.run(prompt, history);
    this.memory.addMessage({ role: 'user', content: prompt });
    this.memory.addMessage({
      role: 'assistant',
      content: response.text,
      thought: response.thought,
    });
    return response;
  }

  clearMemory(): void {
    this.memory.clear();
  }
}

// Global default singleton instance
let defaultAgentInstance: HermesAgent | null = null;

export function getHermesAgent(config?: HermesAgentConfig): HermesAgent {
  if (!defaultAgentInstance || config) {
    defaultAgentInstance = new HermesAgent(config);
  }
  return defaultAgentInstance;
}
