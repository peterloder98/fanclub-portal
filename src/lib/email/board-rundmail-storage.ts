import type { SupabaseClient } from "@supabase/supabase-js";
import {
  BOARD_RUNDMAIL_FILE_TYPES,
  BOARD_RUNDMAIL_MAX_FILES,
  BOARD_RUNDMAIL_MAX_TOTAL_BYTES,
  isAllowedBoardRundmailMime,
} from "@/lib/email/board-rundmail-content";

export const BOARD_RUNDMAIL_BUCKET = "board-rundmail";

const BUCKET_MIME_TYPES = [
  ...new Set([...Object.values(BOARD_RUNDMAIL_FILE_TYPES).map((entry) => entry.mime), "application/json"]),
];

export type StoredBoardRundmailFile = {
  path: string;
  filename: string;
  contentType: string;
  bytes: Uint8Array;
};

export type BoardRundmailManifest = {
  subject: string;
  html: string;
  text: string;
  attachments: { path: string; filename: string; contentType: string }[];
};

function campaignPrefix(campaignId: string): string {
  return `campaigns/${campaignId}`;
}

export function boardRundmailManifestPath(campaignId: string): string {
  return `${campaignPrefix(campaignId)}/manifest.json`;
}

export function rundmailIdFromContext(context: Record<string, unknown> | null | undefined): string | null {
  const id = context?.rundmail_id;
  return typeof id === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
    ? id
    : null;
}

export async function ensureBoardRundmailBucket(admin: SupabaseClient): Promise<void> {
  const existing = await admin.storage.getBucket(BOARD_RUNDMAIL_BUCKET);
  if (!existing.data) {
    const created = await admin.storage.createBucket(BOARD_RUNDMAIL_BUCKET, {
      public: false,
      fileSizeLimit: 4 * 1024 * 1024,
      allowedMimeTypes: BUCKET_MIME_TYPES,
    });
    if (created.error && !/already exists|duplicate/i.test(created.error.message)) {
      throw new Error(created.error.message);
    }
    return;
  }
  const updated = await admin.storage.updateBucket(BOARD_RUNDMAIL_BUCKET, {
    public: false,
    fileSizeLimit: 4 * 1024 * 1024,
    allowedMimeTypes: BUCKET_MIME_TYPES,
  });
  if (updated.error) {
    console.warn("[rundmail] Bucket-Typen nicht aktualisiert:", updated.error.message);
  }
}

export async function uploadBoardRundmailCampaign(
  admin: SupabaseClient,
  campaignId: string,
  input: {
    subject: string;
    html: string;
    text: string;
    files: StoredBoardRundmailFile[];
  },
): Promise<void> {
  await ensureBoardRundmailBucket(admin);
  for (const file of input.files) {
    const { error } = await admin.storage.from(BOARD_RUNDMAIL_BUCKET).upload(file.path, Buffer.from(file.bytes), {
      contentType: file.contentType,
      upsert: false,
    });
    if (error) throw new Error(error.message);
  }
  const manifest: BoardRundmailManifest = {
    subject: input.subject,
    html: input.html,
    text: input.text,
    attachments: input.files.map((file) => ({
      path: file.path,
      filename: file.filename,
      contentType: file.contentType,
    })),
  };
  const { error } = await admin.storage
    .from(BOARD_RUNDMAIL_BUCKET)
    .upload(boardRundmailManifestPath(campaignId), Buffer.from(JSON.stringify(manifest)), {
      contentType: "application/json",
      upsert: false,
    });
  if (error) throw new Error(error.message);
}

export async function deleteBoardRundmailFiles(admin: SupabaseClient, campaignId: string): Promise<void> {
  const folder = campaignPrefix(campaignId);
  const { data, error } = await admin.storage.from(BOARD_RUNDMAIL_BUCKET).list(folder, { limit: 100 });
  if (error || !data?.length) return;
  const paths = data
    .map((entry) => entry.name)
    .filter((name) => name && !name.includes("/") && !name.includes(".."))
    .map((name) => `${folder}/${name}`);
  if (!paths.length) return;
  await admin.storage.from(BOARD_RUNDMAIL_BUCKET).remove(paths);
}

/** Dateien löschen, sobald keine wartende Mail dieser Rundmail mehr offen ist. */
export async function releaseBoardRundmailStorageIfDone(
  admin: SupabaseClient,
  context: Record<string, unknown> | null | undefined,
): Promise<void> {
  const id = rundmailIdFromContext(context);
  if (!id) return;
  const { count, error } = await admin
    .from("email_outbound_queue")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending")
    .like("dedupe_key", `rundmail:${id}:%`);
  if (error || count == null || count > 0) {
    if (error) console.error("[rundmail] Aufräumen übersprungen:", error.message);
    return;
  }
  try {
    await deleteBoardRundmailFiles(admin, id);
  } catch (cleanupError) {
    console.error(
      "[rundmail] Aufräumen fehlgeschlagen:",
      cleanupError instanceof Error ? cleanupError.message : "unknown",
    );
  }
}

export async function downloadBoardRundmailCampaign(
  admin: SupabaseClient,
  campaignId: string,
): Promise<{ manifest: BoardRundmailManifest; files: { filename: string; contentType: string; content: Buffer }[] }> {
  const { data, error } = await admin.storage
    .from(BOARD_RUNDMAIL_BUCKET)
    .download(boardRundmailManifestPath(campaignId));
  if (error || !data) throw new Error(error?.message || "Rundmail-Text fehlt");
  const parsed = JSON.parse(await data.text()) as Partial<BoardRundmailManifest>;
  if (!parsed || typeof parsed.subject !== "string" || typeof parsed.html !== "string") {
    throw new Error("Rundmail-Text ist ungültig");
  }
  const attachments = Array.isArray(parsed.attachments) ? parsed.attachments : [];
  if (attachments.length > BOARD_RUNDMAIL_MAX_FILES) throw new Error("Zu viele Anhänge");
  const prefix = `${campaignPrefix(campaignId)}/`;
  const files: { filename: string; contentType: string; content: Buffer }[] = [];
  let total = 0;
  for (const [index, attachment] of attachments.entries()) {
    if (!attachment || typeof attachment.path !== "string" || typeof attachment.contentType !== "string") {
      throw new Error("Anhang ist ungültig");
    }
    if (!attachment.path.startsWith(prefix) || attachment.path.includes("..")) {
      throw new Error("Anhangspfad ist ungültig");
    }
    if (!isAllowedBoardRundmailMime(attachment.contentType)) throw new Error("Dateityp ist nicht erlaubt");
    const downloaded = await admin.storage.from(BOARD_RUNDMAIL_BUCKET).download(attachment.path);
    if (downloaded.error || !downloaded.data) throw new Error(downloaded.error?.message || "Anhang fehlt");
    const content = Buffer.from(await downloaded.data.arrayBuffer());
    total += content.byteLength;
    if (total > BOARD_RUNDMAIL_MAX_TOTAL_BYTES) throw new Error("Anhänge sind zu groß");
    const filename =
      typeof attachment.filename === "string" && attachment.filename.trim()
        ? attachment.filename.replace(/[\r\n"]/g, "").slice(0, 120)
        : `anhang-${index + 1}`;
    files.push({ filename, contentType: attachment.contentType, content });
  }
  return {
    manifest: {
      subject: parsed.subject,
      html: parsed.html,
      text: typeof parsed.text === "string" ? parsed.text : "",
      attachments: attachments.flatMap((attachment) =>
        attachment && typeof attachment.path === "string"
          ? [
              {
                path: attachment.path,
                filename: typeof attachment.filename === "string" ? attachment.filename : "anhang",
                contentType: typeof attachment.contentType === "string" ? attachment.contentType : "",
              },
            ]
          : [],
      ),
    },
    files,
  };
}
