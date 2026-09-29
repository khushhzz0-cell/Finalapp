import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Lock, RefreshCw, FolderOpen } from 'lucide-react';
import { fetchServerPins } from '../../services/pinSyncService';
import { storage } from '../../db/storage';
import { triggerHaptic } from '../../utils/haptics';

const KEYPAD_LETTERS: Record<string, string> = {
  '1': '',
  '2': 'A B C',
  '3': 'D E F',
  '4': 'G H I',
  '5': 'J K L',
  '6': 'M N O',
  '7': 'P Q R S',
  '8': 'T U V',
  '9': 'W X Y Z',
  '0': '',
};

export const AuthLockScreen: React.FC = () => {
  const { unlockApp, unlockAppAsync, settings } = useApp();
  const [pinInput, setPinInput] = useState('');
  const [isError, setIsError] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [knownPins, setKnownPins] = useState<string[]>([]);

  useEffect(() => {
    fetchServerPins()
      .then((pins) => {
        const pinCodes = pins.map((p) => p.pin).filter((p) => p && p !== '1000' && p !== '1234');
        const local = storage.getKnownPins().filter((p) => p && p !== '1000' && p !== '1234');
        const combined = Array.from(new Set([...pinCodes, ...local]));
        setKnownPins(combined);
      })
      .catch(() => {
        const local = storage.getKnownPins().filter((p) => p && p !== '1000' && p !== '1234');
        setKnownPins(local);
      });
  }, []);

  const handleKeyPress = async (digit: string) => {
    if (pinInput.length < 4 && !isVerifying) {
      triggerHaptic('light');
      const next = pinInput + digit;
      setPinInput(next);
      setIsError(false);

      if (next.length === 4) {
        setIsVerifying(true);
        const success = await unlockAppAsync(next);
        setIsVerifying(false);
        if (!success) {
          triggerHaptic('warning');
          setIsError(true);
          setTimeout(() => {
            setPinInput('');
          }, 400);
        } else {
          triggerHaptic('success');
        }
      }
    }
  };

  const handleDelete = () => {
    triggerHaptic('light');
    setPinInput((prev) => prev.slice(0, -1));
    setIsError(false);
  };

  const handleQuickUnlock = () => {
    triggerHaptic('selection');
    unlockApp(settings.pin || '1234');
  };

  const handleSelectWorkspacePin = async (pin: string) => {
    triggerHaptic('selection');
    setPinInput(pin);
    setIsVerifying(true);
    await unlockAppAsync(pin);
    setIsVerifying(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-between p-6 pb-safe select-none">
      {/* Native Mobile Status Bar & Notch Clearance Spacer */}
      <div
        className="w-full sm:hidden pointer-events-none"
        style={{
          height: 'max(3.75rem, calc(env(safe-area-inset-top, 0px) + 1.5rem))',
        }}
        aria-hidden="true"
      />

      {/* Top Section */}
      <div className="w-full max-w-xs flex flex-col items-center mt-2 sm:mt-6 text-center">
        <div className="w-12 h-12 rounded-full bg-[#1c1c1e] flex items-center justify-center mb-3">
          {isVerifying ? (
            <RefreshCw className="w-5 h-5 text-[#0a84ff] animate-spin" />
          ) : (
            <Lock className="w-5 h-5 text-white" />
          )}
        </div>
        <h2 className="text-lg font-semibold text-white tracking-tight">
          Enter Passcode
        </h2>
        <p className="text-xs text-[#8e8e93] mt-0.5">
          {isVerifying ? 'Checking cloud workspace...' : 'Private personal workspace'}
        </p>

        {/* 4 Apple Passcode Dots */}
        <div className={`flex items-center gap-5 mt-6 ${isError ? 'animate-bounce' : ''}`}>
          {[0, 1, 2, 3].map((i) => {
            const isFilled = pinInput.length > i;
            return (
              <div
                key={i}
                className={`w-3.5 h-3.5 rounded-full transition-all duration-150 ${
                  isFilled
                    ? 'bg-white scale-105'
                    : 'border border-white/40 bg-transparent'
                } ${isError ? 'bg-[#ff3b30] border-[#ff3b30]' : ''}`}
              />
            );
          })}
        </div>

        {isError && (
          <p className="text-xs text-[#ff3b30] mt-3 font-medium">
            Incorrect passcode. Enter your 4-digit workspace PIN or 1234.
          </p>
        )}

        {/* Cloud Workspaces Quick Picker */}
        {knownPins.length > 0 && !isError && (
          <div className="mt-4 flex flex-col items-center gap-1.5 w-full">
            <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold flex items-center gap-1">
              <FolderOpen className="w-3 h-3 text-[#0a84ff]" />
              Cloud Workspaces Found
            </span>
            <div className="flex flex-wrap items-center justify-center gap-1.5 max-w-[260px]">
              {knownPins.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => handleSelectWorkspacePin(p)}
                  className="px-2.5 py-1 rounded-lg bg-white/[0.08] hover:bg-[#0a84ff]/20 hover:border-[#0a84ff]/40 border border-white/10 text-white font-mono text-xs font-semibold transition cursor-pointer active:scale-95 flex items-center gap-1"
                >
                  <span className="text-[#0a84ff]">#</span>
                  <span>{p}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* iOS Circular Keypad */}
      <div className="w-full max-w-xs space-y-4 mb-6">
        <div className="grid grid-cols-3 gap-5 justify-items-center">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
            <button
              key={num}
              onClick={() => handleKeyPress(num)}
              className="w-18 h-18 rounded-full bg-[#1c1c1e] hover:bg-[#2c2c2e] active:bg-[#3a3a3c] transition active:scale-95 cursor-pointer flex flex-col items-center justify-center"
            >
              <span className="text-2xl font-normal text-white leading-none">
                {num}
              </span>
              {KEYPAD_LETTERS[num] && (
                <span className="text-[9px] tracking-widest text-[#8e8e93] font-medium mt-1">
                  {KEYPAD_LETTERS[num]}
                </span>
              )}
            </button>
          ))}

          {/* Bottom Row */}
          <div className="w-18 h-18 flex items-center justify-center">
            <button
              onClick={handleQuickUnlock}
              className="text-xs font-medium text-[#8e8e93] hover:text-white transition cursor-pointer"
              title="Unlock with Default PIN (1234)"
            >
              Default
            </button>
          </div>

          <button
            onClick={() => handleKeyPress('0')}
            className="w-18 h-18 rounded-full bg-[#1c1c1e] hover:bg-[#2c2c2e] active:bg-[#3a3a3c] transition active:scale-95 cursor-pointer flex flex-col items-center justify-center"
          >
            <span className="text-2xl font-normal text-white leading-none">
              0
            </span>
          </button>

          <div className="w-18 h-18 flex items-center justify-center">
            {pinInput.length > 0 && (
              <button
                onClick={handleDelete}
                className="text-xs font-medium text-white hover:text-[#8e8e93] transition cursor-pointer"
              >
                Delete
              </button>
            )}
          </div>
        </div>

        <div className="text-center pt-2">
          <p className="text-[11px] text-[#8e8e93]">
            Passcode: <span className="text-white font-medium">Workspace PIN</span> or <span className="text-white font-medium">1234</span>
          </p>
        </div>
      </div>
    </div>
  );
};
