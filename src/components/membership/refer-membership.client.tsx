"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MembershipInviteEmailDialog } from "@/components/membership/membership-invite-email-dialog";
import { MEMBERSHIP_REFERRAL_POINTS } from "@/lib/points/award-membership-referral";
import { MEMBERSHIP_REFERRAL_COMPLETION_POINTS } from "@/lib/points/award-membership-referral-completed";
import { sendMemberReferralReminderAction } from "@/app/(app)/mitgliedschaft/einladen/actions";
import { referralReminderEligibility } from "@/lib/email/member-referral-reminder-template";
import {
  formatBerlinDateLong,
  formatBerlinDateTimeMedium,
} from "@/lib/datetime/berlin";

export type MemberReferralSendRow = {
  id: string;
  recipient_email: string;
  recipient_first_name: string | null;
  recipient_last_name: string | null;
  created_at: string;
  link_opened_at: string | null;
  approved_at: string | null;
  converted_application_id: string | null;
  last_reminder_at?: string | null;
  reminder_count?: number | null;
};

function formatWhen(iso: string) {
  return formatBerlinDateTimeMedium(iso);
}

function formatDay(iso: string) {
  return formatBerlinDateLong(iso);
}

function recipientName(s: MemberReferralSendRow) {
  const name = [s.recipient_first_name, s.recipient_last_name].filter(Boolean).join(" ").trim();
  return name || "—";
}

export function ReferMembershipClient({
  initialSends = [],
}: {
  initialSends?: MemberReferralSendRow[];
}) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const sends = initialSends;

  function sendReminder(sendId: string) {
    setError(null);
    setMessage(null);
    setBusyId(sendId);
    startTransition(async () => {
      try {
        await sendMemberReferralReminderAction(sendId);
        setMessage("Erinnerung wurde gesendet.");
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erinnerung fehlgeschlagen");
      } finally {
        setBusyId(null);
      }
    });
  }

  return (
    <>
      {message ? (
        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          {message}
        </div>
      ) : null}
      {error ? (
        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {error}
        </div>
      ) : null}

      <Card className="border-fc-sky/30/80 bg-gradient-to-br from-blue-50/80 via-white to-rose-50/40">
        <CardHeader>
          <CardTitle>Neues Mitglied einladen</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm text-slate-600">
          <p>
            Lade jemanden per E-Mail zum digitalen Mitgliedsantrag ein. Die Mail geht von der
            offiziellen Fanclub-Adresse — du gibst Empfänger und Namen an.
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
            <li className="text-slate-600">
              Erinnerung: erstmals nach 7 Tagen, danach alle 14 Tage möglich
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
            Neues Mitglied einladen
          </button>
        </CardContent>
      </Card>

      {sends.length > 0 ? (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Deine Einladungen</CardTitle>
            <p className="text-sm text-slate-600">
              E-Mail, Name und Zeitpunkt — bei offenen Einladungen kannst du nach 7 Tagen erinnern.
            </p>
          </CardHeader>
          <CardContent className="grid gap-2">
            {sends.map((s) => {
              const converted = Boolean(s.approved_at || s.converted_application_id);
              const eligibility = referralReminderEligibility({
                created_at: s.created_at,
                last_reminder_at: s.last_reminder_at ?? null,
                approved_at: s.approved_at ?? null,
                converted_application_id: s.converted_application_id ?? null,
              });
              return (
                <div
                  key={s.id}
                  className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-fc-ice bg-fc-ice/30 px-3 py-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-fc-navy">
                      {s.recipient_email}
                    </p>
                    <p className="truncate text-sm text-slate-700">{recipientName(s)}</p>
                    <p className="mt-1 text-xs text-slate-500">Eingeladen: {formatWhen(s.created_at)}</p>
                    {s.last_reminder_at ? (
                      <p className="text-xs text-slate-500">
                        Letzte Erinnerung: {formatWhen(s.last_reminder_at)}
                      </p>
                    ) : null}
                    {converted ? (
                      <p className="mt-1 text-xs font-medium text-emerald-700">Mitglied geworden</p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    {converted ? null : eligibility.canRemind ? (
                      <button
                        type="button"
                        disabled={pending && busyId === s.id}
                        onClick={() => sendReminder(s.id)}
                        className="h-9 rounded-xl bg-fc-navy px-3 text-xs font-semibold text-white disabled:opacity-50"
                      >
                        {busyId === s.id ? "Senden…" : "Erinnerung senden"}
                      </button>
                    ) : eligibility.nextAt ? (
                      <p className="max-w-[11rem] text-right text-[11px] leading-snug text-slate-500">
                        Erinnerung ab {formatDay(eligibility.nextAt)}
                      </p>
                    ) : null}
                  </div>
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
          window.setTimeout(() => window.location.reload(), 600);
        }}
      />
    </>
  );
}
