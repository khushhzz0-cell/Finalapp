import React from 'react';
import { useApp } from '../../context/AppContext';
import { SCREEN_IDENTITIES, TAB_ORDER } from '../../utils/screenIdentities';
import { Lock, Settings, Menu, Cloud, RefreshCw, Search, Check } from 'lucide-react';
import { triggerHaptic } from '../../utils/haptics';

interface HeaderProps {
  onToggleMenu: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleMenu }) => {
  const {
    currentTab,
    syncStatus,
    lockApp,
    settings,
    setIsSettingsOpen,
    isMinimalMode,
    setIsSearchOpen,
  } = useApp();
  const identity = SCREEN_IDENTITIES[currentTab] || SCREEN_IDENTITIES.home;
  const currentIndex = TAB_ORDER.indexOf(currentTab);
  const CurrentIcon = identity.icon;

  if (isMinimalMode) {
    return (
      <header
        className="sticky top-0 z-30 bg-[#09090b]/80 backdrop-blur-xl border-b border-white/[0.04] px-3.5 py-1.5 select-none pointer-events-auto transition-all"
        style={{
          paddingTop: 'max(0.375rem, env(safe-area-inset-top, 0.375rem))',
          paddingLeft: 'max(0.75rem, env(safe-area-inset-left, 0.75rem))',
          paddingRight: 'max(0.75rem, env(safe-area-inset-right, 0.75rem))',
        }}
      >
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                triggerHaptic('light');
                onToggleMenu();
              }}
              className="w-7 h-7 rounded-lg hover:bg-white/[0.08] active:scale-95 text-zinc-400 hover:text-white flex items-center justify-center transition cursor-pointer"
              title="Navigation Menu"
              aria-label="Open Navigation Menu"
            >
              <Menu className="w-3.5 h-3.5" />
            </button>
            <div className="flex items-center gap-1.5 text-xs text-zinc-400">
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: identity.accentColor }}
              />
              <span className="font-medium text-zinc-200">{identity.title}</span>
            </div>
          </div>

          <button
            onClick={() => {
              triggerHaptic('selection');
              setIsSearchOpen(true);
            }}
            className="w-7 h-7 rounded-lg hover:bg-white/[0.08] active:scale-95 text-zinc-400 hover:text-white flex items-center justify-center transition cursor-pointer"
            title="Search & Filter (Cmd+K)"
            aria-label="Search"
          >
            <Search className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>
    );
  }

  return (
    <header
      className="sticky top-0 z-30 bg-[#09090b]/80 backdrop-blur-2xl border-b border-white/[0.06] select-none transition-colors duration-300"
      style={{
        paddingTop: 'max(0.5rem, env(safe-area-inset-top, 0.5rem))',
        paddingLeft: 'max(1rem, env(safe-area-inset-left, 1rem))',
        paddingRight: 'max(1rem, env(safe-area-inset-right, 1rem))',
        paddingBottom: '0.5rem',
      }}
    >
      <div className="max-w-3xl mx-auto flex items-center justify-between">
        {/* Left: Notion-style Breadcrumb / Workspace Header */}
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            onClick={() => {
              triggerHaptic('light');
              onToggleMenu();
            }}
            className="w-8 h-8 rounded-lg hover:bg-white/[0.07] active:scale-95 text-zinc-400 hover:text-white flex items-center justify-center transition cursor-pointer flex-shrink-0"
            title="Navigation Menu"
            aria-label="Open Navigation Menu"
          >
            <Menu className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2 min-w-0">
            <div
              className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 transition-colors"
              style={{ backgroundColor: `${identity.accentColor}18` }}
            >
              <CurrentIcon className="w-3.5 h-3.5" style={{ color: identity.accentColor }} />
            </div>

            <div className="flex items-baseline gap-2 min-w-0">
              <h1 className="text-sm sm:text-base font-semibold text-zinc-100 tracking-tight truncate">
                {identity.title}
              </h1>
              <span className="text-[11px] text-zinc-500 font-mono hidden sm:inline select-none">
                {currentIndex + 1} of {TAB_ORDER.length}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Apple-style Minimal Utility Group */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          {/* Universal Search Button (Notion & macOS Spotlight style) */}
          <button
            onClick={() => {
              triggerHaptic('selection');
              setIsSearchOpen(true);
            }}
            className="h-7 sm:h-8 px-2 sm:px-2.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] active:scale-95 border border-white/[0.06] text-zinc-400 hover:text-zinc-200 flex items-center gap-1.5 transition cursor-pointer"
            title="Search & Quick Commands (Cmd+K)"
            aria-label="Universal Search"
          >
            <Search className="w-3.5 h-3.5 text-zinc-400" />
            <span className="text-xs hidden sm:inline font-normal">Search</span>
            <kbd className="hidden md:inline-flex items-center text-[10px] font-mono px-1 py-0.5 rounded bg-white/[0.06] text-zinc-400 border border-white/[0.05]">
              ⌘K
            </kbd>
          </button>

          {/* Cloud Database Sync Indicator (Quiet icon with subtle state dot) */}
          <div
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg hover:bg-white/[0.06] flex items-center justify-center text-zinc-400 transition cursor-help relative"
            title={
              syncStatus === 'syncing'
                ? 'Syncing to cloud database...'
                : syncStatus === 'offline'
                ? 'Offline - saved locally, will sync when online'
                : syncStatus === 'error'
                ? 'Changes saved locally'
                : 'All changes synced to cloud'
            }
          >
            {syncStatus === 'syncing' ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#0a84ff]" />
            ) : syncStatus === 'offline' ? (
              <Cloud className="w-3.5 h-3.5 text-amber-500" />
            ) : (
              <Cloud className="w-3.5 h-3.5 text-zinc-400 hover:text-zinc-200" />
            )}
            <span
              className={`w-1.5 h-1.5 rounded-full absolute bottom-1.5 right-1.5 ring-1 ring-[#09090b] ${
                syncStatus === 'syncing'
                  ? 'bg-[#0a84ff]'
                  : syncStatus === 'offline'
                  ? 'bg-amber-400'
                  : 'bg-emerald-400'
              }`}
            />
          </div>

          {/* Settings Trigger */}
          <button
            onClick={() => {
              triggerHaptic('light');
              setIsSettingsOpen(true);
            }}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg hover:bg-white/[0.07] active:scale-95 text-zinc-400 hover:text-white flex items-center justify-center transition cursor-pointer"
            title="Settings"
            aria-label="Settings"
          >
            <Settings className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>

          {/* Passcode Lock (if enabled) */}
          {settings.isPinEnabled && (
            <button
              onClick={() => {
                triggerHaptic('warning');
                lockApp();
              }}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg hover:bg-white/[0.07] active:scale-95 text-zinc-400 hover:text-[#0a84ff] flex items-center justify-center transition cursor-pointer"
              title="Lock App"
              aria-label="Lock App"
            >
              <Lock className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
