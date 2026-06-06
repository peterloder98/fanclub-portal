"use client";

type SendRow = {
  id: string;
  recipient_email: string;
  created_at: string;
  link_opened_at: string | null;
  approved_at: string | null;
  sender: { first_name: string | null; last_name: string | null; email: string | null } | null;
};

type ConversionRow = {
  id: string;
  approved_at: string;
  stars_awarded: number;
  referrer: { first_name: string | null; last_name: string | null } | null;
  referred: { first_name: string | null; last_name: string | null; email: string | null } | null;
};

function nameOf(p: { first_name: string | null; last_name: string | null } | null) {
  if (!p) return "—";
  return [p.first_name, p.last_name].filter(Boolean).join(" ").trim() || "—";
}

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString("de-DE", { dateStyle: "medium", timeStyle: "short" });
}

export function ReferralsAdminPanel({
  sends,
  conversions,
}: {
  sends: SendRow[];
  conversions: ConversionRow[];
}) {
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border bg-white p-4 shadow-sm">
        <h2 className="text-base font-semibold text-fc-navy">Versendete Empfehlungen</h2>
        <p className="mt-1 text-sm text-slate-600">
          Wer hat wann wen per E-Mail eingeladen — inkl. Öffnung und Freigabe, sofern erfasst.
        </p>
        {sends.length ? (
          <ul className="mt-4 divide-y text-sm">
            {sends.map((s) => (
              <li key={s.id} className="grid gap-1 py-3 sm:grid-cols-[1fr_auto]">
                <div>
                  <div className="font-medium text-fc-navy">
                    {nameOf(s.sender)} → {s.recipient_email}
                  </div>
                  <div className="text-xs text-slate-500">Gesendet: {formatWhen(s.created_at)}</div>
                </div>
                <div className="text-xs text-slate-600 sm:text-right">
                  {s.link_opened_at ? `Geöffnet: ${formatWhen(s.link_opened_at)}` : "Noch nicht geöffnet"}
                  {s.approved_at ? ` · Freigabe: ${formatWhen(s.approved_at)}` : null}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-slate-500">Noch keine Empfehlungen erfasst.</p>
        )}
      </section>

      <section className="rounded-2xl border bg-white p-4 shadow-sm">
        <h2 className="text-base font-semibold text-fc-navy">Erfolgreich geworbene Mitglieder</h2>
        {conversions.length ? (
          <ul className="mt-4 divide-y text-sm">
            {conversions.map((c) => (
              <li key={c.id} className="py-3">
                <div className="font-medium text-fc-navy">
                  {nameOf(c.referrer)} hat {nameOf(c.referred)} geworben
                </div>
                <div className="text-xs text-slate-500">
                  {c.referred?.email} · {formatWhen(c.approved_at)} · +{c.stars_awarded} ★
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-slate-500">
            Noch keine abgeschlossenen Werbungen in referral_conversions — Tabelle wird bei Freigabe
            befüllt (Phase 3).
          </p>
        )}
      </section>
    </div>
  );
}
