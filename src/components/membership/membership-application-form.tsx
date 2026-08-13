"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Download, Heart, Sparkles } from "lucide-react";
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
import { isValidPostalCode, postalCodeErrorMessage } from "@/lib/postal-code";
import {
  MEMBERSHIP_REFERRER_STORAGE_KEY,
  readReferrerIdFromSearchParams,
  readReferralTokenFromSearchParams,
} from "@/lib/membership/referral-link";
import { BirthdateSegmentInput } from "@/components/ui/birthdate-segment-input";
import { GenderSelect } from "@/components/ui/gender-select";
import { PaymentConfirmation } from "@/components/payments/payment-confirmation";
import type { PaymentCheckoutResult } from "@/lib/payments/types";
import {
  CLUB_BANK,
  formatApplicationPaymentReference,
  formatClubIbanDisplay,
} from "@/lib/payments/club-bank";
import { FEATURE_BADGE_HOVER } from "@/components/membership/membership-landing";
import { buildEmailSalutation } from "@/lib/email/salutation-block";
import { membershipApplicationPdfFilename } from "@/lib/membership/pdf-filename";
import { MEMBERSHIP_FEE_EUR } from "@/lib/membership/constants";
import { formatEur } from "@/lib/club/ledger";

const SATZUNG_PDF = "/documents/satzung.pdf";
const todayIso = () => new Date().toISOString().slice(0, 10);

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
    signed_at_place: "",
    signed_at_date: todayIso(),
    privacy_accepted: false,
    statute_accepted: false,
    media_consent: false,
    whatsapp_opt_in: false,
    instagram: "",
    facebook: "",
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
  const [doneGender, setDoneGender] = useState<string | null>(null);
  const [doneFirstName, setDoneFirstName] = useState<string | null>(null);
  const [doneLastName, setDoneLastName] = useState<string | null>(null);
  const [emailWarning, setEmailWarning] = useState<string | null>(null);
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [feeCents, setFeeCents] = useState(MEMBERSHIP_FEE_EUR * 100);
  const [paymentResult, setPaymentResult] = useState<PaymentCheckoutResult | null>(null);

  useEffect(() => {
    if (!form.whatsapp_opt_in || whatsappTouched) return;
    setWhatsappDial(mobileDial);
    setWhatsappNumber(mobileNumber);
  }, [form.whatsapp_opt_in, mobileDial, mobileNumber, whatsappTouched]);

  useEffect(() => {
    const search = window.location.search;
    const fromUrl = readReferrerIdFromSearchParams(search);
    if (fromUrl) {
      try {
        sessionStorage.setItem(MEMBERSHIP_REFERRER_STORAGE_KEY, fromUrl);
      } catch {
        /* ignore */
      }
    }

    const inviteToken = readReferralTokenFromSearchParams(search);
    if (!inviteToken) return;

    void fetch(`/api/membership/invite-prefill?token=${encodeURIComponent(inviteToken)}`)
      .then((r) => r.json())
      .then(
        (json: {
          ok?: boolean;
          referrerUserId?: string;
          email?: string;
          firstName?: string;
          lastName?: string;
          gender?: string | null;
        }) => {
          if (!json.ok) return;
          if (json.referrerUserId) {
            try {
              sessionStorage.setItem(MEMBERSHIP_REFERRER_STORAGE_KEY, json.referrerUserId);
            } catch {
              /* ignore */
            }
          }
          setForm((f) => ({
            ...f,
            ...(json.firstName ? { first_name: json.firstName } : {}),
            ...(json.lastName ? { last_name: json.lastName } : {}),
            ...(json.email ? { email: json.email } : {}),
            ...(json.gender === "m" || json.gender === "w" ? { gender: json.gender } : {}),
          }));
        },
      )
      .catch(() => {
        /* ignore */
      });
  }, []);

  const mobileFull = formatFullPhone(mobileDial, mobileNumber);

  const contractPreview = (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50/80 p-5 text-sm leading-relaxed text-slate-800">
      <p>
        Hiermit beantrage ich,{" "}
        <LiveValue value={form.first_name.trim()} placeholder="Vorname" />{" "}
        <LiveValue value={form.last_name.trim()} placeholder="Nachname" />, die Mitgliedschaft im
        offiziellen Anni-Perka-Fanclub e.&nbsp;V.
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
  );

  async function submit() {
    setError(null);
    if (!countryCode || countryCode.length !== 2) {
      setError("Bitte ein Land auswählen — Pflichtfeld für Adresse und Karte.");
      return;
    }
    if (!form.country.trim()) {
      setError("Bitte ein Land auswählen — Pflichtfeld für Adresse und Karte.");
      return;
    }
    if (!isValidPostalCode(form.postal_code, countryCode)) {
      setError(postalCodeErrorMessage(countryCode));
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
      setError("Die Unterschrift fehlt. Bitte unterschreibe im vorgesehenen Feld.");
      return;
    }
    if (!form.birthdate || !/^\d{4}-\d{2}-\d{2}$/.test(form.birthdate)) {
      setError(
        "Bitte ein gültiges Geburtsdatum eingeben: Tag max. 31, Monat max. 12, Jahr mit 19 oder 20 am Anfang.",
      );
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
          instagram: form.instagram.trim() || undefined,
          facebook: form.facebook.trim() || undefined,
          privacy_accepted: true,
          statute_accepted: true,
          signature_applicant: signature,
          signed_at_date: todayIso(),
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
        feeCents?: number;
        payment?: PaymentCheckoutResult;
      };
      if (!res.ok || !json.ok) {
        throw new Error(typeof json.error === "string" ? json.error : "Antrag fehlgeschlagen");
      }
      setApplicationId(json.id ?? null);
      setPdfDownloadUrl(json.pdfDownloadUrl ?? null);
      setDoneName(json.applicantName ?? null);
      setDoneFirstName(form.first_name.trim() || null);
      setDoneLastName(form.last_name.trim() || null);
      setDoneGender(form.gender || null);
      setEmailWarning(json.emailWarning ?? null);
      setFeeCents(json.feeCents ?? MEMBERSHIP_FEE_EUR * 100);
      setPaymentResult(json.payment ?? null);
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Antrag fehlgeschlagen");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    const firstName = doneFirstName ?? doneName?.split(" ")[0] ?? null;
    const salutation = firstName
      ? buildEmailSalutation(firstName, doneGender)
      : null;
    const pdfFilename =
      doneFirstName && doneLastName
        ? membershipApplicationPdfFilename(doneFirstName, doneLastName)
        : "Mitgliedsantrag.pdf";
    return (
      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Antrag eingegangen</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm text-slate-700">
            <p>
              {salutation
                ? `${salutation}, vielen Dank! Dein Antrag ist bei uns eingegangen.`
                : "Vielen Dank! Dein Antrag ist bei uns eingegangen."}
            </p>
            <p>
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
                download={pdfFilename}
                className="mt-1 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-fc-navy px-5 text-sm font-semibold text-white shadow-md shadow-fc-navy/20 transition hover:bg-fc-blue"
              >
                <Download className="h-4 w-4 shrink-0" aria-hidden />
                Antrag als PDF herunterladen
              </a>
            ) : null}
            <p className="text-xs text-slate-500">
              Falls keine E-Mail ankommt, prüfe den Spam-Ordner oder lade das PDF hier herunter
              (Antrag inkl. Satzung).
            </p>
          </CardContent>
        </Card>

        {paymentResult ? (
          <PaymentConfirmation
            result={paymentResult}
            transferReference={formatApplicationPaymentReference(
              form.first_name,
              form.last_name,
            )}
          />
        ) : applicationId ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-4">
            <p className="text-sm font-semibold text-amber-950">Mitgliedsbeitrag per Überweisung</p>
            <p className="mt-2 text-sm leading-relaxed text-amber-950">
              Der Jahresbeitrag beträgt <strong>{formatEur(feeCents)}</strong>. Bitte überweise auf:
            </p>
            <dl className="mt-2 grid gap-1 text-sm text-slate-800 sm:grid-cols-[7.5rem_1fr]">
              <dt className="text-slate-500">Empfänger</dt>
              <dd className="font-medium">{CLUB_BANK.account_holder}</dd>
              <dt className="text-slate-500">IBAN</dt>
              <dd className="font-mono text-[13px]">{formatClubIbanDisplay()}</dd>
              <dt className="text-slate-500">BIC</dt>
              <dd className="font-mono text-[13px]">{CLUB_BANK.bic}</dd>
              <dt className="text-slate-500">VWZ</dt>
              <dd className="font-medium">
                {formatApplicationPaymentReference(form.first_name, form.last_name)}
              </dd>
            </dl>
            <p className="mt-2 text-xs text-amber-900">
              Die gleichen Angaben stehen in deiner Bestätigungs-E-Mail.
            </p>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:gap-5">
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
            countryCode={countryCode}
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
              setForm((f) => ({
                ...f,
                country: c.name,
                postal_code: "",
              }));
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
          <label className="grid gap-1">
            <span className="text-sm font-medium text-slate-700">
              Instagram <span className="font-normal text-slate-500">(optional)</span>
            </span>
            <input
              value={form.instagram}
              onChange={(e) => setForm((f) => ({ ...f, instagram: e.target.value }))}
              placeholder="z. B. @anni.perka.fan"
              autoComplete="off"
              className="h-11 rounded-xl border bg-white px-3 text-sm outline-none focus:ring-4 focus:ring-[color:var(--ring)]"
            />
            <span className="text-xs text-slate-500">Dein Instagram-Name für Verlinkungen im Fanclub</span>
          </label>
          <label className="grid gap-1">
            <span className="text-sm font-medium text-slate-700">
              Facebook <span className="font-normal text-slate-500">(optional)</span>
            </span>
            <input
              value={form.facebook}
              onChange={(e) => setForm((f) => ({ ...f, facebook: e.target.value }))}
              placeholder="z. B. Max Mustermann"
              autoComplete="off"
              className="h-11 rounded-xl border bg-white px-3 text-sm outline-none focus:ring-4 focus:ring-[color:var(--ring)]"
            />
            <span className="text-xs text-slate-500">Dein Facebook-Profilname für Verlinkungen im Fanclub</span>
          </label>
        </CardContent>
      </Card>

      <div className="overflow-hidden rounded-2xl border border-rose-200/60 bg-gradient-to-br from-rose-50/70 via-white to-fc-ice/50 p-5 shadow-sm sm:p-6">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-rose-100 text-rose-600">
            <Heart className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <h2 className="text-lg font-bold text-fc-navy">
              Darauf kannst du dich freuen <span aria-hidden>❤️</span>
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-700">
              Als Mitglied erhältst du Zugang zu unserem digitalen Fanclub-Portal mit vielen
              exklusiven Funktionen:
            </p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            "Community",
            "Gewinnspiele",
            "Umfragen",
            "Konzertplanung",
            "Reiseinfos",
            "Fanshop",
            "Anni-Stars",
            "Grüße von Anni",
          ].map((item, i) => (
            <span
              key={item}
              className={`inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-fc-sky/25 bg-white px-2 py-2 text-center text-xs font-medium text-fc-navy shadow-sm transition ${FEATURE_BADGE_HOVER[i % FEATURE_BADGE_HOVER.length]}`}
            >
              <Sparkles className="h-3 w-3 shrink-0 text-fc-blue" aria-hidden />
              <span className="leading-snug">{item}</span>
            </span>
          ))}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Mitgliedschaft</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <p className="sm:col-span-2 rounded-xl border bg-slate-50 px-3 py-2 text-sm text-slate-800">
            Jahresbeitrag: <strong>{MEMBERSHIP_FEE_EUR},00 EUR</strong> — Zahlung per
            Banküberweisung. Der Beitrag gilt immer für das laufende Kalenderjahr; dein Beitritt
            beginnt mit dem Datum deines Antrags.
          </p>
          <div className="sm:col-span-2 rounded-xl border border-fc-sky/30 bg-fc-ice/50 px-3 py-3 text-sm text-fc-navy">
            <p className="font-semibold">Überweisung Mitgliedsbeitrag</p>
            <dl className="mt-2 grid gap-1 text-slate-700 sm:grid-cols-[7.5rem_1fr]">
              <dt className="text-slate-500">Empfänger</dt>
              <dd className="font-medium">{CLUB_BANK.account_holder}</dd>
              <dt className="text-slate-500">IBAN</dt>
              <dd className="font-mono text-[13px]">{formatClubIbanDisplay()}</dd>
              <dt className="text-slate-500">BIC</dt>
              <dd className="font-mono text-[13px]">{CLUB_BANK.bic}</dd>
              <dt className="text-slate-500">VWZ</dt>
              <dd className="font-medium">
                {formatApplicationPaymentReference(form.first_name, form.last_name)}
              </dd>
            </dl>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Antrag & Bestätigungen</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5">
          {contractPreview}

          <div className="space-y-4 border-t border-slate-100 pt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Bestätigungen
            </p>

            <label className="flex items-start gap-3 rounded-xl border bg-white px-4 py-3 text-sm text-slate-700">
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

            <div className="rounded-xl border bg-white px-4 py-4">
              <p className="text-sm font-semibold text-fc-navy">4. Datenschutz (DSGVO)</p>
              <p className="mt-2 text-sm leading-relaxed text-slate-700">
                Ich willige ein, dass der Anni Perka Fanclub meine personenbezogenen Daten (Name,
                Adresse, Kontaktdaten) zum Zweck der Mitgliederverwaltung, Kommunikation sowie
                Organisation von Fanclub-Aktivitäten speichert und verarbeitet. Eine Weitergabe an
                Dritte erfolgt nicht, es sei denn, dies ist gesetzlich vorgeschrieben. Ich habe
                jederzeit das Recht auf Auskunft, Berichtigung und Löschung meiner Daten, soweit
                keine gesetzlichen Aufbewahrungspflichten entgegenstehen.
              </p>
              <label className="mt-3 flex items-start gap-3 text-sm text-slate-800">
                <input
                  type="checkbox"
                  checked={form.privacy_accepted}
                  onChange={(e) => setForm((f) => ({ ...f, privacy_accepted: e.target.checked }))}
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border"
                />
                <span>Ich stimme der Datenschutzerklärung zu. *</span>
              </label>
            </div>

            <div className="rounded-xl border border-fc-sky/30 bg-fc-ice/50 px-4 py-4">
              <p className="text-sm font-semibold text-fc-navy">
                5. WhatsApp-Gruppe des Fanclubs{" "}
                <span className="font-normal text-slate-500">(optional)</span>
              </p>
              <p className="mt-2 text-sm leading-relaxed text-slate-700">
                Der Anni Perka Fanclub bietet eine optionale WhatsApp-Gruppe zur internen
                Kommunikation (z.&nbsp;B. Informationen zu Veranstaltungen, Aktionen und
                Neuigkeiten). Mir ist bekannt, dass bei Teilnahme an der WhatsApp-Gruppe meine
                Mobilfunknummer für andere Gruppenmitglieder sichtbar ist und personenbezogene Daten
                durch den Dienst WhatsApp (Meta Platforms Ireland Ltd.) verarbeitet werden können. Die
                Teilnahme an der WhatsApp-Gruppe ist freiwillig und kann jederzeit beendet werden,
                ohne dass dies Auswirkungen auf die Fanclub-Mitgliedschaft hat.
              </p>
              <label className="mt-3 flex items-start gap-3 text-sm text-slate-800">
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
                <span>Ich möchte der offiziellen WhatsApp-Gruppe des Fanclubs beitreten.</span>
              </label>
              {form.whatsapp_opt_in ? (
                <div className="mt-3">
                  <PhoneInput
                    label="Mobilnummer"
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
              ) : (
                <p className="mt-2 text-xs text-slate-500">
                  Kein Haken gesetzt — du wirst nicht in die WhatsApp-Gruppe aufgenommen.
                </p>
              )}
            </div>

            <div className="rounded-xl border bg-slate-50 px-4 py-4">
              <p className="text-sm font-semibold text-fc-navy">6. Nutzung von Namen, Bild und Logo</p>
              <p className="mt-2 text-sm leading-relaxed text-slate-700">
                Name, Bild und Logos von Anni Perka sind urheber- und markenrechtlich geschützt. Die
                Nutzung durch Fanclub-Mitglieder ist ausschließlich für private, nicht kommerzielle
                Zwecke im Zusammenhang mit dem Fanclub gestattet. Jede weitergehende Nutzung bedarf
                der vorherigen schriftlichen Zustimmung des Rechteinhabers.
              </p>
              <label className="mt-3 flex items-start gap-3 text-sm text-slate-800">
                <input
                  type="checkbox"
                  checked={form.media_consent}
                  onChange={(e) => setForm((f) => ({ ...f, media_consent: e.target.checked }))}
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border"
                />
                <span>
                  Optional: Fotos/Beiträge im Fanclub-Portal und bei Events dürfen veröffentlicht
                  werden.
                </span>
              </label>
            </div>
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
            <div className="grid gap-1">
              <span className="text-sm font-medium text-slate-700">Datum</span>
              <div className="flex h-11 items-center rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700">
                {new Date(form.signed_at_date || todayIso()).toLocaleDateString("de-DE")}
              </div>
              <span className="text-xs text-slate-500">Wird automatisch auf heute gesetzt.</span>
            </div>
          </div>

          {signature ? (
            <p className="text-xs text-emerald-700">Unterschrift übernommen.</p>
          ) : null}
          <SignaturePad
            disabled={busy}
            autoSave
            onClear={() => setSignature(null)}
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

      <div className="rounded-2xl border border-fc-navy/10 bg-gradient-to-b from-fc-ice/60 to-white p-6 text-center shadow-sm">
        <h2 className="text-xl font-bold text-fc-navy">Fast geschafft!</h2>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-slate-700">
          Nach dem Absenden prüfen wir deinen Antrag. Anschließend erhältst du alle Informationen per
          E-Mail. Wir freuen uns darauf, dich bald im offiziellen Anni Perka Fanclub begrüßen zu
          dürfen!
        </p>
        <button
          type="button"
          disabled={busy}
          onClick={() => void submit()}
          className="mt-5 inline-flex h-12 w-full max-w-md items-center justify-center gap-2 rounded-2xl bg-fc-navy px-6 text-sm font-semibold text-white shadow-md shadow-fc-navy/20 transition hover:bg-fc-blue disabled:opacity-60 sm:w-auto sm:min-w-[18rem]"
        >
          {busy ? (
            "Wird gesendet…"
          ) : (
            <>
              <span aria-hidden>❤️</span> Jetzt Mitglied werden
            </>
          )}
        </button>
      </div>
    </div>
  );
}
