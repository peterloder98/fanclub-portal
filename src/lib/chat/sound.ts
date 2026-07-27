const MUTE_KEY = "fanclub-chat-muted";

let sharedCtx: AudioContext | null = null;
let unlockInstalled = false;

function getAudioContextCtor(): typeof AudioContext | null {
  if (typeof window === "undefined") return null;
  return (
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext ||
    null
  );
}

function getSharedContext(): AudioContext | null {
  const Ctor = getAudioContextCtor();
  if (!Ctor) return null;
  if (!sharedCtx || sharedCtx.state === "closed") {
    sharedCtx = new Ctor();
  }
  return sharedCtx;
}

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

/** Nach Klick/Tastatur: AudioContext freischalten (Browser-Autoplay). */
export async function unlockChatAudio(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  try {
    const ctx = getSharedContext();
    if (!ctx) return false;
    if (ctx.state === "suspended") {
      await ctx.resume();
    }
    return ctx.state === "running";
  } catch {
    return false;
  }
}

/** Einmalig bei erster Interaktion freischalten. */
export function installChatAudioUnlock() {
  if (typeof window === "undefined" || unlockInstalled) return;
  unlockInstalled = true;
  const unlock = () => {
    void unlockChatAudio();
  };
  window.addEventListener("pointerdown", unlock, { capture: true });
  window.addEventListener("keydown", unlock, { capture: true });
}

function scheduleTone(
  ctx: AudioContext,
  freq: number,
  start: number,
  dur: number,
  gainPeak: number,
) {
  const now = ctx.currentTime;
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
}

/** Kurzer, heller „Bling“-Ton (Web Audio, kein Asset). */
export function playChatBling(opts?: { force?: boolean }) {
  if (typeof window === "undefined") return;
  if (!opts?.force && isChatMuted()) return;

  void (async () => {
    try {
      const ctx = getSharedContext();
      if (!ctx) return;
      if (ctx.state === "suspended") {
        await ctx.resume();
      }
      if (ctx.state !== "running") return;

      scheduleTone(ctx, 988, 0, 0.12, 0.12);
      scheduleTone(ctx, 1319, 0.07, 0.18, 0.1);
    } catch {
      /* ignore autoplay / unsupported */
    }
  })();
}
