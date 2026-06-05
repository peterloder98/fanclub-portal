"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  ChevronDown,
  History,
  KeyRound,
  ShieldAlert,
  UserRound,
} from "lucide-react";
import { Topbar } from "@/components/app-shell/topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UploadDropzone } from "@/components/ui/upload-dropzone";
import { GenderSelect } from "@/components/ui/gender-select";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { getAvatarPublicUrl } from "@/lib/avatars/url";
import { AvatarCropModal } from "@/components/profile/avatar-crop-modal";
import { PreferredCalendarSettings } from "@/components/profile/preferred-calendar-settings";
import { ContributionStatusBadge } from "@/components/admin/contribution-status-badge";
import {
  AVATAR_ACCEPT,
  AVATAR_MIN_DIMENSION,
  isAllowedAvatarFile,
  readImageDimensions,
} from "@/lib/avatars/constants";
import { GENDER_OPTIONS } from "@/lib/person/gender";
import { membershipStatusLabel } from "@/lib/membership/provision-applicant";
import { formatEur } from "@/lib/club/ledger";
import { activityTypeLabel } from "@/lib/membership/activity-log";
import {
  loadMyProfileBundle,
  updateMyProfile,
  type MyProfileBundle,
  type MyWarningRow,
} from "@/app/(app)/profile/actions";
import type { MemberActivityRow } from "@/lib/membership/activity-log";

function formatDE(date: string | null) {
  if (!date) return "—";
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const [y, m, d] = date.split("-");
    return `${d}.${m}.${y}`;
  }
  const dt = new Date(date);
  if (Number.isNaN(dt.getTime())) return "—";
  return dt.toLocaleDateString("de-DE");
}

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString("de-DE", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function contextKindLabel(kind: string) {
  if (kind === "poll") return "Umfrage";
  if (kind === "giveaway") return "Gewinnspiel";
  return "Beitrag";
}

function genderLabel(g: string | null) {
  return GENDER_OPTIONS.find((o) => o.value === g)?.label ?? g ?? "—";
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid gap-0.5 border-b border-slate-100 py-2.5 sm:grid-cols-[minmax(0,140px)_1fr]">
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="text-sm text-slate-900">{value}</dd>
    </div>
  );
}

function SectionHeading({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-700">
        <Icon className="h-4 w-4" aria-hidden />
      </div>
      <div>
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        {description ? <p className="mt-0.5 text-sm text-slate-600">{description}</p> : null}
      </div>
    </div>
  );
}

function WarningsSection({ warnings, warningCount }: { warnings: MyWarningRow[]; warningCount: number }) {
  if (warnings.length === 0 && warningCount === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <SectionHeading
            icon={ShieldAlert}
            title="Verwarnungen"
            description="Keine Verwarnungen — danke für deinen respektvollen Umgang im Club."
          />
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="border-rose-200">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <SectionHeading
            icon={ShieldAlert}
            title="Verwarnungen"
            description={
              warningCount === 1
                ? "Du hast 1 Verwarnung. Hier siehst du den Grund."
                : `Du hast ${warningCount} Verwarnungen. Hier siehst du die Gründe.`
            }
          />
          <Badge variant="neutral" className="border-rose-200 bg-rose-50 text-rose-800">
            <AlertTriangle className="mr-1 h-3 w-3" aria-hidden />
            {warningCount}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {warnings.map((w) => (
          <div
            key={w.id}
            className="rounded-xl border border-rose-200 bg-rose-50/60 px-4 py-3 text-sm"
          >
            <p className="font-semibold text-rose-900">
              {contextKindLabel(w.context_kind)}: {w.context_title ?? "—"}
            </p>
            <p className="mt-0.5 text-xs text-rose-700">{formatWhen(w.created_at)}</p>
            <p className="mt-2 whitespace-pre-wrap text-slate-800">„{w.comment_text}"</p>
            <p className="mt-1 text-xs text-slate-500">
              Kommentar vom {formatWhen(w.comment_created_at)}
              {w.context_author_name ? ` unter Beitrag von ${w.context_author_name}` : ""}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function ActivityHistorySection({ rows }: { rows: MemberActivityRow[] }) {
  const [open, setOpen] = useState(true);

  return (
    <Card>
      <CardHeader className="pb-3">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-start justify-between gap-3 text-left"
        >
          <SectionHeading
            icon={History}
            title="Meine Historie"
            description="Aufnahme, Beiträge, Bestellungen, Verwarnungen und deine Änderungen."
          />
          <ChevronDown
            className={`mt-1 h-5 w-5 shrink-0 text-slate-500 transition ${open ? "rotate-180" : ""}`}
            aria-hidden
          />
        </button>
      </CardHeader>
      {open ? (
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-sm text-slate-500">Noch keine Einträge.</p>
          ) : (
            <ul className="max-h-80 space-y-2 overflow-y-auto pr-1">
              {rows.map((r) => (
                <li
                  key={r.id}
                  className={
                    r.event_type === "warning_issued"
                      ? "rounded-xl border border-rose-200 bg-rose-50/70 px-3 py-2.5 text-sm"
                      : "rounded-xl border bg-slate-50/80 px-3 py-2.5 text-sm"
                  }
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="font-semibold text-slate-900">{r.title}</span>
                    <span className="text-xs text-slate-500">{formatWhen(r.created_at)}</span>
                  </div>
                  <div className="mt-0.5 text-xs text-slate-500">
                    {activityTypeLabel(r.event_type)}
                    {r.created_by_name ? ` · ${r.created_by_name}` : ""}
                  </div>
                  {r.details ? (
                    <p className="mt-1 whitespace-pre-wrap text-slate-700">{r.details}</p>
                  ) : null}
                  {r.link_url ? (
                    <a
                      href={r.link_url}
                      className="mt-1 inline-block text-xs font-medium text-blue-600 hover:underline"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {r.link_label ?? "Ansehen"} →
                    </a>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      ) : null}
    </Card>
  );
}

function PasswordSection() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setOk(false);
    if (password.length < 8) {
      setError("Das Passwort muss mindestens 8 Zeichen haben.");
      return;
    }
    if (password !== confirm) {
      setError("Die Passwörter stimmen nicht überein.");
      return;
    }
    setBusy(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      setPassword("");
      setConfirm("");
      setOk(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Passwort konnte nicht geändert werden.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <SectionHeading
          icon={KeyRound}
          title="Passwort ändern"
          description="Wähle ein sicheres Passwort mit mindestens 8 Zeichen."
        />
      </CardHeader>
      <CardContent>
        {ok ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-900">
            Passwort wurde erfolgreich geändert.
          </div>
        ) : (
          <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1">
              <span className="text-sm font-medium text-slate-700">Neues Passwort</span>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                autoComplete="new-password"
                required
                className="h-11 rounded-xl border bg-white px-3 text-sm outline-none focus:ring-4 focus:ring-[color:var(--ring)]"
              />
            </label>
            <label className="grid gap-1">
              <span className="text-sm font-medium text-slate-700">Passwort bestätigen</span>
              <input
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                type="password"
                autoComplete="new-password"
                required
                className="h-11 rounded-xl border bg-white px-3 text-sm outline-none focus:ring-4 focus:ring-[color:var(--ring)]"
              />
            </label>
            {error ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800 sm:col-span-2">
                {error}
              </div>
            ) : null}
            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={busy}
                className="h-11 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
              >
                {busy ? "Speichern…" : "Passwort speichern"}
              </button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

export function ProfilePageClient() {
  const router = useRouter();
  const [bundle, setBundle] = useState<MyProfileBundle | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveOk, setSaveOk] = useState(false);
  const [pending, startTransition] = useTransition();
  const [busyAvatar, setBusyAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [cropFile, setCropFile] = useState<File | null>(null);

  function reload() {
    startTransition(async () => {
      try {
        setLoadError(null);
        const data = await loadMyProfileBundle();
        setBundle(data);
      } catch (e) {
        setLoadError(e instanceof Error ? e.message : "Profil konnte nicht geladen werden.");
      }
    });
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const avatarUrl = getAvatarPublicUrl(bundle?.profile.avatar_path ?? null);
  const displayName = bundle
    ? `${bundle.profile.first_name} ${bundle.profile.last_name}`.trim()
    : "Mitglied";

  async function uploadCropped(params: { blob: Blob; contentType: string }) {
    setBusyAvatar(true);
    setAvatarError(null);
    try {
      const fd = new FormData();
      fd.append("file", params.blob, "avatar.webp");
      fd.append("contentType", params.contentType);
      const res = await fetch("/api/avatar/upload", { method: "POST", body: fd });
      const json = (await res.json()) as { ok?: boolean; avatar_path?: string; error?: string };
      if (!res.ok || !json.ok) throw new Error(json.error ?? "Upload fehlgeschlagen");
      setBundle((prev) =>
        prev
          ? { ...prev, profile: { ...prev.profile, avatar_path: json.avatar_path ?? null } }
          : prev,
      );
      router.refresh();
    } catch (e) {
      setAvatarError(e instanceof Error ? e.message : "Upload fehlgeschlagen");
    } finally {
      setBusyAvatar(false);
      setCropFile(null);
    }
  }

  async function onPickFile(file: File) {
    setAvatarError(null);
    if (!isAllowedAvatarFile(file)) {
      setAvatarError("Bitte nur JPG, PNG oder WebP hochladen.");
      return;
    }
    try {
      const { width, height } = await readImageDimensions(file);
      if (width < AVATAR_MIN_DIMENSION || height < AVATAR_MIN_DIMENSION) {
        setAvatarError(
          `Das Bild ist zu klein (${width}×${height}). Mindestens ${AVATAR_MIN_DIMENSION}×${AVATAR_MIN_DIMENSION} Pixel.`,
        );
        return;
      }
    } catch {
      setAvatarError("Bild konnte nicht gelesen werden.");
      return;
    }
    setCropFile(file);
  }

  function handleProfileSave(formData: FormData) {
    setSaveError(null);
    setSaveOk(false);
    startTransition(async () => {
      try {
        await updateMyProfile(formData);
        setSaveOk(true);
        reload();
      } catch (e) {
        setSaveError(e instanceof Error ? e.message : "Speichern fehlgeschlagen.");
      }
    });
  }

  if (loadError && !bundle) {
    return (
      <div className="min-h-screen">
        <Topbar title="Mein Profil" subtitle="Mitgliederdaten verwalten." />
        <main className="px-4 py-6 lg:px-8">
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {loadError}
          </div>
        </main>
      </div>
    );
  }

  if (!bundle) {
    return (
      <div className="min-h-screen">
        <Topbar title="Mein Profil" subtitle="Mitgliederdaten verwalten." />
        <main className="px-4 py-6 lg:px-8">
          <p className="text-sm text-slate-600">Profil wird geladen…</p>
        </main>
      </div>
    );
  }

  const { profile, membership, contribution, warnings, activity } = bundle;
  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

  return (
    <div className="min-h-screen">
      <Topbar title="Mein Profil" subtitle="Mitgliederdaten, Sicherheit und Historie." />
      <main className="px-4 py-6 lg:px-8">
        <div className="mx-auto max-w-4xl space-y-4">
          <div className="rounded-2xl border bg-gradient-to-br from-slate-50 to-white p-4 sm:p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="h-20 w-20 shrink-0 overflow-hidden rounded-full border-2 border-white bg-slate-100 shadow-sm">
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full w-full place-items-center text-xl font-bold text-slate-600">
                    {initials}
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="truncate text-xl font-bold text-slate-900">{displayName}</h1>
                <p className="mt-0.5 text-sm text-slate-600">{profile.email ?? "—"}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {profile.membership_number ? (
                    <Badge variant="neutral">Nr. {profile.membership_number}</Badge>
                  ) : null}
                  <Badge variant="neutral">{membershipStatusLabel(membership?.status)}</Badge>
                  {contribution ? <ContributionStatusBadge status={contribution.status} /> : null}
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="lg:col-span-2">
              <CardHeader className="pb-3">
                <SectionHeading
                  icon={UserRound}
                  title="Stammdaten"
                  description="Diese Angaben nutzt der Club für Kommunikation und Versand."
                />
              </CardHeader>
              <CardContent>
                <form action={handleProfileSave} className="grid gap-3 md:grid-cols-2">
                  <label className="grid gap-1">
                    <span className="text-sm font-medium text-slate-700">Vorname</span>
                    <input
                      name="first_name"
                      defaultValue={profile.first_name}
                      required
                      className="h-11 rounded-xl border bg-white px-3 text-sm outline-none focus:ring-4 focus:ring-[color:var(--ring)]"
                    />
                  </label>
                  <label className="grid gap-1">
                    <span className="text-sm font-medium text-slate-700">Nachname</span>
                    <input
                      name="last_name"
                      defaultValue={profile.last_name}
                      required
                      className="h-11 rounded-xl border bg-white px-3 text-sm outline-none focus:ring-4 focus:ring-[color:var(--ring)]"
                    />
                  </label>
                  <label className="grid gap-1 md:col-span-2">
                    <span className="text-sm font-medium text-slate-700">E-Mail</span>
                    <input
                      disabled
                      value={profile.email ?? ""}
                      className="h-11 rounded-xl border bg-slate-50 px-3 text-sm text-slate-600 outline-none"
                    />
                    <span className="text-xs text-slate-500">
                      E-Mail-Änderungen bitte beim Vorstand anfragen.
                    </span>
                  </label>
                  <label className="grid gap-1">
                    <span className="text-sm font-medium text-slate-700">Telefon</span>
                    <input
                      name="phone"
                      defaultValue={profile.phone ?? ""}
                      className="h-11 rounded-xl border bg-white px-3 text-sm outline-none focus:ring-4 focus:ring-[color:var(--ring)]"
                    />
                  </label>
                  <label className="grid gap-1">
                    <span className="text-sm font-medium text-slate-700">Geburtsdatum</span>
                    <input
                      name="birthdate"
                      type="date"
                      defaultValue={profile.birthdate ?? ""}
                      className="h-11 rounded-xl border bg-white px-3 text-sm outline-none focus:ring-4 focus:ring-[color:var(--ring)]"
                    />
                  </label>
                  <label className="grid gap-1">
                    <span className="text-sm font-medium text-slate-700">Geschlecht</span>
                    <GenderSelect
                      name="gender"
                      value={
                        profile.gender === "m" || profile.gender === "w" || profile.gender === "d"
                          ? profile.gender
                          : ""
                      }
                    />
                  </label>
                  <label className="grid gap-1 md:col-span-2">
                    <span className="text-sm font-medium text-slate-700">Straße</span>
                    <input
                      name="street"
                      defaultValue={profile.street ?? ""}
                      className="h-11 rounded-xl border bg-white px-3 text-sm outline-none focus:ring-4 focus:ring-[color:var(--ring)]"
                    />
                  </label>
                  <label className="grid gap-1">
                    <span className="text-sm font-medium text-slate-700">PLZ</span>
                    <input
                      name="postal_code"
                      defaultValue={profile.postal_code ?? ""}
                      className="h-11 rounded-xl border bg-white px-3 text-sm outline-none focus:ring-4 focus:ring-[color:var(--ring)]"
                    />
                  </label>
                  <label className="grid gap-1">
                    <span className="text-sm font-medium text-slate-700">Ort</span>
                    <input
                      name="city"
                      defaultValue={profile.city ?? ""}
                      className="h-11 rounded-xl border bg-white px-3 text-sm outline-none focus:ring-4 focus:ring-[color:var(--ring)]"
                    />
                  </label>
                  <label className="grid gap-1">
                    <span className="text-sm font-medium text-slate-700">Land</span>
                    <input
                      name="country"
                      defaultValue={profile.country ?? "DE"}
                      className="h-11 rounded-xl border bg-white px-3 text-sm outline-none focus:ring-4 focus:ring-[color:var(--ring)]"
                    />
                  </label>

                  {saveOk ? (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900 md:col-span-2">
                      Stammdaten gespeichert.
                    </div>
                  ) : null}
                  {saveError ? (
                    <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800 md:col-span-2">
                      {saveError}
                    </div>
                  ) : null}

                  <div className="md:col-span-2">
                    <button
                      type="submit"
                      disabled={pending}
                      className="h-11 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                    >
                      {pending ? "Speichern…" : "Stammdaten speichern"}
                    </button>
                  </div>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Profilbild</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3">
                <UploadDropzone
                  accept={AVATAR_ACCEPT}
                  disabled={busyAvatar}
                  hint="256×256 WebP"
                  onFile={onPickFile}
                />
                {avatarError ? (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
                    {avatarError}
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Mitgliedschaft</CardTitle>
              </CardHeader>
              <CardContent>
                <dl>
                  <InfoRow label="Status" value={membershipStatusLabel(membership?.status)} />
                  <InfoRow
                    label="Zeitraum"
                    value={
                      membership?.start_date && membership?.end_date
                        ? `${formatDE(membership.start_date)} – ${formatDE(membership.end_date)}`
                        : "—"
                    }
                  />
                  <InfoRow
                    label="Jahresbeitrag"
                    value={
                      membership?.fee_cents != null ? formatEur(membership.fee_cents) : "—"
                    }
                  />
                  {contribution ? (
                    <>
                      <InfoRow
                        label="Beitrag"
                        value={<ContributionStatusBadge status={contribution.status} />}
                      />
                      {contribution.status !== "paid" ? (
                        <InfoRow
                          label="Offen"
                          value={`${formatEur(contribution.openCents)} · Periode ${contribution.periodLabel}`}
                        />
                      ) : (
                        <InfoRow label="Periode" value={contribution.periodLabel} />
                      )}
                    </>
                  ) : null}
                  <InfoRow label="Geschlecht" value={genderLabel(profile.gender)} />
                </dl>
              </CardContent>
            </Card>

            <PasswordSection />

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Kalender</CardTitle>
              </CardHeader>
              <CardContent>
                <PreferredCalendarSettings />
              </CardContent>
            </Card>

            <WarningsSection warnings={warnings} warningCount={profile.warning_count} />

            <ActivityHistorySection rows={activity} />

            {profile.role === "admin" ? (
              <Card className="lg:col-span-2">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Admin · Signaturen</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-slate-600">
                  <p>Fanclub-Signatur und deine persönliche Unterschrift bearbeitest du im Admin-Bereich.</p>
                  <Link
                    href="/admin/signatures"
                    className="mt-3 inline-block font-medium text-blue-600 hover:underline"
                  >
                    Zu Admin · Signaturen →
                  </Link>
                </CardContent>
              </Card>
            ) : null}
          </div>
        </div>
      </main>

      {cropFile ? (
        <AvatarCropModal
          file={cropFile}
          onClose={() => setCropFile(null)}
          onSave={uploadCropped}
        />
      ) : null}
    </div>
  );
}
