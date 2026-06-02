import { Topbar } from "@/components/app-shell/topbar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import Link from "next/link";
import { CreateMemberSection } from "@/components/admin/create-member-section";
import { redirect } from "next/navigation";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { membershipStatusLabel } from "@/lib/membership/provision-applicant";

type ProfileRow = {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  role: string;
  username: string;
  created_at: string;
};

function formatDE(date: string | null) {
  if (!date) return "—";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) {
    // date-only (YYYY-MM-DD)
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      const [y, m, day] = date.split("-");
      return `${day}.${m}.${y}`;
    }
    return date;
  }
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = d.getFullYear();
  return `${dd}.${mm}.${yy}`;
}

export default async function AdminMembersPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
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
  if (me?.role !== "admin") redirect("/dashboard");

  const inviteParam = searchParams.invite;
  const invite =
    typeof inviteParam === "string"
      ? inviteParam
      : Array.isArray(inviteParam)
        ? inviteParam[0] ?? null
        : null;

  const { members, loadError } = await (async (): Promise<{
    members: ProfileRow[];
    loadError: string | null;
  }> => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, email, role, username, created_at")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) {
      return { members: [], loadError: error.message };
    }
    return { members: (data ?? []) as ProfileRow[], loadError: null };
  })();

  const { pendingApplications, applicationsError } = await (async () => {
    try {
      const admin = createSupabaseAdminClient();
      const { data, error } = await admin
        .from("membership_applications")
        .select("id,first_name,last_name,email,status,created_at,user_id")
        .in("status", ["submitted", "reviewed"])
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) return { pendingApplications: [], applicationsError: error.message };
      return { pendingApplications: data ?? [], applicationsError: null };
    } catch (e) {
      return {
        pendingApplications: [],
        applicationsError: e instanceof Error ? e.message : "Anträge konnten nicht geladen werden",
      };
    }
  })();

  const { allMembers, allError } = await (async (): Promise<{
    allMembers: Array<{
      id: string;
      first_name: string;
      last_name: string;
      email: string | null;
      username: string;
      phone: string | null;
      birthdate: string | null;
      street: string | null;
      postal_code: string | null;
      city: string | null;
      country: string | null;
      membership_start: string | null;
      membership_end: string | null;
      membership_status: string | null;
      fee_cents: number | null;
      role: string;
    }>;
    allError: string | null;
  }> => {
    try {
      const admin = createSupabaseAdminClient();
      const { data: memberships, error: mErr } = await admin
        .from("memberships")
        .select("user_id,start_date,end_date,status,fee_cents")
        .order("end_date", { ascending: false })
        .limit(1000);
      if (mErr) return { allMembers: [], allError: mErr.message };

      const ids = Array.from(new Set((memberships ?? []).map((m) => m.user_id)));
      const { data: profiles, error: pErr } = await admin
        .from("profiles")
        .select(
          "id,first_name,last_name,email,username,phone,birthdate,street,postal_code,city,country,role",
        )
        .order("last_name", { ascending: true })
        .order("first_name", { ascending: true })
        .limit(1000);
      if (pErr) return { allMembers: [], allError: pErr.message };

      const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
      const membershipByUser = new Map<string, any>();
      (memberships ?? []).forEach((m) => {
        // keep the latest membership (by end_date order)
        if (!membershipByUser.has(m.user_id)) membershipByUser.set(m.user_id, m);
      });

      return {
        allMembers: (profiles ?? []).map((p: any) => {
          const m = membershipByUser.get(p.id) ?? null;
          return {
            id: p.id,
            first_name: p.first_name,
            last_name: p.last_name,
            email: p.email ?? null,
            username: p.username,
            phone: p.phone ?? null,
            birthdate: p.birthdate ?? null,
            street: p.street ?? null,
            postal_code: p.postal_code ?? null,
            city: p.city ?? null,
            country: p.country ?? null,
            membership_start: m?.start_date ?? null,
            membership_end: m?.end_date ?? null,
            membership_status: m?.status ?? null,
            fee_cents: m?.fee_cents ?? null,
            role: p.role ?? "member",
          };
        }),
        allError: null,
      };
    } catch (e) {
      return {
        allMembers: [],
        allError: e instanceof Error ? e.message : "Fehler beim Laden",
      };
    }
  })();

  return (
    <div className="min-h-screen">
      <Topbar
        title="Mitgliederverwaltung"
        subtitle="Admin: Mitglieder anlegen, aktivieren/deaktivieren, Einladungen."
      />
      <main className="px-4 py-6 lg:px-8">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Badge variant="brand">Admin</Badge>
          <Badge variant="neutral">Mitgliederliste</Badge>
        </div>

        {/* Invite link (temporary UX) */}
        {invite ? (
          <Card className="mb-4">
            <CardHeader>
              <CardTitle>Einladungslink</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-slate-700">
              <div className="break-all rounded-xl border bg-slate-50 p-3 font-mono text-xs">
                {invite}
              </div>
              <div className="mt-2 text-sm text-slate-600">
                (Temporär) Diesen Link kannst du dem Mitglied schicken, um ein
                Passwort zu setzen.
              </div>
            </CardContent>
          </Card>
        ) : null}

        <Card className="mb-4 border-amber-200 bg-amber-50/30">
          <CardHeader>
            <CardTitle className="flex flex-wrap items-center gap-2">
              Offene Mitgliedschaftsanträge
              {pendingApplications.length ? (
                <Badge variant="warning">{pendingApplications.length}</Badge>
              ) : null}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-700">
            {applicationsError ? (
              <div className="text-rose-700">{applicationsError}</div>
            ) : pendingApplications.length === 0 ? (
              <div>Keine offenen Anträge.</div>
            ) : (
              <div className="grid gap-2">
                {pendingApplications.map((a) => (
                  <div
                    key={a.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-white px-3 py-2"
                  >
                    <div>
                      <div className="font-semibold text-slate-900">
                        {a.first_name} {a.last_name}
                      </div>
                      <div className="text-xs text-slate-500">
                        {a.email} · {formatDE(a.created_at)}
                        {a.user_id ? " · Benutzer angelegt" : " · nur Antrag"}
                      </div>
                    </div>
                    <Link
                      href={`/admin/members/applications/${a.id}`}
                      className="inline-flex h-9 items-center rounded-xl bg-slate-900 px-3 text-xs font-semibold text-white"
                    >
                      Antrag & PDF
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <CreateMemberSection />

        <Card className="mb-4">
          <CardHeader>
            <CardTitle>Mitglieder (alle, inkl. Admins)</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-600">
            {allError ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-900">
                <div className="font-medium">Fehler beim Laden</div>
                <div className="mt-1 text-sm">{allError}</div>
              </div>
            ) : allMembers.length === 0 ? (
              <div className="rounded-xl border bg-slate-50 p-4">
                Keine Mitglieder gefunden.
              </div>
            ) : (
              <div className="grid gap-2">
                {allMembers.map((m) => (
                  <div key={m.id} className="rounded-xl border bg-white p-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate font-semibold text-slate-900">
                          {m.first_name} {m.last_name}
                        </div>
                        <div className="truncate text-xs text-slate-500">
                          {m.email} · @{m.username}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {m.membership_status ? (
                          <Badge
                            variant={
                              m.membership_status === "applied"
                                ? "warning"
                                : m.membership_status === "active"
                                  ? "success"
                                  : "neutral"
                            }
                          >
                            {membershipStatusLabel(m.membership_status)}
                          </Badge>
                        ) : null}
                        <Badge variant={m.role === "admin" ? "brand" : "neutral"}>{m.role}</Badge>
                      </div>
                    </div>

                    <div className="mt-2 grid gap-1 text-xs text-slate-600 md:grid-cols-2">
                      <div>
                        <span className="font-semibold text-slate-700">Telefon:</span>{" "}
                        {m.phone ?? "—"}
                      </div>
                      <div>
                        <span className="font-semibold text-slate-700">Geburtstag:</span>{" "}
                        {formatDE(m.birthdate)}
                      </div>
                      <div className="md:col-span-2">
                        <span className="font-semibold text-slate-700">Adresse:</span>{" "}
                        {[m.street, m.postal_code, m.city, m.country].filter(Boolean).join(", ") ||
                          "—"}
                      </div>
                      <div>
                        <span className="font-semibold text-slate-700">Zeitraum:</span>{" "}
                        {formatDE(m.membership_start)} → {formatDE(m.membership_end)}
                      </div>
                      <div>
                        <span className="font-semibold text-slate-700">Beitrag:</span>{" "}
                        {m.fee_cents == null ? "—" : `${(m.fee_cents / 100).toFixed(2)} €`}
                      </div>
                    </div>
                    <div className="mt-3">
                      <Link
                        href={`/admin/members/${m.id}`}
                        className="inline-flex h-9 items-center justify-center rounded-xl border bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm shadow-slate-900/5 hover:bg-slate-50"
                      >
                        Bearbeiten
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Removed "last 50" list in favor of full editable list above */}
      </main>
    </div>
  );
}

