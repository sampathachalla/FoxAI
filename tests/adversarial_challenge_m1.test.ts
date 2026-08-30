/**
 * Comprehensive Adversarial & Empirical Stress Test Suite for Milestone 1
 * File: tests/adversarial_challenge_m1.test.ts
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import type { BlockType, NoteBlock, NoteDocument } from '../app/components/notse/notseTypes.ts';
import {
  blocksToMarkdown,
  markdownToBlocks,
  createDefaultBlock,
  createInitialDocument,
  extractDocumentSnippet,
  calculateDocumentStats,
  duplicateDocument,
} from '../app/components/notse/markdownUtils.ts';

describe('Adversarial Challenge M1 Test Suite', () => {

  // =========================================================================
  // 1. CODE BLOCK PARSING & LANGUAGE TAGS
  // =========================================================================
  describe('1. Code Block Parsing & Language Tags', () => {
    it('should parse code blocks with standard alphanumeric language tags', () => {
      const langs = ['typescript', 'python', 'rust', 'json_schema', 'sh', 'javascript-1'];
      for (const lang of langs) {
        const md = `\`\`\`${lang}\nconsole.log("Code block");\n\`\`\``;
        const blocks = markdownToBlocks(md);
        assert.equal(blocks.length, 1);
        assert.equal(blocks[0].type, 'code');
        assert.equal(blocks[0].language, lang);
      }
    });

    it('empirical observation: language tag regex [a-zA-Z0-9_-]* truncates plus/hash symbols (e.g. c++, c#)', () => {
      const mdCpp = '```c++\nint main() { return 0; }\n```';
      const blocksCpp = markdownToBlocks(mdCpp);
      assert.equal(blocksCpp[0].type, 'code');
      // The current regex ^```([a-zA-Z0-9_-]*) parses 'c++' as 'c'
      assert.equal(blocksCpp[0].language, 'c');

      const mdCSharp = '```c#\nConsole.WriteLine("Hello");\n```';
      const blocksCSharp = markdownToBlocks(mdCSharp);
      assert.equal(blocksCSharp[0].type, 'code');
      // The current regex ^```([a-zA-Z0-9_-]*) parses 'c#' as 'c'
      assert.equal(blocksCSharp[0].language, 'c');
    });

    it('should handle unclosed code blocks at EOF with default language', () => {
      const md = '```typescript\nconsole.log("Unclosed at EOF");';
      const blocks = markdownToBlocks(md);
      assert.equal(blocks.length, 1);
      assert.equal(blocks[0].type, 'code');
      assert.equal(blocks[0].language, 'typescript');
      assert.equal(blocks[0].content, 'console.log("Unclosed at EOF");');
    });

    it('should handle code blocks containing inline backticks, template literals, and markdown markers', () => {
      const codeContent = 'const template = `Hello ${name}`;\n// # This is a comment\n// - [ ] Not a todo\nconst backtick = "`test`";';
      const md = `\`\`\`javascript\n${codeContent}\n\`\`\``;
      const blocks = markdownToBlocks(md);
      assert.equal(blocks.length, 1);
      assert.equal(blocks[0].type, 'code');
      assert.equal(blocks[0].content, codeContent);
    });

    it('empirical observation: code block containing closing fence ``` inside string closes early', () => {
      // When code content contains a line with exactly ```, markdownToBlocks closes the code block
      const md = '```javascript\nconst a = 1;\n```\nconst b = 2;\n```';
      const blocks = markdownToBlocks(md);
      assert.equal(blocks.length, 3);
      assert.equal(blocks[0].type, 'code');
      assert.equal(blocks[0].content, 'const a = 1;');
      assert.equal(blocks[1].type, 'paragraph');
      assert.equal(blocks[1].content, 'const b = 2;');
      assert.equal(blocks[2].type, 'code');
      assert.equal(blocks[2].content, '');
    });

    it('should handle massive code blocks (10,000 lines) with high performance', () => {
      const largeLines = Array.from({ length: 10000 }, (_, i) => `const line_${i} = ${i};`);
      const rawCode = largeLines.join('\n');
      const md = `\`\`\`typescript\n${rawCode}\n\`\`\``;
      
      const t0 = performance.now();
      const blocks = markdownToBlocks(md);
      const parseTime = performance.now() - t0;

      assert.equal(blocks.length, 1);
      assert.equal(blocks[0].type, 'code');
      assert.equal(blocks[0].content, rawCode);
      assert.ok(parseTime < 200, `Parsing 10k lines took too long: ${parseTime}ms`);
    });
  });

  // =========================================================================
  // 2. TODO BLOCKS WITH WEIRD SPACING & FORMATTING
  // =========================================================================
  describe('2. Todo Blocks with Weird Spacing & Formatting', () => {
    it('should parse standard and irregular checkbox spacing correctly', () => {
      const testCases = [
        { md: '- [ ] Standard unchecked', type: 'todo', completed: false, content: 'Standard unchecked' },
        { md: '- [x] Standard checked', type: 'todo', completed: true, content: 'Standard checked' },
        { md: '- [X] Capital X checked', type: 'todo', completed: true, content: 'Capital X checked' },
        { md: '-  [x] Double space before bracket', type: 'todo', completed: true, content: 'Double space before bracket' },
        { md: '-   [ ] Triple space before bracket', type: 'todo', completed: false, content: 'Triple space before bracket' },
        { md: '- [  ] Multiple spaces inside bracket', type: 'todo', completed: false, content: 'Multiple spaces inside bracket' },
        { md: '- [] Empty bracket no space', type: 'todo', completed: false, content: 'Empty bracket no space' },
        { md: '* [ ] Asterisk unchecked', type: 'todo', completed: false, content: 'Asterisk unchecked' },
        { md: '* [x] Asterisk checked', type: 'todo', completed: true, content: 'Asterisk checked' },
        { md: '+ [ ] Plus unchecked', type: 'todo', completed: false, content: 'Plus unchecked' },
        { md: '+ [x] Plus checked', type: 'todo', completed: true, content: 'Plus checked' },
        { md: '- [ ]   Task with leading spaces', type: 'todo', completed: false, content: 'Task with leading spaces' },
      ];

      for (const tc of testCases) {
        const blocks = markdownToBlocks(tc.md);
        assert.equal(blocks.length, 1, `Failed block count on "${tc.md}"`);
        assert.equal(blocks[0].type, tc.type, `Failed type on "${tc.md}"`);
        assert.equal(blocks[0].completed, tc.completed, `Failed completed state on "${tc.md}"`);
        assert.equal(blocks[0].content, tc.content, `Failed content on "${tc.md}"`);
      }
    });

    it('should handle empty todo tasks', () => {
      const md = '- [ ]\n- [x]';
      const blocks = markdownToBlocks(md);
      assert.equal(blocks.length, 2);
      assert.equal(blocks[0].type, 'todo');
      assert.equal(blocks[0].content, '');
      assert.equal(blocks[0].completed, false);
      assert.equal(blocks[1].type, 'todo');
      assert.equal(blocks[1].content, '');
      assert.equal(blocks[1].completed, true);
    });

    it('should parse non-standard todo marks (like - [v]) as bullet lists without crashing', () => {
      const md = '- [v] Checkmark with letter v\n- [-] Hyphen inside bracket\n- [?] Question mark';
      const blocks = markdownToBlocks(md);
      assert.equal(blocks.length, 3);
      for (const b of blocks) {
        assert.equal(b.type, 'bullet');
      }
      assert.equal(blocks[0].content, '[v] Checkmark with letter v');
      assert.equal(blocks[1].content, '[-] Hyphen inside bracket');
      assert.equal(blocks[2].content, '[?] Question mark');
    });

    it('should preserve nested markdown characters inside todo content', () => {
      const md = '- [ ] Review PR for `const x = [1, 2, 3]` and **bold title**';
      const blocks = markdownToBlocks(md);
      assert.equal(blocks.length, 1);
      assert.equal(blocks[0].type, 'todo');
      assert.equal(blocks[0].completed, false);
      assert.equal(blocks[0].content, 'Review PR for `const x = [1, 2, 3]` and **bold title**');
    });
  });

  // =========================================================================
  // 3. CALLOUT BLOCKS & EMOJI VARIATIONS
  // =========================================================================
  describe('3. Callout Blocks & Emoji Variations', () => {
    it('should parse GitHub Alert variations (NOTE, TIP, IMPORTANT, WARNING, CAUTION) case-insensitively', () => {
      const alerts = [
        { md: '> [!NOTE] This is a note', icon: '💡', content: 'This is a note' },
        { md: '> [!note] Lowercase note', icon: '💡', content: 'Lowercase note' },
        { md: '> [!TIP] Pro tip here', icon: '✨', content: 'Pro tip here' },
        { md: '> [!tip] Lowercase tip', icon: '✨', content: 'Lowercase tip' },
        { md: '> [!IMPORTANT] Crucial point', icon: '🔥', content: 'Crucial point' },
        { md: '> [!WARNING] Danger ahead', icon: '⚠️', content: 'Danger ahead' },
        { md: '> [!CAUTION] Exercise caution', icon: '⚠️', content: 'Exercise caution' },
      ];

      for (const a of alerts) {
        const blocks = markdownToBlocks(a.md);
        assert.equal(blocks.length, 1, `Failed count on: ${a.md}`);
        assert.equal(blocks[0].type, 'callout');
        assert.equal(blocks[0].calloutIcon, a.icon);
        assert.equal(blocks[0].content, a.content);
      }
    });

    it('should parse single emoji callout icons', () => {
      const emojis = ['💡', '🚀', '🔥', '✨', '📌', '📝', '🎯', '🎉', '🧠'];
      for (const emoji of emojis) {
        const md = `> ${emoji} Important system information`;
        const blocks = markdownToBlocks(md);
        assert.equal(blocks.length, 1, `Failed on emoji: ${emoji}`);
        assert.equal(blocks[0].type, 'callout');
        assert.ok(blocks[0].calloutIcon);
        assert.equal(blocks[0].content, 'Important system information');
      }
    });

    it('empirical observation: complex multi-codepoint emojis (skin tones, ZWJ sequences) have graphemes split across icon and content', () => {
      // Skin tone modifier: 👍🏽 (\uD83D\uDC4D + \uD83C\uDFFD)
      const mdSkinTone = '> 👍🏽 Thumbs up callout';
      const blocksSkin = markdownToBlocks(mdSkinTone);
      assert.equal(blocksSkin[0].type, 'callout');
      // The single-codepoint regex extracts 👍 as icon and leaves 🏽 in content
      assert.equal(blocksSkin[0].calloutIcon, '👍');
      assert.equal(blocksSkin[0].content, '🏽 Thumbs up callout');

      // ZWJ family sequence: 👨‍👩‍👧‍👦
      const mdFamily = '> 👨‍👩‍👧‍👦 Family note';
      const blocksFamily = markdownToBlocks(mdFamily);
      assert.equal(blocksFamily[0].type, 'callout');
      assert.equal(blocksFamily[0].calloutIcon, '👨');
      assert.ok(blocksFamily[0].content.includes('Family note'));
    });

    it('should distinguish between callouts and regular blockquotes', () => {
      const regularQuotes = [
        '> Plain quote text without emoji',
        '> "Direct speech inside quotes"',
        '> 1. Number inside quote',
        '> - Bullet inside quote',
        '> # Hashtag inside quote',
      ];

      for (const q of regularQuotes) {
        const blocks = markdownToBlocks(q);
        assert.equal(blocks.length, 1, `Failed quote parsing for: ${q}`);
        assert.equal(blocks[0].type, 'quote');
      }
    });
  });

  // =========================================================================
  // 4. ADVERSARIAL STRINGS, UNICODE, NULLS & SPECIAL PAYLOADS
  // =========================================================================
  describe('4. Adversarial Strings, Unicode, Nulls & Special Payloads', () => {
    it('should handle null bytes and control characters without crashing', () => {
      const mdWithNulls = '# Title\x00WithNull\n\nParagraph\x01with\x02control\x03chars\n\n- [ ] Task\x00Null';
      const blocks = markdownToBlocks(mdWithNulls);
      assert.equal(blocks.length, 3);
      assert.equal(blocks[0].type, 'h1');
      assert.equal(blocks[1].type, 'paragraph');
      assert.equal(blocks[2].type, 'todo');

      const serialized = blocksToMarkdown(blocks);
      assert.ok(typeof serialized === 'string');
    });

    it('should handle HTML and script injection payloads without executing or corrupting structure', () => {
      const xssPayload = '<script>alert("xss")</script><img src=x onerror=alert(1) />';
      const md = `# Header ${xssPayload}\n\n${xssPayload}\n\n- [ ] Todo with ${xssPayload}`;
      const blocks = markdownToBlocks(md);

      assert.equal(blocks.length, 3);
      assert.equal(blocks[0].type, 'h1');
      assert.ok(blocks[0].content.includes(xssPayload));
      assert.equal(blocks[1].type, 'paragraph');
      assert.ok(blocks[1].content.includes(xssPayload));
      assert.equal(blocks[2].type, 'todo');
      assert.ok(blocks[2].content.includes(xssPayload));

      const serialized = blocksToMarkdown(blocks);
      const reParsed = markdownToBlocks(serialized);
      assert.equal(reParsed[0].content, blocks[0].content);
      assert.equal(reParsed[1].content, blocks[1].content);
      assert.equal(reParsed[2].content, blocks[2].content);
    });

    it('should handle prototype pollution keys safely in document content, languages, and tags', () => {
      const pollutionKeys = ['__proto__', 'constructor', 'prototype', 'toString', 'valueOf'];
      for (const key of pollutionKeys) {
        const doc = createInitialDocument(key, '📝');
        doc.tags.push(key);
        doc.blocks.push({
          id: `blk_${key}`,
          type: 'code',
          language: key,
          content: `const ${key} = {};`,
        });

        const serialized = blocksToMarkdown(doc.blocks, doc.title);
        const reconstructed = markdownToBlocks(serialized);
        assert.ok(reconstructed.length >= 2);

        const dup = duplicateDocument(doc);
        assert.ok(dup.id);
        assert.equal(dup.title, `${key} (Copy)`);
        assert.ok(dup.tags.includes(key));
      }
    });

    it('should handle RTL (Hebrew, Arabic) and international scripts', () => {
      const arabicText = 'مرحبا بكم في تطبيق الملاحظات';
      const hebrewText = 'ברוכים הבאים לכלי ההערות';
      const cjkText = '🦊 Fox AI 智能笔记系统 — 高性能 Markdown 序列化引擎';

      const md = `# ${cjkText}\n\n${arabicText}\n\n> 💡 ${hebrewText}\n\n- [x] ${cjkText}`;
      const blocks = markdownToBlocks(md);

      assert.equal(blocks.length, 4);
      assert.equal(blocks[0].type, 'h1');
      assert.equal(blocks[0].content, cjkText);
      assert.equal(blocks[1].type, 'paragraph');
      assert.equal(blocks[1].content, arabicText);
      assert.equal(blocks[2].type, 'callout');
      assert.equal(blocks[2].content, hebrewText);
      assert.equal(blocks[3].type, 'todo');
      assert.equal(blocks[3].content, cjkText);
      assert.equal(blocks[3].completed, true);
    });

    it('should handle extreme text length (100,000 chars) in single paragraph and stats calculation', () => {
      const longText = 'FoxAI '.repeat(20000); // 120,000 chars
      const blocks: NoteBlock[] = [{ id: 'b1', type: 'paragraph', content: longText }];

      const t0 = performance.now();
      const stats = calculateDocumentStats(blocks);
      const snippet = extractDocumentSnippet(blocks, 150);
      const duration = performance.now() - t0;

      assert.equal(stats.wordCount, 20000);
      assert.equal(stats.charCount, 120000);
      assert.equal(stats.blockCount, 1);
      assert.ok(snippet.length <= 153);
      assert.ok(snippet.endsWith('...'));
      assert.ok(duration < 50, `Stats calculation took too long: ${duration}ms`);
    });
  });

  // =========================================================================
  // 5. ROUND-TRIP FIDELITY & IDEMPOTENCY ACROSS ALL 11 BLOCK TYPES
  // =========================================================================
  describe('5. Round-Trip Fidelity & Idempotency Across All 11 Block Types', () => {
    it('should maintain exact fidelity for all 11 block types with realistic document contents', () => {
      const fullSuiteBlocks: NoteBlock[] = [
        { id: '1', type: 'h1', content: 'Master Architecture Specification' },
        { id: '2', type: 'paragraph', content: 'This is the initial overview paragraph with inline `code` and **bold**.' },
        { id: '3', type: 'h2', content: 'Core Components & Schema' },
        { id: '4', type: 'bullet', content: 'Real-time synchronization engine' },
        { id: '5', type: 'bullet', content: 'Polymorphic block keyboard navigation' },
        { id: '6', type: 'h3', content: 'Actionable Checklist' },
        { id: '7', type: 'todo', content: 'Implement Markdown serialization engine', completed: true },
        { id: '8', type: 'todo', content: 'Verify Tier 1-5 test coverage', completed: false },
        { id: '9', type: 'number', content: 'Clone repository and install dependencies' },
        { id: '10', type: 'number', content: 'Run development test harness' },
        { id: '11', type: 'divider', content: '' },
        { id: '12', type: 'callout', calloutIcon: '💡', content: 'Remember to verify all edge cases thoroughly.' },
        { id: '13', type: 'quote', content: 'Simplicity is a prerequisite for reliability. — Edsger W. Dijkstra' },
        {
          id: '14',
          type: 'code',
          language: 'typescript',
          content: 'export function verifySystem(): boolean {\n  return true;\n}',
        },
      ];

      const serialized = blocksToMarkdown(fullSuiteBlocks);
      const parsed = markdownToBlocks(serialized);

      assert.equal(parsed.length, fullSuiteBlocks.length, 'Parsed block count mismatch');

      for (let i = 0; i < fullSuiteBlocks.length; i++) {
        const original = fullSuiteBlocks[i];
        const reconstructed = parsed[i];

        assert.equal(reconstructed.type, original.type, `Block ${i} type mismatch: ${original.type}`);
        assert.equal(reconstructed.content, original.content, `Block ${i} content mismatch: ${original.type}`);

        if (original.type === 'todo') {
          assert.equal(reconstructed.completed, original.completed, `Block ${i} todo completed mismatch`);
        }
        if (original.type === 'code') {
          assert.equal(reconstructed.language, original.language, `Block ${i} code language mismatch`);
        }
        if (original.type === 'callout') {
          assert.equal(reconstructed.calloutIcon, original.calloutIcon, `Block ${i} callout icon mismatch`);
        }
      }
    });

    it('should satisfy idempotency: blocksToMarkdown(markdownToBlocks(blocksToMarkdown(blocks))) === blocksToMarkdown(blocks)', () => {
      const complexDoc: NoteBlock[] = [
        { id: '1', type: 'h1', content: 'Idempotency Verification' },
        { id: '2', type: 'paragraph', content: 'Body paragraph with numbers 123 and symbols !@#$%^&*()' },
        { id: '3', type: 'h2', content: 'Sub section' },
        { id: '4', type: 'todo', content: 'Task 1', completed: true },
        { id: '5', type: 'todo', content: 'Task 2', completed: false },
        { id: '6', type: 'bullet', content: 'Bullet item 1' },
        { id: '7', type: 'bullet', content: 'Bullet item 2' },
        { id: '8', type: 'number', content: 'Ordered 1' },
        { id: '9', type: 'number', content: 'Ordered 2' },
        { id: '10', type: 'code', language: 'python', content: 'def foo():\n    return "bar"' },
        { id: '11', type: 'callout', calloutIcon: '🚀', content: 'Fast performance' },
        { id: '12', type: 'quote', content: 'Wise words' },
        { id: '13', type: 'divider', content: '' },
      ];

      const pass1 = blocksToMarkdown(complexDoc);
      const parsed1 = markdownToBlocks(pass1);
      const pass2 = blocksToMarkdown(parsed1);
      const parsed2 = markdownToBlocks(pass2);
      const pass3 = blocksToMarkdown(parsed2);

      assert.equal(pass1, pass2);
      assert.equal(pass2, pass3);
      assert.equal(parsed1.length, parsed2.length);
    });
  });

  // =========================================================================
  // 6. PROPERTY-BASED RANDOMIZED FUZZING HARNESS (1,000 PERMUTATIONS)
  // =========================================================================
  describe('6. Property-Based Randomized Fuzzing Harness', () => {
    const BLOCK_TYPES: BlockType[] = [
      'paragraph', 'h1', 'h2', 'h3', 'todo', 'bullet', 'number', 'code', 'callout', 'quote', 'divider'
    ];
    const LANGUAGES = ['typescript', 'javascript', 'python', 'rust', 'go', 'bash', 'json', 'html', 'css', 'sql'];
    const CALLOUT_ICONS = ['💡', '⚠️', '🚀', '🔥', '✨', '📌', '📝', '⚡️', '🎯', '🎉'];

    function randomString(length: number): string {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 _-+=!@#$%^&*()[]{}|;:,.<>?';
      let res = '';
      for (let i = 0; i < length; i++) {
        res += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return res;
    }

    function generateRandomBlock(i: number): NoteBlock {
      const type = BLOCK_TYPES[Math.floor(Math.random() * BLOCK_TYPES.length)];
      const block: NoteBlock = {
        id: `blk_fuzz_${i}_${Math.random().toString(36).slice(2, 7)}`,
        type,
        content: type === 'divider' ? '' : randomString(Math.floor(Math.random() * 50) + 1),
      };

      if (type === 'todo') {
        block.completed = Math.random() > 0.5;
      } else if (type === 'code') {
        block.language = LANGUAGES[Math.floor(Math.random() * LANGUAGES.length)];
        block.content = `const v = ${Math.floor(Math.random() * 100)};\nreturn v;`;
      } else if (type === 'callout') {
        block.calloutIcon = CALLOUT_ICONS[Math.floor(Math.random() * CALLOUT_ICONS.length)];
      }

      return block;
    }

    it('should survive 1,000 randomized document permutations without crashes or corruption', () => {
      const totalIterations = 1000;
      let totalBlocksTested = 0;

      for (let iter = 0; iter < totalIterations; iter++) {
        const blockCount = Math.floor(Math.random() * 15) + 1;
        const blocks: NoteBlock[] = [];
        for (let b = 0; b < blockCount; b++) {
          blocks.push(generateRandomBlock(b));
        }
        totalBlocksTested += blockCount;

        const docTitle = iter % 2 === 0 ? `Fuzz Document #${iter}` : undefined;
        
        // 1. Serialize
        const markdown = blocksToMarkdown(blocks, docTitle);
        assert.ok(typeof markdown === 'string', `Iteration ${iter} serialization produced non-string`);

        // 2. Parse back
        const parsed = markdownToBlocks(markdown);
        assert.ok(Array.isArray(parsed), `Iteration ${iter} parse did not return array`);
        assert.ok(parsed.length > 0, `Iteration ${iter} parsed empty block array`);

        // 3. Stats and Snippets
        const stats = calculateDocumentStats(parsed);
        assert.ok(typeof stats.wordCount === 'number');
        assert.ok(typeof stats.charCount === 'number');
        assert.ok(typeof stats.blockCount === 'number');
        assert.ok(stats.todoStats.total >= stats.todoStats.completed);

        const snippet = extractDocumentSnippet(parsed, 100);
        assert.ok(typeof snippet === 'string');

        // 4. Duplicate
        const tempDoc: NoteDocument = {
          id: `doc_fuzz_${iter}`,
          title: docTitle || 'Untitled Fuzz',
          emoji: '🧪',
          blocks: parsed,
          tags: ['Fuzz', `Iter_${iter}`],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        const dup = duplicateDocument(tempDoc);
        assert.notEqual(dup.id, tempDoc.id);
        assert.equal(dup.blocks.length, parsed.length);
      }

      assert.ok(totalBlocksTested > 5000, `Fuzzed ${totalBlocksTested} blocks successfully`);
    });
  });
});
