import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { MapPin } from "lucide-react";
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

export const dynamic = "force-dynamic";

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
    .select("status")
    .eq("user_id", id)
    .eq("status", "active")
    .maybeSingle();
  if (!membership) notFound();

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "id,first_name,last_name,email,city,country,avatar_path,updated_at,membership_number,intro_discovered_anni,intro_favorite_song,intro_other_artists,intro_hobbies,intro_perfect_concert",
    )
    .eq("id", id)
    .maybeSingle();
  if (!profile) notFound();

  const name = profileDisplayName(profile);
  const avatarUrl = getAvatarPublicUrl(profile.avatar_path, profile.updated_at ?? null);
  const origin = formatMemberOrigin({
    city: profile.city,
    countryLabel: memberCountryLabel(profile.country),
  });
  const isSelf = user.id === id;

  const answers = MEMBER_INTRO_QUESTIONS.map((q) => ({
    ...q,
    value: (profile[q.key as MemberIntroKey] as string | null)?.trim() || null,
  })).filter((q) => q.value);

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
                {profile.membership_number ? (
                  <p className="mt-1 text-xs text-white/70">Mitgliedsnr. {profile.membership_number}</p>
                ) : null}
              </div>
            </div>
          </div>

          <div className="space-y-4 px-5 py-6 sm:px-8">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-fc-navy/70">
                Kennenlernen
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Fünf freiwillige Fragen — so lernen wir uns besser kennen.
              </p>
            </div>

            {answers.length ? (
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
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-6 text-center text-sm text-slate-600">
                {isSelf
                  ? "Du hast noch keine Antworten hinterlegt. Trage sie in deinem Profil nach."
                  : "Hier gibt es noch keine Antworten."}
              </div>
            )}

            {isSelf ? (
              <Link
                href="/profile#kennenlernen"
                className="inline-flex h-10 items-center justify-center rounded-xl bg-fc-navy px-4 text-sm font-semibold text-white hover:bg-fc-blue"
              >
                Antworten bearbeiten
              </Link>
            ) : null}
          </div>
        </div>
      </main>
    </div>
  );
}
