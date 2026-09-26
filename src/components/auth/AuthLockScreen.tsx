import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Lock } from 'lucide-react';

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
  const { unlockApp, settings } = useApp();
  const [pinInput, setPinInput] = useState('');
  const [isError, setIsError] = useState(false);

  const handleKeyPress = (digit: string) => {
    if (pinInput.length < 4) {
      const next = pinInput + digit;
      setPinInput(next);
      setIsError(false);

      if (next.length === 4) {
        const success = unlockApp(next);
        if (!success) {
          setIsError(true);
          setTimeout(() => {
            setPinInput('');
          }, 400);
        }
      }
    }
  };

  const handleDelete = () => {
    setPinInput(prev => prev.slice(0, -1));
    setIsError(false);
  };

  const handleQuickUnlock = () => {
    unlockApp(settings.pin || '1234');
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
      <div className="w-full max-w-xs flex flex-col items-center mt-2 sm:mt-8 text-center">
        <div className="w-12 h-12 rounded-full bg-[#1c1c1e] flex items-center justify-center mb-3">
          <Lock className="w-5 h-5 text-white" />
        </div>
        <h2 className="text-lg font-semibold text-white tracking-tight">
          Enter Passcode
        </h2>
        <p className="text-xs text-[#8e8e93] mt-0.5">
          Private personal workspace
        </p>

        {/* 4 Apple Passcode Dots */}
        <div className={`flex items-center gap-5 mt-7 ${isError ? 'animate-bounce' : ''}`}>
          {[0, 1, 2, 3].map(i => {
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
            Incorrect passcode. Default is 1234.
          </p>
        )}
      </div>

      {/* iOS Circular Keypad */}
      <div className="w-full max-w-xs space-y-4 mb-8">
        <div className="grid grid-cols-3 gap-5 justify-items-center">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
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

        <div className="text-center pt-3">
          <p className="text-[11px] text-[#8e8e93]">
            Default passcode: <span className="text-white font-medium">1234</span>
          </p>
        </div>
      </div>
    </div>
  );
};
