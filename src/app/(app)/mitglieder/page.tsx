import { Suspense } from "react";
import { Topbar } from "@/components/app-shell/topbar";
import { MembersMap } from "@/components/members/members-map";
import { UpcomingBirthdays } from "@/components/members/upcoming-birthdays";
import { MitgliederTabs } from "@/components/mitglieder/mitglieder-tabs.client";
import { loadPublishedMeetings } from "@/lib/meetings/load";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAvatarPublicUrl } from "@/lib/avatars/url";
import { memberCountryLabel } from "@/lib/members/country";
import type { MemberMapPoint } from "@/lib/members/cluster-map";
import { clusterMemberPoints, type MemberMapCluster } from "@/lib/members/cluster-map";
import { profileDisplayName } from "@/lib/profiles/display";
import { buildUpcomingBirthdays } from "@/lib/members/upcoming-birthdays";
import { redirect } from "next/navigation";
import { scheduleMissingProfileGeocode } from "@/lib/members/maybe-geocode-missing";

export default async function MitgliederPage() {
  scheduleMissingProfileGeocode();

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: activeMemberships } = await supabase
    .from("memberships")
    .select("user_id")
    .eq("status", "active");
  const activeIds = new Set((activeMemberships ?? []).map((m) => m.user_id));

  const activeList = [...activeIds];
  const { data: profiles } = activeList.length
    ? await supabase
        .from("profiles")
        .select(
          "id,first_name,last_name,postal_code,city,country,map_lat,map_lng,birthdate,avatar_path,updated_at,email",
        )
        .in("id", activeList)
    : { data: [] };

  const mapPoints: MemberMapPoint[] = [];
  let missingCoords = 0;

  for (const p of profiles ?? []) {
    const city = (p.city ?? "").trim();
    const hasAddress = Boolean((p.postal_code ?? "").trim() || city);
    if (!hasAddress) continue;

    const lat = typeof p.map_lat === "number" ? p.map_lat : null;
    const lng = typeof p.map_lng === "number" ? p.map_lng : null;
    if (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) {
      missingCoords += 1;
      continue;
    }

    mapPoints.push({
      userId: p.id,
      postalCode: (p.postal_code ?? "").trim() || "—",
      city: city || memberCountryLabel(p.country),
      lat,
      lng,
      name: profileDisplayName(p),
      avatarUrl: getAvatarPublicUrl(p.avatar_path, p.updated_at ?? null),
    });
  }

  const clusters: MemberMapCluster[] = clusterMemberPoints(mapPoints, 30);

  const birthdayRows = buildUpcomingBirthdays(
    (profiles ?? []).map((p) => ({
      id: p.id,
      first_name: p.first_name,
      last_name: p.last_name,
      email: p.email,
      birthdate: p.birthdate,
      name: profileDisplayName(p),
      avatarUrl: getAvatarPublicUrl(p.avatar_path, p.updated_at ?? null),
    })),
    10,
  );

  let meetings: Awaited<ReturnType<typeof loadPublishedMeetings>> = [];
  try {
    meetings = await loadPublishedMeetings(supabase, user.id, { includePastDays: 365 * 3 });
  } catch {
    meetings = [];
  }

  const meetingIds = meetings.map((m) => m.id);
  const mediaByMeetingId: Record<
    string,
    Array<{ id: string; kind: string; caption: string | null; report_body: string | null }>
  > = {};
  if (meetingIds.length) {
    const { data: media } = await supabase
      .from("club_meeting_media")
      .select("id,meeting_id,kind,caption,report_body")
      .in("meeting_id", meetingIds);
    for (const row of media ?? []) {
      if (!mediaByMeetingId[row.meeting_id]) mediaByMeetingId[row.meeting_id] = [];
      mediaByMeetingId[row.meeting_id].push(row);
    }
  }

  const mapSection = (
    <div className="relative z-0 flex h-full min-h-0 flex-col rounded-2xl border border-fc-ice bg-white p-3 shadow-sm">
      <div className="fc-accent-bar mb-2 w-16 shrink-0" />
      <h2 className="shrink-0 px-1 text-base font-semibold text-fc-navy">
        Hier sind unsere Mitglieder her
      </h2>
      {missingCoords > 0 ? (
        <p className="mt-1 shrink-0 px-1 text-xs text-amber-800">
          {missingCoords} Mitglied(er) ohne Kartenposition.
        </p>
      ) : null}
      <div className="mt-2 min-h-[min(55vh,380px)] flex-1 lg:min-h-0">
        <MembersMap clusters={clusters} memberCount={mapPoints.length} totalActive={activeList.length} />
      </div>
    </div>
  );

  const birthdaysSection = (
    <aside className="flex h-full min-h-0 flex-col rounded-2xl border border-fc-ice bg-white shadow-sm">
      <div className="shrink-0 border-b border-fc-ice px-4 py-3">
        <h2 className="text-base font-semibold text-fc-navy">Nächste Geburtstage</h2>
        <p className="text-xs text-[color:var(--muted)]">Die nächsten 10 Termine im Jahr</p>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <UpcomingBirthdays rows={birthdayRows} />
      </div>
    </aside>
  );

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <Topbar
        title="Mitglieder & Treffen"
        subtitle="Gemeinschaft, Karte, Geburtstage und unsere Fanclub-Termine."
      />
      <main className="mx-auto flex min-h-0 w-full min-w-0 max-w-6xl flex-1 flex-col overflow-x-hidden overflow-hidden px-3 pb-2 pt-3 sm:px-4 lg:px-8">
        <Suspense fallback={<div className="h-24 animate-pulse rounded-2xl bg-fc-ice" />}>
          <MitgliederTabs
            mapSection={mapSection}
            birthdaysSection={birthdaysSection}
            meetings={meetings}
            mediaByMeetingId={mediaByMeetingId}
          />
        </Suspense>
      </main>
    </div>
  );
}
