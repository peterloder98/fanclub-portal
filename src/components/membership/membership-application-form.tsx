"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { HeartHandshake } from "lucide-react";
import { SignaturePad } from "@/components/profile/signature-pad";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { BirthdateSegmentInput } from "@/components/ui/birthdate-segment-input";
import { GenderSelect } from "@/components/ui/gender-select";
import { normalizeGender } from "@/lib/person/gender";
import { ApplicationPaymentCheckout } from "@/components/payments/application-payment-checkout";

const MEMBERSHIP_FEE_EUR = 15;
const SATZUNG_PDF = "/documents/satzung.pdf";

function SatzungDownloadLink({ children }: { children: ReactNode }) {
  return (
    <a
      href={SATZUNG_PDF}
      download="Satzung-Anni-Perka-Fanclub.pdf"
      className="font-semibold text-fc-blue underline decoration-fc-blue/30 underline-offset-2 hover:decoration-fc-blue"
    >
      {children}
    </a>
  );
}

function LiveValue({ value, placeholder }: { value: string; placeholder: string }) {
  return value ? (
    <strong className="font-semibold text-fc-navy">{value}</strong>
  ) : (
    <span className="italic text-slate-400">{placeholder}</span>
  );
}

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
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [paymentToken, setPaymentToken] = useState<string | null>(null);
  const [feeCents, setFeeCents] = useState(MEMBERSHIP_FEE_EUR * 100);

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

  const displayName = useMemo(
    () => `${form.first_name} ${form.last_name}`.trim(),
    [form.first_name, form.last_name],
  );

  const contractPreview = useMemo(
    () => (
      <div className="space-y-4 rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50/80 p-5 text-sm leading-relaxed text-slate-800">
        <p>
          Hiermit beantrage ich, <LiveValue value={displayName} placeholder="Vorname Nachname" />,
          die Mitgliedschaft im offiziellen Anni-Perka-Fanclub e.&nbsp;V.
        </p>
        <p>
          Der Jahresbeitrag beträgt <strong>{MEMBERSHIP_FEE_EUR},00&nbsp;EUR</strong> und wird gemäß
          Satzung erhoben. Die <strong>Mitgliedsnummer</strong> wird nach Freigabe durch den Vorstand
          vergeben.
        </p>
        <p>
          Ich bestätige, die{" "}
          <SatzungDownloadLink>Satzung des Anni Perka Fanclubs</SatzungDownloadLink> vollständig
          gelesen zu haben, sie als Vertragsbestandteil anzuerkennen und die Angaben in diesem Antrag
          als vollständig und wahrheitsgemäß zu erklären.
        </p>
        <p>
          Meine Handynummer für die Mitgliederverwaltung:{" "}
          <LiveValue value={mobileFull} placeholder="aus dem Formular oben" />
        </p>
      </div>
    ),
    [displayName, mobileFull],
  );

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
    if (!form.birthdate || !/^\d{4}-\d{2}-\d{2}$/.test(form.birthdate)) {
      setError("Bitte ein vollständiges Geburtsdatum (TT.MM.JJJJ) eingeben.");
      return;
    }
    if (!form.gender || !["m", "w", "d"].includes(form.gender)) {
      setError("Bitte Geschlecht für die Anrede wählen.");
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
        id?: string;
        error?: string;
        pdfDownloadUrl?: string;
        applicantName?: string;
        emailWarning?: string | null;
        paymentToken?: string;
        feeCents?: number;
      };
      if (!res.ok || !json.ok) {
        throw new Error(typeof json.error === "string" ? json.error : "Antrag fehlgeschlagen");
      }
      setApplicationId(json.id ?? null);
      setPdfDownloadUrl(json.pdfDownloadUrl ?? null);
      setDoneName(json.applicantName ?? null);
      setEmailWarning(json.emailWarning ?? null);
      setPaymentToken(json.paymentToken ?? null);
      setFeeCents(json.feeCents ?? MEMBERSHIP_FEE_EUR * 100);
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Antrag fehlgeschlagen");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    const firstName = doneName?.split(" ")[0] ?? null;
    return (
      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Antrag eingegangen</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm text-slate-700">
            <p>
              Vielen Dank{firstName ? `, ${firstName}` : ""}! Dein Antrag ist bei uns eingegangen.
              Du erhältst in Kürze eine Bestätigungs-E-Mail mit deinem Antrag und der Satzung als
              PDF-Anhang. Der Vorstand wurde ebenfalls benachrichtigt.
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
                className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-fc-navy bg-white text-sm font-semibold text-fc-navy"
              >
                Antrag inkl. Satzung als PDF herunterladen
              </a>
            ) : null}
            <p className="text-xs text-slate-500">
              Falls keine E-Mail ankommt, prüfe den Spam-Ordner oder lade das PDF hier herunter.
            </p>
          </CardContent>
        </Card>

        {applicationId && paymentToken ? (
          <ApplicationPaymentCheckout
            applicationId={applicationId}
            paymentToken={paymentToken}
            feeCents={feeCents}
            applicantFirstName={firstName}
          />
        ) : null}
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <div className="overflow-hidden rounded-2xl border bg-gradient-to-br from-fc-ice via-white to-white shadow-sm">
        <div className="border-b border-fc-sky/20 bg-fc-navy/5 px-5 py-4">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-fc-navy text-white">
              <HeartHandshake className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <h2 className="text-lg font-bold text-fc-navy">Schön, dass du hier bist!</h2>
              <p className="mt-1 text-sm text-slate-600">
                Toll, dass du die Mitgliedschaft im Anni Perka Fanclub unterstützen möchtest.
              </p>
            </div>
          </div>
        </div>
        <div className="space-y-3 px-5 py-4 text-sm leading-relaxed text-slate-700">
          <p>
            Fülle das Formular Schritt für Schritt aus, lies die{" "}
            <SatzungDownloadLink>Satzung des Anni Perka Fanclubs</SatzungDownloadLink> und bestätige
            deine Angaben. Mit deiner digitalen Unterschrift wird dein Antrag verbindlich.
          </p>
          <p>
            Danach kannst du dein unterzeichnetes Antrags-PDF inkl. Satzung herunterladen und den
            Jahresbeitrag von <strong>{MEMBERSHIP_FEE_EUR},00&nbsp;EUR</strong> direkt per
            Zahlungsanbieter oder per eigener Überweisung begleichen.
          </p>
          <p>
            Nach Bestätigung durch den Vorstand wirst du in der Anni Perka Fanclub App freigeschaltet
            und – wenn du möchtest – in die WhatsApp-Gruppe des Fanclubs aufgenommen.
          </p>
          <p className="rounded-xl border border-amber-200/80 bg-amber-50/60 px-3 py-2 text-amber-950">
            <strong>Jahresbeitrag: {MEMBERSHIP_FEE_EUR},00&nbsp;EUR</strong> — bitte alle
            notwendigen Felder ausfüllen und bestätigen.
          </p>
        </div>
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
          <BirthdateSegmentInput
            label="Geburtsdatum"
            required
            value={form.birthdate}
            onChange={(birthdate) => setForm((f) => ({ ...f, birthdate }))}
          />
          <label className="grid gap-1">
            <span className="text-sm font-medium text-slate-700">Geschlecht *</span>
            <GenderSelect
              value={form.gender}
              onChange={(gender) => setForm((f) => ({ ...f, gender }))}
            />
            <span className="text-xs text-slate-500">Für persönliche Anrede (z. B. Geburtstagsgrüße)</span>
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
          <CardTitle>Mitgliedschaft</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <p className="sm:col-span-2 rounded-xl border bg-slate-50 px-3 py-2 text-sm text-slate-800">
            Jahresbeitrag: <strong>{MEMBERSHIP_FEE_EUR},00 EUR</strong> (fest, Zahlung nach Antragstellung
            in der App)
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Antrag & Bestätigungen</CardTitle>
          <CardDescription>
            Vorschau deines Antragstextes — Name und Handynummer werden live aus deinen Angaben
            übernommen.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5">
          {contractPreview}

          <div className="space-y-3 border-t border-slate-100 pt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Bestätigungen
            </p>

          <div className="rounded-xl border border-fc-sky/30 bg-fc-ice/50 p-4">
            <label className="flex items-start gap-3 text-sm text-slate-800">
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
                className="mt-0.5 h-4 w-4 shrink-0 rounded border"
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

          <label className="flex items-start gap-3 rounded-xl border bg-white px-3 py-3 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.statute_accepted}
              onChange={(e) => setForm((f) => ({ ...f, statute_accepted: e.target.checked }))}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border"
            />
            <span>
              Ich habe die{" "}
              <SatzungDownloadLink>Satzung des Anni Perka Fanclubs</SatzungDownloadLink>{" "}
              vollständig gelesen und akzeptiere sie als Vertragsbestandteil. *
            </span>
          </label>
          <label className="flex items-start gap-3 rounded-xl border bg-white px-3 py-3 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.privacy_accepted}
              onChange={(e) => setForm((f) => ({ ...f, privacy_accepted: e.target.checked }))}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border"
            />
            <span>Ich willige in die Verarbeitung meiner Daten zum Zweck der Mitgliedschaft ein. *</span>
          </label>
          <label className="flex items-start gap-3 rounded-xl border bg-white px-3 py-3 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.media_consent}
              onChange={(e) => setForm((f) => ({ ...f, media_consent: e.target.checked }))}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border"
            />
            <span>
              Optional: Fotos/Beiträge im Fanclub-Portal und bei Events dürfen veröffentlicht werden.
            </span>
          </label>
          </div>
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
        className="h-12 w-full rounded-xl bg-fc-navy text-sm font-semibold text-white shadow-sm disabled:opacity-60"
      >
        {busy ? "Wird gesendet…" : "Antrag verbindlich absenden"}
      </button>
    </div>
  );
}
