/**
 * Exhaustive Test Suite for Notion-Feel Notes Tool Engine
 * File: app/components/notse/__tests__/notseEngine.test.ts
 *
 * Tests:
 * 1. Block operations (add, update, delete, reorder, toggle todo status, split block)
 * 2. Search filtering logic (matching title, content, tags, case-insensitivity, adversarial regex special characters)
 * 3. Tag extraction, sanitization, and multi-tag filtering across documents
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import type { BlockType, NoteBlock, NoteDocument } from '../notseTypes.ts';
import {
  createDefaultBlock,
  createInitialDocument,
  generateBlockId,
  duplicateDocument,
} from '../markdownUtils.ts';

// ============================================================================
// Core Pure Notse Engine Logic
// ============================================================================

export function sanitizeTag(rawTag: string): string {
  if (!rawTag || typeof rawTag !== 'string') return '';
  return rawTag.trim().replace(/^#+/, '').trim();
}

export function addBlock(
  doc: NoteDocument,
  block: NoteBlock,
  targetBlockId?: string,
  position: 'after' | 'before' | 'append' = 'after'
): NoteDocument {
  const blocks = [...doc.blocks];
  const now = Date.now();

  if (!targetBlockId || position === 'append') {
    blocks.push(block);
    return { ...doc, blocks, updatedAt: now };
  }

  const targetIndex = blocks.findIndex((b) => b.id === targetBlockId);
  if (targetIndex === -1) {
    blocks.push(block);
    return { ...doc, blocks, updatedAt: now };
  }

  const insertIndex = position === 'before' ? targetIndex : targetIndex + 1;
  blocks.splice(insertIndex, 0, block);
  return { ...doc, blocks, updatedAt: now };
}

export function updateBlock(
  doc: NoteDocument,
  blockId: string,
  updates: Partial<NoteBlock>
): NoteDocument {
  const targetIndex = doc.blocks.findIndex((b) => b.id === blockId);
  if (targetIndex === -1) return doc;

  const now = Date.now();
  const updatedBlocks = [...doc.blocks];
  updatedBlocks[targetIndex] = {
    ...updatedBlocks[targetIndex],
    ...updates,
  };

  return {
    ...doc,
    blocks: updatedBlocks,
    updatedAt: now,
  };
}

export function deleteBlock(doc: NoteDocument, blockId: string): NoteDocument {
  const filtered = doc.blocks.filter((b) => b.id !== blockId);
  const now = Date.now();

  // Preserves at least 1 default empty paragraph block in document (never 0 blocks)
  if (filtered.length === 0) {
    return {
      ...doc,
      blocks: [createDefaultBlock('paragraph', '')],
      updatedAt: now,
    };
  }

  return {
    ...doc,
    blocks: filtered,
    updatedAt: now,
  };
}

export function reorderBlocks(
  doc: NoteDocument,
  fromIndex: number,
  toIndex: number
): NoteDocument {
  if (
    fromIndex < 0 ||
    fromIndex >= doc.blocks.length ||
    toIndex < 0 ||
    toIndex >= doc.blocks.length ||
    fromIndex === toIndex
  ) {
    return doc;
  }

  const now = Date.now();
  const blocks = [...doc.blocks];
  const [movedBlock] = blocks.splice(fromIndex, 1);
  blocks.splice(toIndex, 0, movedBlock);

  return {
    ...doc,
    blocks,
    updatedAt: now,
  };
}

export function toggleTodo(doc: NoteDocument, blockId: string): NoteDocument {
  const targetIndex = doc.blocks.findIndex((b) => b.id === blockId);
  if (targetIndex === -1) return doc;

  const targetBlock = doc.blocks[targetIndex];
  if (targetBlock.type !== 'todo') return doc;

  const now = Date.now();
  const updatedBlocks = [...doc.blocks];
  updatedBlocks[targetIndex] = {
    ...targetBlock,
    completed: !targetBlock.completed,
  };

  return {
    ...doc,
    blocks: updatedBlocks,
    updatedAt: now,
  };
}

export function splitBlock(
  doc: NoteDocument,
  blockId: string,
  splitOffset: number,
  newType: BlockType = 'paragraph'
): NoteDocument {
  const targetIndex = doc.blocks.findIndex((b) => b.id === blockId);
  if (targetIndex === -1) return doc;

  const current = doc.blocks[targetIndex];
  const firstPart = current.content.substring(0, splitOffset);
  const secondPart = current.content.substring(splitOffset);

  const updatedCurrent: NoteBlock = { ...current, content: firstPart };
  const newBlock: NoteBlock = createDefaultBlock(newType, secondPart);

  const blocks = [...doc.blocks];
  blocks[targetIndex] = updatedCurrent;
  blocks.splice(targetIndex + 1, 0, newBlock);

  return {
    ...doc,
    blocks,
    updatedAt: Date.now(),
  };
}

export function matchesSearch(doc: NoteDocument, rawQuery: string): boolean {
  if (!rawQuery || typeof rawQuery !== 'string') return true;
  const query = rawQuery.trim().toLowerCase();
  if (!query) return true;

  // Title match
  if (doc.title && doc.title.toLowerCase().includes(query)) {
    return true;
  }

  // Tag match (with or without # prefix)
  const tagQuery = query.replace(/^#+/, '');
  if (doc.tags && doc.tags.some((t) => t.toLowerCase().includes(tagQuery))) {
    return true;
  }

  // Content match across all blocks
  for (const block of doc.blocks) {
    if (block.content && block.content.toLowerCase().includes(query)) {
      return true;
    }
  }

  return false;
}

export function filterNotesBySearch(
  notes: NoteDocument[],
  query: string
): NoteDocument[] {
  return notes.filter((doc) => matchesSearch(doc, query));
}

export function extractAllTags(notes: NoteDocument[]): string[] {
  const tagMap = new Map<string, string>(); // lowerCase -> displayFormat

  for (const note of notes) {
    if (!note.tags || !Array.isArray(note.tags)) continue;
    for (const rawTag of note.tags) {
      const sanitized = sanitizeTag(rawTag);
      if (sanitized) {
        const lower = sanitized.toLowerCase();
        if (!tagMap.has(lower)) {
          tagMap.set(lower, sanitized);
        }
      }
    }
  }

  return Array.from(tagMap.values()).sort((a, b) =>
    a.toLowerCase().localeCompare(b.toLowerCase())
  );
}

export function filterNotesByTag(
  notes: NoteDocument[],
  targetTag: string | null
): NoteDocument[] {
  if (!targetTag || targetTag.trim() === '' || targetTag.toLowerCase() === 'all') {
    return notes;
  }

  const cleanTarget = sanitizeTag(targetTag).toLowerCase();
  return notes.filter(
    (doc) =>
      doc.tags &&
      doc.tags.some((t) => sanitizeTag(t).toLowerCase() === cleanTarget)
  );
}

export function addTagToDocument(
  doc: NoteDocument,
  rawTag: string
): NoteDocument {
  const sanitized = sanitizeTag(rawTag);
  if (!sanitized) return doc;

  const currentTags = doc.tags || [];
  const lowerNew = sanitized.toLowerCase();
  const alreadyExists = currentTags.some(
    (t) => sanitizeTag(t).toLowerCase() === lowerNew
  );

  if (alreadyExists) return doc;

  return {
    ...doc,
    tags: [...currentTags, sanitized],
    updatedAt: Date.now(),
  };
}

export function removeTagFromDocument(
  doc: NoteDocument,
  rawTag: string
): NoteDocument {
  const cleanTarget = sanitizeTag(rawTag).toLowerCase();
  const currentTags = doc.tags || [];
  const filtered = currentTags.filter(
    (t) => sanitizeTag(t).toLowerCase() !== cleanTarget
  );

  return {
    ...doc,
    tags: filtered,
    updatedAt: Date.now(),
  };
}

// ============================================================================
// TEST SUITE
// ============================================================================

describe('NotseEngine Test Suite', () => {
  // ---------------------------------------------------------------------------
  // 1. Block Operations
  // ---------------------------------------------------------------------------
  describe('1. Block Operations (Add, Update, Delete, Reorder, Toggle Todo, Split)', () => {
    it('should append a new block to the end of document when no target is provided', () => {
      const doc = createInitialDocument('My Doc', '📝');
      assert.equal(doc.blocks.length, 1);

      const newBlock = createDefaultBlock('h1', 'New Heading');
      const updated = addBlock(doc, newBlock);

      assert.equal(updated.blocks.length, 2);
      assert.equal(updated.blocks[1].id, newBlock.id);
      assert.equal(updated.blocks[1].content, 'New Heading');
      assert.ok(updated.updatedAt >= doc.updatedAt);
    });

    it('should insert a new block immediately after a target block ID', () => {
      const doc = createInitialDocument('Doc', '📝');
      const b1 = doc.blocks[0];
      const b2 = createDefaultBlock('paragraph', 'Second line');
      const docWithTwo = addBlock(doc, b2);

      const inserted = createDefaultBlock('callout', 'Inserted between');
      const finalDoc = addBlock(docWithTwo, inserted, b1.id, 'after');

      assert.equal(finalDoc.blocks.length, 3);
      assert.equal(finalDoc.blocks[0].id, b1.id);
      assert.equal(finalDoc.blocks[1].id, inserted.id);
      assert.equal(finalDoc.blocks[2].id, b2.id);
    });

    it('should insert a new block immediately before a target block ID', () => {
      const doc = createInitialDocument('Doc', '📝');
      const b1 = doc.blocks[0];

      const inserted = createDefaultBlock('h1', 'Top Heading');
      const finalDoc = addBlock(doc, inserted, b1.id, 'before');

      assert.equal(finalDoc.blocks.length, 2);
      assert.equal(finalDoc.blocks[0].id, inserted.id);
      assert.equal(finalDoc.blocks[1].id, b1.id);
    });

    it('should update block text content and properties', () => {
      const doc = createInitialDocument('Doc', '📝');
      const blockId = doc.blocks[0].id;

      const updated = updateBlock(doc, blockId, {
        type: 'code',
        content: 'console.log("updated");',
        language: 'javascript',
      });

      assert.equal(updated.blocks[0].type, 'code');
      assert.equal(updated.blocks[0].content, 'console.log("updated");');
      assert.equal(updated.blocks[0].language, 'javascript');
    });

    it('should ignore updates to non-existent block IDs safely', () => {
      const doc = createInitialDocument('Doc', '📝');
      const updated = updateBlock(doc, 'non_existent_id', { content: 'test' });
      assert.deepEqual(updated.blocks, doc.blocks);
    });

    it('should delete a block by ID', () => {
      const doc = createInitialDocument('Doc', '📝');
      const b2 = createDefaultBlock('todo', 'Task to remove');
      const docWithTwo = addBlock(doc, b2);
      assert.equal(docWithTwo.blocks.length, 2);

      const deleted = deleteBlock(docWithTwo, b2.id);
      assert.equal(deleted.blocks.length, 1);
      assert.equal(deleted.blocks[0].id, doc.blocks[0].id);
    });

    it('should never leave 0 blocks when deleting the last remaining block', () => {
      const doc = createInitialDocument('Doc', '📝');
      assert.equal(doc.blocks.length, 1);

      const deleted = deleteBlock(doc, doc.blocks[0].id);
      assert.equal(deleted.blocks.length, 1);
      assert.equal(deleted.blocks[0].type, 'paragraph');
      assert.equal(deleted.blocks[0].content, '');
    });

    it('should reorder blocks from source index to destination index', () => {
      const doc = createInitialDocument('Doc', '📝');
      const b0 = doc.blocks[0];
      const b1 = createDefaultBlock('h1', 'Heading');
      const b2 = createDefaultBlock('todo', 'Task');
      const docWithThree = addBlock(addBlock(doc, b1), b2);

      // Current order: [b0, b1, b2]
      // Move b2 from index 2 to index 0: expected [b2, b0, b1]
      const reordered = reorderBlocks(docWithThree, 2, 0);
      assert.equal(reordered.blocks[0].id, b2.id);
      assert.equal(reordered.blocks[1].id, b0.id);
      assert.equal(reordered.blocks[2].id, b1.id);
    });

    it('should handle out-of-bounds reorder indices safely without mutation', () => {
      const doc = createInitialDocument('Doc', '📝');
      const unchanged = reorderBlocks(doc, -1, 10);
      assert.deepEqual(unchanged.blocks, doc.blocks);
    });

    it('should toggle interactive todo completion status (false -> true -> false)', () => {
      const doc = createInitialDocument('Doc', '📝');
      const todoBlock = createDefaultBlock('todo', 'Complete checklist');
      todoBlock.completed = false;
      const docWithTodo = addBlock(doc, todoBlock);

      const checkedDoc = toggleTodo(docWithTodo, todoBlock.id);
      assert.equal(checkedDoc.blocks[1].completed, true);

      const uncheckedDoc = toggleTodo(checkedDoc, todoBlock.id);
      assert.equal(uncheckedDoc.blocks[1].completed, false);
    });

    it('should not toggle completion on non-todo blocks', () => {
      const doc = createInitialDocument('Doc', '📝');
      const paragraphId = doc.blocks[0].id;
      const result = toggleTodo(doc, paragraphId);
      assert.equal(result.blocks[0].completed, undefined);
    });

    it('should split block into two at cursor split offset (Enter key emulation)', () => {
      const doc = createInitialDocument('Doc', '📝');
      const b1 = doc.blocks[0];
      const updatedDoc = updateBlock(doc, b1.id, { content: 'Hello World' });

      // Split at index 5 ("Hello " / "World")
      const splitDoc = splitBlock(updatedDoc, b1.id, 6, 'paragraph');
      assert.equal(splitDoc.blocks.length, 2);
      assert.equal(splitDoc.blocks[0].content, 'Hello ');
      assert.equal(splitDoc.blocks[1].content, 'World');
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Search Filtering Logic
  // ---------------------------------------------------------------------------
  describe('2. Search Filtering Logic (Titles, Content, Tags & Special Characters)', () => {
    const sampleDocs: NoteDocument[] = [
      {
        id: 'doc_1',
        title: 'Fox AI Architecture & Pipeline',
        emoji: '🦊',
        blocks: [
          { id: 'b1', type: 'h1', content: 'Distributed Engine Design' },
          { id: 'b2', type: 'paragraph', content: 'Uses WebSockets and WebRTC for ultra-low latency audio.' },
        ],
        tags: ['Architecture', 'Audio', 'Core'],
        createdAt: 1000,
        updatedAt: 2000,
      },
      {
        id: 'doc_2',
        title: 'Weekly Sprint 42 Planning',
        emoji: '🎯',
        blocks: [
          { id: 'b3', type: 'todo', content: 'Implement Notion slash commands', completed: true },
          { id: 'b4', type: 'code', language: 'typescript', content: 'const parse = (q: string) => {};' },
        ],
        tags: ['Sprint', 'Frontend'],
        createdAt: 1100,
        updatedAt: 2100,
      },
      {
        id: 'doc_3',
        title: 'Meeting Notes: Design System',
        emoji: '🎨',
        blocks: [
          { id: 'b5', type: 'callout', calloutIcon: '💡', content: 'Use dark glassmorphic styling.' },
        ],
        tags: ['Design', 'UI'],
        createdAt: 1200,
        updatedAt: 2200,
      },
    ];

    it('should return all documents when search query is empty or whitespace', () => {
      assert.equal(filterNotesBySearch(sampleDocs, '').length, 3);
      assert.equal(filterNotesBySearch(sampleDocs, '   ').length, 3);
    });

    it('should match by document title case-insensitively', () => {
      const results = filterNotesBySearch(sampleDocs, 'architecture');
      assert.equal(results.length, 1);
      assert.equal(results[0].id, 'doc_1');

      const upperResults = filterNotesBySearch(sampleDocs, 'SPRINT 42');
      assert.equal(upperResults.length, 1);
      assert.equal(upperResults[0].id, 'doc_2');
    });

    it('should match by text inside paragraph, code, todo, and callout blocks', () => {
      // Matches inside paragraph
      const audioResults = filterNotesBySearch(sampleDocs, 'latency');
      assert.equal(audioResults.length, 1);
      assert.equal(audioResults[0].id, 'doc_1');

      // Matches inside code block
      const codeResults = filterNotesBySearch(sampleDocs, 'parse');
      assert.equal(codeResults.length, 1);
      assert.equal(codeResults[0].id, 'doc_2');

      // Matches inside todo item
      const todoResults = filterNotesBySearch(sampleDocs, 'slash commands');
      assert.equal(todoResults.length, 1);
      assert.equal(todoResults[0].id, 'doc_2');

      // Matches inside callout block
      const calloutResults = filterNotesBySearch(sampleDocs, 'glassmorphic');
      assert.equal(calloutResults.length, 1);
      assert.equal(calloutResults[0].id, 'doc_3');
    });

    it('should match tags with or without # hashtag prefix', () => {
      const withHash = filterNotesBySearch(sampleDocs, '#Design');
      assert.equal(withHash.length, 1);
      assert.equal(withHash[0].id, 'doc_3');

      const withoutHash = filterNotesBySearch(sampleDocs, 'frontend');
      assert.equal(withoutHash.length, 1);
      assert.equal(withoutHash[0].id, 'doc_2');
    });

    it('should handle adversarial regex special characters without crashing or throwing', () => {
      const adversarialQueries = [
        '[ ]',
        '.*',
        '^$',
        '\\d+',
        '?(foo)+*',
        '{2,5}',
        '\\',
        '|',
        '(.*)',
        '[a-z]+',
      ];

      for (const query of adversarialQueries) {
        assert.doesNotThrow(() => {
          const results = filterNotesBySearch(sampleDocs, query);
          assert.ok(Array.isArray(results));
        }, `Failed on adversarial query: ${query}`);
      }
    });

    it('should return empty array when query does not match any document', () => {
      const results = filterNotesBySearch(sampleDocs, 'non_existent_random_xyz_query');
      assert.equal(results.length, 0);
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Tag Management and Multi-Tag Filtering Across Documents
  // ---------------------------------------------------------------------------
  describe('3. Tag Management (Extract, Sanitize, Add, Remove, Multi-Tag Filter)', () => {
    const multiTagDocs: NoteDocument[] = [
      {
        id: 'doc_a',
        title: 'Note A',
        emoji: '📝',
        blocks: [],
        tags: ['#Architecture', 'Design', '  Core  '],
        createdAt: 1000,
        updatedAt: 1000,
      },
      {
        id: 'doc_b',
        title: 'Note B',
        emoji: '📝',
        blocks: [],
        tags: ['design', 'UI/UX', '#sprint'],
        createdAt: 1100,
        updatedAt: 1100,
      },
      {
        id: 'doc_c',
        title: 'Note C',
        emoji: '📝',
        blocks: [],
        tags: [],
        createdAt: 1200,
        updatedAt: 1200,
      },
    ];

    it('should extract and deduplicate unique tags across documents with clean sanitization and alphabetical sorting', () => {
      const allTags = extractAllTags(multiTagDocs);
      // Expected sanitized, deduplicated, sorted: ['Architecture', 'Core', 'Design', 'sprint', 'UI/UX'] (case-insensitive sorted)
      assert.deepEqual(allTags, ['Architecture', 'Core', 'Design', 'sprint', 'UI/UX']);
    });

    it('should filter documents by selected tag (case-insensitive and hashtag-agnostic)', () => {
      const designDocs = filterNotesByTag(multiTagDocs, 'Design');
      assert.equal(designDocs.length, 2);
      assert.equal(designDocs[0].id, 'doc_a');
      assert.equal(designDocs[1].id, 'doc_b');

      const hashSprintDocs = filterNotesByTag(multiTagDocs, '#sprint');
      assert.equal(hashSprintDocs.length, 1);
      assert.equal(hashSprintDocs[0].id, 'doc_b');

      const coreDocs = filterNotesByTag(multiTagDocs, 'core');
      assert.equal(coreDocs.length, 1);
      assert.equal(coreDocs[0].id, 'doc_a');
    });

    it('should return all documents when filtering by null, empty string, or "All"', () => {
      assert.equal(filterNotesByTag(multiTagDocs, null).length, 3);
      assert.equal(filterNotesByTag(multiTagDocs, '').length, 3);
      assert.equal(filterNotesByTag(multiTagDocs, 'All').length, 3);
      assert.equal(filterNotesByTag(multiTagDocs, 'all').length, 3);
    });

    it('should add new tag to document, rejecting duplicates and trimming hashtags', () => {
      const doc = multiTagDocs[0];
      const withNewTag = addTagToDocument(doc, '#Frontend');
      assert.equal(withNewTag.tags.length, 4);
      assert.ok(withNewTag.tags.includes('Frontend'));

      // Rejects duplicate tag regardless of case or hashtag
      const duplicateAttempt = addTagToDocument(withNewTag, '#design');
      assert.equal(duplicateAttempt.tags.length, 4);

      // Rejects empty/whitespace tag
      const emptyAttempt = addTagToDocument(withNewTag, '   ###   ');
      assert.equal(emptyAttempt.tags.length, 4);
    });

    it('should remove tag from document case-insensitively', () => {
      const doc = multiTagDocs[0]; // has 'Design'
      const removed = removeTagFromDocument(doc, '#design');
      assert.equal(removed.tags.length, 2);
      assert.ok(!removed.tags.includes('Design'));
    });
  });
});
