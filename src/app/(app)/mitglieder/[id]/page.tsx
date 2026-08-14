import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import {
  CalendarDays,
  Heart,
  MapPin,
  Mic2,
  Music2,
  Pencil,
  Quote,
  Sparkles,
  Star,
  Tv,
  UserRound,
} from "lucide-react";
import { Topbar } from "@/components/app-shell/topbar";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAvatarPublicUrl } from "@/lib/avatars/url";
import { memberCountryLabel } from "@/lib/members/country";
import { profileDisplayName } from "@/lib/profiles/display";
import {
  MEMBER_INTRO_QUESTIONS,
  formatMemberOrigin,
  type MemberIntroKey,
} from "@/lib/members/intro-questions";
import { initialsFromName } from "@/lib/user/initials";
import {
  formatEventListDateParts,
  formatEventListTime,
  formatEventVenueCityLine,
  formatLocation,
} from "@/lib/events/format";
import { isEventUpcoming } from "@/lib/events/event-schedule";
import { rankFromPoints } from "@/lib/points/rank";
import { loadUserAchievementsForDisplay } from "@/lib/badges/evaluate-user-badges";
import { MemberStarsRankBadge } from "@/components/members/member-stars-rank-badge";
import { ExpandableClampedText } from "@/components/ui/expandable-clamped-text";
import { isProfileHidden } from "@/lib/members/hidden";

export const dynamic = "force-dynamic";

type JoinedEvent = {
  id: string;
  kind: string | null;
  title: string;
  start_at: string | null;
  end_at: string | null;
  venue: string | null;
  city: string | null;
  country: string | null;
  broadcaster: string | null;
};

type JoinedMeeting = {
  id: string;
  title: string;
  starts_at: string;
  venue: string | null;
  city: string | null;
  country: string | null;
};

function formatMemberSince(iso: string | null | undefined) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("de-DE", { month: "long", year: "numeric" });
}

const INTRO_ANSWER_ICONS: Record<MemberIntroKey, typeof Sparkles> = {
  intro_discovered_anni: Sparkles,
  intro_favorite_song: Music2,
  intro_other_artists: Mic2,
  intro_hobbies: Heart,
  intro_perfect_concert: Star,
};

const PORTAL_CARD_CLASS =
  "flex min-h-[5.75rem] w-full min-w-0 max-w-full items-start gap-3 overflow-hidden rounded-2xl border border-fc-navy/10 bg-white/90 p-4 shadow-sm";
const PORTAL_CARD_LINK_CLASS = `${PORTAL_CARD_CLASS} transition hover:border-fc-blue/40 hover:bg-fc-ice/50`;
const PORTAL_CARD_TITLE_CLASS =
  "mt-0.5 line-clamp-2 break-words text-sm font-semibold leading-snug text-fc-navy";
const PORTAL_CARD_META_CLASS =
  "text-xs font-semibold uppercase tracking-wide text-fc-blue";
const PORTAL_CARD_SUB_CLASS = "mt-0.5 line-clamp-1 break-words text-xs text-slate-500";
const PORTAL_INTRO_ANSWER_CLASS = "text-sm font-semibold leading-snug text-fc-navy";

export default async function MemberPortalPage({
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

  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  const viewerIsAdmin = me?.role === "admin";

  const { data: membership } = await supabase
    .from("memberships")
    .select("status,start_date")
    .eq("user_id", id)
    .eq("status", "active")
    .maybeSingle();
  if (!membership) notFound();

  const { data: profileWithBio, error: profileError } = await supabase
    .from("profiles")
    .select(
      "id,first_name,last_name,email,city,country,avatar_path,updated_at,short_bio,intro_discovered_anni,intro_favorite_song,intro_other_artists,intro_hobbies,intro_perfect_concert",
    )
    .eq("id", id)
    .maybeSingle();

  const profileRow =
    profileWithBio ??
    (profileError
      ? (
          await supabase
            .from("profiles")
            .select(
              "id,first_name,last_name,email,city,country,avatar_path,updated_at,intro_discovered_anni,intro_favorite_song,intro_other_artists,intro_hobbies,intro_perfect_concert",
            )
            .eq("id", id)
            .maybeSingle()
        ).data
      : null);
  if (!profileRow) notFound();
  if (isProfileHidden(profileRow) && !viewerIsAdmin && user.id !== id) notFound();
  const profile = profileRow as typeof profileRow & { short_bio?: string | null };

  const name = profileDisplayName(profile);
  const avatarUrl = getAvatarPublicUrl(profile.avatar_path, profile.updated_at ?? null);
  const origin = formatMemberOrigin({
    city: profile.city,
    countryLabel: memberCountryLabel(profile.country),
  });
  const isSelf = user.id === id;
  const memberSince = formatMemberSince(membership.start_date);

  const answers = MEMBER_INTRO_QUESTIONS.map((q) => ({
    ...q,
    value: (profile[q.key as MemberIntroKey] as string | null)?.trim() || null,
  })).filter((q) => q.value);

  const yearStart = new Date(new Date().getFullYear(), 0, 1).toISOString();
  const { data: pointsRows } = await supabase
    .from("points_transactions")
    .select("points")
    .eq("user_id", id)
    .gte("created_at", yearStart);
  const yearPoints = (pointsRows ?? []).reduce((sum, r) => sum + (r.points ?? 0), 0);
  const yearRank = rankFromPoints(yearPoints);
  const shortBio = (profile.short_bio as string | null | undefined)?.trim() || null;
  const achievements = await loadUserAchievementsForDisplay(id).catch(() => []);

  const { data: partRows } = await supabase
    .from("event_participations")
    .select(
      "event_id,external_events(id,kind,title,start_at,end_at,venue,city,country,broadcaster,is_visible)",
    )
    .eq("user_id", id);

  const joinedEvents: JoinedEvent[] = [];
  for (const row of partRows ?? []) {
    const raw = row.external_events as unknown;
    const e = (Array.isArray(raw) ? raw[0] : raw) as
      | (JoinedEvent & { is_visible?: boolean | null })
      | null;
    if (!e?.id || e.is_visible === false) continue;
    joinedEvents.push({
      id: e.id,
      kind: e.kind ?? null,
      title: e.title,
      start_at: e.start_at,
      end_at: e.end_at ?? null,
      venue: e.venue ?? null,
      city: e.city ?? null,
      country: e.country ?? null,
      broadcaster: e.broadcaster ?? null,
    });
  }

  const upcomingEvents = joinedEvents
    .filter((e) => isEventUpcoming(e))
    .sort((a, b) => String(a.start_at).localeCompare(String(b.start_at)));
  const pastEvents = joinedEvents
    .filter((e) => !isEventUpcoming(e))
    .sort((a, b) => String(b.start_at).localeCompare(String(a.start_at)));

  const { data: meetingParts } = await supabase
    .from("club_meeting_participations")
    .select("meeting_id,club_meetings(id,title,starts_at,venue,city,country,status)")
    .eq("user_id", id);

  const joinedMeetings: JoinedMeeting[] = [];
  for (const row of meetingParts ?? []) {
    const raw = row.club_meetings as unknown;
    const m = (Array.isArray(raw) ? raw[0] : raw) as
      | (JoinedMeeting & { status?: string | null })
      | null;
    if (!m?.id || m.status !== "published") continue;
    joinedMeetings.push({
      id: m.id,
      title: m.title,
      starts_at: m.starts_at,
      venue: m.venue ?? null,
      city: m.city ?? null,
      country: m.country ?? null,
    });
  }
  const nowIso = new Date().toISOString();
  const upcomingMeetings = joinedMeetings
    .filter((m) => m.starts_at >= nowIso)
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at));

  const upcomingCount = upcomingMeetings.length + upcomingEvents.length;
  const joinedListScrollClass =
    upcomingCount > 5 ? "max-h-[26.5rem] overflow-y-auto overscroll-contain pr-1" : "";
  const pastListScrollClass =
    pastEvents.length > 5 ? "max-h-[14rem] overflow-y-auto overscroll-contain pr-1" : "";

  return (
    <div className="min-h-screen">
      <Topbar title={name} subtitle="Mitglieder-Portal" />
      <main className="mx-auto w-full max-w-5xl px-4 py-6 lg:px-8">
        <div className="overflow-hidden rounded-3xl border border-fc-navy/10 bg-gradient-to-br from-white via-fc-ice/40 to-rose-50/40 shadow-sm shadow-fc-navy/10">
          <div className="bg-gradient-to-r from-fc-navy to-fc-blue px-6 py-8 text-white sm:px-8">
            <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
              <div className="h-28 w-28 shrink-0 overflow-hidden rounded-2xl border-2 border-white/40 bg-white/10 shadow-lg sm:h-32 sm:w-32">
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full w-full place-items-center text-3xl font-bold">
                    {initialsFromName(name)}
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{name}</h1>
                {origin ? (
                  <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-white/90">
                    <MapPin className="h-4 w-4 shrink-0" aria-hidden />
                    {origin}
                  </p>
                ) : (
                  <p className="mt-2 text-sm text-white/70">Ort noch nicht angegeben</p>
                )}
                <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
                  {memberSince ? (
                    <span className="rounded-full bg-white/15 px-2.5 py-1 text-xs text-white/90">
                      Mitglied seit {memberSince}
                    </span>
                  ) : null}
                </div>
                <div className="mt-3 w-full max-w-full">
                  <MemberStarsRankBadge
                    yearPoints={yearPoints}
                    yearRank={yearRank}
                    achievements={achievements}
                    variant="light"
                    showLink={isSelf}
                    className="w-full max-w-full"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="min-w-0 space-y-8 px-5 py-6 sm:px-8">
            {shortBio ? (
              <section className="relative overflow-hidden rounded-2xl border border-fc-sky/30 bg-gradient-to-br from-fc-ice/90 via-white to-rose-50/60 p-5 shadow-sm shadow-fc-navy/5 sm:p-6">
                <div
                  className="pointer-events-none absolute -right-6 -top-8 h-28 w-28 rounded-full bg-fc-sky/15 blur-2xl"
                  aria-hidden
                />
                <div className="relative flex gap-4">
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-fc-navy to-fc-blue text-white shadow-sm">
                    <Quote className="h-5 w-5" aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-sm font-semibold uppercase tracking-wide text-fc-navy/70">
                      Ein paar Worte über mich
                    </h2>
                    <p className="mt-2 text-base font-medium leading-relaxed text-fc-navy sm:text-[1.05rem] sm:leading-relaxed">
                      {shortBio}
                    </p>
                  </div>
                </div>
              </section>
            ) : null}

            <div className="grid min-w-0 gap-8 lg:grid-cols-2 lg:items-start lg:gap-10">
              <section className="min-w-0 space-y-3">
                <div className="min-h-[3.75rem]">
                  <h2 className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-fc-navy/70">
                    <CalendarDays className="h-4 w-4" aria-hidden />
                    Hier bin ich dabei
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Konzerte, TV-Auftritte und Treffen für die ich mich angemeldet habe.
                  </p>
                </div>

                {upcomingEvents.length || upcomingMeetings.length ? (
                  <ul className={`grid w-full min-w-0 gap-3 ${joinedListScrollClass}`}>
                    {upcomingMeetings.map((m) => {
                      const when = formatEventListDateParts(m.starts_at);
                      const place = formatEventVenueCityLine({
                        venue: m.venue,
                        city: m.city,
                        country: m.country,
                      });
                      return (
                        <li key={`meeting-${m.id}`} className="min-w-0">
                          <Link
                            href={`/treffen/${m.id}`}
                            className={PORTAL_CARD_LINK_CLASS}
                          >
                            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-rose-50 text-rose-700">
                              <Sparkles className="h-4 w-4" aria-hidden />
                            </div>
                            <div className="min-w-0 flex-1 overflow-hidden">
                              <p className="text-xs font-semibold uppercase tracking-wide text-rose-700">
                                Fanclub-Treffen · {when.date}
                              </p>
                              <p className={PORTAL_CARD_TITLE_CLASS}>{m.title}</p>
                              {place ? <p className={PORTAL_CARD_SUB_CLASS}>{place}</p> : null}
                            </div>
                          </Link>
                        </li>
                      );
                    })}
                    {upcomingEvents.map((e) => {
                      const when = formatEventListDateParts(e.start_at, e.end_at);
                      const time = formatEventListTime(e.start_at);
                      const place =
                        e.kind === "tv"
                          ? formatLocation({
                              kind: e.kind,
                              broadcaster: e.broadcaster,
                              city: e.city,
                              country: e.country,
                            })
                          : formatEventVenueCityLine({
                              venue: e.venue,
                              city: e.city,
                              country: e.country,
                            });
                      const Icon = e.kind === "tv" ? Tv : Music2;
                      return (
                        <li key={e.id} className="min-w-0">
                          <Link
                            href={`/events?focus=${e.id}`}
                            className={PORTAL_CARD_LINK_CLASS}
                          >
                            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-fc-ice text-fc-navy">
                              <Icon className="h-4 w-4" aria-hidden />
                            </div>
                            <div className="min-w-0 flex-1 overflow-hidden">
                              <p className={PORTAL_CARD_META_CLASS}>
                                {e.kind === "tv" ? "TV" : "Konzert"} · {when.date}
                                {time ? ` · ${time}` : ""}
                              </p>
                              <p className={PORTAL_CARD_TITLE_CLASS}>{e.title}</p>
                              {place ? <p className={PORTAL_CARD_SUB_CLASS}>{place}</p> : null}
                            </div>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-5 text-center text-sm text-slate-600">
                    Aktuell keine kommenden Termine markiert.
                  </div>
                )}

                {pastEvents.length ? (
                  <div className="min-w-0 pt-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Schon dabei gewesen ({pastEvents.length})
                    </p>
                    <ul className={`mt-2 grid min-w-0 gap-1.5 ${pastListScrollClass}`}>
                      {pastEvents.map((e) => {
                        const when = formatEventListDateParts(e.start_at, e.end_at);
                        return (
                          <li key={e.id} className="min-w-0">
                            <Link
                              href={`/events?focus=${e.id}`}
                              className="flex w-full min-w-0 items-start justify-between gap-3 overflow-hidden rounded-xl px-2 py-1.5 text-sm hover:bg-slate-50"
                            >
                              <span className="min-w-0 flex-1 break-words text-slate-700">{e.title}</span>
                              <span className="shrink-0 pt-0.5 text-xs tabular-nums text-slate-400">
                                {when.date}
                              </span>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ) : null}
              </section>

              <section className="min-w-0 space-y-3">
                <div className="flex min-h-[3.75rem] items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h2 className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-fc-navy/70">
                      <UserRound className="h-4 w-4" aria-hidden />
                      Das bin ich
                    </h2>
                    <p className="mt-1 text-sm text-slate-600">
                      Fünf freiwillige Fragen — so lernen wir uns besser kennen.
                    </p>
                  </div>
                  {isSelf ? (
                    <Link
                      href="/profile#kennenlernen"
                      className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl border border-fc-navy/15 bg-white px-3 text-xs font-semibold text-fc-navy shadow-sm transition hover:border-fc-blue/40 hover:bg-fc-ice/60"
                    >
                      <Pencil className="h-3.5 w-3.5" aria-hidden />
                      {answers.length ? "Bearbeiten" : "Ausfüllen"}
                    </Link>
                  ) : null}
                </div>

                {answers.length ? (
                  <ul className="grid w-full min-w-0 gap-3">
                    {answers.map((q) => {
                      const Icon = INTRO_ANSWER_ICONS[q.key as MemberIntroKey] ?? Sparkles;
                      return (
                      <li
                        key={q.key}
                        className="flex min-h-[5.75rem] w-full min-w-0 max-w-full items-start gap-3 rounded-2xl border border-fc-navy/10 bg-white/90 p-4 shadow-sm"
                      >
                        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-fc-ice text-fc-navy">
                          <Icon className="h-4 w-4" aria-hidden />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={`line-clamp-1 ${PORTAL_CARD_META_CLASS}`}>{q.label}</p>
                          <div className="mt-0.5">
                            <ExpandableClampedText
                              text={q.value!}
                              lines={3}
                              className={PORTAL_INTRO_ANSWER_CLASS}
                            />
                          </div>
                        </div>
                      </li>
                      );
                    })}
                  </ul>
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-5 text-center text-sm text-slate-600">
                    {isSelf
                      ? "Noch keine Antworten — tippe oben rechts auf Ausfüllen."
                      : "Noch keine Antworten hinterlegt."}
                  </div>
                )}
              </section>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
