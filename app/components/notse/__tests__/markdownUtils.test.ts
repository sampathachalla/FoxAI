/**
 * Exhaustive Test Suite for Notion-Feel Notes Tool Markdown Serialization Engine
 * File: app/components/notse/__tests__/markdownUtils.test.ts
 *
 * Tier 1: Feature Tests (All 11 Block Types: H1, H2, H3, Todo checked/unchecked, Bullet, Number, Code, Callout, Quote, Divider, Paragraph)
 * Tier 2: Boundary, Corner Cases & Adversarial Verification (Empty, Whitespace, Nested chars, Emojis, Special chars, Stats & Snippets)
 * Tier 3: Round-Trip Fidelity (Bidirectional serialization & parsing preservation)
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import type { BlockType, NoteBlock, NoteDocument } from '../notseTypes.ts';
import {
  blocksToMarkdown,
  markdownToBlocks,
  createDefaultBlock,
  createInitialDocument,
  extractDocumentSnippet,
  calculateDocumentStats,
  duplicateDocument,
} from '../markdownUtils.ts';

describe('MarkdownUtils Test Suite', () => {
  // ===========================================================================
  // TIER 1: FEATURE TESTS (All 11 Block Types)
  // ===========================================================================
  describe('Tier 1: Feature Tests — Block Serialization & Parsing', () => {
    // -------------------------------------------------------------------------
    // 1. Paragraph Block
    // -------------------------------------------------------------------------
    describe('1. Paragraph Block', () => {
      it('should serialize paragraph block into plain text without prefixes', () => {
        const blocks: NoteBlock[] = [
          { id: 'b1', type: 'paragraph', content: 'This is a standard body paragraph.' },
        ];
        const md = blocksToMarkdown(blocks);
        assert.equal(md, 'This is a standard body paragraph.');
      });

      it('should parse plain text into paragraph blocks', () => {
        const md = 'Line one of text.\n\nLine two of text.';
        const blocks = markdownToBlocks(md);
        assert.equal(blocks.length, 2);
        assert.equal(blocks[0].type, 'paragraph');
        assert.equal(blocks[0].content, 'Line one of text.');
        assert.equal(blocks[1].type, 'paragraph');
        assert.equal(blocks[1].content, 'Line two of text.');
      });

      it('should preserve inline markdown formatting (bold, italic, code) inside paragraphs', () => {
        const md = 'Text with **bold**, *italic*, and `inline code` formatting.';
        const blocks = markdownToBlocks(md);
        assert.equal(blocks.length, 1);
        assert.equal(blocks[0].type, 'paragraph');
        assert.equal(blocks[0].content, 'Text with **bold**, *italic*, and `inline code` formatting.');
      });
    });

    // -------------------------------------------------------------------------
    // 2. Heading 1 Block
    // -------------------------------------------------------------------------
    describe('2. Heading 1 (h1) Block', () => {
      it('should serialize h1 block with single # prefix', () => {
        const blocks: NoteBlock[] = [
          { id: 'b1', type: 'h1', content: 'System Architecture' },
        ];
        const md = blocksToMarkdown(blocks);
        assert.equal(md, '# System Architecture');
      });

      it('should parse # heading into h1 block', () => {
        const md = '# Main Title of Document';
        const blocks = markdownToBlocks(md);
        assert.equal(blocks.length, 1);
        assert.equal(blocks[0].type, 'h1');
        assert.equal(blocks[0].content, 'Main Title of Document');
      });

      it('should prepend title as H1 if not already first H1 block in document', () => {
        const blocks: NoteBlock[] = [
          { id: 'b1', type: 'paragraph', content: 'Intro paragraph' },
        ];
        const md = blocksToMarkdown(blocks, 'My Document Title');
        assert.equal(md, '# My Document Title\n\nIntro paragraph');
      });

      it('should not duplicate title if first block is already an H1 with identical title', () => {
        const blocks: NoteBlock[] = [
          { id: 'b1', type: 'h1', content: 'My Document Title' },
          { id: 'b2', type: 'paragraph', content: 'Intro paragraph' },
        ];
        const md = blocksToMarkdown(blocks, 'My Document Title');
        assert.equal(md, '# My Document Title\n\nIntro paragraph');
      });
    });

    // -------------------------------------------------------------------------
    // 3. Heading 2 Block
    // -------------------------------------------------------------------------
    describe('3. Heading 2 (h2) Block', () => {
      it('should serialize h2 block with ## prefix', () => {
        const blocks: NoteBlock[] = [
          { id: 'b1', type: 'h2', content: 'Database Schema & Design' },
        ];
        const md = blocksToMarkdown(blocks);
        assert.equal(md, '## Database Schema & Design');
      });

      it('should parse ## heading into h2 block', () => {
        const md = '## Key Components';
        const blocks = markdownToBlocks(md);
        assert.equal(blocks.length, 1);
        assert.equal(blocks[0].type, 'h2');
        assert.equal(blocks[0].content, 'Key Components');
      });
    });

    // -------------------------------------------------------------------------
    // 4. Heading 3 Block
    // -------------------------------------------------------------------------
    describe('4. Heading 3 (h3) Block', () => {
      it('should serialize h3 block with ### prefix', () => {
        const blocks: NoteBlock[] = [
          { id: 'b1', type: 'h3', content: 'Secondary Subsection' },
        ];
        const md = blocksToMarkdown(blocks);
        assert.equal(md, '### Secondary Subsection');
      });

      it('should parse ### heading into h3 block', () => {
        const md = '### Microservice Architecture';
        const blocks = markdownToBlocks(md);
        assert.equal(blocks.length, 1);
        assert.equal(blocks[0].type, 'h3');
        assert.equal(blocks[0].content, 'Microservice Architecture');
      });

      it('should map deeper headings (####, #####, ######) gracefully to h3 blocks', () => {
        const md = '#### Deep Section 4\n##### Deep Section 5\n###### Deep Section 6';
        const blocks = markdownToBlocks(md);
        assert.equal(blocks.length, 3);
        assert.equal(blocks[0].type, 'h3');
        assert.equal(blocks[0].content, 'Deep Section 4');
        assert.equal(blocks[1].type, 'h3');
        assert.equal(blocks[1].content, 'Deep Section 5');
        assert.equal(blocks[2].type, 'h3');
        assert.equal(blocks[2].content, 'Deep Section 6');
      });
    });

    // -------------------------------------------------------------------------
    // 5. Interactive To-Do Checkbox Blocks (Checked and Unchecked)
    // -------------------------------------------------------------------------
    describe('5. Interactive To-Do (todo) Blocks', () => {
      it('should serialize unchecked todo with - [ ]', () => {
        const blocks: NoteBlock[] = [
          { id: 'b1', type: 'todo', content: 'Write unit test suite', completed: false },
        ];
        const md = blocksToMarkdown(blocks);
        assert.equal(md, '- [ ] Write unit test suite');
      });

      it('should serialize checked todo with - [x]', () => {
        const blocks: NoteBlock[] = [
          { id: 'b1', type: 'todo', content: 'Deploy to staging', completed: true },
        ];
        const md = blocksToMarkdown(blocks);
        assert.equal(md, '- [x] Deploy to staging');
      });

      it('should parse unchecked todo patterns (- [ ], * [ ], + [ ])', () => {
        const md = '- [ ] Task item A\n* [ ] Task item B\n+ [ ] Task item C';
        const blocks = markdownToBlocks(md);
        assert.equal(blocks.length, 3);
        for (const block of blocks) {
          assert.equal(block.type, 'todo');
          assert.equal(block.completed, false);
        }
        assert.equal(blocks[0].content, 'Task item A');
        assert.equal(blocks[1].content, 'Task item B');
        assert.equal(blocks[2].content, 'Task item C');
      });

      it('should parse checked todo patterns (- [x], - [X], * [x])', () => {
        const md = '- [x] Task completed lower\n- [X] Task completed upper\n* [x] Task star completed';
        const blocks = markdownToBlocks(md);
        assert.equal(blocks.length, 3);
        for (const block of blocks) {
          assert.equal(block.type, 'todo');
          assert.equal(block.completed, true);
        }
        assert.equal(blocks[0].content, 'Task completed lower');
        assert.equal(blocks[1].content, 'Task completed upper');
        assert.equal(blocks[2].content, 'Task star completed');
      });
    });

    // -------------------------------------------------------------------------
    // 6. Bulleted List Block
    // -------------------------------------------------------------------------
    describe('6. Bulleted List (bullet) Block', () => {
      it('should serialize bullet block with - prefix', () => {
        const blocks: NoteBlock[] = [
          { id: 'b1', type: 'bullet', content: 'First bullet point' },
          { id: 'b2', type: 'bullet', content: 'Second bullet point' },
        ];
        const md = blocksToMarkdown(blocks);
        assert.equal(md, '- First bullet point\n- Second bullet point');
      });

      it('should parse -, *, and + list markers into bullet blocks', () => {
        const md = '- Hyphen bullet\n* Asterisk bullet\n+ Plus bullet';
        const blocks = markdownToBlocks(md);
        assert.equal(blocks.length, 3);
        assert.equal(blocks[0].type, 'bullet');
        assert.equal(blocks[0].content, 'Hyphen bullet');
        assert.equal(blocks[1].type, 'bullet');
        assert.equal(blocks[1].content, 'Asterisk bullet');
        assert.equal(blocks[2].type, 'bullet');
        assert.equal(blocks[2].content, 'Plus bullet');
      });
    });

    // -------------------------------------------------------------------------
    // 7. Numbered List Block
    // -------------------------------------------------------------------------
    describe('7. Numbered List (number) Block', () => {
      it('should serialize numbered list with auto-incrementing numbers', () => {
        const blocks: NoteBlock[] = [
          { id: 'b1', type: 'number', content: 'First step' },
          { id: 'b2', type: 'number', content: 'Second step' },
          { id: 'b3', type: 'number', content: 'Third step' },
        ];
        const md = blocksToMarkdown(blocks);
        assert.equal(md, '1. First step\n2. Second step\n3. Third step');
      });

      it('should reset numbering sequence when interrupted by a non-numbered block', () => {
        const blocks: NoteBlock[] = [
          { id: 'b1', type: 'number', content: 'Step 1 of Phase A' },
          { id: 'b2', type: 'number', content: 'Step 2 of Phase A' },
          { id: 'b3', type: 'paragraph', content: 'Phase transition note' },
          { id: 'b4', type: 'number', content: 'Step 1 of Phase B' },
        ];
        const md = blocksToMarkdown(blocks);
        assert.equal(
          md,
          '1. Step 1 of Phase A\n2. Step 2 of Phase A\n\nPhase transition note\n\n1. Step 1 of Phase B'
        );
      });

      it('should parse numbered list items (e.g. 1. , 2. , 10. ) into number blocks', () => {
        const md = '1. Initialize database\n2. Run migrations\n10. Launch service';
        const blocks = markdownToBlocks(md);
        assert.equal(blocks.length, 3);
        assert.equal(blocks[0].type, 'number');
        assert.equal(blocks[0].content, 'Initialize database');
        assert.equal(blocks[1].type, 'number');
        assert.equal(blocks[1].content, 'Run migrations');
        assert.equal(blocks[2].type, 'number');
        assert.equal(blocks[2].content, 'Launch service');
      });
    });

    // -------------------------------------------------------------------------
    // 8. Code Block (Multi-line with Language Tags)
    // -------------------------------------------------------------------------
    describe('8. Code Block (code)', () => {
      it('should serialize code block with language identifier and fences', () => {
        const blocks: NoteBlock[] = [
          {
            id: 'b1',
            type: 'code',
            language: 'typescript',
            content: 'const greet = (name: string): string => {\n  return `Hello, ${name}!`;\n};',
          },
        ];
        const md = blocksToMarkdown(blocks);
        assert.equal(
          md,
          '```typescript\nconst greet = (name: string): string => {\n  return `Hello, ${name}!`;\n};\n```'
        );
      });

      it('should parse multi-line code block extracting language and preserving indentation', () => {
        const md = '```python\ndef calculate_sum(a, b):\n    """Return sum"""\n    return a + b\n```';
        const blocks = markdownToBlocks(md);
        assert.equal(blocks.length, 1);
        assert.equal(blocks[0].type, 'code');
        assert.equal(blocks[0].language, 'python');
        assert.equal(
          blocks[0].content,
          'def calculate_sum(a, b):\n    """Return sum"""\n    return a + b'
        );
      });

      it('should parse code blocks without language tag defaulting to typescript', () => {
        const md = '```\necho "Hello Fox AI"\n```';
        const blocks = markdownToBlocks(md);
        assert.equal(blocks.length, 1);
        assert.equal(blocks[0].type, 'code');
        assert.equal(blocks[0].language, 'typescript');
        assert.equal(blocks[0].content, 'echo "Hello Fox AI"');
      });

      it('should handle unclosed code blocks at end of file gracefully', () => {
        const md = '```rust\nfn main() {\n    println!("Unclosed fence");';
        const blocks = markdownToBlocks(md);
        assert.equal(blocks.length, 1);
        assert.equal(blocks[0].type, 'code');
        assert.equal(blocks[0].language, 'rust');
        assert.equal(blocks[0].content, 'fn main() {\n    println!("Unclosed fence");');
      });
    });

    // -------------------------------------------------------------------------
    // 9. Callout Block with Icons
    // -------------------------------------------------------------------------
    describe('9. Callout Block (callout)', () => {
      it('should serialize callout block with leading icon and quote marker', () => {
        const blocks: NoteBlock[] = [
          { id: 'b1', type: 'callout', calloutIcon: '💡', content: 'Remember to commit changes frequently.' },
          { id: 'b2', type: 'callout', calloutIcon: '⚠️', content: 'Do not modify production databases directly.' },
        ];
        const md = blocksToMarkdown(blocks);
        assert.equal(
          md,
          '> 💡 Remember to commit changes frequently.\n\n> ⚠️ Do not modify production databases directly.'
        );
      });

      it('should parse > [emoji] callout blocks extracting icon and content', () => {
        const md = '> 💡 High performance indexing enabled.\n\n> 🚀 Launch scheduled for Q3.';
        const blocks = markdownToBlocks(md);
        assert.equal(blocks.length, 2);
        assert.equal(blocks[0].type, 'callout');
        assert.equal(blocks[0].calloutIcon, '💡');
        assert.equal(blocks[0].content, 'High performance indexing enabled.');

        assert.equal(blocks[1].type, 'callout');
        assert.equal(blocks[1].calloutIcon, '🚀');
        assert.equal(blocks[1].content, 'Launch scheduled for Q3.');
      });

      it('should parse GitHub alert syntax (> [!NOTE], > [!WARNING], > [!IMPORTANT], > [!TIP])', () => {
        const md = '> [!NOTE] Standard note message\n\n> [!WARNING] Cautionary message\n\n> [!IMPORTANT] Critical alert\n\n> [!TIP] Pro tip';
        const blocks = markdownToBlocks(md);
        assert.equal(blocks.length, 4);

        assert.equal(blocks[0].type, 'callout');
        assert.equal(blocks[0].calloutIcon, '💡');
        assert.equal(blocks[0].content, 'Standard note message');

        assert.equal(blocks[1].type, 'callout');
        assert.equal(blocks[1].calloutIcon, '⚠️');
        assert.equal(blocks[1].content, 'Cautionary message');

        assert.equal(blocks[2].type, 'callout');
        assert.equal(blocks[2].calloutIcon, '🔥');
        assert.equal(blocks[2].content, 'Critical alert');

        assert.equal(blocks[3].type, 'callout');
        assert.equal(blocks[3].calloutIcon, '✨');
        assert.equal(blocks[3].content, 'Pro tip');
      });
    });

    // -------------------------------------------------------------------------
    // 10. Quote Block
    // -------------------------------------------------------------------------
    describe('10. Quote Block (quote)', () => {
      it('should serialize quote block with > prefix without emoji', () => {
        const blocks: NoteBlock[] = [
          { id: 'b1', type: 'quote', content: 'Simplicity is prerequisite for reliability.' },
        ];
        const md = blocksToMarkdown(blocks);
        assert.equal(md, '> Simplicity is prerequisite for reliability.');
      });

      it('should parse standard > quote lines as quote block', () => {
        const md = '> First line of inspirational quote.';
        const blocks = markdownToBlocks(md);
        assert.equal(blocks.length, 1);
        assert.equal(blocks[0].type, 'quote');
        assert.equal(blocks[0].content, 'First line of inspirational quote.');
      });
    });

    // -------------------------------------------------------------------------
    // 11. Divider Block
    // -------------------------------------------------------------------------
    describe('11. Divider Block (divider)', () => {
      it('should serialize divider block to ---', () => {
        const blocks: NoteBlock[] = [
          { id: 'b1', type: 'h1', content: 'Section One' },
          { id: 'b2', type: 'divider', content: '' },
          { id: 'b3', type: 'h1', content: 'Section Two' },
        ];
        const md = blocksToMarkdown(blocks);
        assert.equal(md, '# Section One\n\n---\n\n# Section Two');
      });

      it('should parse ---, ***, and ___ as divider blocks', () => {
        const md = 'Section A\n\n---\n\nSection B\n\n***\n\nSection C\n\n___';
        const blocks = markdownToBlocks(md);
        assert.equal(blocks.length, 6);
        assert.equal(blocks[0].type, 'paragraph');
        assert.equal(blocks[1].type, 'divider');
        assert.equal(blocks[2].type, 'paragraph');
        assert.equal(blocks[3].type, 'divider');
        assert.equal(blocks[4].type, 'paragraph');
        assert.equal(blocks[5].type, 'divider');
      });
    });
  });

  // ===========================================================================
  // TIER 2: BOUNDARY, CORNER CASES & ADVERSARIAL VERIFICATION
  // ===========================================================================
  describe('Tier 2: Boundary, Corner Cases & Adversarial Verification', () => {
    it('should return 1 empty paragraph block when markdown is empty string', () => {
      const blocks = markdownToBlocks('');
      assert.equal(blocks.length, 1);
      assert.equal(blocks[0].type, 'paragraph');
      assert.equal(blocks[0].content, '');
    });

    it('should return 1 empty paragraph block when markdown is whitespace-only', () => {
      const blocks = markdownToBlocks('   \n\n\t  \r\n   ');
      assert.equal(blocks.length, 1);
      assert.equal(blocks[0].type, 'paragraph');
      assert.equal(blocks[0].content, '');
    });

    it('should handle non-string / nullish inputs safely', () => {
      const blocksNull = (markdownToBlocks as any)(null);
      assert.equal(blocksNull.length, 1);
      assert.equal(blocksNull[0].type, 'paragraph');

      const blocksUndefined = (markdownToBlocks as any)(undefined);
      assert.equal(blocksUndefined.length, 1);
      assert.equal(blocksUndefined[0].type, 'paragraph');
    });

    it('should ignore multiple consecutive empty lines between blocks', () => {
      const md = '# Title\n\n\n\n\n\nParagraph text\n\n\n\n\n- [ ] Task 1';
      const blocks = markdownToBlocks(md);
      assert.equal(blocks.length, 3);
      assert.equal(blocks[0].type, 'h1');
      assert.equal(blocks[1].type, 'paragraph');
      assert.equal(blocks[2].type, 'todo');
    });

    it('should preserve nested markdown characters inside code blocks without parsing them', () => {
      const codeWithMarkdown = [
        '# This is not an H1',
        '- [x] This is not a todo',
        '> 💡 This is not a callout',
        '---',
        '1. This is not a numbered list',
      ].join('\n');

      const md = `\`\`\`bash\n${codeWithMarkdown}\n\`\`\``;
      const blocks = markdownToBlocks(md);
      assert.equal(blocks.length, 1);
      assert.equal(blocks[0].type, 'code');
      assert.equal(blocks[0].language, 'bash');
      assert.equal(blocks[0].content, codeWithMarkdown);
    });

    it('should handle multi-byte Unicode emojis in callouts, headings, and paragraphs', () => {
      const md = '# 🦊 Fox Assistant Architecture 🚀\n\n> 🔥 Mission Critical Note\n\nParagraph with ✨ sparkle, 🧑‍💻 developer, and 🎯 target.';
      const blocks = markdownToBlocks(md);
      assert.equal(blocks.length, 3);
      assert.equal(blocks[0].type, 'h1');
      assert.equal(blocks[0].content, '🦊 Fox Assistant Architecture 🚀');

      assert.equal(blocks[1].type, 'callout');
      assert.equal(blocks[1].calloutIcon, '🔥');
      assert.equal(blocks[1].content, 'Mission Critical Note');

      assert.equal(blocks[2].type, 'paragraph');
      assert.equal(blocks[2].content, 'Paragraph with ✨ sparkle, 🧑‍💻 developer, and 🎯 target.');
    });

    it('should handle special punctuation, HTML entities, and math symbols in headings and text', () => {
      const md = '## Special: <Component /> & [Link](https://fox.ai) + 2^10 = 1024 #tag';
      const blocks = markdownToBlocks(md);
      assert.equal(blocks.length, 1);
      assert.equal(blocks[0].type, 'h2');
      assert.equal(blocks[0].content, 'Special: <Component /> & [Link](https://fox.ai) + 2^10 = 1024 #tag');
    });

    it('should generate valid default blocks and initial documents', () => {
      const defaultBlock = createDefaultBlock('todo', 'New action item');
      assert.ok(defaultBlock.id.startsWith('blk_'));
      assert.equal(defaultBlock.type, 'todo');
      assert.equal(defaultBlock.content, 'New action item');
      assert.equal(defaultBlock.completed, false);

      const codeBlock = createDefaultBlock('code');
      assert.equal(codeBlock.type, 'code');
      assert.equal(codeBlock.language, 'typescript');

      const calloutBlock = createDefaultBlock('callout');
      assert.equal(calloutBlock.type, 'callout');
      assert.equal(calloutBlock.calloutIcon, '💡');

      const initialDoc = createInitialDocument('Project Roadmap', '🗺️');
      assert.ok(initialDoc.id.startsWith('doc_'));
      assert.equal(initialDoc.title, 'Project Roadmap');
      assert.equal(initialDoc.emoji, '🗺️');
      assert.equal(initialDoc.blocks.length, 1);
      assert.equal(initialDoc.blocks[0].type, 'paragraph');
      assert.equal(initialDoc.tags.length, 0);
      assert.ok(initialDoc.createdAt > 0);
    });

    it('should extract concise snippets for gallery cards handling dividers and empty blocks', () => {
      const blocks: NoteBlock[] = [
        { id: 'b1', type: 'h1', content: 'Architecture Overview' },
        { id: 'b2', type: 'divider', content: '' },
        { id: 'b3', type: 'paragraph', content: 'Microservices communicate via gRPC.' },
        { id: 'b4', type: 'paragraph', content: 'Data is persisted in PostgreSQL.' },
      ];

      const snippet = extractDocumentSnippet(blocks, 100);
      assert.equal(snippet, 'Architecture Overview · Microservices communicate via gRPC. · Data is persisted in PostgreSQL.');

      const emptySnippet = extractDocumentSnippet([]);
      assert.equal(emptySnippet, 'Empty note');
    });

    it('should calculate accurate document statistics (words, chars, blocks, todos)', () => {
      const blocks: NoteBlock[] = [
        { id: 'b1', type: 'h1', content: 'Task List' },
        { id: 'b2', type: 'todo', content: 'Task 1', completed: true },
        { id: 'b3', type: 'todo', content: 'Task 2', completed: false },
        { id: 'b4', type: 'todo', content: 'Task 3', completed: true },
        { id: 'b5', type: 'todo', content: 'Task 4', completed: false },
        { id: 'b6', type: 'divider', content: '' },
      ];

      const stats = calculateDocumentStats(blocks);
      assert.equal(stats.blockCount, 6);
      assert.equal(stats.todoStats.total, 4);
      assert.equal(stats.todoStats.completed, 2);
      assert.equal(stats.todoStats.percent, 50);
      assert.ok(stats.wordCount > 0);
      assert.ok(stats.charCount > 0);
    });

    it('should duplicate a document with fresh unique IDs and (Copy) title suffix', () => {
      const original: NoteDocument = {
        id: 'doc_orig_123',
        title: 'Sprint Planning',
        emoji: '🎯',
        blocks: [
          { id: 'blk_1', type: 'h1', content: 'Sprint 42 Goals' },
          { id: 'blk_2', type: 'todo', content: 'Complete API integration', completed: true },
        ],
        tags: ['Sprint', 'Engineering'],
        createdAt: 1000,
        updatedAt: 2000,
        pinned: true,
      };

      const clone = duplicateDocument(original);
      assert.notEqual(clone.id, original.id);
      assert.ok(clone.id.startsWith('doc_'));
      assert.equal(clone.title, 'Sprint Planning (Copy)');
      assert.equal(clone.emoji, '🎯');
      assert.equal(clone.tags.length, 2);
      assert.deepEqual(clone.tags, original.tags);
      assert.equal(clone.pinned, false);

      // Verify all block IDs are newly generated
      assert.equal(clone.blocks.length, 2);
      assert.notEqual(clone.blocks[0].id, original.blocks[0].id);
      assert.notEqual(clone.blocks[1].id, original.blocks[1].id);
      assert.equal(clone.blocks[0].content, original.blocks[0].content);
      assert.equal(clone.blocks[1].completed, original.blocks[1].completed);
    });
  });

  // ===========================================================================
  // TIER 3: ROUND-TRIP FIDELITY TESTS
  // ===========================================================================
  describe('Tier 3: Round-Trip Fidelity', () => {
    it('should preserve structure across round-trip for all 11 individual block types', () => {
      const testCases: NoteBlock[][] = [
        [{ id: '1', type: 'paragraph', content: 'Paragraph content' }],
        [{ id: '2', type: 'h1', content: 'Heading 1' }],
        [{ id: '3', type: 'h2', content: 'Heading 2' }],
        [{ id: '4', type: 'h3', content: 'Heading 3' }],
        [{ id: '5', type: 'todo', content: 'Unchecked task', completed: false }],
        [{ id: '6', type: 'todo', content: 'Checked task', completed: true }],
        [{ id: '7', type: 'bullet', content: 'Bullet point' }],
        [{ id: '8', type: 'number', content: 'Numbered item' }],
        [{ id: '9', type: 'code', language: 'python', content: 'print("hello world")' }],
        [{ id: '10', type: 'callout', calloutIcon: '💡', content: 'Callout content' }],
        [{ id: '11', type: 'quote', content: 'Quote content' }],
        [{ id: '12', type: 'divider', content: '' }],
      ];

      for (const blocks of testCases) {
        const md = blocksToMarkdown(blocks);
        const parsed = markdownToBlocks(md);

        assert.equal(parsed.length, blocks.length, `Block count mismatch for ${blocks[0].type}`);
        assert.equal(parsed[0].type, blocks[0].type, `Block type mismatch for ${blocks[0].type}`);
        assert.equal(parsed[0].content, blocks[0].content, `Content mismatch for ${blocks[0].type}`);

        if (blocks[0].type === 'todo') {
          assert.equal(parsed[0].completed, blocks[0].completed);
        }
        if (blocks[0].type === 'code') {
          assert.equal(parsed[0].language, blocks[0].language);
        }
        if (blocks[0].type === 'callout') {
          assert.equal(parsed[0].calloutIcon, blocks[0].calloutIcon);
        }
      }
    });

    it('should preserve a comprehensive multi-block document with all 11 block types in sequence', () => {
      const complexDocument: NoteBlock[] = [
        { id: '1', type: 'h1', content: 'Engineering Master Plan' },
        { id: '2', type: 'paragraph', content: 'Welcome to the complete Notion notes tool specification.' },
        { id: '3', type: 'h2', content: 'Key Objectives' },
        { id: '4', type: 'bullet', content: 'Deliver fast interactive editing' },
        { id: '5', type: 'bullet', content: 'Guarantee bidirectional sync with voice notes' },
        { id: '6', type: 'h3', content: 'Implementation Steps' },
        { id: '7', type: 'number', content: 'Design TypeScript schemas' },
        { id: '8', type: 'number', content: 'Implement Markdown serializer engine' },
        { id: '9', type: 'divider', content: '' },
        { id: '10', type: 'callout', calloutIcon: '💡', content: 'Remember to run full test suite before merge.' },
        { id: '11', type: 'quote', content: 'Code is written for humans to read, and only incidentally for machines to execute.' },
        { id: '12', type: 'todo', content: 'Verify Tier 1 test coverage', completed: true },
        { id: '13', type: 'todo', content: 'Verify Tier 2 boundary cases', completed: false },
        {
          id: '14',
          type: 'code',
          language: 'typescript',
          content: 'export function runEngine(): boolean {\n  return true;\n}',
        },
      ];

      const serialized = blocksToMarkdown(complexDocument);
      const reconstructed = markdownToBlocks(serialized);

      assert.equal(reconstructed.length, complexDocument.length);

      for (let i = 0; i < complexDocument.length; i++) {
        const expected = complexDocument[i];
        const actual = reconstructed[i];

        assert.equal(actual.type, expected.type, `Index ${i} type mismatch`);
        assert.equal(actual.content, expected.content, `Index ${i} content mismatch`);

        if (expected.type === 'todo') {
          assert.equal(actual.completed, expected.completed, `Index ${i} todo completion mismatch`);
        }
        if (expected.type === 'code') {
          assert.equal(actual.language, expected.language, `Index ${i} code language mismatch`);
        }
        if (expected.type === 'callout') {
          assert.equal(actual.calloutIcon, expected.calloutIcon, `Index ${i} callout icon mismatch`);
        }
      }
    });

    it('should be idempotent across double serialization: serialize(parse(serialize(blocks))) == serialize(blocks)', () => {
      const blocks: NoteBlock[] = [
        { id: '1', type: 'h1', content: 'Idempotency Verification' },
        { id: '2', type: 'paragraph', content: 'Ensuring serialization stability.' },
        { id: '3', type: 'todo', content: 'Check state stability', completed: true },
        { id: '4', type: 'code', language: 'json', content: '{\n  "status": "stable"\n}' },
        { id: '5', type: 'callout', calloutIcon: '🚀', content: 'Production ready!' },
      ];

      const pass1 = blocksToMarkdown(blocks);
      const parsed1 = markdownToBlocks(pass1);
      const pass2 = blocksToMarkdown(parsed1);
      const parsed2 = markdownToBlocks(pass2);
      const pass3 = blocksToMarkdown(parsed2);

      assert.equal(pass1, pass2);
      assert.equal(pass2, pass3);
    });
  });
});
