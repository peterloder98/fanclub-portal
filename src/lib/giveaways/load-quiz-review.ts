import type { QuizParticipationResult } from "@/app/(app)/giveaways/actions";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function loadQuizReviewForUser(
  supabase: SupabaseClient,
  userId: string,
  giveawayId: string,
  questionIds: string[],
): Promise<QuizParticipationResult | null> {
  if (!questionIds.length) return null;

  const { data: entry } = await supabase
    .from("giveaway_entries")
    .select("id")
    .eq("giveaway_id", giveawayId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!entry) return null;

  const { data: answers } = await supabase
    .from("giveaway_entry_answers")
    .select("question_id,option_id")
    .eq("entry_id", entry.id);
  if (!answers?.length) return null;

  const { data: options } = await supabase
    .from("giveaway_question_options")
    .select("id,question_id,is_correct")
    .in("question_id", questionIds);

  const correctByQ = new Map<string, string>();
  for (const o of options ?? []) {
    if (o.is_correct) correctByQ.set(o.question_id, o.id);
  }

  const results: QuizParticipationResult["results"] = [];
  let allCorrect = true;
  for (const a of answers) {
    const correctOptionId = correctByQ.get(a.question_id);
    if (!correctOptionId) continue;
    const correct = a.option_id === correctOptionId;
    if (!correct) allCorrect = false;
    results.push({
      questionId: a.question_id,
      optionId: a.option_id,
      correct,
      correctOptionId,
    });
  }

  if (!results.length) return null;
  return { eligible: allCorrect, results };
}
