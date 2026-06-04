"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { performGiveawayDraw } from "@/lib/giveaways/perform-draw";
import {
  createYearEndGiveaway,
  confirmYearEndGiveaway,
  defaultPointsYearForYearEndRun,
} from "@/lib/giveaways/year-end-lottery";
import {
  notifyAdminsGiveawayEnded,
  notifyGiveawayWinner,
} from "@/lib/email/giveaway-notify";
import { after } from "next/server";
import { notifyMembersNewGiveaway } from "@/lib/email/member-activity-broadcast";

async function requireUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, userId: user.id };
}

async function requireAdmin() {
  const { supabase, userId } = await requireUser();
  const { data: me } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle();
  if (me?.role !== "admin") redirect("/giveaways");
  return { supabase, userId, admin: createSupabaseAdminClient() };
}

export async function processEndedGiveaways() {
  const { admin } = await requireAdmin();
  const now = new Date().toISOString();
  const { data: rows } = await admin
    .from("giveaways")
    .select("id,title,ends_at,status,admin_ended_notified_at,is_year_end_lottery")
    .eq("is_active", true)
    .eq("status", "active")
    .eq("is_year_end_lottery", false)
    .lt("ends_at", now);

  for (const g of rows ?? []) {
    await admin
      .from("giveaways")
      .update({ status: "ended" })
      .eq("id", g.id);

    if (!g.admin_ended_notified_at) {
      try {
        await notifyAdminsGiveawayEnded({ giveawayId: g.id, title: g.title });
        await admin
          .from("giveaways")
          .update({ admin_ended_notified_at: new Date().toISOString() })
          .eq("id", g.id);
      } catch (e) {
        console.error("[giveaway] Admin-Mail fehlgeschlagen:", e);
      }
    }
  }
  revalidatePath("/giveaways");
}

const createSchema = z.object({
  title: z.string().min(3),
  description: z.string().optional().default(""),
  entry_mode: z.enum(["simple", "quiz"]),
  ends_at: z.string().min(1),
  prizes: z.array(z.string().min(1)).min(1).max(20),
  questions: z
    .array(
      z.object({
        text: z.string().min(3),
        options: z.tuple([z.string().min(1), z.string().min(1), z.string().min(1)]),
        correctIndex: z.number().int().min(0).max(2),
      }),
    )
    .optional(),
});

export async function createGiveaway(formData: FormData) {
  const { userId, admin } = await requireAdmin();

  const prizes = formData
    .getAll("prizes")
    .map((p) => String(p).trim())
    .filter(Boolean);

  const questionsRaw = String(formData.get("questions_json") ?? "[]");
  let questions: z.infer<typeof createSchema>["questions"] = [];
  try {
    questions = JSON.parse(questionsRaw) as typeof questions;
  } catch {
    questions = [];
  }

  const entryMode = String(formData.get("entry_mode") ?? "simple") as "simple" | "quiz";

  const input = createSchema.parse({
    title: String(formData.get("title") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim(),
    entry_mode: entryMode,
    ends_at: String(formData.get("ends_at") ?? ""),
    prizes,
    questions: entryMode === "quiz" ? questions : undefined,
  });

  if (input.entry_mode === "quiz") {
    if (!input.questions || input.questions.length < 3) {
      throw new Error("Quiz: mindestens 3 Fragen mit je 3 Antworten.");
    }
  }

  const endsAt = new Date(input.ends_at);
  if (Number.isNaN(endsAt.getTime())) throw new Error("Ungültiges Enddatum.");

  const { data: row, error: gErr } = await admin
    .from("giveaways")
    .insert({
      author_id: userId,
      title: input.title,
      description: input.description || null,
      entry_mode: input.entry_mode,
      ends_at: endsAt.toISOString(),
      status: "active",
      is_active: true,
    })
    .select("id")
    .single();
  if (gErr) throw new Error(gErr.message);

  await admin.from("giveaway_prizes").insert(
    input.prizes.map((name, i) => ({
      giveaway_id: row.id,
      name,
      sort_order: i,
    })),
  );

  if (input.entry_mode === "quiz" && input.questions) {
    for (let qi = 0; qi < input.questions.length; qi++) {
      const q = input.questions[qi]!;
      const { data: qRow, error: qErr } = await admin
        .from("giveaway_questions")
        .insert({
          giveaway_id: row.id,
          question_text: q.text,
          sort_order: qi,
        })
        .select("id")
        .single();
      if (qErr) throw new Error(qErr.message);

      await admin.from("giveaway_question_options").insert(
        q.options.map((label, oi) => ({
          question_id: qRow.id,
          label,
          sort_order: oi,
          is_correct: oi === q.correctIndex,
        })),
      );
    }
  }

  after(async () => {
    try {
      await notifyMembersNewGiveaway(row.id);
    } catch (e) {
      console.error("[member-broadcast] Gewinnspiel-Benachrichtigung:", e);
    }
  });

  revalidatePath("/giveaways");
  redirect("/giveaways?tab=active");
}

export async function drawGiveawayWinners(giveawayId: string) {
  const { admin } = await requireAdmin();
  const { data: g } = await admin
    .from("giveaways")
    .select("is_year_end_lottery")
    .eq("id", giveawayId)
    .maybeSingle();
  if (g?.is_year_end_lottery) {
    throw new Error(
      "Jahresend-Sonderverlosung: bitte „Bestätigen & auslosen“ verwenden (nach Preiseintrag).",
    );
  }
  const result = await performGiveawayDraw(admin, giveawayId);
  revalidatePath("/giveaways");
  revalidatePath(`/giveaways/${giveawayId}`);
  return { winnerCount: result.winnerCount };
}

export async function sendGiveawayWinnerEmail(
  winnerId: string,
  signatureId?: string,
) {
  const { admin } = await requireAdmin();

  const { data: w } = await admin
    .from("giveaway_winners")
    .select("id,winner_notified_at,user_id,prize_id,giveaway_id")
    .eq("id", winnerId)
    .maybeSingle();
  if (!w) throw new Error("Gewinner-Eintrag nicht gefunden.");

  const { data: g } = await admin.from("giveaways").select("title").eq("id", w.giveaway_id).maybeSingle();
  const { data: prize } = await admin.from("giveaway_prizes").select("name").eq("id", w.prize_id).maybeSingle();
  const { data: profile } = await admin
    .from("profiles")
    .select("email,first_name")
    .eq("id", w.user_id)
    .maybeSingle();

  const email = profile?.email?.trim();
  if (!email) throw new Error("Gewinner hat keine E-Mail-Adresse.");

  await notifyGiveawayWinner({
    winnerEmail: email,
    firstName: profile?.first_name?.trim() || "Fan",
    giveawayTitle: g?.title ?? "Gewinnspiel",
    prizeName: prize?.name ?? "Preis",
    signatureId: signatureId || undefined,
  });

  await admin
    .from("giveaway_winners")
    .update({ winner_notified_at: new Date().toISOString() })
    .eq("id", winnerId);

  revalidatePath(`/giveaways/${w.giveaway_id}`);
}

export async function participateSimple(giveawayId: string) {
  const { supabase, userId } = await requireUser();

  const { data: g } = await supabase
    .from("giveaways")
    .select("id,ends_at,status,entry_mode,is_paused,is_year_end_lottery")
    .eq("id", giveawayId)
    .maybeSingle();
  if (!g || g.entry_mode !== "simple") throw new Error("Ungültiges Gewinnspiel.");
  assertGiveawayOpen(g);
  if (g.is_year_end_lottery) {
    throw new Error("Bei der Jahres-Sonderverlosung nehmen nur die Top-10 automatisch teil.");
  }

  const { error } = await supabase.from("giveaway_entries").insert({
    giveaway_id: giveawayId,
    user_id: userId,
    is_eligible: true,
  });
  if (error) {
    if (error.code === "23505") throw new Error("Du nimmst bereits teil.");
    throw new Error(error.message);
  }

  revalidatePath(`/giveaways/${giveawayId}`);
  revalidatePath("/giveaways");
}

const quizAnswerSchema = z.array(
  z.object({
    questionId: z.string().uuid(),
    optionId: z.string().uuid(),
  }),
);

export type QuizParticipationResult = {
  eligible: boolean;
  results: Array<{
    questionId: string;
    optionId: string;
    correct: boolean;
    correctOptionId: string;
  }>;
};

export async function participateQuiz(
  giveawayId: string,
  answersJson: string,
): Promise<QuizParticipationResult> {
  const { supabase, userId } = await requireUser();
  const admin = createSupabaseAdminClient();

  const answers = quizAnswerSchema.parse(JSON.parse(answersJson));

  const { data: g } = await supabase
    .from("giveaways")
    .select("id,ends_at,status,entry_mode,is_paused,is_year_end_lottery")
    .eq("id", giveawayId)
    .maybeSingle();
  if (!g || g.entry_mode !== "quiz") throw new Error("Ungültiges Quiz-Gewinnspiel.");
  assertGiveawayOpen(g);
  if (g.is_year_end_lottery) {
    throw new Error("Bei der Jahres-Sonderverlosung nehmen nur die Top-10 automatisch teil.");
  }

  const { data: questions } = await admin
    .from("giveaway_questions")
    .select("id")
    .eq("giveaway_id", giveawayId);
  const qIds = new Set((questions ?? []).map((q) => q.id));
  if (answers.length !== qIds.size) throw new Error("Bitte alle Fragen beantworten.");

  const { data: options } = await admin
    .from("giveaway_question_options")
    .select("id,question_id,is_correct")
    .in("question_id", [...qIds]);

  const correctByQ = new Map<string, string>();
  const optionToQ = new Map<string, string>();
  for (const o of options ?? []) {
    optionToQ.set(o.id, o.question_id);
    if (o.is_correct) correctByQ.set(o.question_id, o.id);
  }

  const results: QuizParticipationResult["results"] = [];
  let allCorrect = true;

  for (const a of answers) {
    if (!qIds.has(a.questionId)) throw new Error("Ungültige Frage.");
    const correctOptionId = correctByQ.get(a.questionId);
    if (!correctOptionId) throw new Error("Quiz-Konfiguration unvollständig.");
    const correct = a.optionId === correctOptionId;
    if (!correct) allCorrect = false;
    results.push({
      questionId: a.questionId,
      optionId: a.optionId,
      correct,
      correctOptionId,
    });
  }

  const { data: entry, error: eErr } = await supabase
    .from("giveaway_entries")
    .insert({
      giveaway_id: giveawayId,
      user_id: userId,
      is_eligible: allCorrect,
    })
    .select("id")
    .single();

  if (eErr) {
    if (eErr.code === "23505") throw new Error("Du nimmst bereits teil.");
    throw new Error(eErr.message);
  }

  await admin.from("giveaway_entry_answers").insert(
    answers.map((a) => ({
      entry_id: entry.id,
      question_id: a.questionId,
      option_id: a.optionId,
    })),
  );

  revalidatePath(`/giveaways/${giveawayId}`);
  revalidatePath("/giveaways");

  return { eligible: allCorrect, results };
}

export async function setupYearEndGiveaway(pointsYear?: number) {
  const { userId, admin } = await requireAdmin();
  const year = pointsYear ?? defaultPointsYearForYearEndRun();
  const result = await createYearEndGiveaway(admin, { pointsYear: year, authorId: userId });
  revalidatePath("/giveaways");
  revalidatePath(`/giveaways/${result.giveawayId}`);
  return result;
}

export async function confirmYearEndGiveawayAction(
  giveawayId: string,
  signatureId?: string,
) {
  const { admin } = await requireAdmin();
  const result = await confirmYearEndGiveaway(admin, giveawayId, signatureId);
  revalidatePath("/giveaways");
  revalidatePath(`/giveaways/${giveawayId}`);
  return result;
}

export async function addYearEndGiveawayPrize(giveawayId: string, name: string) {
  const { admin } = await requireAdmin();
  const prizeName = name.trim();
  if (prizeName.length < 2) throw new Error("Preisname zu kurz.");

  const { data: g } = await admin
    .from("giveaways")
    .select("is_year_end_lottery,year_end_confirmed_at,status")
    .eq("id", giveawayId)
    .maybeSingle();
  if (!g?.is_year_end_lottery) throw new Error("Nur für Jahresend-Gewinnspiele.");
  if (g.year_end_confirmed_at || g.status === "drawn") {
    throw new Error("Nach Bestätigung können keine Preise mehr ergänzt werden.");
  }

  const { count } = await admin
    .from("giveaway_prizes")
    .select("id", { count: "exact", head: true })
    .eq("giveaway_id", giveawayId);
  const sortOrder = count ?? 0;

  const { error } = await admin.from("giveaway_prizes").insert({
    giveaway_id: giveawayId,
    name: prizeName,
    sort_order: sortOrder,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/giveaways/${giveawayId}`);
}

export async function removeYearEndGiveawayPrize(prizeId: string) {
  const { admin } = await requireAdmin();
  const { data: prize } = await admin
    .from("giveaway_prizes")
    .select("giveaway_id")
    .eq("id", prizeId)
    .maybeSingle();
  if (!prize?.giveaway_id) throw new Error("Preis nicht gefunden.");

  const { data: g } = await admin
    .from("giveaways")
    .select("is_year_end_lottery,year_end_confirmed_at,status")
    .eq("id", prize.giveaway_id)
    .maybeSingle();
  if (!g?.is_year_end_lottery) throw new Error("Nur für Jahresend-Gewinnspiele.");
  if (g.year_end_confirmed_at || g.status === "drawn") {
    throw new Error("Nach Bestätigung können Preise nicht mehr entfernt werden.");
  }

  const { error } = await admin.from("giveaway_prizes").delete().eq("id", prizeId);
  if (error) throw new Error(error.message);
  revalidatePath(`/giveaways/${prize.giveaway_id}`);
}

function assertGiveawayOpen(g: {
  ends_at: string;
  status: string;
  is_paused?: boolean;
  is_year_end_lottery?: boolean;
}) {
  if (g.is_paused) throw new Error("Gewinnspiel ist pausiert.");
  if (new Date(g.ends_at).getTime() < Date.now()) throw new Error("Gewinnspiel ist beendet.");
  if (g.status !== "active") throw new Error("Teilnahme nicht mehr möglich.");
}

export async function pauseGiveaway(giveawayId: string) {
  const { admin } = await requireAdmin();
  const { data: g } = await admin
    .from("giveaways")
    .select("status")
    .eq("id", giveawayId)
    .maybeSingle();
  if (!g) throw new Error("Gewinnspiel nicht gefunden.");
  if (g.status === "drawn") throw new Error("Ausgelost – Pause nicht möglich.");

  await admin.from("giveaways").update({ is_paused: true }).eq("id", giveawayId);
  revalidatePath("/giveaways");
  revalidatePath(`/giveaways/${giveawayId}`);
}

export async function resumeGiveaway(giveawayId: string) {
  const { admin } = await requireAdmin();
  await admin.from("giveaways").update({ is_paused: false }).eq("id", giveawayId);
  revalidatePath("/giveaways");
  revalidatePath(`/giveaways/${giveawayId}`);
}

export async function updateGiveawayBasics(formData: FormData) {
  const { admin } = await requireAdmin();
  const id = String(formData.get("giveaway_id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const endsAtRaw = String(formData.get("ends_at") ?? "");
  if (!id || title.length < 3) throw new Error("Titel zu kurz.");

  const endsAt = new Date(endsAtRaw);
  if (Number.isNaN(endsAt.getTime())) throw new Error("Ungültiges Enddatum.");

  const { data: g } = await admin
    .from("giveaways")
    .select("status")
    .eq("id", id)
    .maybeSingle();
  if (!g) throw new Error("Gewinnspiel nicht gefunden.");
  if (g.status === "drawn") throw new Error("Nach Auslosung nur Titel/Beschreibung – Enddatum nicht änderbar.");

  if (g.status === "drawn") {
    await admin
      .from("giveaways")
      .update({ title, description: description || null })
      .eq("id", id);
  } else {
    const patch: {
      title: string;
      description: string | null;
      ends_at: string;
      status?: string;
    } = {
      title,
      description: description || null,
      ends_at: endsAt.toISOString(),
    };
    if (endsAt.getTime() > Date.now() && g.status === "ended") {
      patch.status = "active";
    }
    await admin.from("giveaways").update(patch).eq("id", id);
  }
  revalidatePath("/giveaways");
  revalidatePath(`/giveaways/${id}`);
}
