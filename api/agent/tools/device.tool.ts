import { HermesToolDefinition } from '../types';

export const controlDeviceTool: HermesToolDefinition = {
  name: 'control_device',
  description: 'Controls hardware and UI environment toggles (do not disturb, ambient glow, bluetooth, volume).',
  parameters: {
    type: 'object',
    properties: {
      setting: {
        type: 'string',
        enum: ['ambientGlow', 'doNotDisturb', 'bluetooth', 'hapticFeedback', 'offlineMode'],
        description: 'The target device or UI setting to adjust.',
      },
      state: {
        type: 'boolean',
        description: 'True to enable, false to disable.',
      },
    },
    required: ['setting', 'state'],
  },
  execute: async ({ setting, state }) => {
    return {
      status: 'applied',
      setting,
      state,
      message: `${setting} has been switched ${state ? 'ON' : 'OFF'}.`,
    };
  },
};
