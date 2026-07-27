"use server";

import { deleteNotificationsByMetadata } from "@/lib/notifications/cleanup";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdminAction } from "@/lib/admin/require-admin-action";
import { auditLog } from "@/lib/admin/audit-log";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isFeatureEnabled } from "@/lib/feature-flags";
import {
  notifyMembersRadioVotingAvailable,
  notifyMembersRadioVotingNewCycle,
} from "@/lib/notifications/radio-voting-notify";

function assertVotingsEnabled() {
  if (!isFeatureEnabled("votings")) {
    throw new Error("Radio-Votings sind derzeit deaktiviert.");
  }
}

const campaignSelect =
  "id,station,chart_name,song_title,is_active" as const;

const campaignSchema = z.object({
  station: z.string().min(1),
  region: z.string().optional().default(""),
  chart_name: z.string().min(1),
  voting_url: z.string().url(),
  ends_at: z.string().min(1),
  song_title: z.string().min(1),
  instructions: z.string().min(1),
  steps: z.string().min(1),
  sort_order: z.coerce.number().int().optional(),
  is_active: z.coerce.boolean().optional(),
  reset_cycle: z.coerce.boolean().optional(),
});

function parseSteps(raw: string) {
  return raw
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseEndsAt(raw: string) {
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) throw new Error("Ungültiges Enddatum.");
  return d.toISOString();
}

export async function saveRadioVotingCampaign(formData: FormData) {
  assertVotingsEnabled();
  const { user } = await requireAdminAction();
  const id = formData.get("id")?.toString().trim() || null;

  const parsed = campaignSchema.safeParse({
    station: formData.get("station"),
    region: formData.get("region"),
    chart_name: formData.get("chart_name"),
    voting_url: formData.get("voting_url"),
    ends_at: formData.get("ends_at"),
    song_title: formData.get("song_title"),
    instructions: formData.get("instructions"),
    steps: formData.get("steps"),
    sort_order: formData.get("sort_order") || 0,
    is_active: formData.get("is_active") === "on" || formData.get("is_active") === "true",
    reset_cycle: formData.get("reset_cycle") === "on" || formData.get("reset_cycle") === "true",
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Ungültige Eingabe");
  }

  const input = parsed.data;
  const admin = createSupabaseAdminClient();
  const payload = {
    station: input.station.trim(),
    region: (input.region ?? "").trim(),
    chart_name: input.chart_name.trim(),
    voting_url: input.voting_url.trim(),
    ends_at: parseEndsAt(input.ends_at),
    song_title: input.song_title.trim(),
    instructions: input.instructions.trim(),
    steps: parseSteps(input.steps),
    sort_order: input.sort_order ?? 0,
    is_active: input.is_active ?? true,
    updated_at: new Date().toISOString(),
  };

  if (id) {
    let cycleKey: string | undefined;
    if (input.reset_cycle) {
      cycleKey = `${Date.now()}`;
    }

    const { data: updated, error } = await admin
      .from("radio_voting_campaigns")
      .update({
        ...payload,
        ...(cycleKey ? { cycle_key: cycleKey } : {}),
      })
      .eq("id", id)
      .select(campaignSelect)
      .maybeSingle();
    if (error) throw new Error(error.message);

    if (updated?.is_active && cycleKey) {
      await notifyMembersRadioVotingNewCycle(updated);
    }
  } else {
    const { data: created, error } = await admin
      .from("radio_voting_campaigns")
      .insert({
        ...payload,
        cycle_key: "1",
      })
      .select(campaignSelect)
      .single();
    if (error) throw new Error(error.message);

    if (created.is_active) {
      await notifyMembersRadioVotingAvailable(created);
    }
  }

  await auditLog({
    actorId: user.id,
    action: id ? "radio_voting.update" : "radio_voting.create",
    entityType: "radio_voting_campaign",
    entityId: id ?? undefined,
    summary: id
      ? `Radio-Voting bearbeitet: ${input.song_title}`
      : `Radio-Voting angelegt: ${input.song_title}`,
  });

  revalidatePath("/votings");
  revalidatePath("/admin/radio-votings");
}

export async function deleteRadioVotingCampaign(formData: FormData) {
  assertVotingsEnabled();
  await requireAdminAction();
  const id = formData.get("id")?.toString();
  if (!id) throw new Error("ID fehlt");

  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("radio_voting_campaigns").delete().eq("id", id);
  if (error) throw new Error(error.message);
  await deleteNotificationsByMetadata("campaign_id", id);

  revalidatePath("/votings");
  revalidatePath("/admin/radio-votings");
}

export async function toggleRadioVotingCampaign(formData: FormData) {
  assertVotingsEnabled();
  await requireAdminAction();
  const id = formData.get("id")?.toString();
  const isActive = formData.get("is_active") === "true";
  if (!id) throw new Error("ID fehlt");

  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("radio_voting_campaigns")
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/votings");
  revalidatePath("/admin/radio-votings");
}

export async function startNewRadioVotingCycle(formData: FormData) {
  assertVotingsEnabled();
  await requireAdminAction();
  const id = formData.get("id")?.toString();
  if (!id) throw new Error("ID fehlt");

  const admin = createSupabaseAdminClient();

  const { data: campaign, error: loadErr } = await admin
    .from("radio_voting_campaigns")
    .select(campaignSelect)
    .eq("id", id)
    .maybeSingle();
  if (loadErr) throw new Error(loadErr.message);
  if (!campaign) throw new Error("Voting nicht gefunden.");

  const { error } = await admin
    .from("radio_voting_campaigns")
    .update({
      cycle_key: `${Date.now()}`,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw new Error(error.message);

  if (campaign.is_active) {
    await notifyMembersRadioVotingNewCycle(campaign);
  }

  revalidatePath("/votings");
  revalidatePath("/admin/radio-votings");
}
