import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  LearningType,
  PhaseAllocation,
} from '../../types';
import {
  BookOpen,
  Plus,
  Trash2,
  Check,
  Layers,
  Compass,
  Search,
  X,
  Filter,
} from 'lucide-react';
import { SCREEN_IDENTITIES } from '../../utils/screenIdentities';
import { triggerHaptic } from '../../utils/haptics';

const TYPE_LABELS: Record<LearningType, { label: string; duration: string }> = {
  quick: { label: 'Quick', duration: 'Hours/1 Day' },
  topic: { label: 'Topic', duration: 'Several Days' },
  concept: { label: 'Concept', duration: 'Deep Dive' },
  skill: { label: 'Skill', duration: 'Multi-Week' },
};

export const LearningView: React.FC = () => {
  const {
    learning,
    addLearning,
    updateLearning,
    deleteLearning,
    phases,
    addPhase,
    deletePhase,
    togglePhaseAllocation,
    seasons,
    addSeason,
    deleteSeason,
    isMinimalMode,
    isQuickAddOpen,
    setIsQuickAddOpen,
  } = useApp();

  // Quick Add listener
  React.useEffect(() => {
    if (isQuickAddOpen) {
      setIsAddLearningModalOpen(true);
      setIsQuickAddOpen(false);
    }
  }, [isQuickAddOpen, setIsQuickAddOpen]);

  // Modals
  const [isAddLearningModalOpen, setIsAddLearningModalOpen] = useState(false);
  const [isAddPhaseModalOpen, setIsAddPhaseModalOpen] = useState(false);
  const [isAddSeasonModalOpen, setIsAddSeasonModalOpen] = useState(false);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | LearningType>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'planned' | 'in_progress' | 'completed'>('all');

  // Learning Form State
  const [topic, setTopic] = useState('');
  const [whatToLearn, setWhatToLearn] = useState('');
  const [learningType, setLearningType] = useState<LearningType>('topic');
  const [learningNotes, setLearningNotes] = useState('');

  // Phase Form State
  const [phaseTitle, setPhaseTitle] = useState('');
  const [phaseStart, setPhaseStart] = useState('');
  const [phaseEnd, setPhaseEnd] = useState('');
  const [phaseAllocations, setPhaseAllocations] = useState<{ label: string; periodText: string }[]>([
    { label: '', periodText: 'Week 1' },
    { label: '', periodText: 'Week 2' },
  ]);
  const [phaseNotes, setPhaseNotes] = useState('');

  // Season Form State
  const [seasonTitle, setSeasonTitle] = useState('');
  const [seasonStart, setSeasonStart] = useState('');
  const [seasonEnd, setSeasonEnd] = useState('');
  const [seasonFocus, setSeasonFocus] = useState('');

  // Handlers
  const handleCreateLearning = (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;

    addLearning({
      topic: topic.trim(),
      whatToLearn: whatToLearn.trim(),
      type: learningType,
      notes: learningNotes.trim() || undefined,
      status: 'planned',
      progressPercent: 0,
    });

    setTopic('');
    setWhatToLearn('');
    setLearningNotes('');
    setIsAddLearningModalOpen(false);
  };

  const handleCreatePhase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phaseTitle.trim()) return;

    const allocations: PhaseAllocation[] = phaseAllocations
      .filter(a => a.label.trim())
      .map((a, idx) => ({
        id: 'al_' + Date.now() + idx,
        label: a.label.trim(),
        periodText: a.periodText.trim() || `Week ${idx + 1}`,
        completed: false,
      }));

    addPhase({
      title: phaseTitle.trim(),
      startDate: phaseStart,
      endDate: phaseEnd,
      allocations,
      notes: phaseNotes.trim() || undefined,
    });

    setPhaseTitle('');
    setPhaseStart('');
    setPhaseEnd('');
    setPhaseAllocations([
      { label: '', periodText: 'Week 1' },
      { label: '', periodText: 'Week 2' },
    ]);
    setPhaseNotes('');
    setIsAddPhaseModalOpen(false);
  };

  const handleCreateSeason = (e: React.FormEvent) => {
    e.preventDefault();
    if (!seasonTitle.trim()) return;

    addSeason({
      title: seasonTitle.trim(),
      startDate: seasonStart,
      endDate: seasonEnd,
      broadFocus: seasonFocus.trim(),
    });

    setSeasonTitle('');
    setSeasonStart('');
    setSeasonEnd('');
    setSeasonFocus('');
    setIsAddSeasonModalOpen(false);
  };

  const identity = SCREEN_IDENTITIES.learning;

  return (
    <div className={`pb-20 ${isMinimalMode ? 'space-y-3 pt-1' : 'space-y-6'}`}>
      {/* 1. SEASONS (~2 Months Horizon) (Hidden in Minimal Mode) */}
      {!isMinimalMode && (
        <section className="space-y-2.5">
          <div className="flex items-center justify-between px-0.5">
            <div>
              <h3 className="text-sm font-semibold flex items-center gap-1.5 text-zinc-100">
                <Compass className="w-4 h-4 text-[#bf5af2]" />
                <span>Seasons (~2 Months)</span>
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                Broad thematic horizons for the season ahead
              </p>
            </div>
            <button
              onClick={() => setIsAddSeasonModalOpen(true)}
              className="h-7 px-2.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-zinc-200 text-xs font-medium flex items-center gap-1 cursor-pointer transition border border-white/[0.06]"
            >
              <Plus className="w-3 h-3 text-[#bf5af2]" />
              <span>Add Season</span>
            </button>
          </div>

          {seasons.length === 0 ? (
            <div className="bg-[#121215] rounded-xl p-5 text-center border border-white/[0.06] text-xs text-zinc-500">
              No seasons created yet. A Season defines your broader 2-month focus.
            </div>
          ) : (
            <div className="space-y-2">
              {seasons.map(season => (
                <div
                  key={season.id}
                  className="bg-[#121215] rounded-xl p-4 border border-white/[0.06] space-y-2 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-[11px] font-medium text-[#bf5af2]">
                        Season Mission
                      </span>
                      <h4 className="text-[15px] font-medium text-zinc-100">
                        {season.title}
                      </h4>
                      {(season.startDate || season.endDate) && (
                        <p className="text-[11px] text-zinc-500 font-mono mt-0.5">
                          {season.startDate} → {season.endDate}
                        </p>
                      )}
                    </div>

                    <button
                      onClick={() => deleteSeason(season.id)}
                      className="w-6 h-6 rounded-md text-zinc-500 hover:text-rose-400 hover:bg-white/[0.04] flex items-center justify-center transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <p className="text-xs text-zinc-300 leading-relaxed">
                    {season.broadFocus}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* 2. PHASES (~2 Weeks Focus Blocks) (Hidden in Minimal Mode) */}
      {!isMinimalMode && (
        <section className="space-y-2.5">
          <div className="flex items-center justify-between px-0.5">
            <div>
              <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-amber-500" />
                <span>Phases (~2 Weeks)</span>
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                Two-week sprint allocations and priorities
              </p>
            </div>
            <button
              onClick={() => setIsAddPhaseModalOpen(true)}
              className="h-7 px-2.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-zinc-200 text-xs font-medium flex items-center gap-1 cursor-pointer transition border border-white/[0.06]"
            >
              <Plus className="w-3 h-3 text-amber-500" />
              <span>Add Phase</span>
            </button>
          </div>

          {phases.length === 0 ? (
            <div className="bg-[#121215] rounded-xl p-5 text-center border border-white/[0.06] text-xs text-zinc-500">
              No 2-week phases planned yet.
            </div>
          ) : (
            <div className="space-y-2">
              {phases.map(phase => (
                <div
                  key={phase.id}
                  className="bg-[#121215] rounded-xl p-4 border border-white/[0.06] space-y-3 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="text-[15px] font-medium text-zinc-100">
                        {phase.title}
                      </h4>
                      {(phase.startDate || phase.endDate) && (
                        <p className="text-[11px] text-zinc-500 font-mono mt-0.5">
                          {phase.startDate} → {phase.endDate}
                        </p>
                      )}
                    </div>

                    <button
                      onClick={() => deletePhase(phase.id)}
                      className="w-6 h-6 rounded-md text-zinc-500 hover:text-rose-400 hover:bg-white/[0.04] flex items-center justify-center transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Focus Allocations */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {phase.allocations.map(alloc => (
                      <button
                        key={alloc.id}
                        onClick={() => togglePhaseAllocation(phase.id, alloc.id)}
                        className={`p-2.5 rounded-lg text-left flex items-start gap-2.5 transition cursor-pointer border ${
                          alloc.completed
                            ? 'bg-black/20 border-transparent text-zinc-500'
                            : 'bg-white/[0.03] border-white/[0.04] text-zinc-200 hover:bg-white/[0.06]'
                        }`}
                      >
                        <div
                          className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center mt-0.5 flex-shrink-0 ${
                            alloc.completed
                              ? 'bg-emerald-500 border-emerald-500 text-white'
                              : 'border-zinc-600'
                          }`}
                        >
                          {alloc.completed && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                        </div>
                        <div className="min-w-0">
                          <span className="text-[10px] font-medium text-amber-400 block font-mono">
                            {alloc.periodText}
                          </span>
                          <span className={`text-xs ${alloc.completed ? 'line-through text-zinc-500' : ''}`}>
                            {alloc.label}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>

                  {phase.notes && (
                    <p className="text-xs text-zinc-400 bg-black/20 p-2.5 rounded-lg">
                      {phase.notes}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* 3. LEARNING QUEUE */}
      <section className="space-y-2.5">
        {!isMinimalMode && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between px-0.5">
              <div>
                <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-[#0a84ff]" />
                  <span>Learning Queue ({learning.length})</span>
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Specific topics, skills, and concepts to learn
                </p>
              </div>
              <button
                onClick={() => {
                  triggerHaptic('light');
                  setIsAddLearningModalOpen(true);
                }}
                className="h-8 px-3 rounded-lg bg-[#0a84ff] hover:bg-[#0a84ff]/90 text-white text-xs font-medium flex items-center gap-1 cursor-pointer transition shadow-sm active:scale-95"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Add Item</span>
              </button>
            </div>

            {/* In-Page Search Bar */}
            <div className="relative flex items-center bg-[#141417] rounded-lg border border-white/[0.06] px-3 py-1.5 focus-within:border-white/20 transition-colors">
              <Search className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0 mr-2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search learning topics, notes, or skills..."
                className="w-full bg-transparent text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    setSearchQuery('');
                  }}
                  className="p-0.5 rounded text-zinc-500 hover:text-white transition"
                  title="Clear Search"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Filter Pills for Type & Status */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 select-none">
              <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider pl-0.5 pr-0.5 flex-shrink-0 flex items-center gap-1">
                <Filter className="w-2.5 h-2.5" />
                Type:
              </span>
              {[
                { id: 'all', label: 'All' },
                { id: 'quick', label: 'Quick' },
                { id: 'topic', label: 'Topic' },
                { id: 'concept', label: 'Concept' },
                { id: 'skill', label: 'Skill' },
              ].map(pill => {
                const active = typeFilter === pill.id;
                return (
                  <button
                    key={pill.id}
                    type="button"
                    onClick={() => {
                      triggerHaptic('selection');
                      setTypeFilter(pill.id as any);
                    }}
                    className={`px-2 py-0.5 rounded-md text-[11px] font-medium whitespace-nowrap transition cursor-pointer ${
                      active
                        ? 'bg-white/[0.12] text-zinc-100'
                        : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    {pill.label}
                  </button>
                );
              })}

              <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider pl-2 pr-0.5 flex-shrink-0">
                Status:
              </span>
              {[
                { id: 'all', label: 'All' },
                { id: 'planned', label: 'Planned' },
                { id: 'in_progress', label: 'In Progress' },
                { id: 'completed', label: 'Done' },
              ].map(st => {
                const active = statusFilter === st.id;
                return (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => {
                      triggerHaptic('selection');
                      setStatusFilter(st.id as any);
                    }}
                    className={`px-2 py-0.5 rounded-md text-[11px] font-medium whitespace-nowrap transition cursor-pointer ${
                      active
                        ? 'bg-[#bf5af2]/20 text-[#bf5af2] border border-[#bf5af2]/40 font-medium'
                        : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    {st.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {(() => {
          const filteredLearning = learning.filter(item => {
            if (typeFilter !== 'all' && item.type !== typeFilter) return false;
            if (statusFilter !== 'all' && item.status !== statusFilter) return false;
            if (!searchQuery.trim()) return true;
            const q = searchQuery.toLowerCase();
            return (
              item.topic.toLowerCase().includes(q) ||
              item.whatToLearn.toLowerCase().includes(q) ||
              (item.notes || '').toLowerCase().includes(q)
            );
          });

          if (filteredLearning.length === 0) {
            return (
              <div className="bg-[#121215] rounded-xl p-6 text-center border border-white/[0.06] text-xs text-zinc-500">
                {searchQuery ? `No learning items matching "${searchQuery}".` : 'No learning items in queue.'}
              </div>
            );
          }

          return (
            <div className="grid grid-cols-1 landscape:grid-cols-2 gap-2.5">
              {filteredLearning.map(item => {
              const isDone = item.status === 'completed';
              const typeInfo = TYPE_LABELS[item.type] || TYPE_LABELS.topic;

              return (
                <div
                  key={item.id}
                  className="bg-[#121215] rounded-xl p-4 border border-white/[0.06] space-y-2.5 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 font-mono">
                        <span className="font-medium text-[#0a84ff]">{typeInfo.label}</span>
                        <span aria-hidden="true">·</span>
                        <span>{typeInfo.duration}</span>
                        <span aria-hidden="true">·</span>
                        <span className="capitalize">{item.status.replace('_', ' ')}</span>
                      </div>

                      <h4
                        className={`text-[15px] font-medium ${
                          isDone ? 'line-through text-zinc-500' : 'text-zinc-100'
                        }`}
                      >
                        {item.topic}
                      </h4>

                      <p className="text-xs text-zinc-400 leading-relaxed">
                        {item.whatToLearn}
                      </p>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() =>
                          updateLearning(item.id, {
                            status: isDone ? 'in_progress' : 'completed',
                            progressPercent: isDone ? 50 : 100,
                          })
                        }
                        className={`w-6 h-6 rounded-full flex items-center justify-center transition cursor-pointer ${
                          isDone
                            ? 'bg-emerald-500 text-white'
                            : 'text-zinc-500 hover:text-white hover:bg-white/[0.06]'
                        }`}
                      >
                        <Check className="w-3 h-3 stroke-[3]" />
                      </button>
                      <button
                        onClick={() => deleteLearning(item.id)}
                        className="w-6 h-6 rounded-md text-zinc-500 hover:text-rose-400 hover:bg-white/[0.06] flex items-center justify-center transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {item.notes && (
                    <p className="text-xs text-zinc-400 bg-black/20 p-2.5 rounded-lg">
                      {item.notes}
                    </p>
                  )}

                  {/* Clean Apple Slider for Progress */}
                  <div className="flex items-center justify-between gap-4 pt-1">
                    <span className="text-[11px] text-zinc-500 font-mono">
                      Progress: {item.progressPercent ?? 0}%
                    </span>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={10}
                      value={item.progressPercent ?? 0}
                      onChange={e =>
                        updateLearning(item.id, {
                          progressPercent: Number(e.target.value),
                          status:
                            Number(e.target.value) === 100
                              ? 'completed'
                              : Number(e.target.value) > 0
                              ? 'in_progress'
                              : 'planned',
                        })
                      }
                      className="w-32 accent-[#0a84ff] h-1 bg-white/10 rounded-full cursor-pointer"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        );
      })()}
      </section>

      {/* Modal: New Learning Item */}
      {isAddLearningModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-[#18181b] border-t sm:border border-white/10 rounded-t-2xl sm:rounded-2xl w-full max-w-lg p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
              <button
                type="button"
                onClick={() => setIsAddLearningModalOpen(false)}
                className="text-xs text-zinc-400 hover:text-white font-medium cursor-pointer"
              >
                Cancel
              </button>
              <h3 className="font-medium text-sm text-zinc-100">
                New Learning Item
              </h3>
              <button
                onClick={handleCreateLearning}
                className="text-xs text-[#0a84ff] font-medium hover:underline cursor-pointer"
              >
                Add
              </button>
            </div>

            <form onSubmit={handleCreateLearning} className="space-y-3.5">
              <div className="bg-[#121215] rounded-xl p-3 space-y-2.5 border border-white/[0.06]">
                <input
                  type="text"
                  required
                  placeholder="Topic (e.g., Firearms basics, Auto maintenance)"
                  value={topic}
                  onChange={e => setTopic(e.target.value)}
                  className="w-full bg-transparent text-zinc-100 text-sm focus:outline-none placeholder:text-zinc-600"
                  autoFocus
                />
                <textarea
                  rows={2}
                  required
                  placeholder="What specifically do you want to understand?"
                  value={whatToLearn}
                  onChange={e => setWhatToLearn(e.target.value)}
                  className="w-full bg-transparent text-zinc-200 text-xs focus:outline-none border-t border-white/[0.06] pt-2 placeholder:text-zinc-600 resize-none"
                />
              </div>

              <div>
                <label className="block text-[11px] text-zinc-400 font-medium mb-1.5 px-0.5">
                  Scope
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {(['quick', 'topic', 'concept', 'skill'] as LearningType[]).map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setLearningType(t)}
                      className={`py-1.5 rounded-lg text-xs font-medium transition cursor-pointer border ${
                        learningType === t
                          ? 'bg-[#0a84ff]/20 text-[#0a84ff] border-[#0a84ff]/40 font-medium'
                          : 'bg-white/[0.03] text-zinc-400 border-white/[0.04] hover:text-white'
                      }`}
                    >
                      <span className="capitalize block">{t}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-[#121215] rounded-xl p-3 border border-white/[0.06]">
                <input
                  type="text"
                  placeholder="Notes, book references, or link"
                  value={learningNotes}
                  onChange={e => setLearningNotes(e.target.value)}
                  className="w-full bg-transparent text-zinc-200 text-xs focus:outline-none placeholder:text-zinc-600"
                />
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: New Phase */}
      {isAddPhaseModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-[#18181b] border-t sm:border border-white/10 rounded-t-2xl sm:rounded-2xl w-full max-w-lg p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
              <button
                type="button"
                onClick={() => setIsAddPhaseModalOpen(false)}
                className="text-xs text-zinc-400 hover:text-white font-medium cursor-pointer"
              >
                Cancel
              </button>
              <h3 className="font-medium text-sm text-zinc-100">
                Create 2-Week Phase
              </h3>
              <button
                onClick={handleCreatePhase}
                className="text-xs text-amber-400 font-medium hover:text-amber-300 cursor-pointer"
              >
                Save
              </button>
            </div>

            <form onSubmit={handleCreatePhase} className="space-y-3.5">
              <div className="bg-[#121215] rounded-xl p-3 space-y-2.5 border border-white/[0.06]">
                <input
                  type="text"
                  required
                  placeholder="Phase Title (e.g., Phase: Sept 21 – Oct 4)"
                  value={phaseTitle}
                  onChange={e => setPhaseTitle(e.target.value)}
                  className="w-full bg-transparent text-zinc-100 text-sm focus:outline-none placeholder:text-zinc-600"
                  autoFocus
                />
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/[0.06]">
                  <input
                    type="date"
                    value={phaseStart}
                    onChange={e => setPhaseStart(e.target.value)}
                    className="bg-transparent text-zinc-200 text-xs focus:outline-none"
                  />
                  <input
                    type="date"
                    value={phaseEnd}
                    onChange={e => setPhaseEnd(e.target.value)}
                    className="bg-transparent text-zinc-200 text-xs focus:outline-none"
                  />
                </div>
              </div>

              {/* Allocations */}
              <div className="bg-[#121215] rounded-xl p-3 space-y-2 border border-white/[0.06]">
                <span className="text-[11px] text-zinc-400 font-medium block">
                  Focus Allocations
                </span>
                {phaseAllocations.map((alloc, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="e.g. Week 1"
                      value={alloc.periodText}
                      onChange={e => {
                        const copy = [...phaseAllocations];
                        copy[idx].periodText = e.target.value;
                        setPhaseAllocations(copy);
                      }}
                      className="w-20 bg-black/30 px-2 py-1.5 rounded-lg text-xs text-amber-400 font-medium border border-white/[0.04]"
                    />
                    <input
                      type="text"
                      placeholder={`e.g. ${idx === 0 ? 'Firearms basics' : 'Personal website'}`}
                      value={alloc.label}
                      onChange={e => {
                        const copy = [...phaseAllocations];
                        copy[idx].label = e.target.value;
                        setPhaseAllocations(copy);
                      }}
                      className="flex-1 bg-black/30 px-3 py-1.5 rounded-lg text-xs text-zinc-200 border border-white/[0.04]"
                    />
                  </div>
                ))}
              </div>

              <div className="bg-[#121215] rounded-xl p-3 border border-white/[0.06]">
                <input
                  type="text"
                  placeholder="Phase rule or boundary notes"
                  value={phaseNotes}
                  onChange={e => setPhaseNotes(e.target.value)}
                  className="w-full bg-transparent text-zinc-200 text-xs focus:outline-none placeholder:text-zinc-600"
                />
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: New Season */}
      {isAddSeasonModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-[#18181b] border-t sm:border border-white/10 rounded-t-2xl sm:rounded-2xl w-full max-w-lg p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
              <button
                type="button"
                onClick={() => setIsAddSeasonModalOpen(false)}
                className="text-xs text-zinc-400 hover:text-white font-medium cursor-pointer"
              >
                Cancel
              </button>
              <h3 className="font-medium text-sm text-zinc-100">
                New Season
              </h3>
              <button
                onClick={handleCreateSeason}
                className="text-xs text-[#bf5af2] font-medium hover:underline cursor-pointer"
              >
                Save
              </button>
            </div>

            <form onSubmit={handleCreateSeason} className="space-y-3.5">
              <div className="bg-[#121215] rounded-xl p-3 space-y-2.5 border border-white/[0.06]">
                <input
                  type="text"
                  required
                  placeholder="Season Title (e.g., Season 1: Groundwork & Health)"
                  value={seasonTitle}
                  onChange={e => setSeasonTitle(e.target.value)}
                  className="w-full bg-transparent text-zinc-100 text-sm focus:outline-none placeholder:text-zinc-600"
                  autoFocus
                />
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/[0.06]">
                  <input
                    type="date"
                    value={seasonStart}
                    onChange={e => setSeasonStart(e.target.value)}
                    className="bg-transparent text-zinc-200 text-xs focus:outline-none"
                  />
                  <input
                    type="date"
                    value={seasonEnd}
                    onChange={e => setSeasonEnd(e.target.value)}
                    className="bg-transparent text-zinc-200 text-xs focus:outline-none"
                  />
                </div>
              </div>

              <div className="bg-[#121215] rounded-xl p-3 border border-white/[0.06]">
                <textarea
                  rows={2}
                  required
                  placeholder="Overarching focus and intent for these 2 months"
                  value={seasonFocus}
                  onChange={e => setSeasonFocus(e.target.value)}
                  className="w-full bg-transparent text-zinc-200 text-xs focus:outline-none placeholder:text-zinc-600 resize-none"
                />
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
