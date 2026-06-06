"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { approveMembershipApplication } from "@/app/(app)/admin/members/applications/actions";
import { MembershipPdfPanel } from "@/components/admin/membership-pdf-panel";
import { PAYMENT_STATUS_LABELS } from "@/lib/payments/labels";
import type { PaymentStatus } from "@/lib/payments/types";

function formatDE(date: string | null) {
  if (!date) return "—";
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const [y, m, d] = date.split("-");
    return `${d}.${m}.${y}`;
  }
  const x = new Date(date);
  return Number.isNaN(x.getTime()) ? date : x.toLocaleDateString("de-DE");
}

export type ApplicationDetailData = {
  id: string;
  status: string;
  user_id: string | null;
  first_name: string;
  last_name: string;
  birthdate: string;
  gender: string | null;
  street: string;
  postal_code: string;
  city: string;
  country: string;
  country_code: string | null;
  phone: string;
  mobile_dial_code: string | null;
  mobile_number: string | null;
  email: string;
  membership_start_date: string | null;
  account_holder: string | null;
  iban: string | null;
  bic: string | null;
  whatsapp_opt_in: boolean;
  whatsapp_dial_code: string | null;
  whatsapp_number: string | null;
  instagram: string | null;
  facebook: string | null;
  fee_cents: number | null;
  media_consent: boolean;
  signed_at_place: string;
  signed_at_date: string;
  created_at: string;
  membership_status: string | null;
  membership_status_label: string;
  payment_status: PaymentStatus | null;
  payment_status_label: string | null;
  payment_reference: string | null;
  payment_method_label: string | null;
};

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-0.5 border-b border-slate-100 py-2 sm:grid-cols-[9rem_1fr]">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      <span className="text-sm text-slate-800">{value || "—"}</span>
    </div>
  );
}

export function ApplicationDetailPanels({
  app,
  showApprovedBanner,
}: {
  app: ApplicationDetailData;
  showApprovedBanner?: boolean;
}) {
  const paymentPaid = app.payment_status === "paid";
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canApprove =
    Boolean(app.user_id) &&
    (app.membership_status === "applied" || app.status === "submitted");

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {showApprovedBanner ? (
        <div className="xl:col-span-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          Mitgliedschaft wurde freigeschaltet. Einladungs-E-Mail wurde versendet (sofern SMTP
          konfiguriert).
        </div>
      ) : null}
      {error ? (
        <div className="xl:col-span-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {error}
        </div>
      ) : null}

      {canApprove ? (
        <div
          className={`xl:col-span-2 rounded-xl border px-3 py-3 text-sm ${
            paymentPaid
              ? "border-emerald-200 bg-emerald-50 text-emerald-950"
              : app.payment_status
                ? "border-amber-200 bg-amber-50 text-amber-950"
                : "border-slate-200 bg-slate-50 text-slate-800"
          }`}
        >
          <p className="font-semibold">Zahlung Mitgliedsbeitrag</p>
          {app.payment_status ? (
            <p className="mt-1">
              Status: <strong>{app.payment_status_label}</strong>
              {app.payment_method_label ? ` · ${app.payment_method_label}` : null}
              {app.payment_reference ? (
                <>
                  {" "}
                  · Verwendungszweck:{" "}
                  <span className="font-mono text-xs">{app.payment_reference}</span>
                </>
              ) : null}
            </p>
          ) : (
            <p className="mt-1">Noch keine Online-Zahlung angelegt.</p>
          )}
          {!paymentPaid ? (
            <p className="mt-2 text-xs">
              Bitte Zahlung unter{" "}
              <Link href="/admin/payments" className="font-semibold text-fc-blue hover:underline">
                Admin → Zahlungen
              </Link>{" "}
              manuell bestätigen, bevor die Mitgliedschaft freigeschaltet wird.
            </p>
          ) : (
            <p className="mt-2 text-xs">Zahlung bestätigt — Mitgliedschaft kann freigeschaltet werden.</p>
          )}
        </div>
      ) : null}

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 pb-2">
          <CardTitle className="text-base">Antragsdaten</CardTitle>
          <div className="flex flex-wrap gap-1">
            <Badge variant="neutral">Antrag: {app.status}</Badge>
            {app.membership_status ? (
              <Badge variant={app.membership_status === "applied" ? "warning" : "success"}>
                {app.membership_status_label}
              </Badge>
            ) : (
              <Badge variant="warning">Kein Benutzerkonto</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Field label="Vorname" value={app.first_name} />
          <Field label="Nachname" value={app.last_name} />
          <Field label="Geburtsdatum" value={formatDE(app.birthdate)} />
          <Field label="Geschlecht" value={app.gender ?? "—"} />
          <Field label="Straße" value={app.street} />
          <Field label="PLZ" value={app.postal_code} />
          <Field label="Ort" value={app.city} />
          <Field label="Land" value={app.country} />
          <Field label="E-Mail" value={app.email} />
          <Field label="Telefon" value={app.phone} />
          <Field
            label="Handynr."
            value={
              app.mobile_number
                ? `${app.mobile_dial_code ?? ""}${app.mobile_number}`
                : "—"
            }
          />
          <Field
            label="WhatsApp"
            value={
              app.whatsapp_opt_in
                ? `Ja — ${app.whatsapp_dial_code ?? ""}${app.whatsapp_number ?? ""}`
                : "Nein"
            }
          />
          <Field label="Instagram" value={app.instagram ?? "—"} />
          <Field label="Facebook" value={app.facebook ?? "—"} />
          <Field
            label="Beitrag"
            value={`${((app.fee_cents ?? 1500) / 100).toFixed(2)} EUR`}
          />
          <Field
            label="Mitgliedschaft ab"
            value={formatDE(app.membership_start_date)}
          />
          <Field label="Kontoinhaber" value={app.account_holder ?? "—"} />
          <Field label="IBAN" value={app.iban ?? "—"} />
          <Field label="BIC" value={app.bic ?? "—"} />
          <Field label="Foto/Film Einwilligung" value={app.media_consent ? "Ja" : "Nein"} />
          <Field
            label="Unterschrift"
            value={`${app.signed_at_place}, ${formatDE(app.signed_at_date)}`}
          />
          <Field label="Eingegangen" value={formatDE(app.created_at)} />

          {canApprove ? (
            <form
              className="mt-4"
              action={async () => {
                setBusy(true);
                setError(null);
                try {
                  await approveMembershipApplication(app.id);
                } catch (e) {
                  setError(e instanceof Error ? e.message : "Freischaltung fehlgeschlagen");
                  setBusy(false);
                }
              }}
            >
              <button
                type="submit"
                disabled={busy}
                className="h-11 w-full rounded-xl bg-emerald-600 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60"
              >
                {busy ? "Wird freigeschaltet…" : "Mitgliedschaft aktiv freischalten"}
              </button>
              <p className="mt-2 text-xs text-slate-500">
                Setzt Status auf aktiv und sendet die Einladungs-E-Mail mit App-Link. Empfohlen erst
                nach bestätigter Zahlung.
              </p>
            </form>
          ) : null}
        </CardContent>
      </Card>

      <MembershipPdfPanel applicationId={app.id} />
    </div>
  );
}
