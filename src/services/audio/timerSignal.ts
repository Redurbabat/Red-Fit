/**
 * Rest-timer end signal: a short two-tone beep plus vibration.
 * iOS Safari only allows audio after a user gesture, so the workout screen
 * calls `armTimerSignal()` inside the "Satz fertig" tap — that creates and
 * unlocks the AudioContext which the later `playTimerSignal()` reuses.
 */

let audioContext: AudioContext | null = null;

type WebkitWindow = Window & { webkitAudioContext?: typeof AudioContext };

function getAudioContextClass(): typeof AudioContext | undefined {
  if (typeof window === "undefined") return undefined;
  return window.AudioContext ?? (window as WebkitWindow).webkitAudioContext;
}

/** Create/unlock the AudioContext — MUST be called from a user gesture. */
export function armTimerSignal(): void {
  const Ctx = getAudioContextClass();
  if (!Ctx) return;
  try {
    if (!audioContext) audioContext = new Ctx();
    if (audioContext.state === "suspended") void audioContext.resume();
  } catch {
    audioContext = null;
  }
}

function beep(context: AudioContext, frequency: number, startAt: number, duration: number): void {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = "sine";
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(0, startAt);
  gain.gain.linearRampToValueAtTime(0.18, startAt + 0.02);
  gain.gain.linearRampToValueAtTime(0, startAt + duration);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(startAt);
  oscillator.stop(startAt + duration + 0.02);
}

/** Play the "Pause vorbei" signal. Silently does nothing if audio is locked. */
export function playTimerSignal(): void {
  // Vibration (Android/desktop; iOS ignores it — the beep covers iPhone).
  try {
    navigator.vibrate?.([180, 90, 180]);
  } catch {
    /* not available */
  }

  const context = audioContext;
  if (!context || context.state !== "running") return;
  const now = context.currentTime;
  beep(context, 880, now, 0.16);
  beep(context, 1175, now + 0.22, 0.22);
}
