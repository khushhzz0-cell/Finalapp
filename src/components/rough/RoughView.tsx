import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { RoughItem } from '../../types';
import {
  Plus,
  Trash2,
  ArrowRight,
  FolderPlus,
  CheckCircle2,
  Sparkles,
  Bookmark,
  X,
  Search,
  Filter,
} from 'lucide-react';
import { SCREEN_IDENTITIES } from '../../utils/screenIdentities';
import { triggerHaptic } from '../../utils/haptics';

const CATEGORIES = ['Note', 'Todo', 'Idea', 'Resource', 'Random'];

const getCategoryStyle = (category: string) => {
  const cat = (category || '').toLowerCase();
  if (cat.includes('idea')) {
    return { dot: 'bg-[#bf5af2]', text: 'text-[#bf5af2]' };
  }
  if (cat.includes('look') || cat.includes('resource')) {
    return { dot: 'bg-[#30d158]', text: 'text-[#30d158]' };
  }
  if (cat.includes('todo')) {
    return { dot: 'bg-[#ff9f0a]', text: 'text-[#ff9f0a]' };
  }
  if (cat.includes('buy') || cat.includes('random')) {
    return { dot: 'bg-[#ff375f]', text: 'text-[#ff375f]' };
  }
  return { dot: 'bg-[#0a84ff]', text: 'text-[#0a84ff]' };
};

const getDateDisplay = (dateKey: string) => {
  try {
    const parts = dateKey.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const dateObj = new Date(year, month, day);
      const dayNumber = dateObj.getDate();
      const weekday = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
      return { dayNumber: String(dayNumber), weekday };
    }
  } catch {
    // fallback
  }
  return { dayNumber: dateKey, weekday: '' };
};

export const RoughView: React.FC = () => {
  const identity = SCREEN_IDENTITIES.rough;
  const {
    rough,
    addRough,
    deleteRough,
    moveRough,
    isMinimalMode,
    isQuickAddOpen,
    setIsQuickAddOpen,
  } = useApp();

  const [inputText, setInputText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Note');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeItemForMove, setActiveItemForMove] = useState<RoughItem | null>(null);

  // Quick Add listener to focus input
  React.useEffect(() => {
    if (isQuickAddOpen) {
      const el = document.getElementById('rough-quick-input');
      if (el) {
        el.focus();
      }
      setIsQuickAddOpen(false);
    }
  }, [isQuickAddOpen, setIsQuickAddOpen]);

  const handleFastAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    triggerHaptic('success');
    addRough(inputText.trim(), selectedCategory);
    setInputText('');
  };

  // Real-time detection of multiple 'xxx' entries
  const multiNotesPreview = /xxx/i.test(inputText)
    ? inputText.trim().split(/(?:^|\s+)xxx\s*/i).map(p => p.trim()).filter(p => p.length > 0)
    : [];

  const filteredRough = rough.filter(r => {
    if (filterCategory !== 'all' && r.category.toLowerCase() !== filterCategory.toLowerCase()) {
      return false;
    }
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return r.text.toLowerCase().includes(q) || r.category.toLowerCase().includes(q);
  });

  // Group filtered items by date (YYYY-MM-DD)
  const groupedByDate = filteredRough.reduce<Record<string, RoughItem[]>>((acc, item) => {
    const dateKey = item.createdAt ? item.createdAt.slice(0, 10) : 'Undated';
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(item);
    return acc;
  }, {});

  // Sort dates descending (newest on top)
  const sortedDateKeys = Object.keys(groupedByDate).sort((a, b) => b.localeCompare(a));

  return (
    <div className={`pb-20 ${isMinimalMode ? 'space-y-3 pt-1' : 'space-y-4'}`}>
      {/* Top Header (Hidden in Minimal Mode) */}
      {!isMinimalMode && (
        <div className="pt-1 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2
                className="text-lg font-semibold tracking-tight text-white"
                style={{ color: identity.tintWhite }}
              >
                Quick Notes
              </h2>
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-400 font-mono">
                {filteredRough.length}/{rough.length}
              </span>
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">
              Fast capture inbox
            </p>
          </div>
        </div>
      )}

      {/* Fast Capture Bar */}
      <form onSubmit={handleFastAdd} className="space-y-2">
        <div className="bg-[#121215] rounded-xl p-3 border border-white/[0.06] space-y-2.5 shadow-sm transition-colors focus-within:border-white/20">
          <textarea
            id="rough-quick-input"
            rows={2}
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleFastAdd(e);
              }
            }}
            placeholder="Type anything... Tip: use 'xxx' for multi-notes (e.g. xxxa xxxb xxxc)"
            className="w-full bg-transparent text-zinc-100 text-xs sm:text-sm focus:outline-none placeholder:text-zinc-600 resize-none"
          />

          {/* Real-time multi-note detection banner */}
          {multiNotesPreview.length > 1 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Sparkles className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="font-medium">{multiNotesPreview.length} separate notes detected:</span>
              <span className="truncate text-zinc-300">
                {multiNotesPreview.map(m => `"${m}"`).join(', ')}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/[0.04]">
            {/* Category Selector */}
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    setSelectedCategory(cat);
                  }}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer select-none ${
                    selectedCategory === cat
                      ? 'bg-white/[0.12] text-zinc-100 shadow-sm'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Circular Plus Save Button */}
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="w-7 h-7 rounded-lg disabled:opacity-30 bg-emerald-500 hover:bg-emerald-600 text-black flex items-center justify-center transition shadow-sm cursor-pointer flex-shrink-0 active:scale-95 font-medium"
              title="Save Note"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
          </div>
        </div>
      </form>

      {/* Search Bar & Filter Tabs (Hidden in Minimal Mode) */}
      {!isMinimalMode && (
        <div className="space-y-2.5">
          {/* Search Bar */}
          <div className="relative flex items-center bg-[#141417] rounded-lg border border-white/[0.06] px-3 py-1.5 focus-within:border-white/20 transition-colors">
            <Search className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0 mr-2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search rough notes, todos, or ideas..."
              className="w-full bg-transparent text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  setSearchQuery('');
                }}
                className="p-0.5 rounded text-zinc-500 hover:text-white transition"
                title="Clear Search"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Filter Tabs with Haptic Feedback */}
          <div className="flex items-center bg-[#141417] p-1 rounded-lg border border-white/[0.04] overflow-x-auto no-scrollbar gap-0.5 select-none">
            <button
              onClick={() => {
                triggerHaptic('selection');
                setFilterCategory('all');
              }}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer whitespace-nowrap ${
                filterCategory === 'all'
                  ? 'bg-white/[0.12] text-zinc-100'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              All ({rough.length})
            </button>
            {CATEGORIES.map(c => {
              const count = rough.filter(r => r.category.toLowerCase() === c.toLowerCase()).length;
              return (
                <button
                  key={c}
                  onClick={() => {
                    triggerHaptic('selection');
                    setFilterCategory(c);
                  }}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer whitespace-nowrap capitalize flex items-center gap-1.5 ${
                    filterCategory === c
                      ? 'bg-white/[0.12] text-zinc-100'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  <span>{c}</span>
                  <span className="text-[10px] font-mono opacity-60">({count})</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Captured Notes Grouped by Date */}
      {filteredRough.length === 0 ? (
        <div className="bg-[#121215] rounded-xl p-8 text-center border border-white/[0.06] text-xs text-zinc-500">
          No captured items in this view.
        </div>
      ) : (
        <div className="space-y-4">
          {sortedDateKeys.map(dateKey => {
            const items = groupedByDate[dateKey];
            const { dayNumber, weekday } = getDateDisplay(dateKey);

            return (
              <div key={dateKey} className="space-y-2">
                {/* Minimal Date Separator Header: e.g. "22 Mon ─────────" */}
                <div className="flex items-center gap-2 pt-1 pb-0.5">
                  <span className="text-base font-semibold text-zinc-100 tracking-tight leading-none">
                    {dayNumber}
                  </span>
                  <span className="text-xs font-medium text-zinc-500 leading-none">
                    {weekday}
                  </span>
                  <div className="flex-1 h-[1px] bg-white/[0.06] ml-2" />
                </div>

                {/* Date's Note Cards - 2 column grid in landscape */}
                <div className="grid grid-cols-1 landscape:grid-cols-2 gap-2">
                  {items.map(item => {
                    const catStyle = getCategoryStyle(item.category);

                    return (
                      <div
                        key={item.id}
                        className="bg-[#121215] hover:bg-[#151518] rounded-xl p-3 sm:p-3.5 border border-white/[0.06] flex items-center justify-between gap-3 transition shadow-sm group"
                      >
                        {/* Note Content - maximizing space */}
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className={`w-1.5 h-1.5 rounded-full ${catStyle.dot}`} />
                            <span className={`text-[11px] font-medium ${catStyle.text}`}>
                              {item.category}
                            </span>
                          </div>

                          <p className="text-[13px] text-zinc-100 font-normal leading-relaxed whitespace-pre-wrap break-words">
                            {item.text}
                          </p>
                        </div>

                        {/* Far Right Vertically Stacked Action Buttons */}
                        <div className="flex flex-col gap-1.5 shrink-0 self-center">
                          {/* Trash on Top */}
                          <button
                            type="button"
                            onClick={() => {
                              triggerHaptic('warning');
                              deleteRough(item.id);
                            }}
                            className="w-7 h-7 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 flex items-center justify-center transition cursor-pointer active:scale-95 text-rose-400"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Move Right Arrow (→) on Bottom */}
                          <button
                            type="button"
                            onClick={() => setActiveItemForMove(item)}
                            className="w-7 h-7 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 flex items-center justify-center transition cursor-pointer active:scale-95 text-sky-400"
                            title="Move"
                          >
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Move To Modal (Apple Action Sheet) */}
      {activeItemForMove && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-[#18181b] border-t sm:border border-white/10 rounded-t-2xl sm:rounded-2xl w-full max-w-sm p-4 shadow-2xl space-y-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
              <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">
                Move Note To
              </span>
              <button
                onClick={() => setActiveItemForMove(null)}
                className="w-5 h-5 rounded-md text-zinc-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <p className="text-xs text-zinc-300 line-clamp-2 bg-[#121215] border border-white/[0.06] p-2.5 rounded-lg">
              "{activeItemForMove.text}"
            </p>

            <div className="space-y-1">
              <button
                onClick={() => {
                  moveRough(activeItemForMove.id, 'routine');
                  setActiveItemForMove(null);
                }}
                className="w-full p-2.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.04] text-left text-xs font-medium text-zinc-200 flex items-center justify-between transition cursor-pointer"
              >
                <span>Routine (Recurring)</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </button>

              <button
                onClick={() => {
                  moveRough(activeItemForMove.id, 'projects');
                  setActiveItemForMove(null);
                }}
                className="w-full p-2.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.04] text-left text-xs font-medium text-zinc-200 flex items-center justify-between transition cursor-pointer"
              >
                <span>Project (Regular)</span>
                <FolderPlus className="w-4 h-4 text-[#0a84ff]" />
              </button>

              <button
                onClick={() => {
                  moveRough(activeItemForMove.id, 'priorities');
                  setActiveItemForMove(null);
                }}
                className="w-full p-2.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.04] text-left text-xs font-medium text-zinc-200 flex items-center justify-between transition cursor-pointer"
              >
                <span>Project (Top Priority)</span>
                <span className="text-rose-400 font-medium text-xs flex items-center gap-1">
                  <span>🔴</span> Top Priority
                </span>
              </button>

              <button
                onClick={() => {
                  moveRough(activeItemForMove.id, 'learning');
                  setActiveItemForMove(null);
                }}
                className="w-full p-2.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.04] text-left text-xs font-medium text-zinc-200 flex items-center justify-between transition cursor-pointer"
              >
                <span>Learning Queue</span>
                <Sparkles className="w-4 h-4 text-[#bf5af2]" />
              </button>

              <button
                onClick={() => {
                  moveRough(activeItemForMove.id, 'reminders');
                  setActiveItemForMove(null);
                }}
                className="w-full p-2.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.04] text-left text-xs font-medium text-zinc-200 flex items-center justify-between transition cursor-pointer"
              >
                <span>Reminders Board</span>
                <Bookmark className="w-4 h-4 text-amber-500" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

