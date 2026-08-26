import { GoogleGenAI } from '@google/genai';
import OpenAI from 'openai';
import {
  HermesAgentConfig,
  HermesAgentResponse,
  HermesExecutionStep,
  HermesMessage,
  HermesToolCall,
  HermesToolResult,
} from './types';
import { HermesToolRegistry } from './tools/registry';
import { DEFAULT_HERMES_SYSTEM_PROMPT, formatHermesToolsPrompt } from './prompt';
import { parseHermesOutput } from './parser';
import { HermesMemory } from './memory';

export class HermesExecutor {
  private config: Required<HermesAgentConfig>;
  private registry: HermesToolRegistry;
  private memory: HermesMemory;
  private openaiClient: OpenAI | null = null;
  private geminiClient: GoogleGenAI | null = null;

  constructor(
    config: HermesAgentConfig = {},
    registry?: HermesToolRegistry,
    memory?: HermesMemory
  ) {
    this.config = {
      model: config.model || (process.env.OPEN_API_KEY || process.env.OPENAI_API_KEY ? 'gpt-5-nano' : 'gemini-3.7-flash'),
      provider: config.provider || 'auto',
      temperature: config.temperature ?? 0.3,
      maxIterations: config.maxIterations ?? 5,
      systemPrompt: config.systemPrompt || DEFAULT_HERMES_SYSTEM_PROMPT,
      verbose: config.verbose ?? true,
    };
    this.registry = registry || new HermesToolRegistry();
    this.memory = memory || new HermesMemory();

    // Initialize provider clients
    const oaiKey = process.env.OPEN_API_KEY || process.env.OPENAI_API_KEY;
    if (oaiKey) {
      this.openaiClient = new OpenAI({ apiKey: oaiKey });
    }
    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey) {
      this.geminiClient = new GoogleGenAI({ apiKey: geminiKey });
    }
  }

  private async callLLM(messages: HermesMessage[]): Promise<string> {
    const isOAI =
      this.config.provider === 'openai' ||
      (this.config.provider === 'auto' && this.openaiClient);

    if (isOAI && this.openaiClient) {
      const targetModel = this.config.model.includes('gpt') || this.config.model.startsWith('o') ? this.config.model : 'gpt-4o-mini';
      const isReasoningOrNano = targetModel.includes('nano') || targetModel.startsWith('o1') || targetModel.startsWith('o3');

      const params: any = {
        model: targetModel,
        messages: messages.map((m) => ({
          role: m.role === 'tool' ? 'user' : m.role,
          content: m.content,
        })),
      };

      if (!isReasoningOrNano && this.config.temperature !== undefined) {
        params.temperature = this.config.temperature;
      }

      const completion = await this.openaiClient.chat.completions.create(params);
      return completion.choices[0]?.message?.content || '';
    }

    if (this.geminiClient) {
      const sysPrompt = messages.find((m) => m.role === 'system')?.content || '';
      const conversationContents = messages
        .filter((m) => m.role !== 'system')
        .map((m) => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }],
        }));

      const response = await this.geminiClient.models.generateContent({
        model: this.config.model.includes('gemini') ? this.config.model : 'gemini-2.5-flash',
        contents: conversationContents,
        config: {
          systemInstruction: sysPrompt,
          temperature: this.config.temperature,
        },
      });

      return response.text || '';
    }

    throw new Error('No LLM client configured (neither OpenAI nor Gemini API keys found).');
  }

  async run(userPrompt: string, history: HermesMessage[] = []): Promise<HermesAgentResponse> {
    const startTime = Date.now();
    const steps: HermesExecutionStep[] = [];
    const allToolsExecuted: HermesToolCall[] = [];

    // Format full system instructions with tool definitions
    const toolsPrompt = formatHermesToolsPrompt(this.registry.getAll());
    const fullSystem = `${this.config.systemPrompt}\n${toolsPrompt}`;

    const sessionMessages: HermesMessage[] = [
      { role: 'system', content: fullSystem },
      ...history,
      { role: 'user', content: userPrompt },
    ];

    let currentIteration = 0;
    let finalAnswer = '';
    let primaryThought = '';

    while (currentIteration < this.config.maxIterations) {
      currentIteration++;

      // 1. LLM Generation
      const rawOutput = await this.callLLM(sessionMessages);
      const parsed = parseHermesOutput(rawOutput);

      if (parsed.thought && !primaryThought) {
        primaryThought = parsed.thought;
      }

      // Record step
      const stepRecord: HermesExecutionStep = {
        step: currentIteration,
        thought: parsed.thought,
        toolCalls: parsed.toolCalls,
        rawOutput,
      };

      // 2. If no tool calls, this is the final response
      if (parsed.toolCalls.length === 0) {
        finalAnswer = parsed.cleanText || rawOutput;
        steps.push(stepRecord);
        break;
      }

      // 3. Execute tool calls
      const observations: HermesToolResult[] = [];
      for (const call of parsed.toolCalls) {
        allToolsExecuted.push(call);
        try {
          const result = await this.registry.execute(call.name, call.arguments);
          observations.push({
            toolCallId: call.id,
            name: call.name,
            result,
          });
        } catch (err: any) {
          observations.push({
            toolCallId: call.id,
            name: call.name,
            error: err?.message || 'Tool execution error',
          });
        }
      }

      stepRecord.observations = observations;
      steps.push(stepRecord);

      // 4. Append assistant tool_calls and tool observation results to conversation history
      sessionMessages.push({
        role: 'assistant',
        content: rawOutput,
      });

      const observationContent = observations
        .map(
          (obs) =>
            `<tool_response>\n{"name": "${obs.name}", "output": ${JSON.stringify(obs.result || { error: obs.error })}}\n</tool_response>`
        )
        .join('\n\n');

      sessionMessages.push({
        role: 'user',
        content: `Observation from tool executions:\n${observationContent}\n\nPlease proceed with your next thought or provide the final synthesized response to the user.`,
      });
    }

    if (!finalAnswer) {
      finalAnswer = steps[steps.length - 1]?.rawOutput || "I've processed your request.";
    }

    return {
      success: true,
      text: finalAnswer,
      thought: primaryThought,
      steps,
      toolsExecuted: allToolsExecuted,
      durationMs: Date.now() - startTime,
    };
  }
}
