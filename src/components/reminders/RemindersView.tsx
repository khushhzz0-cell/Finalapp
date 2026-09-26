import React, { useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { ReminderMediaType } from '../../types';
import {
  Plus,
  Trash2,
  Image,
  Mic,
  Video,
  FileText,
  ArrowUp,
  ArrowDown,
  Search,
  Filter,
  X,
} from 'lucide-react';
import { SCREEN_IDENTITIES } from '../../utils/screenIdentities';
import { triggerHaptic } from '../../utils/haptics';

export const RemindersView: React.FC = () => {
  const identity = SCREEN_IDENTITIES.reminders;
  const {
    reminders,
    addReminder,
    deleteReminder,
    reorderReminders,
    isMinimalMode,
    isQuickAddOpen,
    setIsQuickAddOpen,
  } = useApp();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [mediaFilter, setMediaFilter] = useState<'all' | ReminderMediaType>('all');

  // Quick Add listener
  React.useEffect(() => {
    if (isQuickAddOpen) {
      setIsModalOpen(true);
      setIsQuickAddOpen(false);
    }
  }, [isQuickAddOpen, setIsQuickAddOpen]);

  // Form state
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [mediaType, setMediaType] = useState<ReminderMediaType>('text');
  const [mediaData, setMediaData] = useState('');

  // Audio recording state
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // File upload input ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setMediaData(result);
      if (file.type.startsWith('image/')) setMediaType('photo');
      else if (file.type.startsWith('video/')) setMediaType('video');
      else if (file.type.startsWith('audio/')) setMediaType('audio');
    };
    reader.readAsDataURL(file);
  };

  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = event => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          setMediaData(reader.result as string);
          setMediaType('audio');
        };
        reader.readAsDataURL(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Audio capture error:', err);
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    addReminder({
      title: title.trim(),
      notes: notes.trim() || undefined,
      mediaType,
      mediaData: mediaData || undefined,
    });

    setTitle('');
    setNotes('');
    setMediaType('text');
    setMediaData('');
    setIsModalOpen(false);
  };

  const moveReminder = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= reminders.length) return;
    reorderReminders(index, targetIndex);
  };

  const filteredReminders = reminders.filter(rem => {
    if (mediaFilter !== 'all' && rem.mediaType !== mediaFilter) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return rem.title.toLowerCase().includes(q) || (rem.notes || '').toLowerCase().includes(q);
  });

  return (
    <div className={`pb-20 ${isMinimalMode ? 'space-y-3 pt-1' : 'space-y-4'}`}>
      {/* Header (Hidden in Minimal Mode) */}
      {!isMinimalMode && (
        <div className="space-y-2.5 pt-1">
          <div className="flex items-center justify-between">
            <div>
              <h2
                className="text-lg font-semibold tracking-tight"
                style={{ color: identity.tintWhite }}
              >
                Reminders
              </h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                Keep in mind board for notes, pictures, and voice clips
              </p>
            </div>

            <button
              onClick={() => {
                triggerHaptic('light');
                setIsModalOpen(true);
              }}
              className="h-8 px-3 rounded-lg bg-[#0a84ff] hover:bg-[#0a84ff]/90 text-white font-medium text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>New Reminder</span>
            </button>
          </div>

          {/* In-Page Search Bar */}
          <div className="relative flex items-center bg-[#141417] rounded-lg border border-white/[0.06] px-3 py-1.5 focus-within:border-white/20 transition-colors">
            <Search className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0 mr-2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search reminders or notes..."
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

          {/* Media Type Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 select-none">
            <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider pl-0.5 pr-0.5 flex-shrink-0 flex items-center gap-1">
              <Filter className="w-2.5 h-2.5" />
              Type:
            </span>
            {[
              { id: 'all', label: 'All', count: reminders.length },
              { id: 'text', label: 'Text', count: reminders.filter(r => r.mediaType === 'text').length },
              { id: 'photo', label: 'Photo', count: reminders.filter(r => r.mediaType === 'photo').length },
              { id: 'audio', label: 'Audio', count: reminders.filter(r => r.mediaType === 'audio').length },
              { id: 'video', label: 'Video', count: reminders.filter(r => r.mediaType === 'video').length },
            ].map(pill => {
              const active = mediaFilter === pill.id;
              return (
                <button
                  key={pill.id}
                  type="button"
                  onClick={() => {
                    triggerHaptic('selection');
                    setMediaFilter(pill.id as any);
                  }}
                  className={`px-2 py-0.5 rounded-md text-[11px] font-medium whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                    active
                      ? 'bg-white/[0.12] text-zinc-100'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  <span>{pill.label}</span>
                  <span
                    className={`text-[10px] font-mono px-1 rounded ${
                      active ? 'bg-white/20 text-white' : 'text-zinc-600'
                    }`}
                  >
                    {pill.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Reminders List */}
      {filteredReminders.length === 0 ? (
        <div className="bg-[#121215] rounded-xl p-8 text-center border border-white/[0.06] text-xs text-zinc-500">
          {searchQuery ? `No reminders matching "${searchQuery}".` : 'No reminders saved. Pin insights, photos, and voice notes here.'}
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredReminders.map((rem, idx) => (
            <div
              key={rem.id}
              className="bg-[#121215] rounded-xl p-4 border border-white/[0.06] space-y-2.5 shadow-sm group transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 font-mono">
                    <span className="text-[#0a84ff] font-medium capitalize">
                      {rem.mediaType}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>
                      {rem.createdAt.slice(0, 10)}
                    </span>
                  </div>

                  <h3 className="text-[15px] font-medium text-zinc-100">
                    {rem.title}
                  </h3>

                  {rem.notes && (
                    <p className="text-xs text-zinc-400 leading-relaxed whitespace-pre-wrap">
                      {rem.notes}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => moveReminder(idx, 'up')}
                    disabled={idx === 0}
                    className="w-6 h-6 rounded-md text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.04] flex items-center justify-center disabled:opacity-20 transition cursor-pointer"
                    title="Move up"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => moveReminder(idx, 'down')}
                    disabled={idx === reminders.length - 1}
                    className="w-6 h-6 rounded-md text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.04] flex items-center justify-center disabled:opacity-20 transition cursor-pointer"
                    title="Move down"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => deleteReminder(rem.id)}
                    className="w-6 h-6 rounded-md text-zinc-500 hover:text-rose-400 hover:bg-white/[0.04] flex items-center justify-center transition cursor-pointer"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Media Previews */}
              {rem.mediaData && rem.mediaType === 'photo' && (
                <div className="rounded-lg overflow-hidden border border-white/[0.06] max-h-64 bg-black/40">
                  <img
                    src={rem.mediaData}
                    alt={rem.title}
                    className="w-full h-full object-contain"
                  />
                </div>
              )}

              {rem.mediaData && rem.mediaType === 'video' && (
                <div className="rounded-lg overflow-hidden border border-white/[0.06] max-h-64 bg-black">
                  <video
                    src={rem.mediaData}
                    controls
                    className="w-full h-full max-h-64"
                  />
                </div>
              )}

              {rem.mediaData && rem.mediaType === 'audio' && (
                <div className="p-2.5 rounded-lg bg-black/20 border border-white/[0.06]">
                  <audio src={rem.mediaData} controls className="w-full h-8" />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* New Reminder Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-[#18181b] border-t sm:border border-white/10 rounded-t-2xl sm:rounded-2xl w-full max-w-lg p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-xs text-zinc-400 hover:text-white font-medium cursor-pointer"
              >
                Cancel
              </button>
              <h3 className="font-medium text-sm text-zinc-100">
                New Reminder
              </h3>
              <button
                onClick={handleCreate}
                className="text-xs text-[#0a84ff] font-medium hover:underline cursor-pointer"
              >
                Save
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3.5">
              <div className="bg-[#121215] rounded-xl p-3 space-y-2.5 border border-white/[0.06]">
                <input
                  type="text"
                  required
                  placeholder="Reminder Title"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full bg-transparent text-zinc-100 text-sm focus:outline-none placeholder:text-zinc-600"
                  autoFocus
                />
                <textarea
                  rows={2}
                  placeholder="Details, thoughts, reflections..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full bg-transparent text-zinc-200 text-xs focus:outline-none border-t border-white/[0.06] pt-2 placeholder:text-zinc-600 resize-none"
                />
              </div>

              {/* Media Picker */}
              <div>
                <label className="block text-[11px] text-zinc-400 font-medium mb-1.5 px-0.5">
                  Attach Media (Optional)
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { id: 'text', label: 'Text', icon: FileText },
                    { id: 'photo', label: 'Photo', icon: Image },
                    { id: 'audio', label: 'Voice', icon: Mic },
                    { id: 'video', label: 'Video', icon: Video },
                  ].map(m => {
                    const Icon = m.icon;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setMediaType(m.id as ReminderMediaType)}
                        className={`py-2 rounded-lg text-xs font-medium flex flex-col items-center gap-1 transition cursor-pointer border ${
                          mediaType === m.id
                            ? 'bg-[#0a84ff]/20 text-[#0a84ff] border-[#0a84ff]/40 font-medium'
                            : 'bg-white/[0.03] text-zinc-400 border-white/[0.04] hover:text-white'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span>{m.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Upload file button for photo or video */}
              {(mediaType === 'photo' || mediaType === 'video') && (
                <div className="bg-[#121215] rounded-xl p-3 space-y-2 border border-white/[0.06]">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={mediaType === 'photo' ? 'image/*' : 'video/*'}
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-xs text-[#0a84ff] font-medium border border-white/[0.06] cursor-pointer"
                  >
                    Select {mediaType === 'photo' ? 'Photo' : 'Video'} File
                  </button>
                  {mediaData && (
                    <p className="text-[11px] text-emerald-400 text-center font-medium">
                      File attached successfully!
                    </p>
                  )}
                </div>
              )}

              {/* Voice recording button */}
              {mediaType === 'audio' && (
                <div className="bg-[#121215] rounded-xl p-3 space-y-2 text-center border border-white/[0.06]">
                  {isRecording ? (
                    <button
                      type="button"
                      onClick={stopVoiceRecording}
                      className="px-4 py-1.5 rounded-lg bg-rose-500 text-white text-xs font-medium animate-pulse cursor-pointer"
                    >
                      Stop Recording
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={startVoiceRecording}
                      className="px-4 py-1.5 rounded-lg bg-[#0a84ff] text-white text-xs font-medium cursor-pointer"
                    >
                      Record Voice Note
                    </button>
                  )}
                  {mediaData && !isRecording && (
                    <p className="text-[11px] text-emerald-400 font-medium">
                      Audio recording ready!
                    </p>
                  )}
                </div>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
