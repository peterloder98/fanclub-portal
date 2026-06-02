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
  if (me?.role !== "admin") redirect("/dashboard");

  return { userId: user.id };
}

const createVotingSchema = z.object({
  question: z.string().min(3),
  ends_at: z.string().min(1),
  allow_multiple: z
    .string()
    .optional()
    .transform((v) => v === "on" || v === "true"),
  options: z.array(z.string().min(1)).min(2).max(10),
});

export async function createVoting(formData: FormData) {
  const { userId } = await requireAdmin();
  const admin = createSupabaseAdminClient();

  const options = formData
    .getAll("options")
    .map((o) => String(o).trim())
    .filter(Boolean);

  const input = createVotingSchema.parse({
    question: String(formData.get("question") ?? "").trim(),
    ends_at: String(formData.get("ends_at") ?? ""),
    allow_multiple: formData.get("allow_multiple"),
    options,
  });

  const endsAt = new Date(input.ends_at);
  if (Number.isNaN(endsAt.getTime())) throw new Error("Ungültiges Enddatum");

  const { data: voting, error: vErr } = await admin
    .from("votings")
    .insert({
      author_id: userId,
      question: input.question,
      allow_multiple: input.allow_multiple,
      ends_at: endsAt.toISOString(),
      is_active: true,
    })
    .select("id")
    .single();
  if (vErr) throw new Error(vErr.message);

  const { error: optErr } = await admin.from("voting_options").insert(
    input.options.map((label, i) => ({
      voting_id: voting.id,
      label,
      sort_order: i,
    })),
  );
  if (optErr) throw new Error(optErr.message);

  revalidatePath("/votings");
  revalidatePath("/dashboard");
  redirect("/votings?refresh=1");
}

