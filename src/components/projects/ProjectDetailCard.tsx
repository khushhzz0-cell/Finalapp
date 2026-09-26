import React, { useState } from 'react';
import { ProjectItem, ProjectPriorityLevel } from '../../types';
import { useApp } from '../../context/AppContext';
import {
  Check,
  Calendar,
  Clock,
  Plus,
  ArrowUpRight,
  AlertCircle,
  Hourglass,
  Trash2,
  Sparkles,
} from 'lucide-react';
import { triggerHaptic } from '../../utils/haptics';
import { TodayAccent } from '../common/TodayAccent';

interface ProjectDetailCardProps {
  project: ProjectItem;
  onOpenProject: (projectId: string) => void;
}

export const ProjectDetailCard: React.FC<ProjectDetailCardProps> = ({
  project,
  onOpenProject,
}) => {
  const {
    toggleSubtask,
    addSubtask,
    deleteSubtask,
    updateProject,
    setProjectPriorityLevel,
  } = useApp();

  const [newSubtaskText, setNewSubtaskText] = useState('');
  const [newSubtaskDate, setNewSubtaskDate] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  const priority = project.priorityLevel || (project.isPriority ? 'top' : 'regular');

  // Subtask statistics
  const totalSubtasks = project.subtasks.length;
  const completedSubtasks = project.subtasks.filter(st => st.completed).length;
  const progressPercent =
    totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;

  // Deadline formatting & relative calculation
  const getDeadlineInfo = (dateStr?: string) => {
    if (!dateStr) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let targetDate: Date;
    if (dateStr === 'today') {
      targetDate = new Date(today);
    } else {
      const [year, month, day] = dateStr.split('-').map(Number);
      targetDate = new Date(year, month - 1, day);
    }

    const diffDays = Math.round(
      (targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    const formattedDate = targetDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: targetDate.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
    });

    if (diffDays === 0) {
      return { text: 'Today', subtext: 'Due today', status: 'urgent' };
    } else if (diffDays < 0) {
      return {
        text: formattedDate,
        subtext: `${Math.abs(diffDays)}d overdue`,
        status: 'overdue',
      };
    } else if (diffDays === 1) {
      return { text: formattedDate, subtext: 'Tomorrow', status: 'soon' };
    } else if (diffDays <= 7) {
      return { text: formattedDate, subtext: `in ${diffDays} days`, status: 'upcoming' };
    } else {
      return { text: formattedDate, subtext: `in ${diffDays} days`, status: 'normal' };
    }
  };

  const deadlineInfo = getDeadlineInfo(project.deadline);

  // Relevant for today check
  const todayStr = new Date().toISOString().split('T')[0];
  const hasUncompleted = project.subtasks.some(st => !st.completed);
  const hasTodaySubtask = project.subtasks.some(
    st => !st.completed && (st.date === 'today' || st.date === todayStr)
  );
  const isDeadlineToday = project.deadline === 'today' || project.deadline === todayStr;
  const needsAttentionToday = (isDeadlineToday || hasTodaySubtask) && hasUncompleted;

  // Sorted subtasks: uncompleted first, but maintain order, with Next highlighted
  const sortedSubtasks = [...project.subtasks].sort((a, b) => {
    if (a.completed === b.completed) {
      return (a.order ?? 0) - (b.order ?? 0);
    }
    return a.completed ? 1 : -1;
  });

  const handleToggle = (subtaskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic('light');
    toggleSubtask(project.id, subtaskId);
  };

  const handleInlineAddSubtask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtaskText.trim()) return;

    triggerHaptic('light');
    const newId = 'st_' + Date.now();
    const updatedSubtasks = [
      ...project.subtasks,
      {
        id: newId,
        text: newSubtaskText.trim(),
        completed: false,
        order: project.subtasks.length,
        date: newSubtaskDate || undefined,
        isNext: project.subtasks.length === 0,
      },
    ];

    updateProject(project.id, { subtasks: updatedSubtasks });
    setNewSubtaskText('');
    setNewSubtaskDate('');
  };

  const cyclePriority = (e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic('selection');
    const nextLevel: ProjectPriorityLevel =
      priority === 'regular'
        ? 'intermediate'
        : priority === 'intermediate'
        ? 'top'
        : 'regular';
    setProjectPriorityLevel(project.id, nextLevel);
  };

  return (
    <div
      className={`group relative bg-[#121215] hover:bg-[#151518] rounded-xl border transition-colors duration-150 overflow-hidden ${
        priority === 'top'
          ? 'border-rose-500/25 hover:border-rose-500/40'
          : priority === 'intermediate'
          ? 'border-amber-400/20 hover:border-amber-400/35'
          : 'border-white/[0.06] hover:border-white/[0.12]'
      }`}
    >
      {/* Universal indicator: needs attention today */}
      {needsAttentionToday && <TodayAccent />}

      {/* Card Header & Content */}
      <div className="p-3.5 sm:p-4 pb-2.5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-1">
            {/* Clean Unboxed Metadata (Zero Pills) */}
            <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 flex-wrap">
              {/* Priority Indicator (Clickable to cycle) */}
              <button
                type="button"
                onClick={cyclePriority}
                title="Click to cycle priority"
                className="inline-flex items-center gap-1.5 hover:text-zinc-200 transition cursor-pointer select-none"
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    priority === 'top'
                      ? 'bg-rose-500 ring-2 ring-rose-500/20'
                      : priority === 'intermediate'
                      ? 'bg-amber-400 ring-2 ring-amber-400/20'
                      : 'bg-zinc-500'
                  }`}
                />
                <span className={priority === 'top' ? 'text-rose-400 font-medium' : priority === 'intermediate' ? 'text-amber-400 font-medium' : 'text-zinc-400'}>
                  {priority === 'top' ? 'Top' : priority === 'intermediate' ? 'Intermediate' : 'Regular'}
                </span>
              </button>

              {/* Status if not active */}
              {project.status !== 'active' && (
                <>
                  <span className="text-zinc-600">·</span>
                  <span className="text-amber-400/90 font-medium">
                    {project.status === 'on_hold' ? 'Waiting' : 'Someday'}
                  </span>
                </>
              )}

              {/* Deadline */}
              {deadlineInfo && (
                <>
                  <span className="text-zinc-600">·</span>
                  <span className={`inline-flex items-center gap-1 ${
                    deadlineInfo.status === 'urgent' || deadlineInfo.status === 'overdue'
                      ? 'text-rose-400 font-medium'
                      : 'text-zinc-400'
                  }`}>
                    <Calendar className="w-3 h-3 text-zinc-500" />
                    <span>{deadlineInfo.text}</span>
                  </span>
                </>
              )}
            </div>

            {/* Project Title */}
            <div className="pt-0.5">
              <h3
                onClick={() => onOpenProject(project.id)}
                className="text-[15px] font-semibold text-zinc-100 tracking-tight cursor-pointer hover:text-[#5e5ce6] transition-colors"
              >
                {project.name}
              </h3>
            </div>

            {/* Description */}
            {project.description && (
              <p className="text-xs text-zinc-400 leading-relaxed line-clamp-2">
                {project.description}
              </p>
            )}
          </div>

          {/* Quick Open Project Button */}
          <button
            type="button"
            onClick={() => onOpenProject(project.id)}
            className="w-7 h-7 rounded-lg hover:bg-white/[0.08] active:scale-95 text-zinc-400 hover:text-white flex items-center justify-center transition border border-white/[0.06] cursor-pointer flex-shrink-0 mt-0.5"
            title="Open project details"
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Progress Line & Subtask Counter (Apple Health/Fitness clean line) */}
        <div className="mt-3 space-y-1">
          <div className="flex items-center justify-between text-[11px] text-zinc-500">
            <span>
              {completedSubtasks} of {totalSubtasks} tasks
            </span>
            <span className="font-mono text-[10px]">
              {progressPercent}%
            </span>
          </div>

          <div className="w-full h-1 bg-white/[0.06] rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                progressPercent === 100
                  ? 'bg-emerald-500'
                  : priority === 'top'
                  ? 'bg-rose-500'
                  : priority === 'intermediate'
                  ? 'bg-amber-400'
                  : 'bg-[#5e5ce6]'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Waiting Items Alert (if any active) */}
        {project.waitingItems &&
          project.waitingItems.filter(w => !w.completed).length > 0 && (
            <div className="mt-2.5 p-2 rounded-lg bg-amber-500/10 border border-amber-500/15 flex items-start gap-2 text-xs text-amber-300">
              <Hourglass className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-amber-400" />
              <div className="min-w-0 flex-1 space-y-0.5 text-[11px]">
                <span className="font-medium text-amber-200 block">Waiting on:</span>
                {project.waitingItems
                  .filter(w => !w.completed)
                  .map(w => (
                    <div key={w.id} className="text-amber-300/80 truncate">
                      • {w.title}
                      {w.waitingOn ? ` (${w.waitingOn})` : ''}
                      {w.followUpDate ? ` · ${w.followUpDate}` : ''}
                    </div>
                  ))}
              </div>
            </div>
          )}
      </div>

      {/* Subtasks Section with Checkboxes, Deadlines, and Inline Add */}
      <div className="border-t border-white/[0.06] bg-black/20 p-4 sm:p-5 pt-3.5 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-wider font-semibold text-[#8e8e93]">
            Subtasks & Deadlines
          </span>
          <span className="text-[11px] text-[#8e8e93] font-mono">
            {totalSubtasks} total
          </span>
        </div>

        {/* Subtasks List (Notion Checklist style) */}
        {sortedSubtasks.length === 0 ? (
          <p className="text-xs text-zinc-500 italic py-1">
            No subtasks yet.
          </p>
        ) : (
          <div className="space-y-0.5 pt-1">
            {sortedSubtasks.map(st => {
              const subtaskDeadline = getDeadlineInfo(st.date);
              return (
                <div
                  key={st.id}
                  className={`flex items-start gap-2 py-1 px-1.5 rounded-md transition group/item ${
                    st.completed
                      ? 'opacity-50'
                      : 'hover:bg-white/[0.03]'
                  }`}
                >
                  {/* Subtask Checkbox */}
                  <button
                    type="button"
                    onClick={e => handleToggle(st.id, e)}
                    className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center mt-0.5 flex-shrink-0 transition-colors cursor-pointer ${
                      st.completed
                        ? 'border-emerald-500 bg-emerald-500 text-white'
                        : 'border-zinc-600 hover:border-[#0a84ff]'
                    }`}
                  >
                    {st.completed && <Check className="w-2 h-2 stroke-[3]" />}
                  </button>

                  {/* Task Content */}
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {st.isNext && !st.completed && (
                        <span className="text-[9px] uppercase tracking-wider font-semibold text-[#0a84ff]">
                          NEXT ·
                        </span>
                      )}

                      <span
                        className={`text-xs leading-snug break-words ${
                          st.completed
                            ? 'line-through text-zinc-500'
                            : 'text-zinc-200'
                        }`}
                      >
                        {st.text}
                      </span>
                    </div>

                    {/* Subtask Deadline or Notes */}
                    {(subtaskDeadline || st.description) && (
                      <div className="flex items-center gap-2 text-[10px] text-zinc-500">
                        {subtaskDeadline && (
                          <span
                            className={
                              subtaskDeadline.status === 'urgent' ||
                              subtaskDeadline.status === 'overdue'
                                ? 'text-rose-400 font-medium'
                                : 'text-zinc-500'
                            }
                          >
                            Due {subtaskDeadline.text}
                          </span>
                        )}
                        {st.description && (
                          <span className="text-zinc-500 truncate">
                            {st.description}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Delete Subtask Icon */}
                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation();
                      triggerHaptic('light');
                      deleteSubtask(project.id, st.id);
                    }}
                    className="opacity-0 group-hover/item:opacity-100 text-zinc-500 hover:text-rose-400 p-0.5 transition cursor-pointer"
                    title="Delete subtask"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Inline Fast Add Subtask Form */}
        <form onSubmit={handleInlineAddSubtask} className="pt-2">
          <div className="flex items-center gap-2 bg-white/[0.03] border border-white/[0.06] rounded-lg p-1 focus-within:border-[#0a84ff]/50 transition">
            <input
              type="text"
              value={newSubtaskText}
              onChange={e => setNewSubtaskText(e.target.value)}
              placeholder="+ Add a task..."
              className="flex-1 bg-transparent px-2 py-0.5 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none"
            />

            <input
              type="date"
              value={newSubtaskDate}
              onChange={e => setNewSubtaskDate(e.target.value)}
              title="Task deadline (optional)"
              className="bg-transparent text-[11px] text-zinc-500 focus:outline-none px-1 border-l border-white/[0.06] cursor-pointer"
            />

            <button
              type="submit"
              disabled={!newSubtaskText.trim()}
              className="px-2 py-0.5 rounded-md bg-white/[0.08] hover:bg-white/[0.15] text-zinc-200 text-xs font-medium transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Add
            </button>
          </div>
        </form>
      </div>

      {/* Card Footer: Clean Notion Link */}
      <div className="px-3.5 sm:px-4 py-2 bg-black/20 border-t border-white/[0.04] flex items-center justify-between text-xs">
        <button
          type="button"
          onClick={() => onOpenProject(project.id)}
          className="text-zinc-400 hover:text-zinc-200 font-medium flex items-center gap-1 transition cursor-pointer select-none text-[11px]"
        >
          <span>Open project & notes</span>
          <ChevronRight className="w-3 h-3 text-zinc-500" />
        </button>

        <span className="text-[10px] text-zinc-600 font-mono">
          #{project.id.slice(-4)}
        </span>
      </div>
    </div>
  );
};

function ChevronRight(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}
