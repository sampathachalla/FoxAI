import React, { useState } from 'react';
import { ReminderItem } from '../../types';
import { CheckCircle2, Circle, Plus, Trash2, Calendar, Clock } from 'lucide-react';

interface ReminderWidgetProps {
  reminders: ReminderItem[];
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onAdd: (title: string, dueTime?: string, priority?: 'low' | 'medium' | 'high') => void;
}

export const ReminderWidget: React.FC<ReminderWidgetProps> = ({
  reminders,
  onToggle,
  onDelete,
  onAdd,
}) => {
  const [newTitle, setNewTitle] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTitle.trim()) {
      onAdd(newTitle.trim(), 'Today at 5:00 PM', 'medium');
      setNewTitle('');
      setIsAdding(false);
    }
  };

  return (
    <div className="glass-card p-5 shadow-xl text-white flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <div className="text-[10px] uppercase tracking-[0.1em] text-[#007AFF] font-bold">
              Reminders
            </div>
          </div>
          <button
            onClick={() => setIsAdding(!isAdding)}
            className="text-xs text-[#007AFF] hover:text-white font-medium flex items-center space-x-1 transition-colors px-2 py-0.5 rounded-lg hover:bg-white/5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add</span>
          </button>
        </div>

        {isAdding && (
          <form onSubmit={handleAddSubmit} className="mb-3 flex space-x-2">
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Reminder..."
              className="flex-1 bg-white/5 border border-white/15 rounded-xl px-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#007AFF]"
              autoFocus
            />
            <button
              type="submit"
              className="px-3 py-1.5 rounded-xl bg-[#007AFF] hover:bg-blue-600 text-xs font-semibold text-white"
            >
              Save
            </button>
          </form>
        )}

        <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
          {reminders.length === 0 ? (
            <div className="text-center py-4 text-xs text-neutral-500">No pending reminders</div>
          ) : (
            reminders.slice(0, 3).map((reminder) => (
              <div
                key={reminder.id}
                className={`group flex items-start justify-between space-x-2 p-2 rounded-xl transition-all ${
                  reminder.completed ? 'bg-white/[0.02] opacity-40' : 'bg-white/[0.04] hover:bg-white/[0.08]'
                }`}
              >
                <button
                  onClick={() => onToggle(reminder.id)}
                  className="mt-0.5 text-neutral-400 hover:text-[#007AFF] transition-colors shrink-0"
                >
                  {reminder.completed ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#007AFF]" />
                  ) : (
                    <Circle className="w-3.5 h-3.5" />
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-xs font-medium leading-snug truncate ${
                      reminder.completed ? 'line-through text-neutral-500' : 'text-neutral-200'
                    }`}
                  >
                    {reminder.title}
                  </p>
                  <p className="text-[10px] text-neutral-500 flex items-center space-x-1 mt-0.5">
                    <Clock className="w-2.5 h-2.5" />
                    <span>{reminder.dueTime}</span>
                  </p>
                </div>
                <button
                  onClick={() => onDelete(reminder.id)}
                  className="opacity-0 group-hover:opacity-100 text-neutral-500 hover:text-red-400 transition-all p-1"
                  aria-label="Delete reminder"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between text-[10px] text-neutral-500 uppercase tracking-widest">
        <span>Queue: {reminders.filter((r) => !r.completed).length} active</span>
        <span className="text-[#007AFF]">Synced</span>
      </div>
    </div>
  );
};
