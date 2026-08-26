import React, { useState } from 'react';
import { NoteItem } from '../../types';
import { Plus, Trash2, Tag } from 'lucide-react';

interface NoteWidgetProps {
  notes: NoteItem[];
  onAdd: (title: string, content: string, tags?: string[]) => void;
  onDelete: (id: string) => void;
}

export const NoteWidget: React.FC<NoteWidgetProps> = ({ notes, onAdd, onDelete }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim() && content.trim()) {
      onAdd(title.trim(), content.trim(), ['Assistant']);
      setTitle('');
      setContent('');
      setIsAdding(false);
    }
  };

  return (
    <div className="glass-card p-5 shadow-xl text-white flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="text-[10px] uppercase tracking-[0.1em] text-neutral-400 font-bold">
            Active Process & Notes
          </div>
          <button
            onClick={() => setIsAdding(!isAdding)}
            className="text-xs text-[#007AFF] hover:text-white font-medium flex items-center space-x-1 transition-colors px-2 py-0.5 rounded-lg hover:bg-white/5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New</span>
          </button>
        </div>

        {isAdding && (
          <form onSubmit={handleSubmit} className="mb-3 space-y-1.5">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title..."
              className="w-full bg-white/5 border border-white/15 rounded-xl px-2.5 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#007AFF]"
            />
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Note..."
              rows={2}
              className="w-full bg-white/5 border border-white/15 rounded-xl px-2.5 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#007AFF] resize-none"
            />
            <button
              type="submit"
              className="w-full py-1 rounded-xl bg-[#007AFF] text-xs font-semibold text-white"
            >
              Save Note
            </button>
          </form>
        )}

        <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
          {notes.length === 0 ? (
            <div className="text-center py-4 text-xs text-neutral-500">No notes recorded</div>
          ) : (
            notes.slice(0, 2).map((note) => (
              <div
                key={note.id}
                className="group p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/5 transition-all"
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-white truncate">{note.title}</h4>
                  <button
                    onClick={() => onDelete(note.id)}
                    className="opacity-0 group-hover:opacity-100 text-neutral-500 hover:text-red-400 transition-all p-0.5"
                    aria-label="Delete note"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
                <p className="text-[11px] text-neutral-300 line-clamp-2 mt-1 font-light">
                  {note.content}
                </p>
                {note.tags && note.tags.length > 0 && (
                  <div className="flex items-center space-x-1 mt-2">
                    {note.tags.map((tag, i) => (
                      <span
                        key={i}
                        className="text-[9px] px-1.5 py-0.5 rounded-md bg-white/5 text-neutral-400 font-mono"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center space-x-2">
        <div className="w-2 h-2 bg-green-500 rounded-full" />
        <span className="text-[10px] text-neutral-500 uppercase tracking-widest">
          {notes.length} Notes Synchronized
        </span>
      </div>
    </div>
  );
};
