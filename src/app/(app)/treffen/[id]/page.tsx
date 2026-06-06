import Link from "next/link";
import { MapPin } from "lucide-react";
import { Topbar } from "@/components/app-shell/topbar";
import { MeetingParticipateButton } from "@/components/meetings/meeting-participate-button";
import { MeetingTravelSection } from "@/components/meetings/meeting-travel-section";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatEventCity } from "@/lib/events/format";
import type { EventTravelInfo } from "@/lib/events/travel-info";
import { loadMeetingById } from "@/lib/meetings/load";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";

function formatCost(costCents: number | null, costLabel: string | null) {
  if (costLabel?.trim()) return costLabel.trim();
  if (costCents != null && costCents > 0) {
    return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(
      costCents / 100,
    );
  }
  return null;
}

export default async function TreffenDetailPage({
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

  const meeting = await loadMeetingById(supabase, id, user.id);
  if (!meeting) notFound();
  const chargeStatus = meeting.chargeStatus ?? null;
  const chargeCents = meeting.chargeCents ?? null;
  const paymentDueAt = meeting.paymentDueAt ?? null;
  const paymentDeadlineDays = meeting.payment_deadline_days ?? 14;

  const when = new Date(meeting.starts_at).toLocaleString("de-DE", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const locationLine = [
    meeting.venue,
    meeting.address,
    [meeting.postal_code, meeting.city].filter(Boolean).join(" "),
    formatEventCity({ city: meeting.city, country: meeting.country }),
  ]
    .filter(Boolean)
    .join(" · ");
  const cost = formatCost(meeting.cost_cents, meeting.cost_label);
  const isPast = new Date(meeting.starts_at).getTime() < Date.now();
  const travel = meeting.travel_info as EventTravelInfo;

  return (
    <div className="min-h-screen">
      <Topbar title={meeting.title} subtitle="Fanclub Treffen" />
      <main className="mx-auto max-w-3xl px-4 py-4 lg:px-6">
        <Link
          href="/mitglieder?tab=treffen"
          className="text-sm font-medium text-fc-blue hover:underline"
        >
          ← Mitglieder & Treffen
        </Link>

        <article className="mt-4 grid gap-4">
          <header className="grid gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {meeting.joined ? <Badge variant="success">Du nimmst teil</Badge> : null}
              {isPast ? <Badge variant="neutral">Vergangen</Badge> : null}
              {cost ? <Badge variant="brand">{cost}</Badge> : null}
              {meeting.cost_cents ? (
                <Badge variant="neutral">Zahlung innerhalb {paymentDeadlineDays} Tagen</Badge>
              ) : null}
            </div>
            <h1 className="text-2xl font-bold leading-snug text-fc-navy">{meeting.title}</h1>
            {meeting.summary ? (
              <p className="text-base leading-relaxed text-[color:var(--muted)]">{meeting.summary}</p>
            ) : null}
            <div className="rounded-2xl border border-fc-ice bg-white p-4 shadow-sm">
              <p className="text-sm font-semibold text-fc-navy">{when}</p>
              {locationLine ? (
                <p className="mt-2 inline-flex items-start gap-2 text-sm text-[color:var(--muted)]">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-fc-sky" aria-hidden />
                  <span>{locationLine}</span>
                </p>
              ) : null}
              <p className="mt-2 text-xs text-fc-sky">
                {meeting.participantCount} Mitglied{meeting.participantCount === 1 ? "" : "er"}{" "}
                nehmen teil
              </p>
            </div>
            {!isPast ? (
              <>
                <MeetingParticipateButton meetingId={meeting.id} joined={meeting.joined} />
                {meeting.joined && chargeStatus === "open" && chargeCents ? (
                  <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
                    Offener Kostenbeitrag:{" "}
                    <strong>{formatCost(chargeCents, null)}</strong> — bitte bis{" "}
                    <strong>
                      {paymentDueAt
                        ? new Date(paymentDueAt).toLocaleDateString("de-DE", {
                            day: "2-digit",
                            month: "long",
                            year: "numeric",
                          })
                        : `${paymentDeadlineDays} Tagen nach Anmeldung`}
                    </strong>{" "}
                    an den Fanclub überweisen. Ohne Zahlung kann die Anmeldung zurückgenommen
                    werden.
                  </p>
                ) : null}
                {meeting.joined && chargeStatus === "paid" ? (
                  <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
                    Kostenbeitrag wurde verbucht. Danke!
                  </p>
                ) : null}
              </>
            ) : null}
          </header>

          {meeting.body ? (
            <Card>
              <CardContent className="p-5">
                <h2 className="text-sm font-semibold text-fc-navy">Details</h2>
                <div className="prose prose-sm mt-3 max-w-none whitespace-pre-wrap text-[color:var(--muted)]">
                  {meeting.body}
                </div>
              </CardContent>
            </Card>
          ) : null}

          {meeting.schedule ? (
            <Card>
              <CardContent className="p-5">
                <h2 className="text-sm font-semibold text-fc-navy">Ablauf & Plan</h2>
                <div className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-[color:var(--muted)]">
                  {meeting.schedule}
                </div>
              </CardContent>
            </Card>
          ) : null}

          <MeetingTravelSection travel={travel} />

          {isPast ? (
            <Card className="border-dashed border-fc-sky/30 bg-fc-ice/30">
              <CardContent className="p-5 text-sm text-[color:var(--muted)]">
                <strong className="text-fc-navy">Nach dem Treffen:</strong> Fotos und ein
                Nachbericht können hier ergänzt werden — Upload folgt in einer der nächsten
                Ausbaustufen.
              </CardContent>
            </Card>
          ) : null}
        </article>
      </main>
    </div>
  );
}
