export type NavigationTab = 
  | 'home'
  | 'routine'
  | 'habits'
  | 'projects'
  | 'learning'
  | 'rough'
  | 'reminders';

export type ScheduleType = 
  | 'daily' 
  | 'specific_days' 
  | 'times_per_week' 
  | 'every_x_weeks' 
  | 'times_per_month' 
  | 'weekly' 
  | 'monthly' 
  | 'custom';

export interface RoutineSubItem {
  id: string;
  title: string;
  completed?: boolean;
  completedDates?: string[]; // YYYY-MM-DD completion dates
}

export interface RoutineItem {
  id: string;
  title: string;
  description?: string;
  scheduleType: ScheduleType;
  daysOfWeek?: number[]; // 0=Sun, 1=Mon, ..., 6=Sat
  timesPerWeekTarget?: number; // e.g., 3
  everyXWeeksInterval?: number; // e.g., 2, 3, 4
  timesPerMonthTarget?: number; // e.g., 1, 2, 3
  customScheduleText?: string; // e.g. "Every other day"
  timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'anytime';
  scheduledDate?: string; // YYYY-MM-DD or 'today' - explicitly set to be due today
  dueToday?: boolean; // explicitly flagged as due today by user
  createdAt: string;
  completedDates: string[]; // YYYY-MM-DD
  subroutines?: RoutineSubItem[]; // Nested sub-routines/steps
  isActive: boolean;
  order: number;
}

export interface HabitItem {
  id: string;
  title: string;
  description?: string;
  startDate: string; // YYYY-MM-DD
  trialDurationDays: number; // default 14
  completedDates: string[]; // YYYY-MM-DD
  missedDates?: string[]; // YYYY-MM-DD
  status: 'active' | 'graduated' | 'archived';
  createdAt: string;
}

export interface ProjectNestedSubtask {
  id: string;
  text: string;
  completed: boolean;
}

export interface Subtask {
  id: string;
  text: string;
  completed: boolean;
  order: number;
  isNext?: boolean;
  description?: string;
  date?: string; // 'today' | 'YYYY-MM-DD' | undefined (default: No Date)
  reminder?: string;
  subtasks?: ProjectNestedSubtask[];
  completedAt?: string;
  completedOrder?: number;
}

export interface ProjectWaitingItem {
  id: string;
  title: string;
  waitingOn?: string;
  followUpDate?: string; // YYYY-MM-DD
  completed?: boolean;
  createdAt: string;
}

export interface ProjectFileLink {
  id: string;
  name: string;
  url?: string;
  type: 'link' | 'file' | 'note';
  size?: string;
  createdAt: string;
}

export type ProjectPriorityLevel = 'top' | 'intermediate' | 'regular';

export interface ProjectItem {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'on_hold' | 'completed' | 'someday';
  deadline?: string;
  notes?: string;
  subtasks: Subtask[];
  waitingItems?: ProjectWaitingItem[];
  files?: ProjectFileLink[];
  priorityLevel?: ProjectPriorityLevel;
  isPriority: boolean; // Used to differentiate Priorities vs regular Projects
  createdAt: string;
  order: number;
}

export type LearningType = 'quick' | 'topic' | 'concept' | 'skill';
export type LearningStatus = 'planned' | 'in_progress' | 'completed';

export interface LearningItem {
  id: string;
  topic: string;
  whatToLearn: string;
  type: LearningType;
  notes?: string;
  status: LearningStatus;
  progressPercent?: number; // 0 - 100
  createdAt: string;
}

export interface PhaseAllocation {
  id: string;
  label: string; // e.g., "Firearms basics — Week 1"
  periodText: string; // e.g., "Week 1"
  completed?: boolean;
}

export interface PhaseItem {
  id: string;
  title: string; // e.g., "Sept 21 – Oct 4"
  startDate: string;
  endDate: string;
  allocations: PhaseAllocation[];
  notes?: string;
  seasonId?: string;
  createdAt: string;
}

export interface SeasonItem {
  id: string;
  title: string; // e.g., "Autumn Foundation (Sept – Nov)"
  startDate: string;
  endDate: string;
  broadFocus: string;
  phaseIds?: string[];
  createdAt: string;
}

export interface RoughItem {
  id: string;
  text: string;
  category: string; // e.g., "Idea", "Inbox", "Buy", "Read"
  createdAt: string;
}

export type ReminderMediaType = 'text' | 'photo' | 'video' | 'audio';

export interface ReminderItem {
  id: string;
  title: string;
  mediaType: ReminderMediaType;
  mediaData?: string; // base64 DataURL or audio/video URL
  notes?: string;
  createdAt: string;
  order: number;
}

export interface AppSettings {
  pin: string; // e.g. "1234"
  isPinEnabled: boolean;
  roughCategories: string[];
  lastActiveDate: string;
}

export interface ActivityLogEntry {
  id: string;
  timestamp: string; // ISO string
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  type: 'parent_task' | 'subtask' | 'routine' | 'habit' | 'quick_note' | 'project' | 'phase';
  title: string;
  parentName?: string; // e.g. Project Name or Category
  status: 'completed' | 'skipped' | 'created' | 'archived' | 'updated';
  details?: string;
}

export interface DatabaseDump {
  version: number;
  exportedAt: string;
  ownerPin?: string;
  lastSyncedAt?: string;
  routines: RoutineItem[];
  habits: HabitItem[];
  projects: ProjectItem[];
  learning: LearningItem[];
  phases: PhaseItem[];
  seasons: SeasonItem[];
  rough: RoughItem[];
  reminders: ReminderItem[];
  settings: AppSettings;
  activityLog?: ActivityLogEntry[];
}
