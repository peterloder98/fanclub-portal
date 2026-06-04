import { Topbar } from "@/components/app-shell/topbar";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { GiveawayDetailClient } from "@/components/giveaways/giveaway-detail-client";
import { getAvatarPublicUrl } from "@/lib/avatars/url";
import { listMailSignatureOptions } from "@/lib/email/signatures";
import { loadQuizReviewForUser } from "@/lib/giveaways/load-quiz-review";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getTopMembersForYear } from "@/lib/giveaways/year-end-lottery";
import { YearEndGiveawayAdmin } from "@/components/giveaways/year-end-giveaway-admin";

export default async function GiveawayDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
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
  const isAdmin = me?.role === "admin";

  const { data: g } = await supabase
    .from("giveaways")
    .select(
      "id,title,description,entry_mode,ends_at,status,is_paused,is_year_end_lottery,points_year,year_end_confirmed_at",
    )
    .eq("id", id)
    .maybeSingle();
  if (!g) notFound();

  const { data: prizes } = await supabase
    .from("giveaway_prizes")
    .select("id,name")
    .eq("giveaway_id", id)
    .order("sort_order", { ascending: true });

  const { data: questions } = await supabase
    .from("giveaway_questions")
    .select("id,question_text,sort_order")
    .eq("giveaway_id", id)
    .order("sort_order", { ascending: true });

  const qIds = (questions ?? []).map((q) => q.id);
  const { data: options } = qIds.length
    ? await supabase
        .from("giveaway_question_options")
        .select("id,question_id,label,sort_order,is_correct")
        .in("question_id", qIds)
        .order("sort_order", { ascending: true })
    : { data: [] };

  const questionPayload = (questions ?? []).map((q) => ({
    id: q.id,
    text: q.question_text,
    options: (options ?? [])
      .filter((o) => o.question_id === q.id)
      .map((o) => ({ id: o.id, label: o.label, is_correct: o.is_correct })),
  }));

  const { data: myEntry } = await supabase
    .from("giveaway_entries")
    .select("is_eligible")
    .eq("giveaway_id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  const { count: entryCount } = await supabase
    .from("giveaway_entries")
    .select("id", { count: "exact", head: true })
    .eq("giveaway_id", id);

  const initialQuizResult =
    myEntry && g.entry_mode === "quiz"
      ? await loadQuizReviewForUser(supabase, user.id, id, qIds)
      : null;

  const { data: winnerRows } = await supabase
    .from("giveaway_winners")
    .select("id,prize_id,user_id,winner_notified_at")
    .eq("giveaway_id", id);

  const winnerUserIds = (winnerRows ?? []).map((w) => w.user_id);
  const { data: winnerProfiles } = winnerUserIds.length
    ? await supabase
        .from("profiles")
        .select("id,first_name,last_name,email,avatar_path,updated_at")
        .in("id", winnerUserIds)
    : { data: [] };

  const profileMap = new Map((winnerProfiles ?? []).map((p) => [p.id, p]));
  const prizeMap = new Map((prizes ?? []).map((p) => [p.id, p.name]));

  const winners = (winnerRows ?? []).map((w) => {
    const p = profileMap.get(w.user_id);
    const name =
      p?.first_name && p?.last_name
        ? `${p.first_name} ${p.last_name}`
        : (p?.email ?? "Mitglied");
    return {
      id: w.id,
      prizeName: prizeMap.get(w.prize_id) ?? "Preis",
      userName: name,
      avatarUrl: getAvatarPublicUrl(p?.avatar_path ?? null, p?.updated_at ?? null),
      notifiedAt: w.winner_notified_at,
    };
  });

  const { count: likeCount } = await supabase
    .from("giveaway_likes")
    .select("*", { count: "exact", head: true })
    .eq("giveaway_id", id);

  const { data: myLike } = await supabase
    .from("giveaway_likes")
    .select("giveaway_id")
    .eq("giveaway_id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  const { data: commentRows } = await supabase
    .from("giveaway_comments")
    .select("id,body,created_at,author_id")
    .eq("giveaway_id", id)
    .order("created_at", { ascending: false });

  const authorIds = Array.from(new Set((commentRows ?? []).map((c) => c.author_id)));
  const { data: commentProfiles } = await supabase
    .from("profiles")
    .select("id,first_name,last_name,email,avatar_path,updated_at")
    .in("id", authorIds.length ? authorIds : ["00000000-0000-0000-0000-000000000000"]);

  const cMap = new Map(
    (commentProfiles ?? []).map((p) => [
      p.id,
      {
        name:
          p.first_name && p.last_name
            ? `${p.first_name} ${p.last_name}`
            : (p.email ?? "Mitglied"),
        avatarUrl: getAvatarPublicUrl(p.avatar_path, p.updated_at),
      },
    ]),
  );

  const comments = (commentRows ?? []).map((c) => ({
    id: c.id,
    body: c.body,
    authorName: cMap.get(c.author_id)?.name ?? "Mitglied",
    authorAvatarUrl: cMap.get(c.author_id)?.avatarUrl ?? null,
    createdAtLabel: new Date(c.created_at).toLocaleString("de-DE", {
      dateStyle: "short",
      timeStyle: "short",
    }),
  }));

  let signatures: Awaited<ReturnType<typeof listMailSignatureOptions>> = [];
  if (isAdmin) {
    try {
      signatures = await listMailSignatureOptions();
    } catch {
      signatures = [];
    }
  }

  let yearEndAdmin: {
    topMembers: Array<{
      rank: number;
      userId: string;
      points: number;
      activityCount: number;
      name: string;
      membershipNumber: string | null;
      avatarUrl: string | null;
    }>;
  } | null = null;

  if (isAdmin && g.is_year_end_lottery && g.points_year) {
    try {
      const admin = createSupabaseAdminClient();
      const top = await getTopMembersForYear(admin, g.points_year);
      yearEndAdmin = {
        topMembers: top.map((t) => ({
          rank: t.rank,
          userId: t.userId,
          points: t.points,
          activityCount: t.activityCount,
          name:
            t.profile?.first_name && t.profile?.last_name
              ? `${t.profile.first_name} ${t.profile.last_name}`
              : (t.profile?.email ?? "Mitglied"),
          membershipNumber: t.profile?.membership_number ?? null,
          avatarUrl: t.profile
            ? getAvatarPublicUrl(t.profile.avatar_path, t.profile.updated_at ?? null)
            : null,
        })),
      };
    } catch {
      yearEndAdmin = null;
    }
  }

  return (
    <div className="min-h-screen">
      <Topbar title="Gewinnspiel" subtitle={g.title} />
      <main className="px-4 py-6 lg:px-8">
        <GiveawayDetailClient
          giveaway={g}
          prizes={prizes ?? []}
          questions={questionPayload}
          myEntry={myEntry}
          initialQuizResult={initialQuizResult}
          winners={winners}
          likeCount={likeCount ?? 0}
          likedByMe={Boolean(myLike)}
          comments={comments}
          isAdmin={isAdmin}
          userId={user.id}
          hasEntries={(entryCount ?? 0) > 0}
          signatures={signatures}
          yearEndAdmin={
            yearEndAdmin && g.points_year ? (
              <YearEndGiveawayAdmin
                giveawayId={g.id}
                pointsYear={g.points_year}
                confirmed={Boolean(g.year_end_confirmed_at)}
                prizes={prizes ?? []}
                topMembers={yearEndAdmin.topMembers}
                signatures={signatures}
              />
            ) : null
          }
        />
      </main>
    </div>
  );
}
