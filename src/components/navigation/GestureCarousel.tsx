import React, { useRef, useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { NavigationTab } from '../../types';
import { TAB_ORDER, SCREEN_IDENTITIES } from '../../utils/screenIdentities';
import { triggerHaptic } from '../../utils/haptics';

// Screen Views
import { HomeView } from '../home/HomeView';
import { RoutineView } from '../routine/RoutineView';
import { HabitsView } from '../habits/HabitsView';
import { ProjectsView } from '../projects/ProjectsView';
import { LearningView } from '../learning/LearningView';
import { RoughView } from '../rough/RoughView';
import { RemindersView } from '../reminders/RemindersView';

interface GestureCarouselProps {
  onOpenMenu: () => void;
  onDragProgress?: (fraction: number) => void;
}

export const GestureCarousel: React.FC<GestureCarouselProps> = ({
  onOpenMenu,
  onDragProgress,
}) => {
  const { currentTab, setCurrentTab } = useApp();
  const currentIndex = TAB_ORDER.indexOf(currentTab);

  const containerRef = useRef<HTMLDivElement>(null);
  const [dragOffsetPx, setDragOffsetPx] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isAnimatingTransition, setIsAnimatingTransition] = useState<boolean>(false);

  // Gesture tracking refs
  const isDraggingRef = useRef<boolean>(false);
  const isAnimatingRef = useRef<boolean>(false);
  const startXRef = useRef<number>(0);
  const startYRef = useRef<number>(0);
  const currentXRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const isHorizontalGestureRef = useRef<boolean | null>(null);
  const isLeftEdgeSwipeRef = useRef<boolean>(false);
  const rafIdRef = useRef<number | null>(null);
  const transitionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const watchdogTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync refs with state
  isDraggingRef.current = isDragging;
  isAnimatingRef.current = isAnimatingTransition;

  // Watchdog: Guarantee isAnimatingTransition NEVER stays true longer than 350ms
  useEffect(() => {
    if (isAnimatingTransition) {
      if (watchdogTimerRef.current) clearTimeout(watchdogTimerRef.current);
      watchdogTimerRef.current = setTimeout(() => {
        setIsAnimatingTransition(false);
        setDragOffsetPx(0);
        onDragProgress?.(0);
      }, 360);
    } else {
      if (watchdogTimerRef.current) {
        clearTimeout(watchdogTimerRef.current);
        watchdogTimerRef.current = null;
      }
    }
  }, [isAnimatingTransition, onDragProgress]);

  // Clean reset when currentTab changes
  useEffect(() => {
    if (transitionTimerRef.current) {
      clearTimeout(transitionTimerRef.current);
      transitionTimerRef.current = null;
    }
    setDragOffsetPx(0);
    setIsDragging(false);
    setIsAnimatingTransition(false);
    onDragProgress?.(0);
  }, [currentTab, onDragProgress]);

  // Window-level safety release listener (registered ONCE on mount)
  useEffect(() => {
    const handleGlobalRelease = () => {
      if (isDraggingRef.current) {
        setIsDragging(false);
        setDragOffsetPx(0);
        onDragProgress?.(0);
      }
    };

    window.addEventListener('touchend', handleGlobalRelease, { passive: true });
    window.addEventListener('touchcancel', handleGlobalRelease, { passive: true });
    window.addEventListener('pointerup', handleGlobalRelease, { passive: true });
    window.addEventListener('pointercancel', handleGlobalRelease, { passive: true });

    return () => {
      window.removeEventListener('touchend', handleGlobalRelease);
      window.removeEventListener('touchcancel', handleGlobalRelease);
      window.removeEventListener('pointerup', handleGlobalRelease);
      window.removeEventListener('pointercancel', handleGlobalRelease);
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
      if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
      if (watchdogTimerRef.current) clearTimeout(watchdogTimerRef.current);
    };
  }, [onDragProgress]);

  // Touch handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    // If a transition was ongoing, resolve it immediately instead of blocking touches
    if (isAnimatingRef.current || transitionTimerRef.current) {
      if (transitionTimerRef.current) {
        clearTimeout(transitionTimerRef.current);
        transitionTimerRef.current = null;
      }
      setIsAnimatingTransition(false);
      setDragOffsetPx(0);
    }

    const touch = e.touches[0];
    startXRef.current = touch.clientX;
    startYRef.current = touch.clientY;
    currentXRef.current = touch.clientX;
    startTimeRef.current = Date.now();
    isHorizontalGestureRef.current = null;

    // Detect if touch originated near the left edge
    isLeftEdgeSwipeRef.current = touch.clientX < Math.min(window.innerWidth * 0.18, 70);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    const deltaX = touch.clientX - startXRef.current;
    const deltaY = touch.clientY - startYRef.current;

    // Decide if this is a horizontal gesture or a vertical scroll
    if (isHorizontalGestureRef.current === null) {
      if (Math.abs(deltaX) > 8 || Math.abs(deltaY) > 8) {
        if (Math.abs(deltaX) > Math.abs(deltaY) * 1.15) {
          isHorizontalGestureRef.current = true;
          setIsDragging(true);
        } else {
          isHorizontalGestureRef.current = false;
        }
      }
    }

    if (isHorizontalGestureRef.current) {
      currentXRef.current = touch.clientX;

      if (!rafIdRef.current) {
        rafIdRef.current = requestAnimationFrame(() => {
          rafIdRef.current = null;
          const currentDeltaX = currentXRef.current - startXRef.current;

          // Resistance at boundary edges
          let effectiveDelta = currentDeltaX;
          if (
            (currentIndex === 0 && currentDeltaX > 0) ||
            (currentIndex === TAB_ORDER.length - 1 && currentDeltaX < 0)
          ) {
            effectiveDelta = currentDeltaX * 0.22;
          }

          setDragOffsetPx(effectiveDelta);

          if (onDragProgress && containerRef.current) {
            const width = containerRef.current.clientWidth || window.innerWidth;
            onDragProgress(-effectiveDelta / width);
          }
        });
      }
    }
  };

  const handleTouchEnd = () => {
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }

    if (!isHorizontalGestureRef.current) {
      setDragOffsetPx(0);
      setIsDragging(false);
      onDragProgress?.(0);
      return;
    }

    const deltaX = currentXRef.current - startXRef.current;
    const deltaTime = Date.now() - startTimeRef.current;
    const velocityX = deltaX / Math.max(deltaTime, 1);
    const width = containerRef.current?.clientWidth || window.innerWidth;

    // 1. Swipe-right-to-reveal menu
    if (
      (isLeftEdgeSwipeRef.current && deltaX > 45) ||
      (currentIndex === 0 && deltaX > 75 && velocityX > 0.2)
    ) {
      triggerHaptic('light');
      onOpenMenu();
      setDragOffsetPx(0);
      setIsDragging(false);
      onDragProgress?.(0);
      return;
    }

    // 2. Carousel page sliding logic
    let nextIndex = currentIndex;
    const threshold = width * 0.18;
    const isFlick = Math.abs(velocityX) > 0.22;

    if (deltaX < -threshold || (isFlick && velocityX < -0.22)) {
      if (currentIndex < TAB_ORDER.length - 1) {
        nextIndex = currentIndex + 1;
      }
    } else if (deltaX > threshold || (isFlick && velocityX > 0.22)) {
      if (currentIndex > 0) {
        nextIndex = currentIndex - 1;
      }
    }

    setIsDragging(false);

    if (nextIndex !== currentIndex) {
      // Smooth momentum glide to target edge
      setIsAnimatingTransition(true);
      triggerHaptic('selection');
      const targetOffset = nextIndex > currentIndex ? -width : width;
      setDragOffsetPx(targetOffset);

      if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
      transitionTimerRef.current = setTimeout(() => {
        transitionTimerRef.current = null;
        setCurrentTab(TAB_ORDER[nextIndex]);
        setDragOffsetPx(0);
        setIsAnimatingTransition(false);
        onDragProgress?.(0);
      }, 300);
    } else {
      // Snap back to 0 smoothly
      setDragOffsetPx(0);
      onDragProgress?.(0);
    }
  };

  const handleTouchCancel = () => {
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    if (transitionTimerRef.current) {
      clearTimeout(transitionTimerRef.current);
      transitionTimerRef.current = null;
    }
    setDragOffsetPx(0);
    setIsDragging(false);
    setIsAnimatingTransition(false);
    onDragProgress?.(0);
  };

  // Render individual screen components
  const renderScreen = (tab: NavigationTab) => {
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

  return (
    <div
      ref={containerRef}
      className="relative flex-1 w-full h-full overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchCancel}
    >
      {/* Individual Screens with Hardware-Accelerated Transforms */}
      {TAB_ORDER.map((tab, idx) => {
        const identity = SCREEN_IDENTITIES[tab];
        const isCurrent = idx === currentIndex;
        const offset = idx - currentIndex;

        // Keep active screen and direct adjacent screens ready for seamless sliding
        const isVisible = Math.abs(offset) <= 1;

        return (
          <div
            key={tab}
            className="absolute inset-0 w-full h-full overflow-y-auto overscroll-y-contain no-scrollbar flex flex-col"
            style={{
              transform: `translate3d(calc(${offset * 100}% + ${dragOffsetPx}px), 0, 0)`,
              transition: isDragging
                ? 'none'
                : 'transform 300ms cubic-bezier(0.22, 1, 0.36, 1)',
              visibility: isVisible ? 'visible' : 'hidden',
              // NEVER disable pointer events on the current screen when not actively dragging
              pointerEvents: isCurrent && !isDragging ? 'auto' : 'none',
              willChange: isVisible ? 'transform' : 'auto',
              backgroundImage: identity.ambientGlow,
              backgroundAttachment: 'local',
            }}
            aria-hidden={!isCurrent}
          >
            <main className="flex-1 w-full max-w-2xl landscape:max-w-4xl mx-auto px-4 landscape:px-6 py-3 sm:py-5 pb-36 sm:pb-32 landscape:pb-20">
              {renderScreen(tab)}
            </main>
          </div>
        );
      })}

      {/* Subtle Left-Edge Swipe Handle / Affordance */}
      <div
        onClick={() => {
          triggerHaptic('light');
          onOpenMenu();
        }}
        className="fixed left-0 top-1/2 -translate-y-1/2 z-30 py-4 px-1 cursor-pointer group select-none opacity-40 hover:opacity-100 transition-opacity"
        title="Swipe right to reveal menu"
      >
        <div className="w-1 h-10 rounded-r-full bg-white/20 group-hover:bg-white/40 group-active:w-2 transition-all duration-200" />
      </div>
    </div>
  );
};
