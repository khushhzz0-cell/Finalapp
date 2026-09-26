import React from 'react';
import { ProjectItem } from '../../types';
import { useApp } from '../../context/AppContext';
import { Check, Calendar, ChevronRight } from 'lucide-react';
import { TodayAccent } from '../common/TodayAccent';

interface ProjectListItemProps {
  project: ProjectItem;
  onOpenProject: (projectId: string) => void;
}

export const ProjectListItem: React.FC<ProjectListItemProps> = ({
  project,
  onOpenProject,
}) => {
  const { toggleSubtask } = useApp();

  // Find explicit designated next action, or first uncompleted task
  const designatedNext = project.subtasks.find(st => st.isNext && !st.completed);
  const nextAction = designatedNext || project.subtasks.find(st => !st.completed);

  const handleNextActionCheck = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (nextAction) {
      toggleSubtask(project.id, nextAction.id);
    }
  };

  // Format date cleanly (e.g., "Sep 25" or "Today")
  const formatDeadline = (dateStr?: string) => {
    if (!dateStr) return null;
    const today = new Date().toISOString().split('T')[0];
    if (dateStr === today || dateStr === 'today') return 'Today';

    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
    return dateStr;
  };

  const deadlineText = formatDeadline(project.deadline);
  const priority = project.priorityLevel || (project.isPriority ? 'top' : 'regular');

  // Relevant for today check
  const todayStr = new Date().toISOString().split('T')[0];
  const hasUncompleted = project.subtasks.some(st => !st.completed);
  const hasTodaySubtask = project.subtasks.some(
    st => !st.completed && (st.date === 'today' || st.date === todayStr)
  );
  const isDeadlineToday = project.deadline === 'today' || project.deadline === todayStr;
  const needsAttentionToday =
    (isDeadlineToday || hasTodaySubtask) && hasUncompleted;

  return (
    <div
      onClick={() => onOpenProject(project.id)}
      className={`group relative bg-[#121215] hover:bg-[#151518] rounded-xl p-3.5 sm:p-4 border transition-colors duration-150 cursor-pointer select-none overflow-hidden ${
        priority === 'top'
          ? 'border-rose-500/25 hover:border-rose-500/40'
          : priority === 'intermediate'
          ? 'border-amber-400/20 hover:border-amber-400/35'
          : 'border-white/[0.06] hover:border-white/[0.12]'
      }`}
    >
      {/* Universal indicator: needs attention today */}
      {needsAttentionToday && <TodayAccent />}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1.5">
          {/* Top Line: Project Name, Priority & Deadline */}
          <div className="flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <h3 className="text-[15px] font-semibold text-zinc-100 tracking-tight truncate">
                {project.name}
              </h3>

              {priority === 'top' && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-400 flex-shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                  Top
                </span>
              )}

              {priority === 'intermediate' && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-400 flex-shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  Intermediate
                </span>
              )}
            </div>

            {deadlineText && (
              <span className="flex items-center gap-1 text-[11px] text-zinc-500 whitespace-nowrap flex-shrink-0">
                <Calendar className="w-3 h-3 text-zinc-500" />
                <span>{deadlineText}</span>
              </span>
            )}
          </div>

          {/* Next Action Line (Notion Checklist item style) */}
          <div className="flex items-start gap-2 pt-0.5">
            <button
              type="button"
              onClick={handleNextActionCheck}
              disabled={!nextAction}
              className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center mt-0.5 flex-shrink-0 transition-colors ${
                nextAction
                  ? 'border-zinc-600 hover:border-[#0a84ff] cursor-pointer'
                  : 'border-transparent bg-emerald-500/20 text-emerald-400'
              }`}
              title={nextAction ? 'Mark next action complete' : 'All tasks completed'}
            >
              {!nextAction && <Check className="w-2 h-2 stroke-[3]" />}
            </button>

            <div className="min-w-0 flex-1">
              <p
                className={`text-xs sm:text-[13px] line-clamp-1 leading-snug ${
                  nextAction ? 'text-zinc-300' : 'text-zinc-500 italic'
                }`}
              >
                {nextAction ? (
                  <>
                    <span className="text-[10px] uppercase font-semibold text-[#0a84ff] mr-1.5">
                      NEXT
                    </span>
                    {nextAction.text}
                  </>
                ) : (
                  'All tasks completed'
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Subtle chevron */}
        <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-300 group-hover:translate-x-0.5 transition-all mt-0.5 flex-shrink-0" />
      </div>
    </div>
  );
};
