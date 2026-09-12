export interface HermesToolParameter {
  type: string;
  description?: string;
  enum?: string[];
  default?: any;
  items?: any;
}

export interface HermesToolParameters {
  type: 'object';
  properties: Record<string, HermesToolParameter>;
  required?: string[];
}

export interface HermesToolDefinition {
  name: string;
  description: string;
  parameters: HermesToolParameters;
  execute: (args: Record<string, any>, context?: any) => Promise<any>;
}

export interface HermesStep {
  step: number;
  thought: string;
  action: string;
  actionInput: Record<string, any>;
  observation: string;
  durationMs: number;
}

export interface HermesAgentOptions {
  model?: string;
  provider?: string;
  temperature?: number;
  maxIterations?: number;
}

export interface HermesAgentResult {
  text: string;
  thought?: string;
  steps: HermesStep[];
  toolsExecuted: {
    name: string;
    arguments: Record<string, any>;
    result: any;
  }[];
  durationMs: number;
}
