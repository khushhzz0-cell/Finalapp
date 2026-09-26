import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { SCREEN_IDENTITIES } from '../../utils/screenIdentities';
import { NavigationTab, ScheduleType } from '../../types';
import { triggerHaptic } from '../../utils/haptics';
import {
  Search,
  X,
  FolderKanban,
  CheckCircle2,
  Circle,
  Repeat,
  Flame,
  BookOpen,
  Bell,
  FileText,
  ArrowRight,
  Sparkles,
  Command,
  CornerDownLeft,
  Filter,
  Check,
} from 'lucide-react';

export type SearchCategoryFilter = 'all' | 'projects' | 'tasks' | 'routines' | 'habits' | 'learning' | 'reminders' | 'notes';
export type SearchStatusFilter = 'all' | 'active' | 'completed' | 'priority';

interface SearchResultItem {
  id: string;
  tab: NavigationTab;
  category: SearchCategoryFilter;
  title: string;
  subtitle?: string;
  contextTag?: string;
  accentColor: string;
  icon: React.ElementType;
  isCompleted?: boolean;
  isPriority?: boolean;
  metaBadge?: string;
  // Optional action callback
  onToggleComplete?: () => void;
  rawItem?: any;
}

export const UniversalSearchModal: React.FC = () => {
  const {
    isSearchOpen,
    setIsSearchOpen,
    setCurrentTab,
    projects,
    toggleSubtask,
    routines,
    toggleRoutineCompletion,
    isRoutineDoneToday,
    habits,
    toggleHabitCompletion,
    learning,
    phases,
    seasons,
    reminders,
    rough,
    addRough,
  } = useApp();

  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<SearchCategoryFilter>('all');
  const [selectedStatus, setSelectedStatus] = useState<SearchStatusFilter>('all');
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input on open
  useEffect(() => {
    if (isSearchOpen) {
      setQuery('');
      setSelectedCategory('all');
      setSelectedStatus('all');
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isSearchOpen]);

  // Global Keyboard listener for Cmd+K / Ctrl+K and Esc
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K or Ctrl+K opens or closes search
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        triggerHaptic('selection');
        setIsSearchOpen(!isSearchOpen);
      } else if (e.key === 'Escape' && isSearchOpen) {
        e.preventDefault();
        triggerHaptic('light');
        setIsSearchOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearchOpen, setIsSearchOpen]);

  // Build unified searchable index
  const allSearchItems = useMemo<SearchResultItem[]>(() => {
    const list: SearchResultItem[] = [];

    // 1. Projects
    projects.forEach(p => {
      const isPri = p.priorityLevel === 'top' || p.isPriority;
      list.push({
        id: `proj_${p.id}`,
        tab: 'projects',
        category: 'projects',
        title: p.name,
        subtitle: p.description || (p.subtasks?.length ? `${p.subtasks.length} tasks` : undefined),
        contextTag: `Project • ${p.status.toUpperCase()}`,
        accentColor: SCREEN_IDENTITIES.projects.accentColor,
        icon: FolderKanban,
        isCompleted: p.status === 'completed',
        isPriority: isPri,
        metaBadge: isPri ? 'Top Priority' : p.status,
        rawItem: p,
      });

      // Subtasks
      if (p.subtasks) {
        p.subtasks.forEach(st => {
          list.push({
            id: `st_${p.id}_${st.id}`,
            tab: 'projects',
            category: 'tasks',
            title: st.text,
            subtitle: `In project "${p.name}"`,
            contextTag: st.date ? `Due: ${st.date}` : `Task`,
            accentColor: SCREEN_IDENTITIES.projects.accentColor,
            icon: st.completed ? CheckCircle2 : Circle,
            isCompleted: st.completed,
            isPriority: isPri,
            metaBadge: st.completed ? 'Done' : 'Task',
            onToggleComplete: () => {
              triggerHaptic('success');
              toggleSubtask(p.id, st.id);
            },
            rawItem: st,
          });
        });
      }
    });

    // 2. Routines
    routines.forEach(r => {
      const doneToday = isRoutineDoneToday(r);
      list.push({
        id: `rt_${r.id}`,
        tab: 'routine',
        category: 'routines',
        title: r.title,
        subtitle: r.description || (r.subroutines?.length ? `${r.subroutines.length} steps` : undefined),
        contextTag: `Routine • ${r.timeOfDay || 'anytime'}`,
        accentColor: SCREEN_IDENTITIES.routine.accentColor,
        icon: Repeat,
        isCompleted: doneToday,
        isPriority: r.dueToday,
        metaBadge: doneToday ? 'Done Today' : r.scheduleType.replace('_', ' '),
        onToggleComplete: () => {
          triggerHaptic('success');
          toggleRoutineCompletion(r.id);
        },
        rawItem: r,
      });

      if (r.subroutines) {
        r.subroutines.forEach(sub => {
          list.push({
            id: `rtsub_${r.id}_${sub.id}`,
            tab: 'routine',
            category: 'routines',
            title: sub.title,
            subtitle: `Step in routine "${r.title}"`,
            contextTag: `Subroutine`,
            accentColor: SCREEN_IDENTITIES.routine.accentColor,
            icon: Repeat,
            isCompleted: Boolean(sub.completed),
            rawItem: sub,
          });
        });
      }
    });

    // 3. Habits
    habits.forEach(h => {
      const today = new Date().toISOString().split('T')[0];
      const doneToday = h.completedDates?.includes(today);
      list.push({
        id: `hb_${h.id}`,
        tab: 'habits',
        category: 'habits',
        title: h.title,
        subtitle: h.description || `${h.trialDurationDays}-day trial period`,
        contextTag: `Habit • ${h.status}`,
        accentColor: SCREEN_IDENTITIES.habits.accentColor,
        icon: Flame,
        isCompleted: doneToday,
        metaBadge: doneToday ? 'Completed' : `${h.completedDates?.length || 0}d logged`,
        onToggleComplete: () => {
          triggerHaptic('success');
          toggleHabitCompletion(h.id);
        },
        rawItem: h,
      });
    });

    // 4. Learning & Phases
    learning.forEach(l => {
      list.push({
        id: `lrn_${l.id}`,
        tab: 'learning',
        category: 'learning',
        title: l.topic,
        subtitle: l.whatToLearn || l.notes,
        contextTag: `Learning • ${l.type.toUpperCase()}`,
        accentColor: SCREEN_IDENTITIES.learning.accentColor,
        icon: BookOpen,
        isCompleted: l.status === 'completed',
        metaBadge: l.status.replace('_', ' '),
        rawItem: l,
      });
    });

    phases.forEach(ph => {
      list.push({
        id: `ph_${ph.id}`,
        tab: 'learning',
        category: 'learning',
        title: ph.title,
        subtitle: `${ph.startDate} – ${ph.endDate}`,
        contextTag: `Learning Phase`,
        accentColor: SCREEN_IDENTITIES.learning.accentColor,
        icon: BookOpen,
        metaBadge: 'Phase',
        rawItem: ph,
      });
    });

    seasons.forEach(s => {
      list.push({
        id: `sn_${s.id}`,
        tab: 'learning',
        category: 'learning',
        title: s.title,
        subtitle: s.broadFocus,
        contextTag: `Season Focus`,
        accentColor: SCREEN_IDENTITIES.learning.accentColor,
        icon: BookOpen,
        metaBadge: 'Season',
        rawItem: s,
      });
    });

    // 5. Reminders
    reminders.forEach(rm => {
      list.push({
        id: `rm_${rm.id}`,
        tab: 'reminders',
        category: 'reminders',
        title: rm.title,
        subtitle: rm.notes || `Media type: ${rm.mediaType}`,
        contextTag: `Reminder • ${rm.mediaType}`,
        accentColor: SCREEN_IDENTITIES.reminders.accentColor,
        icon: Bell,
        metaBadge: rm.mediaType,
        rawItem: rm,
      });
    });

    // 6. Rough Notes
    rough.forEach(rn => {
      list.push({
        id: `rn_${rn.id}`,
        tab: 'rough',
        category: 'notes',
        title: rn.text,
        subtitle: `Logged on ${rn.createdAt.split('T')[0]}`,
        contextTag: `Note • ${rn.category}`,
        accentColor: SCREEN_IDENTITIES.rough.accentColor,
        icon: FileText,
        metaBadge: rn.category,
        rawItem: rn,
      });
    });

    return list;
  }, [projects, routines, habits, learning, phases, seasons, reminders, rough, isRoutineDoneToday, toggleSubtask, toggleRoutineCompletion, toggleHabitCompletion]);

  // Compute category item counts for badges
  const categoryCounts = useMemo(() => {
    const counts: Record<SearchCategoryFilter, number> = {
      all: allSearchItems.length,
      projects: 0,
      tasks: 0,
      routines: 0,
      habits: 0,
      learning: 0,
      reminders: 0,
      notes: 0,
    };
    allSearchItems.forEach(item => {
      counts[item.category] = (counts[item.category] || 0) + 1;
    });
    return counts;
  }, [allSearchItems]);

  // Filtered results
  const filteredResults = useMemo(() => {
    const q = query.trim().toLowerCase();

    return allSearchItems.filter(item => {
      // Category filter
      if (selectedCategory !== 'all' && item.category !== selectedCategory) {
        return false;
      }

      // Status filter
      if (selectedStatus === 'active' && item.isCompleted) return false;
      if (selectedStatus === 'completed' && !item.isCompleted) return false;
      if (selectedStatus === 'priority' && !item.isPriority) return false;

      // Text query match
      if (!q) return true;

      const titleMatch = item.title.toLowerCase().includes(q);
      const subtitleMatch = item.subtitle ? item.subtitle.toLowerCase().includes(q) : false;
      const contextMatch = item.contextTag ? item.contextTag.toLowerCase().includes(q) : false;
      const badgeMatch = item.metaBadge ? item.metaBadge.toLowerCase().includes(q) : false;

      return titleMatch || subtitleMatch || contextMatch || badgeMatch;
    });
  }, [allSearchItems, query, selectedCategory, selectedStatus]);

  const handleSelectResult = (item: SearchResultItem) => {
    triggerHaptic('selection');
    setCurrentTab(item.tab);
    setIsSearchOpen(false);
  };

  const handleFilterCategory = (cat: SearchCategoryFilter) => {
    triggerHaptic('selection');
    setSelectedCategory(cat);
  };

  const handleFilterStatus = (status: SearchStatusFilter) => {
    triggerHaptic('selection');
    setSelectedStatus(status);
  };

  const handleCreateQuickNote = () => {
    if (!query.trim()) return;
    triggerHaptic('success');
    addRough(query.trim(), 'Note');
    setCurrentTab('rough');
    setIsSearchOpen(false);
  };

  if (!isSearchOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Universal Search and Filter"
      className="fixed inset-0 z-50 flex items-start justify-center pt-8 sm:pt-16 p-3 sm:p-4 bg-black/70 backdrop-blur-md animate-fade-in"
      onClick={() => setIsSearchOpen(false)}
    >
      <div
        className="w-full max-w-2xl bg-[#18181b] border border-white/10 rounded-2xl shadow-[0_25px_70px_rgba(0,0,0,0.85)] overflow-hidden flex flex-col max-h-[85vh] transition-all"
        onClick={e => e.stopPropagation()}
      >
        {/* Search Input Box */}
        <div className="p-3 sm:p-3.5 border-b border-white/[0.06] flex items-center gap-2.5 bg-black/20">
          <Search className="w-4 h-4 text-zinc-500 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search projects, tasks, routines, habits, notes..."
            className="w-full bg-transparent text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none"
          />
          {query ? (
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setQuery('');
                inputRef.current?.focus();
              }}
              className="p-1 rounded-md text-zinc-500 hover:text-white transition"
              title="Clear Search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <div className="hidden sm:flex items-center gap-1 px-1.5 py-0.5 rounded border border-white/10 text-[10px] text-zinc-500 font-mono">
              <Command className="w-2.5 h-2.5" />
              <span>K</span>
            </div>
          )}
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              setIsSearchOpen(false);
            }}
            className="text-xs font-medium text-zinc-400 hover:text-white px-1 sm:hidden"
          >
            Cancel
          </button>
        </div>

        {/* Filter Pills Header */}
        <div className="p-2 sm:px-3 sm:py-2 border-b border-white/[0.04] bg-[#141417] space-y-1.5">
          {/* Category Filter Pills */}
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none pb-0.5">
            <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider pl-1 pr-1 flex-shrink-0 flex items-center gap-1">
              <Filter className="w-2.5 h-2.5" />
              Type:
            </span>
            {(
              [
                { id: 'all', label: 'All', count: categoryCounts.all },
                { id: 'projects', label: 'Projects', count: categoryCounts.projects },
                { id: 'tasks', label: 'Tasks', count: categoryCounts.tasks },
                { id: 'routines', label: 'Routines', count: categoryCounts.routines },
                { id: 'habits', label: 'Habits', count: categoryCounts.habits },
                { id: 'learning', label: 'Learning', count: categoryCounts.learning },
                { id: 'reminders', label: 'Reminders', count: categoryCounts.reminders },
                { id: 'notes', label: 'Notes', count: categoryCounts.notes },
              ] as { id: SearchCategoryFilter; label: string; count: number }[]
            ).map(pill => {
              const active = selectedCategory === pill.id;
              return (
                <button
                  key={pill.id}
                  type="button"
                  onClick={() => handleFilterCategory(pill.id)}
                  className={`px-2 py-0.5 rounded-md text-[11px] font-medium whitespace-nowrap transition-all flex items-center gap-1 cursor-pointer ${
                    active
                      ? 'bg-white/[0.12] text-zinc-100'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  <span>{pill.label}</span>
                  <span
                    className={`text-[9px] font-mono px-1 rounded ${
                      active ? 'bg-white/20 text-white' : 'text-zinc-600'
                    }`}
                  >
                    {pill.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Status Filter Pills */}
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none pt-0.5">
            <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider pl-1 pr-1 flex-shrink-0">
              Status:
            </span>
            {(
              [
                { id: 'all', label: 'All' },
                { id: 'active', label: 'Active / Pending' },
                { id: 'completed', label: 'Completed' },
                { id: 'priority', label: 'Priority' },
              ] as { id: SearchStatusFilter; label: string }[]
            ).map(st => {
              const active = selectedStatus === st.id;
              return (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => handleFilterStatus(st.id)}
                  className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition cursor-pointer ${
                    active
                      ? 'bg-[#0a84ff]/20 text-[#0a84ff] border border-[#0a84ff]/30'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {st.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto divide-y divide-white/[0.04] p-1.5 space-y-0.5">
          {filteredResults.length === 0 ? (
            <div className="py-12 px-4 text-center space-y-3">
              <p className="text-xs text-zinc-500">
                {query
                  ? `No matching items found for "${query}"`
                  : 'No items match the selected filters.'}
              </p>
              {query && (
                <button
                  type="button"
                  onClick={handleCreateQuickNote}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/10 text-xs text-zinc-200 transition cursor-pointer border border-white/[0.06]"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#0a84ff]" />
                  <span>Create quick note: "{query.slice(0, 30)}"</span>
                </button>
              )}
            </div>
          ) : (
            filteredResults.map(item => {
              const IconComp = item.icon;
              return (
                <div
                  key={item.id}
                  onClick={() => handleSelectResult(item)}
                  className="p-2 rounded-lg hover:bg-white/[0.04] active:bg-white/[0.07] transition flex items-center justify-between gap-2.5 group cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    {/* Interactive Completion Toggle or Icon */}
                    {item.onToggleComplete ? (
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          item.onToggleComplete?.();
                        }}
                        className="w-5 h-5 rounded-full flex items-center justify-center transition hover:scale-105 active:scale-95 flex-shrink-0 cursor-pointer"
                        title={item.isCompleted ? 'Mark Incomplete' : 'Mark Complete'}
                      >
                        {item.isCompleted ? (
                          <CheckCircle2
                            className="w-4 h-4 transition-transform text-emerald-400"
                          />
                        ) : (
                          <Circle className="w-4 h-4 text-zinc-600 hover:text-zinc-300" />
                        )}
                      </button>
                    ) : (
                      <div
                        className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0"
                        style={{
                          backgroundColor: `${item.accentColor}18`,
                          color: item.accentColor,
                        }}
                      >
                        <IconComp className="w-3.5 h-3.5" />
                      </div>
                    )}

                    {/* Text Details */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs font-medium truncate ${
                            item.isCompleted ? 'line-through text-zinc-500' : 'text-zinc-100'
                          }`}
                        >
                          {item.title}
                        </span>
                        {item.metaBadge && (
                          <span className="text-[10px] font-mono px-1 rounded bg-white/[0.04] text-zinc-500 flex-shrink-0 hidden sm:inline">
                            {item.metaBadge}
                          </span>
                        )}
                      </div>
                      {item.subtitle && (
                        <p className="text-[11px] text-zinc-500 truncate">
                          {item.subtitle}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Context and Jump Button */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {item.contextTag && (
                      <span className="text-[10px] text-zinc-500 font-mono hidden md:inline">
                        {item.contextTag}
                      </span>
                    )}
                    <span className="w-5 h-5 rounded-md flex items-center justify-center text-zinc-500 group-hover:text-zinc-200 group-hover:bg-white/[0.04] transition">
                      <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts hint */}
        <div className="p-2 sm:px-3 sm:py-2 border-t border-white/[0.04] bg-[#121215] flex items-center justify-between text-[11px] text-zinc-500">
          <span className="font-mono text-[10px]">
            {filteredResults.length} {filteredResults.length === 1 ? 'item' : 'items'} found
          </span>
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline flex items-center gap-1 text-[10px]">
              <CornerDownLeft className="w-3 h-3 inline" /> Press Enter to Open
            </span>
            <span className="flex items-center gap-1 font-mono text-[10px]">
              ESC to Close
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
