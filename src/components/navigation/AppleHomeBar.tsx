import React, { useRef, useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { TAB_ORDER, SCREEN_IDENTITIES } from '../../utils/screenIdentities';
import { triggerHaptic } from '../../utils/haptics';

interface AppleHomeBarProps {
  isSwitcherOpen: boolean;
  onToggleSwitcher: () => void;
  onQuickFlick: (direction: 'prev' | 'next') => void;
}

export const AppleHomeBar: React.FC<AppleHomeBarProps> = ({
  isSwitcherOpen,
  onToggleSwitcher,
  onQuickFlick,
}) => {
  const { currentTab } = useApp();
  const identity = SCREEN_IDENTITIES[currentTab] || SCREEN_IDENTITIES.home;

  const [isPressing, setIsPressing] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  const startXRef = useRef<number>(0);
  const startYRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const hasMovedRef = useRef<boolean>(false);

  // Detect when an input/textarea is focused on mobile to tuck the bar away
  useEffect(() => {
    const handleFocusChange = () => {
      const activeTag = document.activeElement?.tagName?.toLowerCase();
      const isInput = activeTag === 'input' || activeTag === 'textarea';
      setIsKeyboardOpen(isInput);
    };

    window.addEventListener('focusin', handleFocusChange);
    window.addEventListener('focusout', handleFocusChange);
    return () => {
      window.removeEventListener('focusin', handleFocusChange);
      window.removeEventListener('focusout', handleFocusChange);
    };
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    // Immediately dismiss any active soft keyboard on mobile
    if (document.activeElement && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    setIsPressing(true);
    startXRef.current = e.clientX;
    startYRef.current = e.clientY;
    startTimeRef.current = Date.now();
    hasMovedRef.current = false;
    setDragOffset({ x: 0, y: 0 });
    triggerHaptic('light');
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isPressing) return;
    const deltaX = e.clientX - startXRef.current;
    const deltaY = e.clientY - startYRef.current;

    if (Math.abs(deltaX) > 6 || Math.abs(deltaY) > 6) {
      hasMovedRef.current = true;
    }

    // Apply smooth rubber-band resistance to physical bar drag
    const resistedX = deltaX * 0.45;
    const resistedY = deltaY < 0 ? deltaY * 0.35 : deltaY * 0.15;
    setDragOffset({ x: resistedX, y: resistedY });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isPressing) return;
    setIsPressing(false);

    const deltaX = e.clientX - startXRef.current;
    const deltaY = e.clientY - startYRef.current;
    const elapsed = Date.now() - startTimeRef.current;

    // Smoothly snap bar position back
    setDragOffset({ x: 0, y: 0 });

    // Ensure keyboard stays dismissed
    if (document.activeElement && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    // 1. Upward swipe on the home bar (classic iOS swipe up to app switcher)
    if (deltaY < -18 && Math.abs(deltaY) > Math.abs(deltaX)) {
      if (!isSwitcherOpen) {
        triggerHaptic('selection');
        onToggleSwitcher();
      }
      return;
    }

    // 2. Downward swipe while switcher is open (dismiss switcher)
    if (deltaY > 18 && Math.abs(deltaY) > Math.abs(deltaX)) {
      if (isSwitcherOpen) {
        triggerHaptic('light');
        onToggleSwitcher();
      }
      return;
    }

    // 3. Horizontal flick along the home bar (classic iOS horizontal bar flick between apps)
    if (Math.abs(deltaX) > 22 && Math.abs(deltaX) > Math.abs(deltaY) * 1.1) {
      triggerHaptic('selection');
      if (deltaX < 0) {
        onQuickFlick('next');
      } else {
        onQuickFlick('prev');
      }
      return;
    }

    // 4. Tap / Touch on the bar: toggle App Switcher mode
    if (!hasMovedRef.current || (Math.abs(deltaX) < 14 && Math.abs(deltaY) < 14 && elapsed < 400)) {
      triggerHaptic('light');
      onToggleSwitcher();
    }
  };

  const handlePointerCancel = () => {
    setIsPressing(false);
    setDragOffset({ x: 0, y: 0 });
  };

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-40 flex flex-col items-center justify-end select-none pointer-events-none transition-all duration-300 ease-out ${
        isKeyboardOpen ? 'opacity-0 translate-y-8 pointer-events-none' : 'opacity-100 translate-y-0'
      }`}
      style={{
        paddingBottom: 'max(0.45rem, env(safe-area-inset-bottom, 0.6rem))',
      }}
      onMouseEnter={() => setShowHint(true)}
      onMouseLeave={() => setShowHint(false)}
    >
      {/* Subtle Gesture Hint Tooltip */}
      <div
        className={`pointer-events-none mb-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium tracking-tight backdrop-blur-xl border border-white/10 transition-all duration-300 shadow-lg flex items-center gap-1.5 ${
          showHint || (isPressing && Math.abs(dragOffset.y) > 8)
            ? 'opacity-90 translate-y-0 scale-100'
            : 'opacity-0 translate-y-1 scale-95'
        }`}
        style={{
          backgroundColor: 'rgba(24, 24, 27, 0.88)',
          color: identity.tintWhite,
        }}
      >
        <span
          className="w-1.5 h-1.5 rounded-full animate-pulse"
          style={{ backgroundColor: identity.accentColor }}
        />
        <span>
          {isSwitcherOpen ? 'Tap bar to return' : 'Touch or swipe up for Recent Apps'}
        </span>
      </div>

      {/* The Touch Target & Apple Home Bar Capsule */}
      <div
        className="pointer-events-auto py-2 px-6 sm:px-8 cursor-pointer touch-none flex items-center justify-center group"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        role="button"
        aria-label={isSwitcherOpen ? 'Close App Switcher' : 'Open Recent Apps Switcher'}
        style={{
          transform: `translate3d(${dragOffset.x}px, ${dragOffset.y}px, 0)`,
          transition: isPressing ? 'none' : 'transform 280ms cubic-bezier(0.2, 0.9, 0.3, 1)',
        }}
      >
        <div
          className={`h-[4px] sm:h-[4.5px] rounded-full relative transition-all duration-200 ${
            isSwitcherOpen
              ? 'w-24 sm:w-32 bg-white/90 shadow-[0_0_12px_rgba(255,255,255,0.4)]'
              : 'w-32 sm:w-44 bg-white/40 group-hover:bg-white/70 group-hover:w-36 sm:group-hover:w-48 shadow-[0_1px_4px_rgba(0,0,0,0.6)]'
          } ${isPressing ? 'scale-x-95 bg-white/90' : ''}`}
        />
      </div>
    </div>
  );
};
