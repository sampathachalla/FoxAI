# Project: Notion-Feel Notes Tool for Fox Assistant

## Architecture
- **Component Root**: `/Users/sampath/Desktop/fox-jarvis-inspiration/app/components/notse`
- **Data Flow**:
  - `NotesWorkspace.tsx` manages dual view modes (`gallery` vs `editor`), active note selection, full-text search, and multi-tag filtering.
  - Bidirectional State Synchronization: Notes state is stored in `localStorage` under `fox_documents_v1` (rich block structure) & synced with `fox_notes_v1` / `AssistantContext.notes` (Markdown-serialized string `content` + metadata) so voice commands seamlessly populate the Notion workspace.
  - `NoteEditor.tsx` renders editable emoji header, auto-resizing title, tag badges, auto-save indicator, and block stream (`BlockItem.tsx`).
  - `BlockItem.tsx` handles polymorphic rendering and keyboard state machine (`Enter` to split/new block, `Backspace` to convert/delete, arrow navigation, interactive to-do checkboxes, code blocks with copy & language badges, callout icon containers, quotes, dividers).
  - `SlashMenu.tsx` provides quick `/` command palette with fuzzy filtering and keyboard navigation (`ArrowUp`/`ArrowDown`/`Enter`/`Escape`).
  - `NotesGallery.tsx` displays Notion-style note cards with emoji, snippet previews, tag pills, timestamps, and search/filter controls.
  - `ToolsManagerView.tsx` mounts `<NotesWorkspace />` replacing the legacy notes tab.

## Code Layout
```
app/
├── components/
│   ├── notse/
│   │   ├── notseTypes.ts        # Type contracts (BlockType, NoteBlock, NoteDocument, SlashMenuItemDef)
│   │   ├── markdownUtils.ts     # Bidirectional serialization (blocks <-> Markdown string, export)
│   │   ├── EmojiPicker.tsx      # Categorized emoji popover with search filter
│   │   ├── TagBadge.tsx         # Tag badge pill with color theming & remove/filter actions
│   │   ├── SlashMenu.tsx        # Floating slash command menu with keyboard navigation
│   │   ├── BlockItem.tsx        # Polymorphic block editor (headings, todos, code, callout, quote, divider, paragraph)
│   │   ├── NoteEditor.tsx       # Distraction-free Notion-feel document canvas & header controls
│   │   ├── NotesGallery.tsx     # Notion card grid, real-time search bar & tag filter bar
│   │   ├── NotesWorkspace.tsx   # Top-level workspace router & state coordinator
│   │   └── index.ts             # Clean barrel exports
│   ├── ToolsManagerView.tsx     # Upgraded to mount <NotesWorkspace />
│   └── ...
├── store/
│   └── assistantContext.tsx     # Voice notes integration and sync
└── types/
    └── index.ts                 # NoteItem type extension if applicable
```

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Block Data Model & Contracts | 11 block types (Paragraph, H1, H2, H3, To-do, Bullet, Numbered, Code, Callout, Quote, Divider) and Document models | M1 | survey |
| 2 | Markdown Bidirectional Serializer | Convert between `NoteBlock[]` and Markdown string, export `.md` file download | M1 | survey |
| 3 | Emoji Picker & Tag Badge Components | Categorized emoji popover with search, colored tag badges with remove/filter | M2 | survey |
| 4 | Slash Command Palette (`/`) | Floating `/` command menu with fuzzy search, keyboard navigation (`Up`/`Down`/`Enter`/`Esc`) | M2 | survey |
| 5 | Polymorphic Block Renderer & Keyboard Engine | Interactive checkboxes, code snippet copy, callouts, quotes, Enter/Backspace state transitions | M2 | survey |
| 6 | Notion-Feel Document Editor Canvas | Auto-resizing title, page emoji, tag manager, auto-save status pill ("Saved"/"Saving..."), Markdown export, AI chat trigger | M3 | survey |
| 7 | Notes Gallery & Card Grid | Notion-style card grid with emoji, snippet previews, tag pills, last modified timestamps, hover actions (dup/delete/export) | M3 | survey |
| 8 | Real-Time Full-Text Search & Multi-Tag Filtering | Multi-field instant search across titles, contents, tags, and category tag filter pills | M3 | survey |
| 9 | ToolsManagerView & Assistant Voice Sync Integration | Clean integration with `ToolsManagerView.tsx`, bidirectional sync with `AssistantContext.notes` & `fox_documents_v1` / `fox_notes_v1` | M4 | survey |
| 10 | Comprehensive Test Suite & Adversarial Hardening | Unit & E2E verification test suite (Tiers 1-4) + adversarial validation (Tier 5) passing `npm run build` | M5 | survey |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Core Block Model & Serialization Engine | `notseTypes.ts`, `markdownUtils.ts` | none | DONE |
| 2 | Modular Editor Sub-Components | `EmojiPicker.tsx`, `TagBadge.tsx`, `SlashMenu.tsx`, `BlockItem.tsx` | M1 | IN_PROGRESS |
| 3 | Notion Document Canvas & Notes Gallery | `NoteEditor.tsx`, `NotesGallery.tsx`, `NotesWorkspace.tsx`, `index.ts` | M2 | PLANNED |
| 4 | ToolsManagerView & Assistant Voice Sync Integration | `ToolsManagerView.tsx`, `assistantContext.tsx` integration | M3 | PLANNED |
| 5 | Dual-Track Testing & Build Verification | Full test suite execution, adversarial coverage, `npm run build` verification | M4 | PLANNED |

## Interface Contracts

### `app/components/notse/notseTypes.ts`
- `BlockType = 'paragraph' | 'h1' | 'h2' | 'h3' | 'todo' | 'bullet' | 'number' | 'code' | 'callout' | 'quote' | 'divider'`
- `NoteBlock { id: string; type: BlockType; content: string; completed?: boolean; language?: string; calloutIcon?: string; }`
- `NoteDocument { id: string; title: string; emoji: string; blocks: NoteBlock[]; tags: string[]; createdAt: number; updatedAt: number; pinned?: boolean; }`
- `AutoSaveStatus = 'saved' | 'saving' | 'unsaved'`
- `NotesViewMode = 'gallery' | 'editor'`

### `app/components/notse/markdownUtils.ts`
- `blocksToMarkdown(blocks: NoteBlock[], title?: string): string`
- `markdownToBlocks(markdown: string): NoteBlock[]`
- `exportNoteAsMarkdownFile(doc: NoteDocument): void`
- `createDefaultBlock(): NoteBlock`

### `app/components/notse/NotesWorkspace.tsx`
- Props: `{ initialNoteId?: string; onDiscussWithAI?: (content: string) => void; className?: string; }`
