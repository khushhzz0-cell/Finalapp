import React from 'react';
import { HabitItem } from '../../types';
import {
  Check,
  X,
  Trash2,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';
import { TodayAccent } from '../common/TodayAccent';

export interface HabitCalendarCell {
  dateStr: string;
  dayNumber: number;
  isWithinPeriod: boolean;
  isToday: boolean;
  status: 'untouched' | 'done' | 'missed' | 'disabled';
}

const MINIMAL_WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const FULL_WEEKDAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

export const formatStartDatePretty = (dateStr: string): string => {
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d, 12, 0, 0);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
};

export const getMinimalWeekCells = (
  habit: HabitItem,
  weekOffset: 0 | -1,
  todayStr: string
): HabitCalendarCell[] => {
  const [ty, tm, td] = todayStr.split('-').map(Number);
  const todayRef = new Date(ty, tm - 1, td, 12, 0, 0);

  // ISO Day of week: Monday = 0, ..., Sunday = 6
  const todayDayOfWeek = (todayRef.getDay() + 6) % 7;
  const currentWeekMonday = new Date(todayRef);
  currentWeekMonday.setDate(currentWeekMonday.getDate() - todayDayOfWeek);

  const targetMonday = new Date(currentWeekMonday);
  targetMonday.setDate(targetMonday.getDate() + weekOffset * 7);

  // Habit range
  const [startY, startM, startD] = habit.startDate.split('-').map(Number);
  const start = new Date(startY, startM - 1, startD, 12, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + (habit.trialDurationDays - 1));
  const endDateStr = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`;

  const completedSet = new Set(habit.completedDates || []);
  const missedSet = new Set(habit.missedDates || []);

  const cells: HabitCalendarCell[] = [];

  for (let i = 0; i < 7; i++) {
    const d = new Date(targetMonday);
    d.setDate(d.getDate() + i);

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    const dayNumber = d.getDate();

    const isWithinPeriod = dateStr >= habit.startDate && dateStr <= endDateStr;
    const isToday = dateStr === todayStr;

    let status: 'untouched' | 'done' | 'missed' | 'disabled' = 'disabled';
    if (isWithinPeriod) {
      if (completedSet.has(dateStr)) {
        status = 'done';
      } else if (missedSet.has(dateStr)) {
        status = 'missed';
      } else {
        status = 'untouched';
      }
    }

    cells.push({
      dateStr,
      dayNumber,
      isWithinPeriod,
      isToday,
      status,
    });
  }

  return cells;
};

export const getFullCalendarCells = (
  habit: HabitItem,
  todayStr: string
): HabitCalendarCell[] => {
  const [startY, startM, startD] = habit.startDate.split('-').map(Number);
  const start = new Date(startY, startM - 1, startD, 12, 0, 0);

  // Monday = 0, ..., Sunday = 6
  const startDayOfWeek = (start.getDay() + 6) % 7;

  // Grid begins on Monday of the starting week
  const gridStart = new Date(start);
  gridStart.setDate(gridStart.getDate() - startDayOfWeek);

  // Habit end date (inclusive)
  const end = new Date(start);
  end.setDate(end.getDate() + (habit.trialDurationDays - 1));
  const endDateStr = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`;

  // Grid ends on Sunday of the ending week
  const endDayOfWeek = (end.getDay() + 6) % 7;
  const gridEnd = new Date(end);
  gridEnd.setDate(gridEnd.getDate() + (6 - endDayOfWeek));

  const totalDays =
    Math.round((gridEnd.getTime() - gridStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  const completedSet = new Set(habit.completedDates || []);
  const missedSet = new Set(habit.missedDates || []);

  const cells: HabitCalendarCell[] = [];

  for (let i = 0; i < totalDays; i++) {
    const cur = new Date(gridStart);
    cur.setDate(cur.getDate() + i);

    const year = cur.getFullYear();
    const month = String(cur.getMonth() + 1).padStart(2, '0');
    const day = String(cur.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    const dayNumber = cur.getDate();

    const isWithinPeriod = dateStr >= habit.startDate && dateStr <= endDateStr;
    const isToday = dateStr === todayStr;

    let status: 'untouched' | 'done' | 'missed' | 'disabled' = 'disabled';
    if (isWithinPeriod) {
      if (completedSet.has(dateStr)) {
        status = 'done';
      } else if (missedSet.has(dateStr)) {
        status = 'missed';
      } else {
        status = 'untouched';
      }
    }

    cells.push({
      dateStr,
      dayNumber,
      isWithinPeriod,
      isToday,
      status,
    });
  }

  return cells;
};

interface HabitCardProps {
  habit: HabitItem;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onToggleToday: () => void;
  onCycleDateState: (dateStr: string) => void;
  onDelete: () => void;
  onPromote: () => void;
  todayStr: string;
}

export const HabitCard: React.FC<HabitCardProps> = ({
  habit,
  isExpanded,
  onToggleExpand,
  onToggleToday,
  onCycleDateState,
  onDelete,
  onPromote,
  todayStr,
}) => {
  const completedCount = habit.completedDates.length;
  const missedCount = (habit.missedDates || []).length;
  const totalDays = habit.trialDurationDays;
  const percent = Math.min(100, Math.round((completedCount / totalDays) * 100));
  const isDoneToday = habit.completedDates.includes(todayStr);

  // Check if today falls within active trial period and requires attention today
  const [startY, startM, startD] = (habit.startDate || todayStr).split('-').map(Number);
  const start = new Date(startY, startM - 1, startD, 12, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + ((habit.trialDurationDays || 14) - 1));
  const endDateStr = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`;
  const isWithinTodayPeriod = todayStr >= habit.startDate && todayStr <= endDateStr;
  const needsAttentionToday = habit.status === 'active' && isWithinTodayPeriod && !isDoneToday;

  // -------------------------------------------------------------
  // 1. MINIMAL VIEW (Default)
  // -------------------------------------------------------------
  if (!isExpanded) {
    const prevCells = getMinimalWeekCells(habit, -1, todayStr);
    const thisCells = getMinimalWeekCells(habit, 0, todayStr);

    return (
      <div
        onClick={onToggleExpand}
        className="relative overflow-hidden bg-[#121215] hover:bg-[#151518] rounded-xl px-3.5 py-3 sm:px-4 sm:py-3.5 border border-white/[0.06] hover:border-white/[0.12] transition-colors cursor-pointer select-none space-y-2.5"
      >
        {/* Universal orange visual indicator: "This needs my attention today" */}
        {needsAttentionToday && <TodayAccent />}
        {/* Header: Title on Left, Progress Fraction 7/14 on Right */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={e => {
                e.stopPropagation();
                onToggleToday();
              }}
              className={`w-4 h-4 rounded-full border flex items-center justify-center transition flex-shrink-0 cursor-pointer active:scale-90 ${
                isDoneToday
                  ? 'bg-amber-500 border-amber-500 text-white shadow-sm'
                  : 'border-zinc-600 hover:border-amber-400'
              }`}
              title={isDoneToday ? 'Completed today (tap to uncheck)' : 'Mark done today'}
            >
              {isDoneToday && <Check className="w-2.5 h-2.5 stroke-[3]" />}
            </button>
            <h3 className="text-[14px] font-medium text-zinc-100 truncate">
              {habit.title}
            </h3>
          </div>

          <span className="text-xs font-mono font-medium text-zinc-500 flex-shrink-0">
            {completedCount}/{totalDays}
          </span>
        </div>

        {/* 2-Row Weekday Grid (prev extremely faded + this clearly readable with dash/checkmark/cross) */}
        <div
          className="grid grid-cols-[34px_repeat(7,1fr)] items-center gap-y-0.5"
          onClick={e => e.stopPropagation()}
        >
          {/* Row 0: Weekday labels M T W T F S S */}
          <div className="w-[34px]" />
          {MINIMAL_WEEKDAYS.map((letter, idx) => (
            <div
              key={idx}
              className="text-[10px] font-semibold text-[#8e8e93]/80 text-center select-none py-0.5"
            >
              {letter}
            </div>
          ))}

          {/* Row 1: Previous Week (Extremely faded: ~95% visual fade for subtle continuity) */}
          <div className="text-[9px] text-[#8e8e93]/35 font-mono uppercase tracking-wider select-none pr-1 text-left">
            prev
          </div>
          {prevCells.map(cell => (
            <div key={`prev-${cell.dateStr}`} className="flex items-center justify-center">
              <button
                type="button"
                disabled={cell.status === 'disabled'}
                onClick={e => {
                  e.stopPropagation();
                  onCycleDateState(cell.dateStr);
                }}
                className={`w-full h-6 flex items-center justify-center relative transition-transform active:scale-90 ${
                  cell.status === 'disabled'
                    ? 'cursor-default opacity-15'
                    : 'cursor-pointer opacity-30 hover:opacity-80'
                }`}
                title={
                  cell.status === 'disabled'
                    ? 'Outside habit period'
                    : `${cell.dateStr} (prev week): ${cell.status}`
                }
              >
                {cell.status === 'done' ? (
                  <Check className="w-3 h-3 text-[#ff9500] stroke-[2.5]" />
                ) : cell.status === 'missed' ? (
                  <X className="w-3 h-3 text-[#ff453a] stroke-[2.5]" />
                ) : (
                  <span className="text-[#8e8e93] text-[10px] font-bold select-none leading-none">
                    ·
                  </span>
                )}
              </button>
            </div>
          ))}

          {/* Row 2: Current Week (Clean dash-style indicators, generous invisible tap target) */}
          <div className="text-[9px] text-[#8e8e93] font-mono uppercase tracking-wider select-none pr-1 text-left font-medium">
            this
          </div>
          {thisCells.map(cell => (
            <div key={`this-${cell.dateStr}`} className="flex items-center justify-center">
              <button
                type="button"
                disabled={cell.status === 'disabled'}
                onClick={e => {
                  e.stopPropagation();
                  onCycleDateState(cell.dateStr);
                }}
                className={`w-full h-8 flex flex-col items-center justify-center relative group active:scale-90 transition-transform ${
                  cell.status === 'disabled' ? 'cursor-default opacity-20' : 'cursor-pointer'
                }`}
                title={
                  cell.status === 'disabled'
                    ? 'Outside habit period'
                    : `${cell.dateStr}: ${cell.status} (tap to cycle)`
                }
              >
                {/* Visual indicator: Dash / Check / Cross */}
                {cell.status === 'done' ? (
                  <Check className="w-3.5 h-3.5 text-[#ff9500] stroke-[2.5]" />
                ) : cell.status === 'missed' ? (
                  <X className="w-3.5 h-3.5 text-[#ff453a] stroke-[2.5]" />
                ) : cell.status === 'untouched' ? (
                  <span className="w-3.5 h-[2px] rounded-full bg-[#8e8e93]/60 group-hover:bg-white transition-colors" />
                ) : (
                  <span className="text-[#3a3a3c] text-xs select-none">·</span>
                )}

                {/* Subtle Today Indicator */}
                {cell.isToday && (
                  <span
                    className={`absolute bottom-1 w-1 h-1 rounded-full ${
                      cell.status === 'done' ? 'bg-[#ff9500]/70' : 'bg-white/80'
                    }`}
                  />
                )}
              </button>
            </div>
          ))}
        </div>

        {/* Footer: Started date on left, Percent + Expand Chevron on right */}
        <div className="flex items-center justify-between pt-0.5 text-xs text-[#8e8e93]">
          <span className="font-mono text-[11px] text-[#8e8e93]/80">
            Started {formatStartDatePretty(habit.startDate)}
          </span>

          <div className="flex items-center gap-1.5 font-mono text-[11px] text-[#8e8e93] hover:text-white transition group">
            <span className="font-semibold text-white/90">{percent}%</span>
            <ChevronRight className="w-3.5 h-3.5 text-[#8e8e93] group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // 2. EXPANDED VIEW (Full Calendar View)
  // -------------------------------------------------------------
  const fullCells = getFullCalendarCells(habit, todayStr);

  return (
    <div className="relative overflow-hidden bg-[#121215] rounded-xl p-4 sm:p-5 border border-white/[0.08] space-y-4 transition-all">
      {/* Universal orange visual indicator: "This needs my attention today" */}
      {needsAttentionToday && <TodayAccent />}
      {/* Header Row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <button
            onClick={onToggleToday}
            className={`w-4 h-4 rounded-full border flex items-center justify-center transition mt-0.5 flex-shrink-0 cursor-pointer active:scale-90 ${
              isDoneToday
                ? 'bg-amber-500 border-amber-500 text-white shadow-sm'
                : 'border-zinc-600 hover:border-amber-400'
            }`}
            title={isDoneToday ? 'Completed today' : 'Mark done today'}
          >
            {isDoneToday && <Check className="w-2.5 h-2.5 stroke-[3]" />}
          </button>

          <div className="min-w-0">
            <h3 className="text-[15px] font-medium text-zinc-100">
              {habit.title}
            </h3>
            {habit.description && (
              <p className="text-xs text-zinc-400 mt-0.5">{habit.description}</p>
            )}
            <p className="text-[11px] text-zinc-500 mt-1 font-mono">
              {completedCount} / {totalDays} days completed ({percent}%) · Started {habit.startDate}
              {missedCount > 0 && (
                <span className="text-rose-400 ml-1.5 font-normal">
                  ({missedCount} missed)
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* Collapse Button */}
          <button
            onClick={onToggleExpand}
            className="w-7 h-7 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] flex items-center justify-center transition cursor-pointer"
            title="Collapse to Minimal View"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>

          {/* Delete Button */}
          <button
            onClick={onDelete}
            className="w-7 h-7 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-white/[0.06] flex items-center justify-center transition cursor-pointer"
            title="Delete habit"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Calendar-Based Multi-Week Grid with actual dates */}
      <div className="space-y-1.5">
        {/* Fixed Weekly Structure: MON TUE WED THU FRI SAT SUN */}
        <div className="grid grid-cols-7 gap-1 sm:gap-1.5 text-center">
          {FULL_WEEKDAYS.map(dayName => (
            <div
              key={dayName}
              className="text-[10px] font-medium text-zinc-500 tracking-wider select-none py-0.5"
            >
              {dayName}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
          {fullCells.map((cell, idx) => {
            if (cell.status === 'disabled') {
              return (
                <div
                  key={`disabled-${cell.dateStr}-${idx}`}
                  className="h-8 sm:h-9 rounded-md flex items-center justify-center text-zinc-700 text-xs font-mono select-none pointer-events-none"
                  aria-hidden="true"
                >
                  —
                </div>
              );
            }

            return (
              <button
                key={cell.dateStr}
                type="button"
                onClick={() => onCycleDateState(cell.dateStr)}
                className={`h-8 sm:h-9 rounded-md text-xs font-medium flex items-center justify-center transition select-none cursor-pointer relative ${
                  cell.status === 'done'
                    ? 'bg-amber-500 text-white font-medium shadow-sm active:scale-95'
                    : cell.status === 'missed'
                    ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30 active:scale-95'
                    : 'bg-white/[0.03] text-zinc-400 hover:bg-white/[0.06] hover:text-white border border-white/[0.04] active:scale-95'
                } ${
                  cell.isToday
                    ? 'ring-1 ring-white/60'
                    : ''
                }`}
                title={`${cell.dateStr} (${
                  cell.status === 'done'
                    ? 'Done'
                    : cell.status === 'missed'
                    ? 'Missed'
                    : 'Untouched'
                }) - Tap to cycle`}
              >
                <div className="flex items-center justify-center gap-0.5">
                  <span className="text-[11px] sm:text-[12px]">{cell.dayNumber}</span>
                  {cell.status === 'done' && (
                    <Check className="w-2.5 h-2.5 sm:w-3 sm:h-3 stroke-[2.5]" />
                  )}
                  {cell.status === 'missed' && (
                    <X className="w-2.5 h-2.5 sm:w-3 sm:h-3 stroke-[2.5]" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Graduate to Routine Action & Collapse control */}
      <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between">
        <button
          onClick={onToggleExpand}
          className="text-xs text-zinc-400 hover:text-white transition flex items-center gap-1 cursor-pointer"
        >
          <ChevronDown className="w-3.5 h-3.5 rotate-180" />
          <span>Collapse to Minimal</span>
        </button>

        <button
          onClick={onPromote}
          className="px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] active:scale-95 text-xs text-zinc-200 font-medium transition cursor-pointer flex items-center gap-1 border border-white/[0.06]"
        >
          <span>Add to Routine</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
