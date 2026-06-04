"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

async function requireAdmin() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (me?.role !== "admin") redirect("/polls");
  return createSupabaseAdminClient();
}

const updatePollSchema = z.object({
  poll_id: z.string().uuid(),
  question: z.string().min(3),
  ends_at: z.string().min(1),
  allow_multiple: z
    .string()
    .optional()
    .transform((v) => v === "on" || v === "true"),
  options: z.array(
    z.object({
      id: z.string().uuid().optional(),
      label: z.string().min(1),
    }),
  ).min(2).max(10),
});

export async function endPollEarly(pollId: string) {
  const admin = await requireAdmin();
  const now = new Date().toISOString();
  const { error } = await admin.from("polls").update({ ends_at: now }).eq("id", pollId);
  if (error) throw new Error(error.message);
  revalidatePath("/polls");
  revalidatePath(`/polls/${pollId}`);
  revalidatePath("/dashboard");
}

export async function deletePoll(pollId: string) {
  const admin = await requireAdmin();
  const { error } = await admin.from("polls").delete().eq("id", pollId);
  if (error) throw new Error(error.message);
  revalidatePath("/polls");
  revalidatePath("/dashboard");
  redirect("/polls");
}

export async function updatePoll(formData: FormData) {
  const admin = await requireAdmin();
  const optionsRaw = String(formData.get("options_json") ?? "[]");
  let options: z.infer<typeof updatePollSchema>["options"] = [];
  try {
    options = JSON.parse(optionsRaw) as typeof options;
  } catch {
    throw new Error("Ungültige Antwortoptionen.");
  }

  const input = updatePollSchema.parse({
    poll_id: String(formData.get("poll_id") ?? ""),
    question: String(formData.get("question") ?? "").trim(),
    ends_at: String(formData.get("ends_at") ?? ""),
    allow_multiple: formData.get("allow_multiple"),
    options,
  });

  const endsAt = new Date(input.ends_at);
  if (Number.isNaN(endsAt.getTime())) throw new Error("Ungültiges Enddatum.");

  const { error: pollErr } = await admin
    .from("polls")
    .update({
      question: input.question,
      ends_at: endsAt.toISOString(),
      allow_multiple: input.allow_multiple,
    })
    .eq("id", input.poll_id);
  if (pollErr) throw new Error(pollErr.message);

  const { data: existingOpts } = await admin
    .from("poll_options")
    .select("id")
    .eq("poll_id", input.poll_id);
  const existingIds = new Set((existingOpts ?? []).map((o) => o.id));
  const keptIds = new Set<string>();

  for (let i = 0; i < input.options.length; i++) {
    const opt = input.options[i]!;
    if (opt.id && existingIds.has(opt.id)) {
      keptIds.add(opt.id);
      await admin
        .from("poll_options")
        .update({ label: opt.label, sort_order: i })
        .eq("id", opt.id);
    } else {
      await admin.from("poll_options").insert({
        poll_id: input.poll_id,
        label: opt.label,
        sort_order: i,
      });
    }
  }

  for (const id of existingIds) {
    if (!keptIds.has(id)) {
      const { count } = await admin
        .from("poll_votes")
        .select("option_id", { count: "exact", head: true })
        .eq("option_id", id);
      if ((count ?? 0) > 0) {
        throw new Error("Antwortoption mit Stimmen kann nicht entfernt werden.");
      }
      await admin.from("poll_options").delete().eq("id", id);
    }
  }

  revalidatePath("/polls");
  revalidatePath(`/polls/${input.poll_id}`);
  revalidatePath("/dashboard");
}
