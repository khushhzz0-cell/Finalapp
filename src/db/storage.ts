import {
  AppSettings,
  DatabaseDump,
  HabitItem,
  LearningItem,
  PhaseItem,
  ProjectItem,
  ReminderItem,
  RoughItem,
  RoutineItem,
  SeasonItem,
} from '../types';

const DB_NAME = 'focusdo_db';
const DB_VERSION = 1;
const STORAGE_BACKUP_KEY = 'focusdo_backup_v1';

export const DEFAULT_SETTINGS: AppSettings = {
  pin: '1234',
  isPinEnabled: false,
  roughCategories: ['Quick Note', 'Idea', 'To Buy', 'To Look Up', 'Random'],
  lastActiveDate: new Date().toISOString().split('T')[0],
};

export const SEED_ROUTINES: RoutineItem[] = [
  {
    id: 'rt_1',
    title: 'Morning Hydration & Sunlight',
    description: '500ml water with electrolytes + 10 mins outside light',
    scheduleType: 'daily',
    timeOfDay: 'morning',
    createdAt: '2026-09-01T08:00:00Z',
    completedDates: ['2026-09-22'],
    isActive: true,
    order: 0,
  },
  {
    id: 'rt_2',
    title: 'Strength Training',
    description: 'Compound lifts session (Push/Pull/Legs)',
    scheduleType: 'times_per_week',
    timesPerWeekTarget: 4,
    timeOfDay: 'afternoon',
    createdAt: '2026-09-01T08:00:00Z',
    completedDates: ['2026-09-21'],
    isActive: true,
    order: 1,
  },
  {
    id: 'rt_3',
    title: 'Deep Work Block (90 mins)',
    description: 'Phone in another room, single-task execution on next action',
    scheduleType: 'specific_days',
    daysOfWeek: [1, 2, 3, 4, 5], // Mon to Fri
    timeOfDay: 'morning',
    createdAt: '2026-09-01T08:00:00Z',
    completedDates: [],
    isActive: true,
    order: 2,
  },
  {
    id: 'rt_4',
    title: 'Evening Digital Sunset & Wind Down',
    description: 'Screens off 45 mins before sleep, read fiction or notebook',
    scheduleType: 'daily',
    timeOfDay: 'evening',
    createdAt: '2026-09-01T08:00:00Z',
    completedDates: [],
    isActive: true,
    order: 3,
  },
  {
    id: 'rt_5',
    title: 'Weekly Financial & Life Review',
    description: 'Reconcile rough dump, clean physical desk, verify upcoming week priorities',
    scheduleType: 'weekly',
    daysOfWeek: [0], // Sunday
    timeOfDay: 'anytime',
    createdAt: '2026-09-01T08:00:00Z',
    completedDates: ['2026-09-20'],
    isActive: true,
    order: 4,
  },
  {
    id: 'rt_6',
    title: 'Change Bed Linens',
    description: 'Fresh wash for sheets and pillowcases',
    scheduleType: 'every_x_weeks',
    everyXWeeksInterval: 2,
    timeOfDay: 'anytime',
    createdAt: '2026-09-01T08:00:00Z',
    completedDates: [],
    isActive: true,
    order: 5,
  },
  {
    id: 'rt_7',
    title: 'Deep Clean Apartment',
    description: 'Baseboards, vents, kitchen appliances deep clean',
    scheduleType: 'every_x_weeks',
    everyXWeeksInterval: 3,
    timeOfDay: 'anytime',
    createdAt: '2026-09-01T08:00:00Z',
    completedDates: [],
    isActive: true,
    order: 6,
  },
  {
    id: 'rt_8',
    title: 'Pay & Audit Monthly Bills',
    description: 'Check credit card statements and utility subscriptions',
    scheduleType: 'times_per_month',
    timesPerMonthTarget: 1,
    timeOfDay: 'anytime',
    createdAt: '2026-09-01T08:00:00Z',
    completedDates: [],
    isActive: true,
    order: 7,
  },
  {
    id: 'rt_9',
    title: 'Family Budget Review',
    description: 'Bi-monthly check-in on savings goals and expenditures',
    scheduleType: 'times_per_month',
    timesPerMonthTarget: 2,
    timeOfDay: 'evening',
    createdAt: '2026-09-01T08:00:00Z',
    completedDates: [],
    isActive: true,
    order: 8,
  },
];

export const SEED_HABITS: HabitItem[] = [
  {
    id: 'hb_1',
    title: 'No Phone in Bed First 30 Mins',
    description: 'Get out of bed before opening social media or messaging',
    startDate: '2026-09-15',
    trialDurationDays: 14,
    completedDates: [
      '2026-09-15',
      '2026-09-16',
      '2026-09-17',
      '2026-09-18',
      '2026-09-19',
      '2026-09-21',
      '2026-09-22',
    ],
    status: 'active',
    createdAt: '2026-09-15T07:00:00Z',
  },
  {
    id: 'hb_2',
    title: 'Daily 15-Minute Mobility Routine',
    description: 'Hips, thoracic spine, and shoulder openers after desk sessions',
    startDate: '2026-09-18',
    trialDurationDays: 14,
    completedDates: ['2026-09-18', '2026-09-19', '2026-09-20', '2026-09-22'],
    status: 'active',
    createdAt: '2026-09-18T07:00:00Z',
  },
];

export const SEED_PROJECTS: ProjectItem[] = [
  {
    id: 'pj_priority_1',
    name: 'File Taxes & Quarterly LLC Filing',
    description: 'Critical compliance deadline. Gather receipts and finalize with CPA.',
    status: 'active',
    deadline: '2026-09-30',
    notes: 'Accountant sent list of missing deductions on Sept 14th.',
    isPriority: true,
    priorityLevel: 'top',
    order: 0,
    createdAt: '2026-09-10T10:00:00Z',
    subtasks: [
      { id: 'st_p1_1', text: 'Download Chase bank statements for Q2 & Q3', completed: true, order: 0 },
      { id: 'st_p1_2', text: 'Categorize business software expenses in spreadsheet', completed: false, order: 1 },
      { id: 'st_p1_3', text: 'Email finalized zip to accountant and schedule review call', completed: false, order: 2 },
    ],
  },
  {
    id: 'pj_priority_2',
    name: 'Renew Passport & Global Entry',
    description: 'Expiring in December, international trips booked for early next year.',
    status: 'active',
    deadline: '2026-10-05',
    notes: 'Requires new passport photo and physical renewal form mailing.',
    isPriority: true,
    priorityLevel: 'intermediate',
    order: 1,
    createdAt: '2026-09-12T10:00:00Z',
    subtasks: [
      { id: 'st_p2_1', text: 'Take passport photo at Walgreens', completed: false, order: 0 },
      { id: 'st_p2_2', text: 'Fill out DS-82 renewal form online and print', completed: false, order: 1 },
      { id: 'st_p2_3', text: 'Mail packet via USPS Certified Priority Mail', completed: false, order: 2 },
    ],
  },
  {
    id: 'pj_normal_1',
    name: 'Personal Website Revamp',
    description: 'Clean personal showcase with portfolio, essays, and minimalist contact info.',
    status: 'active',
    deadline: '2026-10-15',
    notes: 'Keep it super fast, typography-centric, dark theme.',
    isPriority: false,
    priorityLevel: 'regular',
    order: 2,
    createdAt: '2026-09-14T11:00:00Z',
    subtasks: [
      { id: 'st_n1_1', text: 'Draft single-page copy in Markdown', completed: true, order: 0 },
      { id: 'st_n1_2', text: 'Set up Vite + Tailwind repository skeleton', completed: false, order: 1 },
      { id: 'st_n1_3', text: 'Add 3 featured projects with screenshots and links', completed: false, order: 2 },
      { id: 'st_n1_4', text: 'Connect custom domain and deploy on Cloud Run', completed: false, order: 3 },
    ],
  },
  {
    id: 'pj_normal_2',
    name: 'Home Garage Workshop Setup',
    description: 'Optimize garage workbench for woodworking and tool organization.',
    status: 'on_hold',
    notes: 'Wait until pegboard order arrives.',
    isPriority: false,
    priorityLevel: 'regular',
    order: 3,
    createdAt: '2026-09-05T11:00:00Z',
    subtasks: [
      { id: 'st_n2_1', text: 'Clear out old storage boxes to recycling', completed: true, order: 0 },
      { id: 'st_n2_2', text: 'Mount heavy-duty pegboard on north wall', completed: false, order: 1 },
      { id: 'st_n2_3', text: 'Install magnetic tool strip and LED overhead strip light', completed: false, order: 2 },
    ],
  },
];

export const SEED_LEARNING: LearningItem[] = [
  {
    id: 'lr_1',
    topic: 'Firearms Safety & Fundamentals',
    whatToLearn: '4 universal safety rules, grip, stance, sight alignment, trigger control, and safe storage.',
    type: 'topic',
    notes: 'Book a 2-hour 1-on-1 range session with certified instructor. Read state transport laws.',
    status: 'in_progress',
    progressPercent: 60,
    createdAt: '2026-09-18T10:00:00Z',
  },
  {
    id: 'lr_2',
    topic: 'System Architecture: Event-Driven Systems',
    whatToLearn: 'Understand Kafka vs RabbitMQ patterns, idempotency keys, and dead letter queues in 1 day.',
    type: 'concept',
    notes: 'Study Martin Fowler patterns and write 1-page summary.',
    status: 'planned',
    progressPercent: 0,
    createdAt: '2026-09-20T10:00:00Z',
  },
  {
    id: 'lr_3',
    topic: 'Basic Automotive Maintenance',
    whatToLearn: 'Safely jack up vehicle, change engine oil + filter, inspect brake pads, change air filters.',
    type: 'skill',
    notes: 'Watch vehicle specific guides, purchase torque wrench.',
    status: 'planned',
    progressPercent: 20,
    createdAt: '2026-09-16T10:00:00Z',
  },
  {
    id: 'lr_4',
    topic: 'DNS Records & TLS Handshake',
    whatToLearn: 'Refresh understanding of A, CNAME, ALIAS, CAA records and TLS 1.3 zero-RTT flow.',
    type: 'quick',
    notes: 'Read Cloudflare learning center article (45 mins).',
    status: 'completed',
    progressPercent: 100,
    createdAt: '2026-09-15T10:00:00Z',
  },
];

export const SEED_SEASONS: SeasonItem[] = [
  {
    id: 'sn_1',
    title: 'Season 1: Deep Groundwork & Physical Competence',
    startDate: '2026-09-01',
    endDate: '2026-10-31',
    broadFocus: 'Establish high baseline health, clear legal/tax liabilities, and build personal digital presence.',
    phaseIds: ['ph_1', 'ph_2'],
    createdAt: '2026-09-01T00:00:00Z',
  },
];

export const SEED_PHASES: PhaseItem[] = [
  {
    id: 'ph_1',
    title: 'Phase 1: Foundation & Range',
    startDate: '2026-09-21',
    endDate: '2026-10-04',
    seasonId: 'sn_1',
    createdAt: '2026-09-21T00:00:00Z',
    allocations: [
      { id: 'al_1', label: 'Learning: Firearms basics & range certification', periodText: 'Week 1', completed: false },
      { id: 'al_2', label: 'Project: Personal website launch & tax packet submission', periodText: 'Week 2', completed: false },
    ],
    notes: 'Stay locked on the single daily priority. No new project starts before Week 2 finishes.',
  },
  {
    id: 'ph_2',
    title: 'Phase 2: Garage Workshop & Strength Peak',
    startDate: '2026-10-05',
    endDate: '2026-10-18',
    seasonId: 'sn_1',
    createdAt: '2026-09-21T00:00:00Z',
    allocations: [
      { id: 'al_3', label: 'Project: Complete Garage Workshop mount & lighting', periodText: 'Week 1', completed: false },
      { id: 'al_4', label: 'Learning: Automotive maintenance practical tests', periodText: 'Week 2', completed: false },
    ],
    notes: 'Prepare winter gear and schedule vehicle service.',
  },
];

export const SEED_ROUGH: RoughItem[] = [
  {
    id: 'rf_1',
    text: 'Check tire tread depth before upcoming rain season',
    category: 'Quick Note',
    createdAt: '2026-09-22T14:30:00Z',
  },
  {
    id: 'rf_2',
    text: 'Idea: Minimal offline audio recorder app with haptic waveform',
    category: 'Idea',
    createdAt: '2026-09-22T11:15:00Z',
  },
  {
    id: 'rf_3',
    text: 'Purchase 10W-30 synthetic oil + OEM filter + oil catch pan',
    category: 'To Buy',
    createdAt: '2026-09-21T18:40:00Z',
  },
  {
    id: 'rf_4',
    text: 'Look into titanium key organizer to stop pocket jingle',
    category: 'To Look Up',
    createdAt: '2026-09-20T09:20:00Z',
  },
];

export const SEED_REMINDERS: ReminderItem[] = [
  {
    id: 'rm_1',
    title: 'The Core Rule: Capture fast, decide once, execute calmly.',
    mediaType: 'text',
    notes: 'Never hold open loops in your head. Put it in Rough or create a Next Action, then return to what is right in front of you.',
    createdAt: '2026-09-10T09:00:00Z',
    order: 0,
  },
  {
    id: 'rm_2',
    title: 'Post-Workout Joint Mobility Check',
    mediaType: 'text',
    notes: 'Remember: 90/90 hip switches, ankle dorsiflexion against wall, dead hangs 3x45s.',
    createdAt: '2026-09-12T10:00:00Z',
    order: 1,
  },
  {
    id: 'rm_3',
    title: 'Voice Memo: Idea on structuring daily deep blocks',
    mediaType: 'text',
    notes: 'Block the first 90 minutes right after coffee. Do not look at email or incoming messages until block 1 is complete.',
    createdAt: '2026-09-15T11:00:00Z',
    order: 2,
  },
];

// In-memory or indexedDB persistent store
class StorageEngine {
  private memoryCache: DatabaseDump | null = null;
  private currentPin: string = '1000';

  getActivePin(): string {
    try {
      return localStorage.getItem('focusdo_active_user_code') || '1000';
    } catch {
      return '1000';
    }
  }

  setActivePin(pin: string): void {
    const clean = pin.replace(/\D/g, '').slice(0, 4) || '1000';
    this.currentPin = clean;
    try {
      localStorage.setItem('focusdo_active_user_code', clean);
    } catch {}
  }

  getStorageKey(pin = this.currentPin): string {
    const clean = pin.replace(/\D/g, '').slice(0, 4) || '1000';
    return `focusdo_pin_workspace_${clean}`;
  }

  hasLocalDataForPin(pin: string): boolean {
    try {
      return !!localStorage.getItem(this.getStorageKey(pin));
    } catch {
      return false;
    }
  }

  async init(pin?: string): Promise<DatabaseDump> {
    if (pin) {
      this.currentPin = pin.replace(/\D/g, '').slice(0, 4) || '1000';
    } else {
      this.currentPin = this.getActivePin();
    }

    const pinKey = this.getStorageKey(this.currentPin);

    try {
      // 1. Try PIN-specific key
      let raw = localStorage.getItem(pinKey);

      // 2. If no PIN-specific key, check legacy global key for migration
      if (!raw) {
        raw = localStorage.getItem(STORAGE_BACKUP_KEY);
      }

      if (raw) {
        const parsed = JSON.parse(raw) as DatabaseDump;
        parsed.ownerPin = this.currentPin;

        if (parsed.projects) {
          parsed.projects = parsed.projects.map(p => ({
            ...p,
            priorityLevel: p.priorityLevel || (p.isPriority ? 'top' : 'regular'),
            isPriority: p.priorityLevel ? p.priorityLevel === 'top' : !!p.isPriority,
          }));
        }

        if (parsed.habits) {
          parsed.habits = parsed.habits.map(h => ({
            ...h,
            missedDates: h.missedDates || [],
          }));
        }

        this.memoryCache = parsed;
        this.save(parsed, this.currentPin);
        return parsed;
      }
    } catch {
      // LocalStorage failed, fallback to seeds
    }

    const initialDump: DatabaseDump = {
      version: 1,
      exportedAt: new Date().toISOString(),
      ownerPin: this.currentPin,
      routines: SEED_ROUTINES,
      habits: SEED_HABITS,
      projects: SEED_PROJECTS,
      learning: SEED_LEARNING,
      phases: SEED_PHASES,
      seasons: SEED_SEASONS,
      rough: SEED_ROUGH,
      reminders: SEED_REMINDERS,
      settings: DEFAULT_SETTINGS,
    };

    this.save(initialDump, this.currentPin);
    return initialDump;
  }

  save(data: DatabaseDump, pin?: string): void {
    const targetPin = pin ? pin.replace(/\D/g, '').slice(0, 4) : this.currentPin;
    this.memoryCache = data;
    try {
      const pinKey = this.getStorageKey(targetPin);
      localStorage.setItem(pinKey, JSON.stringify(data));
      // Also maintain legacy backup for backward compatibility
      localStorage.setItem(STORAGE_BACKUP_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('Failed to write to localStorage', e);
    }
  }

  reset(pin?: string): DatabaseDump {
    const targetPin = pin ? pin.replace(/\D/g, '').slice(0, 4) : this.currentPin;
    const fresh: DatabaseDump = {
      version: 1,
      exportedAt: new Date().toISOString(),
      ownerPin: targetPin,
      routines: SEED_ROUTINES,
      habits: SEED_HABITS,
      projects: SEED_PROJECTS,
      learning: SEED_LEARNING,
      phases: SEED_PHASES,
      seasons: SEED_SEASONS,
      rough: SEED_ROUGH,
      reminders: SEED_REMINDERS,
      settings: DEFAULT_SETTINGS,
    };
    this.save(fresh, targetPin);
    return fresh;
  }

  clearAll(pin?: string): DatabaseDump {
    const targetPin = pin ? pin.replace(/\D/g, '').slice(0, 4) : this.currentPin;
    const empty: DatabaseDump = {
      version: 1,
      exportedAt: new Date().toISOString(),
      ownerPin: targetPin,
      routines: [],
      habits: [],
      projects: [],
      learning: [],
      phases: [],
      seasons: [],
      rough: [],
      reminders: [],
      settings: DEFAULT_SETTINGS,
    };
    this.save(empty, targetPin);
    return empty;
  }
}

export const storage = new StorageEngine();
