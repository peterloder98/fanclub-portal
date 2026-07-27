const MUTE_KEY = "fanclub-chat-muted";

let sharedCtx: AudioContext | null = null;
let unlockInstalled = false;
let htmlAudio: HTMLAudioElement | null = null;
let audioUnlocked = false;

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

/** Kurzer Stereo-WAV (≈0.28s) als Data-URI — zuverlässiger als reines WebAudio unter Safari. */
function buildBlingDataUri(): string {
  const sampleRate = 22050;
  const duration = 0.28;
  const n = Math.floor(sampleRate * duration);
  const data = new Int16Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    let amp = 0;
    if (t < 0.14) {
      const env = Math.min(1, t / 0.012) * Math.max(0, 1 - (t - 0.02) / 0.12);
      amp = Math.sin(2 * Math.PI * 988 * t) * env;
    } else {
      const u = t - 0.07;
      const env = Math.min(1, u / 0.012) * Math.max(0, 1 - (u - 0.02) / 0.16);
      amp = Math.sin(2 * Math.PI * 1319 * t) * env * 0.95;
    }
    data[i] = Math.max(-32767, Math.min(32767, Math.floor(amp * 0.55 * 32767)));
  }
  const bytesPerSample = 2;
  const blockAlign = bytesPerSample;
  const buffer = new ArrayBuffer(44 + data.length * bytesPerSample);
  const view = new DataView(buffer);
  const writeStr = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
  };
  writeStr(0, "RIFF");
  view.setUint32(4, 36 + data.length * bytesPerSample, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeStr(36, "data");
  view.setUint32(40, data.length * bytesPerSample, true);
  for (let i = 0; i < data.length; i++) {
    view.setInt16(44 + i * 2, data[i]!, true);
  }
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
  return `data:audio/wav;base64,${btoa(binary)}`;
}

function getHtmlAudio(): HTMLAudioElement | null {
  if (typeof window === "undefined") return null;
  if (!htmlAudio) {
    htmlAudio = new Audio(buildBlingDataUri());
    htmlAudio.preload = "auto";
    htmlAudio.volume = 0.85;
  }
  return htmlAudio;
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

/** Nach Klick/Tastatur: Audio freischalten (Browser-Autoplay, Safari). */
export async function unlockChatAudio(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  let ok = false;
  try {
    const ctx = getSharedContext();
    if (ctx) {
      if (ctx.state === "suspended") await ctx.resume();
      if (ctx.state === "running") ok = true;
    }
  } catch {
    /* ignore */
  }
  try {
    const audio = getHtmlAudio();
    if (audio) {
      // Dieselbe Audio-Instanz einmal leise abspielen → späteres play() erlaubt
      const prev = audio.volume;
      audio.muted = true;
      audio.currentTime = 0;
      await audio.play();
      audio.pause();
      audio.currentTime = 0;
      audio.muted = false;
      audio.volume = prev || 0.9;
      audioUnlocked = true;
      ok = true;
    }
  } catch {
    /* ignore — oft ohne User-Geste */
  }
  return ok;
}

/** Einmalig bei Interaktion + Tab-Fokus freischalten. */
export function installChatAudioUnlock() {
  if (typeof window === "undefined" || unlockInstalled) return;
  unlockInstalled = true;
  const unlock = () => {
    void unlockChatAudio();
  };
  window.addEventListener("pointerdown", unlock, { capture: true });
  window.addEventListener("keydown", unlock, { capture: true });
  window.addEventListener("touchstart", unlock, { capture: true, passive: true });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") void unlockChatAudio();
  });
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
  gain.gain.exponentialRampToValueAtTime(gainPeak, now + start + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + start + dur);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now + start);
  osc.stop(now + start + dur + 0.02);
}

function playViaWebAudio() {
  const ctx = getSharedContext();
  if (!ctx || ctx.state !== "running") return false;
  // Deutlich lauter als zuvor (0.12) — auf manchen Macs/Browsertabs war der Ton kaum hörbar
  scheduleTone(ctx, 988, 0, 0.13, 0.38);
  scheduleTone(ctx, 1319, 0.07, 0.2, 0.32);
  return true;
}

function playViaHtmlAudio() {
  const audio = getHtmlAudio();
  if (!audio || !audioUnlocked) return false;
  try {
    audio.pause();
    audio.currentTime = 0;
    audio.volume = 0.9;
    void audio.play();
    return true;
  } catch {
    return false;
  }
}

/** Kurzer, heller „Bling“-Ton — HTML-Audio (Safari-tauglich) + Web-Audio-Fallback. */
export function playChatBling(opts?: { force?: boolean }) {
  if (typeof window === "undefined") return;
  if (!opts?.force && isChatMuted()) return;

  void (async () => {
    try {
      await unlockChatAudio();
      // HTML-Audio zuerst: nach User-Geste auf Safari/Chrome zuverlässiger
      if (playViaHtmlAudio()) return;
      playViaWebAudio();
    } catch {
      try {
        playViaWebAudio();
      } catch {
        /* ignore */
      }
    }
  })();
}
