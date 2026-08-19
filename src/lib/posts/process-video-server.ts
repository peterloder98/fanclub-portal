import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import ffmpegPath from "ffmpeg-static";
import { POST_VIDEO_MAX_BYTES } from "@/lib/images/specs";

function runFfmpeg(cmd: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"] });
    let err = "";
    proc.stderr?.on("data", (chunk) => {
      err += String(chunk);
    });
    proc.on("error", reject);
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(err.slice(-600) || `ffmpeg exit ${code}`));
    });
  });
}

/** Moderate H.264/AAC-Komprimierung für Feed-Videos (Admin). */
export async function processPostVideoForStorage(input: Buffer): Promise<Buffer> {
  if (!ffmpegPath) throw new Error("Video-Verarbeitung nicht verfügbar.");

  const id = randomUUID();
  const inPath = join(tmpdir(), `fc-vid-in-${id}`);
  const outPath = join(tmpdir(), `fc-vid-out-${id}.mp4`);
  const outPath2 = join(tmpdir(), `fc-vid-out2-${id}.mp4`);

  await fs.writeFile(inPath, input);

  try {
    await runFfmpeg(ffmpegPath, [
      "-i",
      inPath,
      "-vf",
      "scale='min(1280,iw)':'min(720,ih)':force_original_aspect_ratio=decrease",
      "-c:v",
      "libx264",
      "-preset",
      "medium",
      "-crf",
      "28",
      "-maxrate",
      "1200k",
      "-bufsize",
      "2400k",
      "-pix_fmt",
      "yuv420p",
      "-c:a",
      "aac",
      "-b:a",
      "96k",
      "-ac",
      "2",
      "-movflags",
      "+faststart",
      "-y",
      outPath,
    ]);

    let out = await fs.readFile(outPath);

    if (out.length > POST_VIDEO_MAX_BYTES) {
      await runFfmpeg(ffmpegPath, [
        "-i",
        outPath,
        "-vf",
        "scale='min(960,iw)':'min(540,ih)':force_original_aspect_ratio=decrease",
        "-c:v",
        "libx264",
        "-preset",
        "fast",
        "-crf",
        "30",
        "-maxrate",
        "800k",
        "-bufsize",
        "1600k",
        "-pix_fmt",
        "yuv420p",
        "-c:a",
        "aac",
        "-b:a",
        "64k",
        "-ac",
        "1",
        "-movflags",
        "+faststart",
        "-y",
        outPath2,
      ]);
      out = await fs.readFile(outPath2);
    }

    if (out.length > POST_VIDEO_MAX_BYTES * 1.25) {
      throw new Error("Video ist auch nach Komprimierung zu groß.");
    }

    return out;
  } finally {
    await fs.unlink(inPath).catch(() => {});
    await fs.unlink(outPath).catch(() => {});
    await fs.unlink(outPath2).catch(() => {});
  }
}
