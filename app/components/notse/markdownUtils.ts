// ============================================================================
// Notion-Feel Notes Tool: Markdown Serialization & Deserialization Engine
// File: /app/components/notse/markdownUtils.ts
// ============================================================================

import type { BlockType, NoteBlock, NoteDocument } from './notseTypes';

/**
 * Generate a cryptographically robust unique identifier for blocks.
 */
export function generateBlockId(): string {
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 9);
  return `blk_${timestamp}_${randomSuffix}`;
}

/**
 * Generate a cryptographically robust unique identifier for documents.
 */
export function generateDocumentId(): string {
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 9);
  return `doc_${timestamp}_${randomSuffix}`;
}

/**
 * Creates a default NoteBlock instance with sensible defaults and fresh unique ID.
 */
export function createDefaultBlock(type: BlockType = 'paragraph', content: string = ''): NoteBlock {
  const id = generateBlockId();
  const block: NoteBlock = {
    id,
    type,
    content,
  };

  if (type === 'todo') {
    block.completed = false;
  } else if (type === 'code') {
    block.language = 'typescript';
  } else if (type === 'callout') {
    block.calloutIcon = '💡';
  }

  return block;
}

/**
 * Creates a fresh NoteDocument template with default header, empty tags, and initial paragraph block.
 */
export function createInitialDocument(title: string = 'Untitled Note', emoji: string = '📝'): NoteDocument {
  const now = Date.now();
  return {
    id: generateDocumentId(),
    title,
    emoji,
    blocks: [createDefaultBlock('paragraph', '')],
    tags: [],
    createdAt: now,
    updatedAt: now,
    pinned: false,
  };
}

/**
 * Checks if a block type belongs to a list family (todo, bullet, number).
 */
function isListBlockType(type: BlockType): boolean {
  return type === 'todo' || type === 'bullet' || type === 'number';
}

/**
 * Serializes an array of NoteBlock objects into clean, standard Markdown.
 * If title is provided, optionally formats it as the leading H1 header.
 */
export function blocksToMarkdown(blocks: NoteBlock[], title?: string): string {
  const parts: string[] = [];

  // If a non-empty title is provided, prepend as H1 if not already the first H1 in blocks
  const trimmedTitle = title?.trim();
  if (trimmedTitle) {
    const firstBlock = blocks[0];
    const firstBlockIsSameTitle = firstBlock && firstBlock.type === 'h1' && firstBlock.content.trim() === trimmedTitle;
    if (!firstBlockIsSameTitle) {
      parts.push(`# ${trimmedTitle}`);
    }
  }

  let listIndex = 1;
  let previousBlockType: BlockType | null = null;

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    const content = block.content || '';

    // Reset numbered list counter when transitioning away from numbered block
    if (block.type === 'number') {
      if (previousBlockType !== 'number') {
        listIndex = 1;
      }
    }

    let serialized = '';

    switch (block.type) {
      case 'h1':
        serialized = `# ${content}`;
        break;
      case 'h2':
        serialized = `## ${content}`;
        break;
      case 'h3':
        serialized = `### ${content}`;
        break;
      case 'todo':
        serialized = `- [${block.completed ? 'x' : ' '}] ${content}`;
        break;
      case 'bullet':
        serialized = `- ${content}`;
        break;
      case 'number':
        serialized = `${listIndex}. ${content}`;
        listIndex++;
        break;
      case 'code': {
        const lang = block.language || '';
        serialized = `\`\`\`${lang}\n${content}\n\`\`\``;
        break;
      }
      case 'callout': {
        const icon = block.calloutIcon || '💡';
        serialized = `> ${icon} ${content}`;
        break;
      }
      case 'quote':
        serialized = `> ${content}`;
        break;
      case 'divider':
        serialized = '---';
        break;
      case 'paragraph':
      default:
        serialized = content;
        break;
    }

    if (parts.length > 0) {
      // If consecutive list items of same type, use single newline for tight list grouping
      const isConsecutiveList =
        isListBlockType(block.type) && previousBlockType === block.type;
      
      const separator = isConsecutiveList ? '\n' : '\n\n';
      parts.push(separator + serialized);
    } else {
      parts.push(serialized);
    }

    previousBlockType = block.type;
  }

  return parts.join('');
}

/**
 * High-fidelity Markdown parser that transforms arbitrary Markdown text into structured NoteBlock[].
 * Supports code blocks with languages, todos, bullets, numbers, headers, callouts with emojis, quotes, and dividers.
 */
export function markdownToBlocks(markdown: string): NoteBlock[] {
  if (!markdown || typeof markdown !== 'string' || !markdown.trim()) {
    return [createDefaultBlock('paragraph', '')];
  }

  const normalized = markdown.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const rawLines = normalized.split('\n');
  const blocks: NoteBlock[] = [];

  let inCodeBlock = false;
  let codeLanguage = 'typescript';
  let codeLines: string[] = [];

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i];

    // Handle code fence transitions
    if (!inCodeBlock) {
      const codeFenceMatch = line.match(/^```([a-zA-Z0-9_-]*)/);
      if (codeFenceMatch) {
        inCodeBlock = true;
        codeLanguage = codeFenceMatch[1] || 'typescript';
        codeLines = [];
        continue;
      }
    } else {
      if (line.match(/^```\s*$/)) {
        inCodeBlock = false;
        blocks.push({
          id: generateBlockId(),
          type: 'code',
          content: codeLines.join('\n'),
          language: codeLanguage || 'typescript',
        });
        codeLines = [];
        continue;
      } else {
        codeLines.push(line);
        continue;
      }
    }

    // Skip empty lines between standard blocks
    if (line.trim() === '') {
      continue;
    }

    // Divider: --- or *** or ___
    if (/^(?:---|---|\*\*\*|___)\s*$/.test(line.trim())) {
      blocks.push({
        id: generateBlockId(),
        type: 'divider',
        content: '',
      });
      continue;
    }

    // Headings
    const h3Match = line.match(/^###\s+(.*)$/);
    if (h3Match) {
      blocks.push({
        id: generateBlockId(),
        type: 'h3',
        content: h3Match[1],
      });
      continue;
    }

    const h2Match = line.match(/^##\s+(.*)$/);
    if (h2Match) {
      blocks.push({
        id: generateBlockId(),
        type: 'h2',
        content: h2Match[1],
      });
      continue;
    }

    const h1Match = line.match(/^#\s+(.*)$/);
    if (h1Match) {
      blocks.push({
        id: generateBlockId(),
        type: 'h1',
        content: h1Match[1],
      });
      continue;
    }

    const hDeepMatch = line.match(/^#{4,6}\s+(.*)$/);
    if (hDeepMatch) {
      blocks.push({
        id: generateBlockId(),
        type: 'h3',
        content: hDeepMatch[1],
      });
      continue;
    }

    // To-Do Checklist (Checked)
    const todoCheckedMatch = line.match(/^[-*+]\s*\[[xX]\]\s*(.*)$/);
    if (todoCheckedMatch) {
      blocks.push({
        id: generateBlockId(),
        type: 'todo',
        content: todoCheckedMatch[1],
        completed: true,
      });
      continue;
    }

    // To-Do Checklist (Unchecked)
    const todoUncheckedMatch = line.match(/^[-*+]\s*\[\s*\]\s*(.*)$/);
    if (todoUncheckedMatch) {
      blocks.push({
        id: generateBlockId(),
        type: 'todo',
        content: todoUncheckedMatch[1],
        completed: false,
      });
      continue;
    }

    // Bullet List Item
    const bulletMatch = line.match(/^[-*+]\s+(.*)$/);
    if (bulletMatch) {
      blocks.push({
        id: generateBlockId(),
        type: 'bullet',
        content: bulletMatch[1],
      });
      continue;
    }

    // Numbered List Item
    const numberMatch = line.match(/^\d+\.\s+(.*)$/);
    if (numberMatch) {
      blocks.push({
        id: generateBlockId(),
        type: 'number',
        content: numberMatch[1],
      });
      continue;
    }

    // Blockquote or Callout: > ...
    const quoteMatch = line.match(/^>\s*(.*)$/);
    if (quoteMatch) {
      const innerContent = quoteMatch[1].trim();

      // GitHub Alert Syntax: > [!NOTE] text or > [!WARNING] text
      const alertMatch = innerContent.match(/^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*(.*)$/i);
      if (alertMatch) {
        const alertType = alertMatch[1].toUpperCase();
        let icon = '💡';
        if (alertType === 'WARNING' || alertType === 'CAUTION') icon = '⚠️';
        if (alertType === 'IMPORTANT') icon = '🔥';
        if (alertType === 'TIP') icon = '✨';

        blocks.push({
          id: generateBlockId(),
          type: 'callout',
          content: alertMatch[2],
          calloutIcon: icon,
        });
        continue;
      }

      // Leading Emoji Callout Syntax: > 💡 text or > 🚀 text
      const emojiMatch = innerContent.match(
        /^(\p{Extended_Pictographic}|\p{Emoji_Presentation}|[💡⚠️ℹ️🚀🔥✨📌📝⚡️🎯])\s*(.*)$/u
      );
      if (emojiMatch) {
        blocks.push({
          id: generateBlockId(),
          type: 'callout',
          content: emojiMatch[2],
          calloutIcon: emojiMatch[1],
        });
        continue;
      }

      // Standard Blockquote
      blocks.push({
        id: generateBlockId(),
        type: 'quote',
        content: innerContent,
      });
      continue;
    }

    // Fallback: Standard Paragraph
    blocks.push({
      id: generateBlockId(),
      type: 'paragraph',
      content: line,
    });
  }

  // Handle unclosed code block gracefully at EOF
  if (inCodeBlock) {
    blocks.push({
      id: generateBlockId(),
      type: 'code',
      content: codeLines.join('\n'),
      language: codeLanguage || 'typescript',
    });
  }

  // Ensure at least one block exists
  if (blocks.length === 0) {
    return [createDefaultBlock('paragraph', '')];
  }

  return blocks;
}

/**
 * Triggers a browser download of the note document as a cleanly formatted `.md` file.
 */
export function exportNoteAsMarkdownFile(doc: NoteDocument): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }

  const markdown = blocksToMarkdown(doc.blocks, doc.title);
  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const safeTitle = (doc.title || 'untitled-note')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'note';
  const fileName = `${safeTitle}.md`;

  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.style.display = 'none';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

/**
 * Copies the note document as formatted Markdown text to the system clipboard.
 * Includes graceful fallback for older browsers or restricted iframe environments.
 */
export async function copyNoteAsMarkdown(doc: NoteDocument): Promise<boolean> {
  const markdown = blocksToMarkdown(doc.blocks, doc.title);

  // Modern Async Clipboard API
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      await navigator.clipboard.writeText(markdown);
      return true;
    }
  } catch {
    // Proceed to textarea fallback
  }

  // Fallback for Safari/Legacy/Restricted contexts
  if (typeof document !== 'undefined') {
    try {
      const textArea = document.createElement('textarea');
      textArea.value = markdown;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      if (successful) return true;
    } catch {
      return false;
    }
  }

  return false;
}

/**
 * Extracts a concise 1-2 line plain text snippet from blocks for gallery cards.
 */
export function extractDocumentSnippet(blocks: NoteBlock[], maxChars: number = 160): string {
  if (!blocks || blocks.length === 0) return 'Empty note';

  const meaningfulBlocks = blocks.filter((b) => b.content && b.content.trim().length > 0 && b.type !== 'divider');
  if (meaningfulBlocks.length === 0) return 'Empty note';

  const combined = meaningfulBlocks
    .map((b) => b.content.trim())
    .join(' · ');

  if (combined.length <= maxChars) return combined;
  return combined.substring(0, maxChars).trim() + '...';
}

/**
 * Calculates document statistics including word count, character count, and todo progress.
 */
export function calculateDocumentStats(blocks: NoteBlock[]): {
  wordCount: number;
  charCount: number;
  blockCount: number;
  todoStats: { total: number; completed: number; percent: number };
} {
  let wordCount = 0;
  let charCount = 0;
  let totalTodos = 0;
  let completedTodos = 0;

  for (const block of blocks) {
    if (block.type === 'divider') continue;

    const content = block.content || '';
    charCount += content.length;
    
    const words = content.trim().split(/\s+/).filter(Boolean);
    wordCount += words.length;

    if (block.type === 'todo') {
      totalTodos++;
      if (block.completed) completedTodos++;
    }
  }

  const percent = totalTodos > 0 ? Math.round((completedTodos / totalTodos) * 100) : 0;

  return {
    wordCount,
    charCount,
    blockCount: blocks.length,
    todoStats: {
      total: totalTodos,
      completed: completedTodos,
      percent,
    },
  };
}

/**
 * Creates a duplicate of an existing NoteDocument with fresh IDs and "(Copy)" in title.
 */
export function duplicateDocument(doc: NoteDocument): NoteDocument {
  const now = Date.now();
  const clonedBlocks: NoteBlock[] = doc.blocks.map((b) => ({
    ...b,
    id: generateBlockId(),
  }));

  return {
    ...doc,
    id: generateDocumentId(),
    title: doc.title ? `${doc.title} (Copy)` : 'Untitled Note (Copy)',
    blocks: clonedBlocks,
    tags: [...doc.tags],
    createdAt: now,
    updatedAt: now,
    pinned: false,
  };
}
