import React, { useState, useMemo } from 'react';
import { useVoiceAssistant } from '../hooks/useVoiceAssistant';
import {
  Plus,
  MessageSquare,
  LayoutGrid,
  Settings,
  Search,
  Pin,
  Trash2,
  Edit2,
  Check,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  Sparkles,
  Code,
  PenLine,
  Brain,
  Mic,
  Calendar,
  Layers,
  FileText,
  ChevronRight,
  Palette,
  Cpu,
  Database,
  Volume2,
  VolumeX,
  Sliders,
  SlidersHorizontal,
  Clock,
  StickyNote,
  CheckCircle2,
} from 'lucide-react';
import { ConversationSession, PromptTemplate, SettingsTab, SidebarTab, ActiveToolType } from '../types';

export const Sidebar: React.FC = () => {
  const {
    sessions,
    activeSessionId,
    isSidebarOpen,
    setIsSidebarOpen,
    activeSidebarTab,
    setActiveSidebarTab,
    settingsTab,
    setSettingsTab,
    openSettingsTab,
    appMode,
    setAppMode,
    activeTool,
    openToolPanel,
    createNewSession,
    switchSession,
    deleteSession,
    renameSession,
    pinSession,
    promptTemplates,
    usePromptTemplate,
    notes,
    accentTheme,
    setAccentTheme,
    voicePrefs,
    setVoicePrefs,
    enginePrefs,
    deviceSettings,
    updateDeviceSetting,
    isQuickAccessOpen,
    toggleQuickAccess,
  } = useVoiceAssistant();

  const [searchQuery, setSearchQuery] = useState('');
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // Settings categories list definition
  const settingsCategories: {
    id: SettingsTab;
    title: string;
    subtitle: string;
    icon: React.ElementType;
    badge?: string;
  }[] = [
    {
      id: 'theme',
      title: 'Theme & Appearance',
      subtitle: accentTheme.name,
      icon: Palette,
      badge: 'Glow FX',
    },
    {
      id: 'voice',
      title: 'Voice & Synthesizer',
      subtitle: `${voicePrefs.autoSpeak ? 'Auto-speak ON' : 'Muted'} • ${voicePrefs.rate}x`,
      icon: Mic,
      badge: 'Audio',
    },
    {
      id: 'engine',
      title: 'Intelligence Engine',
      subtitle: `Gemini 3.7 • ${enginePrefs.personaMode}`,
      icon: Cpu,
      badge: 'AI Core',
    },
    {
      id: 'data',
      title: 'Data & Storage',
      subtitle: `${sessions.length} chats • ${notes.length} notes`,
      icon: Database,
      badge: 'LocalSync',
    },
  ];

  // Filtered and categorized sessions
  const filteredSessions = useMemo(() => {
    if (!searchQuery.trim()) return sessions;
    const q = searchQuery.toLowerCase();
    return sessions.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        (s.previewText && s.previewText.toLowerCase().includes(q))
    );
  }, [sessions, searchQuery]);

  // Group sessions by relative date
  const groupedSessions = useMemo(() => {
    const now = Date.now();
    const oneDay = 86400000;

    const pinned: ConversationSession[] = [];
    const today: ConversationSession[] = [];
    const yesterday: ConversationSession[] = [];
    const previous7Days: ConversationSession[] = [];
    const older: ConversationSession[] = [];

    for (const session of filteredSessions) {
      if (session.pinned) {
        pinned.push(session);
        continue;
      }

      const diff = now - session.updatedAt;
      if (diff < oneDay) {
        today.push(session);
      } else if (diff < oneDay * 2) {
        yesterday.push(session);
      } else if (diff < oneDay * 7) {
        previous7Days.push(session);
      } else {
        older.push(session);
      }
    }

    return { pinned, today, yesterday, previous7Days, older };
  }, [filteredSessions]);

  // Google-Style App Launcher Tools (Strictly: Notes, Sticky Notes, Calendar, Events)
  const googleStyleTools = useMemo(() => [
    {
      id: 'notes' as ActiveToolType,
      name: 'Notes',
      renderIcon: (compact = false) => (
        <div
          className={`${
            compact ? 'w-10 h-10' : 'w-13 h-13'
          } rounded-full flex items-center justify-center bg-gradient-to-tr from-[#1a73e8] to-[#4285F4] shadow-md shadow-blue-500/25 group-hover:scale-105 group-active:scale-95 transition-all`}
        >
          <FileText className={`${compact ? 'w-5 h-5' : 'w-6 h-6'} text-white`} />
        </div>
      ),
    },
    {
      id: 'sticky_notes' as ActiveToolType,
      name: 'Sticky Notes',
      renderIcon: (compact = false) => (
        <div
          className={`${
            compact ? 'w-10 h-10' : 'w-13 h-13'
          } rounded-full flex items-center justify-center bg-gradient-to-tr from-[#FBBC05] to-[#F59E0B] shadow-md shadow-amber-500/25 group-hover:scale-105 group-active:scale-95 transition-all`}
        >
          <StickyNote
            className={`${compact ? 'w-5 h-5' : 'w-6 h-6'} text-neutral-900 fill-neutral-900/40`}
          />
        </div>
      ),
    },
    {
      id: 'calendar' as ActiveToolType,
      name: 'Calendar',
      renderIcon: (compact = false) => (
        <div
          className={`${
            compact ? 'w-10 h-10 rounded-xl' : 'w-13 h-13 rounded-2xl'
          } flex flex-col items-center justify-center bg-[#1a73e8] shadow-md shadow-blue-500/25 group-hover:scale-105 group-active:scale-95 transition-all text-white overflow-hidden border border-white/10`}
        >
          <div
            className={`w-full bg-[#1558b0] ${
              compact ? 'py-0 text-[7.5px]' : 'py-0.5 text-[8.5px]'
            } tracking-wider text-center uppercase font-bold`}
          >
            {new Date().toLocaleString('en-US', { month: 'short' })}
          </div>
          <div
            className={`${
              compact ? 'text-xs py-0.5' : 'text-base py-1'
            } font-black leading-none`}
          >
            {new Date().getDate()}
          </div>
        </div>
      ),
    },
    {
      id: 'events' as ActiveToolType,
      name: 'Events',
      renderIcon: (compact = false) => (
        <div
          className={`${
            compact ? 'w-10 h-10' : 'w-13 h-13'
          } rounded-full flex items-center justify-center bg-gradient-to-tr from-[#8E24AA] via-[#9333EA] to-[#EC4899] shadow-md shadow-purple-500/25 group-hover:scale-105 group-active:scale-95 transition-all`}
        >
          <Clock className={`${compact ? 'w-5 h-5' : 'w-6 h-6'} text-white`} />
        </div>
      ),
    },
  ], []);

  // Filtered tools based on search query
  const filteredGoogleTools = useMemo(() => {
    if (!searchQuery.trim()) return googleStyleTools;
    const q = searchQuery.toLowerCase();
    return googleStyleTools.filter((t) => t.name.toLowerCase().includes(q));
  }, [googleStyleTools, searchQuery]);

  const handleOpenToolModal = (toolId: ActiveToolType) => {
    openToolPanel(toolId);
    if (window.innerWidth < 1024) setIsSidebarOpen(false);
  };

  const handleStartRename = (session: ConversationSession, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSessionId(session.id);
    setEditTitle(session.title);
  };

  const handleSaveRename = (sessionId: string, e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (editTitle.trim()) {
      renameSession(sessionId, editTitle.trim());
    }
    setEditingSessionId(null);
  };

  const getTemplateIcon = (iconName?: string) => {
    switch (iconName) {
      case 'Sparkles':
        return <Sparkles className="w-4 h-4 text-amber-400" />;
      case 'Code':
        return <Code className="w-4 h-4 text-cyan-400" />;
      case 'PenLine':
        return <PenLine className="w-4 h-4 text-emerald-400" />;
      case 'Brain':
        return <Brain className="w-4 h-4 text-purple-400" />;
      case 'Mic':
        return <Mic className="w-4 h-4 text-pink-400" />;
      case 'Calendar':
        return <Calendar className="w-4 h-4 text-blue-400" />;
      default:
        return <Sparkles className="w-4 h-4 text-purple-400" />;
    }
  };

  const renderSessionItem = (session: ConversationSession) => {
    const isActive = session.id === activeSessionId && appMode !== 'settings';
    const isEditing = editingSessionId === session.id;

    return (
      <div
        key={session.id}
        onClick={() => {
          if (!isEditing) {
            switchSession(session.id);
            if (window.innerWidth < 1024) setIsSidebarOpen(false);
          }
        }}
        className={`group relative flex items-center justify-between px-3 py-2.5 rounded-xl text-xs cursor-pointer transition-all duration-150 ${
          isActive
            ? 'bg-white/10 text-white font-medium shadow-sm border border-white/15'
            : 'text-neutral-300 hover:bg-white/5 hover:text-white border border-transparent'
        }`}
        style={
          isActive
            ? {
                boxShadow: `0 0 16px ${accentTheme.primary}15`,
                borderLeftColor: accentTheme.primary,
                borderLeftWidth: '3px',
              }
            : undefined
        }
      >
        <div className="flex items-center space-x-2.5 min-w-0 flex-1 pr-1">
          <MessageSquare
            className={`w-3.5 h-3.5 shrink-0 transition-colors ${
              isActive ? 'text-white' : 'text-neutral-500 group-hover:text-neutral-300'
            }`}
            style={isActive ? { color: accentTheme.primary } : undefined}
          />

          {isEditing ? (
            <form
              onSubmit={(e) => handleSaveRename(session.id, e)}
              className="flex items-center space-x-1 flex-1 min-w-0"
              onClick={(e) => e.stopPropagation()}
            >
              <input
                type="text"
                autoFocus
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onBlur={() => handleSaveRename(session.id)}
                className="w-full bg-black/60 border border-white/20 rounded px-1.5 py-0.5 text-xs text-white focus:outline-none focus:border-cyan-400"
              />
              <button
                type="submit"
                className="p-1 hover:text-emerald-400 text-neutral-400"
                title="Save"
              >
                <Check className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => setEditingSessionId(null)}
                className="p-1 hover:text-rose-400 text-neutral-400"
                title="Cancel"
              >
                <X className="w-3 h-3" />
              </button>
            </form>
          ) : (
            <span className="truncate flex-1 text-left select-none text-[12.5px] tracking-tight">
              {session.title}
            </span>
          )}
        </div>

        {/* Hover / Active Action Buttons */}
        {!isEditing && (
          <div
            className={`flex items-center space-x-0.5 shrink-0 transition-opacity ${
              isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => pinSession(session.id)}
              className={`p-1 rounded hover:bg-white/10 transition-colors ${
                session.pinned ? 'text-amber-400' : 'text-neutral-400 hover:text-white'
              }`}
              title={session.pinned ? 'Unpin' : 'Pin to top'}
            >
              <Pin className="w-3 h-3" />
            </button>

            <button
              onClick={(e) => handleStartRename(session, e)}
              className="p-1 rounded text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
              title="Rename Chat"
            >
              <Edit2 className="w-3 h-3" />
            </button>

            <button
              onClick={() => deleteSession(session.id)}
              className="p-1 rounded text-neutral-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
              title="Delete Chat"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Mobile Drawer Overlay Backdrop */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Main Sidebar Container (Docked on Desktop: 300px expanded or 72px collapsed icon rail, Slide-over Drawer on Mobile) */}
      <aside
        className={`fixed lg:static top-0 left-0 bottom-0 z-50 lg:z-20 h-full flex flex-col bg-[#0A0A0C] border-r border-white/[0.08] transition-all duration-300 ease-in-out select-none ${
          isSidebarOpen
            ? 'w-[280px] sm:w-[300px] translate-x-0'
            : '-translate-x-full lg:translate-x-0 lg:w-[72px]'
        }`}
      >
        {isSidebarOpen ? (
          <>
            {/* 1. Header & New Chat Action */}
        <div className="p-3.5 shrink-0 flex flex-col gap-2.5 border-b border-white/[0.06]">
          {/* Top Bar with Brand & Collapse Icon */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-5 h-5 rounded-md bg-white flex items-center justify-center shadow-sm">
                <div className="w-1.5 h-1.5 bg-black rounded-full" />
              </div>
              <span className="text-xs font-semibold tracking-wider text-white uppercase font-mono">
                Fox AI
              </span>
            </div>

            <button
              onClick={() => setIsSidebarOpen(false)}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Close sidebar"
              aria-label="Collapse sidebar"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          </div>

          {/* "+ New Chat" Button */}
          <button
            onClick={() => {
              createNewSession();
              if (window.innerWidth < 1024) setIsSidebarOpen(false);
            }}
            className="w-full py-2.5 px-3.5 rounded-xl text-xs font-medium bg-white/[0.08] hover:bg-white/15 text-white border border-white/10 hover:border-white/20 transition-all flex items-center justify-between shadow-sm cursor-pointer group"
          >
            <div className="flex items-center space-x-2">
              <Plus className="w-4 h-4 text-cyan-400 group-hover:rotate-90 transition-transform duration-200" />
              <span className="font-semibold text-[13px]">New chat</span>
            </div>
            <span className="text-[10px] text-neutral-400 font-mono bg-white/5 px-1.5 py-0.5 rounded border border-white/10">
              ⌘K
            </span>
          </button>

          {/* Search Input (For Chats & Tools) */}
          {activeSidebarTab !== 'settings' && (
            <div className="relative w-full">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                placeholder={
                  activeSidebarTab === 'chats'
                    ? 'Search chats...'
                    : 'Search Google & Fox tools...'
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/[0.04] hover:bg-white/[0.07] focus:bg-white/[0.09] border border-white/[0.08] focus:border-white/20 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-neutral-500 focus:outline-none transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          )}

          {/* 2-Way Navigation Tabs: Chats | Tools */}
          <div className="flex p-0.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-xs font-medium">
            <button
              onClick={() => {
                setActiveSidebarTab('chats');
                if (appMode === 'settings') setAppMode('chat');
              }}
              className={`flex-1 py-1.5 rounded-lg flex items-center justify-center space-x-1 transition-all cursor-pointer ${
                activeSidebarTab === 'chats' && appMode !== 'settings'
                  ? 'bg-white/15 text-white font-semibold shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Chats</span>
              <span className="text-[10px] text-neutral-400 font-mono">
                {sessions.length}
              </span>
            </button>

            <button
              onClick={() => {
                setActiveSidebarTab('tools');
                if (appMode === 'settings') setAppMode('chat');
              }}
              className={`flex-1 py-1.5 rounded-lg flex items-center justify-center space-x-1 transition-all cursor-pointer ${
                (activeSidebarTab === 'tools' || activeSidebarTab === 'library') && appMode !== 'settings'
                  ? 'bg-white/15 text-white font-semibold shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Tools</span>
            </button>
          </div>
        </div>

        {/* 2. Scrollable Body: Chats, Library, or Settings View Categories */}
        <div className="flex-1 min-h-0 overflow-y-auto px-2.5 py-2 space-y-4 custom-scrollbar">
          {/* ================================================================= */}
          {/* A. SETTINGS LIST TAB (Directly in the side control panel) */}
          {/* ================================================================= */}
          {activeSidebarTab === 'settings' ? (
            <div className="space-y-3">
              <div className="px-1 text-[10px] font-semibold tracking-wider text-neutral-400 uppercase flex items-center justify-between">
                <span>Settings Categories</span>
                <span className="text-neutral-500 font-mono">4 Modules</span>
              </div>

              <div className="space-y-1.5">
                {settingsCategories.map((cat) => {
                  const Icon = cat.icon;
                  const isSelected = appMode === 'settings' && settingsTab === cat.id;

                  return (
                    <div
                      key={cat.id}
                      onClick={() => {
                        openSettingsTab(cat.id);
                        if (window.innerWidth < 1024) setIsSidebarOpen(false);
                      }}
                      className={`group p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 text-left ${
                        isSelected
                          ? 'bg-white/[0.12] border-white/20 shadow-md'
                          : 'bg-white/[0.03] hover:bg-white/[0.08] border-white/[0.06] hover:border-white/15'
                      }`}
                      style={
                        isSelected
                          ? {
                              boxShadow: `0 0 16px ${accentTheme.primary}20`,
                              borderLeftColor: accentTheme.primary,
                              borderLeftWidth: '3px',
                            }
                          : undefined
                      }
                    >
                      <div className="flex items-center space-x-3 min-w-0 flex-1">
                        <div
                          className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border border-white/10"
                          style={{
                            backgroundColor: isSelected
                              ? `${accentTheme.primary}25`
                              : 'rgba(255, 255, 255, 0.05)',
                          }}
                        >
                          <Icon
                            className="w-4 h-4"
                            style={{
                              color: isSelected ? accentTheme.primary : '#a3a3a3',
                            }}
                          />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center space-x-1.5">
                            <span
                              className={`text-xs font-semibold truncate ${
                                isSelected ? 'text-white' : 'text-neutral-200'
                              }`}
                            >
                              {cat.title}
                            </span>
                          </div>
                          <p className="text-[11px] text-neutral-400 truncate">
                            {cat.subtitle}
                          </p>
                        </div>
                      </div>

                      <ChevronRight
                        className={`w-3.5 h-3.5 shrink-0 transition-transform ${
                          isSelected
                            ? 'text-white translate-x-0.5'
                            : 'text-neutral-500 group-hover:text-neutral-300'
                        }`}
                        style={isSelected ? { color: accentTheme.primary } : undefined}
                      />
                    </div>
                  );
                })}
              </div>

              {/* Quick Summary Info Box */}
              <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-1 mt-4">
                <div className="text-[11px] font-semibold text-neutral-300">
                  Side Control Panel
                </div>
                <p className="text-[10px] text-neutral-400 leading-relaxed">
                  Select any category to open its full dedicated view page with real-time tuning and controls.
                </p>
              </div>
            </div>
          ) : activeSidebarTab === 'chats' ? (
            /* ================================================================= */
            /* B. CHATS TAB */
            /* ================================================================= */
            <div className="space-y-4">
              {/* Pinned Group */}
              {groupedSessions.pinned.length > 0 && (
                <div className="space-y-1">
                  <div className="px-2.5 text-[10px] font-semibold tracking-wider text-amber-400 uppercase flex items-center space-x-1.5">
                    <Pin className="w-2.5 h-2.5" />
                    <span>Pinned</span>
                  </div>
                  <div className="space-y-0.5">
                    {groupedSessions.pinned.map(renderSessionItem)}
                  </div>
                </div>
              )}

              {/* Today Group */}
              {groupedSessions.today.length > 0 && (
                <div className="space-y-1">
                  <div className="px-2.5 text-[10px] font-semibold tracking-wider text-neutral-400 uppercase">
                    Today
                  </div>
                  <div className="space-y-0.5">
                    {groupedSessions.today.map(renderSessionItem)}
                  </div>
                </div>
              )}

              {/* Yesterday Group */}
              {groupedSessions.yesterday.length > 0 && (
                <div className="space-y-1">
                  <div className="px-2.5 text-[10px] font-semibold tracking-wider text-neutral-400 uppercase">
                    Yesterday
                  </div>
                  <div className="space-y-0.5">
                    {groupedSessions.yesterday.map(renderSessionItem)}
                  </div>
                </div>
              )}

              {/* Previous 7 Days Group */}
              {groupedSessions.previous7Days.length > 0 && (
                <div className="space-y-1">
                  <div className="px-2.5 text-[10px] font-semibold tracking-wider text-neutral-400 uppercase">
                    Previous 7 Days
                  </div>
                  <div className="space-y-0.5">
                    {groupedSessions.previous7Days.map(renderSessionItem)}
                  </div>
                </div>
              )}

              {/* Older Group */}
              {groupedSessions.older.length > 0 && (
                <div className="space-y-1">
                  <div className="px-2.5 text-[10px] font-semibold tracking-wider text-neutral-400 uppercase">
                    Older
                  </div>
                  <div className="space-y-0.5">
                    {groupedSessions.older.map(renderSessionItem)}
                  </div>
                </div>
              )}

              {/* Empty Search State */}
              {filteredSessions.length === 0 && (
                <div className="py-8 text-center px-4 space-y-2">
                  <p className="text-xs text-neutral-400">No chats found</p>
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      createNewSession();
                    }}
                    className="text-xs text-cyan-400 hover:underline cursor-pointer"
                  >
                    Start a new chat
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* ================================================================= */
            /* C. TOOLS TAB (Direct Bare Icons & Labels) */
            /* ================================================================= */
            <div className="py-2 animate-in fade-in duration-200">
              {/* Direct Grid of Tools: Notes, Sticky Notes, Calendar, Events */}
              <div className="grid grid-cols-2 gap-y-6 gap-x-2 text-center">
                {filteredGoogleTools.map((tool) => (
                  <button
                    key={tool.id}
                    onClick={() => handleOpenToolModal(tool.id)}
                    className="group flex flex-col items-center justify-center py-2 px-1 rounded-2xl hover:bg-white/[0.05] active:scale-95 transition-all cursor-pointer space-y-2.5 focus:outline-none"
                    title={`Open ${tool.name}`}
                  >
                    <div className="relative">
                      {tool.renderIcon()}
                    </div>
                    <span className="text-xs font-medium text-neutral-200 group-hover:text-white transition-colors">
                      {tool.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 3. Bottom Footer (Direct Settings Quick Links) */}
        <div className="p-3 shrink-0 border-t border-white/[0.08] bg-black/40">
          {/* Quick Settings Action Button */}
          <button
            onClick={() => {
              if (appMode === 'settings') {
                setAppMode('chat');
                setActiveSidebarTab('chats');
              } else {
                openSettingsTab('theme');
              }
              if (window.innerWidth < 1024) setIsSidebarOpen(false);
            }}
            className={`w-full flex items-center justify-between p-2 rounded-xl text-xs font-medium cursor-pointer transition-all ${
              appMode === 'settings'
                ? 'bg-white/15 text-white font-semibold shadow-sm'
                : 'text-neutral-300 hover:text-white hover:bg-white/10'
            }`}
          >
            <div className="flex items-center space-x-2.5">
              <Settings
                className="w-4 h-4"
                style={{ color: appMode === 'settings' ? accentTheme.primary : '#a3a3a3' }}
              />
              <span>System Settings</span>
            </div>
            <span
              className="text-[10px] font-mono px-2 py-0.5 rounded-full"
              style={{
                backgroundColor: `${accentTheme.primary}20`,
                color: accentTheme.primary,
              }}
            >
              {accentTheme.name.split(' ')[0]}
            </span>
          </button>
        </div>
      </>
        ) : (
          /* ========================================================================= */
          /* 2. COLLAPSED ICON RAIL VIEW (Full Icon Suite: Chat, Tools, Control Center) */
          /* ========================================================================= */
          <div className="w-full h-full flex flex-col justify-between items-center py-4 px-2 select-none">
            {/* Top Section: Logo, Expand, New Chat, and Main Tabs */}
            <div className="w-full flex flex-col items-center space-y-3 shrink-0">
              {/* Sidebar Open / Expand Toggle Button */}
              <button
                id="collapsed-expand-logo-btn"
                onClick={() => setIsSidebarOpen(true)}
                className="w-10 h-10 rounded-xl bg-white/[0.06] hover:bg-white/15 border border-white/10 flex items-center justify-center text-neutral-300 hover:text-white transition-all cursor-pointer group shadow-sm"
                title="Open sidebar"
                aria-label="Open sidebar"
              >
                <PanelLeftOpen className="w-4 h-4 group-hover:scale-110 transition-transform" />
              </button>

              {/* "+ New Chat" Button */}
              <button
                id="collapsed-new-chat-btn"
                onClick={() => {
                  createNewSession();
                  setAppMode('chat');
                }}
                className="w-10 h-10 rounded-xl bg-white/[0.08] hover:bg-white/20 border border-white/10 flex items-center justify-center text-cyan-400 hover:text-white transition-all cursor-pointer group shadow-sm"
                title="New Chat"
                aria-label="New Chat"
              >
                <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform duration-200" />
              </button>

              {/* Single Mode Toggle Button (Switches between Chat and Tools mode) */}
              <button
                id="collapsed-mode-toggle-btn"
                onClick={() => {
                  if (appMode === 'chat') {
                    setActiveSidebarTab('tools');
                    setAppMode('tools');
                  } else {
                    setActiveSidebarTab('chats');
                    setAppMode('chat');
                  }
                }}
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer relative group ${
                  'bg-white/20 text-white border border-white/30 shadow-md ring-1 ring-white/20'
                }`}
                title={
                  appMode === 'chat'
                    ? 'Currently in Chat (Click to switch to Tools)'
                    : 'Currently in Tools (Click to switch to Chat)'
                }
                aria-label="Toggle Chat / Tools View"
              >
                {appMode === 'chat' ? (
                  <MessageSquare className="w-4 h-4 group-hover:scale-110 transition-transform" />
                ) : (
                  <LayoutGrid className="w-4 h-4 group-hover:scale-110 transition-transform" />
                )}
                <span
                  className="absolute -top-1 -right-1 w-2 h-2 rounded-full ring-2 ring-[#0A0A0C]"
                  style={{ backgroundColor: accentTheme.primary }}
                />
              </button>

              {/* Subtle Divider */}
              <div className="w-7 h-[1px] bg-white/[0.08] my-1" />
            </div>

            {/* Middle Section: Display EITHER Tools list OR Chat sessions (Not both at once) */}
            <div className="w-full flex-1 min-h-0 my-2 overflow-y-auto no-scrollbar flex flex-col items-center py-2">
              {appMode === 'tools' ? (
                /* Tools List Only with Generous Gap Spacing */
                <div className="flex flex-col items-center space-y-4 w-full py-1">
                  {googleStyleTools.map((tool) => {
                    const isActive = activeTool === tool.id;
                    return (
                      <button
                        key={tool.id}
                        onClick={() => handleOpenToolModal(tool.id)}
                        className="w-11 h-11 flex items-center justify-center transition-all cursor-pointer relative group focus:outline-none shrink-0"
                        title={`${tool.name} (Click to open)`}
                        aria-label={tool.name}
                      >
                        <div
                          className={`transition-all duration-200 ${
                            isActive
                              ? 'scale-105 ring-2 ring-white/80 ring-offset-2 ring-offset-[#0A0A0C] rounded-full shadow-lg'
                              : 'opacity-90 hover:opacity-100 group-hover:scale-105'
                          }`}
                        >
                          {tool.renderIcon(true)}
                        </div>
                        {isActive && (
                          <span
                            className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-1 h-3.5 rounded-full"
                            style={{ backgroundColor: accentTheme.primary }}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              ) : (
                /* Chat Sessions List Only with Clean Spacing */
                <div className="flex flex-col items-center space-y-3 w-full py-1">
                  {sessions.map((session) => {
                    const isActive = session.id === activeSessionId;
                    return (
                      <button
                        key={session.id}
                        onClick={() => {
                          switchSession(session.id);
                          setAppMode('chat');
                        }}
                        className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer relative group shrink-0 ${
                          isActive
                            ? 'bg-white/20 text-white border border-white/25 font-bold shadow-sm'
                            : 'text-neutral-400 hover:text-white hover:bg-white/10 border border-transparent'
                        }`}
                        title={session.title}
                        aria-label={session.title}
                      >
                        {session.pinned ? (
                          <Pin className="w-4 h-4 text-amber-400" />
                        ) : (
                          <MessageSquare className="w-4 h-4" />
                        )}
                        {isActive && (
                          <span
                            className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-1 h-3.5 rounded-full"
                            style={{ backgroundColor: accentTheme.primary }}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Bottom Section: Audio Mute, Live AI Status, and Settings */}
            <div className="w-full flex flex-col items-center space-y-3 shrink-0 pt-3 border-t border-white/[0.08]">
              {/* Quick Sound Mute / Unmute Toggle */}
              <button
                id="collapsed-audio-mute-toggle-btn"
                onClick={() =>
                  setVoicePrefs({ ...voicePrefs, autoSpeak: !voicePrefs.autoSpeak })
                }
                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                  voicePrefs.autoSpeak
                    ? 'text-neutral-400 hover:text-white hover:bg-white/10'
                    : 'text-rose-400 bg-rose-500/15 border border-rose-500/30'
                }`}
                title={voicePrefs.autoSpeak ? 'Audio Speech Active (Click to mute)' : 'Audio Muted (Click to unmute)'}
                aria-label="Sound Toggle"
              >
                {voicePrefs.autoSpeak ? (
                  <Volume2 className="w-3.5 h-3.5" />
                ) : (
                  <VolumeX className="w-3.5 h-3.5" />
                )}
              </button>

              {/* Online Pulse Dot */}
              <div
                className="w-6 h-6 rounded-full bg-white/[0.03] border border-white/[0.08] flex items-center justify-center cursor-default"
                title="Fox AI Core Online"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              </div>

              {/* System Settings Button */}
              <button
                id="collapsed-settings-btn"
                onClick={() => {
                  if (appMode === 'settings') {
                    setAppMode('chat');
                    setActiveSidebarTab('chats');
                  } else {
                    openSettingsTab('theme');
                  }
                }}
                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                  appMode === 'settings'
                    ? 'bg-white/20 text-white shadow-sm border border-white/20'
                    : 'text-neutral-400 hover:text-white hover:bg-white/10 border border-transparent'
                }`}
                title="System Settings"
                aria-label="System Settings"
              >
                <Settings
                  className="w-4 h-4"
                  style={{
                    color: appMode === 'settings' ? accentTheme.primary : undefined,
                  }}
                />
              </button>
            </div>
          </div>
        )}
      </aside>
    </>
  );
};
