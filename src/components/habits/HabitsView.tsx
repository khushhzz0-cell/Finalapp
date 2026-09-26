import React, { useState } from 'react';
import { useApp, getTodayDateStr } from '../../context/AppContext';
import { ScheduleType } from '../../types';
import {
  Plus,
  Search,
  X,
  Filter,
} from 'lucide-react';
import { SCREEN_IDENTITIES } from '../../utils/screenIdentities';
import { HabitCard } from './HabitCard';
import { triggerHaptic } from '../../utils/haptics';

export const HabitsView: React.FC = () => {
  const identity = SCREEN_IDENTITIES.habits;
  const {
    habits,
    addHabit,
    deleteHabit,
    toggleHabitCompletion,
    cycleHabitDateState,
    addHabitToRoutine,
    isMinimalMode,
    isQuickAddOpen,
    setIsQuickAddOpen,
  } = useApp();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Quick Add listener
  React.useEffect(() => {
    if (isQuickAddOpen) {
      setIsAddModalOpen(true);
      setIsQuickAddOpen(false);
    }
  }, [isQuickAddOpen, setIsQuickAddOpen]);
  const [promoteHabitId, setPromoteHabitId] = useState<string | null>(null);
  const [scheduleChoice, setScheduleChoice] = useState<ScheduleType>('daily');

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [trialDays, setTrialDays] = useState(14);

  const todayStr = getTodayDateStr();

  const handleCreateHabit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    addHabit({
      title: title.trim(),
      description: description.trim() || undefined,
      startDate: todayStr,
      trialDurationDays: trialDays || 14,
    });

    setTitle('');
    setDescription('');
    setTrialDays(14);
    setIsAddModalOpen(false);
  };

  const handlePromoteConfirm = () => {
    if (!promoteHabitId) return;
    addHabitToRoutine(promoteHabitId, scheduleChoice);
    setPromoteHabitId(null);
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'graduated'>('all');

  const matchesSearch = (h: { title: string; description?: string }) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return h.title.toLowerCase().includes(q) || (h.description || '').toLowerCase().includes(q);
  };

  const rawActiveHabits = habits.filter(h => h.status === 'active');
  const rawGraduatedHabits = habits.filter(h => h.status === 'graduated');

  const activeHabits = rawActiveHabits.filter(matchesSearch);
  const graduatedHabits = rawGraduatedHabits.filter(matchesSearch);

  // Track which habit cards are expanded into Full Calendar View (default: all collapsed/minimal)
  const [expandedHabits, setExpandedHabits] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('focusdo_expanded_habits');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  const toggleExpand = (habitId: string) => {
    setExpandedHabits(prev => {
      const next = new Set(prev);
      if (next.has(habitId)) {
        next.delete(habitId);
      } else {
        next.add(habitId);
      }
      try {
        localStorage.setItem('focusdo_expanded_habits', JSON.stringify(Array.from(next)));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const handleExpandAll = () => {
    const allIds = new Set(activeHabits.map(h => h.id));
    setExpandedHabits(allIds);
    try {
      localStorage.setItem('focusdo_expanded_habits', JSON.stringify(Array.from(allIds)));
    } catch {
      // ignore
    }
  };

  const handleCollapseAll = () => {
    setExpandedHabits(new Set());
    try {
      localStorage.removeItem('focusdo_expanded_habits');
    } catch {
      // ignore
    }
  };

  return (
    <div className={`pb-20 ${isMinimalMode ? 'space-y-3 pt-1' : 'space-y-4'}`}>
      {/* Top Header & New Button (Hidden in Minimal Mode) */}
      {!isMinimalMode && (
        <div className="flex items-center justify-between pt-1">
          <div>
            <h2
              className="text-lg font-semibold tracking-tight"
              style={{ color: identity.tintWhite }}
            >
              14-Day Habit Trial
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Test consistency for 2 weeks before making it permanent
            </p>
          </div>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="h-8 px-3 rounded-lg bg-amber-500 hover:bg-amber-600 text-black font-medium text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>New Trial</span>
          </button>
        </div>
      )}

      {/* Search Bar & Filter Controls (Hidden in Minimal Mode) */}
      {!isMinimalMode && (
        <div className="space-y-2.5">
          {/* Search Input */}
          <div className="relative flex items-center bg-[#141417] rounded-lg border border-white/[0.06] px-3 py-1.5 focus-within:border-white/20 transition-colors">
            <Search className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0 mr-2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search habits and trials..."
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

          {/* Status Filter Pills */}
          <div className="flex items-center justify-between gap-2 overflow-x-auto select-none">
            <div className="flex items-center gap-1 bg-[#141417] p-1 rounded-lg border border-white/[0.04]">
              {[
                { id: 'all', label: 'All', count: rawActiveHabits.length + rawGraduatedHabits.length },
                { id: 'active', label: 'Active Trials', count: rawActiveHabits.length },
                { id: 'graduated', label: 'Graduated', count: rawGraduatedHabits.length },
              ].map(pill => {
                const isSelected = statusFilter === pill.id;
                return (
                  <button
                    key={pill.id}
                    type="button"
                    onClick={() => {
                      triggerHaptic('selection');
                      setStatusFilter(pill.id as any);
                    }}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-white/[0.12] text-zinc-100 shadow-sm'
                        : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    <span>{pill.label}</span>
                    <span
                      className={`text-[10px] font-mono px-1 rounded ${
                        isSelected ? 'bg-white/20 text-white' : 'text-zinc-600'
                      }`}
                    >
                      {pill.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Expand / Collapse All */}
            {activeHabits.length > 0 && statusFilter !== 'graduated' && (
              <div>
                {expandedHabits.size > 0 ? (
                  <button
                    onClick={() => {
                      triggerHaptic('light');
                      handleCollapseAll();
                    }}
                    className="text-[11px] text-zinc-500 hover:text-zinc-300 transition cursor-pointer whitespace-nowrap"
                  >
                    Collapse all
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      triggerHaptic('light');
                      handleExpandAll();
                    }}
                    className="text-[11px] text-zinc-500 hover:text-zinc-300 transition cursor-pointer whitespace-nowrap"
                  >
                    Expand all
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Active Habits List */}
      {statusFilter !== 'graduated' && (
        activeHabits.length === 0 ? (
          <div className="bg-[#121215] rounded-xl p-8 text-center border border-white/[0.06] text-xs text-zinc-500">
            {searchQuery ? `No active habits matching "${searchQuery}".` : 'No active habit experiments. Start a 14-day trial to build consistency.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 landscape:grid-cols-2 gap-2.5">
            {activeHabits.map(habit => (
              <HabitCard
                key={habit.id}
                habit={habit}
                isExpanded={expandedHabits.has(habit.id)}
                onToggleExpand={() => {
                  triggerHaptic('light');
                  toggleExpand(habit.id);
                }}
                onToggleToday={() => {
                  triggerHaptic('success');
                  toggleHabitCompletion(habit.id, todayStr);
                }}
                onCycleDateState={dateStr => {
                  triggerHaptic('selection');
                  cycleHabitDateState(habit.id, dateStr);
                }}
                onDelete={() => {
                  triggerHaptic('warning');
                  deleteHabit(habit.id);
                }}
                onPromote={() => {
                  triggerHaptic('light');
                  setPromoteHabitId(habit.id);
                }}
                todayStr={todayStr}
              />
            ))}
          </div>
        )
      )}

      {/* Graduated Habits */}
      {statusFilter !== 'active' && graduatedHabits.length > 0 && (
        <div className="space-y-1.5 pt-2">
          <h3 className="text-[11px] font-medium text-zinc-500 px-1">
            Graduated to Routine ({graduatedHabits.length})
          </h3>
          <div className="bg-[#121215] rounded-xl overflow-hidden border border-white/[0.06] divide-y divide-white/[0.04]">
            {graduatedHabits.map(h => (
              <div key={h.id} className="p-3 flex items-center justify-between text-xs">
                <span className="text-zinc-200 font-medium">{h.title}</span>
                <span className="text-zinc-500 text-[11px]">Completed trial</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* New Habit Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-[#18181b] border-t sm:border border-white/10 rounded-t-2xl sm:rounded-2xl w-full max-w-md p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-xs text-zinc-400 hover:text-white font-medium cursor-pointer"
              >
                Cancel
              </button>
              <h3 className="font-medium text-sm text-zinc-100">
                New Habit Trial
              </h3>
              <button
                onClick={handleCreateHabit}
                className="text-xs text-amber-400 font-medium hover:text-amber-300 cursor-pointer"
              >
                Start
              </button>
            </div>

            <form onSubmit={handleCreateHabit} className="space-y-4">
              <div className="bg-[#121215] rounded-xl p-3 space-y-3 border border-white/[0.06]">
                <div>
                  <label className="block text-[11px] text-zinc-400 font-medium mb-1">
                    Habit Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Morning stretch, 20 pushups"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    className="w-full bg-transparent text-zinc-100 text-sm focus:outline-none placeholder:text-zinc-600"
                    autoFocus
                  />
                </div>

                <div className="pt-2 border-t border-white/[0.06]">
                  <label className="block text-[11px] text-zinc-400 font-medium mb-1">
                    Trigger or Cue (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Immediately after coffee"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    className="w-full bg-transparent text-zinc-100 text-xs focus:outline-none placeholder:text-zinc-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-zinc-400 font-medium mb-1.5 px-1">
                  Trial Duration
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[7, 14, 21, 30].map(d => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setTrialDays(d)}
                      className={`py-1.5 rounded-lg text-xs font-medium transition cursor-pointer border ${
                        trialDays === d
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-medium'
                          : 'bg-white/[0.03] text-zinc-400 border-white/[0.04] hover:text-white'
                      }`}
                    >
                      {d} Days
                    </button>
                  ))}
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add to Routine Modal */}
      {promoteHabitId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-[#18181b] border-t sm:border border-white/10 rounded-t-2xl sm:rounded-2xl w-full max-w-md p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
              <button
                type="button"
                onClick={() => setPromoteHabitId(null)}
                className="text-xs text-zinc-400 hover:text-white font-medium cursor-pointer"
              >
                Cancel
              </button>
              <h3 className="font-medium text-sm text-zinc-100">
                Graduate to Routine
              </h3>
              <button
                onClick={handlePromoteConfirm}
                className="text-xs text-[#0a84ff] font-medium hover:underline cursor-pointer"
              >
                Done
              </button>
            </div>

            <p className="text-xs text-zinc-400">
              Choose how often this habit should recur in your permanent Routine:
            </p>

            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'daily', label: 'Daily' },
                { id: 'specific_days', label: 'Weekdays' },
                { id: 'times_per_week', label: '4x/week' },
                { id: 'weekly', label: 'Weekly' },
              ].map(s => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setScheduleChoice(s.id as ScheduleType)}
                  className={`p-2.5 rounded-lg text-xs font-medium text-center transition cursor-pointer border ${
                    scheduleChoice === s.id
                      ? 'bg-[#0a84ff]/20 text-[#0a84ff] border-[#0a84ff]/40 font-medium'
                      : 'bg-white/[0.03] text-zinc-400 border-white/[0.04] hover:text-white'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
