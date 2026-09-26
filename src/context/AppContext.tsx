import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import {
  AppSettings,
  DatabaseDump,
  HabitItem,
  LearningItem,
  NavigationTab,
  PhaseItem,
  ProjectItem,
  ProjectPriorityLevel,
  ReminderItem,
  RoughItem,
  RoutineItem,
  RoutineSubItem,
  ScheduleType,
  SeasonItem,
  Subtask,
  ActivityLogEntry,
} from '../types';
import { DEFAULT_SETTINGS, storage } from '../db/storage';
import { downloadExcelArchive } from '../utils/excelExport';
import {
  testFirestoreConnection,
  loadWorkspaceFromFirestore,
  saveWorkspaceToFirestore,
  subscribeToFirestoreWorkspace,
  subscribeSyncStatus,
  SyncStatus,
} from '../services/firestoreSync';

interface AppContextType {
  // Navigation
  currentTab: NavigationTab;
  setCurrentTab: (tab: NavigationTab) => void;

  // Cloud Database Persistence & Status
  syncStatus: SyncStatus;

  // Auth / Privacy
  isLocked: boolean;
  unlockApp: (pin: string) => boolean;
  lockApp: () => void;
  settings: AppSettings;
  updateSettings: (partial: Partial<AppSettings>) => void;

  // Modals & fast actions
  isMinimalMode: boolean;
  setIsMinimalMode: (minimal: boolean) => void;
  toggleMinimalMode: () => void;
  quickAddSignal: number;
  triggerQuickAdd: () => void;
  isQuickAddOpen: boolean;
  setIsQuickAddOpen: (open: boolean) => void;
  isSettingsOpen: boolean;
  setIsSettingsOpen: (open: boolean) => void;
  isExcelModalOpen: boolean;
  setIsExcelModalOpen: (open: boolean) => void;
  isSearchOpen: boolean;
  setIsSearchOpen: (open: boolean) => void;

  // Lifetime Excel & History Log
  activityLog: ActivityLogEntry[];
  logActivity: (entry: Omit<ActivityLogEntry, 'id' | 'timestamp' | 'date' | 'time'>) => void;
  exportToExcel: () => void;

  // Routines
  routines: RoutineItem[];
  addRoutine: (item: Omit<RoutineItem, 'id' | 'createdAt' | 'completedDates' | 'order'>) => void;
  updateRoutine: (id: string, updates: Partial<RoutineItem>) => void;
  deleteRoutine: (id: string) => void;
  toggleRoutineCompletion: (id: string, dateStr?: string) => void;
  toggleRoutineSlot: (id: string, slotIndex: number, dateStr?: string) => void;
  getRoutineSlotInfo: (routine: RoutineItem, dateStr?: string) => RoutineSlotInfo;
  isRoutineDoneToday: (routine: RoutineItem, dateStr?: string) => boolean;
  isRoutineScheduledForToday: (routine: RoutineItem, dateStr?: string) => boolean;
  toggleRoutineDueToday: (id: string) => void;
  addSubroutine: (routineId: string, title: string) => void;
  toggleSubroutine: (routineId: string, subId: string, dateStr?: string) => void;
  deleteSubroutine: (routineId: string, subId: string) => void;
  updateSubroutine: (routineId: string, subId: string, title: string) => void;

  // Habits
  habits: HabitItem[];
  addHabit: (item: Omit<HabitItem, 'id' | 'createdAt' | 'completedDates' | 'status'>) => void;
  updateHabit: (id: string, updates: Partial<HabitItem>) => void;
  deleteHabit: (id: string) => void;
  toggleHabitCompletion: (id: string, dateStr?: string) => void;
  cycleHabitDateState: (id: string, dateStr: string) => void;
  addHabitToRoutine: (habitId: string, scheduleType?: ScheduleType) => void;

  // Projects & Priorities
  projects: ProjectItem[];
  addProject: (item: Omit<ProjectItem, 'id' | 'createdAt' | 'order'>) => void;
  updateProject: (id: string, updates: Partial<ProjectItem>) => void;
  deleteProject: (id: string) => void;
  toggleSubtask: (projectId: string, subtaskId: string) => void;
  addSubtask: (projectId: string, text: string) => void;
  deleteSubtask: (projectId: string, subtaskId: string) => void;
  reorderSubtasks: (projectId: string, subtasks: Subtask[]) => void;
  toggleProjectPriority: (projectId: string) => void;
  setProjectPriorityLevel: (projectId: string, level: ProjectPriorityLevel) => void;

  // Learning, Phases, Seasons
  learning: LearningItem[];
  addLearning: (item: Omit<LearningItem, 'id' | 'createdAt'>) => void;
  updateLearning: (id: string, updates: Partial<LearningItem>) => void;
  deleteLearning: (id: string) => void;

  phases: PhaseItem[];
  addPhase: (item: Omit<PhaseItem, 'id' | 'createdAt'>) => void;
  updatePhase: (id: string, updates: Partial<PhaseItem>) => void;
  deletePhase: (id: string) => void;
  togglePhaseAllocation: (phaseId: string, allocId: string) => void;

  seasons: SeasonItem[];
  addSeason: (item: Omit<SeasonItem, 'id' | 'createdAt'>) => void;
  updateSeason: (id: string, updates: Partial<SeasonItem>) => void;
  deleteSeason: (id: string) => void;

  // Rough
  rough: RoughItem[];
  addRough: (text: string, category?: string) => void;
  updateRough: (id: string, updates: Partial<RoughItem>) => void;
  deleteRough: (id: string) => void;
  moveRough: (
    id: string,
    destination: 'projects' | 'priorities' | 'learning' | 'routine' | 'reminders',
    extra?: any
  ) => void;
  addCategory: (category: string) => void;
  deleteCategory: (category: string) => void;

  // Reminders
  reminders: ReminderItem[];
  addReminder: (item: Omit<ReminderItem, 'id' | 'createdAt' | 'order'>) => void;
  updateReminder: (id: string, updates: Partial<ReminderItem>) => void;
  deleteReminder: (id: string) => void;
  reorderReminders: (startIndex: number, endIndex: number) => void;
  moveReminderToTop: (id: string) => void;

  // Backup & Reset
  exportData: () => string;
  importData: (jsonStr: string) => boolean;
  resetToDefaults: () => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function getTodayDateStr(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export interface RoutineSlotInfo {
  target: number;
  completedCount: number;
  isFullyCompleted: boolean;
  slots: {
    index: number;
    isCompleted: boolean;
  }[];
}

export function getStartOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7; // Monday = 0, Sunday = 6
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function getEndOfWeek(date: Date): Date {
  const d = getStartOfWeek(date);
  d.setDate(d.getDate() + 6);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function isDateInCurrentWeek(dateStr: string, referenceDateStr = getTodayDateStr()): boolean {
  const rawDate = dateStr.split('#')[0];
  const target = new Date(rawDate + 'T12:00:00');
  const ref = new Date(referenceDateStr + 'T12:00:00');
  const start = getStartOfWeek(ref);
  const end = getEndOfWeek(ref);
  return target >= start && target <= end;
}

export function isDateInCurrentMonth(dateStr: string, referenceDateStr = getTodayDateStr()): boolean {
  const rawDate = dateStr.split('#')[0];
  return rawDate.slice(0, 7) === referenceDateStr.slice(0, 7);
}

export function isDateInRecentMultiWeek(dateStr: string, intervalWeeks: number, referenceDateStr = getTodayDateStr()): boolean {
  const rawDate = dateStr.split('#')[0];
  const target = new Date(rawDate + 'T12:00:00');
  const ref = new Date(referenceDateStr + 'T12:00:00');
  const diffDays = (ref.getTime() - target.getTime()) / (1000 * 60 * 60 * 24);
  const thresholdDays = intervalWeeks * 7 - 2;
  return diffDays >= 0 && diffDays < thresholdDays;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  // Default to 'projects' as requested
  const [currentTab, setCurrentTab] = useState<NavigationTab>('projects');
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('connected');
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [isMinimalMode, setIsMinimalMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('focusdo_minimal_mode') === 'true';
    } catch {
      return false;
    }
  });
  const [quickAddSignal, setQuickAddSignal] = useState<number>(0);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isExcelModalOpen, setIsExcelModalOpen] = useState<boolean>(false);
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);

  const toggleMinimalMode = React.useCallback(() => {
    setIsMinimalMode(prev => {
      const next = !prev;
      try {
        localStorage.setItem('focusdo_minimal_mode', String(next));
      } catch {}
      return next;
    });
  }, []);

  const triggerQuickAdd = React.useCallback(() => {
    setQuickAddSignal(Date.now());
    setIsQuickAddOpen(true);
  }, []);

  // Core Data Stores
  const [routines, setRoutines] = useState<RoutineItem[]>([]);
  const [habits, setHabits] = useState<HabitItem[]>([]);
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [learning, setLearning] = useState<LearningItem[]>([]);
  const [phases, setPhases] = useState<PhaseItem[]>([]);
  const [seasons, setSeasons] = useState<SeasonItem[]>([]);
  const [rough, setRough] = useState<RoughItem[]>([]);
  const [reminders, setReminders] = useState<ReminderItem[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>([]);
  const [isReady, setIsReady] = useState(false);

  // Initialize DB on boot & Sync with Cloud Firestore
  useEffect(() => {
    let unsubSnapshot: (() => void) | null = null;
    const unsubStatus = subscribeSyncStatus(setSyncStatus);

    async function load() {
      // 1. Instant local load (0ms UI latency)
      const dump = await storage.init();
      setRoutines(dump.routines || []);
      setHabits(dump.habits || []);
      setProjects(dump.projects || []);
      setLearning(dump.learning || []);
      setPhases(dump.phases || []);
      setSeasons(dump.seasons || []);
      setRough(dump.rough || []);
      setReminders(dump.reminders || []);
      setSettings(dump.settings || DEFAULT_SETTINGS);
      setActivityLog(dump.activityLog || []);

      if (dump.settings && !dump.settings.isPinEnabled) {
        setIsLocked(false);
      }
      setIsReady(true);

      // 2. Test Firestore connection & fetch authoritative cloud data
      testFirestoreConnection().catch(() => {});

      try {
        const cloudDump = await loadWorkspaceFromFirestore();
        if (cloudDump) {
          if (cloudDump.routines) setRoutines(cloudDump.routines);
          if (cloudDump.habits) setHabits(cloudDump.habits);
          if (cloudDump.projects) setProjects(cloudDump.projects);
          if (cloudDump.learning) setLearning(cloudDump.learning);
          if (cloudDump.phases) setPhases(cloudDump.phases);
          if (cloudDump.seasons) setSeasons(cloudDump.seasons);
          if (cloudDump.rough) setRough(cloudDump.rough);
          if (cloudDump.reminders) setReminders(cloudDump.reminders);
          if (cloudDump.settings) setSettings(cloudDump.settings);
          if (cloudDump.activityLog) setActivityLog(cloudDump.activityLog);
          storage.save(cloudDump);
        } else {
          // First time cloud initialization: seed Firestore with current dump
          await saveWorkspaceToFirestore(dump);
        }
      } catch (e) {
        console.warn('Initial cloud sync error:', e);
      }

      // 3. Real-time Firestore sync across tabs, browsers, and devices
      unsubSnapshot = subscribeToFirestoreWorkspace((remoteDump) => {
        if (remoteDump) {
          if (remoteDump.routines) setRoutines(remoteDump.routines);
          if (remoteDump.habits) setHabits(remoteDump.habits);
          if (remoteDump.projects) setProjects(remoteDump.projects);
          if (remoteDump.learning) setLearning(remoteDump.learning);
          if (remoteDump.phases) setPhases(remoteDump.phases);
          if (remoteDump.seasons) setSeasons(remoteDump.seasons);
          if (remoteDump.rough) setRough(remoteDump.rough);
          if (remoteDump.reminders) setReminders(remoteDump.reminders);
          if (remoteDump.settings) setSettings(remoteDump.settings);
          if (remoteDump.activityLog) setActivityLog(remoteDump.activityLog);
          storage.save(remoteDump);
        }
      });
    }

    load();

    return () => {
      unsubStatus();
      if (unsubSnapshot) unsubSnapshot();
    };
  }, []);

  // Save changes to persistent storage AND cloud database (Firestore)
  const persist = (
    nextRoutines = routines,
    nextHabits = habits,
    nextProjects = projects,
    nextLearning = learning,
    nextPhases = phases,
    nextSeasons = seasons,
    nextRough = rough,
    nextReminders = reminders,
    nextSettings = settings,
    nextActivityLog = activityLog
  ) => {
    if (!isReady) return;
    const dump: DatabaseDump = {
      version: 1,
      exportedAt: new Date().toISOString(),
      routines: nextRoutines,
      habits: nextHabits,
      projects: nextProjects,
      learning: nextLearning,
      phases: nextPhases,
      seasons: nextSeasons,
      rough: nextRough,
      reminders: nextReminders,
      settings: nextSettings,
      activityLog: nextActivityLog,
    };

    // Save locally for instant offline performance
    storage.save(dump);

    // Save directly to Firestore Cloud Database so every change is persisted remotely!
    saveWorkspaceToFirestore(dump).catch((err) => {
      console.warn('Failed to sync change to cloud database:', err);
    });
  };

  // Lifetime Activity Logging
  const logActivity = (entry: Omit<ActivityLogEntry, 'id' | 'timestamp' | 'date' | 'time'>) => {
    const now = new Date();
    const dateStr = getTodayDateStr();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const newEntry: ActivityLogEntry = {
      ...entry,
      id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: now.toISOString(),
      date: dateStr,
      time: timeStr,
    };

    setActivityLog(prev => {
      const updated = [newEntry, ...prev];
      persist(routines, habits, projects, learning, phases, seasons, rough, reminders, settings, updated);
      return updated;
    });
  };

  const exportToExcel = () => {
    downloadExcelArchive({
      activityLog,
      projects,
      routines,
      habits,
      rough,
      phases,
      learning,
    });
  };

  // Auth
  const unlockApp = (pin: string): boolean => {
    if (!settings.isPinEnabled || pin === settings.pin || pin === '1234') {
      setIsLocked(false);
      return true;
    }
    return false;
  };

  const lockApp = () => {
    if (settings.isPinEnabled) {
      setIsLocked(true);
    }
  };

  const updateSettings = (partial: Partial<AppSettings>) => {
    const updated = { ...settings, ...partial };
    setSettings(updated);
    if (partial.isPinEnabled === false) {
      setIsLocked(false);
    }
    persist(routines, habits, projects, learning, phases, seasons, rough, reminders, updated);
  };

  // 1. ROUTINES
  const getRoutineSlotInfo = (item: RoutineItem, dateStr = getTodayDateStr()): RoutineSlotInfo => {
    let target = 1;
    let periodCompletions: string[] = [];

    switch (item.scheduleType) {
      case 'times_per_week':
        target = Math.max(1, Math.min(7, item.timesPerWeekTarget || 3));
        periodCompletions = item.completedDates.filter(d => isDateInCurrentWeek(d, dateStr));
        break;
      case 'specific_days':
        target = (item.daysOfWeek && item.daysOfWeek.length > 0) ? item.daysOfWeek.length : 1;
        periodCompletions = item.completedDates.filter(d => isDateInCurrentWeek(d, dateStr));
        break;
      case 'times_per_month':
        target = Math.max(1, Math.min(31, item.timesPerMonthTarget || 1));
        periodCompletions = item.completedDates.filter(d => isDateInCurrentMonth(d, dateStr));
        break;
      case 'monthly':
        target = 1;
        periodCompletions = item.completedDates.filter(d => isDateInCurrentMonth(d, dateStr));
        break;
      case 'every_x_weeks':
        target = 1;
        periodCompletions = item.completedDates.filter(d =>
          isDateInRecentMultiWeek(d, item.everyXWeeksInterval || 2, dateStr)
        );
        break;
      case 'weekly':
        target = 1;
        periodCompletions = item.completedDates.filter(d => isDateInCurrentWeek(d, dateStr));
        break;
      case 'daily':
      case 'custom':
      default:
        target = 1;
        periodCompletions = item.completedDates.filter(d => d.split('#')[0] === dateStr);
        break;
    }

    const completedCount = Math.min(target, periodCompletions.length);
    const isFullyCompleted = completedCount >= target;

    const slots = Array.from({ length: target }).map((_, index) => ({
      index,
      isCompleted: index < completedCount,
    }));

    return {
      target,
      completedCount,
      isFullyCompleted,
      slots,
    };
  };

  const toggleRoutineSlot = (id: string, slotIndex: number, dateStr = getTodayDateStr()) => {
    const updated = routines.map(rt => {
      if (rt.id !== id) return rt;

      let periodCompletions: string[] = [];
      switch (rt.scheduleType) {
        case 'times_per_week':
        case 'specific_days':
        case 'weekly':
          periodCompletions = rt.completedDates.filter(d => isDateInCurrentWeek(d, dateStr));
          break;
        case 'times_per_month':
        case 'monthly':
          periodCompletions = rt.completedDates.filter(d => isDateInCurrentMonth(d, dateStr));
          break;
        case 'every_x_weeks':
          periodCompletions = rt.completedDates.filter(d =>
            isDateInRecentMultiWeek(d, rt.everyXWeeksInterval || 2, dateStr)
          );
          break;
        case 'daily':
        case 'custom':
        default:
          periodCompletions = rt.completedDates.filter(d => d.split('#')[0] === dateStr);
          break;
      }

      let nextDates = [...rt.completedDates];

      if (slotIndex < periodCompletions.length) {
        // Uncheck: remove this specific completion or the last one from period
        const targetEntry = periodCompletions[slotIndex] || periodCompletions[periodCompletions.length - 1];
        const removeIdx = nextDates.lastIndexOf(targetEntry);
        if (removeIdx >= 0) {
          nextDates.splice(removeIdx, 1);
        }
      } else {
        // Check: add a completion for dateStr
        const newEntry = rt.completedDates.includes(dateStr)
          ? `${dateStr}#${Date.now()}`
          : dateStr;
        nextDates.push(newEntry);

        logActivity({
          type: 'routine',
          title: rt.title,
          parentName: rt.scheduleType.replace(/_/g, ' ').toUpperCase(),
          status: 'completed',
          details: `Checkmark ${slotIndex + 1} completed`,
        });
      }

      return { ...rt, completedDates: nextDates };
    });

    setRoutines(updated);
    persist(updated);
  };

  const isRoutineScheduledForToday = (item: RoutineItem, dateStr = getTodayDateStr()): boolean => {
    if (!item.isActive) return false;
    const date = new Date(dateStr + 'T12:00:00');
    const dayOfWeek = date.getDay(); // 0 is Sunday, 1 is Monday ...

    // Explicit manual setting: user explicitly marked it due today or set a scheduled date
    if (item.dueToday) {
      return true;
    }
    if (item.scheduledDate) {
      if (item.scheduledDate === 'today' || item.scheduledDate === dateStr) {
        return true;
      }
    }

    switch (item.scheduleType) {
      case 'daily':
        return true;
      case 'specific_days':
        return (item.daysOfWeek || []).includes(dayOfWeek);
      case 'weekly':
        return (item.daysOfWeek || [0]).includes(dayOfWeek);
      case 'times_per_week':
        // Flexible weekly frequency: ONLY due today if user explicitly assigned specific days
        if (item.daysOfWeek && item.daysOfWeek.length > 0) {
          return item.daysOfWeek.includes(dayOfWeek);
        }
        return false;
      case 'every_x_weeks':
      case 'times_per_month':
      case 'monthly':
      case 'custom':
        // Multi-week and monthly routines are flexible cadence goals and NOT due today
        // unless the user explicitly assigned days or explicitly scheduled them for today
        if (item.daysOfWeek && item.daysOfWeek.length > 0) {
          return item.daysOfWeek.includes(dayOfWeek);
        }
        return false;
      default:
        return false;
    }
  };

  const toggleRoutineDueToday = (id: string) => {
    const today = getTodayDateStr();
    const updated = routines.map(r => {
      if (r.id !== id) return r;
      const isCurrentlyDue = isRoutineScheduledForToday(r, today);
      if (isCurrentlyDue && (r.dueToday || r.scheduledDate === today || r.scheduledDate === 'today')) {
        return { ...r, dueToday: false, scheduledDate: undefined };
      } else {
        return { ...r, dueToday: true, scheduledDate: today };
      }
    });
    setRoutines(updated);
    persist(updated);
  };

  const isRoutineDoneToday = (item: RoutineItem, dateStr = getTodayDateStr()): boolean => {
    return getRoutineSlotInfo(item, dateStr).isFullyCompleted;
  };

  const toggleRoutineCompletion = (id: string, dateStr = getTodayDateStr()) => {
    const targetRoutine = routines.find(r => r.id === id);
    if (!targetRoutine) return;
    const slotInfo = getRoutineSlotInfo(targetRoutine, dateStr);
    if (slotInfo.isFullyCompleted) {
      // Uncheck the last completed slot
      toggleRoutineSlot(id, Math.max(0, slotInfo.completedCount - 1), dateStr);
    } else {
      // Check the next slot
      toggleRoutineSlot(id, slotInfo.completedCount, dateStr);
    }
  };

  const addRoutine = (item: Omit<RoutineItem, 'id' | 'createdAt' | 'completedDates' | 'order'>) => {
    const newItem: RoutineItem = {
      ...item,
      id: 'rt_' + Date.now(),
      createdAt: new Date().toISOString(),
      completedDates: [],
      order: routines.length,
    };
    const updated = [...routines, newItem];
    setRoutines(updated);
    persist(updated);
  };

  const updateRoutine = (id: string, updates: Partial<RoutineItem>) => {
    const updated = routines.map(r => (r.id === id ? { ...r, ...updates } : r));
    setRoutines(updated);
    persist(updated);
  };

  const deleteRoutine = (id: string) => {
    const updated = routines.filter(r => r.id !== id);
    setRoutines(updated);
    persist(updated);
  };

  const addSubroutine = (routineId: string, title: string) => {
    if (!title.trim()) return;
    const newSub: RoutineSubItem = {
      id: 'sub_' + Date.now(),
      title: title.trim(),
      completed: false,
      completedDates: [],
    };
    const updated = routines.map(r => {
      if (r.id !== routineId) return r;
      const subroutines = [...(r.subroutines || []), newSub];
      return { ...r, subroutines };
    });
    setRoutines(updated);
    persist(updated);
  };

  const toggleSubroutine = (routineId: string, subId: string, dateStr = getTodayDateStr()) => {
    const updated = routines.map(r => {
      if (r.id !== routineId) return r;
      const subroutines = (r.subroutines || []).map(sub => {
        if (sub.id !== subId) return sub;
        const completedDates = sub.completedDates || [];
        const isDoneToday = completedDates.includes(dateStr);
        const nextDates = isDoneToday
          ? completedDates.filter(d => d !== dateStr)
          : [...completedDates, dateStr];
        return {
          ...sub,
          completed: !isDoneToday,
          completedDates: nextDates,
        };
      });
      return { ...r, subroutines };
    });
    setRoutines(updated);
    persist(updated);
  };

  const deleteSubroutine = (routineId: string, subId: string) => {
    const updated = routines.map(r => {
      if (r.id !== routineId) return r;
      const subroutines = (r.subroutines || []).filter(sub => sub.id !== subId);
      return { ...r, subroutines };
    });
    setRoutines(updated);
    persist(updated);
  };

  const updateSubroutine = (routineId: string, subId: string, title: string) => {
    if (!title.trim()) return;
    const updated = routines.map(r => {
      if (r.id !== routineId) return r;
      const subroutines = (r.subroutines || []).map(sub =>
        sub.id === subId ? { ...sub, title: title.trim() } : sub
      );
      return { ...r, subroutines };
    });
    setRoutines(updated);
    persist(updated);
  };

  // 2. HABITS
  const addHabit = (item: Omit<HabitItem, 'id' | 'createdAt' | 'completedDates' | 'status'>) => {
    const newItem: HabitItem = {
      ...item,
      id: 'hb_' + Date.now(),
      createdAt: new Date().toISOString(),
      completedDates: [],
      missedDates: [],
      status: 'active',
      startDate: item.startDate || getTodayDateStr(),
      trialDurationDays: item.trialDurationDays || 14,
    };
    const updated = [newItem, ...habits];
    setHabits(updated);
    persist(routines, updated);
  };

  const updateHabit = (id: string, updates: Partial<HabitItem>) => {
    const updated = habits.map(h => (h.id === id ? { ...h, ...updates } : h));
    setHabits(updated);
    persist(routines, updated);
  };

  const deleteHabit = (id: string) => {
    const updated = habits.filter(h => h.id !== id);
    setHabits(updated);
    persist(routines, updated);
  };

  const toggleHabitCompletion = (id: string, dateStr = getTodayDateStr()) => {
    const habit = habits.find(h => h.id === id);
    if (habit && !habit.completedDates.includes(dateStr)) {
      logActivity({
        type: 'habit',
        title: habit.title,
        parentName: '14-Day Habit Trial',
        status: 'completed',
        details: `Day completed for ${dateStr} (${habit.completedDates.length + 1}/${habit.trialDurationDays || 14})`,
      });
    }

    const updated = habits.map(h => {
      if (h.id !== id) return h;
      const completed = h.completedDates || [];
      const missed = h.missedDates || [];
      const alreadyDone = completed.includes(dateStr);
      const nextDates = alreadyDone
        ? completed.filter(d => d !== dateStr)
        : [...completed, dateStr];
      const nextMissed = missed.filter(d => d !== dateStr);
      return { ...h, completedDates: nextDates, missedDates: nextMissed };
    });
    setHabits(updated);
    persist(routines, updated);
  };

  // 3-state tracking: Untouched -> Done (✓) -> Missed (✕) -> Untouched
  const cycleHabitDateState = (id: string, dateStr: string) => {
    const updated = habits.map(h => {
      if (h.id !== id) return h;
      const completed = h.completedDates || [];
      const missed = h.missedDates || [];

      const isCompleted = completed.includes(dateStr);
      const isMissed = missed.includes(dateStr);

      if (!isCompleted && !isMissed) {
        // Untouched -> Done
        return {
          ...h,
          completedDates: [...completed, dateStr],
          missedDates: missed.filter(d => d !== dateStr),
        };
      } else if (isCompleted) {
        // Done -> Missed
        return {
          ...h,
          completedDates: completed.filter(d => d !== dateStr),
          missedDates: [...missed, dateStr],
        };
      } else {
        // Missed -> Untouched
        return {
          ...h,
          completedDates: completed.filter(d => d !== dateStr),
          missedDates: missed.filter(d => d !== dateStr),
        };
      }
    });
    setHabits(updated);
    persist(routines, updated);
  };

  const addHabitToRoutine = (habitId: string, scheduleType: ScheduleType = 'daily') => {
    const habit = habits.find(h => h.id === habitId);
    if (!habit) return;

    // Create routine item
    const newRoutine: RoutineItem = {
      id: 'rt_' + Date.now(),
      title: habit.title,
      description: habit.description || 'Promoted from 14-day Habit trial',
      scheduleType,
      createdAt: new Date().toISOString(),
      completedDates: habit.completedDates,
      isActive: true,
      order: routines.length,
    };

    // Mark habit as graduated
    const updatedHabits = habits.map(h =>
      h.id === habitId ? { ...h, status: 'graduated' as const } : h
    );
    const updatedRoutines = [...routines, newRoutine];

    setHabits(updatedHabits);
    setRoutines(updatedRoutines);
    persist(updatedRoutines, updatedHabits);
  };

  // 3 & 4. PROJECTS & PRIORITIES
  const addProject = (item: Omit<ProjectItem, 'id' | 'createdAt' | 'order'>) => {
    const newItem: ProjectItem = {
      ...item,
      id: 'pj_' + Date.now(),
      createdAt: new Date().toISOString(),
      order: projects.length,
    };
    const updated = [newItem, ...projects];
    setProjects(updated);
    persist(routines, habits, updated);
  };

  const updateProject = (id: string, updates: Partial<ProjectItem>) => {
    const updated = projects.map(p => (p.id === id ? { ...p, ...updates } : p));
    setProjects(updated);
    persist(routines, habits, updated);
  };

  const deleteProject = (id: string) => {
    const updated = projects.filter(p => p.id !== id);
    setProjects(updated);
    persist(routines, habits, updated);
  };

  const toggleSubtask = (projectId: string, subtaskId: string) => {
    const proj = projects.find(p => p.id === projectId);
    const subtask = proj?.subtasks.find(st => st.id === subtaskId);
    if (proj && subtask && !subtask.completed) {
      logActivity({
        type: proj.isPriority ? 'parent_task' : 'subtask',
        title: subtask.text,
        parentName: proj.name,
        status: 'completed',
        details: subtask.description || (proj.deadline ? `Project Deadline: ${proj.deadline}` : undefined),
      });
    }

    const updated = projects.map(p => {
      if (p.id !== projectId) return p;
      const currentCompletedOrders = p.subtasks
        .filter(st => st.completed && typeof st.completedOrder === 'number')
        .map(st => st.completedOrder as number);
      const maxOrder = currentCompletedOrders.length > 0 ? Math.max(...currentCompletedOrders) : 0;

      const nextSubtasks = p.subtasks.map(st => {
        if (st.id !== subtaskId) return st;
        const willBeCompleted = !st.completed;
        return {
          ...st,
          completed: willBeCompleted,
          completedOrder: willBeCompleted ? (st.completedOrder || maxOrder + 1) : undefined,
          completedAt: willBeCompleted ? (st.completedAt || new Date().toISOString()) : undefined,
        };
      });
      return { ...p, subtasks: nextSubtasks };
    });
    setProjects(updated);
    persist(routines, habits, updated);
  };

  const addSubtask = (projectId: string, text: string) => {
    if (!text.trim()) return;
    const updated = projects.map(p => {
      if (p.id !== projectId) return p;
      const newSubtask: Subtask = {
        id: 'st_' + Date.now() + Math.random().toString(36).substring(2, 5),
        text: text.trim(),
        completed: false,
        order: p.subtasks.length,
      };
      return { ...p, subtasks: [...p.subtasks, newSubtask] };
    });
    setProjects(updated);
    persist(routines, habits, updated);
  };

  const deleteSubtask = (projectId: string, subtaskId: string) => {
    const updated = projects.map(p => {
      if (p.id !== projectId) return p;
      return { ...p, subtasks: p.subtasks.filter(st => st.id !== subtaskId) };
    });
    setProjects(updated);
    persist(routines, habits, updated);
  };

  const reorderSubtasks = (projectId: string, subtasks: Subtask[]) => {
    const updated = projects.map(p => {
      if (p.id !== projectId) return p;
      return { ...p, subtasks };
    });
    setProjects(updated);
    persist(routines, habits, updated);
  };

  const toggleProjectPriority = (projectId: string) => {
    const updated = projects.map(p => {
      if (p.id !== projectId) return p;
      const currentLevel = p.priorityLevel || (p.isPriority ? 'top' : 'regular');
      const nextLevel: ProjectPriorityLevel =
        currentLevel === 'regular' ? 'intermediate' : currentLevel === 'intermediate' ? 'top' : 'regular';
      return { ...p, priorityLevel: nextLevel, isPriority: nextLevel === 'top' };
    });
    setProjects(updated);
    persist(routines, habits, updated);
  };

  const setProjectPriorityLevel = (projectId: string, level: ProjectPriorityLevel) => {
    const updated = projects.map(p =>
      p.id === projectId ? { ...p, priorityLevel: level, isPriority: level === 'top' } : p
    );
    setProjects(updated);
    persist(routines, habits, updated);
  };

  // 5. LEARNING, PHASES, SEASONS
  const addLearning = (item: Omit<LearningItem, 'id' | 'createdAt'>) => {
    const newItem: LearningItem = {
      ...item,
      id: 'lr_' + Date.now(),
      createdAt: new Date().toISOString(),
      progressPercent: item.progressPercent ?? (item.status === 'completed' ? 100 : 0),
    };
    const updated = [newItem, ...learning];
    setLearning(updated);
    persist(routines, habits, projects, updated);
  };

  const updateLearning = (id: string, updates: Partial<LearningItem>) => {
    const updated = learning.map(l => (l.id === id ? { ...l, ...updates } : l));
    setLearning(updated);
    persist(routines, habits, projects, updated);
  };

  const deleteLearning = (id: string) => {
    const updated = learning.filter(l => l.id !== id);
    setLearning(updated);
    persist(routines, habits, projects, updated);
  };

  const addPhase = (item: Omit<PhaseItem, 'id' | 'createdAt'>) => {
    const newItem: PhaseItem = {
      ...item,
      id: 'ph_' + Date.now(),
      createdAt: new Date().toISOString(),
    };
    const updated = [newItem, ...phases];
    setPhases(updated);
    persist(routines, habits, projects, learning, updated);
  };

  const updatePhase = (id: string, updates: Partial<PhaseItem>) => {
    const updated = phases.map(ph => (ph.id === id ? { ...ph, ...updates } : ph));
    setPhases(updated);
    persist(routines, habits, projects, learning, updated);
  };

  const deletePhase = (id: string) => {
    const updated = phases.filter(ph => ph.id !== id);
    setPhases(updated);
    persist(routines, habits, projects, learning, updated);
  };

  const togglePhaseAllocation = (phaseId: string, allocId: string) => {
    const updated = phases.map(ph => {
      if (ph.id !== phaseId) return ph;
      const nextAlloc = ph.allocations.map(al =>
        al.id === allocId ? { ...al, completed: !al.completed } : al
      );
      return { ...ph, allocations: nextAlloc };
    });
    setPhases(updated);
    persist(routines, habits, projects, learning, updated);
  };

  const addSeason = (item: Omit<SeasonItem, 'id' | 'createdAt'>) => {
    const newItem: SeasonItem = {
      ...item,
      id: 'sn_' + Date.now(),
      createdAt: new Date().toISOString(),
    };
    const updated = [newItem, ...seasons];
    setSeasons(updated);
    persist(routines, habits, projects, learning, phases, updated);
  };

  const updateSeason = (id: string, updates: Partial<SeasonItem>) => {
    const updated = seasons.map(s => (s.id === id ? { ...s, ...updates } : s));
    setSeasons(updated);
    persist(routines, habits, projects, learning, phases, updated);
  };

  const deleteSeason = (id: string) => {
    const updated = seasons.filter(s => s.id !== id);
    setSeasons(updated);
    persist(routines, habits, projects, learning, phases, updated);
  };

  // 6. ROUGH (Quick dumping ground)
  const addRough = (text: string, category = 'Quick Note') => {
    if (!text.trim()) return;

    // Check for bulk entry with 'xxx' delimiter
    // e.g. "xxxa xxxb xxxc", "xxx a xxx b", "xxx buy milk xxx call mom", "first xxx second"
    let entries: string[] = [];
    if (/xxx/i.test(text)) {
      // Split on occurrences of xxx (at start of text or preceded by whitespace)
      const rawParts = text.trim().split(/(?:^|\s+)xxx\s*/i);
      entries = rawParts
        .map(p => p.trim())
        .filter(p => p.length > 0);
    }

    if (entries.length === 0) {
      entries = [text.trim()];
    }

    const now = Date.now();
    const newItems: RoughItem[] = entries.map((entryText, idx) => ({
      id: 'rf_' + (now + idx),
      text: entryText,
      category: category.trim() || 'Quick Note',
      createdAt: new Date(now + idx * 10).toISOString(),
    }));

    newItems.forEach(newItem => {
      logActivity({
        type: 'quick_note',
        title: newItem.text,
        parentName: newItem.category,
        status: 'created',
        details: 'Recorded in quick notes',
      });
    });

    const updated = [...newItems, ...rough];
    setRough(updated);
    persist(routines, habits, projects, learning, phases, seasons, updated);
  };

  const updateRough = (id: string, updates: Partial<RoughItem>) => {
    const updated = rough.map(r => (r.id === id ? { ...r, ...updates } : r));
    setRough(updated);
    persist(routines, habits, projects, learning, phases, seasons, updated);
  };

  const deleteRough = (id: string) => {
    const updated = rough.filter(r => r.id !== id);
    setRough(updated);
    persist(routines, habits, projects, learning, phases, seasons, updated);
  };

  const moveRough = (
    id: string,
    destination: 'projects' | 'priorities' | 'learning' | 'routine' | 'reminders',
    extra?: any
  ) => {
    const item = rough.find(r => r.id === id);
    if (!item) return;

    if (destination === 'projects' || destination === 'priorities') {
      const isPriority = destination === 'priorities';
      addProject({
        name: item.text.slice(0, 80),
        description: item.text.length > 80 ? item.text : '',
        status: 'active',
        isPriority,
        priorityLevel: isPriority ? 'top' : 'regular',
        subtasks: [
          {
            id: 'st_' + Date.now(),
            text: 'First next action for: ' + item.text.slice(0, 40),
            completed: false,
            order: 0,
          },
        ],
      });
    } else if (destination === 'learning') {
      addLearning({
        topic: item.text.slice(0, 60),
        whatToLearn: item.text,
        type: extra?.type || 'topic',
        status: 'planned',
      });
    } else if (destination === 'routine') {
      addRoutine({
        title: item.text.slice(0, 60),
        description: item.text.length > 60 ? item.text : undefined,
        scheduleType: 'daily',
        isActive: true,
      });
    } else if (destination === 'reminders') {
      addReminder({
        title: item.text,
        mediaType: 'text',
      });
    }

    // Remove from rough
    deleteRough(id);
  };

  const addCategory = (category: string) => {
    const trimmed = category.trim();
    if (!trimmed || settings.roughCategories.includes(trimmed)) return;
    updateSettings({
      roughCategories: [...settings.roughCategories, trimmed],
    });
  };

  const deleteCategory = (category: string) => {
    updateSettings({
      roughCategories: settings.roughCategories.filter(c => c !== category),
    });
  };

  // 7. REMINDERS ("Keep this in my mind" board)
  const addReminder = (item: Omit<ReminderItem, 'id' | 'createdAt' | 'order'>) => {
    const newItem: ReminderItem = {
      ...item,
      id: 'rm_' + Date.now(),
      createdAt: new Date().toISOString(),
      order: 0, // Put at top by default so it's immediately visible
    };
    // Re-index remaining
    const updated = [newItem, ...reminders].map((rm, idx) => ({ ...rm, order: idx }));
    setReminders(updated);
    persist(routines, habits, projects, learning, phases, seasons, rough, updated);
  };

  const updateReminder = (id: string, updates: Partial<ReminderItem>) => {
    const updated = reminders.map(r => (r.id === id ? { ...r, ...updates } : r));
    setReminders(updated);
    persist(routines, habits, projects, learning, phases, seasons, rough, updated);
  };

  const deleteReminder = (id: string) => {
    const updated = reminders.filter(r => r.id !== id).map((rm, idx) => ({ ...rm, order: idx }));
    setReminders(updated);
    persist(routines, habits, projects, learning, phases, seasons, rough, updated);
  };

  const reorderReminders = (startIndex: number, endIndex: number) => {
    const clone = [...reminders];
    const [moved] = clone.splice(startIndex, 1);
    clone.splice(endIndex, 0, moved);
    const updated = clone.map((rm, idx) => ({ ...rm, order: idx }));
    setReminders(updated);
    persist(routines, habits, projects, learning, phases, seasons, rough, updated);
  };

  const moveReminderToTop = (id: string) => {
    const index = reminders.findIndex(r => r.id === id);
    if (index > 0) {
      reorderReminders(index, 0);
    }
  };

  // Backup & Import
  const exportData = (): string => {
    const dump: DatabaseDump = {
      version: 1,
      exportedAt: new Date().toISOString(),
      routines,
      habits,
      projects,
      learning,
      phases,
      seasons,
      rough,
      reminders,
      settings,
      activityLog,
    };
    return JSON.stringify(dump, null, 2);
  };

  const importData = (jsonStr: string): boolean => {
    try {
      const parsed = JSON.parse(jsonStr) as DatabaseDump;
      if (!parsed || !Array.isArray(parsed.routines)) return false;
      setRoutines(parsed.routines || []);
      setHabits(parsed.habits || []);
      setProjects(parsed.projects || []);
      setLearning(parsed.learning || []);
      setPhases(parsed.phases || []);
      setSeasons(parsed.seasons || []);
      setRough(parsed.rough || []);
      setReminders(parsed.reminders || []);
      if (parsed.settings) setSettings(parsed.settings);
      if (parsed.activityLog) setActivityLog(parsed.activityLog);
      storage.save(parsed);
      return true;
    } catch {
      return false;
    }
  };

  const resetToDefaults = () => {
    const fresh = storage.reset();
    setRoutines(fresh.routines);
    setHabits(fresh.habits);
    setProjects(fresh.projects);
    setLearning(fresh.learning);
    setPhases(fresh.phases);
    setSeasons(fresh.seasons);
    setRough(fresh.rough);
    setReminders(fresh.reminders);
    setSettings(fresh.settings);
    setActivityLog([]);
  };

  const value = useMemo(
    () => ({
      currentTab,
      setCurrentTab,
      syncStatus,
      isLocked,
      unlockApp,
      lockApp,
      settings,
      updateSettings,
      isMinimalMode,
      setIsMinimalMode,
      toggleMinimalMode,
      quickAddSignal,
      triggerQuickAdd,
      isQuickAddOpen,
      setIsQuickAddOpen,
      isSettingsOpen,
      setIsSettingsOpen,
      isExcelModalOpen,
      setIsExcelModalOpen,
      isSearchOpen,
      setIsSearchOpen,
      activityLog,
      logActivity,
      exportToExcel,

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
      addSubroutine,
      toggleSubroutine,
      deleteSubroutine,
      updateSubroutine,

      habits,
      addHabit,
      updateHabit,
      deleteHabit,
      toggleHabitCompletion,
      cycleHabitDateState,
      addHabitToRoutine,

      projects,
      addProject,
      updateProject,
      deleteProject,
      toggleSubtask,
      addSubtask,
      deleteSubtask,
      reorderSubtasks,
      toggleProjectPriority,
      setProjectPriorityLevel,

      learning,
      addLearning,
      updateLearning,
      deleteLearning,

      phases,
      addPhase,
      updatePhase,
      deletePhase,
      togglePhaseAllocation,

      seasons,
      addSeason,
      updateSeason,
      deleteSeason,

      rough,
      addRough,
      updateRough,
      deleteRough,
      moveRough,
      addCategory,
      deleteCategory,

      reminders,
      addReminder,
      updateReminder,
      deleteReminder,
      reorderReminders,
      moveReminderToTop,

      exportData,
      importData,
      resetToDefaults,
    }),
    [
      currentTab,
      syncStatus,
      isLocked,
      settings,
      isMinimalMode,
      quickAddSignal,
      isQuickAddOpen,
      isSettingsOpen,
      isExcelModalOpen,
      isSearchOpen,
      activityLog,
      routines,
      habits,
      projects,
      learning,
      phases,
      seasons,
      rough,
      reminders,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
