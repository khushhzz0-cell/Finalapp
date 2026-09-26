import React, { useRef } from 'react';
import { useApp, getTodayDateStr } from '../../context/AppContext';
import { NavigationTab } from '../../types';
import { TAB_ORDER, SCREEN_IDENTITIES } from '../../utils/screenIdentities';
import { triggerHaptic } from '../../utils/haptics';
import {
  X,
  Check,
  Settings,
  Lock,
  Plus,
  ChevronRight,
  FileSpreadsheet,
  Search,
} from 'lucide-react';

interface SwipeRevealMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTab: (tab: NavigationTab) => void;
}

export const SwipeRevealMenu: React.FC<SwipeRevealMenuProps> = ({
  isOpen,
  onClose,
  onSelectTab,
}) => {
  const {
    currentTab,
    routines,
    projects,
    rough,
    isRoutineScheduledForToday,
    isRoutineDoneToday,
    lockApp,
    settings,
    setIsSettingsOpen,
    setIsExcelModalOpen,
    setIsSearchOpen,
  } = useApp();

  const todayStr = getTodayDateStr();
  const routinesDueTodayCount = routines.filter(
    r => isRoutineScheduledForToday(r, todayStr) && !isRoutineDoneToday(r, todayStr)
  ).length;

  const urgentPrioritiesCount = projects.filter(
    p => p.isPriority && p.status === 'active' && p.subtasks.some(st => !st.completed)
  ).length;

  const roughCount = rough.length;

  const startYRef = useRef<number>(0);
  const startXRef = useRef<number>(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    startYRef.current = e.touches[0].clientY;
    startXRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const deltaY = e.changedTouches[0].clientY - startYRef.current;
    const deltaX = e.changedTouches[0].clientX - startXRef.current;

    // Swipe down or swipe left to dismiss
    if (deltaY > 60 || deltaX < -60) {
      onClose();
    }
  };

  if (!isOpen) return null;

  const currentIdentity = SCREEN_IDENTITIES[currentTab] || SCREEN_IDENTITIES.home;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end select-none">
      {/* Translucent Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Navigation Card anchored in Lower-Right Thumb Zone */}
      <div
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="relative z-10 w-[88vw] max-w-[300px] landscape:max-w-[270px] mb-12 sm:mb-16 landscape:mb-3 mr-3 sm:mr-5 landscape:mr-4 bg-[#141417]/95 backdrop-blur-2xl border border-white/[0.08] rounded-2xl shadow-2xl p-2.5 space-y-1.5 animate-in fade-in slide-in-from-bottom-4 duration-200"
        style={{
          boxShadow: `0 20px 40px -10px rgba(0, 0, 0, 0.8), 0 0 20px -6px ${currentIdentity.glowColor}`,
        }}
      >
        {/* Top Header inside sheet */}
        <div className="flex items-center justify-between px-2 pt-1 pb-1.5 border-b border-white/[0.06]">
          <div className="flex items-center gap-1.5">
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: currentIdentity.accentColor }}
            />
            <span className="text-xs font-semibold text-zinc-200 tracking-tight">
              Navigation
            </span>
          </div>

          <button
            onClick={() => {
              triggerHaptic('light');
              onClose();
            }}
            className="w-6 h-6 rounded-md hover:bg-white/[0.08] text-zinc-400 hover:text-zinc-100 flex items-center justify-center transition cursor-pointer"
            aria-label="Close menu"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* List of Screens */}
        <div className="space-y-0.5 max-h-[58vh] landscape:max-h-[65vh] overflow-y-auto no-scrollbar py-0.5">
          {TAB_ORDER.map(tab => {
            const identity = SCREEN_IDENTITIES[tab];
            const Icon = identity.icon;
            const isActive = currentTab === tab;

            let badgeCount: number | undefined;
            if (tab === 'routine' && routinesDueTodayCount > 0) badgeCount = routinesDueTodayCount;
            if (tab === 'projects' && urgentPrioritiesCount > 0) badgeCount = urgentPrioritiesCount;
            if (tab === 'rough' && roughCount > 0) badgeCount = roughCount;

            return (
              <button
                key={tab}
                onClick={() => {
                  triggerHaptic('selection');
                  onSelectTab(tab);
                  onClose();
                }}
                className={`w-full px-2.5 py-1.5 rounded-xl flex items-center justify-between text-left transition-all duration-150 cursor-pointer group active:scale-[0.98] ${
                  isActive
                    ? 'bg-white/[0.08] border border-white/[0.06]'
                    : 'hover:bg-white/[0.04] border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
                      isActive ? 'bg-white/10' : 'bg-white/[0.04] group-hover:bg-white/[0.07]'
                    }`}
                  >
                    <Icon
                      className="w-3.5 h-3.5"
                      style={{
                        color: isActive ? identity.tintWhite : identity.accentColor,
                      }}
                    />
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-xs ${
                          isActive ? 'font-semibold text-zinc-100' : 'font-medium text-zinc-300'
                        }`}
                      >
                        {identity.title}
                      </span>

                      {badgeCount !== undefined && badgeCount > 0 && (
                        <span className="text-[10px] text-zinc-500 font-mono">
                          ({badgeCount})
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-zinc-500 block truncate">
                      {identity.subtitle}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                  {isActive ? (
                    <div
                      className="w-4 h-4 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: identity.accentColor }}
                    >
                      <Check className="w-2.5 h-2.5 text-white stroke-[3]" />
                    </div>
                  ) : (
                    <ChevronRight className="w-3 h-3 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Thumb Zone Quick Utilities */}
        <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between gap-1.5 px-0.5">
          {/* Quick Search */}
          <button
            onClick={() => {
              triggerHaptic('selection');
              setIsSearchOpen(true);
              onClose();
            }}
            className="flex-1 py-1.5 px-2.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] active:scale-95 text-zinc-300 text-xs font-normal flex items-center justify-center gap-1.5 transition cursor-pointer"
          >
            <Search className="w-3 h-3 text-[#0a84ff]" />
            <span>Search</span>
          </button>

          {/* Quick Capture */}
          <button
            onClick={() => {
              triggerHaptic('light');
              onSelectTab('rough');
              onClose();
            }}
            className="py-1.5 px-2.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] active:scale-95 text-zinc-300 text-xs font-normal flex items-center justify-center gap-1.5 transition cursor-pointer"
          >
            <Plus className="w-3 h-3 text-[#30d158]" />
            <span>Capture</span>
          </button>

          {/* Excel Lifetime Archive */}
          <button
            onClick={() => {
              setIsExcelModalOpen(true);
              onClose();
            }}
            className="w-7 h-7 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] active:scale-95 text-emerald-400 hover:text-emerald-300 flex items-center justify-center transition cursor-pointer"
            title="Excel Lifetime Archive"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
          </button>

          {/* Settings */}
          <button
            onClick={() => {
              setIsSettingsOpen(true);
              onClose();
            }}
            className="w-7 h-7 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] active:scale-95 text-zinc-400 hover:text-zinc-200 flex items-center justify-center transition cursor-pointer"
            title="Settings"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>

          {/* Passcode Lock */}
          {settings.isPinEnabled && (
            <button
              onClick={() => {
                lockApp();
                onClose();
              }}
              className="w-7 h-7 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] active:scale-95 text-zinc-400 hover:text-[#0a84ff] flex items-center justify-center transition cursor-pointer"
              title="Lock App"
            >
              <Lock className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
