/**
 * Milestone 1 Test Suite: Notion-Feel Notes Tool - Core Block Model & Serialization Engine
 * Comprehensive verification for notseTypes.ts and markdownUtils.ts.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  SLASH_COMMANDS,
  type BlockType,
  type NoteBlock,
  type NoteDocument,
  type SlashMenuItemDef,
  type AutoSaveStatus,
  type NotesViewMode,
} from '../app/components/notse/notseTypes.ts';

import {
  generateBlockId,
  generateDocumentId,
  createDefaultBlock,
  createInitialDocument,
  blocksToMarkdown,
  markdownToBlocks,
  extractDocumentSnippet,
  calculateDocumentStats,
  duplicateDocument,
  exportNoteAsMarkdownFile,
  copyNoteAsMarkdown,
} from '../app/components/notse/markdownUtils.ts';

describe('Milestone 1: notseTypes & SLASH_COMMANDS', () => {
  const ALL_BLOCK_TYPES: BlockType[] = [
    'paragraph',
    'h1',
    'h2',
    'h3',
    'todo',
    'bullet',
    'number',
    'code',
    'callout',
    'quote',
    'divider',
  ];

  it('defines all 11 block types in SLASH_COMMANDS', () => {
    assert.strictEqual(SLASH_COMMANDS.length, 11);
    const commandIds = SLASH_COMMANDS.map((c) => c.id);
    for (const expectedType of ALL_BLOCK_TYPES) {
      assert.ok(
        commandIds.includes(expectedType),
        `SLASH_COMMANDS missing block type: ${expectedType}`
      );
    }
  });

  it('contains valid labels, sublabels, iconNames, and keywords for each slash command', () => {
    for (const item of SLASH_COMMANDS) {
      assert.ok(item.label && item.label.length > 0, `Command ${item.id} has empty label`);
      assert.ok(item.sublabel && item.sublabel.length > 0, `Command ${item.id} has empty sublabel`);
      assert.ok(item.iconName && item.iconName.length > 0, `Command ${item.id} has empty iconName`);
      assert.ok(Array.isArray(item.keywords) && item.keywords.length >= 2, `Command ${item.id} has insufficient keywords`);
    }
  });

  it('includes proper default payloads for specialized block types', () => {
    const codeCmd = SLASH_COMMANDS.find((c) => c.id === 'code');
    assert.strictEqual(codeCmd?.defaultPayload?.language, 'typescript');

    const calloutCmd = SLASH_COMMANDS.find((c) => c.id === 'callout');
    assert.strictEqual(calloutCmd?.defaultPayload?.calloutIcon, '💡');

    const todoCmd = SLASH_COMMANDS.find((c) => c.id === 'todo');
    assert.strictEqual(todoCmd?.defaultPayload?.completed, false);
  });
});

describe('Milestone 1: ID Generation & Default Model Builders', () => {
  it('generates unique block IDs with blk_ prefix', () => {
    const id1 = generateBlockId();
    const id2 = generateBlockId();
    assert.ok(id1.startsWith('blk_'));
    assert.ok(id2.startsWith('blk_'));
    assert.notStrictEqual(id1, id2);
  });

  it('generates unique document IDs with doc_ prefix', () => {
    const id1 = generateDocumentId();
    const id2 = generateDocumentId();
    assert.ok(id1.startsWith('doc_'));
    assert.ok(id2.startsWith('doc_'));
    assert.notStrictEqual(id1, id2);
  });

  it('createDefaultBlock sets sensible defaults for all block types', () => {
    const paragraph = createDefaultBlock();
    assert.strictEqual(paragraph.type, 'paragraph');
    assert.strictEqual(paragraph.content, '');
    assert.ok(paragraph.id.startsWith('blk_'));

    const todo = createDefaultBlock('todo', 'Buy groceries');
    assert.strictEqual(todo.type, 'todo');
    assert.strictEqual(todo.content, 'Buy groceries');
    assert.strictEqual(todo.completed, false);

    const code = createDefaultBlock('code', 'const a = 1;');
    assert.strictEqual(code.type, 'code');
    assert.strictEqual(code.content, 'const a = 1;');
    assert.strictEqual(code.language, 'typescript');

    const callout = createDefaultBlock('callout', 'Important warning');
    assert.strictEqual(callout.type, 'callout');
    assert.strictEqual(callout.content, 'Important warning');
    assert.strictEqual(callout.calloutIcon, '💡');
  });

  it('createInitialDocument constructs a valid note document template', () => {
    const doc = createInitialDocument('Project Roadmap', '🚀');
    assert.ok(doc.id.startsWith('doc_'));
    assert.strictEqual(doc.title, 'Project Roadmap');
    assert.strictEqual(doc.emoji, '🚀');
    assert.strictEqual(doc.blocks.length, 1);
    assert.strictEqual(doc.blocks[0].type, 'paragraph');
    assert.deepStrictEqual(doc.tags, []);
    assert.strictEqual(doc.pinned, false);
    assert.ok(doc.createdAt > 0);
    assert.ok(doc.updatedAt > 0);
  });
});

describe('Milestone 1: Markdown Serialization (blocksToMarkdown)', () => {
  it('serializes all 11 block types into clean standard Markdown', () => {
    const blocks: NoteBlock[] = [
      { id: 'b1', type: 'h1', content: 'Main Title' },
      { id: 'b2', type: 'h2', content: 'Section Subtitle' },
      { id: 'b3', type: 'h3', content: 'Subsection' },
      { id: 'b4', type: 'paragraph', content: 'This is body paragraph text.' },
      { id: 'b5', type: 'todo', content: 'Incomplete task', completed: false },
      { id: 'b6', type: 'todo', content: 'Completed task', completed: true },
      { id: 'b7', type: 'bullet', content: 'First bullet point' },
      { id: 'b8', type: 'bullet', content: 'Second bullet point' },
      { id: 'b9', type: 'number', content: 'First step' },
      { id: 'b10', type: 'number', content: 'Second step' },
      { id: 'b11', type: 'code', content: 'console.log("Hello Fox");', language: 'typescript' },
      { id: 'b12', type: 'callout', content: 'Pro tip for users', calloutIcon: '💡' },
      { id: 'b13', type: 'quote', content: 'Simplicity is prerequisite for reliability.' },
      { id: 'b14', type: 'divider', content: '' },
    ];

    const md = blocksToMarkdown(blocks);

    assert.ok(md.includes('# Main Title'));
    assert.ok(md.includes('## Section Subtitle'));
    assert.ok(md.includes('### Subsection'));
    assert.ok(md.includes('This is body paragraph text.'));
    assert.ok(md.includes('- [ ] Incomplete task'));
    assert.ok(md.includes('- [x] Completed task'));
    assert.ok(md.includes('- First bullet point\n- Second bullet point'));
    assert.ok(md.includes('1. First step\n2. Second step'));
    assert.ok(md.includes('```typescript\nconsole.log("Hello Fox");\n```'));
    assert.ok(md.includes('> 💡 Pro tip for users'));
    assert.ok(md.includes('> Simplicity is prerequisite for reliability.'));
    assert.ok(md.includes('---'));
  });

  it('prepends document title as H1 if not already the first H1 in blocks', () => {
    const blocks: NoteBlock[] = [
      { id: 'b1', type: 'paragraph', content: 'Intro text' },
    ];
    const md = blocksToMarkdown(blocks, 'My Document Title');
    assert.ok(md.startsWith('# My Document Title\n\nIntro text'));
  });

  it('does not duplicate title if first block is already an H1 with identical content', () => {
    const blocks: NoteBlock[] = [
      { id: 'b1', type: 'h1', content: 'Architecture Specs' },
      { id: 'b2', type: 'paragraph', content: 'Overview here' },
    ];
    const md = blocksToMarkdown(blocks, 'Architecture Specs');
    const h1Matches = md.match(/# Architecture Specs/g);
    assert.strictEqual(h1Matches?.length, 1);
  });
});

describe('Milestone 1: Markdown Deserialization (markdownToBlocks)', () => {
  it('parses headers, paragraphs, checkboxes, bullets, numbers, code, callouts, and dividers', () => {
    const markdown = `# Main Title

## Section 1

### Subsection A

This is a regular paragraph with **bold** and *italic* text.

- [ ] Unfinished task
- [x] Finished task

- Item Alpha
- Item Beta

1. Step One
2. Step Two

\`\`\`python
def greet():
    return "hello"
\`\`\`

> 💡 Remember to check the docs

> [!WARNING] High voltage hazard

> Simple quote from a book

---`;

    const blocks = markdownToBlocks(markdown);

    assert.strictEqual(blocks[0].type, 'h1');
    assert.strictEqual(blocks[0].content, 'Main Title');

    assert.strictEqual(blocks[1].type, 'h2');
    assert.strictEqual(blocks[1].content, 'Section 1');

    assert.strictEqual(blocks[2].type, 'h3');
    assert.strictEqual(blocks[2].content, 'Subsection A');

    assert.strictEqual(blocks[3].type, 'paragraph');
    assert.strictEqual(blocks[3].content, 'This is a regular paragraph with **bold** and *italic* text.');

    assert.strictEqual(blocks[4].type, 'todo');
    assert.strictEqual(blocks[4].content, 'Unfinished task');
    assert.strictEqual(blocks[4].completed, false);

    assert.strictEqual(blocks[5].type, 'todo');
    assert.strictEqual(blocks[5].content, 'Finished task');
    assert.strictEqual(blocks[5].completed, true);

    assert.strictEqual(blocks[6].type, 'bullet');
    assert.strictEqual(blocks[6].content, 'Item Alpha');

    assert.strictEqual(blocks[7].type, 'bullet');
    assert.strictEqual(blocks[7].content, 'Item Beta');

    assert.strictEqual(blocks[8].type, 'number');
    assert.strictEqual(blocks[8].content, 'Step One');

    assert.strictEqual(blocks[9].type, 'number');
    assert.strictEqual(blocks[9].content, 'Step Two');

    assert.strictEqual(blocks[10].type, 'code');
    assert.strictEqual(blocks[10].language, 'python');
    assert.strictEqual(blocks[10].content, 'def greet():\n    return "hello"');

    assert.strictEqual(blocks[11].type, 'callout');
    assert.strictEqual(blocks[11].calloutIcon, '💡');
    assert.strictEqual(blocks[11].content, 'Remember to check the docs');

    assert.strictEqual(blocks[12].type, 'callout');
    assert.strictEqual(blocks[12].calloutIcon, '⚠️');
    assert.strictEqual(blocks[12].content, 'High voltage hazard');

    assert.strictEqual(blocks[13].type, 'quote');
    assert.strictEqual(blocks[13].content, 'Simple quote from a book');

    assert.strictEqual(blocks[14].type, 'divider');
  });

  it('handles empty and whitespace markdown gracefully', () => {
    const emptyBlocks = markdownToBlocks('');
    assert.strictEqual(emptyBlocks.length, 1);
    assert.strictEqual(emptyBlocks[0].type, 'paragraph');
    assert.strictEqual(emptyBlocks[0].content, '');

    const whitespaceBlocks = markdownToBlocks('   \n\n   \n');
    assert.strictEqual(whitespaceBlocks.length, 1);
    assert.strictEqual(whitespaceBlocks[0].type, 'paragraph');
  });

  it('handles unclosed code blocks at EOF safely', () => {
    const unclosedMd = '```typescript\nconst a = 10;\nconsole.log(a);';
    const blocks = markdownToBlocks(unclosedMd);
    assert.strictEqual(blocks.length, 1);
    assert.strictEqual(blocks[0].type, 'code');
    assert.strictEqual(blocks[0].language, 'typescript');
    assert.strictEqual(blocks[0].content, 'const a = 10;\nconsole.log(a);');
  });
});

describe('Milestone 1: Bidirectional Serialization Roundtrip', () => {
  it('preserves block types, contents, and attributes across serialize -> parse roundtrip', () => {
    const originalBlocks: NoteBlock[] = [
      { id: '1', type: 'h1', content: 'Notion Architecture' },
      { id: '2', type: 'h2', content: 'Block Engine' },
      { id: '3', type: 'paragraph', content: 'State-driven modular architecture for Fox Jarvis.' },
      { id: '4', type: 'todo', content: 'Implement types', completed: true },
      { id: '5', type: 'todo', content: 'Build UI components', completed: false },
      { id: '6', type: 'bullet', content: 'High performance' },
      { id: '7', type: 'bullet', content: 'Zero latency' },
      { id: '8', type: 'number', content: 'Setup project' },
      { id: '9', type: 'number', content: 'Execute test suite' },
      { id: '10', type: 'code', content: 'const ready = true;', language: 'typescript' },
      { id: '11', type: 'callout', content: 'Critical insight', calloutIcon: '💡' },
      { id: '12', type: 'quote', content: 'Architecture is about intent.' },
      { id: '13', type: 'divider', content: '' },
    ];

    const markdown = blocksToMarkdown(originalBlocks);
    const roundtripBlocks = markdownToBlocks(markdown);

    assert.strictEqual(roundtripBlocks.length, originalBlocks.length);

    for (let i = 0; i < originalBlocks.length; i++) {
      const orig = originalBlocks[i];
      const rt = roundtripBlocks[i];
      assert.strictEqual(rt.type, orig.type, `Mismatch in block type at index ${i}`);
      assert.strictEqual(rt.content, orig.content, `Mismatch in block content at index ${i}`);
      if (orig.completed !== undefined) {
        assert.strictEqual(rt.completed, orig.completed, `Mismatch in completed at index ${i}`);
      }
      if (orig.language !== undefined) {
        assert.strictEqual(rt.language, orig.language, `Mismatch in language at index ${i}`);
      }
      if (orig.calloutIcon !== undefined) {
        assert.strictEqual(rt.calloutIcon, orig.calloutIcon, `Mismatch in calloutIcon at index ${i}`);
      }
    }
  });
});

describe('Milestone 1: Helper Utilities', () => {
  it('extractDocumentSnippet extracts clean summary snippet', () => {
    const blocks: NoteBlock[] = [
      { id: '1', type: 'h1', content: 'Heading 1' },
      { id: '2', type: 'paragraph', content: 'First line of content.' },
      { id: '3', type: 'paragraph', content: 'Second line of details.' },
    ];
    const snippet = extractDocumentSnippet(blocks, 100);
    assert.strictEqual(snippet, 'Heading 1 · First line of content. · Second line of details.');

    assert.strictEqual(extractDocumentSnippet([]), 'Empty note');
    assert.strictEqual(extractDocumentSnippet([{ id: '1', type: 'divider', content: '' }]), 'Empty note');
  });

  it('calculateDocumentStats accurately computes word, char, and todo metrics', () => {
    const blocks: NoteBlock[] = [
      { id: '1', type: 'paragraph', content: 'Quick brown fox' }, // 3 words, 15 chars
      { id: '2', type: 'todo', content: 'Task 1', completed: true }, // 2 words, 6 chars
      { id: '3', type: 'todo', content: 'Task 2', completed: false }, // 2 words, 6 chars
      { id: '4', type: 'divider', content: '' },
    ];

    const stats = calculateDocumentStats(blocks);
    assert.strictEqual(stats.blockCount, 4);
    assert.strictEqual(stats.wordCount, 7);
    assert.strictEqual(stats.charCount, 27);
    assert.strictEqual(stats.todoStats.total, 2);
    assert.strictEqual(stats.todoStats.completed, 1);
    assert.strictEqual(stats.todoStats.percent, 50);
  });

  it('duplicateDocument creates deep copy with fresh IDs and (Copy) title', () => {
    const original = createInitialDocument('Sprint Planning', '🎯');
    original.blocks.push({
      id: 'b_old',
      type: 'todo',
      content: 'Review PRs',
      completed: false,
    });
    original.tags = ['Work', 'Sprint'];

    const cloned = duplicateDocument(original);

    assert.notStrictEqual(cloned.id, original.id);
    assert.strictEqual(cloned.title, 'Sprint Planning (Copy)');
    assert.strictEqual(cloned.emoji, '🎯');
    assert.deepStrictEqual(cloned.tags, ['Work', 'Sprint']);
    assert.strictEqual(cloned.blocks.length, original.blocks.length);
    assert.notStrictEqual(cloned.blocks[1].id, original.blocks[1].id);
    assert.strictEqual(cloned.blocks[1].content, 'Review PRs');
  });

  it('exportNoteAsMarkdownFile and copyNoteAsMarkdown execute safely in non-browser environment', async () => {
    const doc = createInitialDocument('Test Note');
    // In Node.js environment without window/document, should safely return without throwing
    assert.doesNotThrow(() => {
      exportNoteAsMarkdownFile(doc);
    });

    const copyResult = await copyNoteAsMarkdown(doc);
    assert.strictEqual(typeof copyResult, 'boolean');
  });
});
