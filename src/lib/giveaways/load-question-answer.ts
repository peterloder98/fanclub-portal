import type { SupabaseClient } from "@supabase/supabase-js";

export type QuestionAnswerReview = {
  questionText: string;
  optionLabel: string;
};

export async function loadQuestionAnswerForUser(
  supabase: SupabaseClient,
  userId: string,
  giveawayId: string,
): Promise<QuestionAnswerReview | null> {
  const { data: entry } = await supabase
    .from("giveaway_entries")
    .select("id")
    .eq("giveaway_id", giveawayId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!entry) return null;

  const { data: answer } = await supabase
    .from("giveaway_entry_answers")
    .select("question_id,option_id")
    .eq("entry_id", entry.id)
    .maybeSingle();
  if (!answer) return null;

  const [{ data: question }, { data: option }] = await Promise.all([
    supabase
      .from("giveaway_questions")
      .select("question_text")
      .eq("id", answer.question_id)
      .maybeSingle(),
    supabase
      .from("giveaway_question_options")
      .select("label")
      .eq("id", answer.option_id)
      .maybeSingle(),
  ]);

  if (!question?.question_text || !option?.label) return null;
  return { questionText: question.question_text, optionLabel: option.label };
}
