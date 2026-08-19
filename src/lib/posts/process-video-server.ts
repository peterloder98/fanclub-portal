import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import ffmpegPath from "ffmpeg-static";
import { POST_VIDEO_MAX_BYTES } from "@/lib/images/specs";

const SCALE_VF =
  "scale='min(1280,iw)':'min(720,ih)':force_original_aspect_ratio=decrease,scale=trunc(iw/2)*2:trunc(ih/2)*2";
const SCALE_VF_SMALL =
  "scale='min(960,iw)':'min(540,ih)':force_original_aspect_ratio=decrease,scale=trunc(iw/2)*2:trunc(ih/2)*2";

type InputProbe = {
  hasVideo: boolean;
  hasAudio: boolean;
};

function runFfmpeg(cmd: string, args: string[]): Promise<{ stderr: string }> {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";
    proc.stderr?.on("data", (chunk) => {
      stderr += String(chunk);
    });
    proc.on("error", reject);
    proc.on("close", (code) => {
      if (code === 0) resolve({ stderr });
      else reject(new Error(stderr.slice(-1200) || `ffmpeg exit ${code}`));
    });
  });
}

async function probeInput(inputPath: string): Promise<InputProbe> {
  if (!ffmpegPath) throw new Error("Video-Verarbeitung nicht verfügbar.");

  return new Promise((resolve, reject) => {
    const proc = spawn(ffmpegPath!, ["-hide_banner", "-i", inputPath], {
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stderr = "";
    proc.stderr?.on("data", (chunk) => {
      stderr += String(chunk);
    });
    proc.on("error", reject);
    proc.on("close", () => {
      const hasVideo = /\n\s*Stream #\d+:\d+.*Video:/i.test(stderr);
      const hasAudio = /\n\s*Stream #\d+:\d+.*Audio:/i.test(stderr);
      resolve({ hasVideo, hasAudio });
    });
  });
}

type EncodeProfile = {
  label: string;
  videoCodec: string;
  preset?: string;
  quality: string;
  qualityFlag: "crf" | "q";
  maxrate: string;
  bufsize: string;
  scaleVf: string;
  audioBitrate: string;
  audioChannels: string;
};

const PRIMARY_PROFILE: EncodeProfile = {
  label: "libx264",
  videoCodec: "libx264",
  preset: "fast",
  quality: "28",
  qualityFlag: "crf",
  maxrate: "1200k",
  bufsize: "2400k",
  scaleVf: SCALE_VF,
  audioBitrate: "96k",
  audioChannels: "2",
};

const SMALL_PROFILE: EncodeProfile = {
  label: "libx264-small",
  videoCodec: "libx264",
  preset: "fast",
  quality: "30",
  qualityFlag: "crf",
  maxrate: "800k",
  bufsize: "1600k",
  scaleVf: SCALE_VF_SMALL,
  audioBitrate: "64k",
  audioChannels: "1",
};

const MPEG4_PROFILE: EncodeProfile = {
  label: "mpeg4",
  videoCodec: "mpeg4",
  quality: "5",
  qualityFlag: "q",
  maxrate: "1200k",
  bufsize: "2400k",
  scaleVf: SCALE_VF,
  audioBitrate: "96k",
  audioChannels: "2",
};

function buildEncodeArgs(
  inputPath: string,
  outPath: string,
  profile: EncodeProfile,
  hasAudio: boolean,
): string[] {
  const args = [
    "-hide_banner",
    "-nostdin",
    "-y",
    "-i",
    inputPath,
    "-map",
    "0:v:0",
    "-vf",
    profile.scaleVf,
    "-c:v",
    profile.videoCodec,
    "-pix_fmt",
    "yuv420p",
    `-${profile.qualityFlag}`,
    profile.quality,
    "-maxrate",
    profile.maxrate,
    "-bufsize",
    profile.bufsize,
    "-movflags",
    "+faststart",
  ];

  if (profile.preset && profile.videoCodec === "libx264") {
    args.push("-preset", profile.preset);
  }

  if (hasAudio) {
    args.push("-map", "0:a:0?", "-c:a", "aac", "-b:a", profile.audioBitrate, "-ac", profile.audioChannels);
  } else {
    args.push("-an");
  }

  args.push(outPath);
  return args;
}

async function encodeWithProfiles(
  inputPath: string,
  outPath: string,
  profiles: EncodeProfile[],
  hasAudio: boolean,
): Promise<void> {
  if (!ffmpegPath) throw new Error("Video-Verarbeitung nicht verfügbar.");

  let lastError = "";
  for (const profile of profiles) {
    await fs.unlink(outPath).catch(() => {});
    try {
      await runFfmpeg(ffmpegPath, buildEncodeArgs(inputPath, outPath, profile, hasAudio));
      const stat = await fs.stat(outPath);
      if (stat.size > 512) return;
      lastError = `${profile.label}: leere Ausgabedatei`;
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
    }
  }
  throw new Error(lastError || "Video-Konvertierung fehlgeschlagen.");
}

/** Technische ffmpeg-Meldungen für Admins verständlich machen. */
export function mapVideoProcessingError(raw: string): string {
  const msg = raw.trim();
  if (!msg) return "Video konnte nicht verarbeitet werden.";

  if (/moov atom not found|invalid data found|could not find codec parameters/i.test(msg)) {
    return "Die Videodatei ist beschädigt oder der Upload war unvollständig. Bitte erneut hochladen.";
  }
  if (/does not contain any stream|no video stream|unknown encoder|could not open encoder/i.test(msg)) {
    if (/Stream #\d+:\d+.*Audio:/i.test(msg) && !/Stream #\d+:\d+.*Video:/i.test(msg)) {
      return "Die Datei enthält kein Video — bitte eine echte Videodatei wählen (nicht nur Ton).";
    }
    return "Video konnte nicht konvertiert werden. Bitte als MP4 (H.264) exportieren oder ein kürzeres Video versuchen.";
  }
  if (/width not divisible by 2|error initializing output stream/i.test(msg)) {
    return "Video-Auflösung konnte nicht verarbeitet werden. Bitte ein anderes Video versuchen.";
  }
  if (/Video ist auch nach Komprimierung zu groß/i.test(msg)) {
    return msg;
  }
  if (/Video-Verarbeitung nicht verfügbar/i.test(msg)) {
    return "Video-Verarbeitung ist auf dem Server gerade nicht verfügbar. Bitte später erneut versuchen.";
  }
  if (/kein Video/i.test(msg)) {
    return msg;
  }
  if (msg.length > 220) {
    return "Video konnte nicht verarbeitet werden. Bitte ein kürzeres Video oder MP4 (H.264) versuchen.";
  }
  return msg;
}

/** Moderate H.264/AAC-Komprimierung für Feed-Videos (Admin). */
export async function processPostVideoForStorage(input: Buffer): Promise<Buffer> {
  if (!ffmpegPath) throw new Error("Video-Verarbeitung nicht verfügbar.");
  if (input.length < 1024) {
    throw new Error("Die Videodatei ist leer oder zu klein — bitte erneut hochladen.");
  }

  const id = randomUUID();
  const inPath = join(tmpdir(), `fc-vid-in-${id}`);
  const outPath = join(tmpdir(), `fc-vid-out-${id}.mp4`);
  const outPath2 = join(tmpdir(), `fc-vid-out2-${id}.mp4`);

  await fs.writeFile(inPath, input);

  try {
    const probe = await probeInput(inPath);
    if (!probe.hasVideo) {
      throw new Error("Die Datei enthält kein Video — bitte eine echte Videodatei wählen.");
    }

    try {
      await encodeWithProfiles(inPath, outPath, [PRIMARY_PROFILE, MPEG4_PROFILE], probe.hasAudio);
    } catch (primaryErr) {
      const detail = primaryErr instanceof Error ? primaryErr.message : String(primaryErr);
      throw new Error(mapVideoProcessingError(detail));
    }

    let out = await fs.readFile(outPath);

    if (out.length > POST_VIDEO_MAX_BYTES) {
      await encodeWithProfiles(
        inPath,
        outPath2,
        [SMALL_PROFILE, { ...MPEG4_PROFILE, scaleVf: SCALE_VF_SMALL, quality: "6" }],
        probe.hasAudio,
      );
      out = await fs.readFile(outPath2);
    }

    if (out.length > POST_VIDEO_MAX_BYTES * 1.25) {
      throw new Error("Video ist auch nach Komprimierung zu groß — bitte ein kürzeres Video wählen.");
    }

    return out;
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    throw new Error(mapVideoProcessingError(message));
  } finally {
    await fs.unlink(inPath).catch(() => {});
    await fs.unlink(outPath).catch(() => {});
    await fs.unlink(outPath2).catch(() => {});
  }
}
