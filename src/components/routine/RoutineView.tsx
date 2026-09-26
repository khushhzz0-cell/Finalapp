import React, { useState } from 'react';
import { useApp, getTodayDateStr } from '../../context/AppContext';
import { RoutineItem, RoutineSubItem, ScheduleType } from '../../types';
import {
  Plus,
  ChevronRight,
  Trash2,
  ListTree,
  X,
  Search,
  Filter,
} from 'lucide-react';
import { SCREEN_IDENTITIES } from '../../utils/screenIdentities';
import { RoutineRow } from './RoutineRow';
import { triggerHaptic } from '../../utils/haptics';

const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const RoutineView: React.FC = () => {
  const identity = SCREEN_IDENTITIES.routine;
  const {
    routines,
    addRoutine,
    updateRoutine,
    deleteRoutine,
    toggleRoutineCompletion,
    toggleRoutineSlot,
    getRoutineSlotInfo,
    isRoutineDoneToday,
    isRoutineScheduledForToday,
    toggleRoutineDueToday,
    isMinimalMode,
    isQuickAddOpen,
    setIsQuickAddOpen,
  } = useApp();

  const [viewFilter, setViewFilter] = useState<'today' | 'all'>('today');
  const [searchQuery, setSearchQuery] = useState('');
  const [cadenceFilter, setCadenceFilter] = useState<'all' | 'daily' | 'weekly' | 'monthly'>('all');
  const [timeFilter, setTimeFilter] = useState<'all' | 'morning' | 'afternoon' | 'evening' | 'anytime'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<RoutineItem | null>(null);

  // Quick Add listener
  React.useEffect(() => {
    if (isQuickAddOpen) {
      openAddModal();
      setIsQuickAddOpen(false);
    }
  }, [isQuickAddOpen, setIsQuickAddOpen]);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [scheduleType, setScheduleType] = useState<ScheduleType>('daily');
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [timesPerWeek, setTimesPerWeek] = useState<number>(3);
  const [everyXWeeks, setEveryXWeeks] = useState<number>(2);
  const [timesPerMonth, setTimesPerMonth] = useState<number>(2);
  const [customText, setCustomText] = useState('');
  const [timeOfDay, setTimeOfDay] = useState<'morning' | 'afternoon' | 'evening' | 'anytime'>('anytime');
  const [dueToday, setDueToday] = useState(false);
  const [modalSubroutines, setModalSubroutines] = useState<RoutineSubItem[]>([]);
  const [newModalSubTitle, setNewModalSubTitle] = useState('');

  // Progressive Disclosure: Simple by default, Advanced only when requested
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  const todayStr = getTodayDateStr();

  const openAddModal = () => {
    setEditingItem(null);
    setTitle('');
    setDescription('');
    setScheduleType('daily'); // Every Day is default
    setSelectedDays([1, 2, 3, 4, 5]);
    setTimesPerWeek(3);
    setEveryXWeeks(2);
    setTimesPerMonth(2);
    setCustomText('');
    setTimeOfDay('anytime');
    setDueToday(false);
    setModalSubroutines([]);
    setNewModalSubTitle('');
    setIsAdvancedOpen(false); // Collapsed by default
    setIsModalOpen(true);
  };

  const openEditModal = (item: RoutineItem) => {
    setEditingItem(item);
    setTitle(item.title);
    setDescription(item.description || '');
    setScheduleType(item.scheduleType);
    setSelectedDays(item.daysOfWeek || (item.scheduleType === 'specific_days' ? [1, 2, 3, 4, 5] : []));
    setTimesPerWeek(item.timesPerWeekTarget || 3);
    setEveryXWeeks(item.everyXWeeksInterval || 2);
    setTimesPerMonth(item.timesPerMonthTarget || (item.scheduleType === 'monthly' ? 1 : 2));
    setCustomText(item.customScheduleText || '');
    setTimeOfDay(item.timeOfDay || 'anytime');
    setDueToday(Boolean(item.dueToday || (item.scheduledDate && (item.scheduledDate === todayStr || item.scheduledDate === 'today'))));
    setModalSubroutines(item.subroutines || []);
    setNewModalSubTitle('');

    // For editing: show advanced options if any non-daily setting is configured
    const hasAdvancedConfig = Boolean(
      item.scheduleType !== 'daily' ||
      item.description ||
      item.dueToday ||
      (item.timeOfDay && item.timeOfDay !== 'anytime')
    );
    setIsAdvancedOpen(hasAdvancedConfig);
    setIsModalOpen(true);
  };

  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!title.trim()) return;

    const data = {
      title: title.trim(),
      description: description.trim() || undefined,
      scheduleType,
      daysOfWeek:
        scheduleType === 'specific_days' ||
        scheduleType === 'weekly' ||
        (scheduleType === 'times_per_week' && selectedDays.length > 0)
          ? selectedDays
          : undefined,
      timesPerWeekTarget: scheduleType === 'times_per_week' ? timesPerWeek : undefined,
      everyXWeeksInterval: scheduleType === 'every_x_weeks' ? everyXWeeks : undefined,
      timesPerMonthTarget: scheduleType === 'times_per_month' ? timesPerMonth : undefined,
      customScheduleText: scheduleType === 'custom' ? customText.trim() : undefined,
      timeOfDay,
      dueToday,
      scheduledDate: dueToday ? todayStr : undefined,
      subroutines: modalSubroutines,
    };

    if (editingItem) {
      updateRoutine(editingItem.id, data);
    } else {
      addRoutine({
        ...data,
        isActive: true,
      });
    }
    setIsModalOpen(false);
  };

  const toggleDay = (dayIndex: number) => {
    if (selectedDays.includes(dayIndex)) {
      setSelectedDays(selectedDays.filter(d => d !== dayIndex));
    } else {
      setSelectedDays([...selectedDays, dayIndex].sort());
    }
  };

  const baseRoutines = viewFilter === 'today'
    ? routines.filter(r => isRoutineScheduledForToday(r, todayStr))
    : routines;

  const displayedRoutines = baseRoutines.filter(r => {
    // 1. Cadence filter
    if (cadenceFilter === 'daily' && r.scheduleType !== 'daily') return false;
    if (cadenceFilter === 'weekly' && !['weekly', 'times_per_week', 'every_x_weeks'].includes(r.scheduleType)) return false;
    if (cadenceFilter === 'monthly' && !['monthly', 'times_per_month'].includes(r.scheduleType)) return false;

    // 2. Time of day filter
    if (timeFilter !== 'all' && (r.timeOfDay || 'anytime') !== timeFilter) return false;

    // 3. Search query
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const titleMatch = r.title.toLowerCase().includes(q);
    const descMatch = (r.description || '').toLowerCase().includes(q);
    const subMatch = r.subroutines?.some(s => s.title.toLowerCase().includes(q));
    return titleMatch || descMatch || subMatch;
  });

  const completedTodayCount = routines.filter(
    r => isRoutineScheduledForToday(r, todayStr) && isRoutineDoneToday(r, todayStr)
  ).length;

  const totalDueToday = routines.filter(r => isRoutineScheduledForToday(r, todayStr)).length;

  return (
    <div className={`pb-20 ${isMinimalMode ? 'space-y-2 pt-1' : 'space-y-4'}`}>
      {/* Top Bar: Search, Filters & Add Routine Button (Hidden in Minimal Mode) */}
      {!isMinimalMode && (
        <div className="space-y-2.5">
          {/* Search Input Bar */}
          <div className="relative flex items-center bg-[#141417] rounded-lg border border-white/[0.06] px-3 py-1.5 focus-within:border-white/20 transition-colors">
            <Search className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0 mr-2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search routines or sub-steps..."
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

          {/* Primary View Segmented Bar & Add Button */}
          <div className="flex items-center justify-between gap-3 pt-0.5">
            {/* Apple / Notion Segmented Bar */}
            <div className="flex items-center bg-[#141417] p-1 rounded-lg border border-white/[0.04]">
              <button
                onClick={() => {
                  triggerHaptic('selection');
                  setViewFilter('today');
                }}
                className={`px-3 py-1 rounded-md text-xs font-medium transition cursor-pointer ${
                  viewFilter === 'today'
                    ? 'bg-white/[0.12] text-zinc-100 shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                Today ({completedTodayCount}/{totalDueToday})
              </button>
              <button
                onClick={() => {
                  triggerHaptic('selection');
                  setViewFilter('all');
                }}
                className={`px-3 py-1 rounded-md text-xs font-medium transition cursor-pointer ${
                  viewFilter === 'all'
                    ? 'bg-white/[0.12] text-zinc-100 shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                All ({routines.length})
              </button>
            </div>

            <button
              onClick={() => {
                triggerHaptic('light');
                openAddModal();
              }}
              className="h-8 px-3 rounded-lg bg-[#5e5ce6] hover:bg-[#5e5ce6]/90 text-white font-medium text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Add Routine</span>
            </button>
          </div>

          {/* Secondary Cadence & Time Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 select-none">
            <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider pl-0.5 pr-0.5 flex-shrink-0 flex items-center gap-1">
              <Filter className="w-2.5 h-2.5" />
              Cadence:
            </span>
            {[
              { id: 'all', label: 'All' },
              { id: 'daily', label: 'Daily' },
              { id: 'weekly', label: 'Weekly' },
              { id: 'monthly', label: 'Monthly' },
            ].map(pill => {
              const active = cadenceFilter === pill.id;
              return (
                <button
                  key={pill.id}
                  type="button"
                  onClick={() => {
                    triggerHaptic('selection');
                    setCadenceFilter(pill.id as any);
                  }}
                  className={`px-2 py-0.5 rounded-md text-[11px] font-medium whitespace-nowrap transition cursor-pointer ${
                    active
                      ? 'bg-white/[0.12] text-zinc-100'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {pill.label}
                </button>
              );
            })}

            <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider pl-2 pr-0.5 flex-shrink-0">
              Time:
            </span>
            {[
              { id: 'all', label: 'All' },
              { id: 'morning', label: 'Morning' },
              { id: 'afternoon', label: 'Afternoon' },
              { id: 'evening', label: 'Evening' },
            ].map(pill => {
              const active = timeFilter === pill.id;
              return (
                <button
                  key={pill.id}
                  type="button"
                  onClick={() => {
                    triggerHaptic('selection');
                    setTimeFilter(pill.id as any);
                  }}
                  className={`px-2 py-0.5 rounded-md text-[11px] font-medium whitespace-nowrap transition cursor-pointer ${
                    active
                      ? 'bg-[#5e5ce6]/25 text-[#bf5af2] border border-[#5e5ce6]/40 font-medium'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {pill.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Routine List (Thin, Space-Efficient List Items) */}
      {displayedRoutines.length === 0 ? (
        <div className="bg-[#121215] rounded-xl p-8 text-center border border-white/[0.06] text-xs text-zinc-500">
          {viewFilter === 'today'
            ? 'All routines completed or none scheduled for today.'
            : 'No routines created yet.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 landscape:grid-cols-2 gap-2.5">
          {displayedRoutines.map(rt => {
            const slotInfo = getRoutineSlotInfo(rt, todayStr);
            const isToday = isRoutineScheduledForToday(rt, todayStr);

            return (
              <RoutineRow
                key={rt.id}
                routine={rt}
                slotInfo={slotInfo}
                todayStr={todayStr}
                isToday={isToday}
                viewFilter={viewFilter}
                onToggleMain={() => {
                  triggerHaptic('success');
                  toggleRoutineCompletion(rt.id, todayStr);
                }}
                onToggleSlot={(slotIndex) => {
                  triggerHaptic('success');
                  toggleRoutineSlot(rt.id, slotIndex, todayStr);
                }}
                onToggleDueToday={() => {
                  triggerHaptic('light');
                  toggleRoutineDueToday(rt.id);
                }}
                onEdit={() => openEditModal(rt)}
                onDelete={() => {
                  triggerHaptic('warning');
                  deleteRoutine(rt.id);
                }}
              />
            );
          })}
        </div>
      )}

      {/* Routine Add / Edit Modal (Simple by default, Advanced when needed) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-[#18181b] border-t sm:border border-white/10 rounded-t-2xl sm:rounded-2xl w-full max-w-lg p-5 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-xs text-zinc-400 hover:text-white font-medium cursor-pointer"
              >
                Cancel
              </button>
              <h3 className="font-medium text-sm text-zinc-100">
                {editingItem ? 'Edit Routine' : 'Add Routine'}
              </h3>
              <button
                type="button"
                onClick={() => handleSave()}
                className="text-xs font-medium text-[#bf5af2] hover:text-[#d17df6] cursor-pointer"
              >
                {editingItem ? 'Save' : 'Add'}
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3.5">
              {/* Primary Input: What do you want to make routine? */}
              <div className="bg-[#121215] rounded-xl p-3 border border-white/[0.06]">
                <input
                  type="text"
                  required
                  placeholder="What do you want to make routine?"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full bg-transparent text-zinc-100 text-sm focus:outline-none placeholder:text-zinc-600"
                  autoFocus
                />
              </div>

              {/* Sub-routines Checklist (Optional) */}
              <div className="space-y-2 bg-[#121215] rounded-xl p-3 border border-white/[0.06]">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-zinc-300 font-medium flex items-center gap-1.5">
                    <ListTree className="w-3.5 h-3.5 text-[#bf5af2]" />
                    <span>Sub-routines / Steps</span>
                  </label>
                  <span className="text-[11px] text-zinc-500">
                    {modalSubroutines.length} step{modalSubroutines.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {/* Existing Sub-routines List */}
                {modalSubroutines.length > 0 && (
                  <div className="space-y-1.5 pt-0.5">
                    {modalSubroutines.map((sub, idx) => (
                      <div
                        key={sub.id || idx}
                        className="flex items-center justify-between gap-2 py-1.5 px-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04] text-xs"
                      >
                        <span className="text-zinc-200 truncate flex-1">{sub.title}</span>
                        <button
                          type="button"
                          onClick={() => setModalSubroutines(prev => prev.filter((_, i) => i !== idx))}
                          className="text-zinc-500 hover:text-rose-400 transition p-1 cursor-pointer"
                          title="Remove step"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add Sub-routine Input inside modal */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    value={newModalSubTitle}
                    onChange={e => setNewModalSubTitle(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (newModalSubTitle.trim()) {
                          setModalSubroutines(prev => [
                            ...prev,
                            {
                              id: 'sub_' + Date.now(),
                              title: newModalSubTitle.trim(),
                              completed: false,
                              completedDates: [],
                            },
                          ]);
                          setNewModalSubTitle('');
                        }
                      }
                    }}
                    placeholder="+ Add step (e.g. 10 Pushups, Cold shower)..."
                    className="flex-1 bg-black/30 border border-white/[0.06] focus:border-[#bf5af2]/50 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none transition"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newModalSubTitle.trim()) {
                        setModalSubroutines(prev => [
                          ...prev,
                          {
                            id: 'sub_' + Date.now(),
                            title: newModalSubTitle.trim(),
                            completed: false,
                            completedDates: [],
                          },
                        ]);
                        setNewModalSubTitle('');
                      }
                    }}
                    disabled={!newModalSubTitle.trim()}
                    className="px-2.5 py-1.5 rounded-lg bg-[#bf5af2] hover:bg-[#bf5af2]/90 disabled:opacity-30 text-white font-medium text-xs flex items-center gap-1 transition cursor-pointer active:scale-95 shadow-sm"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add</span>
                  </button>
                </div>
              </div>

              {/* Advanced Disclosure Toggle */}
              <div className="flex items-center justify-between px-1">
                <button
                  type="button"
                  onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
                  className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white font-medium py-1 transition cursor-pointer select-none group"
                >
                  <span className="text-[#0a84ff] group-hover:underline">Advanced</span>
                  <ChevronRight
                    className={`w-3.5 h-3.5 text-[#0a84ff] transition-transform duration-200 ${
                      isAdvancedOpen ? 'rotate-90' : 'group-hover:translate-x-0.5'
                    }`}
                  />
                  {!isAdvancedOpen && scheduleType !== 'daily' && (
                    <span className="text-[11px] text-zinc-500 ml-1">
                      (Configured)
                    </span>
                  )}
                </button>
              </div>

              {/* Advanced Collapsible Section (Collapsed by default for Add Routine) */}
              {isAdvancedOpen && (
                <div className="space-y-4 pt-2 border-t border-white/[0.06]">
                  {/* Frequency Options */}
                  <div>
                    <label className="block text-[11px] text-zinc-400 font-medium mb-1.5 px-0.5">
                      Frequency
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                      {[
                        { id: 'daily', label: 'Every day' },
                        { id: 'specific_days', label: 'Specific days' },
                        { id: 'times_per_week', label: 'X times per week' },
                        { id: 'every_x_weeks_2', label: 'Once every 2 weeks' },
                        { id: 'every_x_weeks_3', label: 'Once every 3 weeks' },
                        { id: 'monthly', label: 'Monthly' },
                        { id: 'times_per_month', label: 'X times per month' },
                        { id: 'custom', label: 'Custom' },
                      ].map(item => {
                        let isSelected = false;
                        if (item.id === 'every_x_weeks_2') {
                          isSelected = scheduleType === 'every_x_weeks' && everyXWeeks === 2;
                        } else if (item.id === 'every_x_weeks_3') {
                          isSelected = scheduleType === 'every_x_weeks' && everyXWeeks === 3;
                        } else {
                          isSelected = scheduleType === item.id;
                        }

                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              if (item.id === 'every_x_weeks_2') {
                                setScheduleType('every_x_weeks');
                                setEveryXWeeks(2);
                              } else if (item.id === 'every_x_weeks_3') {
                                setScheduleType('every_x_weeks');
                                setEveryXWeeks(3);
                              } else {
                                setScheduleType(item.id as ScheduleType);
                              }
                            }}
                            className={`py-1.5 px-2 rounded-lg text-xs font-medium text-center transition cursor-pointer border ${
                              isSelected
                                ? 'bg-[#0a84ff]/20 text-[#0a84ff] border-[#0a84ff]/40 font-medium'
                                : 'bg-white/[0.03] text-zinc-400 border-white/[0.04] hover:text-white'
                            }`}
                          >
                            {item.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Specific Days Sub-Config */}
                  {scheduleType === 'specific_days' && (
                    <div className="bg-[#121215] rounded-xl p-3 border border-white/[0.06]">
                      <label className="block text-[11px] text-zinc-400 font-medium mb-2">
                        Repeat on:
                      </label>
                      <div className="flex items-center gap-1 justify-between">
                        {DAYS_SHORT.map((day, idx) => {
                          const isSel = selectedDays.includes(idx);
                          return (
                            <button
                              key={day}
                              type="button"
                              onClick={() => toggleDay(idx)}
                              className={`w-8 h-8 rounded-full text-xs font-medium flex items-center justify-center transition cursor-pointer ${
                                isSel
                                  ? 'bg-[#0a84ff] text-white'
                                  : 'bg-white/[0.04] text-zinc-400 hover:text-white'
                              }`}
                            >
                              {day[0]}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* X times per week Sub-Config */}
                  {scheduleType === 'times_per_week' && (
                    <div className="bg-[#121215] rounded-xl p-3 border border-white/[0.06] space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-zinc-200 font-medium">
                          Times per week
                        </span>
                        <div className="flex items-center gap-1">
                          {[2, 3, 4, 5, 6].map(num => (
                            <button
                              key={num}
                              type="button"
                              onClick={() => setTimesPerWeek(num)}
                              className={`w-7 h-7 rounded-md text-xs font-medium transition cursor-pointer ${
                                timesPerWeek === num
                                  ? 'bg-[#0a84ff] text-white'
                                  : 'bg-white/[0.04] text-zinc-400'
                              }`}
                            >
                              {num}x
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Optional Day Selection */}
                      <div className="pt-2 border-t border-white/[0.06]">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[11px] text-zinc-500">
                            Assign specific days (optional):
                          </span>
                          {selectedDays.length > 0 && (
                            <button
                              type="button"
                              onClick={() => setSelectedDays([])}
                              className="text-[10px] text-[#0a84ff] hover:underline cursor-pointer"
                            >
                              Leave flexible
                            </button>
                          )}
                        </div>
                        <div className="flex items-center gap-1 justify-between">
                          {DAYS_SHORT.map((day, idx) => {
                            const isSel = selectedDays.includes(idx);
                            return (
                              <button
                                key={day}
                                type="button"
                                onClick={() => toggleDay(idx)}
                                className={`w-8 h-8 rounded-full text-xs font-medium flex items-center justify-center transition cursor-pointer ${
                                  isSel
                                    ? 'bg-[#0a84ff] text-white'
                                    : 'bg-white/[0.04] text-zinc-400 hover:text-white'
                                }`}
                              >
                                {day[0]}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* X times per month Sub-Config */}
                  {scheduleType === 'times_per_month' && (
                    <div className="bg-[#121215] rounded-xl p-3 border border-white/[0.06] flex items-center justify-between">
                      <span className="text-xs text-zinc-200 font-medium">
                        Times per month
                      </span>
                      <div className="flex items-center gap-1">
                        {[2, 3, 4].map(num => (
                          <button
                            key={num}
                            type="button"
                            onClick={() => setTimesPerMonth(num)}
                            className={`w-7 h-7 rounded-md text-xs font-medium transition cursor-pointer ${
                              timesPerMonth === num
                                ? 'bg-[#0a84ff] text-white'
                                : 'bg-white/[0.04] text-zinc-400'
                            }`}
                          >
                            {num}x
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Custom Text Sub-Config */}
                  {scheduleType === 'custom' && (
                    <div className="bg-[#121215] rounded-xl p-3 border border-white/[0.06]">
                      <input
                        type="text"
                        placeholder="e.g. Every other day, Twice a year"
                        value={customText}
                        onChange={e => setCustomText(e.target.value)}
                        className="w-full bg-transparent text-zinc-200 text-xs focus:outline-none placeholder:text-zinc-600"
                      />
                    </div>
                  )}

                  {/* Explicit Due Today Toggle (unless already daily) */}
                  {scheduleType !== 'daily' && (
                    <label className="flex items-center justify-between p-3 bg-[#121215] border border-white/[0.06] rounded-xl cursor-pointer select-none">
                      <div className="space-y-0.5">
                        <div className="text-xs font-medium text-zinc-200">Explicitly Due Today</div>
                        <div className="text-[11px] text-zinc-500">
                          Include in Today&apos;s focus list with attention accent
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={dueToday}
                        onChange={e => setDueToday(e.target.checked)}
                        className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                      />
                    </label>
                  )}

                  {/* Time of Day */}
                  <div>
                    <label className="block text-[11px] text-zinc-400 font-medium mb-1.5 px-0.5">
                      Time of Day
                    </label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {[
                        { id: 'anytime', label: 'Anytime' },
                        { id: 'morning', label: 'Morning' },
                        { id: 'afternoon', label: 'Afternoon' },
                        { id: 'evening', label: 'Evening' },
                      ].map(tod => (
                        <button
                          key={tod.id}
                          type="button"
                          onClick={() => setTimeOfDay(tod.id as any)}
                          className={`py-1.5 px-1 rounded-lg text-xs font-medium text-center transition cursor-pointer border ${
                            timeOfDay === tod.id
                              ? 'bg-[#0a84ff]/20 text-[#0a84ff] border-[#0a84ff]/40 font-medium'
                              : 'bg-white/[0.03] text-zinc-400 border-white/[0.04] hover:text-white'
                          }`}
                        >
                          {tod.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Optional Notes / Description */}
                  <div>
                    <label className="block text-[11px] text-zinc-400 font-medium mb-1 px-0.5">
                      Notes (Optional)
                    </label>
                    <textarea
                      placeholder="Add details or context..."
                      rows={2}
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      className="w-full bg-[#121215] border border-white/[0.06] rounded-xl p-2.5 text-zinc-200 text-xs focus:outline-none placeholder:text-zinc-600 resize-none"
                    />
                  </div>
                </div>
              )}

              {/* Main Action Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-[#5e5ce6] hover:bg-[#5e5ce6]/90 active:scale-[0.99] text-white font-medium text-xs transition cursor-pointer shadow-sm"
                >
                  {editingItem ? 'Save Changes' : 'Add Routine'}
                </button>
              </div>

              {/* Delete Button (when editing) */}
              {editingItem && (
                <div className="pt-1 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      deleteRoutine(editingItem.id);
                      setIsModalOpen(false);
                    }}
                    className="text-xs text-rose-400 hover:text-rose-300 flex items-center justify-center gap-1.5 mx-auto py-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Routine</span>
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
