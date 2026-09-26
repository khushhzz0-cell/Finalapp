import * as XLSX from 'xlsx';
import {
  ActivityLogEntry,
  HabitItem,
  LearningItem,
  PhaseItem,
  ProjectItem,
  RoughItem,
  RoutineItem,
} from '../types';

/**
 * Builds a comprehensive lifetime historical ledger.
 * Combines explicit activity log entries with historical milestones
 * extracted from completed tasks, past routine dates, habit streaks,
 * and quick notes so no past achievement is omitted.
 */
export function buildLifetimeMasterLedger(
  activityLog: ActivityLogEntry[],
  projects: ProjectItem[],
  routines: RoutineItem[],
  habits: HabitItem[],
  rough: RoughItem[],
  phases: PhaseItem[]
): ActivityLogEntry[] {
  const ledgerMap = new Map<string, ActivityLogEntry>();

  // 1. Add existing logged actions
  activityLog.forEach(entry => {
    ledgerMap.set(entry.id, entry);
  });

  // 2. Synthesize completed subtasks from projects
  projects.forEach(proj => {
    proj.subtasks.forEach(st => {
      if (st.completed) {
        const id = `auto-task-${proj.id}-${st.id}`;
        if (!ledgerMap.has(id)) {
          const completedDate = st.completedAt ? st.completedAt.split('T')[0] : (st.date && st.date !== 'today' ? st.date : proj.createdAt.split('T')[0]);
          ledgerMap.set(id, {
            id,
            timestamp: st.completedAt || `${completedDate}T12:00:00.000Z`,
            date: completedDate,
            time: st.completedAt ? st.completedAt.split('T')[1]?.substring(0, 5) || '12:00' : '12:00',
            type: proj.isPriority ? 'parent_task' : 'subtask',
            title: st.text,
            parentName: proj.name,
            status: 'completed',
            details: st.description || (proj.deadline ? `Project Deadline: ${proj.deadline}` : undefined),
          });
        }
      }
    });

    if (proj.status === 'completed') {
      const id = `auto-proj-${proj.id}`;
      if (!ledgerMap.has(id)) {
        ledgerMap.set(id, {
          id,
          timestamp: proj.createdAt,
          date: proj.createdAt.split('T')[0],
          time: '12:00',
          type: 'project',
          title: proj.name,
          parentName: 'Major Projects',
          status: 'completed',
          details: proj.description,
        });
      }
    }
  });

  // 3. Synthesize routine completed dates
  routines.forEach(rt => {
    rt.completedDates.forEach(dateStr => {
      const id = `auto-rt-${rt.id}-${dateStr}`;
      if (!ledgerMap.has(id)) {
        ledgerMap.set(id, {
          id,
          timestamp: `${dateStr}T12:00:00.000Z`,
          date: dateStr,
          time: rt.timeOfDay === 'morning' ? '08:00' : rt.timeOfDay === 'evening' ? '20:00' : '12:00',
          type: 'routine',
          title: rt.title,
          parentName: rt.scheduleType.replace(/_/g, ' ').toUpperCase(),
          status: 'completed',
          details: rt.description || `Cadence: ${rt.scheduleType}`,
        });
      }
    });
  });

  // 4. Synthesize habit completed dates
  habits.forEach(hb => {
    hb.completedDates.forEach(dateStr => {
      const id = `auto-hb-${hb.id}-${dateStr}`;
      if (!ledgerMap.has(id)) {
        ledgerMap.set(id, {
          id,
          timestamp: `${dateStr}T12:00:00.000Z`,
          date: dateStr,
          time: '12:00',
          type: 'habit',
          title: hb.title,
          parentName: '14-Day Habit Trial',
          status: 'completed',
          details: `Day milestone logged (${hb.completedDates.length}/${hb.trialDurationDays || 14})`,
        });
      }
    });
  });

  // 5. Synthesize quick notes
  rough.forEach(note => {
    const id = `auto-note-${note.id}`;
    if (!ledgerMap.has(id)) {
      const date = note.createdAt ? note.createdAt.split('T')[0] : '2026-09-20';
      const time = note.createdAt && note.createdAt.includes('T') ? note.createdAt.split('T')[1].substring(0, 5) : '12:00';
      ledgerMap.set(id, {
        id,
        timestamp: note.createdAt || `${date}T12:00:00.000Z`,
        date,
        time,
        type: 'quick_note',
        title: note.text,
        parentName: note.category || 'Quick Note',
        status: 'created',
        details: 'Captured in rough notes inbox',
      });
    }
  });

  // Convert to array and sort chronologically descending (newest first)
  return Array.from(ledgerMap.values()).sort((a, b) => {
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });
}

/**
 * Creates and triggers a download of a beautifully formatted multi-sheet Excel (.xlsx) file.
 */
export function downloadExcelArchive({
  activityLog = [],
  projects = [],
  routines = [],
  habits = [],
  rough = [],
  phases = [],
  learning = [],
}: {
  activityLog: ActivityLogEntry[];
  projects: ProjectItem[];
  routines: RoutineItem[];
  habits: HabitItem[];
  rough: RoughItem[];
  phases: PhaseItem[];
  learning: LearningItem[];
}) {
  const masterLedger = buildLifetimeMasterLedger(
    activityLog,
    projects,
    routines,
    habits,
    rough,
    phases
  );

  const wb = XLSX.utils.book_new();

  // ==========================================
  // SHEET 1: Master Lifetime Activity History
  // ==========================================
  const ledgerRows = masterLedger.map((entry, index) => ({
    'Record #': masterLedger.length - index,
    'Date': entry.date,
    'Time': entry.time,
    'Item Type': entry.type.replace(/_/g, ' ').toUpperCase(),
    'Item Title / Task': entry.title,
    'Project / Context': entry.parentName || 'General',
    'Status': entry.status.toUpperCase(),
    'Details / Notes': entry.details || '',
    'Logged Timestamp': entry.timestamp,
  }));

  const wsLedger = XLSX.utils.json_to_sheet(ledgerRows);
  wsLedger['!cols'] = [
    { wch: 10 }, // Record #
    { wch: 13 }, // Date
    { wch: 8 },  // Time
    { wch: 14 }, // Item Type
    { wch: 45 }, // Item Title
    { wch: 26 }, // Project / Context
    { wch: 12 }, // Status
    { wch: 38 }, // Details
    { wch: 25 }, // Timestamp
  ];
  XLSX.utils.book_append_sheet(wb, wsLedger, 'Master Activity Log');

  // ==========================================
  // SHEET 2: Projects & Subtasks Breakdown
  // ==========================================
  const projectRows: Record<string, unknown>[] = [];
  projects.forEach(proj => {
    if (!proj.subtasks || proj.subtasks.length === 0) {
      projectRows.push({
        'Project Name': proj.name,
        'Priority': proj.isPriority || proj.priorityLevel === 'top' ? 'HIGH PRIORITY' : 'REGULAR',
        'Project Status': proj.status.toUpperCase(),
        'Project Deadline': proj.deadline || 'None',
        'Task / Subtask': '(No subtasks created)',
        'Task Status': 'N/A',
        'Due Date': '',
        'Completed At': '',
        'Project Notes': proj.description || proj.notes || '',
      });
    } else {
      proj.subtasks.forEach(st => {
        projectRows.push({
          'Project Name': proj.name,
          'Priority': proj.isPriority || proj.priorityLevel === 'top' ? 'HIGH PRIORITY' : 'REGULAR',
          'Project Status': proj.status.toUpperCase(),
          'Project Deadline': proj.deadline || 'None',
          'Task / Subtask': st.text,
          'Task Status': st.completed ? 'COMPLETED' : 'PENDING',
          'Due Date': st.date || 'No Date',
          'Completed At': st.completedAt ? st.completedAt.split('T')[0] : (st.completed ? 'Yes' : 'No'),
          'Project Notes': st.description || proj.description || '',
        });
      });
    }
  });

  const wsProjects = XLSX.utils.json_to_sheet(projectRows);
  wsProjects['!cols'] = [
    { wch: 28 }, // Project Name
    { wch: 15 }, // Priority
    { wch: 15 }, // Status
    { wch: 16 }, // Deadline
    { wch: 40 }, // Task
    { wch: 14 }, // Task Status
    { wch: 14 }, // Due Date
    { wch: 14 }, // Completed At
    { wch: 40 }, // Notes
  ];
  XLSX.utils.book_append_sheet(wb, wsProjects, 'Projects & Tasks');

  // ==========================================
  // SHEET 3: Routines & Cadence
  // ==========================================
  const routineRows = routines.map(rt => {
    let cadence = rt.scheduleType.replace(/_/g, ' ');
    if (rt.scheduleType === 'times_per_week') cadence = `${rt.timesPerWeekTarget || 3} times per week`;
    if (rt.scheduleType === 'every_x_weeks') cadence = `Every ${rt.everyXWeeksInterval || 2} weeks`;
    if (rt.scheduleType === 'times_per_month') cadence = `${rt.timesPerMonthTarget || 2} times per month`;

    return {
      'Routine Title': rt.title,
      'Cadence / Schedule': cadence.toUpperCase(),
      'Time of Day': (rt.timeOfDay || 'anytime').toUpperCase(),
      'Total Days Completed': rt.completedDates.length,
      'Active': rt.isActive ? 'YES' : 'NO',
      'Completed Dates Log': rt.completedDates.join(', '),
      'Description / Notes': rt.description || '',
      'Created Date': rt.createdAt ? rt.createdAt.split('T')[0] : '',
    };
  });

  const wsRoutines = XLSX.utils.json_to_sheet(routineRows);
  wsRoutines['!cols'] = [
    { wch: 32 }, // Routine Title
    { wch: 24 }, // Cadence
    { wch: 14 }, // Time of Day
    { wch: 20 }, // Total Days Completed
    { wch: 10 }, // Active
    { wch: 50 }, // Dates Log
    { wch: 40 }, // Description
    { wch: 14 }, // Created Date
  ];
  XLSX.utils.book_append_sheet(wb, wsRoutines, 'Routines History');

  // ==========================================
  // SHEET 4: Habits (14-Day Sprints & Streaks)
  // ==========================================
  const habitRows = habits.map(hb => {
    const completedCount = hb.completedDates.length;
    const totalDays = hb.trialDurationDays || 14;
    const rate = Math.round((completedCount / totalDays) * 100);

    return {
      'Habit Name': hb.title,
      'Status': hb.status.toUpperCase(),
      'Days Completed': completedCount,
      'Sprint Target (Days)': totalDays,
      'Completion Rate': `${rate}%`,
      'Start Date': hb.startDate,
      'Completed Dates Log': hb.completedDates.join(', '),
      'Description': hb.description || '',
    };
  });

  const wsHabits = XLSX.utils.json_to_sheet(habitRows);
  wsHabits['!cols'] = [
    { wch: 30 }, // Habit Name
    { wch: 14 }, // Status
    { wch: 16 }, // Days Completed
    { wch: 20 }, // Sprint Target
    { wch: 16 }, // Completion Rate
    { wch: 14 }, // Start Date
    { wch: 50 }, // Completed Dates Log
    { wch: 35 }, // Description
  ];
  XLSX.utils.book_append_sheet(wb, wsHabits, 'Habits & Streaks');

  // ==========================================
  // SHEET 5: Quick Notes Archive
  // ==========================================
  const noteRows = rough.map(item => {
    const date = item.createdAt ? item.createdAt.split('T')[0] : '';
    const time = item.createdAt && item.createdAt.includes('T') ? item.createdAt.split('T')[1].substring(0, 5) : '';

    return {
      'Date': date,
      'Time': time,
      'Category': item.category || 'Quick Note',
      'Content': item.text,
      'Full Timestamp': item.createdAt || '',
    };
  });

  const wsNotes = XLSX.utils.json_to_sheet(noteRows);
  wsNotes['!cols'] = [
    { wch: 14 }, // Date
    { wch: 10 }, // Time
    { wch: 18 }, // Category
    { wch: 60 }, // Content
    { wch: 25 }, // Timestamp
  ];
  XLSX.utils.book_append_sheet(wb, wsNotes, 'Quick Notes Archive');

  // ==========================================
  // SHEET 6: Focus & 2-Week Learning Phases
  // ==========================================
  const phaseRows: Record<string, unknown>[] = [];
  phases.forEach(ph => {
    if (!ph.allocations || ph.allocations.length === 0) {
      phaseRows.push({
        'Phase Title': ph.title,
        'Start Date': ph.startDate,
        'End Date': ph.endDate,
        'Period': 'General',
        'Allocation / Focus': ph.notes || 'No allocations',
        'Completed': 'NO',
      });
    } else {
      ph.allocations.forEach(al => {
        phaseRows.push({
          'Phase Title': ph.title,
          'Start Date': ph.startDate,
          'End Date': ph.endDate,
          'Period': al.periodText,
          'Allocation / Focus': al.label,
          'Completed': al.completed ? 'YES' : 'NO',
        });
      });
    }
  });

  const wsPhases = XLSX.utils.json_to_sheet(phaseRows);
  wsPhases['!cols'] = [
    { wch: 24 }, // Phase Title
    { wch: 14 }, // Start Date
    { wch: 14 }, // End Date
    { wch: 14 }, // Period
    { wch: 45 }, // Allocation
    { wch: 12 }, // Completed
  ];
  XLSX.utils.book_append_sheet(wb, wsPhases, 'Focus & Phases');

  // ==========================================
  // WRITE AND DOWNLOAD WORKBOOK
  // ==========================================
  const todayStr = new Date().toISOString().split('T')[0];
  const fileName = `FocusDo_Lifetime_Archive_${todayStr}.xlsx`;
  XLSX.writeFile(wb, fileName);
}
