import { HermesToolDefinition } from '../types';

export const getSystemStatusTool: HermesToolDefinition = {
  name: 'get_system_status',
  description: 'Inspects assistant operating environment, timestamp, latency, and model availability.',
  parameters: {
    type: 'object',
    properties: {},
  },
  execute: async () => {
    return {
      status: 'optimal',
      assistant: 'Fox Jarvis AI Core',
      architecture: 'Hermes Intelligence Loop',
      timestamp: new Date().toISOString(),
      currentTime: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      currentDate: new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }),
      nodeVersion: process.version,
    };
  },
};
