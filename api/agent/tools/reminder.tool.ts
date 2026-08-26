import { HermesToolDefinition } from '../types';

export const createReminderTool: HermesToolDefinition = {
  name: 'create_reminder',
  description: 'Creates a scheduled reminder with a title, optional due time, and priority level.',
  parameters: {
    type: 'object',
    properties: {
      title: {
        type: 'string',
        description: 'The title or task description of the reminder.',
      },
      dueTime: {
        type: 'string',
        description: 'Optional due date or relative time (e.g. "Tomorrow at 9 AM", "in 2 hours").',
      },
      priority: {
        type: 'string',
        enum: ['low', 'medium', 'high'],
        description: 'Priority level of the reminder.',
      },
    },
    required: ['title'],
  },
  execute: async ({ title, dueTime, priority = 'medium' }) => {
    return {
      status: 'created',
      reminder: {
        id: `rem_${Date.now()}`,
        title,
        dueTime: dueTime || 'Today',
        priority,
        completed: false,
        createdAt: new Date().toISOString(),
      },
      message: `Reminder "${title}" created successfully for ${dueTime || 'today'}.`,
    };
  },
};
