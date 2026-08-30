// ============================================================================
// Notion-Feel Notes Tool: Domain Data Contracts & Type Definitions
// File: /app/components/notse/notseTypes.ts
// ============================================================================

export type BlockType =
  | 'paragraph'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'todo'
  | 'bullet'
  | 'number'
  | 'code'
  | 'callout'
  | 'quote'
  | 'divider';

export interface NoteBlock {
  id: string;              // Unique block ID e.g. "blk_1724950000000_a1b2c3d"
  type: BlockType;
  content: string;         // Plain text or inline markdown
  completed?: boolean;     // Used exclusively for 'todo' checklist blocks
  language?: string;       // Used for 'code' blocks (e.g. 'typescript', 'python', 'javascript')
  calloutIcon?: string;    // Used for 'callout' blocks (e.g. '💡', '⚠️', '🚀', '📌', '🔥')
}

export interface NoteDocument {
  id: string;              // Unique document ID e.g. "doc_1724950000000_x1y2z3"
  title: string;           // Document title e.g. "System Architecture & Roadmap"
  emoji: string;           // Document page emoji icon e.g. "📝", "🚀", "💡"
  blocks: NoteBlock[];     // Ordered array of rich blocks
  tags: string[];          // Categorical tags e.g. ["Architecture", "Design", "Ideas"]
  createdAt: number;       // Creation epoch timestamp (ms)
  updatedAt: number;       // Last updated epoch timestamp (ms)
  pinned?: boolean;        // Pinned to top of gallery view
}

export interface SlashMenuItemDef {
  id: BlockType;
  label: string;
  sublabel: string;
  iconName: string;
  keywords: string[];
  defaultPayload?: Partial<NoteBlock>;
}

export type AutoSaveStatus = 'saved' | 'saving' | 'unsaved';

export type NotesViewMode = 'gallery' | 'editor';

/**
 * Full slash command definitions for all 11 block types with Lucide icon identifiers,
 * keywords for fuzzy search filtering, and default block payloads.
 */
export const SLASH_COMMANDS: SlashMenuItemDef[] = [
  {
    id: 'paragraph',
    label: 'Text',
    sublabel: 'Plain body text paragraph',
    iconName: 'Type',
    keywords: ['text', 'paragraph', 'p', 'plain', 'normal', 'body'],
  },
  {
    id: 'h1',
    label: 'Heading 1',
    sublabel: 'Large section heading',
    iconName: 'Heading1',
    keywords: ['h1', 'heading1', 'title', 'large', 'header', 'section'],
  },
  {
    id: 'h2',
    label: 'Heading 2',
    sublabel: 'Medium section heading',
    iconName: 'Heading2',
    keywords: ['h2', 'heading2', 'sub', 'medium', 'section', 'header'],
  },
  {
    id: 'h3',
    label: 'Heading 3',
    sublabel: 'Small subsection heading',
    iconName: 'Heading3',
    keywords: ['h3', 'heading3', 'small', 'subsection', 'subheading'],
  },
  {
    id: 'todo',
    label: 'To-do List',
    sublabel: 'Track tasks with interactive checkboxes',
    iconName: 'CheckSquare',
    keywords: ['todo', 'task', 'check', 'checkbox', 'checklist', 'done', 'action'],
    defaultPayload: { completed: false },
  },
  {
    id: 'bullet',
    label: 'Bulleted List',
    sublabel: 'Create a simple bulleted list',
    iconName: 'List',
    keywords: ['bullet', 'ul', 'list', 'unordered', 'point', 'bulleted'],
  },
  {
    id: 'number',
    label: 'Numbered List',
    sublabel: 'Create an ordered numbered list',
    iconName: 'ListOrdered',
    keywords: ['number', 'ol', 'numbered', 'ordered', '1.', 'list', 'sequence'],
  },
  {
    id: 'code',
    label: 'Code Block',
    sublabel: 'Code snippet with syntax & copy button',
    iconName: 'Code',
    keywords: ['code', 'snippet', 'pre', 'typescript', 'javascript', 'python', 'bash', 'terminal', 'json'],
    defaultPayload: { language: 'typescript' },
  },
  {
    id: 'callout',
    label: 'Callout',
    sublabel: 'Highlight important info with an icon',
    iconName: 'AlertCircle',
    keywords: ['callout', 'alert', 'info', 'note', 'box', 'tip', 'warning', 'highlight'],
    defaultPayload: { calloutIcon: '💡' },
  },
  {
    id: 'quote',
    label: 'Quote',
    sublabel: 'Capture a quote or citation',
    iconName: 'Quote',
    keywords: ['quote', 'blockquote', 'cite', 'italic', 'quotation'],
  },
  {
    id: 'divider',
    label: 'Divider',
    sublabel: 'Visually divide document sections',
    iconName: 'Minus',
    keywords: ['divider', 'line', 'separator', 'hr', 'rule', 'break'],
  },
];

/**
 * Filter and query states for notes gallery.
 */
export interface NoteFilterState {
  searchQuery: string;
  selectedTag: string | null;
}

/**
 * Props contract for NotesWorkspace top-level container.
 */
export interface NotesWorkspaceProps {
  initialNoteId?: string;
  onDiscussWithAI?: (content: string) => void;
  className?: string;
}

/**
 * Props contract for NoteEditor component.
 */
export interface NoteEditorProps {
  note: NoteDocument;
  onUpdateNote: (updated: NoteDocument) => void;
  onBackToGallery: () => void;
  onDeleteNote: (id: string) => void;
  onDuplicateNote?: (doc: NoteDocument) => void;
  onDiscussWithAI?: (content: string) => void;
  autoSaveStatus?: AutoSaveStatus;
}

/**
 * Props contract for NotesGallery component.
 */
export interface NotesGalleryProps {
  notes: NoteDocument[];
  activeTag: string | null;
  onSelectTag: (tag: string | null) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSelectNote: (id: string) => void;
  onCreateNote: () => void;
  onDeleteNote: (id: string) => void;
  onDuplicateNote: (doc: NoteDocument) => void;
  onExportNote: (doc: NoteDocument) => void;
  onTogglePinNote?: (id: string) => void;
}
