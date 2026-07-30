"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MembershipInviteEmailDialog } from "@/components/membership/membership-invite-email-dialog";
import { MEMBERSHIP_REFERRAL_POINTS } from "@/lib/points/award-membership-referral";
import { MEMBERSHIP_REFERRAL_COMPLETION_POINTS } from "@/lib/points/award-membership-referral-completed";

export type MemberReferralSendRow = {
  id: string;
  recipient_email: string;
  recipient_first_name: string | null;
  recipient_last_name: string | null;
  created_at: string;
  link_opened_at: string | null;
  approved_at: string | null;
  converted_application_id: string | null;
};

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString("de-DE", { dateStyle: "medium", timeStyle: "short" });
}

function recipientLabel(s: MemberReferralSendRow) {
  const name = [s.recipient_first_name, s.recipient_last_name].filter(Boolean).join(" ").trim();
  return name || s.recipient_email;
}

function statusOf(s: MemberReferralSendRow): { label: string; className: string } {
  if (s.approved_at || s.converted_application_id) {
    return { label: "Mitglied geworden", className: "bg-emerald-50 text-emerald-800" };
  }
  if (s.link_opened_at) {
    return { label: "Link geöffnet", className: "bg-sky-50 text-sky-800" };
  }
  return { label: "Einladung gesendet", className: "bg-slate-100 text-slate-700" };
}

export function ReferMembershipClient({
  initialSends = [],
}: {
  initialSends?: MemberReferralSendRow[];
}) {
  const [dialogOpen, setDialogOpen] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const sends = initialSends;

  return (
    <>
      {message ? (
        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          {message}
        </div>
      ) : null}

      <Card className="border-fc-sky/30/80 bg-gradient-to-br from-blue-50/80 via-white to-rose-50/40">
        <CardHeader>
          <CardTitle>Neues Mitglied werben</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm text-slate-600">
          <p>
            Lade jemanden per E-Mail zum digitalen Mitgliedsantrag ein. Die Mail geht von der
            offiziellen Fanclub-Adresse — du gibst nur Empfänger, Namen und kannst den Text bei
            Bedarf anpassen.
          </p>
          <ul className="list-inside list-disc space-y-1 text-slate-700">
            <li>
              <span className="font-semibold text-emerald-700">+{MEMBERSHIP_REFERRAL_POINTS} Punkte</span>{" "}
              pro neuer Empfänger-Adresse beim Versand (einmalig)
            </li>
            <li>
              <span className="font-semibold text-emerald-700">
                +{MEMBERSHIP_REFERRAL_COMPLETION_POINTS} Punkte
              </span>{" "}
              wenn die Person den Antrag digital einreicht und später vom Vorstand freigeschaltet wird
            </li>
            <li className="text-slate-600">
              Max. 3 Einladungen pro Tag, 10 pro Woche — dieselbe E-Mail erst nach 14 Tagen erneut
            </li>
          </ul>
          <p className="text-xs text-slate-500">
            Nach digitaler Antragstellung informieren wir dich kurz per E-Mail.
          </p>
          <p className="text-xs text-slate-500">
            <Link href="/punkte" className="font-medium text-fc-blue hover:underline">
              Alle Punkte-Regeln ansehen
            </Link>
          </p>
          <button
            type="button"
            onClick={() => setDialogOpen(true)}
            className="h-11 w-full max-w-xs rounded-xl bg-fc-navy text-sm font-semibold text-white shadow-sm"
          >
            Antrag per E-Mail senden
          </button>
        </CardContent>
      </Card>

      {sends.length > 0 ? (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Deine Einladungen</CardTitle>
            <p className="text-sm text-slate-600">
              Status deiner verschickten Einladungen — wann gesendet, ob der Link geöffnet wurde und
              ob daraus eine Mitgliedschaft wurde.
            </p>
          </CardHeader>
          <CardContent className="grid gap-2">
            {sends.map((s) => {
              const st = statusOf(s);
              return (
                <div
                  key={s.id}
                  className="flex flex-wrap items-start justify-between gap-2 rounded-xl border border-fc-ice bg-fc-ice/30 px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-fc-navy">{recipientLabel(s)}</p>
                    <p className="truncate text-xs text-slate-500">{s.recipient_email}</p>
                    <p className="mt-1 text-xs text-slate-500">Gesendet: {formatWhen(s.created_at)}</p>
                    {s.link_opened_at ? (
                      <p className="text-xs text-slate-500">
                        Link geöffnet: {formatWhen(s.link_opened_at)}
                      </p>
                    ) : null}
                    {s.approved_at ? (
                      <p className="text-xs text-emerald-700">
                        Freigabe: {formatWhen(s.approved_at)}
                      </p>
                    ) : null}
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${st.className}`}
                  >
                    {st.label}
                  </span>
                </div>
              );
            })}
          </CardContent>
        </Card>
      ) : null}

      <MembershipInviteEmailDialog
        open={dialogOpen}
        variant="member"
        onClose={() => setDialogOpen(false)}
        onSent={(msg) => {
          setMessage(msg);
          setDialogOpen(false);
          // Liste nach Reload aktualisieren
          window.setTimeout(() => window.location.reload(), 600);
        }}
      />
    </>
  );
}
