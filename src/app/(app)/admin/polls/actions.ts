"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { after } from "next/server";
import { notifyMembersNewPoll } from "@/lib/email/member-activity-broadcast";

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
  if (me?.role !== "admin") redirect("/dashboard");

  return { userId: user.id };
}

const createPollSchema = z.object({
  question: z.string().min(3),
  ends_at: z.string().min(1),
  allow_multiple: z
    .string()
    .optional()
    .transform((v) => v === "on" || v === "true"),
  options: z.array(z.string().min(1)).min(3).max(10),
});

export async function createPoll(formData: FormData) {
  const { userId } = await requireAdmin();
  const admin = createSupabaseAdminClient();

  const options = formData
    .getAll("options")
    .map((o) => String(o).trim())
    .filter(Boolean);

  const input = createPollSchema.parse({
    question: String(formData.get("question") ?? "").trim(),
    ends_at: String(formData.get("ends_at") ?? ""),
    allow_multiple: formData.get("allow_multiple"),
    options,
  });

  const endsAt = new Date(input.ends_at);
  if (Number.isNaN(endsAt.getTime())) throw new Error("Ungültiges Enddatum");

  const { data: poll, error: pollErr } = await admin
    .from("polls")
    .insert({
      author_id: userId,
      question: input.question,
      allow_multiple: input.allow_multiple,
      ends_at: endsAt.toISOString(),
      is_active: true,
    })
    .select("id")
    .single();
  if (pollErr) throw new Error(pollErr.message);

  const { error: optErr } = await admin.from("poll_options").insert(
    input.options.map((label, i) => ({
      poll_id: poll.id,
      label,
      sort_order: i,
    })),
  );
  if (optErr) throw new Error(optErr.message);

  after(async () => {
    try {
      await notifyMembersNewPoll(poll.id);
    } catch (e) {
      console.error("[member-broadcast] Umfrage-Benachrichtigung:", e);
    }
  });

  revalidatePath("/polls");
  revalidatePath("/dashboard");
  redirect("/polls?refresh=1");
}
