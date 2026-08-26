import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  FileText,
  StickyNote,
  Calendar as CalendarIcon,
  Clock,
  Plus,
  Trash2,
  CheckCircle2,
  Circle,
  Tag,
  Search,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Pin,
  Send,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
  Layers,
} from 'lucide-react';
import { useVoiceAssistant } from '../hooks/useVoiceAssistant';
import { ActiveToolType } from '../types';

interface StickyNoteItem {
  id: string;
  text: string;
  color: string; // 'yellow' | 'pink' | 'green' | 'blue' | 'purple'
  pinned: boolean;
  createdAt: number;
}

const STICKY_COLORS = [
  { id: 'yellow', bg: 'bg-[#FEF08A]/90 text-neutral-900', border: 'border-yellow-400/50', dot: '#EAB308' },
  { id: 'pink', bg: 'bg-[#FBCFE8]/90 text-neutral-900', border: 'border-pink-400/50', dot: '#EC4899' },
  { id: 'green', bg: 'bg-[#BBF7D0]/90 text-neutral-900', border: 'border-green-400/50', dot: '#22C55E' },
  { id: 'blue', bg: 'bg-[#BAE6FD]/90 text-neutral-900', border: 'border-blue-400/50', dot: '#0EA5E9' },
  { id: 'purple', bg: 'bg-[#E9D5FF]/90 text-neutral-900', border: 'border-purple-400/50', dot: '#A855F7' },
];

export const ToolsManagerView: React.FC = () => {
  const {
    activeTool,
    setActiveTool,
    setAppMode,
    notes,
    reminders,
    addNote,
    deleteNote,
    addReminder,
    toggleReminder,
    deleteReminder,
    sendMessage,
    accentTheme,
  } = useVoiceAssistant();

  // Collapsible vertical sidebar navigation state
  const [isNavExpanded, setIsNavExpanded] = useState<boolean>(true);

  // Sticky Notes Local State (persisted in localStorage)
  const [stickyNotes, setStickyNotes] = useState<StickyNoteItem[]>(() => {
    try {
      const saved = localStorage.getItem('fox_sticky_notes');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to load sticky notes', e);
    }
    return [
      {
        id: 'sn_1',
        text: 'Review system architecture and model response latency.',
        color: 'yellow',
        pinned: true,
        createdAt: Date.now() - 3600000,
      },
      {
        id: 'sn_2',
        text: 'Prepare agenda for upcoming sync meeting.',
        color: 'pink',
        pinned: false,
        createdAt: Date.now() - 1800000,
      },
      {
        id: 'sn_3',
        text: 'Voice assistant prompt engineering ideas & directives.',
        color: 'blue',
        pinned: false,
        createdAt: Date.now(),
      },
    ];
  });

  useEffect(() => {
    try {
      localStorage.setItem('fox_sticky_notes', JSON.stringify(stickyNotes));
    } catch (e) {
      console.warn('Failed to save sticky notes', e);
    }
  }, [stickyNotes]);

  // Notes state
  const [noteSearch, setNoteSearch] = useState('');
  const [isCreatingNote, setIsCreatingNote] = useState(false);
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteContent, setNewNoteContent] = useState('');
  const [newNoteTag, setNewNoteTag] = useState('');

  // Sticky state
  const [newStickyText, setNewStickyText] = useState('');
  const [selectedStickyColor, setSelectedStickyColor] = useState('yellow');

  // Calendar State
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [selectedCalendarDay, setSelectedCalendarDay] = useState<number>(new Date().getDate());

  // Events State
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventTime, setNewEventTime] = useState('');
  const [newEventPriority, setNewEventPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);

  // Filtered Notes
  const filteredNotes = notes.filter((n) => {
    if (!noteSearch.trim()) return true;
    const q = noteSearch.toLowerCase();
    return (
      n.title.toLowerCase().includes(q) ||
      n.content.toLowerCase().includes(q) ||
      n.tags.some((t) => t.toLowerCase().includes(q))
    );
  });

  // Handle Add Note
  const handleSaveNewNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteTitle.trim()) return;
    const tags = newNoteTag.trim() ? [newNoteTag.trim()] : ['General'];
    addNote(newNoteTitle.trim(), newNoteContent.trim(), tags);
    setNewNoteTitle('');
    setNewNoteContent('');
    setNewNoteTag('');
    setIsCreatingNote(false);
  };

  // Handle Add Sticky
  const handleAddSticky = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStickyText.trim()) return;
    const item: StickyNoteItem = {
      id: 'sn_' + Date.now(),
      text: newStickyText.trim(),
      color: selectedStickyColor,
      pinned: false,
      createdAt: Date.now(),
    };
    setStickyNotes([item, ...stickyNotes]);
    setNewStickyText('');
  };

  const handleDeleteSticky = (id: string) => {
    setStickyNotes(stickyNotes.filter((s) => s.id !== id));
  };

  const handleTogglePinSticky = (id: string) => {
    setStickyNotes(
      stickyNotes.map((s) => (s.id === id ? { ...s, pinned: !s.pinned } : s))
    );
  };

  const handleUpdateStickyText = (id: string, text: string) => {
    setStickyNotes(stickyNotes.map((s) => (s.id === id ? { ...s, text } : s)));
  };

  // Handle Add Event / Reminder
  const handleCreateEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventTitle.trim()) return;
    const timeStr =
      newEventTime.trim() ||
      'Today, ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    addReminder(newEventTitle.trim(), timeStr, newEventPriority);
    setNewEventTitle('');
    setNewEventTime('');
    setIsCreatingEvent(false);
  };

  // Calendar Helpers
  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay();

  const prevMonth = () => setCalendarDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCalendarDate(new Date(year, month + 1, 1));
  const monthName = calendarDate.toLocaleString('default', { month: 'long' });

  const handleDiscussInChat = (text: string) => {
    setAppMode('chat');
    sendMessage(text);
  };

  // Navigation Items Definition
  const toolNavItems: {
    id: ActiveToolType;
    label: string;
    description: string;
    icon: React.ElementType;
    count?: number;
    color: string;
    activeBg: string;
    activeText: string;
    activeBorder: string;
  }[] = [
    {
      id: 'notes',
      label: 'Notes',
      description: 'Transcripts & rich memos',
      icon: FileText,
      count: notes.length,
      color: 'text-blue-400',
      activeBg: 'bg-blue-500/15',
      activeText: 'text-blue-400',
      activeBorder: 'border-blue-500/30',
    },
    {
      id: 'sticky_notes',
      label: 'Sticky Notes',
      description: 'Quick color memo cards',
      icon: StickyNote,
      count: stickyNotes.length,
      color: 'text-amber-400',
      activeBg: 'bg-amber-500/15',
      activeText: 'text-amber-400',
      activeBorder: 'border-amber-500/30',
    },
    {
      id: 'calendar',
      label: 'Calendar',
      description: 'Month & day planner',
      icon: CalendarIcon,
      color: 'text-emerald-400',
      activeBg: 'bg-emerald-500/15',
      activeText: 'text-emerald-400',
      activeBorder: 'border-emerald-500/30',
    },
    {
      id: 'events',
      label: 'Events & Tasks',
      description: 'Upcoming deadlines',
      icon: Clock,
      count: reminders.length,
      color: 'text-purple-400',
      activeBg: 'bg-purple-500/15',
      activeText: 'text-purple-400',
      activeBorder: 'border-purple-500/30',
    },
  ];

  return (
    <div className="w-full h-full flex-1 min-h-0 bg-[#141518] border border-white/[0.08] rounded-3xl shadow-2xl flex flex-row overflow-hidden relative">
      {/* Collapsible Vertical Navigation Rail on Left */}
      <motion.aside
        initial={false}
        animate={{
          width: isNavExpanded ? 240 : 64,
        }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="bg-[#101114] border-r border-white/[0.06] flex flex-col justify-between shrink-0 overflow-hidden relative select-none"
      >
          {/* Top Bar of Vertical Nav: Title & Collapse Toggle */}
          <div className="p-3 border-b border-white/[0.06] flex items-center justify-between">
            {isNavExpanded ? (
              <div className="flex items-center space-x-2 px-1">
                <Layers className="w-4 h-4 text-blue-400" />
                <span className="text-xs font-bold text-neutral-200 tracking-wide uppercase text-[11px]">
                  Tools Menu
                </span>
              </div>
            ) : (
              <div className="w-full flex justify-center">
                <Layers className="w-4 h-4 text-blue-400" />
              </div>
            )}

            <button
              onClick={() => setIsNavExpanded(!isNavExpanded)}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title={isNavExpanded ? 'Collapse navigation' : 'Expand navigation'}
            >
              {isNavExpanded ? (
                <PanelLeftClose className="w-4 h-4" />
              ) : (
                <PanelLeftOpen className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Navigation Items List */}
          <div className="flex-1 p-2 space-y-1.5 overflow-y-auto no-scrollbar">
            {toolNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTool === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTool(item.id)}
                  title={!isNavExpanded ? `${item.label} (${item.count ?? ''})` : undefined}
                  className={`w-full rounded-xl transition-all flex items-center cursor-pointer border ${
                    isNavExpanded ? 'px-3 py-2.5 space-x-3 text-left' : 'p-3 justify-center'
                  } ${
                    isActive
                      ? `${item.activeBg} ${item.activeText} ${item.activeBorder} shadow-sm font-semibold`
                      : 'border-transparent text-neutral-400 hover:text-neutral-200 hover:bg-white/[0.04]'
                  }`}
                >
                  <div className="relative shrink-0 flex items-center justify-center">
                    <Icon className={`w-4 h-4 ${isActive ? item.activeText : item.color}`} />
                    {isActive && !isNavExpanded && (
                      <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-blue-400 ring-2 ring-[#141518]" />
                    )}
                  </div>

                  {isNavExpanded && (
                    <div className="flex-1 min-w-0 flex items-center justify-between">
                      <div className="truncate">
                        <p className="text-xs font-medium leading-tight truncate">{item.label}</p>
                        <p className="text-[10px] text-neutral-500 truncate">{item.description}</p>
                      </div>
                      {typeof item.count === 'number' && (
                        <span
                          className={`ml-1.5 px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold shrink-0 ${
                            isActive
                              ? 'bg-white/10 text-white'
                              : 'bg-white/[0.04] text-neutral-400'
                          }`}
                        >
                          {item.count}
                        </span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Bottom Sidebar Footer */}
          <div className="p-2 border-t border-white/[0.06]">
            {isNavExpanded ? (
              <button
                onClick={() => setIsNavExpanded(false)}
                className="w-full px-2.5 py-1.5 rounded-lg text-[11px] text-neutral-400 hover:text-white hover:bg-white/5 transition-colors flex items-center justify-between cursor-pointer"
              >
                <span className="flex items-center space-x-1.5">
                  <PanelLeftClose className="w-3.5 h-3.5" />
                  <span>Collapse Menu</span>
                </span>
                <ChevronLeft className="w-3.5 h-3.5 text-neutral-500" />
              </button>
            ) : (
              <button
                onClick={() => setIsNavExpanded(true)}
                className="w-full p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-white/5 transition-colors flex items-center justify-center cursor-pointer"
                title="Expand Menu"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </motion.aside>

        {/* Right Body Workspace */}
        <main className="flex-1 min-w-0 p-4 sm:p-6 overflow-y-auto custom-scrollbar bg-[#121316]">
          {/* ======================================================== */}
          {/* 1. NOTES TAB */}
          {/* ======================================================== */}
          {activeTool === 'notes' && (
            <div className="max-w-5xl mx-auto space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                  <input
                    type="text"
                    placeholder="Search notes by title, content or tag..."
                    value={noteSearch}
                    onChange={(e) => setNoteSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <button
                  onClick={() => setIsCreatingNote(!isCreatingNote)}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center space-x-1.5 transition-colors shadow-lg cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isCreatingNote ? 'Cancel' : 'New Note'}</span>
                </button>
              </div>

              {/* Create Note Drawer */}
              {isCreatingNote && (
                <form
                  onSubmit={handleSaveNewNote}
                  className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 space-y-3 animate-in fade-in duration-200"
                >
                  <input
                    type="text"
                    placeholder="Note Title..."
                    value={newNoteTitle}
                    onChange={(e) => setNewNoteTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-black/40 border border-white/15 rounded-xl text-xs font-semibold text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500"
                    autoFocus
                  />
                  <textarea
                    rows={3}
                    placeholder="Write your note content here..."
                    value={newNoteContent}
                    onChange={(e) => setNewNoteContent(e.target.value)}
                    className="w-full px-3 py-2 bg-black/40 border border-white/15 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500 resize-none leading-relaxed"
                  />
                  <div className="flex items-center justify-between gap-2">
                    <input
                      type="text"
                      placeholder="Tag (e.g. Architecture, Idea, Meeting)"
                      value={newNoteTag}
                      onChange={(e) => setNewNoteTag(e.target.value)}
                      className="px-3 py-1.5 bg-black/40 border border-white/15 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none"
                    />
                    <button
                      type="submit"
                      className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold cursor-pointer"
                    >
                      Save Note
                    </button>
                  </div>
                </form>
              )}

              {/* Notes Grid */}
              {filteredNotes.length === 0 ? (
                <div className="py-16 text-center text-neutral-400 space-y-2">
                  <FileText className="w-12 h-12 mx-auto text-neutral-600" />
                  <p className="text-sm font-medium">No notes found</p>
                  <p className="text-xs text-neutral-500">
                    Create a new note above or say: "Take a note about..."
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredNotes.map((note) => (
                    <div
                      key={note.id}
                      className="p-4 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] hover:border-white/20 transition-all flex flex-col justify-between group"
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="text-sm font-semibold text-white line-clamp-1">{note.title}</h3>
                          <button
                            onClick={() => deleteNote(note.id)}
                            className="text-neutral-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-1 cursor-pointer"
                            title="Delete note"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <p className="text-xs text-neutral-300 whitespace-pre-wrap line-clamp-4 leading-relaxed">
                          {note.content}
                        </p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-neutral-400">
                        <div className="flex items-center space-x-1">
                          <Tag className="w-3 h-3 text-blue-400" />
                          <span>{note.tags[0] || 'General'}</span>
                        </div>
                        <button
                          onClick={() =>
                            handleDiscussInChat(
                              `Here is my note regarding "${note.title}":\n\n${note.content}`
                            )
                          }
                          className="flex items-center space-x-1 text-blue-400 hover:text-blue-300 transition-colors cursor-pointer"
                          title="Send note to chat"
                        >
                          <span>Discuss in Chat</span>
                          <Send className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* 2. STICKY NOTES TAB */}
          {/* ======================================================== */}
          {activeTool === 'sticky_notes' && (
            <div className="max-w-5xl mx-auto space-y-4">
              {/* Create Sticky Note Bar */}
              <form
                onSubmit={handleAddSticky}
                className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 flex flex-col sm:flex-row items-center gap-3"
              >
                <input
                  type="text"
                  placeholder="Write a quick sticky note memo..."
                  value={newStickyText}
                  onChange={(e) => setNewStickyText(e.target.value)}
                  className="flex-1 w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500"
                />
                <div className="flex items-center space-x-2 w-full sm:w-auto justify-between">
                  <div className="flex items-center space-x-1">
                    {STICKY_COLORS.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setSelectedStickyColor(c.id)}
                        className={`w-6 h-6 rounded-full transition-transform cursor-pointer border ${
                          selectedStickyColor === c.id
                            ? 'scale-110 ring-2 ring-white'
                            : 'opacity-70 hover:opacity-100'
                        }`}
                        style={{ backgroundColor: c.dot, borderColor: '#ffffff30' }}
                      />
                    ))}
                  </div>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs flex items-center space-x-1 transition-colors cursor-pointer shadow-md"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Stick</span>
                  </button>
                </div>
              </form>

              {/* Sticky Notes Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {stickyNotes.map((sticky) => {
                  const colorStyle =
                    STICKY_COLORS.find((c) => c.id === sticky.color) || STICKY_COLORS[0];
                  return (
                    <div
                      key={sticky.id}
                      className={`p-4 rounded-2xl ${colorStyle.bg} ${colorStyle.border} border shadow-lg relative flex flex-col justify-between min-h-[140px] transition-transform hover:-translate-y-0.5 group`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <button
                          onClick={() => handleTogglePinSticky(sticky.id)}
                          className={`p-1 rounded-md transition-colors cursor-pointer ${
                            sticky.pinned ? 'text-neutral-900 font-bold' : 'text-neutral-600 hover:text-neutral-900'
                          }`}
                          title={sticky.pinned ? 'Unpin' : 'Pin note'}
                        >
                          <Pin className={`w-3.5 h-3.5 ${sticky.pinned ? 'fill-neutral-900' : ''}`} />
                        </button>
                        <button
                          onClick={() => handleDeleteSticky(sticky.id)}
                          className="p-1 text-neutral-600 hover:text-red-700 transition-colors cursor-pointer opacity-70 group-hover:opacity-100"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <textarea
                        value={sticky.text}
                        onChange={(e) => handleUpdateStickyText(sticky.id, e.target.value)}
                        className="w-full bg-transparent resize-none text-xs font-medium text-neutral-900 focus:outline-none flex-1 leading-relaxed"
                        rows={3}
                      />

                      <div className="mt-2 text-[10px] text-neutral-600 flex justify-between items-center font-mono">
                        <span>
                          {new Date(sticky.createdAt).toLocaleDateString([], {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                        <button
                          onClick={() =>
                            handleDiscussInChat(`Regarding this sticky memo: "${sticky.text}"`)
                          }
                          className="hover:underline text-neutral-800 font-semibold cursor-pointer"
                        >
                          Ask AI →
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* 3. CALENDAR TAB */}
          {/* ======================================================== */}
          {activeTool === 'calendar' && (
            <div className="max-w-4xl mx-auto space-y-4">
              <div className="p-5 rounded-3xl bg-[#1a1b1f] border border-white/[0.08] space-y-4">
                {/* Calendar Header Navigation */}
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-white">
                      {monthName} {year}
                    </h3>
                    <p className="text-xs text-neutral-400">
                      Selected: {monthName} {selectedCalendarDay}, {year}
                    </p>
                  </div>
                  <div className="flex items-center space-x-1.5 bg-black/40 p-1 rounded-xl border border-white/10">
                    <button
                      onClick={prevMonth}
                      className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setCalendarDate(new Date());
                        setSelectedCalendarDay(new Date().getDate());
                      }}
                      className="px-2.5 py-1 text-xs font-semibold text-neutral-200 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                    >
                      Today
                    </button>
                    <button
                      onClick={nextMonth}
                      className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Day of Week Headers */}
                <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-neutral-400 py-1 border-b border-white/[0.06]">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                    <div key={d}>{d}</div>
                  ))}
                </div>

                {/* Calendar Dates Grid */}
                <div className="grid grid-cols-7 gap-1.5 text-center">
                  {/* Empty Slots */}
                  {Array.from({ length: firstDayIndex }).map((_, i) => (
                    <div key={`empty_${i}`} className="h-10 sm:h-12" />
                  ))}

                  {/* Active Month Days */}
                  {Array.from({ length: daysInMonth }).map((_, i) => {
                    const dayNum = i + 1;
                    const isToday =
                      dayNum === new Date().getDate() &&
                      month === new Date().getMonth() &&
                      year === new Date().getFullYear();
                    const isSelected = dayNum === selectedCalendarDay;

                    return (
                      <button
                        key={dayNum}
                        onClick={() => setSelectedCalendarDay(dayNum)}
                        className={`h-10 sm:h-12 rounded-xl flex flex-col items-center justify-center transition-all cursor-pointer relative ${
                          isSelected
                            ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-500/30'
                            : isToday
                            ? 'bg-white/15 text-white font-bold border border-blue-400'
                            : 'text-neutral-300 hover:bg-white/5 hover:text-white'
                        }`}
                      >
                        <span className="text-xs">{dayNum}</span>
                        {isToday && !isSelected && (
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-0.5" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Day Agenda Details */}
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-sm border border-blue-500/30">
                    {selectedCalendarDay}
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-white">
                      Agenda for {monthName} {selectedCalendarDay}
                    </h4>
                    <p className="text-[11px] text-neutral-400">
                      {reminders.length} event(s) and reminders scheduled in Fox
                    </p>
                  </div>
                </div>
                <button
                  onClick={() =>
                    handleDiscussInChat(
                      `Check my schedule and organize events for ${monthName} ${selectedCalendarDay}.`
                    )
                  }
                  className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors cursor-pointer flex items-center space-x-1"
                >
                  <span>Plan Day with AI</span>
                  <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
                </button>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* 4. EVENTS TAB */}
          {/* ======================================================== */}
          {activeTool === 'events' && (
            <div className="max-w-4xl mx-auto space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-white">Scheduled Events & Reminders</h3>
                  <p className="text-xs text-neutral-400">Manage time-sensitive goals and upcoming deadlines</p>
                </div>
                <button
                  onClick={() => setIsCreatingEvent(!isCreatingEvent)}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer shadow-lg"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isCreatingEvent ? 'Cancel' : 'New Event'}</span>
                </button>
              </div>

              {/* Create Event Form */}
              {isCreatingEvent && (
                <form
                  onSubmit={handleCreateEvent}
                  className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 space-y-3 animate-in fade-in duration-200"
                >
                  <input
                    type="text"
                    placeholder="Event or Reminder title..."
                    value={newEventTitle}
                    onChange={(e) => setNewEventTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-black/40 border border-white/15 rounded-xl text-xs font-semibold text-white placeholder-neutral-500 focus:outline-none focus:border-purple-500"
                    autoFocus
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Time/Date (e.g. 3:00 PM, Tomorrow)"
                      value={newEventTime}
                      onChange={(e) => setNewEventTime(e.target.value)}
                      className="px-3 py-2 bg-black/40 border border-white/15 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none"
                    />
                    <select
                      value={newEventPriority}
                      onChange={(e) => setNewEventPriority(e.target.value as any)}
                      className="px-3 py-2 bg-black/40 border border-white/15 rounded-xl text-xs text-white focus:outline-none"
                    >
                      <option value="low">Low Priority</option>
                      <option value="medium">Medium Priority</option>
                      <option value="high">High Priority</option>
                    </select>
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="px-4 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold cursor-pointer"
                    >
                      Add Event
                    </button>
                  </div>
                </form>
              )}

              {/* Events Timeline List */}
              {reminders.length === 0 ? (
                <div className="py-16 text-center text-neutral-400 space-y-2">
                  <Clock className="w-12 h-12 mx-auto text-neutral-600" />
                  <p className="text-sm font-medium">No events scheduled</p>
                  <p className="text-xs text-neutral-500">
                    Create an event above or say: "Remind me to call the team at 4 PM"
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {reminders.map((ev) => (
                    <div
                      key={ev.id}
                      className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between ${
                        ev.completed
                          ? 'bg-white/[0.02] border-white/[0.04] opacity-60'
                          : 'bg-white/[0.04] border-white/[0.08] hover:border-purple-500/30'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => toggleReminder(ev.id)}
                          className="text-neutral-400 hover:text-purple-400 transition-colors cursor-pointer"
                        >
                          {ev.completed ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <Circle className="w-4 h-4" />
                          )}
                        </button>
                        <div>
                          <span
                            className={`text-xs font-medium ${
                              ev.completed ? 'line-through text-neutral-500' : 'text-white'
                            }`}
                          >
                            {ev.title}
                          </span>
                          <div className="flex items-center space-x-2 text-[11px] text-neutral-400 mt-0.5">
                            <span className="font-mono">{ev.dueTime}</span>
                            <span>•</span>
                            <span
                              className={`px-1.5 py-0.2 rounded text-[9px] uppercase font-bold tracking-wider ${
                                ev.priority === 'high'
                                  ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                  : ev.priority === 'medium'
                                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                  : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                              }`}
                            >
                              {ev.priority}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-1.5">
                        <button
                          onClick={() => deleteReminder(ev.id)}
                          className="p-1.5 rounded-lg text-neutral-500 hover:text-red-400 transition-colors cursor-pointer"
                          title="Delete event"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </main>
    </div>
  );
};
