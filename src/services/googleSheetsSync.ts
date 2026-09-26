import {
  ActivityLogEntry,
  HabitItem,
  LearningItem,
  PhaseItem,
  ProjectItem,
  RoughItem,
  RoutineItem,
} from '../types';
import { buildLifetimeMasterLedger } from '../utils/excelExport';

const STORED_SHEET_ID_KEY = 'focusdo_google_sheet_id';
const STORED_SHEET_URL_KEY = 'focusdo_google_sheet_url';
const STORED_LAST_SYNC_KEY = 'focusdo_google_sheet_last_sync';

export interface GoogleSheetsSyncResult {
  spreadsheetId: string;
  spreadsheetUrl: string;
  isNew: boolean;
  totalEntriesSynced: number;
  syncedAt: string;
}

export function getSavedGoogleSheetInfo(): {
  sheetId: string | null;
  sheetUrl: string | null;
  lastSyncedAt: string | null;
} {
  return {
    sheetId: localStorage.getItem(STORED_SHEET_ID_KEY),
    sheetUrl: localStorage.getItem(STORED_SHEET_URL_KEY),
    lastSyncedAt: localStorage.getItem(STORED_LAST_SYNC_KEY),
  };
}

// Convert Hex string to Google Sheets API Color object (0.0 to 1.0)
function hexToColor(hex: string) {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16) / 255;
  const g = parseInt(clean.substring(2, 4), 16) / 255;
  const b = parseInt(clean.substring(4, 6), 16) / 255;
  return { red: r, green: g, blue: b };
}

interface SheetDef {
  title: string;
  headerBg: string;
  headerText: string;
  colWidths: number[];
  rows: (string | number)[][];
  freezeRows?: number;
}

export async function syncToGoogleSheets(
  accessToken: string,
  data: {
    activityLog: ActivityLogEntry[];
    projects: ProjectItem[];
    routines: RoutineItem[];
    habits: HabitItem[];
    rough: RoughItem[];
    phases: PhaseItem[];
    learning: LearningItem[];
  }
): Promise<GoogleSheetsSyncResult> {
  const masterLedger = buildLifetimeMasterLedger(
    data.activityLog,
    data.projects,
    data.routines,
    data.habits,
    data.rough,
    data.phases
  );

  // 1. Prepare Executive Dashboard Rows
  const dashboardRows: (string | number)[][] = [
    ['FOCUSDO EXECUTIVE DASHBOARD • LIFETIME MASTER LEDGER', '', '', '', '', ''],
    ['Personal productivity intelligence, habit streaks, routines, and lifelong archive', '', '', '', '', ''],
    ['', '', '', '', '', ''],
    ['📊 LIFETIME ARCHIVE METRICS', '', '🎯 COMPLETION STATS', '', '⚡ ROUTINE & HABIT VELOCITY', ''],
    [
      'Total Lifetime Entries',
      '=COUNTA(\'Master Activity Log\'!A2:A)',
      'Tasks Completed',
      '=COUNTIF(\'Master Activity Log\'!G2:G, "*COMPLETED*")',
      'Routine Checkpoints Logged',
      '=COUNTIF(\'Master Activity Log\'!D2:D, "*ROUTINE*")',
    ],
    [
      'Active Projects Tracked',
      data.projects.length,
      'Habit Days Logged',
      '=COUNTIF(\'Master Activity Log\'!D2:D, "*HABIT*")',
      'Quick Notes Preserved',
      data.rough.length,
    ],
    ['', '', '', '', '', ''],
    ['📁 WORKSHEETS DIRECTORY', '', '', '', '', ''],
    ['Worksheet Name', 'Purpose & Contents', 'Key Metrics Captured', 'Live Count', 'Status', 'Sync Mode'],
    [
      'Master Activity Log',
      'Complete chronological ledger of every action and milestone',
      'Timestamps, categories, completion audits',
      '=COUNTA(\'Master Activity Log\'!A2:A)',
      '✅ LIVE',
      'Permanent Ledger',
    ],
    [
      'Projects & Tasks',
      'Project hierarchy, priorities, subtask checklist & deadlines',
      'Deadlines, priority levels, subtask states',
      '=COUNTA(\'Projects & Tasks\'!A2:A)-1',
      '✅ LIVE',
      'Current & Archived',
    ],
    [
      'Routines History',
      'Cadence checkpoints, completion histories, frequencies',
      'Frequencies, completion logs, streaks',
      '=COUNTA(\'Routines History\'!A2:A)-1',
      '✅ LIVE',
      'Cadence Tracking',
    ],
    [
      'Habits & Streaks',
      '14-day trials, habit formations, active and historical streaks',
      'Completion checkmarks, consistency, trial progress',
      '=COUNTA(\'Habits & Streaks\'!A2:A)-1',
      '✅ LIVE',
      'Habit Formation',
    ],
    [
      'Quick Notes Archive',
      'Repository of fleeting thoughts, categories, and captured ideas',
      'Categories, raw text, time captured',
      '=COUNTA(\'Quick Notes Archive\'!A2:A)-1',
      '✅ LIVE',
      'Thought Archive',
    ],
    [
      'Focus & 2-Week Phases',
      'Strategic time blocks, sprint targets, and season goals',
      'Target hours, themes, learning objectives',
      '=COUNTA(\'Focus & 2-Week Phases\'!A2:A)-1',
      '✅ LIVE',
      'Sprint Review',
    ],
    ['', '', '', '', '', ''],
    [
      '💡 Everything in this workbook is permanently preserved in Google Drive, even when tasks or routines rotate out of your active daily view in the FocusDo app.',
      '',
      '',
      '',
      '',
      '',
    ],
  ];

  // 2. Prepare Master Activity Log
  const masterRows: (string | number)[][] = [
    [
      '#',
      'Date',
      'Time',
      'Item Type',
      'Title / Action Description',
      'Project / Category Context',
      'Status',
      'Details & Notes',
      'System Ref',
    ],
    ...masterLedger.map((item, idx) => {
      let typeLabel = (item.type as string).toUpperCase();
      if (item.type === 'routine') typeLabel = '🔄 ROUTINE';
      else if (item.type === 'habit') typeLabel = '⭐ HABIT';
      else if (item.type === 'parent_task') typeLabel = '📌 PARENT TASK';
      else if (item.type === 'subtask') typeLabel = '⚡ SUBTASK';
      else if (item.type === 'quick_note') typeLabel = '💡 QUICK NOTE';
      else if (item.type === 'phase') typeLabel = '🎯 2-WEEK PHASE';

      let statusLabel = item.status.toUpperCase();
      if (statusLabel === 'COMPLETED' || statusLabel === 'DONE') statusLabel = '✅ COMPLETED';
      else if (statusLabel === 'PENDING' || statusLabel === 'ACTIVE') statusLabel = '⏳ PENDING';
      else if (statusLabel === 'SKIPPED') statusLabel = '⏭️ SKIPPED';

      return [
        `#${String(idx + 1).padStart(3, '0')}`,
        item.date,
        item.time,
        typeLabel,
        item.title,
        item.parentName || '—',
        statusLabel,
        item.details || '—',
        item.id,
      ];
    }),
  ];

  // 3. Prepare Projects & Tasks
  const projectRows: (string | number)[][] = [
    ['Project Name', 'Priority Level', 'Target Deadline', 'Subtask Title', 'Status', 'Subtask Date', 'Completed At'],
  ];
  data.projects.forEach(p => {
    const priorityLabel =
      p.priorityLevel === 'top'
        ? '🔥 Top Priority'
        : p.priorityLevel === 'intermediate'
        ? '⚡ Medium'
        : p.priorityLevel === 'regular'
        ? '🌱 Regular'
        : p.isPriority
        ? '🔥 Top Priority'
        : '⚡ Normal';

    if (!p.subtasks || p.subtasks.length === 0) {
      projectRows.push([
        p.name,
        priorityLabel,
        p.deadline || '—',
        '— (No subtasks logged)',
        p.status ? `✅ ${p.status.toUpperCase()}` : '⏳ ACTIVE',
        '—',
        '—',
      ]);
    } else {
      p.subtasks.forEach(st => {
        projectRows.push([
          p.name,
          priorityLabel,
          p.deadline || '—',
          st.text,
          st.completed ? '✅ COMPLETED' : '⏳ PENDING',
          st.date || '—',
          st.completedAt || '—',
        ]);
      });
    }
  });

  // 4. Prepare Routines History
  const routineRows: (string | number)[][] = [
    ['Routine Name', 'Schedule Cadence', 'Target Frequency', 'Total Times Completed', 'Recent Checkpoint Dates'],
    ...data.routines.map(r => {
      let cadence = r.scheduleType.replace(/_/g, ' ').toUpperCase();
      if (cadence === 'DAILY') cadence = '📅 DAILY';
      else if (cadence.includes('WEEK')) cadence = '📆 WEEKLY';
      else if (cadence.includes('MONTH')) cadence = '🗓️ MONTHLY';

      const targetFreq =
        r.timesPerWeekTarget
          ? `${r.timesPerWeekTarget}x / week`
          : r.timesPerMonthTarget
          ? `${r.timesPerMonthTarget}x / month`
          : r.everyXWeeksInterval
          ? `Every ${r.everyXWeeksInterval} wks`
          : '1x per period';

      return [
        r.title,
        cadence,
        targetFreq,
        `${r.completedDates?.length || 0} times`,
        r.completedDates?.slice(-10).join(', ') || 'No checkpoints yet',
      ];
    }),
  ];

  // 5. Prepare Habits & Streaks
  const habitRows: (string | number)[][] = [
    [
      'Habit Name',
      'Target Cadence',
      'Current Streak',
      'Best Streak',
      'Total Days Done',
      '14-Day Progress',
      'Latest Activity Log',
    ],
    ...data.habits.map(h => [
      h.title,
      '📅 DAILY',
      `${h.completedDates?.length || 0} days 🔥`,
      `14-day trial (${h.status})`,
      `${h.completedDates?.length || 0} days`,
      `${h.completedDates?.length || 0} / ${h.trialDurationDays || 14} days`,
      h.completedDates?.slice(-8).join(', ') || 'None',
    ]),
  ];

  // 6. Prepare Quick Notes Archive
  const noteRows: (string | number)[][] = [
    ['Date Logged', 'Time', 'Category / Tag', 'Thought / Note Content', 'Source Tray'],
    ...data.rough.map(r => [
      r.createdAt ? r.createdAt.split('T')[0] : '—',
      r.createdAt ? r.createdAt.split('T')[1]?.substring(0, 5) || '—' : '—',
      r.category ? `🏷️ ${r.category}` : '🏷️ General',
      r.text,
      'FocusDo Rough Tray',
    ]),
  ];

  // 7. Prepare Focus & 2-Week Phases
  const phaseRows: (string | number)[][] = [
    ['Category', 'Title / Theme', 'Allocation / Status', 'Strategic Notes & Key Outcomes'],
    ...data.phases.map(ph => [
      '🎯 2-Week Phase',
      ph.title,
      `${ph.allocations?.length || 0} targets allocated`,
      ph.notes || '—',
    ]),
    ...data.learning.map(l => [
      '📚 Learning & Growth',
      l.topic,
      l.status ? `✅ ${l.status}` : 'Active',
      l.whatToLearn || l.notes || '—',
    ]),
  ];

  // Sheet Definitions List
  const sheetDefs: SheetDef[] = [
    {
      title: 'Executive Dashboard',
      headerBg: '#0f172a', // Midnight Slate
      headerText: '#ffffff',
      colWidths: [220, 200, 200, 200, 160, 160],
      rows: dashboardRows,
      freezeRows: 2,
    },
    {
      title: 'Master Activity Log',
      headerBg: '#0f3d24', // Deep Forest Emerald
      headerText: '#ffffff',
      colWidths: [65, 110, 85, 160, 320, 220, 140, 280, 130],
      rows: masterRows,
      freezeRows: 1,
    },
    {
      title: 'Projects & Tasks',
      headerBg: '#1e3a8a', // Executive Royal Navy
      headerText: '#ffffff',
      colWidths: [220, 140, 120, 320, 130, 110, 140],
      rows: projectRows,
      freezeRows: 1,
    },
    {
      title: 'Routines History',
      headerBg: '#4c1d95', // Deep Imperial Violet
      headerText: '#ffffff',
      colWidths: [240, 140, 140, 150, 360],
      rows: routineRows,
      freezeRows: 1,
    },
    {
      title: 'Habits & Streaks',
      headerBg: '#7c2d12', // Warm Terracotta Bronze
      headerText: '#ffffff',
      colWidths: [240, 130, 140, 130, 130, 140, 340],
      rows: habitRows,
      freezeRows: 1,
    },
    {
      title: 'Quick Notes Archive',
      headerBg: '#713f12', // Golden Olive
      headerText: '#ffffff',
      colWidths: [110, 85, 140, 460, 150],
      rows: noteRows,
      freezeRows: 1,
    },
    {
      title: 'Focus & 2-Week Phases',
      headerBg: '#134e4a', // Deep Cyan Teal
      headerText: '#ffffff',
      colWidths: [180, 260, 170, 380],
      rows: phaseRows,
      freezeRows: 1,
    },
  ];

  let spreadsheetId = localStorage.getItem(STORED_SHEET_ID_KEY);
  let spreadsheetUrl = localStorage.getItem(STORED_SHEET_URL_KEY);
  let isNew = false;
  let existingSheets: { sheetId: number; title: string }[] = [];

  // Check existing spreadsheet
  if (spreadsheetId) {
    try {
      const testRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=spreadsheetId,spreadsheetUrl,sheets.properties`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
      if (testRes.ok) {
        const info = await testRes.json();
        existingSheets = (info.sheets || []).map((s: any) => ({
          sheetId: s.properties.sheetId,
          title: s.properties.title,
        }));
      } else {
        spreadsheetId = null;
      }
    } catch {
      spreadsheetId = null;
    }
  }

  // If no valid spreadsheet exists, create one with all defined sheets
  if (!spreadsheetId) {
    const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        properties: {
          title: 'FocusDo Lifetime Archive & Master Ledger',
        },
        sheets: sheetDefs.map((def, idx) => ({
          properties: {
            sheetId: 1000 + idx,
            title: def.title,
            index: idx,
          },
        })),
      }),
    });

    if (!createRes.ok) {
      const errJson = await createRes.json().catch(() => ({}));
      throw new Error(errJson.error?.message || `Failed to create Google Spreadsheet (${createRes.status})`);
    }

    const createdData = await createRes.json();
    spreadsheetId = createdData.spreadsheetId;
    spreadsheetUrl = createdData.spreadsheetUrl;
    isNew = true;

    if (spreadsheetId) {
      localStorage.setItem(STORED_SHEET_ID_KEY, spreadsheetId);
    }
    if (spreadsheetUrl) {
      localStorage.setItem(STORED_SHEET_URL_KEY, spreadsheetUrl!);
    }

    existingSheets = (createdData.sheets || []).map((s: any) => ({
      sheetId: s.properties.sheetId,
      title: s.properties.title,
    }));
  } else {
    // Add any missing sheets to the existing spreadsheet
    const missingSheets = sheetDefs.filter(
      def => !existingSheets.some(es => es.title.toLowerCase() === def.title.toLowerCase())
    );

    if (missingSheets.length > 0) {
      const addSheetRequests = missingSheets.map((def, idx) => ({
        addSheet: {
          properties: {
            title: def.title,
            index: idx,
          },
        },
      }));

      const addRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ requests: addSheetRequests }),
      });

      if (addRes.ok) {
        const addData = await addRes.json();
        const newSheets = (addData.replies || [])
          .map((r: any) => r.addSheet?.properties)
          .filter(Boolean)
          .map((p: any) => ({ sheetId: p.sheetId, title: p.title }));
        existingSheets = [...existingSheets, ...newSheets];
      }
    }
  }

  // Map sheet title to sheetId
  const sheetIdMap = new Map<string, number>();
  existingSheets.forEach(s => sheetIdMap.set(s.title.toLowerCase(), s.sheetId));

  // 1. Batch populate values across all worksheets
  const valueData = sheetDefs.map(def => ({
    range: `'${def.title}'!A1`,
    values: def.rows,
  }));

  const batchValueRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data: valueData,
      }),
    }
  );

  if (!batchValueRes.ok) {
    const errJson = await batchValueRes.json().catch(() => ({}));
    throw new Error(errJson.error?.message || `Failed to update spreadsheet data (${batchValueRes.status})`);
  }

  // 2. Build rich styling batch requests (Executive Theme, custom column widths, frozen headers, conditional formatting)
  const formattingRequests: any[] = [];

  sheetDefs.forEach(def => {
    const sId = sheetIdMap.get(def.title.toLowerCase());
    if (sId === undefined) return;

    // Freeze header row(s) & show gridlines
    formattingRequests.push({
      updateSheetProperties: {
        properties: {
          sheetId: sId,
          gridProperties: {
            frozenRowCount: def.freezeRows || 1,
            showGridLines: true,
          },
        },
        fields: 'gridProperties.frozenRowCount,gridProperties.showGridLines',
      },
    });

    // Set Header Row Height (38px)
    formattingRequests.push({
      updateDimensionProperties: {
        range: {
          sheetId: sId,
          dimension: 'ROWS',
          startIndex: 0,
          endIndex: def.freezeRows || 1,
        },
        properties: {
          pixelSize: def.title === 'Executive Dashboard' ? 44 : 38,
        },
        fields: 'pixelSize',
      },
    });

    // Header styling (Executive background color, white bold text, middle aligned)
    formattingRequests.push({
      repeatCell: {
        range: {
          sheetId: sId,
          startRowIndex: 0,
          endRowIndex: 1,
          startColumnIndex: 0,
          endColumnIndex: def.colWidths.length,
        },
        cell: {
          userEnteredFormat: {
            backgroundColor: hexToColor(def.headerBg),
            textFormat: {
              foregroundColor: hexToColor(def.headerText),
              bold: true,
              fontSize: def.title === 'Executive Dashboard' ? 12 : 10,
              fontFamily: 'Google Sans, Roboto, Arial',
            },
            verticalAlignment: 'MIDDLE',
            horizontalAlignment: 'CENTER',
          },
        },
        fields: 'userEnteredFormat(backgroundColor,textFormat,verticalAlignment,horizontalAlignment)',
      },
    });

    // Data rows typography & middle vertical alignment
    if (def.rows.length > 1) {
      formattingRequests.push({
        repeatCell: {
          range: {
            sheetId: sId,
            startRowIndex: 1,
            endRowIndex: def.rows.length,
            startColumnIndex: 0,
            endColumnIndex: def.colWidths.length,
          },
          cell: {
            userEnteredFormat: {
              verticalAlignment: 'MIDDLE',
              textFormat: {
                fontSize: 10,
                fontFamily: 'Google Sans, Roboto, Arial',
              },
            },
          },
          fields: 'userEnteredFormat(verticalAlignment,textFormat)',
        },
      });

      // Alternating row subtle shading for readability
      for (let r = 1; r < def.rows.length; r++) {
        if (r % 2 === 1) {
          formattingRequests.push({
            repeatCell: {
              range: {
                sheetId: sId,
                startRowIndex: r,
                endRowIndex: r + 1,
                startColumnIndex: 0,
                endColumnIndex: def.colWidths.length,
              },
              cell: {
                userEnteredFormat: {
                  backgroundColor: hexToColor('#f8fafc'), // Soft modern slate-50
                },
              },
              fields: 'userEnteredFormat(backgroundColor)',
            },
          });
        }
      }
    }

    // Column widths
    def.colWidths.forEach((width, cIdx) => {
      formattingRequests.push({
        updateDimensionProperties: {
          range: {
            sheetId: sId,
            dimension: 'COLUMNS',
            startIndex: cIdx,
            endIndex: cIdx + 1,
          },
          properties: {
            pixelSize: width,
          },
          fields: 'pixelSize',
        },
      });
    });

    // Special Styling for Dashboard Tab
    if (def.title === 'Executive Dashboard') {
      // Merge title row A1:F1
      formattingRequests.push({
        mergeCells: {
          range: {
            sheetId: sId,
            startRowIndex: 0,
            endRowIndex: 1,
            startColumnIndex: 0,
            endColumnIndex: 6,
          },
          mergeType: 'MERGE_ALL',
        },
      });

      // Merge subtitle row A2:F2
      formattingRequests.push({
        mergeCells: {
          range: {
            sheetId: sId,
            startRowIndex: 1,
            endRowIndex: 2,
            startColumnIndex: 0,
            endColumnIndex: 6,
          },
          mergeType: 'MERGE_ALL',
        },
      });

      // Format subtitle row (dark slate background, muted white text)
      formattingRequests.push({
        repeatCell: {
          range: {
            sheetId: sId,
            startRowIndex: 1,
            endRowIndex: 2,
            startColumnIndex: 0,
            endColumnIndex: 6,
          },
          cell: {
            userEnteredFormat: {
              backgroundColor: hexToColor('#1e293b'),
              textFormat: {
                foregroundColor: hexToColor('#94a3b8'),
                italic: true,
                fontSize: 10,
              },
              verticalAlignment: 'MIDDLE',
              horizontalAlignment: 'CENTER',
            },
          },
          fields: 'userEnteredFormat(backgroundColor,textFormat,verticalAlignment,horizontalAlignment)',
        },
      });

      // Section header rows (Row 4: LIFETIME METRICS, Row 8: WORKSHEETS DIRECTORY)
      [3, 7].forEach(rowIdx => {
        formattingRequests.push({
          repeatCell: {
            range: {
              sheetId: sId,
              startRowIndex: rowIdx,
              endRowIndex: rowIdx + 1,
              startColumnIndex: 0,
              endColumnIndex: 6,
            },
            cell: {
              userEnteredFormat: {
                backgroundColor: hexToColor('#e2e8f0'),
                textFormat: {
                  bold: true,
                  foregroundColor: hexToColor('#0f172a'),
                  fontSize: 10,
                },
                verticalAlignment: 'MIDDLE',
              },
            },
            fields: 'userEnteredFormat(backgroundColor,textFormat,verticalAlignment)',
          },
        });
      });

      // KPI Metric Cards row styling (Bold values)
      formattingRequests.push({
        repeatCell: {
          range: {
            sheetId: sId,
            startRowIndex: 4,
            endRowIndex: 6,
            startColumnIndex: 0,
            endColumnIndex: 6,
          },
          cell: {
            userEnteredFormat: {
              textFormat: {
                bold: true,
                fontSize: 11,
              },
            },
          },
          fields: 'userEnteredFormat(textFormat)',
        },
      });
    }

    // Conditional Formatting for Status Columns
    // Add soft green badge for COMPLETED and soft amber badge for PENDING
    formattingRequests.push({
      addConditionalFormatRule: {
        rule: {
          ranges: [
            {
              sheetId: sId,
              startRowIndex: 1,
              endRowIndex: def.rows.length + 50,
              startColumnIndex: 0,
              endColumnIndex: def.colWidths.length,
            },
          ],
          booleanRule: {
            condition: {
              type: 'TEXT_CONTAINS',
              values: [{ userEnteredValue: 'COMPLETED' }],
            },
            format: {
              backgroundColor: hexToColor('#dcfce7'), // Soft mint green
              textFormat: {
                foregroundColor: hexToColor('#166534'), // Dark green
                bold: true,
              },
            },
          },
        },
        index: 0,
      },
    });

    formattingRequests.push({
      addConditionalFormatRule: {
        rule: {
          ranges: [
            {
              sheetId: sId,
              startRowIndex: 1,
              endRowIndex: def.rows.length + 50,
              startColumnIndex: 0,
              endColumnIndex: def.colWidths.length,
            },
          ],
          booleanRule: {
            condition: {
              type: 'TEXT_CONTAINS',
              values: [{ userEnteredValue: 'PENDING' }],
            },
            format: {
              backgroundColor: hexToColor('#fef9c3'), // Soft yellow
              textFormat: {
                foregroundColor: hexToColor('#854d0e'), // Dark amber
                bold: true,
              },
            },
          },
        },
        index: 1,
      },
    });
  });

  // Execute batch styling update
  if (formattingRequests.length > 0) {
    try {
      await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ requests: formattingRequests }),
      });
    } catch (fmtErr) {
      console.warn('Formatting update non-fatal warning:', fmtErr);
    }
  }

  const nowIso = new Date().toISOString();
  localStorage.setItem(STORED_LAST_SYNC_KEY, nowIso);

  return {
    spreadsheetId: spreadsheetId!,
    spreadsheetUrl: spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
    isNew,
    totalEntriesSynced: masterLedger.length,
    syncedAt: nowIso,
  };
}
