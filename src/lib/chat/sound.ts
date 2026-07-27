const MUTE_KEY = "fanclub-chat-muted";

export function isChatMuted(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
}

export function setChatMuted(muted: boolean) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
  } catch {
    /* ignore */
  }
}

/** Kurzer, heller „Bling“-Ton (Web Audio, kein Asset). */
export function playChatBling() {
  if (typeof window === "undefined") return;
  if (isChatMuted()) return;
  if (document.visibilityState === "hidden") return;

  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const playTone = (freq: number, start: number, dur: number, gainPeak: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + start);
      gain.gain.setValueAtTime(0.0001, now + start);
      gain.gain.exponentialRampToValueAtTime(gainPeak, now + start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + start + dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + start);
      osc.stop(now + start + dur + 0.02);
    };

    playTone(988, 0, 0.12, 0.09);
    playTone(1319, 0.07, 0.18, 0.07);

    window.setTimeout(() => {
      void ctx.close();
    }, 400);
  } catch {
    /* ignore autoplay / unsupported */
  }
}
