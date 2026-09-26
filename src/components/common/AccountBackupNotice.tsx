import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Cloud, X, LogIn } from 'lucide-react';
import { triggerHaptic } from '../../utils/haptics';

export const AccountBackupNotice: React.FC = () => {
  const { user, isAuthLoading, signIn } = useApp();
  const [dismissed, setDismissed] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('focusdo_backup_notice_dismissed') === 'true';
    } catch {
      return false;
    }
  });

  if (isAuthLoading || user || dismissed) {
    return null;
  }

  const handleDismiss = () => {
    triggerHaptic('light');
    setDismissed(true);
    try {
      sessionStorage.setItem('focusdo_backup_notice_dismissed', 'true');
    } catch {}
  };

  return (
    <div className="relative z-20 bg-gradient-to-r from-[#0a84ff]/15 via-indigo-500/10 to-[#0a84ff]/15 border-b border-[#0a84ff]/20 px-3 py-1.5 transition-all animate-in fade-in duration-300">
      <div className="max-w-3xl mx-auto flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Cloud className="w-3.5 h-3.5 text-[#0a84ff] flex-shrink-0 animate-pulse" />
          <p className="text-[11px] text-zinc-300 truncate">
            <span className="font-semibold text-white">Save across tabs & devices:</span> Sign in to keep all your changes backed up to your account.
          </p>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={() => {
              triggerHaptic('selection');
              signIn();
            }}
            className="px-2.5 py-0.5 rounded-md bg-[#0a84ff] hover:bg-[#0071e3] text-white text-[11px] font-semibold flex items-center gap-1 transition cursor-pointer shadow-sm shadow-[#0a84ff]/30 active:scale-95"
          >
            <LogIn className="w-3 h-3" />
            <span>Sign In</span>
          </button>

          <button
            onClick={handleDismiss}
            className="w-5 h-5 rounded hover:bg-white/10 text-zinc-400 hover:text-zinc-200 flex items-center justify-center transition cursor-pointer"
            title="Dismiss for this session"
            aria-label="Dismiss banner"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
};
