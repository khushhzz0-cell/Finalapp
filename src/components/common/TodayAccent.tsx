import React from 'react';

interface TodayAccentProps {
  className?: string;
  fadeStartPx?: number;
  fadeEndPx?: number;
}

/**
 * Universal visual indicator for "This needs my attention today."
 * Adds a thin, clean, solid, subtle orange partial-border accent that:
 * - Wraps around the left side (top-left curve, left edge, bottom-left curve)
 * - Gradually tapers/fades into the normal border along the top and bottom edges
 * - Does not glow or blur, matching the reference design.
 */
export const TodayAccent: React.FC<TodayAccentProps> = ({
  className = '',
  fadeStartPx = 10,
  fadeEndPx = 24,
}) => {
  return (
    <div
      className={`pointer-events-none absolute inset-0 rounded-[inherit] border-[1.5px] border-[#e6832a]/70 z-10 transition-opacity duration-300 ${className}`}
      style={{
        WebkitMaskImage: `linear-gradient(to right, rgba(0,0,0,1) 0px, rgba(0,0,0,1) ${fadeStartPx}px, rgba(0,0,0,0) ${fadeEndPx}px)`,
        maskImage: `linear-gradient(to right, rgba(0,0,0,1) 0px, rgba(0,0,0,1) ${fadeStartPx}px, rgba(0,0,0,0) ${fadeEndPx}px)`,
      }}
      aria-hidden="true"
    />
  );
};
