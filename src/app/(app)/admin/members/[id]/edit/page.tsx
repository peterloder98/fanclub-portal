import { Topbar } from "@/components/app-shell/topbar";
import { MembershipPdfPanel } from "@/components/admin/membership-pdf-panel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GenderSelect } from "@/components/ui/gender-select";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import Link from "next/link";
import { AdminBackLink } from "@/components/admin/admin-back-link";
import { AlertTriangle } from "lucide-react";
import { updateMember } from "../../actions";

export const dynamic = "force-dynamic";

function formatDE(date: string | null) {
  if (!date) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

export default async function AdminMemberEditPage({
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
  if (me?.role !== "admin") redirect("/dashboard");

  const admin = createSupabaseAdminClient();
  const { data: profile, error: pErr } = await admin
    .from("profiles")
    .select("id,membership_number,first_name,last_name,email,username,role,phone,birthdate,gender,street,postal_code,city,country,warning_count")
    .eq("id", id)
    .maybeSingle();
  if (pErr) throw new Error(pErr.message);
  if (!profile) redirect("/admin/members");

  const { data: membership } = await admin
    .from("memberships")
    .select("start_date,end_date,status,fee_cents")
    .eq("user_id", id)
    .order("end_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: application } = await admin
    .from("membership_applications")
    .select("id")
    .eq("user_id", id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <div className="min-h-screen">
      <Topbar title="Mitglied bearbeiten" subtitle={`${profile.first_name} ${profile.last_name}`} />
      <main className="px-4 py-6 lg:px-8">
        <AdminBackLink href={`/admin/members/${id}`} label="← Mitgliedsdatensatz" />

        <div className="grid gap-4 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Stammdaten & Mitgliedschaft</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={updateMember} className="grid gap-3 md:grid-cols-2">
                <input type="hidden" name="user_id" value={profile.id} />

                <label className="grid gap-1">
                  <span className="text-sm font-medium text-slate-700">Mitgliedsnummer</span>
                  <input
                    name="membership_number"
                    defaultValue={profile.membership_number ?? ""}
                    className="h-11 rounded-xl border bg-white px-3 text-sm outline-none"
                    placeholder="Wird bei Freigabe automatisch vergeben"
                  />
                </label>
                {(() => {
                  const wc = (profile as { warning_count?: number }).warning_count ?? 0;
                  return wc > 0 ? (
                    <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900 md:col-span-2">
                      <span className="inline-flex items-center gap-1.5 font-semibold">
                        <AlertTriangle className="h-4 w-4" aria-hidden />
                        Verwarnungen (nur Admin): {wc}
                      </span>
                    </div>
                  ) : null;
                })()}
                <label className="grid gap-1">
                  <span className="text-sm font-medium text-slate-700">Vorname</span>
                  <input
                    name="first_name"
                    defaultValue={profile.first_name}
                    className="h-11 rounded-xl border bg-white px-3 text-sm outline-none"
                  />
                </label>
                <label className="grid gap-1">
                  <span className="text-sm font-medium text-slate-700">Nachname</span>
                  <input
                    name="last_name"
                    defaultValue={profile.last_name}
                    className="h-11 rounded-xl border bg-white px-3 text-sm outline-none"
                  />
                </label>

                <label className="grid gap-1 md:col-span-2">
                  <span className="text-sm font-medium text-slate-700">E-Mail (read-only)</span>
                  <input
                    disabled
                    defaultValue={profile.email ?? ""}
                    className="h-11 rounded-xl border bg-slate-50 px-3 text-sm outline-none"
                  />
                </label>

                <label className="grid gap-1">
                  <span className="text-sm font-medium text-slate-700">Telefon</span>
                  <input
                    name="phone"
                    defaultValue={profile.phone ?? ""}
                    className="h-11 rounded-xl border bg-white px-3 text-sm outline-none"
                  />
                </label>
                <label className="grid gap-1">
                  <span className="text-sm font-medium text-slate-700">Geburtsdatum</span>
                  <input
                    name="birthdate"
                    type="date"
                    defaultValue={formatDE(profile.birthdate ?? null)}
                    className="h-11 rounded-xl border bg-white px-3 text-sm outline-none"
                  />
                </label>
                <label className="grid gap-1">
                  <span className="text-sm font-medium text-slate-700">Geschlecht *</span>
                  <GenderSelect
                    name="gender"
                    value={profile.gender === "m" || profile.gender === "w" || profile.gender === "d" ? profile.gender : ""}
                  />
                </label>

                <label className="grid gap-1 md:col-span-2">
                  <span className="text-sm font-medium text-slate-700">Straße</span>
                  <input
                    name="street"
                    defaultValue={profile.street ?? ""}
                    className="h-11 rounded-xl border bg-white px-3 text-sm outline-none"
                  />
                </label>
                <label className="grid gap-1">
                  <span className="text-sm font-medium text-slate-700">PLZ</span>
                  <input
                    name="postal_code"
                    defaultValue={profile.postal_code ?? ""}
                    className="h-11 rounded-xl border bg-white px-3 text-sm outline-none"
                  />
                </label>
                <label className="grid gap-1">
                  <span className="text-sm font-medium text-slate-700">Ort</span>
                  <input
                    name="city"
                    defaultValue={profile.city ?? ""}
                    className="h-11 rounded-xl border bg-white px-3 text-sm outline-none"
                  />
                </label>
                <label className="grid gap-1">
                  <span className="text-sm font-medium text-slate-700">Land</span>
                  <input
                    name="country"
                    defaultValue={profile.country ?? "DE"}
                    className="h-11 rounded-xl border bg-white px-3 text-sm outline-none"
                  />
                </label>
                <label className="grid gap-1">
                  <span className="text-sm font-medium text-slate-700">Rolle</span>
                  <select
                    name="role"
                    defaultValue={profile.role}
                    className="h-11 rounded-xl border bg-white px-3 text-sm outline-none"
                  >
                    <option value="member">member</option>
                    <option value="anni">anni</option>
                    <option value="admin">admin</option>
                  </select>
                </label>

                <label className="grid gap-1">
                  <span className="text-sm font-medium text-slate-700">Mitgliedschaft Beginn</span>
                  <input
                    name="membership_start"
                    type="date"
                    defaultValue={membership?.start_date ?? ""}
                    className="h-11 rounded-xl border bg-white px-3 text-sm outline-none"
                  />
                </label>
                <label className="grid gap-1">
                  <span className="text-sm font-medium text-slate-700">Mitgliedschaft Ende</span>
                  <input
                    name="membership_end"
                    type="date"
                    defaultValue={membership?.end_date ?? ""}
                    className="h-11 rounded-xl border bg-white px-3 text-sm outline-none"
                  />
                </label>
                <label className="grid gap-1">
                  <span className="text-sm font-medium text-slate-700">Status</span>
                  <select
                    name="status"
                    defaultValue={membership?.status ?? "active"}
                    className="h-11 rounded-xl border bg-white px-3 text-sm outline-none"
                  >
                    <option value="applied">Mitgliedschaft beantragt</option>
                    <option value="active">aktiv</option>
                    <option value="inactive">inaktiv</option>
                  </select>
                </label>
                <label className="grid gap-1">
                  <span className="text-sm font-medium text-slate-700">Beitrag (€)</span>
                  <input
                    name="fee_eur"
                    type="number"
                    step="0.01"
                    defaultValue={membership?.fee_cents ? (membership.fee_cents / 100).toFixed(2) : "15.00"}
                    className="h-11 rounded-xl border bg-white px-3 text-sm outline-none"
                  />
                </label>

                <div className="md:col-span-2">
                  <button className="h-11 w-full rounded-xl bg-slate-900 text-sm font-semibold text-white shadow-sm hover:bg-slate-800">
                    Speichern
                  </button>
                </div>
              </form>
            </CardContent>
          </Card>

          {application?.id ? (
            <MembershipPdfPanel applicationId={application.id} />
          ) : (
            <Card>
              <CardContent className="py-8 text-sm text-slate-500">
                Kein digitaler Mitgliedsantrag (PDF) mit diesem Profil verknüpft.
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
