import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { NavigationTab } from '../../types';
import { TAB_ORDER, SCREEN_IDENTITIES } from '../../utils/screenIdentities';
import { triggerHaptic } from '../../utils/haptics';
import { Check, X } from 'lucide-react';

// Screen Views for Live Previews
import { HomeView } from '../home/HomeView';
import { RoutineView } from '../routine/RoutineView';
import { HabitsView } from '../habits/HabitsView';
import { ProjectsView } from '../projects/ProjectsView';
import { LearningView } from '../learning/LearningView';
import { RoughView } from '../rough/RoughView';
import { RemindersView } from '../reminders/RemindersView';

interface AppleAppSwitcherProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTab: (tab: NavigationTab) => void;
}

export const AppleAppSwitcher: React.FC<AppleAppSwitcherProps> = ({
  isOpen,
  onClose,
  onSelectTab,
}) => {
  const { currentTab, routines, habits, projects, rough, reminders } = useApp();
  const currentIndex = TAB_ORDER.indexOf(currentTab);
  const priorityCount = projects.filter(p => p.isPriority).length;

  const deckRef = useRef<HTMLDivElement>(null);
  const [activeCenterIndex, setActiveCenterIndex] = useState<number>(currentIndex);
  const [isDragging, setIsDragging] = useState(false);
  const [hasScrolledInitially, setHasScrolledInitially] = useState(false);

  // Mouse/pointer dragging refs for desktop & touch
  const startXRef = useRef<number>(0);
  const scrollLeftRef = useRef<number>(0);
  const isPointerDownRef = useRef<boolean>(false);
  const dragDistanceRef = useRef<number>(0);

  // Scroll active card to center when switcher opens
  const scrollToActiveCard = useCallback(
    (index: number, smooth: boolean = true) => {
      if (!deckRef.current) return;
      const container = deckRef.current;
      const card = container.children[index] as HTMLElement;
      if (!card) return;

      const cardLeft = card.offsetLeft;
      const cardWidth = card.clientWidth;
      const containerWidth = container.clientWidth;

      const targetScrollLeft = cardLeft - (containerWidth / 2) + (cardWidth / 2);

      container.scrollTo({
        left: Math.max(0, targetScrollLeft),
        behavior: smooth ? 'smooth' : 'auto',
      });
      setActiveCenterIndex(index);
    },
    []
  );

  // When switcher is opened, center the active screen
  useEffect(() => {
    if (isOpen) {
      setActiveCenterIndex(currentIndex);
      // Wait a tick for DOM layout to settle before centering
      const timer = setTimeout(() => {
        scrollToActiveCard(currentIndex, false);
        setHasScrolledInitially(true);
      }, 50);
      return () => clearTimeout(timer);
    } else {
      setHasScrolledInitially(false);
    }
  }, [isOpen, currentIndex, scrollToActiveCard]);

  // Update center index on scroll
  const handleScroll = () => {
    if (!deckRef.current) return;
    const container = deckRef.current;
    const containerCenter = container.scrollLeft + container.clientWidth / 2;

    let closestIdx = 0;
    let minDistance = Infinity;

    Array.from(container.children).forEach((child, idx) => {
      const el = child as HTMLElement;
      const childCenter = el.offsetLeft + el.clientWidth / 2;
      const distance = Math.abs(containerCenter - childCenter);
      if (distance < minDistance) {
        minDistance = distance;
        closestIdx = idx;
      }
    });

    if (closestIdx !== activeCenterIndex) {
      setActiveCenterIndex(closestIdx);
    }
  };

  // Pointer drag handling for mouse & desktop touch emulation
  const handlePointerDown = (e: React.PointerEvent) => {
    if (!deckRef.current) return;
    isPointerDownRef.current = true;
    startXRef.current = e.pageX - deckRef.current.offsetLeft;
    scrollLeftRef.current = deckRef.current.scrollLeft;
    dragDistanceRef.current = 0;
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isPointerDownRef.current || !deckRef.current) return;
    const x = e.pageX - deckRef.current.offsetLeft;
    const walk = (x - startXRef.current) * 1.4; // 1.4x tracking speed
    dragDistanceRef.current = Math.abs(x - startXRef.current);

    if (dragDistanceRef.current > 6) {
      setIsDragging(true);
    }
    deckRef.current.scrollLeft = scrollLeftRef.current - walk;
  };

  const handlePointerUp = () => {
    isPointerDownRef.current = false;
    setTimeout(() => {
      setIsDragging(false);
    }, 50);
  };

  const handleCardClick = (tab: NavigationTab, index: number) => {
    if (isDragging || dragDistanceRef.current > 8) {
      return;
    }
    triggerHaptic('selection');
    onSelectTab(tab);
    onClose();
  };

  // Helper for quick stats badge on each app card
  const getBadgeForTab = (tab: NavigationTab): string => {
    switch (tab) {
      case 'home':
        return 'Today';
      case 'routine':
        return `${routines.length} routines`;
      case 'habits':
        return `${habits.filter(h => h.status === 'active').length} habits`;
      case 'projects':
        return `${projects.length} projects`;
      case 'learning':
        return 'Knowledge';
      case 'rough':
        return `${rough.length} notes`;
      case 'reminders':
        return `${reminders.length} saved`;
    }
  };

  const renderScreenPreview = (tab: NavigationTab) => {
    switch (tab) {
      case 'home':
        return <HomeView />;
      case 'routine':
        return <RoutineView />;
      case 'habits':
        return <HabitsView />;
      case 'projects':
        return <ProjectsView />;
      case 'learning':
        return <LearningView />;
      case 'rough':
        return <RoughView />;
      case 'reminders':
        return <RemindersView />;
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-40 flex flex-col justify-between overflow-hidden bg-[#09090b]/90 backdrop-blur-2xl transition-all duration-300 animate-fadeIn"
      style={{
        animationDuration: '280ms',
        animationTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      {/* Top Bar with iOS App Switcher Header & Done Action */}
      <div className="pt-4 sm:pt-6 px-4 sm:px-8 flex items-center justify-between z-10 select-none">
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-widest font-medium text-zinc-500">
            Recent Apps
          </span>
          <span className="w-1 h-1 rounded-full bg-zinc-600" />
          <span className="text-xs text-zinc-200 font-medium">
            {TAB_ORDER[activeCenterIndex]
              ? SCREEN_IDENTITIES[TAB_ORDER[activeCenterIndex]].title
              : 'Switch'}
          </span>
        </div>

        {/* Done / Close Button */}
        <button
          onClick={onClose}
          className="px-3 py-1 rounded-lg text-xs font-medium bg-white/[0.08] hover:bg-white/[0.14] active:bg-white/[0.2] text-zinc-200 transition-all flex items-center gap-1.5 border border-white/[0.06]"
        >
          <span>Done</span>
          <X className="w-3.5 h-3.5 text-zinc-400" />
        </button>
      </div>

      {/* Center Recent Apps Card Deck */}
      <div
        ref={deckRef}
        onScroll={handleScroll}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="flex-1 flex items-center gap-5 sm:gap-7 overflow-x-auto no-scrollbar scroll-smooth snap-x snap-mandatory py-4 px-8 sm:px-20 cursor-grab active:cursor-grabbing select-none"
        style={{
          scrollPadding: '0 25%',
          touchAction: 'pan-x',
        }}
      >
        {TAB_ORDER.map((tab, idx) => {
          const identity = SCREEN_IDENTITIES[tab];
          const Icon = identity.icon;
          const isCentered = idx === activeCenterIndex;
          const isCurrentActive = tab === currentTab;
          const badgeText = getBadgeForTab(tab);

          return (
            <div
              key={tab}
              onClick={() => handleCardClick(tab, idx)}
              className={`snap-center flex-shrink-0 flex flex-col transition-all duration-300 ease-out group cursor-pointer ${
                isCentered
                  ? 'scale-100 opacity-100 z-20'
                  : 'scale-[0.92] opacity-75 hover:opacity-95 hover:scale-[0.95] z-10'
              }`}
              style={{
                width: 'min(78vw, 320px)',
                height: 'min(64vh, 560px)',
                maxHeight: 'calc(100vh - 120px)',
              }}
            >
              {/* App Icon + App Name Header (above the card window) */}
              <div className="flex items-center justify-between px-2 mb-2 select-none">
                <div className="flex items-center gap-2">
                  <div
                    className="w-6 h-6 rounded-[7px] flex items-center justify-center shadow-md transition-transform group-hover:scale-105"
                    style={{
                      backgroundColor: identity.accentColor,
                      boxShadow: `0 2px 8px ${identity.glowColor}`,
                    }}
                  >
                    <Icon className="w-3.5 h-3.5 text-white" />
                  </div>
                  <span
                    className="text-xs font-semibold tracking-tight"
                    style={{ color: identity.tintWhite }}
                  >
                    {identity.title}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-white/50 font-mono tracking-tight">
                    {badgeText}
                  </span>
                  {isCurrentActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#34c759] shadow-[0_0_6px_#34c759]" />
                  )}
                </div>
              </div>

              {/* App Card Window Preview */}
              <div
                className={`relative flex-1 rounded-[22px] sm:rounded-[26px] overflow-hidden border transition-all duration-300 shadow-2xl ${
                  isCentered
                    ? 'border-white/25 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.95)]'
                    : 'border-white/10 shadow-[0_15px_40px_-15px_rgba(0,0,0,0.8)]'
                }`}
                style={{
                  backgroundColor: '#121215',
                  backgroundImage: identity.ambientGlow,
                  borderColor: isCentered ? identity.borderTint : 'rgba(255, 255, 255, 0.08)',
                }}
              >
                {/* Simulated iOS Status Bar inside the card window */}
                <div className="h-6 w-full flex items-center justify-between px-4 text-[9px] text-white/40 font-mono border-b border-white/[0.04]">
                  <span>9:41</span>
                  <div className="w-12 h-2.5 rounded-full bg-black/60 mx-auto" />
                  <span>5G</span>
                </div>

                {/* Scaled Live Screen Content Preview */}
                <div
                  className="relative w-full h-[calc(100%-24px)] overflow-hidden pointer-events-none p-3.5 select-none opacity-90 group-hover:opacity-100 transition-opacity"
                  tabIndex={-1}
                  aria-hidden="true"
                >
                  <div
                    className="w-[135%] h-[135%] origin-top-left scale-[0.74] overflow-y-hidden"
                    style={{ pointerEvents: 'none' }}
                    tabIndex={-1}
                  >
                    {renderScreenPreview(tab)}
                  </div>
                </div>

                {/* Subtle Tap Overlay */}
                <div className="absolute inset-0 bg-white/0 group-hover:bg-white/[0.03] group-active:bg-white/[0.08] transition-colors pointer-events-none" />

                {/* Checkmark badge if this card is currently selected */}
                {isCurrentActive && (
                  <div
                    className="absolute bottom-3 right-3 w-5 h-5 rounded-full text-white flex items-center justify-center shadow-lg border border-white/20 pointer-events-none"
                    style={{ backgroundColor: identity.accentColor }}
                  >
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Subtitle / Instruction (Above the Home Bar) */}
      <div className="pb-14 text-center select-none z-10">
        <p className="text-[11px] font-medium text-white/50 tracking-wide">
          Swipe cards to browse • Tap any card to open
        </p>
      </div>
    </div>
  );
};
