import React, { useState } from 'react';
import { ProjectItem } from '../../types';
import { useApp } from '../../context/AppContext';
import {
  Check,
  Plus,
  Trash2,
  Edit2,
  ChevronDown,
  ChevronUp,
  Flag,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';

interface ProjectCardProps {
  project: ProjectItem;
  isPriorityView?: boolean;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({ project, isPriorityView = false }) => {
  const {
    updateProject,
    deleteProject,
    toggleSubtask,
    addSubtask,
    deleteSubtask,
    reorderSubtasks,
    toggleProjectPriority,
  } = useApp();

  const [isExpanded, setIsExpanded] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [newSubtaskText, setNewSubtaskText] = useState('');

  // Editing state
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description);
  const [deadline, setDeadline] = useState(project.deadline || '');
  const [notes, setNotes] = useState(project.notes || '');
  const [status, setStatus] = useState(project.status);

  const nextAction = project.subtasks.find(st => !st.completed);
  const completedSubtasksCount = project.subtasks.filter(st => st.completed).length;

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    updateProject(project.id, {
      name: name.trim(),
      description: description.trim(),
      deadline: deadline || undefined,
      notes: notes.trim() || undefined,
      status,
    });
    setIsEditing(false);
  };

  const handleAddSubtask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtaskText.trim()) return;
    addSubtask(project.id, newSubtaskText.trim());
    setNewSubtaskText('');
  };

  const moveSubtask = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= project.subtasks.length) return;

    const copy = [...project.subtasks];
    const [moved] = copy.splice(index, 1);
    copy.splice(targetIndex, 0, moved);
    reorderSubtasks(project.id, copy.map((st, i) => ({ ...st, order: i })));
  };

  const isPriority = project.isPriority;

  return (
    <div className="bg-[#1c1c1e] rounded-2xl border border-white/[0.06] overflow-hidden shadow-sm transition">
      {/* Header section */}
      <div className="p-4 sm:p-5 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {isPriority && (
                <span className="flex items-center gap-1 text-xs text-[#ff3b30] font-semibold">
                  <Flag className="w-3.5 h-3.5 fill-[#ff3b30]" />
                  <span>Priority</span>
                </span>
              )}

              <span className="text-xs text-[#8e8e93] capitalize font-medium">
                {project.status.replace('_', ' ')}
              </span>

              {project.deadline && (
                <>
                  <span className="text-xs text-[#636366]" aria-hidden="true">·</span>
                  <span className="text-xs text-[#8e8e93]">
                    Due {project.deadline}
                  </span>
                </>
              )}
            </div>

            <h3 className="text-base sm:text-lg font-semibold text-white tracking-tight">
              {project.name}
            </h3>

            {project.description && (
              <p className="text-xs text-[#8e8e93] leading-relaxed">
                {project.description}
              </p>
            )}
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => toggleProjectPriority(project.id)}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition cursor-pointer ${
                isPriority
                  ? 'text-[#ff3b30] bg-[#ff3b30]/10'
                  : 'text-[#8e8e93] hover:text-white hover:bg-white/[0.06]'
              }`}
              title={isPriority ? 'Remove from Priorities' : 'Mark as Priority'}
            >
              <Flag className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="w-8 h-8 rounded-full text-[#8e8e93] hover:text-white hover:bg-white/[0.06] flex items-center justify-center transition cursor-pointer"
              title="Edit"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => deleteProject(project.id)}
              className="w-8 h-8 rounded-full text-[#8e8e93] hover:text-[#ff3b30] hover:bg-white/[0.06] flex items-center justify-center transition cursor-pointer"
              title="Delete"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="w-8 h-8 rounded-full text-[#8e8e93] hover:text-white hover:bg-white/[0.06] flex items-center justify-center transition cursor-pointer"
            >
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Immediate Next Action Banner */}
        <div className="bg-[#2c2c2e]/60 rounded-xl p-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            {nextAction ? (
              <button
                onClick={() => toggleSubtask(project.id, nextAction.id)}
                className="w-5 h-5 rounded-full border border-[#8e8e93]/60 hover:border-[#007aff] flex items-center justify-center flex-shrink-0 transition cursor-pointer"
              />
            ) : (
              <div className="w-5 h-5 rounded-full bg-[#34c759] text-white flex items-center justify-center flex-shrink-0">
                <Check className="w-3 h-3 stroke-[3]" />
              </div>
            )}
            <div className="min-w-0">
              <span className="text-[11px] font-semibold uppercase text-[#007aff] tracking-wider block">
                Next Action
              </span>
              <p className="text-xs text-white font-normal truncate">
                {nextAction ? nextAction.text : 'All subtasks complete!'}
              </p>
            </div>
          </div>

          <span className="text-xs text-[#8e8e93] font-mono whitespace-nowrap">
            {completedSubtasksCount}/{project.subtasks.length}
          </span>
        </div>
      </div>

      {/* Expanded Checklist & Notes */}
      {isExpanded && (
        <div className="px-4 sm:px-5 pb-5 pt-1 border-t border-[#2c2c2e] space-y-3">
          {isEditing ? (
            <form onSubmit={handleSaveEdit} className="space-y-3 pt-2">
              <div className="bg-[#2c2c2e]/60 rounded-xl p-3 space-y-3">
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Project Name"
                  className="w-full bg-transparent text-white text-sm focus:outline-none"
                />
                <input
                  type="text"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Short description"
                  className="w-full bg-transparent text-white text-xs focus:outline-none border-t border-white/[0.06] pt-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <select
                  value={status}
                  onChange={e => setStatus(e.target.value as any)}
                  className="bg-[#2c2c2e]/60 rounded-xl p-2.5 text-xs text-white focus:outline-none"
                >
                  <option value="active">Active</option>
                  <option value="on_hold">On Hold</option>
                  <option value="completed">Completed</option>
                  <option value="someday">Someday</option>
                </select>
                <input
                  type="date"
                  value={deadline}
                  onChange={e => setDeadline(e.target.value)}
                  className="bg-[#2c2c2e]/60 rounded-xl p-2 text-xs text-white focus:outline-none"
                />
              </div>

              <textarea
                rows={2}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Project notes, references..."
                className="w-full bg-[#2c2c2e]/60 rounded-xl p-3 text-xs text-white focus:outline-none"
              />

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-1.5 text-xs text-[#8e8e93] hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-full bg-[#007aff] text-white text-xs font-semibold"
                >
                  Save
                </button>
              </div>
            </form>
          ) : (
            <>
              {project.notes && (
                <p className="text-xs text-[#8e8e93] bg-[#2c2c2e]/40 p-3 rounded-xl">
                  {project.notes}
                </p>
              )}

              {/* Subtasks List */}
              <div className="space-y-1.5 pt-1">
                {project.subtasks.map((st, idx) => (
                  <div
                    key={st.id}
                    className="flex items-center justify-between p-2 rounded-xl hover:bg-[#2c2c2e]/40 transition group"
                  >
                    <div className="flex items-center gap-2.5 flex-1 min-w-0 mr-2">
                      <button
                        onClick={() => toggleSubtask(project.id, st.id)}
                        className={`w-4 h-4 rounded-full border flex items-center justify-center transition flex-shrink-0 cursor-pointer ${
                          st.completed
                            ? 'bg-[#007aff] border-[#007aff] text-white'
                            : 'border-[#8e8e93]/60 hover:border-[#007aff]'
                        }`}
                      >
                        {st.completed && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                      </button>
                      <span
                        className={`text-xs ${
                          st.completed ? 'line-through text-[#8e8e93]' : 'text-white'
                        }`}
                      >
                        {st.text}
                      </span>
                    </div>

                    <div className="flex items-center gap-0.5 opacity-60 group-hover:opacity-100 transition">
                      <button
                        onClick={() => moveSubtask(idx, 'up')}
                        disabled={idx === 0}
                        className="w-6 h-6 rounded flex items-center justify-center text-[#8e8e93] hover:text-white disabled:opacity-20 cursor-pointer"
                        title="Move Up"
                      >
                        <ArrowUp className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => moveSubtask(idx, 'down')}
                        disabled={idx === project.subtasks.length - 1}
                        className="w-6 h-6 rounded flex items-center justify-center text-[#8e8e93] hover:text-white disabled:opacity-20 cursor-pointer"
                        title="Move Down"
                      >
                        <ArrowDown className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => deleteSubtask(project.id, st.id)}
                        className="w-6 h-6 rounded flex items-center justify-center text-[#8e8e93] hover:text-[#ff3b30] cursor-pointer"
                        title="Delete"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}

                {/* Add Subtask */}
                <form onSubmit={handleAddSubtask} className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    placeholder="Add next step..."
                    value={newSubtaskText}
                    onChange={e => setNewSubtaskText(e.target.value)}
                    className="flex-1 bg-[#2c2c2e]/60 rounded-xl px-3 py-2 text-xs text-white focus:outline-none placeholder:text-[#636366]"
                  />
                  <button
                    type="submit"
                    disabled={!newSubtaskText.trim()}
                    className="h-8 px-3 rounded-full bg-[#2c2c2e] hover:bg-[#3a3a3c] disabled:opacity-30 text-xs font-semibold text-[#007aff] transition cursor-pointer"
                  >
                    Add
                  </button>
                </form>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};
