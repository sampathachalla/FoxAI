import { HermesToolDefinition } from '../types';

export const createNoteTool: HermesToolDefinition = {
  name: 'create_note',
  description: 'Creates and saves a quick note with content and optional categorizing tags.',
  parameters: {
    type: 'object',
    properties: {
      title: {
        type: 'string',
        description: 'The title of the note.',
      },
      content: {
        type: 'string',
        description: 'The body text or details of the note.',
      },
      tags: {
        type: 'array',
        description: 'List of tags to categorize the note (e.g. ["work", "ideas"]).',
      },
    },
    required: ['title', 'content'],
  },
  execute: async ({ title, content, tags = [] }) => {
    return {
      status: 'created',
      note: {
        id: `note_${Date.now()}`,
        title,
        content,
        tags,
        updatedAt: new Date().toISOString(),
      },
      message: `Note "${title}" saved successfully.`,
    };
  },
};
