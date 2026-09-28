import React, { useState, useEffect, useCallback } from 'react';
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
  FolderOpen,
} from 'lucide-react';
import { triggerHaptic } from '../../utils/haptics';
import {
  checkPinExistsDetailed,
  cleanPin,
  fetchServerPins,
  PinDetailedStatus,
} from '../../services/pinSyncService';
import { storage } from '../../db/storage';

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
  const [pinStatus, setPinStatus] = useState<PinDetailedStatus | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [knownWorkspaces, setKnownWorkspaces] = useState<Array<{
    pin: string;
    projectsCount: number;
    routinesCount: number;
    habitsCount: number;
    lastSyncedAt: string | null;
  }>>([]);

  const refreshKnownList = useCallback(async () => {
    const serverPins = await fetchServerPins();
    const localPins = storage.getKnownPins();
    const combinedPins = Array.from(new Set([...localPins, ...serverPins.map(s => s.pin)]));

    const fullList = combinedPins.map(p => {
      const serverEntry = serverPins.find(s => s.pin === p);
      const localEntry = storage.getLocalPinSummary(p);
      return {
        pin: p,
        projectsCount: serverEntry?.projectsCount ?? localEntry?.projectsCount ?? 0,
        routinesCount: serverEntry?.routinesCount ?? localEntry?.routinesCount ?? 0,
        habitsCount: serverEntry?.habitsCount ?? localEntry?.habitsCount ?? 0,
        lastSyncedAt: serverEntry?.lastSyncedAt ?? localEntry?.lastSaved ?? null,
      };
    });

    setKnownWorkspaces(fullList);
  }, []);

  useEffect(() => {
    if (isSyncCodeModalOpen) {
      setInputCode(syncPin);
      setActionNotice(null);
      setPinStatus(null);
      refreshKnownList();
    }
  }, [isSyncCodeModalOpen, syncPin, refreshKnownList]);

  // Check code existence on input change
  useEffect(() => {
    const cleaned = cleanPin(inputCode);
    if (cleaned.length === 4 && cleaned !== syncPin) {
      setIsChecking(true);
      let isCurrent = true;
      checkPinExistsDetailed(cleaned)
        .then((status) => {
          if (isCurrent) {
            setPinStatus(status);
            setIsChecking(false);
          }
        })
        .catch(() => {
          if (isCurrent) {
            setPinStatus(null);
            setIsChecking(false);
          }
        });
      return () => {
        isCurrent = false;
      };
    } else {
      setPinStatus(null);
      setIsChecking(false);
    }
  }, [inputCode, syncPin]);

  if (!isSyncCodeModalOpen) return null;

  const handleGenerateRandom = () => {
    triggerHaptic('light');
    const random = Math.floor(1000 + Math.random() * 9000).toString();
    setInputCode(random);
  };

  const handleSwitchCode = async (targetCode: string, mode: 'auto' | 'migrate' | 'fresh' = 'auto') => {
    const cleaned = cleanPin(targetCode);
    if (cleaned.length !== 4) return;

    triggerHaptic('selection');
    setActionNotice(`Saving & switching to #${cleaned}...`);
    await setSyncPin(cleaned, mode);
    setActionNotice(`Active user set to #${cleaned}`);
    await refreshKnownList();
    setTimeout(() => {
      setIsSyncCodeModalOpen(false);
    }, 700);
  };

  const isCurrentPin = cleanPin(inputCode) === syncPin;
  const isValidLength = inputCode.replace(/\D/g, '').length === 4;

  return (
    <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-[#18181b] border border-white/10 rounded-2xl w-full max-w-md p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
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
                Switch workspaces or sync across devices
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

        {/* Quick Switch to Known Workspaces */}
        {knownWorkspaces.length > 1 && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between px-0.5">
              <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold flex items-center gap-1">
                <FolderOpen className="w-3 h-3 text-zinc-400" />
                Your Workspaces ({knownWorkspaces.length})
              </span>
              <span className="text-[10px] text-zinc-500">Tap to switch</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {knownWorkspaces.map(ws => {
                const isActive = ws.pin === syncPin;
                return (
                  <button
                    key={ws.pin}
                    type="button"
                    onClick={() => {
                      if (!isActive) {
                        setInputCode(ws.pin);
                        handleSwitchCode(ws.pin, 'auto');
                      }
                    }}
                    className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                      isActive
                        ? 'bg-[#0a84ff]/10 border-[#0a84ff]/40 text-white shadow-sm'
                        : 'bg-black/30 border-white/[0.06] hover:bg-white/[0.04] text-zinc-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-sm tracking-wider">
                        #{ws.pin}
                      </span>
                      {isActive && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-400 font-medium">
                          Active
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-zinc-400 mt-1 flex items-center gap-2">
                      <span>{ws.projectsCount} proj</span>
                      <span>•</span>
                      <span>{ws.routinesCount} rout</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

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
              ) : pinStatus?.exists ? (
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-emerald-400 font-medium text-[11px]">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Existing workspace found for #{inputCode}!</span>
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    Contains {pinStatus.projectsCount} projects and {pinStatus.routinesCount} routines. Switching will restore all saved data.
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
          {isValidLength && !isCurrentPin && !pinStatus?.exists && !isChecking ? (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleSwitchCode(inputCode, 'migrate')}
                className="w-full py-2.5 px-3 rounded-xl bg-[#0a84ff] hover:bg-[#0071e3] active:scale-95 text-white text-xs font-semibold transition cursor-pointer text-center"
              >
                Sync Current Data to #{inputCode}
              </button>
              <button
                type="button"
                onClick={() => handleSwitchCode(inputCode, 'fresh')}
                className="w-full py-2.5 px-3 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] active:scale-95 text-zinc-200 text-xs font-semibold transition cursor-pointer text-center"
              >
                Start Fresh Empty #{inputCode}
              </button>
            </div>
          ) : (
            <button
              type="button"
              disabled={!isValidLength || isCurrentPin || isChecking}
              onClick={() => handleSwitchCode(inputCode, 'auto')}
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
            • Two different codes never mix data. Switching always saves your active work first.
          </p>
        </div>
      </div>
    </div>
  );
};
