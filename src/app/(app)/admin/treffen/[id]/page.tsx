import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { Topbar } from "@/components/app-shell/topbar";
import { AdminBackLink } from "@/components/admin/admin-back-link";
import { MeetingAdminParticipants } from "@/components/meetings/meeting-admin-participants.client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { loadMeetingParticipants } from "@/lib/meetings/load";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { formatEur } from "@/lib/club/ledger";

export default async function AdminTreffenDetailPage({
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
  if (me?.role !== "admin") redirect("/dashboard");

  const admin = createSupabaseAdminClient();
  const { data: meeting, error } = await admin
    .from("club_meetings")
    .select("id,title,starts_at,status,city,cost_cents,payment_deadline_days")
    .eq("id", id)
    .maybeSingle();

  if (error?.message.includes("club_meetings")) {
    return (
      <div className="min-h-screen p-6 text-sm text-amber-950">
        Bitte Migration 066 ausführen.
      </div>
    );
  }
  if (!meeting) notFound();

  let participants: Awaited<ReturnType<typeof loadMeetingParticipants>> = [];
  try {
    participants = await loadMeetingParticipants(admin, id);
  } catch {
    participants = [];
  }

  return (
    <div className="min-h-screen">
      <Topbar title={meeting.title} subtitle="Teilnehmer verwalten" />
      <main className="mx-auto max-w-3xl px-4 py-4 lg:px-6">
        <AdminBackLink href="/admin/treffen" label="Fanclub Treffen" />
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>{meeting.title}</CardTitle>
            <p className="text-sm text-[color:var(--muted)]">
              {new Date(meeting.starts_at).toLocaleString("de-DE")}
              {meeting.city ? ` · ${meeting.city}` : ""}
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <Badge variant={meeting.status === "published" ? "success" : "neutral"}>
                {meeting.status}
              </Badge>
              {meeting.cost_cents ? (
                <Badge variant="brand">{formatEur(meeting.cost_cents)} p. P.</Badge>
              ) : null}
              <Badge variant="neutral">
                Zahlungsfrist: {meeting.payment_deadline_days ?? 14} Tage
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3">
            <div className="flex flex-wrap gap-2">
              <Link
                href={`/treffen/${id}`}
                className="text-sm font-medium text-fc-blue hover:underline"
              >
                Öffentliche Seite
              </Link>
              <Link
                href="/admin/accounting"
                className="text-sm font-medium text-fc-blue hover:underline"
              >
                Buchhaltung
              </Link>
            </div>
            <MeetingAdminParticipants
              meetingId={id}
              participants={participants}
              paymentDeadlineDays={meeting.payment_deadline_days ?? 14}
            />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
