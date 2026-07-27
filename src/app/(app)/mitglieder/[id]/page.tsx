import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { CalendarDays, MapPin, Music2, Sparkles, Star, Tv } from "lucide-react";
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
import { MemberPortalBadges } from "@/components/members/member-portal-badges.client";

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
  const pastPreview = pastEvents.slice(0, 5);
  const pastMore = Math.max(0, pastEvents.length - pastPreview.length);

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

  return (
    <div className="min-h-screen">
      <Topbar title={name} subtitle="Mitglieder-Portal" />
      <main className="mx-auto w-full max-w-3xl px-4 py-6 lg:px-8">
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
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-xs text-white/90">
                    <Star className="h-3 w-3" aria-hidden />
                    {yearPoints} Anni-Stars · {yearRank}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-8 px-5 py-6 sm:px-8">
            {shortBio ? (
              <section className="rounded-2xl border border-fc-navy/10 bg-white/90 p-4 shadow-sm">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-fc-navy/70">
                  Ein paar Worte über mich
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-fc-navy">{shortBio}</p>
              </section>
            ) : null}

            {achievements.length ? <MemberPortalBadges achievements={achievements} /> : null}

            <section className="space-y-3">
              <div>
                <h2 className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-fc-navy/70">
                  <CalendarDays className="h-4 w-4" aria-hidden />
                  Hier bin ich dabei
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Konzerte, TV-Auftritte und Treffen für die ich mich angemeldet habe.
                </p>
              </div>

              {upcomingEvents.length || upcomingMeetings.length ? (
                <ul className="grid gap-2">
                  {upcomingMeetings.map((m) => {
                    const when = formatEventListDateParts(m.starts_at);
                    const place = formatEventVenueCityLine({
                      venue: m.venue,
                      city: m.city,
                      country: m.country,
                    });
                    return (
                      <li key={`meeting-${m.id}`}>
                        <Link
                          href={`/treffen/${m.id}`}
                          className="flex gap-3 rounded-2xl border border-fc-navy/10 bg-white/90 p-3 shadow-sm transition hover:border-fc-blue/40 hover:bg-fc-ice/50"
                        >
                          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-rose-50 text-rose-700">
                            <Sparkles className="h-4 w-4" aria-hidden />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold uppercase tracking-wide text-rose-700">
                              Fanclub-Treffen · {when.date}
                            </p>
                            <p className="mt-0.5 truncate text-sm font-semibold text-fc-navy">
                              {m.title}
                            </p>
                            {place ? (
                              <p className="mt-0.5 truncate text-xs text-slate-500">{place}</p>
                            ) : null}
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
                      <li key={e.id}>
                        <Link
                          href={`/events?focus=${e.id}`}
                          className="flex gap-3 rounded-2xl border border-fc-navy/10 bg-white/90 p-3 shadow-sm transition hover:border-fc-blue/40 hover:bg-fc-ice/50"
                        >
                          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-fc-ice text-fc-navy">
                            <Icon className="h-4 w-4" aria-hidden />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold uppercase tracking-wide text-fc-blue">
                              {e.kind === "tv" ? "TV" : "Konzert"} · {when.date}
                              {time ? ` · ${time}` : ""}
                            </p>
                            <p className="mt-0.5 truncate text-sm font-semibold text-fc-navy">
                              {e.title}
                            </p>
                            {place ? (
                              <p className="mt-0.5 truncate text-xs text-slate-500">{place}</p>
                            ) : null}
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

              {pastPreview.length ? (
                <div className="pt-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Schon dabei gewesen ({pastEvents.length})
                  </p>
                  <ul className="mt-2 grid gap-1.5">
                    {pastPreview.map((e) => {
                      const when = formatEventListDateParts(e.start_at, e.end_at);
                      return (
                        <li key={e.id}>
                          <Link
                            href={`/events?focus=${e.id}`}
                            className="flex items-baseline justify-between gap-3 rounded-xl px-2 py-1.5 text-sm hover:bg-slate-50"
                          >
                            <span className="min-w-0 truncate text-slate-700">{e.title}</span>
                            <span className="shrink-0 text-xs tabular-nums text-slate-400">
                              {when.date}
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                  {pastMore > 0 ? (
                    <p className="mt-1 px-2 text-xs text-slate-500">
                      und {pastMore} weitere
                    </p>
                  ) : null}
                </div>
              ) : null}
            </section>

            {answers.length ? (
              <section className="space-y-3">
                <div>
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-fc-navy/70">
                    Kennenlernen
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Fünf freiwillige Fragen — so lernen wir uns besser kennen.
                  </p>
                </div>
                <ul className="grid gap-3">
                  {answers.map((q) => (
                    <li
                      key={q.key}
                      className="rounded-2xl border border-fc-navy/10 bg-white/90 p-4 shadow-sm"
                    >
                      <p className="text-xs font-semibold uppercase tracking-wide text-fc-blue">
                        {q.label}
                      </p>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-fc-navy">
                        {q.value}
                      </p>
                    </li>
                  ))}
                </ul>
                {isSelf ? (
                  <Link
                    href="/profile#kennenlernen"
                    className="inline-flex h-10 items-center justify-center rounded-xl bg-fc-navy px-4 text-sm font-semibold text-white hover:bg-fc-blue"
                  >
                    Antworten bearbeiten
                  </Link>
                ) : null}
              </section>
            ) : null}
          </div>
        </div>
      </main>
    </div>
  );
}
