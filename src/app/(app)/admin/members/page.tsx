import { Topbar } from "@/components/app-shell/topbar";
import { AdminBackLink } from "@/components/admin/admin-back-link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CreateMemberSection } from "@/components/admin/create-member-section";
import {
  AdminMembersWorkspace,
  type AdminApplicationRow,
  type AdminMemberRow,
} from "@/components/admin/admin-members-workspace.client";
import { redirect } from "next/navigation";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function AdminMembersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
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

  const inviteParam = sp.invite;
  const invite =
    typeof inviteParam === "string"
      ? inviteParam
      : Array.isArray(inviteParam)
        ? inviteParam[0] ?? null
        : null;

  const { members, membersError } = await (async (): Promise<{
    members: AdminMemberRow[];
    membersError: string | null;
  }> => {
    try {
      const admin = createSupabaseAdminClient();
      const { data: memberships, error: mErr } = await admin
        .from("memberships")
        .select("user_id,status,start_date")
        .order("end_date", { ascending: false });
      if (mErr) return { members: [], membersError: mErr.message };

      const { data: profiles, error: pErr } = await admin
        .from("profiles")
        .select("id,membership_number,first_name,last_name,birthdate,email,warning_count")
        .order("membership_number", { ascending: true, nullsFirst: false });
      if (pErr) return { members: [], membersError: pErr.message };

      const membershipByUser = new Map<string, { status: string; start_date: string | null }>();
      (memberships ?? []).forEach((m) => {
        if (!membershipByUser.has(m.user_id)) {
          membershipByUser.set(m.user_id, {
            status: m.status,
            start_date: m.start_date ?? null,
          });
        }
      });

      const { data: warningRows, error: wErr } = await admin
        .from("member_warnings")
        .select("member_id");
      const warningsByUser = new Map<string, number>();
      if (wErr) {
        if (!/member_warnings|does not exist/i.test(wErr.message)) {
          return { members: [], membersError: wErr.message };
        }
      } else {
        (warningRows ?? []).forEach((w) => {
          const mid = w.member_id as string;
          warningsByUser.set(mid, (warningsByUser.get(mid) ?? 0) + 1);
        });
      }

      return {
        members: (profiles ?? []).map((p) => ({
          id: p.id,
          membership_number: p.membership_number ?? null,
          first_name: p.first_name,
          last_name: p.last_name,
          birthdate: p.birthdate ?? null,
          joined_at: membershipByUser.get(p.id)?.start_date ?? null,
          warning_count: Math.max(
            (p as { warning_count?: number }).warning_count ?? 0,
            warningsByUser.get(p.id) ?? 0,
          ),
          membership_status: membershipByUser.get(p.id)?.status ?? null,
          email: p.email ?? null,
        })),
        membersError: null,
      };
    } catch (e) {
      return {
        members: [],
        membersError: e instanceof Error ? e.message : "Fehler beim Laden",
      };
    }
  })();

  const { applications, applicationsError } = await (async (): Promise<{
    applications: AdminApplicationRow[];
    applicationsError: string | null;
  }> => {
    try {
      const admin = createSupabaseAdminClient();
      const { data, error } = await admin
        .from("membership_applications")
        .select("id,first_name,last_name,email,status,created_at,user_id")
        .in("status", ["submitted", "reviewed"])
        .order("created_at", { ascending: false });
      if (error) return { applications: [], applicationsError: error.message };

      const userIds = Array.from(
        new Set((data ?? []).map((a) => a.user_id).filter((id): id is string => Boolean(id))),
      );
      const { data: profiles } = await admin
        .from("profiles")
        .select("id,membership_number")
        .in("id", userIds.length ? userIds : ["00000000-0000-0000-0000-000000000000"]);
      const numByUser = new Map((profiles ?? []).map((p) => [p.id, p.membership_number]));

      return {
        applications: (data ?? []).map((a) => ({
          id: a.id,
          first_name: a.first_name,
          last_name: a.last_name,
          email: a.email,
          status: a.status,
          created_at: a.created_at,
          user_id: a.user_id,
          membership_number: a.user_id ? (numByUser.get(a.user_id) ?? null) : null,
        })),
        applicationsError: null,
      };
    } catch (e) {
      return {
        applications: [],
        applicationsError: e instanceof Error ? e.message : "Anträge konnten nicht geladen werden",
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
        <AdminBackLink />

        <div className="mt-4">
        {invite ? (
          <Card className="mb-4">
            <CardHeader>
              <CardTitle>Einladungslink</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-slate-700">
              <div className="break-all rounded-xl border bg-slate-50 p-3 font-mono text-xs">
                {invite}
              </div>
            </CardContent>
          </Card>
        ) : null}

        <CreateMemberSection />

        <AdminMembersWorkspace
          members={members}
          applications={applications}
          membersError={membersError}
          applicationsError={applicationsError}
        />
        </div>
      </main>
    </div>
  );
}
