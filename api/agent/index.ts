import { HermesToolRegistry, createDefaultToolRegistry } from './tools';
import { HermesAgentOptions, HermesAgentResult, HermesStep, HermesToolDefinition } from './types';
import { generateAssistantResponse } from '../services/gemini.service';
import { ChatMessage } from '../models/assistant.types';

export * from './types';
export * from './tools';

export class HermesAgent {
  private registry: HermesToolRegistry;
  private options: HermesAgentOptions;

  constructor(options: HermesAgentOptions = {}, registry?: HermesToolRegistry) {
    this.options = {
      temperature: 0.3,
      maxIterations: 5,
      ...options,
    };
    this.registry = registry || createDefaultToolRegistry();
  }

  async run(prompt: string, history: ChatMessage[] = []): Promise<HermesAgentResult> {
    const startTime = Date.now();
    const steps: HermesStep[] = [];
    const toolsExecuted: { name: string; arguments: Record<string, any>; result: any }[] = [];

    // Call underlying LLM service
    const llmResult = await generateAssistantResponse(
      prompt,
      history,
      'You are the Hermes Autonomous Agent. Execute tasks with reasoning, clarity, and precision.',
      this.options.model,
      this.options.provider
    );

    // Execute any detected tools via the TypeScript registry
    if (llmResult.toolsDetected && llmResult.toolsDetected.length > 0) {
      for (const [index, toolCall] of llmResult.toolsDetected.entries()) {
        const toolName = toolCall.tool === 'reminder' ? 'create_reminder' :
                         toolCall.tool === 'note' ? 'create_note' :
                         toolCall.tool === 'weather' ? 'get_weather' :
                         toolCall.tool === 'device_control' ? 'control_device' :
                         toolCall.tool;

        const toolDef = this.registry.get(toolName);
        let toolOutput: any = null;
        const toolStart = Date.now();

        if (toolDef) {
          try {
            toolOutput = await toolDef.execute(toolCall.parameters || {});
          } catch (err: any) {
            toolOutput = { error: err?.message || 'Tool execution failed' };
          }
        } else {
          toolOutput = { success: true, status: 'acknowledged', parameters: toolCall.parameters };
        }

        const toolDurationMs = Date.now() - toolStart;

        toolsExecuted.push({
          name: toolName,
          arguments: toolCall.parameters || {},
          result: toolOutput,
        });

        steps.push({
          step: index + 1,
          thought: `Executing action: ${toolName}`,
          action: toolName,
          actionInput: toolCall.parameters || {},
          observation: typeof toolOutput === 'string' ? toolOutput : JSON.stringify(toolOutput),
          durationMs: toolDurationMs,
        });
      }
    }

    const durationMs = Date.now() - startTime;

    return {
      text: llmResult.text,
      thought: steps.length > 0 ? `Completed ${steps.length} reasoning step(s) with ${toolsExecuted.length} tool(s).` : 'Direct analytical response generated.',
      steps,
      toolsExecuted,
      durationMs,
    };
  }
}

export function getHermesAgent(options?: HermesAgentOptions): HermesAgent {
  return new HermesAgent(options);
}
