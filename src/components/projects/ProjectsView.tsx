import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ProjectListItem } from './ProjectListItem';
import { ProjectDetailCard } from './ProjectDetailCard';
import { IndividualProjectView } from './IndividualProjectView';
import { Plus, Sparkles, X, List, LayoutList, Search } from 'lucide-react';
import { SCREEN_IDENTITIES } from '../../utils/screenIdentities';
import { parseNaturalProjectInstruction } from '../../utils/projectAiParser';
import { ProjectItem, ProjectPriorityLevel } from '../../types';
import { triggerHaptic } from '../../utils/haptics';

export const ProjectsView: React.FC = () => {
  const identity = SCREEN_IDENTITIES.projects;
  const {
    projects,
    addProject,
    updateProject,
    isMinimalMode,
    isQuickAddOpen,
    setIsQuickAddOpen,
  } = useApp();

  // Navigation within Projects: List View vs Individual Project View
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  // Quick Add Trigger Listener
  React.useEffect(() => {
    if (isQuickAddOpen) {
      setIsAiMode(false);
      setIsNewProjectModalOpen(true);
      setIsQuickAddOpen(false);
    }
  }, [isQuickAddOpen, setIsQuickAddOpen]);

  // Filter groups: Active | Waiting | Someday
  const [filterGroup, setFilterGroup] = useState<'active' | 'waiting' | 'someday'>('active');

  // Priority Filter for Active Projects
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'top' | 'intermediate' | 'regular'>('all');

  // Search query for projects and tasks
  const [searchQuery, setSearchQuery] = useState('');

  // View Mode: 'detail' (all subtasks, deadlines, and inline actions) vs 'regular' (compact list)
  const [viewMode, setViewMode] = useState<'regular' | 'detail'>(() => {
    return (localStorage.getItem('focusdo_projects_view_mode') as 'regular' | 'detail') || 'detail';
  });

  const handleViewModeChange = (mode: 'regular' | 'detail') => {
    triggerHaptic('light');
    setViewMode(mode);
    localStorage.setItem('focusdo_projects_view_mode', mode);
  };

  // Modal State
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [isAiMode, setIsAiMode] = useState(false);

  // Standard Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [firstNextAction, setFirstNextAction] = useState('');
  const [priorityLevel, setPriorityLevel] = useState<ProjectPriorityLevel>('regular');

  // AI / Natural Language Input State
  const [aiInput, setAiInput] = useState('');

  // If a project is selected, render Individual Project View
  const activeProject = projects.find(p => p.id === selectedProjectId);
  if (selectedProjectId && activeProject) {
    return (
      <IndividualProjectView
        project={activeProject}
        onBack={() => setSelectedProjectId(null)}
      />
    );
  }

  // Helper for priority ranking: Top Priority first, then Intermediate, then Regular
  const getPriorityRank = (p: ProjectItem): number => {
    const lvl = p.priorityLevel || (p.isPriority ? 'top' : 'regular');
    if (lvl === 'top') return 0;
    if (lvl === 'intermediate') return 1;
    return 2;
  };

  // Filter projects by group:
  // Active: status === 'active' (sorted with Top Priority on top)
  // Waiting: status === 'on_hold' or projects that have active waiting items
  // Someday: status === 'someday'
  const activeProjects = [...projects.filter(p => p.status === 'active')].sort(
    (a, b) => getPriorityRank(a) - getPriorityRank(b)
  );

  const topPriorityCount = activeProjects.filter(
    p => p.priorityLevel === 'top' || (!p.priorityLevel && p.isPriority)
  ).length;
  const intermediatePriorityCount = activeProjects.filter(
    p => p.priorityLevel === 'intermediate'
  ).length;
  const regularPriorityCount = activeProjects.filter(
    p => p.priorityLevel === 'regular' || (!p.priorityLevel && !p.isPriority)
  ).length;

  const filteredActiveProjects = activeProjects.filter(p => {
    if (priorityFilter === 'all') return true;
    const lvl = p.priorityLevel || (p.isPriority ? 'top' : 'regular');
    return lvl === priorityFilter;
  });

  const waitingProjects = projects.filter(
    p => p.status === 'on_hold' || (p.waitingItems && p.waitingItems.some(w => !w.completed))
  );
  const somedayProjects = projects.filter(p => p.status === 'someday');

  const rawList =
    filterGroup === 'active'
      ? filteredActiveProjects
      : filterGroup === 'waiting'
      ? waitingProjects
      : somedayProjects;

  const currentList = rawList.filter(p => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const nameMatch = p.name.toLowerCase().includes(q);
    const descMatch = (p.description || '').toLowerCase().includes(q);
    const notesMatch = (p.notes || '').toLowerCase().includes(q);
    const subtaskMatch = p.subtasks?.some(st => st.text.toLowerCase().includes(q));
    const waitingMatch = p.waitingItems?.some(w => w.title.toLowerCase().includes(q));
    return nameMatch || descMatch || notesMatch || subtaskMatch || waitingMatch;
  });

  // Handle standard creation
  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newId = 'pj_' + Date.now();
    const initialStatus = filterGroup === 'waiting' ? 'on_hold' : filterGroup === 'someday' ? 'someday' : 'active';

    addProject({
      name: name.trim(),
      description: description.trim(),
      status: initialStatus,
      deadline: deadline || undefined,
      priorityLevel,
      isPriority: priorityLevel === 'top',
      subtasks: firstNextAction.trim()
        ? [
            {
              id: 'st_' + Date.now(),
              text: firstNextAction.trim(),
              isNext: true,
              completed: false,
              order: 0,
            },
          ]
        : [],
    });

    setName('');
    setDescription('');
    setDeadline('');
    setFirstNextAction('');
    setPriorityLevel('regular');
    setIsNewProjectModalOpen(false);

    // Automatically navigate to the new project so the user can immediately execute
    setSelectedProjectId(newId);
  };

  // Handle AI Natural Language creation / routing
  const handleCreateWithAi = (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiInput.trim()) return;

    const parsed = parseNaturalProjectInstruction(aiInput);

    if (parsed.projectName) {
      // Check if project with similar name already exists
      const existing = projects.find(
        p => p.name.toLowerCase().includes(parsed.projectName!.toLowerCase()) ||
             parsed.projectName!.toLowerCase().includes(p.name.toLowerCase())
      );

      if (existing) {
        // Append parsed tasks and waiting items to existing project
        const updatedSubtasks = [...existing.subtasks];
        parsed.nextActions.forEach(na => {
          updatedSubtasks.unshift({
            id: 'st_' + Date.now() + Math.random().toString(36).substring(2, 4),
            text: na.text,
            description: na.description,
            date: na.date,
            isNext: true,
            completed: false,
            order: 0,
          });
        });

        parsed.todoTasks.forEach(td => {
          updatedSubtasks.push({
            id: 'st_' + Date.now() + Math.random().toString(36).substring(2, 4),
            text: td.text,
            description: td.description,
            date: td.date,
            isNext: false,
            completed: false,
            order: updatedSubtasks.length,
          });
        });

        const updatedWaiting = [...(existing.waitingItems || [])];
        parsed.waitingItems.forEach(wi => {
          updatedWaiting.push({
            id: 'wt_' + Date.now() + Math.random().toString(36).substring(2, 4),
            title: wi.title,
            waitingOn: wi.waitingOn,
            followUpDate: wi.followUpDate,
            completed: false,
            createdAt: new Date().toISOString(),
          });
        });

        updateProject(existing.id, {
          subtasks: updatedSubtasks,
          waitingItems: updatedWaiting,
        });

        setAiInput('');
        setIsNewProjectModalOpen(false);
        setSelectedProjectId(existing.id);
        return;
      }
    }

    // Otherwise create a new project from the parsed instructions
    const newProjName = parsed.projectName || 'New Project';
    const newId = 'pj_' + Date.now();

    const createdSubtasks = [
      ...parsed.nextActions.map(na => ({
        id: 'st_' + Date.now() + Math.random().toString(36).substring(2, 4),
        text: na.text,
        description: na.description,
        date: na.date,
        isNext: true,
        completed: false,
        order: 0,
      })),
      ...parsed.todoTasks.map((td, i) => ({
        id: 'st_' + Date.now() + Math.random().toString(36).substring(2, 4),
        text: td.text,
        description: td.description,
        date: td.date,
        isNext: false,
        completed: false,
        order: i + 1,
      })),
    ];

    const createdWaiting = parsed.waitingItems.map(wi => ({
      id: 'wt_' + Date.now() + Math.random().toString(36).substring(2, 4),
      title: wi.title,
      waitingOn: wi.waitingOn,
      followUpDate: wi.followUpDate,
      completed: false,
      createdAt: new Date().toISOString(),
    }));

    const parsedPriority = parsed.priorityLevel || 'regular';
    addProject({
      name: newProjName,
      description: 'Created via Quick Add',
      status: 'active',
      priorityLevel: parsedPriority,
      isPriority: parsedPriority === 'top',
      subtasks: createdSubtasks,
      waitingItems: createdWaiting,
    });

    setAiInput('');
    setIsNewProjectModalOpen(false);
    setSelectedProjectId(newId);
  };

  return (
    <div className={`pb-20 selection:bg-[#5e5ce6]/25 ${isMinimalMode ? 'space-y-3 pt-1' : 'space-y-4'}`}>
      {/* Standard Header with Title, Mode Switcher & New Project Action (Hidden in Minimal Mode) */}
      {!isMinimalMode && (
        <div className="flex items-center justify-between pt-1 gap-2 flex-wrap">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-100">
              Projects
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Active execution · {currentList.length} {filterGroup}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Mode Switcher: Regular vs Detail (Apple Segmented Control) */}
            <div className="flex items-center bg-[#141417] p-0.5 rounded-lg border border-white/[0.06] select-none">
              <button
                type="button"
                onClick={() => handleViewModeChange('regular')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 transition cursor-pointer ${
                  viewMode === 'regular'
                    ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
                title="Regular mode (compact list)"
              >
                <List className="w-3.5 h-3.5" />
                <span>Regular</span>
              </button>

              <button
                type="button"
                onClick={() => handleViewModeChange('detail')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 transition cursor-pointer ${
                  viewMode === 'detail'
                    ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
                title="Detail mode (shows subtasks & progress)"
              >
                <LayoutList className="w-3.5 h-3.5" />
                <span>Detail</span>
              </button>
            </div>

            <button
              onClick={() => {
                triggerHaptic('light');
                setIsAiMode(false);
                setIsNewProjectModalOpen(true);
              }}
              className="h-8 px-3 rounded-lg active:scale-95 text-white font-medium text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer bg-[#5e5ce6] hover:bg-[#5e5ce6]/90"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Project</span>
            </button>
          </div>
        </div>
      )}

      {/* Search Bar & Filter Controls (Hidden in Minimal Mode) */}
      {!isMinimalMode && (
        <div className="space-y-2.5">
          {/* Notion-style In-Page Search Bar */}
          <div className="relative flex items-center bg-[#141417] rounded-xl border border-white/[0.06] px-3 py-1.5 focus-within:border-[#5e5ce6]/50 transition-colors">
            <Search className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0 mr-2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search projects, tasks, or waiting items..."
              className="w-full bg-transparent text-xs sm:text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  setSearchQuery('');
                }}
                className="p-1 rounded-full text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.08] transition"
                title="Clear Search"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Simple Groups: Active | Waiting | Someday */}
          <div className="flex items-center bg-[#141417] p-0.5 rounded-lg border border-white/[0.06] select-none">
            {[
              { id: 'active', label: 'Active', count: activeProjects.length },
              { id: 'waiting', label: 'Waiting', count: waitingProjects.length },
              { id: 'someday', label: 'Someday', count: somedayProjects.length },
            ].map(group => {
              const isSelected = filterGroup === group.id;
              return (
                <button
                  key={group.id}
                  onClick={() => {
                    triggerHaptic('selection');
                    setFilterGroup(group.id as any);
                  }}
                  className={`flex-1 py-1 px-3 rounded-md text-xs font-medium transition cursor-pointer flex items-center justify-center gap-1.5 ${
                    isSelected
                      ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <span>{group.label}</span>
                  <span className={`text-[10px] font-mono ${isSelected ? 'text-zinc-300' : 'text-zinc-500'}`}>
                    ({group.count})
                  </span>
                </button>
              );
            })}
          </div>

          {/* Active Priority Filter (Quiet Segmented Line) */}
          {filterGroup === 'active' && (
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5 select-none text-xs">
              {[
                { id: 'all', label: 'All', count: activeProjects.length, dot: '' },
                { id: 'top', label: 'Top Priority', count: topPriorityCount, dot: 'bg-rose-500' },
                { id: 'intermediate', label: 'Intermediate', count: intermediatePriorityCount, dot: 'bg-amber-400' },
                { id: 'regular', label: 'Regular', count: regularPriorityCount, dot: 'bg-zinc-500' },
              ].map(p => {
                const isSelected = priorityFilter === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      triggerHaptic('selection');
                      setPriorityFilter(p.id as any);
                    }}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-white/[0.08] text-zinc-100'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.03]'
                    }`}
                  >
                    {p.dot && <span className={`w-1.5 h-1.5 rounded-full ${p.dot}`} />}
                    <span>{p.label}</span>
                    <span className="text-[10px] font-mono text-zinc-500">({p.count})</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Clean Minimal Projects List */}
      {currentList.length === 0 ? (
        <div className="bg-[#121215] rounded-xl p-8 text-center border border-white/[0.05] space-y-2">
          <p className="text-xs text-zinc-400">
            No {filterGroup} projects.
          </p>
          <button
            onClick={() => setIsNewProjectModalOpen(true)}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/[0.05] text-xs font-medium text-zinc-200 hover:bg-white/[0.08] transition cursor-pointer"
          >
            <Plus className="w-3 h-3 text-[#5e5ce6]" />
            <span>Create {filterGroup === 'someday' ? 'Someday' : ''} Project</span>
          </button>
        </div>
      ) : viewMode === 'detail' ? (
        <div className="grid grid-cols-1 landscape:grid-cols-2 gap-3">
          {currentList.map(project => (
            <ProjectDetailCard
              key={project.id}
              project={project}
              onOpenProject={id => {
                triggerHaptic('selection');
                setSelectedProjectId(id);
              }}
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 landscape:grid-cols-2 gap-2">
          {currentList.map(project => (
            <ProjectListItem
              key={project.id}
              project={project}
              onOpenProject={id => {
                triggerHaptic('selection');
                setSelectedProjectId(id);
              }}
            />
          ))}
        </div>
      )}

      {/* Minimal + New Project Modal with Natural Language / AI Support */}
      {isNewProjectModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-[#1c1c1e] border-t sm:border border-white/10 rounded-t-3xl sm:rounded-3xl w-full max-w-lg p-5 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-2 border-b border-[#2c2c2e]">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm text-white">
                  {isAiMode ? 'Quick Add with AI' : 'New Project'}
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsAiMode(!isAiMode)}
                  className={`text-xs px-2.5 py-1 rounded-full font-medium transition cursor-pointer flex items-center gap-1 ${
                    isAiMode
                      ? 'bg-[#007aff] text-white'
                      : 'bg-white/5 hover:bg-white/10 text-[#af52de]'
                  }`}
                >
                  <Sparkles className="w-3 h-3" />
                  <span>{isAiMode ? 'Standard Form' : 'AI Instructions'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsNewProjectModalOpen(false)}
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[#8e8e93] hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Standard Project Form */}
            {!isAiMode ? (
              <form onSubmit={handleCreateProject} className="space-y-4">
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-[#8e8e93] font-medium mb-1">
                      Project Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g., Website Redesign, PR Application"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      className="w-full bg-[#2c2c2e] rounded-xl p-3 text-sm text-white focus:outline-none placeholder:text-[#636366]"
                      autoFocus
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-[#8e8e93] font-medium mb-1">
                      Goal / Outcome (optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., Secure nomination certificate"
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      className="w-full bg-[#2c2c2e] rounded-xl p-3 text-xs text-white focus:outline-none placeholder:text-[#636366]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-[#8e8e93] font-medium mb-1">
                      First Next Action (optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., Send employer form to Jason"
                      value={firstNextAction}
                      onChange={e => setFirstNextAction(e.target.value)}
                      className="w-full bg-[#2c2c2e] rounded-xl p-3 text-xs text-white focus:outline-none placeholder:text-[#636366]"
                    />
                  </div>

                  {/* 3-Level Priority Choice */}
                  <div>
                    <label className="block text-xs text-[#8e8e93] font-medium mb-1.5">
                      Priority Level
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'top', label: 'Top Priority', dot: '🔴', desc: 'Highest urgency' },
                        { id: 'intermediate', label: 'Intermediate', dot: '🟡', desc: 'Active focus' },
                        { id: 'regular', label: 'Regular', dot: '⚪', desc: 'Standard project' },
                      ].map(p => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setPriorityLevel(p.id as ProjectPriorityLevel)}
                          className={`p-2.5 rounded-xl text-left border transition cursor-pointer flex flex-col justify-between ${
                            priorityLevel === p.id
                              ? 'bg-white/10 border-white/30 text-white shadow-sm'
                              : 'bg-[#2c2c2e]/60 border-transparent text-[#8e8e93] hover:text-white hover:bg-[#2c2c2e]'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 font-semibold text-xs text-white">
                            <span>{p.dot}</span>
                            <span className="truncate">{p.label}</span>
                          </div>
                          <span className="text-[10px] text-[#8e8e93] mt-1 block">
                            {p.desc}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-[#8e8e93] font-medium mb-1">
                      Target / Deadline (optional)
                    </label>
                    <input
                      type="date"
                      value={deadline}
                      onChange={e => setDeadline(e.target.value)}
                      className="bg-[#2c2c2e] text-white text-xs px-3 py-2 rounded-xl focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#2c2c2e]">
                  <button
                    type="button"
                    onClick={() => setIsNewProjectModalOpen(false)}
                    className="text-xs text-[#8e8e93] hover:text-white px-3 py-2 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!name.trim()}
                    className="text-xs text-white bg-[#007aff] hover:bg-[#007aff]/90 disabled:opacity-40 px-4 py-2 rounded-xl font-semibold transition cursor-pointer"
                  >
                    Create Project
                  </button>
                </div>
              </form>
            ) : (
              /* AI Natural Language Form */
              <form onSubmit={handleCreateWithAi} className="space-y-4">
                <div className="space-y-2">
                  <p className="text-xs text-[#8e8e93] leading-relaxed">
                    Type or paste plain English project instructions. For example:
                  </p>
                  <div className="bg-[#2c2c2e]/60 rounded-xl p-3 text-[11px] text-white/80 font-mono border border-white/[0.04]">
                    "For my PR project, send Jason the employer form tomorrow, then check with the union, then wait for signed affidavit"
                  </div>
                  <textarea
                    rows={4}
                    value={aiInput}
                    onChange={e => setAiInput(e.target.value)}
                    placeholder="Enter project instructions..."
                    className="w-full bg-[#2c2c2e] rounded-xl p-3 text-xs text-white focus:outline-none placeholder:text-[#636366] resize-none"
                    autoFocus
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#2c2c2e]">
                  <button
                    type="button"
                    onClick={() => setIsNewProjectModalOpen(false)}
                    className="text-xs text-[#8e8e93] hover:text-white px-3 py-2 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!aiInput.trim()}
                    className="text-xs text-white bg-gradient-to-r from-[#007aff] to-[#af52de] hover:opacity-95 disabled:opacity-40 px-4 py-2 rounded-xl font-semibold transition cursor-pointer flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Execute & Open</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
