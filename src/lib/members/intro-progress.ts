import {
  MEMBER_INTRO_QUESTIONS,
  normalizeShortBio,
  type MemberIntroAnswers,
  type MemberIntroKey,
} from "@/lib/members/intro-questions";

export const INTRO_FIELD_COUNT = 1 + MEMBER_INTRO_QUESTIONS.length;

export const STECKBRIEF_BONUS_POINTS = 10;

export type IntroProgress = {
  filled: number;
  total: number;
  isComplete: boolean;
  missingKeys: Array<"short_bio" | MemberIntroKey>;
};

function hasAnswer(v: unknown): boolean {
  if (typeof v !== "string") return false;
  return v.trim().length > 0;
}

export function introProgressFromAnswers(input: MemberIntroAnswers): IntroProgress {
  const missingKeys: IntroProgress["missingKeys"] = [];
  const bio = normalizeShortBio(input.short_bio);
  if (!bio) missingKeys.push("short_bio");

  for (const q of MEMBER_INTRO_QUESTIONS) {
    if (!hasAnswer(input[q.key])) missingKeys.push(q.key);
  }

  const filled = INTRO_FIELD_COUNT - missingKeys.length;
  return {
    filled,
    total: INTRO_FIELD_COUNT,
    isComplete: missingKeys.length === 0,
    missingKeys,
  };
}

export function introProgressLabel(progress: Pick<IntroProgress, "filled" | "total">): string {
  return `${progress.filled}/${progress.total}`;
}
