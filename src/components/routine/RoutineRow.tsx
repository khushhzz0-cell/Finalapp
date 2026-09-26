import React, { useState } from 'react';
import { RoutineItem } from '../../types';
import { RoutineSlotInfo, useApp } from '../../context/AppContext';
import { Check, Edit2, Trash2, ListTree, Plus, X, ChevronDown, ChevronUp } from 'lucide-react';
import { TodayAccent } from '../common/TodayAccent';
import { triggerHaptic } from '../../utils/haptics';

interface RoutineRowProps {
  routine: RoutineItem;
  slotInfo: RoutineSlotInfo;
  todayStr: string;
  isToday: boolean;
  viewFilter: 'today' | 'all';
  onToggleMain: () => void;
  onToggleSlot: (slotIndex: number) => void;
  onToggleDueToday?: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Calculate which week of the multi-week cycle we are currently in (1-indexed)
const getCycleWeek = (routine: RoutineItem, intervalWeeks: number, todayStr: string): number => {
  try {
    const rawCreated = routine.createdAt || '2026-09-01T00:00:00Z';
    const created = new Date(rawCreated.split('T')[0] + 'T12:00:00');
    const today = new Date(todayStr + 'T12:00:00');
    const diffDays = Math.max(0, Math.floor((today.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)));
    const weekIndex = Math.floor(diffDays / 7);
    return (weekIndex % intervalWeeks) + 1; // 1, 2, or 3
  } catch {
    return 1;
  }
};

export const RoutineRow: React.FC<RoutineRowProps> = ({
  routine,
  slotInfo,
  todayStr,
  isToday,
  viewFilter,
  onToggleMain,
  onToggleSlot,
  onToggleDueToday,
  onEdit,
  onDelete,
}) => {
  const { addSubroutine, toggleSubroutine, deleteSubroutine } = useApp();
  const [isExpanded, setIsExpanded] = useState(false);
  const [newSubTitle, setNewSubTitle] = useState('');

  const subroutines = routine.subroutines || [];
  const completedSubsCount = subroutines.filter(
    s => s.completedDates?.includes(todayStr) || s.completed
  ).length;

  const handleAddSub = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubTitle.trim()) return;
    triggerHaptic('light');
    addSubroutine(routine.id, newSubTitle.trim());
    setNewSubTitle('');
  };

  const isFullyCompleted = slotInfo.isFullyCompleted;
  const isMonthly =
    routine.scheduleType === 'monthly' || routine.scheduleType === 'times_per_month';
  const isMultiWeek = routine.scheduleType === 'every_x_weeks';
  const multiWeekInterval = Math.max(2, Math.min(3, routine.everyXWeeksInterval || 2));

  const targetCount = slotInfo.target;
  const completedCount = slotInfo.completedCount;

  // Key Requirement:
  // For tasks/routines with >1 completion (e.g. 2x/week, 3x/week, 2x/month):
  // Every time checked, the checked box replaces an unchecked box on the right.
  // The LEFT box remains UNCHECKED until the last unchecked box is completed!
  const isLeftChecked = targetCount <= 1
    ? completedCount >= 1
    : completedCount >= targetCount;

  // Remaining occurrences (target - 1) go on the RIGHT
  const rightCirclesCount = Math.max(0, targetCount - 1);

  // How many right circles are checked?
  // Before the final completion, each check fills a right circle.
  const rightCompletedCount = Math.min(rightCirclesCount, completedCount);

  // Cycle week indicator for 2-week or 3-week routine
  const currentCycleWeek = isMultiWeek ? getCycleWeek(routine, multiWeekInterval, todayStr) : 1;

  // Format secondary schedule label
  const getScheduleLabel = (): string => {
    switch (routine.scheduleType) {
      case 'daily':
        return 'Daily';
      case 'specific_days':
        return (routine.daysOfWeek || []).map(d => DAYS_SHORT[d]).join(', ');
      case 'times_per_week':
        return `${routine.timesPerWeekTarget || 3}x/week`;
      case 'every_x_weeks':
        return `Every ${routine.everyXWeeksInterval || 2} weeks`;
      case 'times_per_month':
        return routine.timesPerMonthTarget === 1
          ? 'Monthly'
          : `${routine.timesPerMonthTarget || 1}x/month`;
      case 'monthly':
        return 'Monthly';
      case 'weekly':
        return 'Weekly';
      case 'custom':
        return routine.customScheduleText || 'Custom';
      default:
        return 'Daily';
    }
  };

  return (
    <div
      className={`group relative rounded-xl transition-colors duration-150 select-none overflow-hidden ${
        isFullyCompleted
          ? 'bg-[#121215] border border-white/[0.06] opacity-70'
          : 'bg-[#121215] border border-white/[0.06] hover:border-white/[0.12]'
      }`}
    >
      {/* Universal orange visual indicator: "This needs my attention today" */}
      {isToday && !isFullyCompleted && <TodayAccent />}

      {/* Multi-Week Segmented Strip */}
      {isMultiWeek && (
        <div
          className="w-full px-3.5 sm:px-4 pt-2.5 pb-0.5"
          title={`Cycle: Week ${currentCycleWeek} of ${multiWeekInterval}`}
        >
          <div className="flex items-center gap-2">
            {Array.from({ length: multiWeekInterval }).map((_, idx) => {
              const weekNumber = idx + 1;
              const isCurrent = weekNumber === currentCycleWeek;

              return (
                <div
                  key={idx}
                  className={`flex-1 h-[2px] rounded-full transition-all duration-300 ${
                    isCurrent ? 'bg-white/70' : 'bg-white/20'
                  }`}
                  title={`Week ${weekNumber} ${
                    isCurrent ? '(Current Week)' : ''
                  }`}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Main Routine Row */}
      <div className="px-3 py-2 sm:px-3.5 sm:py-2.5 flex items-center justify-between gap-2.5">
        {/* Left Section: Main Completion Circle + Routine Title & Subtitle */}
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {/* Main Left Completion Circle */}
          <div className="flex items-center justify-center flex-shrink-0" onClick={e => e.stopPropagation()}>
            <button
              type="button"
              onClick={onToggleMain}
              className="w-7 h-7 flex items-center justify-center cursor-pointer active:scale-90 transition group flex-shrink-0"
              title={
                isFullyCompleted
                  ? 'Completed (tap to undo last completion)'
                  : `Tap to record completion (${completedCount} of ${targetCount} done)`
              }
              aria-label={`${routine.title}: ${
                isFullyCompleted ? 'fully completed' : `${completedCount} of ${targetCount}`
              }`}
            >
              <div
                className={`w-4.5 h-4.5 rounded-full border flex items-center justify-center transition-colors ${
                  isLeftChecked
                    ? 'bg-emerald-500 border-emerald-500 text-white'
                    : 'border-zinc-600 group-hover:border-emerald-500'
                }`}
              >
                {isLeftChecked ? (
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                ) : isMonthly ? (
                  <span className="text-[9px] font-medium text-zinc-500 leading-none select-none">
                    M
                  </span>
                ) : null}
              </div>
            </button>
          </div>

          {/* Routine Name & Metadata (Zero Pills) */}
          <div className="min-w-0 flex-1">
            <h4
              className={`text-[13.5px] sm:text-[14px] font-medium leading-snug truncate transition-colors ${
                isFullyCompleted
                  ? 'line-through text-zinc-500'
                  : 'text-zinc-100'
              }`}
            >
              {routine.title}
            </h4>

            <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 mt-0.5 truncate">
              <span>{getScheduleLabel()}</span>

              {routine.timeOfDay && routine.timeOfDay !== 'anytime' && (
                <>
                  <span aria-hidden="true" className="text-zinc-600">·</span>
                  <span className="capitalize">{routine.timeOfDay}</span>
                </>
              )}

              {viewFilter === 'all' && (
                <>
                  <span aria-hidden="true" className="text-zinc-600">·</span>
                  <span className={isToday ? 'text-amber-400 font-medium' : 'text-zinc-500'}>
                    {isToday ? 'Due Today' : 'Not Today'}
                  </span>
                  {onToggleDueToday && (
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        onToggleDueToday();
                      }}
                      className="ml-1 text-[10px] text-zinc-400 hover:text-zinc-200 transition cursor-pointer select-none"
                      title={isToday ? 'Remove from Today' : 'Explicitly schedule for Today'}
                    >
                      [{isToday ? 'Remove' : '+ Today'}]
                    </button>
                  )}
                </>
              )}

              {/* Sub-routines Indicator & Toggle Button */}
              <span aria-hidden="true" className="text-zinc-600">·</span>
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  setIsExpanded(prev => !prev);
                }}
                className="text-zinc-400 hover:text-zinc-200 flex items-center gap-1 transition cursor-pointer select-none text-[11px]"
                title={subroutines.length > 0 ? `${completedSubsCount}/${subroutines.length} steps completed` : 'Add steps'}
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
            </div>
          </div>
        </div>

        {/* Right Section: Additional circles (if > 1 required) + Edit & Delete controls */}
        <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0" onClick={e => e.stopPropagation()}>
          {/* Remaining circles for multiple completions (e.g. 2x/week = 1 on right, 3x/week = 2 on right) */}
          {rightCirclesCount > 0 && (
            <div className="flex items-center gap-1 mr-1">
              {Array.from({ length: rightCirclesCount }).map((_, idx) => {
                const isThisRightSlotChecked = idx < rightCompletedCount;

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      if (isThisRightSlotChecked) {
                        onToggleSlot(Math.max(0, completedCount - 1));
                      } else {
                        onToggleSlot(completedCount);
                      }
                    }}
                    className="w-6 h-6 flex items-center justify-center cursor-pointer active:scale-90 transition group"
                    title={`Occurrence ${idx + 1} of ${targetCount} ${
                      isThisRightSlotChecked ? '(completed - tap to undo)' : '(tap to check)'
                    }`}
                  >
                    <div
                      className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-colors ${
                        isThisRightSlotChecked
                          ? 'bg-emerald-500 border-emerald-500 text-white'
                          : 'border-zinc-600 group-hover:border-emerald-500'
                      }`}
                    >
                      {isThisRightSlotChecked ? (
                        <Check className="w-2 h-2 stroke-[3]" />
                      ) : isMonthly ? (
                        <span className="text-[8px] font-medium text-zinc-500 leading-none select-none">
                          M
                        </span>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Quick Edit button */}
          <button
            type="button"
            onClick={onEdit}
            className="w-6 h-6 rounded-md text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.06] flex items-center justify-center transition cursor-pointer"
            title="Edit routine"
            aria-label="Edit routine"
          >
            <Edit2 className="w-3 h-3" />
          </button>

          {/* Quick Delete button */}
          <button
            type="button"
            onClick={onDelete}
            className="w-6 h-6 rounded-md text-zinc-500 hover:text-rose-400 hover:bg-white/[0.06] flex items-center justify-center transition cursor-pointer"
            title="Delete routine"
            aria-label="Delete routine"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Sub-routines Expandable Section (Notion Checklist style) */}
      {isExpanded && (
        <div className="px-3.5 pb-2.5 pt-1.5 border-t border-white/[0.04] bg-black/20 space-y-1.5 text-xs">
          <div className="flex items-center justify-between text-zinc-500 text-[11px] font-medium pt-0.5">
            <span className="flex items-center gap-1.5 text-zinc-300">
              <ListTree className="w-3 h-3 text-purple-400" />
              <span>Steps ({completedSubsCount}/{subroutines.length} completed)</span>
            </span>
            <button
              type="button"
              onClick={() => setIsExpanded(false)}
              className="text-zinc-500 hover:text-zinc-300 transition cursor-pointer p-0.5"
              title="Collapse"
            >
              <ChevronUp className="w-3 h-3" />
            </button>
          </div>

          {/* List of sub-routines */}
          {subroutines.length > 0 ? (
            <div className="space-y-0.5 pt-0.5">
              {subroutines.map(sub => {
                const isSubDone = Boolean(sub.completedDates?.includes(todayStr) || sub.completed);

                return (
                  <div
                    key={sub.id}
                    className="flex items-center justify-between gap-2 py-1 px-1.5 rounded-md hover:bg-white/[0.03] transition group/sub"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={() => {
                          triggerHaptic('success');
                          toggleSubroutine(routine.id, sub.id, todayStr);
                        }}
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
                        className={`text-xs transition-colors truncate select-text ${
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
                      onClick={() => {
                        triggerHaptic('warning');
                        deleteSubroutine(routine.id, sub.id);
                      }}
                      className="opacity-0 group-hover/sub:opacity-100 text-zinc-500 hover:text-rose-400 p-0.5 transition cursor-pointer flex-shrink-0"
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

          {/* Inline Add Sub-routine Input */}
          <form onSubmit={handleAddSub} className="flex items-center gap-1.5 pt-0.5">
            <input
              type="text"
              value={newSubTitle}
              onChange={e => setNewSubTitle(e.target.value)}
              placeholder="+ Add step (e.g. 10 Pushups, Cold shower)..."
              className="flex-1 bg-white/[0.04] border border-white/[0.06] focus:border-purple-400/60 rounded-lg px-2.5 py-1 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none transition"
            />
            <button
              type="submit"
              disabled={!newSubTitle.trim()}
              className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-30 text-white font-medium text-xs flex items-center gap-1 transition cursor-pointer flex-shrink-0"
            >
              <Plus className="w-3 h-3" />
              <span>Add</span>
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
