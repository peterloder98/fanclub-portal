"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { SignaturePad } from "@/components/profile/signature-pad";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CountrySelect } from "@/components/ui/country-select";
import { PostalCodeInput } from "@/components/ui/postal-code-input";
import {
  formatFullPhone,
  PhoneInput,
  PHONE_COUNTRIES,
} from "@/components/ui/phone-input";
import { DEFAULT_COUNTRY } from "@/lib/countries";
import { isValidPostalCode } from "@/lib/postal-code";
import {
  MEMBERSHIP_REFERRER_STORAGE_KEY,
  readReferrerIdFromSearchParams,
} from "@/lib/membership/referral-link";

const MEMBERSHIP_FEE_EUR = 15;

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error("Signatur konnte nicht gelesen werden"));
    r.readAsDataURL(blob);
  });
}

export function MembershipApplicationForm() {
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    birthdate: "",
    gender: "",
    street: "",
    postal_code: "",
    city: "",
    country: DEFAULT_COUNTRY.name,
    email: "",
    membership_start_date: "",
    account_holder: "",
    iban: "",
    bic: "",
    signed_at_place: "",
    signed_at_date: new Date().toISOString().slice(0, 10),
    privacy_accepted: false,
    statute_accepted: false,
    media_consent: false,
    whatsapp_opt_in: false,
  });
  const [mobileDial, setMobileDial] = useState(PHONE_COUNTRIES[0].dial);
  const [mobileNumber, setMobileNumber] = useState("");
  const [whatsappDial, setWhatsappDial] = useState(PHONE_COUNTRIES[0].dial);
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [whatsappTouched, setWhatsappTouched] = useState(false);
  const [countryCode, setCountryCode] = useState(DEFAULT_COUNTRY.code);
  const [signature, setSignature] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pdfDownloadUrl, setPdfDownloadUrl] = useState<string | null>(null);
  const [doneName, setDoneName] = useState<string | null>(null);
  const [emailWarning, setEmailWarning] = useState<string | null>(null);

  useEffect(() => {
    if (!form.whatsapp_opt_in || whatsappTouched) return;
    setWhatsappDial(mobileDial);
    setWhatsappNumber(mobileNumber);
  }, [form.whatsapp_opt_in, mobileDial, mobileNumber, whatsappTouched]);

  useEffect(() => {
    const fromUrl = readReferrerIdFromSearchParams(window.location.search);
    if (fromUrl) {
      try {
        sessionStorage.setItem(MEMBERSHIP_REFERRER_STORAGE_KEY, fromUrl);
      } catch {
        /* ignore */
      }
    }
  }, []);

  const mobileFull = formatFullPhone(mobileDial, mobileNumber);
  const whatsappFull = formatFullPhone(whatsappDial, whatsappNumber);

  const contractPreview = useMemo(() => {
    const name = `${form.first_name} ${form.last_name}`.trim() || "…";
    return (
      <div className="prose prose-sm max-w-none text-slate-800">
        <p>
          Hiermit beantrage ich, <strong>{name}</strong>, die Mitgliedschaft im offiziellen
          Anni-Perka-Fanclub e. V.
        </p>
        <p>
          Der Jahresbeitrag beträgt <strong>{MEMBERSHIP_FEE_EUR},00 EUR</strong> und wird gemäß
          Satzung erhoben.
        </p>
        <p>
          Ich bestätige, die{" "}
          <Link href="/documents/satzung.pdf" target="_blank" className="text-blue-600 hover:underline">
            Satzung (Anlage, Seiten 3–4 des Antragsformulars)
          </Link>{" "}
          vollständig gelesen zu haben, sie als Vertragsbestandteil anzuerkennen und die Angaben in
          diesem Antrag als vollständig und wahrheitsgemäß zu erklären.
        </p>
        <p>
          Meine Handynummer für die Mitgliederverwaltung:{" "}
          <strong>{mobileFull || "…"}</strong>
        </p>
        <p className="rounded-xl border bg-slate-50 px-3 py-2 text-slate-700">
          <strong>WhatsApp-Gruppe:</strong>{" "}
          {form.whatsapp_opt_in
            ? `Ich möchte in die WhatsApp-Gruppe des Fanclubs aufgenommen werden (Nummer: ${whatsappFull || "…"}).`
            : "Ich möchte nicht in die WhatsApp-Gruppe aufgenommen werden."}
        </p>
        <p className="text-slate-600">
          Mit meiner Unterschrift unten bestätige ich den gesamten Antrag inklusive Satzung,
          Datenschutz und – sofern gewählt – WhatsApp-Aufnahme. Ort/Datum:{" "}
          {form.signed_at_place || "…"},{" "}
          {form.signed_at_date
            ? new Date(form.signed_at_date).toLocaleDateString("de-DE")
            : "…"}
        </p>
      </div>
    );
  }, [form, mobileFull, whatsappFull]);

  async function submit() {
    setError(null);
    if (!isValidPostalCode(form.postal_code)) {
      setError("PLZ muss genau 5 Ziffern haben.");
      return;
    }
    if (!mobileNumber || mobileNumber.length < 5) {
      setError("Bitte eine gültige Handynummer eingeben (nur Ziffern, ohne führende 0).");
      return;
    }
    if (!form.privacy_accepted || !form.statute_accepted) {
      setError("Bitte Datenschutz und Satzung bestätigen.");
      return;
    }
    if (form.whatsapp_opt_in && (!whatsappNumber || whatsappNumber.length < 5)) {
      setError("Bitte die WhatsApp-Nummer angeben oder die Aufnahme abwählen.");
      return;
    }
    if (!signature) {
      setError("Bitte mit deiner Unterschrift den gesamten Antrag bestätigen.");
      return;
    }

    setBusy(true);
    try {
      let referrerUserId: string | undefined;
      try {
        const stored = sessionStorage.getItem(MEMBERSHIP_REFERRER_STORAGE_KEY);
        if (stored && /^[0-9a-f-]{36}$/i.test(stored)) referrerUserId = stored;
      } catch {
        /* ignore */
      }

      const res = await fetch("/api/membership/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          country_code: countryCode,
          phone: mobileFull,
          mobile_dial_code: mobileDial,
          mobile_number: mobileNumber,
          whatsapp_dial_code: form.whatsapp_opt_in ? whatsappDial : undefined,
          whatsapp_number: form.whatsapp_opt_in ? whatsappNumber : undefined,
          privacy_accepted: true,
          statute_accepted: true,
          signature_applicant: signature,
          referrer_user_id: referrerUserId,
        }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        error?: string;
        pdfDownloadUrl?: string;
        applicantName?: string;
        emailWarning?: string | null;
      };
      if (!res.ok || !json.ok) {
        throw new Error(typeof json.error === "string" ? json.error : "Antrag fehlgeschlagen");
      }
      setPdfDownloadUrl(json.pdfDownloadUrl ?? null);
      setDoneName(json.applicantName ?? null);
      setEmailWarning(json.emailWarning ?? null);
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Antrag fehlgeschlagen");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Antrag eingegangen</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm text-slate-700">
          <p>
            Vielen Dank{doneName ? `, ${doneName.split(" ")[0]}` : ""}! Dein Antrag ist bei uns
            eingegangen. Du erhältst in Kürze eine Bestätigungs-E-Mail mit deinem Antrag und der
            Satzung als PDF-Anhang. Der Vorstand wurde ebenfalls benachrichtigt.
          </p>
          {emailWarning ? (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900">
              Hinweis: {emailWarning}
            </p>
          ) : null}
          {pdfDownloadUrl ? (
            <a
              href={pdfDownloadUrl}
              download
              className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-slate-900 text-sm font-semibold text-white"
            >
              Antrag inkl. Satzung als PDF herunterladen
            </a>
          ) : null}
          <p className="text-xs text-slate-500">
            Falls keine E-Mail ankommt, prüfe den Spam-Ordner oder lade das PDF hier herunter.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-6">
      <div className="rounded-2xl border bg-blue-50 px-4 py-3 text-sm text-blue-950">
        <strong>Hinweis:</strong> Seiten 1–2 des PDF-Antrags füllst du hier online aus. Die Satzung
        (PDF-Seiten 3–4) ist als{" "}
        <Link href="/documents/satzung.pdf" target="_blank" className="font-medium underline">
          separate Anlage
        </Link>{" "}
        verpflichtend zu lesen und anzuerkennen. Jahresbeitrag:{" "}
        <strong>{MEMBERSHIP_FEE_EUR},00 EUR</strong>.
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Persönliche Daten</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1">
            <span className="text-sm font-medium text-slate-700">Vorname *</span>
            <input
              required
              value={form.first_name}
              onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))}
              className="h-11 rounded-xl border bg-white px-3 text-sm outline-none focus:ring-4 focus:ring-[color:var(--ring)]"
            />
          </label>
          <label className="grid gap-1">
            <span className="text-sm font-medium text-slate-700">Nachname *</span>
            <input
              required
              value={form.last_name}
              onChange={(e) => setForm((f) => ({ ...f, last_name: e.target.value }))}
              className="h-11 rounded-xl border bg-white px-3 text-sm outline-none focus:ring-4 focus:ring-[color:var(--ring)]"
            />
          </label>
          <label className="grid gap-1">
            <span className="text-sm font-medium text-slate-700">Geburtsdatum *</span>
            <input
              type="date"
              required
              value={form.birthdate}
              onChange={(e) => setForm((f) => ({ ...f, birthdate: e.target.value }))}
              className="h-11 rounded-xl border bg-white px-3 text-sm outline-none focus:ring-4 focus:ring-[color:var(--ring)]"
            />
          </label>
          <label className="grid gap-1">
            <span className="text-sm font-medium text-slate-700">Geschlecht (optional)</span>
            <input
              value={form.gender}
              onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value }))}
              className="h-11 rounded-xl border bg-white px-3 text-sm outline-none focus:ring-4 focus:ring-[color:var(--ring)]"
            />
          </label>
          <label className="grid gap-1 sm:col-span-2">
            <span className="text-sm font-medium text-slate-700">Straße *</span>
            <input
              required
              value={form.street}
              onChange={(e) => setForm((f) => ({ ...f, street: e.target.value }))}
              className="h-11 rounded-xl border bg-white px-3 text-sm outline-none focus:ring-4 focus:ring-[color:var(--ring)]"
            />
          </label>
          <PostalCodeInput
            label="PLZ"
            required
            value={form.postal_code}
            onChange={(postal_code) => setForm((f) => ({ ...f, postal_code }))}
          />
          <label className="grid gap-1">
            <span className="text-sm font-medium text-slate-700">Ort *</span>
            <input
              required
              value={form.city}
              onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
              className="h-11 rounded-xl border bg-white px-3 text-sm outline-none focus:ring-4 focus:ring-[color:var(--ring)]"
            />
          </label>
          <CountrySelect
            label="Land"
            required
            valueCode={countryCode}
            onChange={(c) => {
              setCountryCode(c.code);
              setForm((f) => ({ ...f, country: c.name }));
            }}
          />
          <PhoneInput
            label="Handynr."
            required
            dial={mobileDial}
            number={mobileNumber}
            onDialChange={setMobileDial}
            onNumberChange={setMobileNumber}
          />
          <label className="grid gap-1 sm:col-span-2">
            <span className="text-sm font-medium text-slate-700">E-Mail *</span>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className="h-11 rounded-xl border bg-white px-3 text-sm outline-none focus:ring-4 focus:ring-[color:var(--ring)]"
            />
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Mitgliedschaft & Bankverbindung (optional)</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <p className="sm:col-span-2 rounded-xl border bg-slate-50 px-3 py-2 text-sm text-slate-800">
            Jahresbeitrag: <strong>{MEMBERSHIP_FEE_EUR},00 EUR</strong> (fest)
          </p>
          <label className="grid gap-1 sm:col-span-2">
            <span className="text-sm font-medium text-slate-700">Gewünschter Beginn</span>
            <input
              type="date"
              value={form.membership_start_date}
              onChange={(e) => setForm((f) => ({ ...f, membership_start_date: e.target.value }))}
              className="h-11 rounded-xl border bg-white px-3 text-sm outline-none"
            />
          </label>
          <label className="grid gap-1 sm:col-span-2">
            <span className="text-sm font-medium text-slate-700">Kontoinhaber</span>
            <input
              value={form.account_holder}
              onChange={(e) => setForm((f) => ({ ...f, account_holder: e.target.value }))}
              className="h-11 rounded-xl border bg-white px-3 text-sm outline-none"
            />
          </label>
          <label className="grid gap-1">
            <span className="text-sm font-medium text-slate-700">IBAN</span>
            <input
              value={form.iban}
              onChange={(e) => setForm((f) => ({ ...f, iban: e.target.value }))}
              className="h-11 rounded-xl border bg-white px-3 text-sm outline-none"
            />
          </label>
          <label className="grid gap-1">
            <span className="text-sm font-medium text-slate-700">BIC</span>
            <input
              value={form.bic}
              onChange={(e) => setForm((f) => ({ ...f, bic: e.target.value }))}
              className="h-11 rounded-xl border bg-white px-3 text-sm outline-none"
            />
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Antrag / Vertrag (Vorschau)</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          {contractPreview}

          <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-4">
            <label className="flex items-start gap-2 text-sm text-slate-800">
              <input
                type="checkbox"
                checked={form.whatsapp_opt_in}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setForm((f) => ({ ...f, whatsapp_opt_in: checked }));
                  if (checked && !whatsappTouched) {
                    setWhatsappDial(mobileDial);
                    setWhatsappNumber(mobileNumber);
                  }
                }}
                className="mt-1 h-4 w-4 rounded border"
              />
              <span>
                Ich möchte in die WhatsApp-Gruppe des Fanclubs aufgenommen werden und bestätige
                dies ausdrücklich im Rahmen dieses Antrags. *
              </span>
            </label>
            {form.whatsapp_opt_in ? (
              <div className="mt-3">
                <PhoneInput
                  label="WhatsApp-Nummer"
                  required
                  dial={whatsappDial}
                  number={whatsappNumber}
                  onDialChange={(d) => {
                    setWhatsappTouched(true);
                    setWhatsappDial(d);
                  }}
                  onNumberChange={(n) => {
                    setWhatsappTouched(true);
                    setWhatsappNumber(n);
                  }}
                />
                <p className="mt-1 text-xs text-slate-600">
                  Vorausgefüllt mit deiner Handynummer – du kannst sie hier anpassen.
                </p>
              </div>
            ) : null}
          </div>

          <label className="flex items-start gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.statute_accepted}
              onChange={(e) => setForm((f) => ({ ...f, statute_accepted: e.target.checked }))}
              className="mt-1 h-4 w-4 rounded border"
            />
            <span>
              Ich habe die{" "}
              <Link href="/documents/satzung.pdf" target="_blank" className="text-blue-600 hover:underline">
                Satzung (Anlage)
              </Link>{" "}
              vollständig gelesen und akzeptiere sie als Vertragsbestandteil. *
            </span>
          </label>
          <label className="flex items-start gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.privacy_accepted}
              onChange={(e) => setForm((f) => ({ ...f, privacy_accepted: e.target.checked }))}
              className="mt-1 h-4 w-4 rounded border"
            />
            <span>Ich willige in die Verarbeitung meiner Daten zum Zweck der Mitgliedschaft ein. *</span>
          </label>
          <label className="flex items-start gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.media_consent}
              onChange={(e) => setForm((f) => ({ ...f, media_consent: e.target.checked }))}
              className="mt-1 h-4 w-4 rounded border"
            />
            <span>
              Optional: Fotos/Beiträge im Fanclub-Portal und bei Events dürfen veröffentlicht werden.
            </span>
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Unterschrift (bestätigt den gesamten Antrag)</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1">
              <span className="text-sm font-medium text-slate-700">Ort *</span>
              <input
                required
                value={form.signed_at_place}
                onChange={(e) => setForm((f) => ({ ...f, signed_at_place: e.target.value }))}
                className="h-11 rounded-xl border bg-white px-3 text-sm outline-none"
              />
            </label>
            <label className="grid gap-1">
              <span className="text-sm font-medium text-slate-700">Datum *</span>
              <input
                type="date"
                required
                value={form.signed_at_date}
                onChange={(e) => setForm((f) => ({ ...f, signed_at_date: e.target.value }))}
                className="h-11 rounded-xl border bg-white px-3 text-sm outline-none"
              />
            </label>
          </div>

          {signature ? (
            <p className="text-xs text-emerald-700">Unterschrift gespeichert.</p>
          ) : null}
          <SignaturePad
            disabled={busy}
            onSave={async (blob) => {
              setSignature(await blobToDataUrl(blob));
            }}
          />
        </CardContent>
      </Card>

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {error}
        </div>
      ) : null}

      <button
        type="button"
        disabled={busy}
        onClick={() => void submit()}
        className="h-12 w-full rounded-xl bg-slate-900 text-sm font-semibold text-white shadow-sm disabled:opacity-60"
      >
        {busy ? "Wird gesendet…" : "Antrag verbindlich absenden"}
      </button>
    </div>
  );
}
