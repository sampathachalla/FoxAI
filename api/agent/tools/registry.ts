import { HermesToolDefinition } from '../types';

export class HermesToolRegistry {
  private tools = new Map<string, HermesToolDefinition>();

  register(tool: HermesToolDefinition): void {
    this.tools.set(tool.name, tool);
  }

  get(name: string): HermesToolDefinition | undefined {
    return this.tools.get(name);
  }

  getAll(): HermesToolDefinition[] {
    return Array.from(this.tools.values());
  }

  has(name: string): boolean {
    return this.tools.has(name);
  }

  async execute(name: string, args: Record<string, any>, context?: any): Promise<any> {
    const tool = this.get(name);
    if (!tool) {
      throw new Error(`Tool "${name}" is not registered in HermesToolRegistry.`);
    }
    return await tool.execute(args, context);
  }
}
