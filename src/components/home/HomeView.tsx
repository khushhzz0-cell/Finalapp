import React, { useState } from 'react';
import { useApp, getTodayDateStr } from '../../context/AppContext';
import {
  Check,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Flag,
  Flame,
  Folder,
  RotateCcw,
  SkipForward,
  CheckCircle2,
  Sparkles,
  ListTree,
  Plus,
  X,
  Search,
} from 'lucide-react';

import { SCREEN_IDENTITIES } from '../../utils/screenIdentities';
import { RoutineCheckmarks } from '../routine/RoutineCheckmarks';
import { TodayAccent } from '../common/TodayAccent';
import { RoutineItem, HabitItem } from '../../types';
import { triggerHaptic } from '../../utils/haptics';

interface UnifiedTodayItem {
  id: string;
  type: 'parent_task' | 'routine' | 'habit';
  title: string;
  subtitle?: string;
  isCompleted: boolean;
  isSkipped?: boolean;
  isPriority?: boolean;
  parentProjectName?: string;
  projectId?: string;
  subtaskId?: string;
  deadline?: string;
  timeOfDay?: string;
  routine?: RoutineItem;
  habit?: HabitItem;
  cadenceLabel?: string;
  isMultiWeek?: boolean;
  multiWeekInterval?: number;
  currentCycleWeek?: number;
}

// Calculate which week of the multi-week cycle we are currently in (1-indexed)
const getCycleWeek = (routine: RoutineItem, intervalWeeks: number, todayStr: string): number => {
  try {
    const rawCreated = routine.createdAt || '2026-09-01T00:00:00Z';
    const created = new Date(rawCreated.split('T')[0] + 'T12:00:00');
    const today = new Date(todayStr + 'T12:00:00');
    const diffDays = Math.max(0, Math.floor((today.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)));
    const weekIndex = Math.floor(diffDays / 7);
    return (weekIndex % intervalWeeks) + 1;
  } catch {
    return 1;
  }
};

const getRoutineCadenceLabel = (rt: RoutineItem): string => {
  switch (rt.scheduleType) {
    case 'daily':
      return 'Daily';
    case 'specific_days':
      return 'Specific Days';
    case 'weekly':
      return 'Weekly';
    case 'times_per_week':
      return `${rt.timesPerWeekTarget || 3}x / week`;
    case 'every_x_weeks':
      return `Every ${rt.everyXWeeksInterval || 2} weeks`;
    case 'times_per_month':
      return `${rt.timesPerMonthTarget || 2}x / mo`;
    case 'monthly':
      return 'Monthly';
    default:
      return 'Routine';
  }
};

export const HomeView: React.FC = () => {
  const identity = SCREEN_IDENTITIES.home;
  const {
    routines,
    habits,
    projects,
    toggleRoutineSlot,
    getRoutineSlotInfo,
    isRoutineScheduledForToday,
    toggleHabitCompletion,
    toggleSubtask,
    setCurrentTab,
    addSubroutine,
    toggleSubroutine,
    deleteSubroutine,
    isMinimalMode,
    isQuickAddOpen,
    setIsQuickAddOpen,
    addProject,
    addSubtask,
    addRoutine,
    addRough,
  } = useApp();

  const [activeFilter, setActiveFilter] = useState<'all' | 'parent_tasks' | 'routines'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCompleted, setShowCompleted] = useState<boolean>(false);
  const [expandedRoutineSubs, setExpandedRoutineSubs] = useState<Record<string, boolean>>({});
  const [newSubInput, setNewSubInput] = useState<Record<string, string>>({});

  // Quick Add modal on Home
  const [isHomeQuickAddOpen, setIsHomeQuickAddOpen] = useState(false);
  const [quickAddTitle, setQuickAddTitle] = useState('');
  const [quickAddType, setQuickAddType] = useState<'task' | 'routine' | 'note'>('task');

  React.useEffect(() => {
    if (isQuickAddOpen) {
      setIsHomeQuickAddOpen(true);
      setIsQuickAddOpen(false);
    }
  }, [isQuickAddOpen, setIsQuickAddOpen]);

  const handleCreateHomeQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickAddTitle.trim()) return;

    triggerHaptic('success');
    if (quickAddType === 'task') {
      const activeProj = projects.find(p => p.status === 'active');
      if (activeProj) {
        addSubtask(activeProj.id, quickAddTitle.trim());
      } else {
        addProject({
          name: 'Quick Tasks',
          description: 'Tasks created from Today view',
          status: 'active',
          isPriority: true,
          subtasks: [
            {
              id: 'st_' + Date.now(),
              text: quickAddTitle.trim(),
              completed: false,
              isNext: true,
              order: 0,
              date: 'today',
            },
          ],
        });
      }
    } else if (quickAddType === 'routine') {
      addRoutine({
        title: quickAddTitle.trim(),
        scheduleType: 'daily',
        timeOfDay: 'anytime',
        isActive: true,
      });
    } else {
      addRough(quickAddTitle.trim(), 'Note');
    }

    setQuickAddTitle('');
    setIsHomeQuickAddOpen(false);
  };

  const todayStr = getTodayDateStr();
  const dateObj = new Date();
  const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
  const dateFormatted = dateObj.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
  });

  // Skipped routines for today (stored per date in localStorage)
  const [skippedRoutineIds, setSkippedRoutineIds] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(`skipped_routines_${todayStr}`);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const toggleSkipRoutine = (routineId: string) => {
    setSkippedRoutineIds(prev => {
      const next = prev.includes(routineId)
        ? prev.filter(id => id !== routineId)
        : [...prev, routineId];
      try {
        localStorage.setItem(`skipped_routines_${todayStr}`, JSON.stringify(next));
      } catch {
        // ignore storage errors
      }
      return next;
    });
  };

  // Build unified feed of all tasks that need to be done today
  const items: UnifiedTodayItem[] = [];

  // 1. Parent Project Tasks / Subtasks for Today
  const activeProjects = projects.filter(p => p.status === 'active');
  activeProjects.forEach(proj => {
    const isProjectPriority = Boolean(proj.isPriority || proj.priorityLevel === 'top');
    const isProjectDeadlineToday = proj.deadline === 'today' || proj.deadline === todayStr;

    // A. Explicitly scheduled subtasks for today (both completed and uncompleted)
    const todaySubtasks = proj.subtasks.filter(
      st => st.date === 'today' || st.date === todayStr
    );

    if (todaySubtasks.length > 0) {
      todaySubtasks.forEach(st => {
        items.push({
          id: `task-${proj.id}-${st.id}`,
          type: 'parent_task',
          title: st.text,
          subtitle: st.description,
          isCompleted: st.completed,
          isPriority: isProjectPriority,
          parentProjectName: proj.name,
          projectId: proj.id,
          subtaskId: st.id,
          deadline: proj.deadline,
        });
      });
    } else {
      // B. If project is due today or is top priority, grab its next uncompleted action
      const nextAction = proj.subtasks.find(st => !st.completed);
      if (nextAction && (isProjectDeadlineToday || isProjectPriority)) {
        items.push({
          id: `task-${proj.id}-${nextAction.id}`,
          type: 'parent_task',
          title: nextAction.text,
          subtitle: nextAction.description,
          isCompleted: nextAction.completed,
          isPriority: isProjectPriority,
          parentProjectName: proj.name,
          projectId: proj.id,
          subtaskId: nextAction.id,
          deadline: proj.deadline,
        });
      }
    }
  });

  // 2. Routines scheduled for Today
  const todayRoutines = routines.filter(r => isRoutineScheduledForToday(r, todayStr));
  todayRoutines.forEach(rt => {
    const slotInfo = getRoutineSlotInfo(rt, todayStr);
    const isCompleted = slotInfo.isFullyCompleted;
    const isSkipped = skippedRoutineIds.includes(rt.id);
    const isMultiWeek = rt.scheduleType === 'every_x_weeks';
    const multiWeekInterval = rt.everyXWeeksInterval || 2;
    const currentCycleWeek = isMultiWeek ? getCycleWeek(rt, multiWeekInterval, todayStr) : 1;

    items.push({
      id: `routine-${rt.id}`,
      type: 'routine',
      title: rt.title,
      subtitle: rt.description,
      isCompleted,
      isSkipped,
      routine: rt,
      timeOfDay: rt.timeOfDay,
      cadenceLabel: getRoutineCadenceLabel(rt),
      isMultiWeek,
      multiWeekInterval,
      currentCycleWeek,
    });
  });

  // 3. Active Habits
  const activeHabits = habits.filter(h => h.status === 'active');
  activeHabits.forEach(hb => {
    const isDoneToday = hb.completedDates.includes(todayStr);
    const completedCount = hb.completedDates.length;
    const totalDays = hb.trialDurationDays || 14;

    items.push({
      id: `habit-${hb.id}`,
      type: 'habit',
      title: hb.title,
      subtitle: `Day ${completedCount} of ${totalDays} completed`,
      isCompleted: isDoneToday,
      habit: hb,
    });
  });

  // Filter items
  const filteredItems = items.filter(item => {
    if (activeFilter === 'parent_tasks' && item.type !== 'parent_task') return false;
    if (activeFilter === 'routines' && item.type !== 'routine' && item.type !== 'habit') return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.title.toLowerCase().includes(q) ||
      (item.subtitle || '').toLowerCase().includes(q) ||
      (item.parentProjectName || '').toLowerCase().includes(q)
    );
  });

  // Split into active (to do now) and completed/skipped
  const activeItems = filteredItems.filter(i => !i.isCompleted && !i.isSkipped);
  const completedOrSkippedItems = filteredItems.filter(i => i.isCompleted || i.isSkipped);

  // Counts for summary
  const totalActive = items.filter(i => !i.isCompleted && !i.isSkipped).length;
  const activeParentTasksCount = items.filter(
    i => i.type === 'parent_task' && !i.isCompleted
  ).length;
  const activeRoutinesCount = items.filter(
    i => (i.type === 'routine' || i.type === 'habit') && !i.isCompleted && !i.isSkipped
  ).length;
  const totalCompletedCount = items.filter(i => i.isCompleted || i.isSkipped).length;

  return (
    <div className={`pb-20 ${isMinimalMode ? 'space-y-3 pt-1' : 'space-y-4'}`}>
      {/* 1. APPLE & NOTION DATE & EXECUTION HEADER (Hidden in Minimal Mode) */}
      {!isMinimalMode && (
        <div className="pt-1 flex items-baseline justify-between gap-3">
          <div>
            <p className="text-[11px] font-medium tracking-wide text-zinc-500 uppercase">
              {dayName} · {dateFormatted}
            </p>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-100 mt-0.5">
              Today
            </h2>
            <div className="text-xs text-zinc-400 mt-0.5 flex items-center gap-1.5 flex-wrap">
              {totalActive === 0 ? (
                <span className="text-emerald-400 font-medium flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" /> All tasks & routines done
                </span>
              ) : (
                <span>
                  <strong className="text-zinc-200 font-semibold">{totalActive} to do</strong>
                  <span className="text-zinc-600 mx-1.5">·</span>
                  <span className="text-zinc-300">
                    {activeParentTasksCount} {activeParentTasksCount === 1 ? 'task' : 'tasks'}
                  </span>
                  <span className="text-zinc-600 mx-1.5">·</span>
                  <span className="text-zinc-400">
                    {activeRoutinesCount} {activeRoutinesCount === 1 ? 'routine' : 'routines'}
                  </span>
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. UNIFIED SEARCH & SEGMENTED FILTER (Hidden in Minimal Mode) */}
      {!isMinimalMode && (
        <div className="space-y-2.5">
          {/* Notion-style Clean Search Bar */}
          <div className="relative flex items-center bg-[#141417] rounded-xl border border-white/[0.06] px-3 py-1.5 focus-within:border-[#0a84ff]/50 transition-colors">
            <Search className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0 mr-2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Filter today's items..."
              className="w-full bg-transparent text-xs sm:text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  setSearchQuery('');
                }}
                className="p-1 rounded-full text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.08] transition"
                title="Clear Search"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Apple Segmented Control Bar */}
          <div className="flex items-center gap-1 p-0.5 bg-[#141417] rounded-lg border border-white/[0.06] overflow-x-auto no-scrollbar select-none">
            <button
              type="button"
              onClick={() => {
                triggerHaptic('selection');
                setActiveFilter('all');
              }}
              className={`px-3 py-1 rounded-md text-xs font-medium transition cursor-pointer whitespace-nowrap ${
                activeFilter === 'all'
                  ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              All ({items.length})
            </button>
            <button
              type="button"
              onClick={() => {
                triggerHaptic('selection');
                setActiveFilter('parent_tasks');
              }}
              className={`px-3 py-1 rounded-md text-xs font-medium transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                activeFilter === 'parent_tasks'
                  ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Folder className="w-3 h-3 text-[#0a84ff]" />
              <span>Tasks ({items.filter(i => i.type === 'parent_task').length})</span>
            </button>
            <button
              type="button"
              onClick={() => {
                triggerHaptic('selection');
                setActiveFilter('routines');
              }}
              className={`px-3 py-1 rounded-md text-xs font-medium transition cursor-pointer whitespace-nowrap ${
                activeFilter === 'routines'
                  ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Routines & Habits ({items.filter(i => i.type !== 'parent_task').length})
            </button>
          </div>
        </div>
      )}

      {/* 3. UNIFIED ACTION FEED (CLEAN NOTION & APPLE CANVAS) */}
      {activeItems.length === 0 && completedOrSkippedItems.length === 0 ? (
        <div className="bg-[#121215] rounded-xl p-8 text-center border border-white/[0.05] space-y-1.5">
          <p className="text-sm font-medium text-zinc-200">No tasks scheduled for today</p>
          <p className="text-xs text-zinc-500">
            Tasks due today or active routines will appear here on your canvas.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 landscape:grid-cols-2 gap-2">
          {/* Active Tasks Feed */}
          {activeItems.map(item => {
            // A. PARENT PROJECT TASK (Notion & Apple Reminders Clean Row)
            if (item.type === 'parent_task') {
              return (
                <div
                  key={item.id}
                  className="relative overflow-hidden bg-[#121215] hover:bg-[#16161a] rounded-xl p-3 sm:p-3.5 border border-white/[0.06] hover:border-white/[0.12] transition-colors group"
                >
                  <TodayAccent />

                  <div className="flex items-start gap-3">
                    {/* Apple-style circular checkbox */}
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic('success');
                        if (item.projectId && item.subtaskId) {
                          toggleSubtask(item.projectId, item.subtaskId);
                        }
                      }}
                      className="w-4.5 h-4.5 rounded-full border border-zinc-600 hover:border-[#0a84ff] hover:bg-[#0a84ff]/15 flex items-center justify-center mt-0.5 transition cursor-pointer flex-shrink-0 active:scale-90"
                      title="Mark task completed"
                    />

                    {/* Task Content */}
                    <div className="min-w-0 flex-1 space-y-1">
                      {/* Quiet Unboxed Metadata (Zero Pills) */}
                      <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 flex-wrap">
                        {item.isPriority && (
                          <span className="flex items-center gap-1 text-rose-400 font-medium">
                            <Flag className="w-2.5 h-2.5" /> High Priority
                            <span className="text-zinc-600 font-normal">·</span>
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() => setCurrentTab('projects')}
                          className="hover:text-zinc-300 transition flex items-center gap-1 cursor-pointer truncate max-w-[200px]"
                          title="Open Project"
                        >
                          <span>{item.parentProjectName}</span>
                          <ChevronRight className="w-2.5 h-2.5 text-zinc-600" />
                        </button>

                        {item.deadline && (
                          <>
                            <span className="text-zinc-600">·</span>
                            <span className="text-rose-400/90 font-medium">{item.deadline}</span>
                          </>
                        )}
                      </div>

                      {/* Prominent Task Title */}
                      <p className="text-[14px] font-medium text-zinc-100 leading-snug">
                        {item.title}
                      </p>

                      {item.subtitle && (
                        <p className="text-xs text-zinc-400 line-clamp-2">
                          {item.subtitle}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            }

            // B. ROUTINE (Secondary, Cadence / Habitual, Distinctly Skippable)
            if (item.type === 'routine' && item.routine) {
              const rt = item.routine;
              const slotInfo = getRoutineSlotInfo(rt, todayStr);

              return (
                <div
                  key={item.id}
                  className="relative overflow-hidden bg-[#121215] hover:bg-[#16161a] rounded-xl border border-white/[0.05] hover:border-white/[0.10] transition-colors group"
                >
                  <TodayAccent />

                  {/* Multi-Week Segmented Strip */}
                  {item.isMultiWeek && item.multiWeekInterval && item.currentCycleWeek && (
                    <div className="w-full px-3.5 pt-3 pb-0.5">
                      <div className="flex items-center gap-2">
                        {Array.from({ length: item.multiWeekInterval }).map((_, idx) => (
                          <div
                            key={idx}
                            className="flex-1 h-[2.5px] rounded-full bg-white/40 transition-all"
                            title={`Week ${idx + 1}`}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="p-3 sm:p-3.5 flex items-center justify-between gap-3">
                    {/* Routine Checkmarks */}
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <RoutineCheckmarks
                        routine={rt}
                        slotInfo={slotInfo}
                        onToggleSlot={slotIndex => toggleRoutineSlot(rt.id, slotIndex, todayStr)}
                      />

                      <div className="min-w-0 space-y-0.5">
                        {/* Unboxed Metadata (Zero Pills) */}
                        <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 flex-wrap">
                          <span>{item.cadenceLabel}</span>
                          {item.timeOfDay && item.timeOfDay !== 'anytime' && (
                            <>
                              <span className="text-zinc-600">·</span>
                              <span className="capitalize">{item.timeOfDay}</span>
                            </>
                          )}

                          {/* Sub-routines Toggle */}
                          {(() => {
                            const subroutines = rt.subroutines || [];
                            const completedSubsCount = subroutines.filter(
                              s => s.completedDates?.includes(todayStr) || s.completed
                            ).length;
                            const isExpanded = Boolean(expandedRoutineSubs[rt.id]);

                            return (
                              <>
                                <span className="text-zinc-600">·</span>
                                <button
                                  type="button"
                                  onClick={e => {
                                    e.stopPropagation();
                                    setExpandedRoutineSubs(prev => ({ ...prev, [rt.id]: !prev[rt.id] }));
                                  }}
                                  className="text-zinc-400 hover:text-zinc-200 flex items-center gap-1 transition cursor-pointer select-none"
                                  title={subroutines.length > 0 ? `${completedSubsCount}/${subroutines.length} steps done` : 'Add steps'}
                                >
                                  <ListTree className="w-3 h-3 text-purple-400" />
                                  <span>
                                    {subroutines.length > 0
                                      ? `${completedSubsCount}/${subroutines.length} steps`
                                      : '+ Steps'}
                                  </span>
                                  {subroutines.length > 0 && (
                                    isExpanded ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />
                                  )}
                                </button>
                              </>
                            );
                          })()}
                        </div>

                        {/* Routine Title */}
                        <p className="text-[13.5px] text-zinc-200 font-normal leading-snug">
                          {item.title}
                        </p>

                        {item.subtitle && (
                          <p className="text-xs text-zinc-500 line-clamp-1">
                            {item.subtitle}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Dedicated Routine Skip Button */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => toggleSkipRoutine(rt.id)}
                        className="px-2 py-0.5 rounded-md text-[11px] font-normal text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.06] transition flex items-center gap-1 cursor-pointer"
                        title="Skip this routine for today"
                      >
                        <SkipForward className="w-3 h-3 text-zinc-500" />
                        <span>Skip</span>
                      </button>
                    </div>
                  </div>

                  {/* Expandable Sub-routines Section on Today Screen */}
                  {Boolean(expandedRoutineSubs[rt.id]) && (() => {
                    const subroutines = rt.subroutines || [];
                    const completedSubsCount = subroutines.filter(
                      s => s.completedDates?.includes(todayStr) || s.completed
                    ).length;

                    const handleAddSubInHome = (e: React.FormEvent) => {
                      e.preventDefault();
                      const val = (newSubInput[rt.id] || '').trim();
                      if (!val) return;
                      addSubroutine(rt.id, val);
                      setNewSubInput(prev => ({ ...prev, [rt.id]: '' }));
                    };

                    return (
                      <div className="px-3.5 pb-3 pt-2 border-t border-white/[0.04] bg-black/20 space-y-2 text-xs">
                        <div className="flex items-center justify-between text-zinc-500 text-[11px] font-medium">
                          <span className="flex items-center gap-1.5 text-zinc-300">
                            <ListTree className="w-3 h-3 text-purple-400" />
                            <span>Steps ({completedSubsCount}/{subroutines.length} completed)</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => setExpandedRoutineSubs(prev => ({ ...prev, [rt.id]: false }))}
                            className="text-zinc-500 hover:text-zinc-300 transition cursor-pointer p-0.5"
                            title="Collapse"
                          >
                            <ChevronUp className="w-3 h-3" />
                          </button>
                        </div>

                        {/* List of sub-routines */}
                        {subroutines.length > 0 ? (
                          <div className="space-y-1">
                            {subroutines.map(sub => {
                              const isSubDone = Boolean(sub.completedDates?.includes(todayStr) || sub.completed);

                              return (
                                <div
                                  key={sub.id}
                                  className="flex items-center justify-between gap-2 py-1 px-2 rounded-lg hover:bg-white/[0.04] transition group/sub"
                                >
                                  <div className="flex items-center gap-2 min-w-0 flex-1">
                                    <button
                                      type="button"
                                      onClick={() => toggleSubroutine(rt.id, sub.id, todayStr)}
                                      className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-all cursor-pointer flex-shrink-0 active:scale-90 ${
                                        isSubDone
                                          ? 'bg-emerald-500 border-emerald-500 text-white'
                                          : 'border-zinc-600 hover:border-emerald-500'
                                      }`}
                                      title={isSubDone ? 'Completed today (tap to undo)' : 'Mark completed today'}
                                    >
                                      {isSubDone && <Check className="w-2 h-2 stroke-[3]" />}
                                    </button>

                                    <span
                                      className={`text-xs transition-all truncate select-text ${
                                        isSubDone
                                          ? 'line-through text-zinc-500'
                                          : 'text-zinc-200'
                                      }`}
                                    >
                                      {sub.title}
                                    </span>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => deleteSubroutine(rt.id, sub.id)}
                                    className="opacity-0 group-hover/sub:opacity-100 hover:text-rose-400 text-zinc-500 transition p-1 cursor-pointer flex-shrink-0"
                                    title="Delete step"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-[11px] text-zinc-500 italic py-0.5">
                            No steps yet. Add your first step below:
                          </p>
                        )}

                        {/* Inline Add Step Input */}
                        <form onSubmit={handleAddSubInHome} className="flex items-center gap-2 pt-0.5">
                          <input
                            type="text"
                            value={newSubInput[rt.id] || ''}
                            onChange={e => setNewSubInput(prev => ({ ...prev, [rt.id]: e.target.value }))}
                            placeholder="+ Add step..."
                            className="flex-1 bg-white/[0.04] border border-white/[0.06] focus:border-purple-400/60 rounded-lg px-2.5 py-1 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none transition"
                          />
                          <button
                            type="submit"
                            disabled={!(newSubInput[rt.id] || '').trim()}
                            className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-30 text-white font-medium text-xs flex items-center gap-1 transition cursor-pointer flex-shrink-0"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Add</span>
                          </button>
                        </form>
                      </div>
                    );
                  })()}
                </div>
              );
            }

            // C. HABIT
            if (item.type === 'habit' && item.habit) {
              const hb = item.habit;

              return (
                <div
                  key={item.id}
                  className="relative overflow-hidden bg-[#121215] hover:bg-[#16161a] rounded-xl p-3 sm:p-3.5 border border-white/[0.05] hover:border-white/[0.10] transition-colors flex items-center justify-between gap-3 group"
                >
                  <TodayAccent />

                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() => toggleHabitCompletion(hb.id, todayStr)}
                      className="w-4.5 h-4.5 rounded-full border border-zinc-600 hover:border-amber-400 flex items-center justify-center transition cursor-pointer flex-shrink-0 active:scale-90"
                    />

                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-1.5 text-[11px] text-zinc-500">
                        <span className="flex items-center gap-1 text-amber-400 font-medium">
                          <Flame className="w-2.5 h-2.5" /> Habit
                        </span>
                        <span>·</span>
                        <span>{item.subtitle}</span>
                      </div>
                      <p className="text-[13.5px] text-zinc-200 font-normal leading-snug">
                        {item.title}
                      </p>
                    </div>
                  </div>
                </div>
              );
            }

            return null;
          })}

          {/* 4. COMPLETED & SKIPPED SECTION (Clean Notion-style Disclosure) */}
          {completedOrSkippedItems.length > 0 && (
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowCompleted(!showCompleted)}
                className="w-full py-1.5 px-3 rounded-lg hover:bg-white/[0.04] text-xs font-normal text-zinc-500 hover:text-zinc-300 flex items-center justify-between transition cursor-pointer"
              >
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  <span>
                    Done & Skipped ({completedOrSkippedItems.length})
                  </span>
                </div>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform duration-200 ${
                    showCompleted ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {showCompleted && (
                <div className="mt-1 space-y-1.5 opacity-70">
                  {completedOrSkippedItems.map(item => (
                    <div
                      key={item.id}
                      className="bg-[#101013] rounded-lg p-2.5 border border-white/[0.03] flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        {item.type === 'parent_task' && item.projectId && item.subtaskId ? (
                          <button
                            type="button"
                            onClick={() => toggleSubtask(item.projectId!, item.subtaskId!)}
                            className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center transition cursor-pointer flex-shrink-0"
                            title="Mark incomplete"
                          >
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </button>
                        ) : item.type === 'routine' && item.routine ? (
                          <button
                            type="button"
                            onClick={() => {
                              if (item.isSkipped) {
                                toggleSkipRoutine(item.routine!.id);
                              } else {
                                const slotInfo = getRoutineSlotInfo(item.routine!, todayStr);
                                toggleRoutineSlot(item.routine!.id, Math.max(0, slotInfo.completedCount - 1), todayStr);
                              }
                            }}
                            className={`w-4 h-4 rounded-full flex items-center justify-center transition cursor-pointer flex-shrink-0 ${
                              item.isSkipped ? 'bg-white/10 text-zinc-400' : 'bg-emerald-500 text-white'
                            }`}
                            title="Undo"
                          >
                            {item.isSkipped ? <SkipForward className="w-2.5 h-2.5" /> : <Check className="w-2.5 h-2.5 stroke-[3]" />}
                          </button>
                        ) : item.type === 'habit' && item.habit ? (
                          <button
                            type="button"
                            onClick={() => toggleHabitCompletion(item.habit!.id, todayStr)}
                            className="w-4 h-4 rounded-full bg-amber-500 text-white flex items-center justify-center transition cursor-pointer flex-shrink-0"
                            title="Mark incomplete"
                          >
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </button>
                        ) : null}

                        <div className="min-w-0">
                          <p className="line-through text-zinc-500 text-xs truncate">
                            {item.title}
                          </p>
                          <p className="text-[10px] text-zinc-600">
                            {item.isSkipped
                              ? 'Skipped for today'
                              : item.type === 'parent_task'
                              ? `Completed (${item.parentProjectName})`
                              : 'Completed'}
                          </p>
                        </div>
                      </div>

                      {item.isSkipped && item.routine && (
                        <button
                          type="button"
                          onClick={() => toggleSkipRoutine(item.routine!.id)}
                          className="px-2 py-0.5 rounded text-[11px] text-[#0a84ff] hover:bg-white/[0.06] flex items-center gap-1 cursor-pointer"
                        >
                          <RotateCcw className="w-2.5 h-2.5" />
                          <span>Undo Skip</span>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Quick Add to Today Modal (Apple & Notion Clean Canvas Dialog) */}
      {isHomeQuickAddOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-[#141417] border-t sm:border border-white/[0.08] rounded-t-2xl sm:rounded-2xl w-full max-w-md p-4 sm:p-5 shadow-2xl space-y-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
              <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                <Plus className="w-4 h-4 text-[#0a84ff]" />
                <span>Quick Add to Today</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsHomeQuickAddOpen(false)}
                className="w-7 h-7 rounded-lg hover:bg-white/[0.08] text-zinc-400 hover:text-zinc-100 flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <form onSubmit={handleCreateHomeQuickAdd} className="space-y-3.5">
              <div>
                <label className="text-[11px] font-medium text-zinc-400 block mb-1">
                  Title
                </label>
                <input
                  type="text"
                  autoFocus
                  required
                  value={quickAddTitle}
                  onChange={e => setQuickAddTitle(e.target.value)}
                  placeholder="e.g., Finish slides, 10 min workout, Review specs..."
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-[#0a84ff]/70"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-zinc-400 block mb-1">
                  Type
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: 'task', label: 'Project Task', desc: 'Projects feed' },
                    { id: 'routine', label: 'Routine', desc: 'Daily habit' },
                    { id: 'note', label: 'Quick Note', desc: 'Notes inbox' },
                  ].map(t => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setQuickAddType(t.id as any)}
                      className={`p-2 rounded-lg border text-left transition cursor-pointer ${
                        quickAddType === t.id
                          ? 'bg-zinc-800 border-white/[0.12] text-zinc-100 font-medium'
                          : 'bg-white/[0.02] border-white/[0.05] text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      <p className="text-xs">{t.label}</p>
                      <p className="text-[10px] text-zinc-500 mt-0.5 truncate">{t.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsHomeQuickAddOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-200 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!quickAddTitle.trim()}
                  className="px-4 py-1.5 rounded-lg text-xs font-medium bg-[#0a84ff] hover:bg-[#0a84ff]/90 disabled:opacity-40 text-white shadow-sm transition cursor-pointer"
                >
                  Add Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

