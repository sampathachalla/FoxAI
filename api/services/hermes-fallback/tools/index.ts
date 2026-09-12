import { HermesToolRegistry } from './registry';
import { createReminderTool } from './reminder.tool';
import { createNoteTool } from './note.tool';
import { getWeatherTool } from './weather.tool';
import { controlDeviceTool } from './device.tool';
import { calculatorTool } from './calc.tool';
import { searchTool } from './search.tool';
import { getSystemStatusTool } from './system.tool';

export * from './registry';
export * from './reminder.tool';
export * from './note.tool';
export * from './weather.tool';
export * from './device.tool';
export * from './calc.tool';
export * from './search.tool';
export * from './system.tool';

export function createDefaultToolRegistry(): HermesToolRegistry {
  const registry = new HermesToolRegistry();
  registry.register(createReminderTool);
  registry.register(createNoteTool);
  registry.register(getWeatherTool);
  registry.register(controlDeviceTool);
  registry.register(calculatorTool);
  registry.register(searchTool);
  registry.register(getSystemStatusTool);
  return registry;
}
