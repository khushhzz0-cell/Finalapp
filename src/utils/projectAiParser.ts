/**
 * Natural language parser for project tasks, next actions, and waiting items.
 * Example inputs:
 * - "For my PR project, send Jason the employer form tomorrow, then check with the union."
 * - "Send employer form to Jason tomorrow, then review with Sarah, then wait for signed permit from city"
 */

export interface ParsedProjectInstruction {
  projectName?: string;
  priorityLevel?: 'top' | 'intermediate' | 'regular';
  nextActions: {
    text: string;
    description?: string;
    date?: string;
  }[];
  todoTasks: {
    text: string;
    description?: string;
    date?: string;
  }[];
  waitingItems: {
    title: string;
    waitingOn?: string;
    followUpDate?: string;
  }[];
}

export function parseNaturalProjectInstruction(input: string): ParsedProjectInstruction {
  const result: ParsedProjectInstruction = {
    nextActions: [],
    todoTasks: [],
    waitingItems: [],
  };

  if (!input || !input.trim()) return result;

  // Detect priority level if specified
  if (/\b(?:top priority|high priority|highest priority|urgent|critical|asap)\b/i.test(input)) {
    result.priorityLevel = 'top';
  } else if (/\b(?:intermediate|medium priority|medium)\b/i.test(input)) {
    result.priorityLevel = 'intermediate';
  } else if (/\b(?:regular|low priority|normal)\b/i.test(input)) {
    result.priorityLevel = 'regular';
  }

  let text = input.trim();

  // 1. Detect target project if phrased like "For my [Project Name] project, ..." or "In [Project Name], ..."
  const projectPrefixMatch = text.match(/^(?:for\s+my\s+|in\s+my\s+|for\s+|in\s+)(.+?)(?:\s+project)?,\s*/i);
  if (projectPrefixMatch) {
    result.projectName = projectPrefixMatch[1].trim();
    text = text.substring(projectPrefixMatch[0].length).trim();
  }

  // 2. Split into sequential clauses by "then", "and then", ";", or "\n"
  const clauses = text
    .split(/\s*(?:,\s*then\s+|;\s*then\s+|\s+then\s+|;\s*|\n+)\s*/i)
    .map(c => c.trim())
    .filter(Boolean);

  const today = new Date();

  const parseDateFromClause = (clause: string): { cleanedText: string; date?: string } => {
    let cleaned = clause;
    let foundDate: string | undefined = undefined;

    // "tomorrow"
    if (/\btomorrow\b/i.test(cleaned)) {
      const d = new Date(today);
      d.setDate(d.getDate() + 1);
      foundDate = d.toISOString().split('T')[0];
      cleaned = cleaned.replace(/\s*(?:by|on|due)?\s*\btomorrow\b/i, '').trim();
    }
    // "today"
    else if (/\btoday\b/i.test(cleaned)) {
      foundDate = today.toISOString().split('T')[0];
      cleaned = cleaned.replace(/\s*(?:by|on|due)?\s*\btoday\b/i, '').trim();
    }
    // "next week" / "in X days"
    else {
      const inDaysMatch = cleaned.match(/\bin\s+(\d+)\s+days?\b/i);
      if (inDaysMatch) {
        const days = parseInt(inDaysMatch[1], 10);
        const d = new Date(today);
        d.setDate(d.getDate() + days);
        foundDate = d.toISOString().split('T')[0];
        cleaned = cleaned.replace(inDaysMatch[0], '').trim();
      } else {
        // Specific day of week (e.g. "by Friday", "on Monday")
        const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const dayMatch = cleaned.match(/\b(?:by|on|next)?\s*(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/i);
        if (dayMatch) {
          const targetDayIdx = daysOfWeek.indexOf(dayMatch[1].toLowerCase());
          if (targetDayIdx !== -1) {
            const currentDayIdx = today.getDay();
            let diff = targetDayIdx - currentDayIdx;
            if (diff <= 0) diff += 7;
            const d = new Date(today);
            d.setDate(d.getDate() + diff);
            foundDate = d.toISOString().split('T')[0];
            cleaned = cleaned.replace(dayMatch[0], '').trim();
          }
        }
      }
    }

    // Clean up trailing/leading prepositions or punctuation
    cleaned = cleaned.replace(/^and\s+/i, '').replace(/[.,;]+$/, '').trim();
    return { cleanedText: cleaned, date: foundDate };
  };

  let hasAssignedNextAction = false;

  for (const rawClause of clauses) {
    if (!rawClause) continue;

    // Check if this clause is a Waiting item (e.g. "wait for Jason to send...", "waiting on Sarah for report")
    const waitMatch = rawClause.match(/^(?:wait(?:ing)?\s+(?:for|on)\s+)(.+)$/i);
    if (waitMatch) {
      const waitBody = waitMatch[1].trim();
      const { cleanedText, date } = parseDateFromClause(waitBody);

      // Attempt to split who from what: e.g. "Jason to finish NSNP" or "Jason for NSNP"
      let waitingOn: string | undefined = undefined;
      let title = cleanedText;

      const forMatch = cleanedText.match(/^([a-zA-Z0-9\s]+?)\s+(?:to|for)\s+(.+)$/i);
      if (forMatch) {
        waitingOn = forMatch[1].trim();
        title = forMatch[2].trim();
      }

      result.waitingItems.push({
        title: title || cleanedText,
        waitingOn,
        followUpDate: date,
      });
      continue;
    }

    // Actionable task
    const { cleanedText, date } = parseDateFromClause(rawClause);
    if (!cleanedText) continue;

    // Split title and optional secondary note if separated by " - " or " ("
    let taskTitle = cleanedText;
    let taskDesc: string | undefined = undefined;

    if (cleanedText.includes(' - ')) {
      const parts = cleanedText.split(' - ');
      taskTitle = parts[0].trim();
      taskDesc = parts.slice(1).join(' - ').trim();
    }

    if (!hasAssignedNextAction) {
      // First actionable item becomes NEXT
      result.nextActions.push({
        text: taskTitle,
        description: taskDesc,
        date,
      });
      hasAssignedNextAction = true;
    } else {
      result.todoTasks.push({
        text: taskTitle,
        description: taskDesc,
        date,
      });
    }
  }

  return result;
}
