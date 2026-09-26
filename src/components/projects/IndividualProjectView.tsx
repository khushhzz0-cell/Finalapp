import React, { useState } from 'react';
import { ProjectItem, Subtask, ProjectWaitingItem, ProjectFileLink, ProjectNestedSubtask, ProjectPriorityLevel } from '../../types';
import { useApp } from '../../context/AppContext';
import { parseNaturalProjectInstruction } from '../../utils/projectAiParser';
import {
  ArrowLeft,
  Check,
  MoreHorizontal,
  Plus,
  Calendar,
  Clock,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Trash2,
  Edit2,
  Flag,
  Sparkles,
  Link as LinkIcon,
  FileText,
  Paperclip,
  ArrowUp,
  ArrowDown,
  Zap,
} from 'lucide-react';
import { TodayAccent } from '../common/TodayAccent';

interface IndividualProjectViewProps {
  project: ProjectItem;
  onBack: () => void;
}

export const IndividualProjectView: React.FC<IndividualProjectViewProps> = ({
  project,
  onBack,
}) => {
  const {
    updateProject,
    deleteProject,
    toggleSubtask,
    toggleProjectPriority,
    setProjectPriorityLevel,
  } = useApp();

  // Menu & Edit State
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isEditingHeader, setIsEditingHeader] = useState(false);
  const [editName, setEditName] = useState(project.name);
  const [editDescription, setEditDescription] = useState(project.description || '');
  const [editDeadline, setEditDeadline] = useState(project.deadline || '');
  const [editPriorityLevel, setEditPriorityLevel] = useState<ProjectPriorityLevel>(
    project.priorityLevel || (project.isPriority ? 'top' : 'regular')
  );

  // Add Action Menu state
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const [addMode, setAddMode] = useState<'none' | 'task' | 'next' | 'waiting' | 'note' | 'file' | 'ai'>('none');

  // New item inputs
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newDateChoice, setNewDateChoice] = useState<'none' | 'today' | 'custom'>('none');
  const [newCustomDate, setNewCustomDate] = useState('');

  // Waiting item inputs
  const [waitingOn, setWaitingOn] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');

  // Note & File inputs
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [newLinkTitle, setNewLinkTitle] = useState('');

  // Natural Language / AI input
  const [aiInput, setAiInput] = useState('');

  // Collapsible sections
  const [isNotesFilesExpanded, setIsNotesFilesExpanded] = useState(false);
  const [expandedTaskIds, setExpandedTaskIds] = useState<Record<string, boolean>>({});
  const [newSubtaskTextMap, setNewSubtaskTextMap] = useState<Record<string, string>>({});

  // 1. PROJECT TASKS PARTITIONING:
  // Next actions: explicit isNext tasks or, if none designated, the first uncompleted task
  const uncompleted = project.subtasks.filter(st => !st.completed);
  const hasDesignatedNext = uncompleted.some(st => st.isNext);

  const nextActions = hasDesignatedNext
    ? uncompleted.filter(st => st.isNext)
    : uncompleted.slice(0, 1);

  const todoTasks = hasDesignatedNext
    ? uncompleted.filter(st => !st.isNext)
    : uncompleted.slice(1);

  // Completed tasks sorted strictly by completion sequence (🟢 1, 🟢 2...)
  const completedTasks = project.subtasks
    .filter(st => st.completed)
    .sort((a, b) => {
      const orderA = typeof a.completedOrder === 'number' ? a.completedOrder : 999999;
      const orderB = typeof b.completedOrder === 'number' ? b.completedOrder : 999999;
      if (orderA !== orderB) return orderA - orderB;
      return (a.completedAt || '').localeCompare(b.completedAt || '');
    });
  const waitingList = project.waitingItems || [];
  const filesList = project.files || [];

  // Toggle subtasks expand
  const toggleTaskExpanded = (taskId: string) => {
    setExpandedTaskIds(prev => ({ ...prev, [taskId]: !prev[taskId] }));
  };

  // Helper to persist task list modifications
  const saveSubtasks = (updated: Subtask[]) => {
    updateProject(project.id, { subtasks: updated });
  };

  // Helper to persist waiting items
  const saveWaitingItems = (updated: ProjectWaitingItem[]) => {
    updateProject(project.id, { waitingItems: updated });
  };

  // Helper to persist files/links
  const saveFiles = (updated: ProjectFileLink[]) => {
    updateProject(project.id, { files: updated });
  };

  // Save Header Edits
  const handleSaveHeader = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) return;
    updateProject(project.id, {
      name: editName.trim(),
      description: editDescription.trim(),
      deadline: editDeadline || undefined,
      priorityLevel: editPriorityLevel,
      isPriority: editPriorityLevel === 'top',
    });
    setIsEditingHeader(false);
  };

  // Designate / Undesignate a task as Next
  const handleToggleNext = (taskId: string) => {
    const updated = project.subtasks.map(st => {
      if (st.id === taskId) {
        return { ...st, isNext: !st.isNext };
      }
      return st;
    });
    saveSubtasks(updated);
  };

  // Move task up/down in Next or Todo list, or between them
  const handleMoveTask = (taskId: string, direction: 'up' | 'down') => {
    const isNextTask = nextActions.some(t => t.id === taskId);
    const isTodoTask = todoTasks.some(t => t.id === taskId);

    if (isNextTask) {
      const idx = nextActions.findIndex(t => t.id === taskId);
      if (direction === 'up') {
        if (idx > 0) {
          const reorderedNext = [...nextActions];
          const [moved] = reorderedNext.splice(idx, 1);
          reorderedNext.splice(idx - 1, 0, moved);
          saveSubtasks([...reorderedNext, ...todoTasks, ...completedTasks]);
        }
      } else {
        // direction === 'down'
        if (idx < nextActions.length - 1) {
          const reorderedNext = [...nextActions];
          const [moved] = reorderedNext.splice(idx, 1);
          reorderedNext.splice(idx + 1, 0, moved);
          saveSubtasks([...reorderedNext, ...todoTasks, ...completedTasks]);
        } else {
          // Demote down into TO DO (first item of TO DO)
          const demotedItem: Subtask = { ...nextActions[idx], isNext: false };
          const remainingNext = nextActions.filter(t => t.id !== taskId);
          const newTodo = [demotedItem, ...todoTasks];
          saveSubtasks([...remainingNext, ...newTodo, ...completedTasks]);
        }
      }
    } else if (isTodoTask) {
      const idx = todoTasks.findIndex(t => t.id === taskId);
      if (direction === 'up') {
        if (idx === 0) {
          // Promote UP into NEXT (appended to next actions)
          const promotedItem: Subtask = { ...todoTasks[idx], isNext: true };
          const remainingTodo = todoTasks.filter(t => t.id !== taskId);
          const newNext = [...nextActions, promotedItem];
          saveSubtasks([...newNext, ...remainingTodo, ...completedTasks]);
        } else {
          const reorderedTodo = [...todoTasks];
          const [moved] = reorderedTodo.splice(idx, 1);
          reorderedTodo.splice(idx - 1, 0, moved);
          saveSubtasks([...nextActions, ...reorderedTodo, ...completedTasks]);
        }
      } else {
        // direction === 'down'
        if (idx < todoTasks.length - 1) {
          const reorderedTodo = [...todoTasks];
          const [moved] = reorderedTodo.splice(idx, 1);
          reorderedTodo.splice(idx + 1, 0, moved);
          saveSubtasks([...nextActions, ...reorderedTodo, ...completedTasks]);
        }
      }
    }
  };

  // Delete a task
  const handleDeleteTask = (taskId: string) => {
    const updated = project.subtasks.filter(st => st.id !== taskId);
    saveSubtasks(updated);
  };

  // Add a nested subtask under a Task (Project → Task → Subtask)
  const handleAddNestedSubtask = (parentTaskId: string) => {
    const text = newSubtaskTextMap[parentTaskId]?.trim();
    if (!text) return;

    const updated = project.subtasks.map(st => {
      if (st.id !== parentTaskId) return st;
      const existing = st.subtasks || [];
      const newNested: ProjectNestedSubtask = {
        id: 'nst_' + Date.now() + Math.random().toString(36).substring(2, 4),
        text,
        completed: false,
      };
      return { ...st, subtasks: [...existing, newNested] };
    });

    saveSubtasks(updated);
    setNewSubtaskTextMap(prev => ({ ...prev, [parentTaskId]: '' }));
  };

  // Toggle completion of nested subtask
  const handleToggleNestedSubtask = (parentTaskId: string, nestedId: string) => {
    const updated = project.subtasks.map(st => {
      if (st.id !== parentTaskId) return st;
      const nextNested = (st.subtasks || []).map(nst =>
        nst.id === nestedId ? { ...nst, completed: !nst.completed } : nst
      );
      return { ...st, subtasks: nextNested };
    });
    saveSubtasks(updated);
  };

  // Add Task or Next Action
  const handleCreateTask = (isNext: boolean) => {
    if (!newTitle.trim()) return;

    let computedDate: string | undefined = undefined;
    if (newDateChoice === 'today') {
      computedDate = new Date().toISOString().split('T')[0];
    } else if (newDateChoice === 'custom' && newCustomDate) {
      computedDate = newCustomDate;
    }

    const newTask: Subtask = {
      id: 'st_' + Date.now() + Math.random().toString(36).substring(2, 5),
      text: newTitle.trim(),
      description: newDescription.trim() || undefined,
      isNext,
      date: computedDate,
      completed: false,
      order: isNext ? 0 : project.subtasks.length,
      subtasks: [],
    };

    // If it's a next action, put it at front of uncompleted
    const updated = isNext ? [newTask, ...project.subtasks] : [...project.subtasks, newTask];
    saveSubtasks(updated);

    // Reset inputs
    setNewTitle('');
    setNewDescription('');
    setNewDateChoice('none');
    setNewCustomDate('');
    setAddMode('none');
  };

  // Add Waiting item
  const handleCreateWaiting = () => {
    if (!newTitle.trim()) return;
    const newItem: ProjectWaitingItem = {
      id: 'wt_' + Date.now(),
      title: newTitle.trim(),
      waitingOn: waitingOn.trim() || undefined,
      followUpDate: followUpDate || undefined,
      completed: false,
      createdAt: new Date().toISOString(),
    };

    saveWaitingItems([newItem, ...waitingList]);
    setNewTitle('');
    setWaitingOn('');
    setFollowUpDate('');
    setAddMode('none');
  };

  // Toggle Waiting item
  const handleToggleWaiting = (waitingId: string) => {
    const updated = waitingList.map(item =>
      item.id === waitingId ? { ...item, completed: !item.completed } : item
    );
    saveWaitingItems(updated);
  };

  // Convert waiting item to NEXT action
  const handlePromoteWaitingToNext = (item: ProjectWaitingItem) => {
    const newTask: Subtask = {
      id: 'st_' + Date.now(),
      text: item.title + (item.waitingOn ? ` (${item.waitingOn})` : ''),
      isNext: true,
      completed: false,
      order: 0,
    };
    saveSubtasks([newTask, ...project.subtasks]);
    saveWaitingItems(waitingList.filter(w => w.id !== item.id));
  };

  // Delete waiting item
  const handleDeleteWaiting = (waitingId: string) => {
    saveWaitingItems(waitingList.filter(w => w.id !== waitingId));
  };

  // Add Link
  const handleAddLink = () => {
    if (!newLinkTitle.trim()) return;
    const newFile: ProjectFileLink = {
      id: 'fl_' + Date.now(),
      name: newLinkTitle.trim(),
      url: newLinkUrl.trim() || undefined,
      type: newLinkUrl ? 'link' : 'note',
      createdAt: new Date().toISOString(),
    };
    saveFiles([...filesList, newFile]);
    setNewLinkTitle('');
    setNewLinkUrl('');
    setAddMode('none');
  };

  // Handle Natural Language / AI Parse
  const handleExecuteAi = (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiInput.trim()) return;

    const parsed = parseNaturalProjectInstruction(aiInput);

    let nextSubtasks = [...project.subtasks];

    // Add next actions
    parsed.nextActions.forEach(na => {
      nextSubtasks.unshift({
        id: 'st_' + Date.now() + Math.random().toString(36).substring(2, 5),
        text: na.text,
        description: na.description,
        date: na.date,
        isNext: true,
        completed: false,
        order: 0,
      });
    });

    // Add todo tasks
    parsed.todoTasks.forEach(td => {
      nextSubtasks.push({
        id: 'st_' + Date.now() + Math.random().toString(36).substring(2, 5),
        text: td.text,
        description: td.description,
        date: td.date,
        isNext: false,
        completed: false,
        order: nextSubtasks.length,
      });
    });

    // Add waiting items
    const newWaitingItems = [...waitingList];
    parsed.waitingItems.forEach(wi => {
      newWaitingItems.push({
        id: 'wt_' + Date.now() + Math.random().toString(36).substring(2, 5),
        title: wi.title,
        waitingOn: wi.waitingOn,
        followUpDate: wi.followUpDate,
        completed: false,
        createdAt: new Date().toISOString(),
      });
    });

    updateProject(project.id, {
      subtasks: nextSubtasks,
      waitingItems: newWaitingItems,
    });

    setAiInput('');
    setAddMode('none');
  };

  return (
    <div className="space-y-6 pb-24 selection:bg-[#007aff]/30">
      {/* 1. PROJECT HEADER */}
      <div className="space-y-3 pt-1">
        {/* Navigation Bar: Back & ••• Menu */}
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-xs font-semibold text-[#007aff] hover:opacity-80 transition cursor-pointer -ml-1 py-1 px-1.5 rounded-lg active:bg-white/5"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Projects</span>
          </button>

          <div className="relative">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="w-8 h-8 rounded-full flex items-center justify-center text-[#8e8e93] hover:text-white hover:bg-white/[0.08] transition cursor-pointer"
              title="Project options"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>

            {/* Minimal Secondary ••• Menu */}
            {isMenuOpen && (
              <div
                className="absolute right-0 top-9 w-48 bg-[#252528] border border-white/10 rounded-2xl p-1.5 shadow-2xl z-30 space-y-1 backdrop-blur-xl animate-fadeIn"
                onClick={() => setIsMenuOpen(false)}
              >
                <button
                  onClick={() => setIsEditingHeader(true)}
                  className="w-full text-left px-3 py-2 text-xs text-white hover:bg-white/10 rounded-xl flex items-center gap-2 cursor-pointer transition"
                >
                  <Edit2 className="w-3.5 h-3.5 text-[#8e8e93]" />
                  <span>Edit Project Goal</span>
                </button>

                <div className="h-px bg-white/[0.06] my-1" />

                {/* 3-Level Priority Selection */}
                <div className="px-3 py-1 text-[10px] font-semibold uppercase text-[#8e8e93] tracking-wider">
                  Priority Level
                </div>
                {(
                  [
                    { id: 'top', label: 'Top Priority', dot: '🔴' },
                    { id: 'intermediate', label: 'Intermediate', dot: '🟡' },
                    { id: 'regular', label: 'Regular', dot: '⚪' },
                  ] as const
                ).map(lvl => {
                  const currentLevel = project.priorityLevel || (project.isPriority ? 'top' : 'regular');
                  const isSelected = currentLevel === lvl.id;
                  return (
                    <button
                      key={lvl.id}
                      onClick={() => setProjectPriorityLevel(project.id, lvl.id)}
                      className={`w-full text-left px-3 py-1.5 text-xs rounded-xl flex items-center justify-between cursor-pointer transition ${
                        isSelected ? 'bg-white/10 text-white font-semibold' : 'text-[#c7c7cc] hover:bg-white/5'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span className="text-xs">{lvl.dot}</span>
                        <span>{lvl.label}</span>
                      </span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-[#007aff]" />}
                    </button>
                  );
                })}

                <div className="h-px bg-white/[0.06] my-1" />

                {/* Status Options: Active, Waiting, Someday */}
                <div className="px-3 py-1 text-[10px] font-semibold uppercase text-[#8e8e93] tracking-wider">
                  Move to
                </div>
                {(['active', 'on_hold', 'someday'] as const).map(st => (
                  <button
                    key={st}
                    onClick={() => updateProject(project.id, { status: st })}
                    className={`w-full text-left px-3 py-1.5 text-xs rounded-xl flex items-center justify-between cursor-pointer transition ${
                      project.status === st ? 'text-[#007aff] font-semibold bg-[#007aff]/10' : 'text-white/80 hover:bg-white/10'
                    }`}
                  >
                    <span className="capitalize">{st === 'on_hold' ? 'Waiting' : st}</span>
                    {project.status === st && <Check className="w-3 h-3 text-[#007aff]" />}
                  </button>
                ))}

                <div className="h-px bg-white/[0.06] my-1" />

                <button
                  onClick={() => {
                    deleteProject(project.id);
                    onBack();
                  }}
                  className="w-full text-left px-3 py-2 text-xs text-[#ff3b30] hover:bg-[#ff3b30]/15 rounded-xl flex items-center gap-2 cursor-pointer transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Project</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Project Name, Goal, Priority Badge, and Optional Target Date */}
        {!isEditingHeader ? (
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white truncate">
                  {project.name}
                </h1>

                {/* 3-Level Priority Switcher Badge */}
                <button
                  type="button"
                  onClick={() => {
                    const current = project.priorityLevel || (project.isPriority ? 'top' : 'regular');
                    const next: ProjectPriorityLevel =
                      current === 'regular' ? 'intermediate' : current === 'intermediate' ? 'top' : 'regular';
                    setProjectPriorityLevel(project.id, next);
                  }}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold transition cursor-pointer select-none border flex-shrink-0 ${
                    (project.priorityLevel === 'top' || (!project.priorityLevel && project.isPriority))
                      ? 'bg-[#ff453a]/15 text-[#ff453a] border-[#ff453a]/30 hover:bg-[#ff453a]/25'
                      : project.priorityLevel === 'intermediate'
                      ? 'bg-[#ffd60a]/15 text-[#ffd60a] border-[#ffd60a]/30 hover:bg-[#ffd60a]/25'
                      : 'bg-white/5 text-[#8e8e93] border-white/10 hover:bg-white/10 hover:text-white'
                  }`}
                  title="Click to cycle: Regular → Intermediate → Top Priority"
                >
                  <span>
                    {(project.priorityLevel === 'top' || (!project.priorityLevel && project.isPriority))
                      ? '🔴 Top Priority'
                      : project.priorityLevel === 'intermediate'
                      ? '🟡 Intermediate'
                      : '⚪ Regular'}
                  </span>
                </button>
              </div>

              {project.deadline && (
                <span className="flex items-center gap-1 text-xs text-[#8e8e93] bg-white/[0.04] px-2.5 py-1 rounded-full border border-white/[0.06] flex-shrink-0">
                  <Calendar className="w-3.5 h-3.5 text-[#8e8e93]" />
                  <span>Target: {project.deadline}</span>
                </span>
              )}
            </div>

            {project.description && (
              <p className="text-xs sm:text-sm text-[#8e8e93] leading-relaxed">
                {project.description}
              </p>
            )}
          </div>
        ) : (
          /* Inline Header Edit Form */
          <form onSubmit={handleSaveHeader} className="bg-[#1c1c1e] p-3 rounded-2xl border border-white/10 space-y-2.5">
            <input
              type="text"
              value={editName}
              onChange={e => setEditName(e.target.value)}
              placeholder="Project Name"
              className="w-full bg-transparent text-white font-semibold text-base focus:outline-none placeholder:text-[#636366]"
              required
            />
            <input
              type="text"
              value={editDescription}
              onChange={e => setEditDescription(e.target.value)}
              placeholder="Short description / core outcome"
              className="w-full bg-transparent text-white/80 text-xs focus:outline-none placeholder:text-[#636366]"
            />

            {/* 3 Priority Level Buttons in Edit Form */}
            <div className="pt-1">
              <label className="text-[11px] text-[#8e8e93] font-medium block mb-1">
                Priority Level
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'top', label: 'Top Priority', dot: '🔴' },
                  { id: 'intermediate', label: 'Intermediate', dot: '🟡' },
                  { id: 'regular', label: 'Regular', dot: '⚪' },
                ].map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setEditPriorityLevel(p.id as ProjectPriorityLevel)}
                    className={`py-1.5 px-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition cursor-pointer border ${
                      editPriorityLevel === p.id
                        ? 'bg-white/15 text-white border-white/30'
                        : 'bg-white/[0.04] text-[#8e8e93] border-transparent hover:text-white'
                    }`}
                  >
                    <span>{p.dot}</span>
                    <span className="truncate">{p.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-white/[0.06]">
              <input
                type="date"
                value={editDeadline}
                onChange={e => setEditDeadline(e.target.value)}
                className="bg-[#2c2c2e] text-white text-xs px-2.5 py-1 rounded-lg focus:outline-none"
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditingHeader(false)}
                  className="text-xs text-[#8e8e93] hover:text-white px-2 py-1 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="text-xs text-white bg-[#007aff] px-3 py-1 rounded-lg font-medium cursor-pointer"
                >
                  Save
                </button>
              </div>
            </div>
          </form>
        )}
      </div>

      {/* 2. NEXT (THE MOST VISUALLY PROMINENT PART OF THE PAGE) */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#242428] to-[#1c1c1e] rounded-3xl p-4 sm:p-5 border border-white/20 shadow-xl space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold tracking-widest uppercase text-[#007aff] bg-[#007aff]/15 px-2 py-0.5 rounded-md">
              NEXT
            </span>
            <span className="text-xs text-white/60 font-medium">
              Immediate action
            </span>
          </div>

          <button
            onClick={() => {
              setAddMode('next');
              setIsAddMenuOpen(false);
            }}
            className="text-xs text-[#007aff] hover:underline flex items-center gap-1 font-semibold cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add next action</span>
          </button>
        </div>

        {/* Next Actions List */}
        {nextActions.length === 0 ? (
          <div className="bg-black/20 rounded-2xl p-6 text-center border border-dashed border-white/10 space-y-2">
            <p className="text-xs text-[#8e8e93]">
              No Next Action set. What is the single next thing to move this forward?
            </p>
            <button
              onClick={() => setAddMode('next')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#007aff] text-white text-xs font-semibold shadow-sm hover:bg-[#007aff]/90 transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Define Next Action</span>
            </button>
          </div>
        ) : (
          <div className="space-y-2.5">
            {nextActions.map(task => {
              const subtaskCount = task.subtasks?.length || 0;
              const completedSubtasks = task.subtasks?.filter(st => st.completed).length || 0;
              const isExpanded = !!expandedTaskIds[task.id];
              const todayStr = new Date().toISOString().split('T')[0];
              const isTaskForToday =
                !task.completed && (task.date === 'today' || task.date === todayStr || task.isNext);

              return (
                <div
                  key={task.id}
                  className="relative overflow-hidden bg-[#2a2a2d] hover:bg-[#2f2f33] rounded-2xl p-3.5 border border-white/10 transition space-y-2"
                >
                  {/* Universal orange visual indicator: "This needs my attention today" */}
                  {isTaskForToday && <TodayAccent />}
                  <div className="flex items-start gap-3">
                    {/* Circle Checkbox */}
                    <button
                      onClick={() => toggleSubtask(project.id, task.id)}
                      className="w-5 h-5 rounded-full border-2 border-[#007aff] hover:bg-[#007aff]/20 flex items-center justify-center mt-0.5 flex-shrink-0 transition cursor-pointer"
                      title="Mark next action completed"
                    />

                    {/* Task Title & Notes */}
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="text-[15px] font-semibold text-white leading-snug">
                          {task.text}
                        </p>

                        {task.date && (
                          <span className="text-[11px] font-medium text-[#38bdf8] bg-[#38bdf8]/10 px-2 py-0.5 rounded-md whitespace-nowrap flex-shrink-0">
                            {task.date === new Date().toISOString().split('T')[0] ? 'Today' : task.date}
                          </span>
                        )}
                      </div>

                      {task.description && (
                        <p className="text-xs text-[#8e8e93] leading-relaxed">
                          {task.description}
                        </p>
                      )}

                      {/* Optional Subtasks Badge / Toggle */}
                      {subtaskCount > 0 && (
                        <button
                          onClick={() => toggleTaskExpanded(task.id)}
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-white/70 hover:text-white pt-1 cursor-pointer"
                        >
                          <span>
                            {completedSubtasks}/{subtaskCount} subtasks
                          </span>
                          <ChevronRight className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                        </button>
                      )}
                    </div>

                    {/* Move Up/Down & Downgrade to standard To Do */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        type="button"
                        disabled={nextActions.indexOf(task) === 0}
                        onClick={() => handleMoveTask(task.id, 'up')}
                        className="w-7 h-7 rounded-lg bg-white/[0.06] hover:bg-white/15 disabled:opacity-20 flex items-center justify-center text-[#8e8e93] hover:text-white transition cursor-pointer"
                        title="Move Up"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleMoveTask(task.id, 'down')}
                        className="w-7 h-7 rounded-lg bg-white/[0.06] hover:bg-white/15 flex items-center justify-center text-[#8e8e93] hover:text-white transition cursor-pointer"
                        title={nextActions.indexOf(task) === nextActions.length - 1 ? 'Move down to To Do' : 'Move Down'}
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleToggleNext(task.id)}
                        className="w-7 h-7 rounded-lg bg-white/[0.06] hover:bg-white/15 flex items-center justify-center text-[#007aff] transition cursor-pointer"
                        title="Move back to To Do"
                      >
                        <Zap className="w-3.5 h-3.5 fill-[#007aff]" />
                      </button>
                    </div>
                  </div>

                  {/* Nested Subtasks List (Project → Task → Subtask) */}
                  {isExpanded && (
                    <div className="pl-8 pt-2 space-y-1.5 border-t border-white/[0.06]">
                      {(task.subtasks || []).map(nst => (
                        <div
                          key={nst.id}
                          onClick={() => handleToggleNestedSubtask(task.id, nst.id)}
                          className="flex items-center gap-2.5 text-xs text-white/90 hover:text-white py-1 cursor-pointer select-none"
                        >
                          <div
                            className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center transition flex-shrink-0 ${
                              nst.completed
                                ? 'bg-[#007aff] border-[#007aff] text-white'
                                : 'border-[#8e8e93]/60'
                            }`}
                          >
                            {nst.completed && <Check className="w-2 h-2 stroke-[3]" />}
                          </div>
                          <span className={nst.completed ? 'line-through text-[#8e8e93]' : ''}>
                            {nst.text}
                          </span>
                        </div>
                      ))}

                      {/* Inline Add Nested Subtask */}
                      <div className="flex items-center gap-2 pt-1">
                        <input
                          type="text"
                          value={newSubtaskTextMap[task.id] || ''}
                          onChange={e => setNewSubtaskTextMap({ ...newSubtaskTextMap, [task.id]: e.target.value })}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddNestedSubtask(task.id);
                            }
                          }}
                          placeholder="+ Add subtask..."
                          className="bg-transparent text-xs text-white placeholder:text-[#636366] focus:outline-none flex-1 py-1"
                        />
                        {newSubtaskTextMap[task.id] && (
                          <button
                            onClick={() => handleAddNestedSubtask(task.id)}
                            className="text-[11px] font-semibold text-[#007aff] px-2 py-0.5 rounded cursor-pointer"
                          >
                            Add
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 3. TO DO (REMAINING ACTIONABLE TASKS) */}
      <section className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#8e8e93]">
              TO DO
            </span>
            <span className="text-xs text-[#636366] font-mono">
              ({todoTasks.length})
            </span>
          </div>

          <button
            onClick={() => {
              setAddMode('task');
              setIsAddMenuOpen(false);
            }}
            className="text-xs text-[#007aff] hover:underline flex items-center gap-1 font-semibold cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add task</span>
          </button>
        </div>

        {todoTasks.length === 0 ? (
          <div className="bg-[#1c1c1e] rounded-2xl p-4 text-center border border-white/[0.04] text-xs text-[#8e8e93]">
            No pending tasks in queue.
          </div>
        ) : (
          <div className="bg-[#1c1c1e] rounded-2xl border border-white/[0.06] divide-y divide-[#2c2c2e] overflow-hidden">
            {todoTasks.map((task, idx) => {
              const subtaskCount = task.subtasks?.length || 0;
              const completedSubtasks = task.subtasks?.filter(st => st.completed).length || 0;
              const isExpanded = !!expandedTaskIds[task.id];
              const todayStr = new Date().toISOString().split('T')[0];
              const isTaskForToday =
                !task.completed && (task.date === 'today' || task.date === todayStr);

              return (
                <div
                  key={task.id}
                  className={`p-3 sm:p-3.5 hover:bg-[#242426] transition group relative overflow-hidden ${
                    isTaskForToday ? 'bg-[#222225]' : ''
                  }`}
                >
                  {/* Universal orange visual indicator: "This needs my attention today" */}
                  {isTaskForToday && <TodayAccent />}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      {/* Checkbox */}
                      <button
                        onClick={() => toggleSubtask(project.id, task.id)}
                        className="w-4 h-4 rounded-full border border-[#8e8e93]/60 hover:border-[#007aff] flex items-center justify-center mt-0.5 flex-shrink-0 transition cursor-pointer"
                      />

                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="text-[14px] text-white font-normal leading-snug">
                            {task.text}
                          </p>

                          {task.date && (
                            <span className="text-[10px] text-[#8e8e93] whitespace-nowrap flex-shrink-0">
                              {task.date === new Date().toISOString().split('T')[0] ? 'Today' : task.date}
                            </span>
                          )}
                        </div>

                        {task.description && (
                          <p className="text-xs text-[#8e8e93] line-clamp-1 mt-0.5">
                            {task.description}
                          </p>
                        )}

                        {/* Optional Subtasks Badge */}
                        {subtaskCount > 0 && (
                          <button
                            onClick={() => toggleTaskExpanded(task.id)}
                            className="inline-flex items-center gap-1 text-[11px] font-medium text-[#8e8e93] hover:text-white pt-1 cursor-pointer"
                          >
                            <span>
                              {completedSubtasks}/{subtaskCount} subtasks
                            </span>
                            <ChevronRight className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Secondary Task Controls */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {/* Promote to Next Action */}
                      <button
                        type="button"
                        onClick={() => handleToggleNext(task.id)}
                        className="w-7 h-7 rounded-lg bg-white/[0.06] hover:bg-[#007aff]/20 flex items-center justify-center text-[#8e8e93] hover:text-[#007aff] transition cursor-pointer"
                        title="Promote to Next Action"
                      >
                        <Zap className="w-3.5 h-3.5" />
                      </button>

                      {/* Reorder Up */}
                      <button
                        type="button"
                        onClick={() => handleMoveTask(task.id, 'up')}
                        className="w-7 h-7 rounded-lg bg-white/[0.06] hover:bg-white/15 flex items-center justify-center text-[#8e8e93] hover:text-white transition cursor-pointer"
                        title={idx === 0 ? 'Move up into NEXT' : 'Move Up'}
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>

                      {/* Reorder Down */}
                      <button
                        type="button"
                        disabled={idx === todoTasks.length - 1}
                        onClick={() => handleMoveTask(task.id, 'down')}
                        className="w-7 h-7 rounded-lg bg-white/[0.06] hover:bg-white/15 disabled:opacity-20 flex items-center justify-center text-[#8e8e93] hover:text-white transition cursor-pointer"
                        title="Move Down"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>

                      {/* Delete */}
                      <button
                        type="button"
                        onClick={() => handleDeleteTask(task.id)}
                        className="w-7 h-7 rounded-lg bg-white/[0.06] hover:bg-[#ff3b30]/20 flex items-center justify-center text-[#8e8e93] hover:text-[#ff3b30] transition cursor-pointer"
                        title="Delete task"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Expanded Nested Subtasks */}
                  {isExpanded && (
                    <div className="pl-7 pt-2.5 space-y-1.5 border-t border-white/[0.04] mt-2">
                      {(task.subtasks || []).map(nst => (
                        <div
                          key={nst.id}
                          onClick={() => handleToggleNestedSubtask(task.id, nst.id)}
                          className="flex items-center gap-2.5 text-xs text-white/90 hover:text-white py-1 cursor-pointer select-none"
                        >
                          <div
                            className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center transition flex-shrink-0 ${
                              nst.completed
                                ? 'bg-[#007aff] border-[#007aff] text-white'
                                : 'border-[#8e8e93]/60'
                            }`}
                          >
                            {nst.completed && <Check className="w-2 h-2 stroke-[3]" />}
                          </div>
                          <span className={nst.completed ? 'line-through text-[#8e8e93]' : ''}>
                            {nst.text}
                          </span>
                        </div>
                      ))}

                      {/* Inline Add Nested Subtask */}
                      <div className="flex items-center gap-2 pt-1">
                        <input
                          type="text"
                          value={newSubtaskTextMap[task.id] || ''}
                          onChange={e => setNewSubtaskTextMap({ ...newSubtaskTextMap, [task.id]: e.target.value })}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddNestedSubtask(task.id);
                            }
                          }}
                          placeholder="+ Add subtask..."
                          className="bg-transparent text-xs text-white placeholder:text-[#636366] focus:outline-none flex-1 py-1"
                        />
                        {newSubtaskTextMap[task.id] && (
                          <button
                            onClick={() => handleAddNestedSubtask(task.id)}
                            className="text-[11px] font-semibold text-[#007aff] px-2 py-0.5 rounded cursor-pointer"
                          >
                            Add
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 4. WAITING (COMPACT SECTION FOR BLOCKED ITEMS) */}
      <section className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#ff9500]">
              WAITING
            </span>
            <span className="text-xs text-[#636366] font-mono">
              ({waitingList.filter(w => !w.completed).length})
            </span>
          </div>

          <button
            onClick={() => {
              setAddMode('waiting');
              setIsAddMenuOpen(false);
            }}
            className="text-xs text-[#ff9500] hover:underline flex items-center gap-1 font-semibold cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add waiting item</span>
          </button>
        </div>

        {waitingList.length === 0 ? (
          <div className="bg-[#1c1c1e] rounded-2xl p-3.5 text-center border border-white/[0.04] text-xs text-[#8e8e93]">
            Nothing blocked or waiting on others.
          </div>
        ) : (
          <div className="bg-[#1c1c1e] rounded-2xl border border-white/[0.06] divide-y divide-[#2c2c2e] overflow-hidden">
            {waitingList.map(item => (
              <div
                key={item.id}
                className="p-3.5 flex items-start justify-between gap-3 hover:bg-[#242426] transition"
              >
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <button
                    onClick={() => handleToggleWaiting(item.id)}
                    className={`w-4 h-4 rounded-full border flex items-center justify-center mt-0.5 flex-shrink-0 transition cursor-pointer ${
                      item.completed
                        ? 'bg-[#34c759] border-[#34c759] text-white'
                        : 'border-[#ff9500]/60 hover:border-[#ff9500]'
                    }`}
                  >
                    {item.completed && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                  </button>

                  <div className="min-w-0 flex-1 space-y-0.5">
                    <p
                      className={`text-[14px] font-medium ${
                        item.completed ? 'line-through text-[#8e8e93]' : 'text-white'
                      }`}
                    >
                      {item.title}
                    </p>

                    <div className="flex items-center gap-2 text-xs text-[#8e8e93]">
                      {item.waitingOn && (
                        <span>Waiting on: <strong className="text-white/80 font-medium">{item.waitingOn}</strong></span>
                      )}
                      {item.followUpDate && (
                        <>
                          <span>·</span>
                          <span className="text-[#ff9500] font-medium">Follow up: {item.followUpDate}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {/* Promote to Next Action */}
                  <button
                    onClick={() => handlePromoteWaitingToNext(item)}
                    className="text-[11px] font-semibold text-[#007aff] hover:bg-[#007aff]/15 px-2 py-1 rounded-md transition cursor-pointer"
                    title="Action received, convert to Next Action"
                  >
                    Unblock
                  </button>

                  <button
                    onClick={() => handleDeleteWaiting(item.id)}
                    className="text-[#8e8e93] hover:text-[#ff3b30] p-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 5. NOTES & FILES (COLLAPSED / COMPACT BY DEFAULT) */}
      <section className="bg-[#1c1c1e] rounded-2xl border border-white/[0.06] overflow-hidden">
        <button
          onClick={() => setIsNotesFilesExpanded(!isNotesFilesExpanded)}
          className="w-full p-4 flex items-center justify-between text-left hover:bg-white/[0.02] transition cursor-pointer select-none"
        >
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#8e8e93]" />
            <span className="text-xs font-bold uppercase tracking-wider text-white/90">
              Notes & Files
            </span>
            {(project.notes || filesList.length > 0) && (
              <span className="w-1.5 h-1.5 rounded-full bg-[#007aff]" />
            )}
          </div>

          <div className="flex items-center gap-2 text-xs text-[#8e8e93]">
            <span>{filesList.length} attachments</span>
            <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isNotesFilesExpanded ? 'rotate-180' : ''}`} />
          </div>
        </button>

        {isNotesFilesExpanded && (
          <div className="p-4 pt-1 border-t border-[#2c2c2e] space-y-4 animate-fadeIn">
            {/* Project Notes Editor */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#8e8e93] block">
                Context & Notes
              </label>
              <textarea
                rows={3}
                defaultValue={project.notes || ''}
                onBlur={e => updateProject(project.id, { notes: e.target.value.trim() || undefined })}
                placeholder="Key links, context, instructions..."
                className="w-full bg-[#2c2c2e]/60 rounded-xl p-3 text-xs text-white placeholder:text-[#636366] focus:outline-none focus:ring-1 focus:ring-white/20 resize-none"
              />
            </div>

            {/* Attached Links & Files */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#8e8e93]">
                  Documents & Links
                </span>
                <button
                  onClick={() => setAddMode('file')}
                  className="text-xs text-[#007aff] font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add link/file</span>
                </button>
              </div>

              {filesList.length === 0 ? (
                <p className="text-xs text-[#636366] italic">No files or links attached yet.</p>
              ) : (
                <div className="space-y-1.5">
                  {filesList.map(f => (
                    <div
                      key={f.id}
                      className="flex items-center justify-between p-2 rounded-xl bg-[#2c2c2e]/50 text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {f.url ? (
                          <LinkIcon className="w-3.5 h-3.5 text-[#007aff] flex-shrink-0" />
                        ) : (
                          <Paperclip className="w-3.5 h-3.5 text-[#8e8e93] flex-shrink-0" />
                        )}
                        {f.url ? (
                          <a
                            href={f.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-white hover:text-[#007aff] hover:underline truncate"
                          >
                            {f.name}
                          </a>
                        ) : (
                          <span className="text-white truncate">{f.name}</span>
                        )}
                      </div>

                      <button
                        onClick={() => saveFiles(filesList.filter(item => item.id !== f.id))}
                        className="text-[#8e8e93] hover:text-[#ff3b30] p-1 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      {/* 6. COMPLETED TASKS (DOWN AT THE BOTTOM, NUMBERED 🟢1, 🟢2, NEVER DELETED) */}
      {completedTasks.length > 0 && (
        <section className="space-y-2.5 pt-2">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#34c759]">
                COMPLETED
              </span>
              <span className="text-xs text-[#636366] font-mono">
                ({completedTasks.length})
              </span>
            </div>
            <span className="text-[11px] text-[#8e8e93]">
              Never deleted · Tap to restore
            </span>
          </div>

          <div className="bg-[#1c1c1e] rounded-2xl border border-white/[0.06] divide-y divide-[#2c2c2e] overflow-hidden">
            {completedTasks.map((task, index) => {
              const displayOrder = task.completedOrder || (index + 1);
              return (
                <div
                  key={task.id}
                  className="p-3 sm:p-3.5 flex items-center justify-between gap-3 hover:bg-[#242426] transition group"
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    {/* Number badge with 🟢1 or 🟢 1 */}
                    <button
                      type="button"
                      onClick={() => toggleSubtask(project.id, task.id)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#34c759]/15 border border-[#34c759]/30 text-[#34c759] text-xs font-bold font-mono flex-shrink-0 cursor-pointer hover:bg-[#34c759]/25 transition active:scale-95"
                      title="Tap to uncheck and restore to active tasks"
                    >
                      <span className="text-xs">🟢</span>
                      <span>{displayOrder}</span>
                    </button>

                    <div className="min-w-0 flex-1 space-y-0.5">
                      <p className="text-[14px] line-through text-[#8e8e93] leading-snug break-words">
                        {task.text}
                      </p>
                      {task.description && (
                        <p className="text-xs text-[#636366] line-through">
                          {task.description}
                        </p>
                      )}
                      {task.completedAt && (
                        <span className="text-[10px] text-[#636366] block">
                          Completed {new Date(task.completedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Restore Action */}
                  <button
                    type="button"
                    onClick={() => toggleSubtask(project.id, task.id)}
                    className="text-xs font-medium text-[#8e8e93] hover:text-[#34c759] hover:bg-[#34c759]/10 px-2.5 py-1 rounded-lg transition cursor-pointer flex-shrink-0"
                    title="Restore task to active"
                  >
                    Restore
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 6. UNIFIED + ADD INTERACTION POPOVER SHEET */}
      {addMode !== 'none' && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-[#1c1c1e] border-t sm:border border-white/10 rounded-t-3xl sm:rounded-3xl w-full max-w-lg p-5 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-[#2c2c2e]">
              <h3 className="font-semibold text-sm text-white capitalize">
                {addMode === 'next' && 'New Next Action'}
                {addMode === 'task' && 'New To Do Task'}
                {addMode === 'waiting' && 'New Waiting Item'}
                {addMode === 'file' && 'Add Link or Document'}
                {addMode === 'ai' && 'AI / Natural Language Quick Add'}
              </h3>
              <button
                type="button"
                onClick={() => setAddMode('none')}
                className="text-xs text-[#8e8e93] hover:text-white font-medium cursor-pointer"
              >
                Cancel
              </button>
            </div>

            {/* Form for Task or Next Action */}
            {(addMode === 'task' || addMode === 'next') && (
              <form
                onSubmit={e => {
                  e.preventDefault();
                  handleCreateTask(addMode === 'next');
                }}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <label className="text-xs text-[#8e8e93] font-medium block">
                    {addMode === 'next' ? 'What is the immediate action?' : 'Task title'}
                  </label>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={e => setNewTitle(e.target.value)}
                    placeholder="e.g., Send employer form to Jason"
                    className="w-full bg-[#2c2c2e] rounded-xl p-3 text-sm text-white focus:outline-none placeholder:text-[#636366]"
                    autoFocus
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-[#8e8e93] font-medium block">
                    Optional detail / context
                  </label>
                  <input
                    type="text"
                    value={newDescription}
                    onChange={e => setNewDescription(e.target.value)}
                    placeholder="e.g., Employer needs to complete NSNP form"
                    className="w-full bg-[#2c2c2e] rounded-xl p-3 text-xs text-white focus:outline-none placeholder:text-[#636366]"
                  />
                </div>

                {/* Date options (Default: No Date) */}
                <div className="space-y-2">
                  <label className="text-xs text-[#8e8e93] font-medium block">
                    Date (Default: No Date)
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setNewDateChoice('none')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition ${
                        newDateChoice === 'none' ? 'bg-white text-black font-semibold' : 'bg-[#2c2c2e] text-[#8e8e93]'
                      }`}
                    >
                      No date
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewDateChoice('today')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition ${
                        newDateChoice === 'today' ? 'bg-[#007aff] text-white font-semibold' : 'bg-[#2c2c2e] text-[#8e8e93]'
                      }`}
                    >
                      Today
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewDateChoice('custom')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition ${
                        newDateChoice === 'custom' ? 'bg-[#007aff] text-white font-semibold' : 'bg-[#2c2c2e] text-[#8e8e93]'
                      }`}
                    >
                      Pick date
                    </button>
                  </div>

                  {newDateChoice === 'custom' && (
                    <input
                      type="date"
                      value={newCustomDate}
                      onChange={e => setNewCustomDate(e.target.value)}
                      className="bg-[#2c2c2e] text-white text-xs px-3 py-2 rounded-xl focus:outline-none mt-2"
                      required
                    />
                  )}
                </div>

                <button
                  type="submit"
                  disabled={!newTitle.trim()}
                  className="w-full py-2.5 rounded-xl bg-[#007aff] hover:bg-[#007aff]/90 disabled:opacity-40 text-white font-semibold text-xs transition cursor-pointer"
                >
                  Save {addMode === 'next' ? 'Next Action' : 'Task'}
                </button>
              </form>
            )}

            {/* Form for Waiting Item */}
            {addMode === 'waiting' && (
              <form
                onSubmit={e => {
                  e.preventDefault();
                  handleCreateWaiting();
                }}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <label className="text-xs text-[#8e8e93] font-medium block">
                    Item or deliverable
                  </label>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={e => setNewTitle(e.target.value)}
                    placeholder="e.g., Employer form, Signed contract"
                    className="w-full bg-[#2c2c2e] rounded-xl p-3 text-sm text-white focus:outline-none placeholder:text-[#636366]"
                    autoFocus
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-[#8e8e93] font-medium block">
                    Who or what are you waiting for?
                  </label>
                  <input
                    type="text"
                    value={waitingOn}
                    onChange={e => setWaitingOn(e.target.value)}
                    placeholder="e.g., Jason, Immigration lawyer, City council"
                    className="w-full bg-[#2c2c2e] rounded-xl p-3 text-xs text-white focus:outline-none placeholder:text-[#636366]"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-[#8e8e93] font-medium block">
                    Follow-up date (optional)
                  </label>
                  <input
                    type="date"
                    value={followUpDate}
                    onChange={e => setFollowUpDate(e.target.value)}
                    className="bg-[#2c2c2e] text-white text-xs px-3 py-2 rounded-xl focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={!newTitle.trim()}
                  className="w-full py-2.5 rounded-xl bg-[#ff9500] hover:bg-[#ff9500]/90 disabled:opacity-40 text-white font-semibold text-xs transition cursor-pointer"
                >
                  Save Waiting Item
                </button>
              </form>
            )}

            {/* Form for Link / File */}
            {addMode === 'file' && (
              <form
                onSubmit={e => {
                  e.preventDefault();
                  handleAddLink();
                }}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <label className="text-xs text-[#8e8e93] font-medium block">
                    Title or label
                  </label>
                  <input
                    type="text"
                    value={newLinkTitle}
                    onChange={e => setNewLinkTitle(e.target.value)}
                    placeholder="e.g., Government Portal, Project Figma, Spec Sheet"
                    className="w-full bg-[#2c2c2e] rounded-xl p-3 text-sm text-white focus:outline-none placeholder:text-[#636366]"
                    autoFocus
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-[#8e8e93] font-medium block">
                    URL or link (optional)
                  </label>
                  <input
                    type="url"
                    value={newLinkUrl}
                    onChange={e => setNewLinkUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full bg-[#2c2c2e] rounded-xl p-3 text-xs text-white focus:outline-none placeholder:text-[#636366]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={!newLinkTitle.trim()}
                  className="w-full py-2.5 rounded-xl bg-[#007aff] hover:bg-[#007aff]/90 disabled:opacity-40 text-white font-semibold text-xs transition cursor-pointer"
                >
                  Save Attachment
                </button>
              </form>
            )}

            {/* Form for Natural Language / AI Parse */}
            {addMode === 'ai' && (
              <form onSubmit={handleExecuteAi} className="space-y-3">
                <p className="text-xs text-[#8e8e93] leading-relaxed">
                  Type instructions in plain English. The AI parser will automatically extract next actions, tasks, waiting items, and dates.
                </p>
                <textarea
                  rows={3}
                  value={aiInput}
                  onChange={e => setAiInput(e.target.value)}
                  placeholder="e.g., Send employer form to Jason tomorrow, then check with the union, then wait for signed affidavit from Sarah"
                  className="w-full bg-[#2c2c2e] rounded-xl p-3 text-xs text-white focus:outline-none placeholder:text-[#636366] resize-none"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={!aiInput.trim()}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#007aff] to-[#5856d6] hover:opacity-95 disabled:opacity-40 text-white font-semibold text-xs transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Parse & Add</span>
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* 7. UNIFIED CLEAN FLOATING + ADD INTERACTION */}
      <div className="fixed bottom-14 right-5 sm:right-8 z-30">
        <div className="relative">
          {/* Quick Popover Menu */}
          {isAddMenuOpen && (
            <div
              className="absolute bottom-14 right-0 w-44 bg-[#252528] border border-white/10 rounded-2xl p-1.5 shadow-2xl backdrop-blur-xl space-y-1 animate-fadeIn"
              onClick={() => setIsAddMenuOpen(false)}
            >
              <button
                onClick={() => setAddMode('next')}
                className="w-full text-left px-3 py-2 text-xs text-[#007aff] font-semibold hover:bg-white/10 rounded-xl flex items-center gap-2 cursor-pointer transition"
              >
                <Zap className="w-3.5 h-3.5 text-[#007aff]" />
                <span>Next Action</span>
              </button>

              <button
                onClick={() => setAddMode('task')}
                className="w-full text-left px-3 py-2 text-xs text-white hover:bg-white/10 rounded-xl flex items-center gap-2 cursor-pointer transition"
              >
                <Check className="w-3.5 h-3.5 text-[#8e8e93]" />
                <span>To Do Task</span>
              </button>

              <button
                onClick={() => setAddMode('waiting')}
                className="w-full text-left px-3 py-2 text-xs text-[#ff9500] hover:bg-white/10 rounded-xl flex items-center gap-2 cursor-pointer transition"
              >
                <Clock className="w-3.5 h-3.5 text-[#ff9500]" />
                <span>Waiting Item</span>
              </button>

              <button
                onClick={() => setAddMode('file')}
                className="w-full text-left px-3 py-2 text-xs text-white hover:bg-white/10 rounded-xl flex items-center gap-2 cursor-pointer transition"
              >
                <LinkIcon className="w-3.5 h-3.5 text-[#8e8e93]" />
                <span>Note / Link</span>
              </button>

              <div className="h-px bg-white/[0.06] my-1" />

              <button
                onClick={() => setAddMode('ai')}
                className="w-full text-left px-3 py-2 text-xs text-[#af52de] font-medium hover:bg-white/10 rounded-xl flex items-center gap-2 cursor-pointer transition"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#af52de]" />
                <span>AI Natural Add</span>
              </button>
            </div>
          )}

          {/* Unified Floating Trigger Button */}
          <button
            onClick={() => setIsAddMenuOpen(!isAddMenuOpen)}
            className="w-12 h-12 rounded-full bg-[#007aff] hover:bg-[#007aff]/90 active:scale-95 text-white flex items-center justify-center shadow-2xl border border-white/20 transition cursor-pointer"
            title="Add item to project"
            aria-label="Add item"
          >
            <Plus className={`w-5 h-5 transition-transform duration-200 ${isAddMenuOpen ? 'rotate-45' : ''}`} />
          </button>
        </div>
      </div>
    </div>
  );
};
