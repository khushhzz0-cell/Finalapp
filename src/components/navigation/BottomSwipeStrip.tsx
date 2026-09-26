import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { TAB_ORDER, SCREEN_IDENTITIES } from '../../utils/screenIdentities';

interface BottomSwipeStripProps {
  onSlideToIndex: (index: number) => void;
  dragFraction?: number; // Real-time fractional offset during viewport drag
}

export const BottomSwipeStrip: React.FC<BottomSwipeStripProps> = ({
  onSlideToIndex,
  dragFraction = 0,
}) => {
  const { currentTab, setCurrentTab } = useApp();
  const currentIndex = TAB_ORDER.indexOf(currentTab);
  const currentIdentity = SCREEN_IDENTITIES[currentTab] || SCREEN_IDENTITIES.home;

  const trackRef = useRef<HTMLDivElement>(null);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubIndex, setScrubIndex] = useState<number>(currentIndex);
  const [scrubFraction, setScrubFraction] = useState<number>(currentIndex);
  const [showTooltip, setShowTooltip] = useState(false);

  const startXRef = useRef<number>(0);
  const currentXRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const initialIndexRef = useRef<number>(currentIndex);

  // Sync scrub state whenever currentTab changes from outside
  useEffect(() => {
    if (!isScrubbing) {
      setScrubIndex(currentIndex);
      setScrubFraction(currentIndex);
    }
  }, [currentIndex, isScrubbing]);

  const updateScrubFromClientX = useCallback((clientX: number) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const clampedX = Math.max(rect.left, Math.min(rect.right, clientX));
    const percent = rect.width > 0 ? (clampedX - rect.left) / rect.width : 0;
    
    // Map percent [0, 1] to index fraction [0, TAB_ORDER.length - 1]
    const fraction = percent * (TAB_ORDER.length - 1);
    const targetIdx = Math.min(
      TAB_ORDER.length - 1,
      Math.max(0, Math.round(fraction))
    );

    setScrubFraction(fraction);
    setScrubIndex(targetIdx);
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    try {
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    } catch {
      // safe fallback if pointer capture is not supported
    }

    setIsScrubbing(true);
    setShowTooltip(true);
    startXRef.current = e.clientX;
    currentXRef.current = e.clientX;
    startTimeRef.current = Date.now();
    initialIndexRef.current = currentIndex;

    updateScrubFromClientX(e.clientX);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isScrubbing) return;
    currentXRef.current = e.clientX;
    updateScrubFromClientX(e.clientX);
  };

  const finishScrub = useCallback(() => {
    if (!isScrubbing) return;
    setIsScrubbing(false);

    const deltaX = currentXRef.current - startXRef.current;
    const deltaTime = Date.now() - startTimeRef.current;
    const velocityX = deltaX / Math.max(deltaTime, 1);

    let finalIndex = scrubIndex;

    // Fast flick detection on the strip
    if (Math.abs(deltaX) > 15 && Math.abs(velocityX) > 0.2) {
      if (deltaX > 0 && initialIndexRef.current < TAB_ORDER.length - 1) {
        finalIndex = Math.min(TAB_ORDER.length - 1, initialIndexRef.current + 1);
      } else if (deltaX < 0 && initialIndexRef.current > 0) {
        finalIndex = Math.max(0, initialIndexRef.current - 1);
      }
    }

    onSlideToIndex(finalIndex);
    setCurrentTab(TAB_ORDER[finalIndex]);

    setTimeout(() => {
      setShowTooltip(false);
    }, 400);
  }, [isScrubbing, scrubIndex, onSlideToIndex, setCurrentTab]);

  const handlePointerUp = (e: React.PointerEvent) => {
    finishScrub();
  };

  const handlePointerCancel = () => {
    setIsScrubbing(false);
    setShowTooltip(false);
  };

  // Window fallback to ensure scrub state never gets stuck
  useEffect(() => {
    const handleGlobalRelease = () => {
      if (isScrubbing) {
        finishScrub();
      }
    };
    window.addEventListener('pointerup', handleGlobalRelease);
    window.addEventListener('pointercancel', handleGlobalRelease);
    return () => {
      window.removeEventListener('pointerup', handleGlobalRelease);
      window.removeEventListener('pointercancel', handleGlobalRelease);
    };
  }, [isScrubbing, finishScrub]);

  // Compute runner position
  // When user is scrubbing, use scrubFraction.
  // When idle or during viewport gesture, use currentIndex + dragFraction.
  const effectiveFraction = isScrubbing
    ? scrubFraction
    : currentIndex + dragFraction;

  const clampedFraction = Math.max(0, Math.min(TAB_ORDER.length - 1, effectiveFraction));

  const targetTab = TAB_ORDER[scrubIndex] || currentTab;
  const targetIdentity = SCREEN_IDENTITIES[targetTab] || currentIdentity;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-40 flex flex-col items-center justify-end pb-2 sm:pb-3 pointer-events-none select-none"
      style={{ paddingBottom: 'max(0.6rem, env(safe-area-inset-bottom, 0.75rem))' }}
    >
      {/* Floating Micro-Label on Gestural Scrub */}
      <div
        className={`pointer-events-none mb-2 px-3 py-1 rounded-full text-[11px] font-medium tracking-tight backdrop-blur-xl border border-white/[0.1] transition-all duration-200 shadow-xl flex items-center gap-1.5 ${
          showTooltip
            ? 'opacity-100 translate-y-0 scale-100'
            : 'opacity-0 translate-y-2 scale-90'
        }`}
        style={{
          backgroundColor: 'rgba(28, 28, 30, 0.94)',
          color: targetIdentity.tintWhite,
          boxShadow: `0 8px 24px -4px ${targetIdentity.glowColor}`,
        }}
      >
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: targetIdentity.accentColor }}
        />
        <span>{targetIdentity.title}</span>
        <span className="text-[9px] text-[#8e8e93] font-mono">
          {scrubIndex + 1}/{TAB_ORDER.length}
        </span>
      </div>

      {/* The Swipe Slit / Strip Touch Controller */}
      <div
        className="pointer-events-auto relative py-3 px-6 cursor-grab active:cursor-grabbing touch-none flex items-center justify-center group"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        role="slider"
        aria-label="Screen Navigation Strip"
        aria-valuemin={0}
        aria-valuemax={TAB_ORDER.length - 1}
        aria-valuenow={currentIndex}
      >
        {/* Track Bar (Ultra-thin slit) */}
        <div
          ref={trackRef}
          className="relative w-44 sm:w-56 h-[4px] rounded-full overflow-hidden transition-all duration-200 group-hover:h-[5px] group-active:h-[5px]"
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.12)',
            boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.6)',
          }}
        >
          {/* Subtle Segment Interval Ticks */}
          <div className="absolute inset-0 flex justify-between items-center px-1 pointer-events-none opacity-40">
            {TAB_ORDER.map((_, i) => (
              <span
                key={i}
                className="w-[1.5px] h-[2px] rounded-full bg-white/40"
              />
            ))}
          </div>

          {/* Luminous Runner Pill: 1 slot = 100% of runner width */}
          <div
            className="absolute top-0 bottom-0 rounded-full"
            style={{
              width: `${100 / TAB_ORDER.length}%`,
              left: 0,
              transform: `translate3d(${clampedFraction * 100}%, 0, 0)`,
              backgroundColor: isScrubbing ? targetIdentity.tintWhite : currentIdentity.tintWhite,
              boxShadow: `0 0 8px 1px ${isScrubbing ? targetIdentity.glowColor : currentIdentity.glowColor}`,
              transition: isScrubbing
                ? 'none'
                : 'transform 260ms cubic-bezier(0.16, 1, 0.3, 1), background-color 300ms ease',
            }}
          />
        </div>
      </div>
    </div>
  );
};
