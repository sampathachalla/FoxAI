import { HermesToolDefinition } from './types';

export const DEFAULT_HERMES_SYSTEM_PROMPT = `You are "Fox", an advanced autonomous AI Jarvis agent powered by the Hermes Intelligence architecture.
You possess high reasoning capabilities, proactive problem solving, tool execution, and clear communication.

# GUIDELINES:
1. When presented with a task, analyze what tools or information are required before responding.
2. Wrap internal reasoning and step-by-step planning inside <thought>...</thought> tags.
3. If you need to perform an action or retrieve external data, call tools using structured <tool_call> tags.
4. Synthesize tool results cleanly and respond directly to the user once sufficient data is gathered.
5. Keep final spoken answers conversational, precise, and helpful.`;

export function formatHermesToolsPrompt(tools: HermesToolDefinition[]): string {
  if (!tools || tools.length === 0) {
    return '';
  }

  const toolDescriptions = tools.map((t) => {
    return {
      type: 'function',
      function: {
        name: t.name,
        description: t.description,
        parameters: t.parameters,
      },
    };
  });

  return `
# AVAILABLE TOOLS:
You have access to the following functions:
<tools>
${JSON.stringify(toolDescriptions, null, 2)}
</tools>

# TOOL CALL FORMAT:
To execute a function, respond with one or more XML tags structured as follows:
<tool_call>
{"name": "function_name", "arguments": {"arg_key": "arg_value"}}
</tool_call>

You can perform internal reasoning before making a tool call:
<thought>
I need to check the weather in San Francisco to answer the user's request.
</thought>
<tool_call>
{"name": "get_weather", "arguments": {"location": "San Francisco, CA"}}
</tool_call>
`;
}
