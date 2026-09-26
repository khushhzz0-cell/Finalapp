import React from 'react';
import { RoutineItem } from '../../types';
import { RoutineSlotInfo } from '../../context/AppContext';
import { Check } from 'lucide-react';

interface RoutineCheckmarksProps {
  routine: RoutineItem;
  slotInfo: RoutineSlotInfo;
  onToggleSlot: (slotIndex: number) => void;
  isMainLeftOnly?: boolean;
}

export const RoutineCheckmarks: React.FC<RoutineCheckmarksProps> = ({
  routine,
  slotInfo,
  onToggleSlot,
}) => {
  const isMonthly =
    routine.scheduleType === 'times_per_month' || routine.scheduleType === 'monthly';

  // For multi-target routines, left box remains unchecked until the last unchecked box is done
  const isChecked = slotInfo.target <= 1
    ? slotInfo.completedCount >= 1
    : slotInfo.completedCount >= slotInfo.target;

  return (
    <div
      className="flex items-center justify-center flex-shrink-0"
      onClick={e => e.stopPropagation()}
    >
      <button
        type="button"
        onClick={() => {
          if (slotInfo.isFullyCompleted) {
            onToggleSlot(Math.max(0, slotInfo.completedCount - 1));
          } else {
            onToggleSlot(slotInfo.completedCount);
          }
        }}
        className={`w-5 h-5 rounded-full border flex items-center justify-center transition flex-shrink-0 cursor-pointer active:scale-90 ${
          isChecked
            ? 'bg-[#34c759] border-[#34c759] text-white shadow-sm'
            : 'border-[#8e8e93]/60 hover:border-[#34c759]'
        }`}
        title={
          isChecked
            ? `${routine.title} completed (tap to uncheck)`
            : `${routine.title} (${slotInfo.completedCount}/${slotInfo.target} completed)`
        }
      >
        {isChecked ? (
          <Check className="w-3 h-3 stroke-[3]" />
        ) : isMonthly ? (
          <span className="text-[10px] font-bold text-[#8e8e93] leading-none select-none">
            M
          </span>
        ) : null}
      </button>
    </div>
  );
};
