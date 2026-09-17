import { Topbar } from "@/components/app-shell/topbar";
import { AdminBackLink } from "@/components/admin/admin-back-link";
import { AdminMembersNav } from "@/components/admin/admin-members-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreateMemberSection } from "@/components/admin/create-member-section";
import {
  AdminMembersWorkspace,
  type AdminApplicationRow,
  type AdminMemberRow,
} from "@/components/admin/admin-members-workspace.client";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { batchMemberContributionStatus } from "@/lib/club/membership-contribution";
import { loadMemberBoardNotesMap } from "@/lib/members/board-notes";
import {
  resolveAppRegistrationStatus,
  type AppRegistrationStatus,
} from "@/lib/membership/app-registration";
import { adminVisibleEmail } from "@/lib/members/no-app-access";
import { isBrowseOnlyProfileId } from "@/lib/members/hidden";
import { requireAdmin } from "@/lib/admin/require-admin";

export const dynamic = "force-dynamic";

export default async function AdminMembersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const { supabase } = await requireAdmin();

  const inviteParam = sp.invite;
  const invite =
    typeof inviteParam === "string"
      ? inviteParam
      : Array.isArray(inviteParam)
        ? inviteParam[0] ?? null
        : null;

  async function loadMembers(): Promise<{
    members: AdminMemberRow[];
    membersError: string | null;
  }> {
    try {
      const admin = createSupabaseAdminClient();
      const [{ data: memberships, error: mErr }, { data: profiles, error: pErr }] =
        await Promise.all([
          admin
            .from("memberships")
            .select("user_id,status,start_date")
            .order("end_date", { ascending: false }),
          admin
            .from("profiles")
            .select(
              "id,membership_number,first_name,last_name,birthdate,email,warning_count,app_registration_status,last_app_active_at,app_registered_at,no_app_access,billing_email",
            )
            .order("membership_number", { ascending: true, nullsFirst: false }),
        ]);
      if (mErr) return { members: [], membersError: mErr.message };
      // Spalte ggf. noch nicht migriert → Fallback ohne Status-Felder
      type ProfileListRow = {
        id: string;
        membership_number: string | null;
        first_name: string;
        last_name: string;
        birthdate: string | null;
        email: string | null;
        warning_count?: number | null;
        app_registration_status?: string | null;
        last_app_active_at?: string | null;
        app_registered_at?: string | null;
        no_app_access?: boolean | null;
        billing_email?: string | null;
      };
      let profileRows: ProfileListRow[] = (profiles ?? []) as ProfileListRow[];
      if (pErr) {
        if (/no_app_access|billing_email|does not exist/i.test(pErr.message) && !/app_registration_status|app_registered_at/i.test(pErr.message)) {
          const { data: withoutNoApp, error: noAppErr } = await admin
            .from("profiles")
            .select(
              "id,membership_number,first_name,last_name,birthdate,email,warning_count,app_registration_status,last_app_active_at,app_registered_at",
            )
            .order("membership_number", { ascending: true, nullsFirst: false });
          if (!noAppErr) {
            profileRows = (withoutNoApp ?? []) as ProfileListRow[];
          } else if (/app_registration_status|app_registered_at|does not exist/i.test(noAppErr.message)) {
            // fall through to existing app_registration fallback by reusing noAppErr as pErr-like
            const { data: fallback, error: fbErr } = await admin
              .from("profiles")
              .select(
                "id,membership_number,first_name,last_name,birthdate,email,warning_count,last_app_active_at",
              )
              .order("membership_number", { ascending: true, nullsFirst: false });
            if (fbErr) {
              if (/last_app_active_at|does not exist/i.test(fbErr.message)) {
                const { data: minimal, error: minErr } = await admin
                  .from("profiles")
                  .select("id,membership_number,first_name,last_name,birthdate,email,warning_count")
                  .order("membership_number", { ascending: true, nullsFirst: false });
                if (minErr) return { members: [], membersError: minErr.message };
                profileRows = (minimal ?? []) as ProfileListRow[];
              } else {
                return { members: [], membersError: fbErr.message };
              }
            } else {
              profileRows = (fallback ?? []) as ProfileListRow[];
            }
          } else {
            return { members: [], membersError: noAppErr.message };
          }
        } else if (/app_registration_status|app_registered_at|does not exist/i.test(pErr.message)) {
          const { data: fallback, error: fbErr } = await admin
            .from("profiles")
            .select(
              "id,membership_number,first_name,last_name,birthdate,email,warning_count,last_app_active_at",
            )
            .order("membership_number", { ascending: true, nullsFirst: false });
          if (fbErr) {
            if (/last_app_active_at|does not exist/i.test(fbErr.message)) {
              const { data: minimal, error: minErr } = await admin
                .from("profiles")
                .select("id,membership_number,first_name,last_name,birthdate,email,warning_count")
                .order("membership_number", { ascending: true, nullsFirst: false });
              if (minErr) return { members: [], membersError: minErr.message };
              profileRows = (minimal ?? []) as ProfileListRow[];
            } else {
              return { members: [], membersError: fbErr.message };
            }
          } else {
            profileRows = (fallback ?? []) as ProfileListRow[];
          }
        } else {
          return { members: [], membersError: pErr.message };
        }
      }

      const membershipByUser = new Map<string, { status: string; start_date: string | null }>();
      (memberships ?? []).forEach((m) => {
        if (!membershipByUser.has(m.user_id)) {
          membershipByUser.set(m.user_id, {
            status: m.status,
            start_date: m.start_date ?? null,
          });
        }
      });

      const visibleProfileRows = profileRows.filter((p) => !isBrowseOnlyProfileId(p.id));

      const baseMembers = visibleProfileRows.map((p) => {
        const app_registration_status: AppRegistrationStatus = resolveAppRegistrationStatus({
          status: p.app_registration_status,
          registeredAt: p.app_registered_at,
          lastAppActiveAt: p.last_app_active_at,
        });
        return {
          id: p.id,
          membership_number: p.membership_number ?? null,
          first_name: p.first_name,
          last_name: p.last_name,
          birthdate: p.birthdate ?? null,
          joined_at: membershipByUser.get(p.id)?.start_date ?? null,
          warning_count: (p as { warning_count?: number }).warning_count ?? 0,
          membership_status: membershipByUser.get(p.id)?.status ?? null,
          email: adminVisibleEmail(p) ?? p.email ?? null,
          no_app_access: Boolean(p.no_app_access),
          app_registration_status,
        };
      });

      const contribByUser = await batchMemberContributionStatus(baseMembers.map((m) => m.id));
      const boardNotes = await loadMemberBoardNotesMap(
        admin,
        baseMembers.map((m) => m.id),
      ).catch(() => new Map<string, string>());

      return {
        members: baseMembers.map((m) => {
          const contrib = contribByUser.get(m.id);
          return {
            ...m,
            contribution_status: contrib?.status ?? null,
            contribution_open_cents: contrib?.openCents ?? null,
            board_note: boardNotes.get(m.id) ?? null,
          };
        }),
        membersError: null,
      };
    } catch (e) {
      return {
        members: [],
        membersError: e instanceof Error ? e.message : "Fehler beim Laden",
      };
    }
  }

  async function loadApplications(): Promise<{
    applications: AdminApplicationRow[];
    applicationsError: string | null;
  }> {
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
  }

  const [{ members, membersError }, { applications, applicationsError }] = await Promise.all([
    loadMembers(),
    loadApplications(),
  ]);

  return (
    <div className="min-h-screen">
      <Topbar
        title="Mitgliederverwaltung"
        subtitle="Admin: Mitglieder anlegen, aktivieren/deaktivieren, Einladungen."
      />
      <main className="px-4 py-6 lg:px-8">
        <AdminBackLink />
        <div className="mt-4">
          <AdminMembersNav active="members" />
        </div>

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
