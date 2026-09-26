import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { SCREEN_IDENTITIES } from '../../utils/screenIdentities';
import { triggerHaptic } from '../../utils/haptics';
import { Plus, Minimize2, Maximize2 } from 'lucide-react';

export const QuickActionsPill: React.FC = () => {
  const {
    currentTab,
    isMinimalMode,
    toggleMinimalMode,
    triggerQuickAdd,
  } = useApp();

  const identity = SCREEN_IDENTITIES[currentTab] || SCREEN_IDENTITIES.home;
  const [tooltipText, setTooltipText] = useState<string | null>(null);

  const handleMinimalClick = () => {
    triggerHaptic('selection');
    toggleMinimalMode();
    setTooltipText(!isMinimalMode ? 'Minimal Mode: ON' : 'Minimal Mode: OFF');
    setTimeout(() => setTooltipText(null), 1800);
  };

  const handleQuickAddClick = () => {
    triggerHaptic('medium');
    triggerQuickAdd();
  };

  return (
    <aside
      aria-label="Quick Actions"
      className="fixed right-4 sm:right-6 bottom-16 sm:bottom-12 z-35 flex flex-col items-center select-none"
      style={{
        right: 'max(1rem, env(safe-area-inset-right, 1rem))',
        bottom: 'max(3.8rem, calc(env(safe-area-inset-bottom, 0px) + 2.8rem))',
      }}
    >
      {/* Floating status toast / tooltip */}
      {tooltipText && (
        <div
          className="absolute -top-8 right-0 px-2.5 py-0.5 rounded-md text-[11px] font-medium tracking-tight bg-[#18181b]/95 text-zinc-200 border border-white/10 backdrop-blur-xl shadow-lg whitespace-nowrap animate-fade-in pointer-events-none"
        >
          {tooltipText}
        </div>
      )}

      {/* Vertical Pill Button Container (Apple Dynamic Island inspired) */}
      <div
        className="w-11 h-[92px] rounded-full bg-[#18181b]/85 backdrop-blur-2xl border border-white/[0.12] shadow-[0_12px_32px_rgba(0,0,0,0.65)] ring-1 ring-black/40 flex flex-col items-center justify-between overflow-hidden transition-all duration-200"
      >
        {/* Top Half: Minimal Version Toggle */}
        <button
          type="button"
          onClick={handleMinimalClick}
          onMouseEnter={() => setTooltipText(isMinimalMode ? 'Standard View' : 'Minimal View')}
          onMouseLeave={() => setTooltipText(null)}
          className={`w-full h-[45px] flex flex-col items-center justify-center transition-all duration-150 cursor-pointer active:scale-90 group relative ${
            isMinimalMode
              ? 'bg-white/10 text-zinc-100'
              : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.04]'
          }`}
          title={isMinimalMode ? 'Switch to Standard View' : 'Switch to Minimal View'}
          aria-label={isMinimalMode ? 'Switch to Standard View' : 'Switch to Minimal View'}
        >
          {isMinimalMode ? (
            <div className="flex flex-col items-center justify-center relative">
              <Maximize2 className="w-3.5 h-3.5 text-zinc-100 group-hover:scale-110 transition-transform" />
              <span
                className="w-1 h-1 rounded-full absolute -bottom-1"
                style={{ backgroundColor: identity.accentColor }}
              />
            </div>
          ) : (
            <Minimize2 className="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-100 group-hover:scale-110 transition-all" />
          )}
        </button>

        {/* Crisp Hairline Separator */}
        <div className="w-5 h-[1px] bg-white/[0.08] flex-shrink-0" />

        {/* Bottom Half: Quick Add (New Item) */}
        <button
          type="button"
          onClick={handleQuickAddClick}
          onMouseEnter={() => setTooltipText(`Quick Add to ${identity.title}`)}
          onMouseLeave={() => setTooltipText(null)}
          className="w-full h-[45px] flex items-center justify-center transition-all duration-150 cursor-pointer active:scale-90 hover:bg-white/[0.06] group relative"
          title={`Quick Add (${identity.title})`}
          aria-label={`Quick Add (${identity.title})`}
        >
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center transition-transform duration-200 group-hover:scale-105 group-active:rotate-90"
            style={{
              backgroundColor: identity.accentColor,
              boxShadow: `0 2px 10px -1px ${identity.glowColor}`,
            }}
          >
            <Plus className="w-3.5 h-3.5 text-white stroke-[2.5]" />
          </div>
        </button>
      </div>
    </aside>
  );
};
