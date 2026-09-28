import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import {
  KeyRound,
  X,
  RefreshCw,
  CheckCircle2,
  Cloud,
  ArrowRight,
  Shuffle,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import { triggerHaptic } from '../../utils/haptics';
import { checkPinExists, cleanPin } from '../../services/pinSyncService';

export const SyncCodeModal: React.FC = () => {
  const {
    isSyncCodeModalOpen,
    setIsSyncCodeModalOpen,
    syncPin,
    setSyncPin,
    syncNow,
    syncStatus,
    lastSyncedTime,
  } = useApp();

  const [inputCode, setInputCode] = useState(syncPin);
  const [isChecking, setIsChecking] = useState(false);
  const [codeExists, setCodeExists] = useState<boolean | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  useEffect(() => {
    if (isSyncCodeModalOpen) {
      setInputCode(syncPin);
      setActionNotice(null);
      setCodeExists(null);
    }
  }, [isSyncCodeModalOpen, syncPin]);

  // Check code existence on input change
  useEffect(() => {
    const cleaned = cleanPin(inputCode);
    if (cleaned.length === 4 && cleaned !== syncPin) {
      setIsChecking(true);
      let isCurrent = true;
      checkPinExists(cleaned)
        .then((exists) => {
          if (isCurrent) {
            setCodeExists(exists);
            setIsChecking(false);
          }
        })
        .catch(() => {
          if (isCurrent) {
            setCodeExists(null);
            setIsChecking(false);
          }
        });
      return () => {
        isCurrent = false;
      };
    } else {
      setCodeExists(null);
      setIsChecking(false);
    }
  }, [inputCode, syncPin]);

  if (!isSyncCodeModalOpen) return null;

  const handleGenerateRandom = () => {
    triggerHaptic('light');
    const random = Math.floor(1000 + Math.random() * 9000).toString();
    setInputCode(random);
  };

  const handleSwitchCode = async (mode: 'auto' | 'migrate' | 'fresh' = 'auto') => {
    const cleaned = cleanPin(inputCode);
    if (cleaned.length !== 4) return;

    triggerHaptic('selection');
    await setSyncPin(cleaned, mode);
    setActionNotice(`Active user set to #${cleaned}`);
    setTimeout(() => {
      setIsSyncCodeModalOpen(false);
    }, 900);
  };

  const isCurrentPin = cleanPin(inputCode) === syncPin;
  const isValidLength = inputCode.replace(/\D/g, '').length === 4;

  return (
    <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-[#18181b] border border-white/10 rounded-2xl w-full max-w-md p-5 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#0a84ff]/15 flex items-center justify-center text-[#0a84ff]">
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-zinc-100">
                Unique User Sync Code
              </h3>
              <p className="text-[11px] text-zinc-400">
                Sync all data to this 4-digit user code
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsSyncCodeModalOpen(false)}
            className="w-7 h-7 rounded-lg hover:bg-white/[0.08] active:scale-95 text-zinc-400 hover:text-white flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Current Active Code Status */}
        <div className="p-3 rounded-xl bg-black/40 border border-white/[0.06] flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold block">
              Currently Active Code
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold font-mono tracking-wider text-white">
                #{syncPin}
              </span>
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Active & Synced
              </span>
            </div>
          </div>

          <button
            onClick={() => syncNow()}
            disabled={syncStatus === 'syncing'}
            className="px-2.5 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] active:scale-95 text-zinc-300 hover:text-white text-xs font-medium transition cursor-pointer flex items-center gap-1.5 disabled:opacity-40"
            title="Sync Now"
          >
            {syncStatus === 'syncing' ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#0a84ff]" />
            ) : (
              <Cloud className="w-3.5 h-3.5 text-zinc-400" />
            )}
            <span className="text-[11px]">Sync Now</span>
          </button>
        </div>

        {/* 4-Digit Input Form */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-zinc-300 block">
            Enter 4-Digit Code to Switch User / Sync:
          </label>

          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 font-mono font-bold text-base">
                #
              </span>
              <input
                type="text"
                pattern="[0-9]{4}"
                maxLength={4}
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="e.g. 7788"
                autoFocus
                className="w-full pl-8 pr-3 py-2.5 rounded-xl bg-black/50 border border-white/10 text-lg text-zinc-100 font-mono font-bold tracking-widest focus:outline-none focus:border-[#0a84ff]"
              />
            </div>

            <button
              type="button"
              onClick={handleGenerateRandom}
              className="p-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] active:scale-95 text-zinc-400 hover:text-zinc-200 transition cursor-pointer"
              title="Generate Random 4-Digit Code"
            >
              <Shuffle className="w-4 h-4" />
            </button>
          </div>

          {/* Code Inspection & Status hint */}
          {isValidLength && !isCurrentPin && (
            <div className="p-2.5 rounded-lg bg-black/30 border border-white/[0.04] text-xs space-y-1.5 animate-in fade-in">
              {isChecking ? (
                <div className="flex items-center gap-1.5 text-zinc-400 text-[11px]">
                  <RefreshCw className="w-3 h-3 animate-spin text-[#0a84ff]" />
                  <span>Checking code #{inputCode}...</span>
                </div>
              ) : codeExists ? (
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-emerald-400 font-medium text-[11px]">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Existing workspace found for #{inputCode}!</span>
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    Switching will load all data saved under #{inputCode}.
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-[#0a84ff] font-medium text-[11px]">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>New Code #{inputCode}</span>
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    This code is brand new. Choose how to initialize it:
                  </p>
                </div>
              )}
            </div>
          )}

          {actionNotice && (
            <div className="p-2 rounded-lg bg-emerald-500/15 text-emerald-400 text-xs font-medium flex items-center gap-1.5 animate-in fade-in">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{actionNotice}</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-1">
          {isValidLength && !isCurrentPin && !codeExists && !isChecking ? (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleSwitchCode('migrate')}
                className="w-full py-2.5 px-3 rounded-xl bg-[#0a84ff] hover:bg-[#0071e3] active:scale-95 text-white text-xs font-semibold transition cursor-pointer text-center"
              >
                Sync Current Data to #{inputCode}
              </button>
              <button
                type="button"
                onClick={() => handleSwitchCode('fresh')}
                className="w-full py-2.5 px-3 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] active:scale-95 text-zinc-200 text-xs font-semibold transition cursor-pointer text-center"
              >
                Start Fresh Empty #{inputCode}
              </button>
            </div>
          ) : (
            <button
              type="button"
              disabled={!isValidLength || isCurrentPin}
              onClick={() => handleSwitchCode('auto')}
              className="w-full py-2.5 px-4 rounded-xl bg-[#0a84ff] hover:bg-[#0071e3] active:scale-95 disabled:opacity-40 disabled:pointer-events-none text-white text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span>{isCurrentPin ? 'Current Active Code' : `Switch to Code #${inputCode}`}</span>
              {!isCurrentPin && <ArrowRight className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>

        {/* Explain how it works */}
        <div className="pt-2 border-t border-white/[0.06] text-[11px] text-zinc-400 leading-relaxed space-y-1">
          <div className="flex items-center gap-1.5 text-zinc-300 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>How Sync Codes Work:</span>
          </div>
          <p>
            • Every 4-digit code is a completely isolated unique user workspace.
            <br />
            • Enter this same code on another phone, computer, or browser tab to load your synced data.
            <br />
            • Two different codes never mix data.
          </p>
        </div>
      </div>
    </div>
  );
};
