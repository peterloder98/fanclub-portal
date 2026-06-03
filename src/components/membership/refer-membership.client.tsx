"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MembershipInviteEmailDialog } from "@/components/membership/membership-invite-email-dialog";
import { MEMBERSHIP_REFERRAL_POINTS } from "@/lib/points/award-membership-referral";
import Link from "next/link";

export function ReferMembershipClient() {
  const [dialogOpen, setDialogOpen] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  return (
    <>
      {message ? (
        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          {message}
        </div>
      ) : null}

      <Card className="border-blue-200/80 bg-gradient-to-br from-blue-50/80 via-white to-rose-50/40">
        <CardHeader>
          <CardTitle>Neues Mitglied werben</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm text-slate-600">
          <p>
            Lade jemanden per E-Mail zum digitalen Mitgliedsantrag ein. Die Mail geht von der
            offiziellen Fanclub-Adresse — du gibst nur Empfänger, Namen und kannst den Text bei
            Bedarf anpassen. Pro erfolgreicher Einladung an eine neue Adresse gibt es{" "}
            <span className="font-semibold text-emerald-700">+{MEMBERSHIP_REFERRAL_POINTS} Punkte</span>.
          </p>
          <p className="text-xs text-slate-500">
            <Link href="/punkte" className="font-medium text-blue-700 hover:underline">
              Alle Punkte-Regeln ansehen
            </Link>
          </p>
          <button
            type="button"
            onClick={() => setDialogOpen(true)}
            className="h-11 w-full max-w-xs rounded-xl bg-slate-900 text-sm font-semibold text-white shadow-sm"
          >
            Antrag per E-Mail senden
          </button>
        </CardContent>
      </Card>

      <MembershipInviteEmailDialog
        open={dialogOpen}
        variant="member"
        onClose={() => setDialogOpen(false)}
        onSent={(msg) => {
          setMessage(msg);
          setDialogOpen(false);
        }}
      />
    </>
  );
}
