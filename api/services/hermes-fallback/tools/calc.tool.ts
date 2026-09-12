import { HermesToolDefinition } from '../types';

export const calculatorTool: HermesToolDefinition = {
  name: 'calculate',
  description: 'Performs mathematical, financial, scientific, or unit conversion computations safely.',
  parameters: {
    type: 'object',
    properties: {
      expression: {
        type: 'string',
        description: 'The arithmetic or math expression to evaluate (e.g. "sqrt(144) * 2.5", "15% of 850").',
      },
    },
    required: ['expression'],
  },
  execute: async ({ expression }) => {
    try {
      // Safe sanitized arithmetic evaluation
      const sanitized = String(expression)
        .replace(/[^0-9+\-*/().,%^sqrtPIEpie\s]/g, '')
        .replace(/sqrt\(([^)]+)\)/g, 'Math.sqrt($1)')
        .replace(/PI/g, 'Math.PI')
        .replace(/%/g, '/100');

      const result = Function(`"use strict"; return (${sanitized});`)();
      return {
        expression,
        result: Number(result),
        formatted: `${expression} = ${result}`,
      };
    } catch (e: any) {
      return {
        expression,
        error: `Could not evaluate mathematical expression: ${e?.message || 'Invalid syntax'}`,
      };
    }
  },
};
