/**
 * Haptic and Acoustic Feedback System
 *
 * Implements subtle tactile feedback on mobile:
 * 1. Web Audio Micro-Clicks:
 *    - Synthesizes an ultra-clean, micro mechanical click (5-12ms).
 *    - CRITICAL iOS SILENT MODE BEHAVIOR:
 *      On iOS Safari, Web Audio Ambient sound is silenced automatically
 *      whenever the physical hardware mute switch / silent mode is active.
 *      When the phone is not in silent mode, it produces a satisfying subtle tap sound.
 * 2. Mobile Vibration API:
 *    - Uses navigator.vibrate() on supporting devices (e.g. Android).
 *    - Automatically respects device-level vibration/silent profiles.
 */

export type HapticType = 'light' | 'selection' | 'success' | 'warning' | 'medium';

class HapticEngine {
  private audioCtx: AudioContext | null = null;
  private isAudioUnlocked = false;
  private enabled = true;

  constructor() {
    try {
      const saved = localStorage.getItem('focusdo_haptics_enabled');
      if (saved !== null) {
        this.enabled = saved === 'true';
      }
    } catch {
      this.enabled = true;
    }
  }

  public setEnabled(val: boolean) {
    this.enabled = val;
    try {
      localStorage.setItem('focusdo_haptics_enabled', String(val));
    } catch {
      // safe fallback
    }
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;

    if (!this.audioCtx) {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

      if (AudioContextClass) {
        try {
          this.audioCtx = new AudioContextClass();
        } catch {
          this.audioCtx = null;
        }
      }
    }

    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().then(() => {
        this.isAudioUnlocked = true;
      }).catch(() => {});
    }

    return this.audioCtx;
  }

  /**
   * Synthesize an ultra-short acoustic micro-click.
   * On iOS, this is naturally muted if the phone is set to silent.
   */
  private playAcousticClick(type: HapticType) {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const playNow = () => {
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.connect(gain);
        gain.connect(ctx.destination);

        if (type === 'light') {
          // Very subtle micro-tap
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(1200, now);
          osc.frequency.exponentialRampToValueAtTime(300, now + 0.008);
          gain.gain.setValueAtTime(0.045, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.008);
          osc.start(now);
          osc.stop(now + 0.008);
        } else if (type === 'selection') {
          // Tab switch, filter pill, or scrubber click
          osc.type = 'sine';
          osc.frequency.setValueAtTime(1400, now);
          osc.frequency.exponentialRampToValueAtTime(280, now + 0.012);
          gain.gain.setValueAtTime(0.065, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.012);
          osc.start(now);
          osc.stop(now + 0.012);
        } else if (type === 'success') {
          // Two-tone celebratory micro-chirp
          osc.type = 'sine';
          osc.frequency.setValueAtTime(850, now);
          osc.frequency.exponentialRampToValueAtTime(1500, now + 0.022);
          gain.gain.setValueAtTime(0.075, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);
          osc.start(now);
          osc.stop(now + 0.035);
        } else if (type === 'warning') {
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(260, now);
          osc.frequency.exponentialRampToValueAtTime(90, now + 0.025);
          gain.gain.setValueAtTime(0.085, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.025);
          osc.start(now);
          osc.stop(now + 0.025);
        } else {
          // medium / button press
          osc.type = 'sine';
          osc.frequency.setValueAtTime(1050, now);
          osc.frequency.exponentialRampToValueAtTime(240, now + 0.015);
          gain.gain.setValueAtTime(0.065, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.015);
          osc.start(now);
          osc.stop(now + 0.015);
        }
      };

      if (ctx.state === 'suspended') {
        ctx.resume().then(() => {
          playNow();
        }).catch(() => {});
      } else {
        playNow();
      }
    } catch {
      // AudioContext failure safe fallback
    }
  }

  /**
   * Device physical vibration
   */
  private playVibration(type: HapticType) {
    if (typeof navigator === 'undefined' || !('vibrate' in navigator)) return;

    try {
      switch (type) {
        case 'light':
          navigator.vibrate(8);
          break;
        case 'selection':
          navigator.vibrate(12);
          break;
        case 'success':
          navigator.vibrate([12, 35, 18]);
          break;
        case 'warning':
          navigator.vibrate(28);
          break;
        case 'medium':
          navigator.vibrate(18);
          break;
      }
    } catch {
      // safe fallback
    }
  }

  public trigger(type: HapticType = 'light') {
    if (!this.enabled) return;
    this.playAcousticClick(type);
    this.playVibration(type);
  }
}

export const haptics = new HapticEngine();

export const triggerHaptic = (type: HapticType = 'light') => {
  haptics.trigger(type);
};
