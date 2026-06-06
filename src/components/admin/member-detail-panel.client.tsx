"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, Pencil, Trash2 } from "lucide-react";
import { AdminIconButton } from "@/components/admin/admin-icon-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmailDialogShell } from "@/components/ui/email-dialog-shell";
import { MemberActivityTimeline } from "@/components/admin/member-activity-timeline";
import { deleteMember } from "@/app/(app)/admin/members/actions";
import {
  addClubLedgerEntry,
  deleteClubLedgerEntry,
  updateClubLedgerEntry,
  getMemberPaymentReminderDraft,
  revokeMemberWarning,
  sendMemberPaymentReminderEmail,
} from "@/app/(app)/admin/members/detail-actions";
import { replaceTrailingSignature } from "@/lib/email/signature-body";
import { membershipStatusLabel } from "@/lib/membership/provision-applicant";
import { genderDisplayLabel } from "@/lib/person/gender";
import {
  formatEur,
  formatLedgerEntryNumber,
  LEDGER_CATEGORY_LABELS,
  type ClubLedgerRow,
  type LedgerCategory,
} from "@/lib/club/ledger";
import type { MailSignatureOption } from "@/lib/email/signatures";
import type { MemberContributionInfo } from "@/lib/club/membership-contribution";
import { ContributionStatusBadge } from "@/components/admin/contribution-status-badge";
import { ReceiptLink } from "@/components/admin/receipt-link";
import {
  DocumentUploadField,
  uploadClubDocument,
} from "@/components/ui/document-upload-field";

export type MemberWarningRow = {
  id: string;
  comment_text: string;
  comment_created_at: string;
  context_title: string | null;
  context_author_name: string | null;
  context_kind: string;
  created_at: string;
  issued_by_name: string | null;
};

export type MemberDetailData = {
  id: string;
  membership_number: string | null;
  first_name: string;
  last_name: string;
  email: string | null;
  username: string | null;
  role: string;
  phone: string | null;
  birthdate: string | null;
  gender: string | null;
  street: string | null;
  postal_code: string | null;
  city: string | null;
  country: string | null;
  warning_count: number;
  contribution_date: string | null;
  membership: {
    start_date: string | null;
    end_date: string | null;
    status: string | null;
    fee_cents: number | null;
  } | null;
  application_id: string | null;
};

function formatDE(date: string | null) {
  if (!date) return "—";
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const [y, m, d] = date.split("-");
    return `${d}.${m}.${y}`;
  }
  const dt = new Date(date);
  if (Number.isNaN(dt.getTime())) return "—";
  return dt.toLocaleDateString("de-DE");
}

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString("de-DE", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid gap-0.5 border-b border-slate-100 py-2.5 sm:grid-cols-[140px_1fr]">
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="text-sm text-fc-navy">{value}</dd>
    </div>
  );
}

function contextKindLabel(kind: string) {
  if (kind === "poll") return "Umfrage";
  if (kind === "giveaway") return "Gewinnspiel";
  return "Beitrag";
}

export function MemberDetailPanel({
  member,
  warnings,
  ledgerEntries,
  ledgerAvailable,
  contribution,
}: {
  member: MemberDetailData;
  warnings: MemberWarningRow[];
  ledgerEntries: ClubLedgerRow[];
  ledgerAvailable: boolean;
  contribution: MemberContributionInfo | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentSubject, setPaymentSubject] = useState("");
  const [paymentBody, setPaymentBody] = useState("");
  const [paymentSignatures, setPaymentSignatures] = useState<MailSignatureOption[]>([]);
  const [paymentSignatureId, setPaymentSignatureId] = useState("");
  const [paymentSignatureTexts, setPaymentSignatureTexts] = useState<Record<string, string>>({});
  const [paymentActiveSignatureText, setPaymentActiveSignatureText] = useState("");
  const [paymentLoading, setPaymentLoading] = useState(false);

  const [ledgerType, setLedgerType] = useState<"income" | "expense">("income");
  const [ledgerAmount, setLedgerAmount] = useState("");
  const [ledgerDesc, setLedgerDesc] = useState("");
  const [ledgerCategory, setLedgerCategory] = useState<LedgerCategory>("membership");
  const [ledgerDate, setLedgerDate] = useState(new Date().toISOString().slice(0, 10));
  const [showLedgerForm, setShowLedgerForm] = useState(false);
  const [ledgerReceiptPath, setLedgerReceiptPath] = useState<string | null>(null);
  const [editingLedgerId, setEditingLedgerId] = useState<string | null>(null);
  const [editLedgerAmount, setEditLedgerAmount] = useState("");
  const [editLedgerDesc, setEditLedgerDesc] = useState("");
  const [editLedgerDate, setEditLedgerDate] = useState("");
  const [editLedgerType, setEditLedgerType] = useState<"income" | "expense">("income");
  const [editLedgerCategory, setEditLedgerCategory] = useState<LedgerCategory>("membership");

  const fullName = `${member.first_name} ${member.last_name}`;
  const feeEur = member.membership?.fee_cents
    ? (member.membership.fee_cents / 100).toFixed(2).replace(".", ",")
    : "15,00";

  function handleDelete() {
    if (!window.confirm(`Mitglied „${fullName}" wirklich löschen?`)) return;
    setActionError(null);
    startTransition(async () => {
      try {
        await deleteMember(member.id);
      } catch (e) {
        setActionError(e instanceof Error ? e.message : "Löschen fehlgeschlagen");
      }
    });
  }

  async function openPaymentDialog() {
    setActionError(null);
    setPaymentLoading(true);
    try {
      const draft = await getMemberPaymentReminderDraft(member.id);
      setPaymentSubject(draft.subject);
      setPaymentBody(draft.body);
      setPaymentSignatures(draft.signatures);
      setPaymentSignatureId(draft.defaultSignatureId);
      setPaymentSignatureTexts(draft.signatureTexts);
      setPaymentActiveSignatureText(draft.signatureTexts[draft.defaultSignatureId] ?? "");
      setShowPaymentDialog(true);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Vorlage konnte nicht geladen werden");
    } finally {
      setPaymentLoading(false);
    }
  }

  function onPaymentSignatureChange(signatureId: string) {
    const nextText = paymentSignatureTexts[signatureId] ?? "";
    setPaymentBody((body) =>
      replaceTrailingSignature(
        body,
        paymentActiveSignatureText,
        nextText,
        Object.values(paymentSignatureTexts),
      ),
    );
    setPaymentActiveSignatureText(nextText);
    setPaymentSignatureId(signatureId);
  }

  function handleRevokeWarning(warningId: string) {
    if (!window.confirm("Diese Verwarnung zurücknehmen?")) return;
    setActionError(null);
    startTransition(async () => {
      try {
        await revokeMemberWarning(warningId);
        router.refresh();
      } catch (e) {
        setActionError(e instanceof Error ? e.message : "Zurücknahme fehlgeschlagen");
      }
    });
  }

  function handleAddLedger() {
    const amount = Number(ledgerAmount.replace(",", "."));
    if (!ledgerDesc.trim() || !amount || amount <= 0) return;
    setActionError(null);
    startTransition(async () => {
      try {
        await addClubLedgerEntry({
          entryType: ledgerType,
          amountEur: amount,
          description: ledgerDesc.trim(),
          category: ledgerCategory,
          memberId: member.id,
          entryDate: ledgerDate,
          receiptStoragePath: ledgerReceiptPath,
        });
        setLedgerAmount("");
        setLedgerDesc("");
        setLedgerReceiptPath(null);
        setShowLedgerForm(false);
        router.refresh();
      } catch (e) {
        setActionError(e instanceof Error ? e.message : "Eintrag fehlgeschlagen");
      }
    });
  }

  function handleDeleteLedger(entryId: string) {
    if (!window.confirm("Buchhaltungseintrag löschen?")) return;
    startTransition(async () => {
      try {
        await deleteClubLedgerEntry(entryId);
        router.refresh();
      } catch (e) {
        setActionError(e instanceof Error ? e.message : "Löschen fehlgeschlagen");
      }
    });
  }

  function startEditLedger(e: ClubLedgerRow) {
    setEditingLedgerId(e.id);
    setEditLedgerType(e.entry_type);
    setEditLedgerAmount((e.amount_cents / 100).toFixed(2));
    setEditLedgerDesc(e.description);
    setEditLedgerCategory(e.category);
    setEditLedgerDate(e.entry_date);
  }

  function handleUpdateLedger(original: ClubLedgerRow) {
    const amount = Number(editLedgerAmount.replace(",", "."));
    if (!editLedgerDesc.trim() || !amount || amount <= 0) return;
    const amountChanged = Math.round(amount * 100) !== original.amount_cents;
    const dateChanged = editLedgerDate !== original.entry_date;
    if (amountChanged || dateChanged) {
      const parts: string[] = [];
      if (amountChanged) {
        parts.push(
          `Betrag von ${formatEur(original.amount_cents)} auf ${formatEur(Math.round(amount * 100))}`,
        );
      }
      if (dateChanged) {
        parts.push(`Datum von ${formatDE(original.entry_date)} auf ${formatDE(editLedgerDate)}`);
      }
      if (!window.confirm(`${parts.join(" und ")} ändern — wirklich speichern?`)) return;
    }
    setActionError(null);
    startTransition(async () => {
      try {
        await updateClubLedgerEntry({
          entryId: original.id,
          entryType: editLedgerType,
          amountEur: amount,
          description: editLedgerDesc.trim(),
          category: editLedgerCategory,
          entryDate: editLedgerDate,
          memberId: member.id,
          receiptStoragePath: original.receipt_storage_path,
        });
        setEditingLedgerId(null);
        router.refresh();
      } catch (e) {
        setActionError(e instanceof Error ? e.message : "Speichern fehlgeschlagen");
      }
    });
  }

  return (
    <div className="grid gap-4">
      {actionError ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {actionError}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <AdminIconButton
          label="Bearbeiten"
          icon={Pencil}
          variant="edit"
          href={`/admin/members/${member.id}/edit`}
        />
        <button
          type="button"
          disabled={pending || paymentLoading || !member.email}
          onClick={() => void openPaymentDialog()}
          className="fc-btn-secondary h-10 disabled:opacity-50"
        >
          Zahlungserinnerung senden
        </button>
        <AdminIconButton
          label="Mitglied löschen"
          icon={Trash2}
          variant="delete"
          disabled={pending}
          onClick={handleDelete}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex flex-wrap items-center gap-2">
              Stammdaten
              {member.warning_count > 0 ? (
                <Badge variant="danger" className="inline-flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" aria-hidden />
                  {member.warning_count} Verwarnung{member.warning_count === 1 ? "" : "en"}
                </Badge>
              ) : null}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl>
              <InfoRow label="Mitgliedsnr." value={member.membership_number ?? "—"} />
              <InfoRow label="Name" value={fullName} />
              <InfoRow label="E-Mail" value={member.email ?? "—"} />
              <InfoRow label="Benutzername" value={member.username ?? "—"} />
              <InfoRow label="Telefon" value={member.phone ?? "—"} />
              <InfoRow label="Geburtsdatum" value={formatDE(member.birthdate)} />
              <InfoRow label="Geschlecht" value={genderDisplayLabel(member.gender)} />
              <InfoRow
                label="Adresse"
                value={
                  member.street
                    ? `${member.street}, ${member.postal_code ?? ""} ${member.city ?? ""} (${member.country ?? "DE"})`
                    : "—"
                }
              />
              <InfoRow label="Rolle" value={member.role} />
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Mitgliedschaft</CardTitle>
          </CardHeader>
          <CardContent>
            <dl>
              <InfoRow label="Status" value={membershipStatusLabel(member.membership?.status ?? "")} />
              <InfoRow label="Beitrittsdatum" value={formatDE(member.membership?.start_date ?? null)} />
              <InfoRow label="Ende" value={formatDE(member.membership?.end_date ?? null)} />
              <InfoRow label="Jahresbeitrag" value={`${feeEur} €`} />
              <InfoRow
                label="Beitragsstatus"
                value={
                  contribution ? (
                    <span className="inline-flex flex-wrap items-center gap-2">
                      <ContributionStatusBadge status={contribution.status} />
                      {contribution.status !== "paid" ? (
                        <span className="text-xs text-slate-600">
                          Offen: {formatEur(contribution.openCents)} · Periode {contribution.periodLabel}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-600">Periode {contribution.periodLabel}</span>
                      )}
                    </span>
                  ) : (
                    "—"
                  )
                }
              />
              <InfoRow label="Beitragsdatum" value={formatDE(member.contribution_date)} />
            </dl>
            {member.application_id ? (
              <Link
                href={`/admin/members/applications/${member.application_id}`}
                className="mt-3 inline-block text-sm font-medium text-fc-blue hover:underline"
              >
                Mitgliedsantrag & PDF →
              </Link>
            ) : null}
          </CardContent>
        </Card>
      </div>

      {warnings.length > 0 ? (
        <Card className="border-rose-200">
          <CardHeader>
            <CardTitle className="text-rose-900">Verwarnungen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {warnings.map((w) => (
              <div
                key={w.id}
                className="rounded-xl border border-rose-200 bg-rose-50/60 px-4 py-3 text-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-rose-900">
                      {contextKindLabel(w.context_kind)}: {w.context_title ?? "—"}
                    </p>
                    <p className="mt-0.5 text-xs text-rose-700">
                      {formatWhen(w.created_at)}
                      {w.issued_by_name ? ` · von ${w.issued_by_name}` : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => handleRevokeWarning(w.id)}
                    className="shrink-0 rounded-lg border border-rose-300 bg-white px-2.5 py-1 text-xs font-semibold text-rose-800 hover:bg-rose-100 disabled:opacity-50"
                  >
                    Zurücknehmen
                  </button>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-slate-800">
                  „{w.comment_text}"
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Kommentar vom {formatWhen(w.comment_created_at)}
                  {w.context_author_name ? ` unter Beitrag von ${w.context_author_name}` : ""}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Zahlungen & Buchhaltung (Mitglied)</CardTitle>
        </CardHeader>
        <CardContent>
          {!ledgerAvailable ? (
            <p className="text-sm text-amber-800">
              Buchhaltung noch nicht eingerichtet. Bitte{" "}
              <code className="rounded bg-amber-100 px-1">supabase/049_club_ledger.sql</code> im SQL
              Editor ausführen.
            </p>
          ) : (
            <>
              {ledgerEntries.length > 0 ? (
                <ul className="mb-4 space-y-2">
                  {ledgerEntries.map((e) =>
                    editingLedgerId === e.id ? (
                      <li
                        key={e.id}
                        id={`ledger-${e.id}`}
                        className="rounded-lg border bg-slate-50 px-3 py-3 text-sm"
                      >
                        <div className="grid gap-2 sm:grid-cols-2">
                          <select
                            value={editLedgerType}
                            onChange={(ev) => setEditLedgerType(ev.target.value as "income" | "expense")}
                            className="h-9 rounded-lg border px-2 text-xs"
                          >
                            <option value="income">Einnahme</option>
                            <option value="expense">Ausgabe</option>
                          </select>
                          <select
                            value={editLedgerCategory}
                            onChange={(ev) =>
                              setEditLedgerCategory(ev.target.value as LedgerCategory)
                            }
                            className="h-9 rounded-lg border px-2 text-xs"
                          >
                            {Object.entries(LEDGER_CATEGORY_LABELS).map(([k, v]) => (
                              <option key={k} value={k}>
                                {v}
                              </option>
                            ))}
                          </select>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={editLedgerAmount}
                            onChange={(ev) => setEditLedgerAmount(ev.target.value)}
                            className="h-9 rounded-lg border px-2 text-xs"
                          />
                          <input
                            type="date"
                            value={editLedgerDate}
                            onChange={(ev) => setEditLedgerDate(ev.target.value)}
                            className="h-9 rounded-lg border px-2 text-xs"
                          />
                          <input
                            value={editLedgerDesc}
                            onChange={(ev) => setEditLedgerDesc(ev.target.value)}
                            className="h-9 rounded-lg border px-2 text-xs sm:col-span-2"
                          />
                        </div>
                        <div className="mt-2 flex gap-2">
                          <button
                            type="button"
                            disabled={pending || !editLedgerDesc.trim() || !editLedgerAmount}
                            onClick={() => handleUpdateLedger(e)}
                            className="text-xs font-semibold text-emerald-700 hover:underline disabled:opacity-50"
                          >
                            Speichern
                          </button>
                          <button
                            type="button"
                            disabled={pending}
                            onClick={() => setEditingLedgerId(null)}
                            className="text-xs font-semibold text-slate-600 hover:underline disabled:opacity-50"
                          >
                            Abbrechen
                          </button>
                        </div>
                      </li>
                    ) : (
                      <li
                        key={e.id}
                        id={`ledger-${e.id}`}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-white px-3 py-2 text-sm"
                      >
                        <div>
                          <span className="mr-2 font-mono text-xs font-semibold text-fc-navy">
                            {formatLedgerEntryNumber(e.entry_number)}
                          </span>
                          <span
                            className={
                              e.entry_type === "income"
                                ? "font-semibold text-emerald-700"
                                : "font-semibold text-rose-700"
                            }
                          >
                            {e.entry_type === "income" ? "+" : "−"}
                            {formatEur(e.amount_cents)}
                          </span>
                          <span className="ml-2 text-slate-700">{e.description}</span>
                          <span className="ml-2 text-xs text-slate-500">
                            {LEDGER_CATEGORY_LABELS[e.category]} · {formatDE(e.entry_date)}
                            {e.created_by_name ? ` · Angelegt: ${e.created_by_name}` : ""}
                          </span>
                          <span className="ml-2 inline-flex items-center gap-2">
                            {e.receipt_storage_path ? (
                              <ReceiptLink path={e.receipt_storage_path} />
                            ) : null}
                            {e.activity_log_id ? (
                              <a
                                href={`#activity-${e.activity_log_id}`}
                                className="text-xs font-medium text-fc-blue hover:underline"
                              >
                                Historie →
                              </a>
                            ) : null}
                          </span>
                        </div>
                        <div className="flex gap-3">
                          <AdminIconButton
                            label="Bearbeiten"
                            icon={Pencil}
                            variant="edit"
                            size="sm"
                            disabled={pending}
                            onClick={() => startEditLedger(e)}
                          />
                          <AdminIconButton
                            label="Löschen"
                            icon={Trash2}
                            variant="delete"
                            size="sm"
                            disabled={pending}
                            onClick={() => handleDeleteLedger(e.id)}
                          />
                        </div>
                      </li>
                    ),
                  )}
                </ul>
              ) : (
                <p className="mb-3 text-sm text-slate-500">Noch keine Zahlungen eingetragen.</p>
              )}

              {!showLedgerForm ? (
                <button
                  type="button"
                  onClick={() => setShowLedgerForm(true)}
                  className="h-9 rounded-lg border bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Neuen Eintrag anlegen
                </button>
              ) : (
                <div className="rounded-xl border bg-slate-50/80 p-3">
                  <p className="text-xs font-semibold text-slate-700">Einnahme / Ausgabe eintragen</p>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    <select
                      value={ledgerType}
                      onChange={(e) => setLedgerType(e.target.value as "income" | "expense")}
                      className="h-9 rounded-lg border px-2 text-xs"
                    >
                      <option value="income">Einnahme</option>
                      <option value="expense">Ausgabe</option>
                    </select>
                    <select
                      value={ledgerCategory}
                      onChange={(e) => setLedgerCategory(e.target.value as LedgerCategory)}
                      className="h-9 rounded-lg border px-2 text-xs"
                    >
                      {Object.entries(LEDGER_CATEGORY_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={ledgerAmount}
                      onChange={(e) => setLedgerAmount(e.target.value)}
                      placeholder="Betrag (€)"
                      className="h-9 rounded-lg border px-2 text-xs"
                    />
                    <input
                      type="date"
                      value={ledgerDate}
                      onChange={(e) => setLedgerDate(e.target.value)}
                      className="h-9 rounded-lg border px-2 text-xs"
                    />
                    <input
                      value={ledgerDesc}
                      onChange={(e) => setLedgerDesc(e.target.value)}
                      placeholder="Beschreibung, z. B. Beitrag 2026"
                      className="h-9 rounded-lg border px-2 text-xs sm:col-span-2"
                    />
                    <div className="sm:col-span-2">
                      <DocumentUploadField
                        label="Beleg (optional)"
                        disabled={pending}
                        onFileSelected={async (file) => {
                          const path = await uploadClubDocument(file, "receipt", member.id);
                          setLedgerReceiptPath(path);
                        }}
                        onClear={() => setLedgerReceiptPath(null)}
                      />
                    </div>
                    <div className="flex gap-2 sm:col-span-2">
                      <button
                        type="button"
                        disabled={pending || !ledgerDesc.trim() || !ledgerAmount}
                        onClick={handleAddLedger}
                        className="h-9 rounded-lg bg-slate-800 px-3 text-xs font-semibold text-white disabled:opacity-50"
                      >
                        Speichern
                      </button>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => setShowLedgerForm(false)}
                        className="h-9 rounded-lg border px-3 text-xs font-semibold text-slate-600"
                      >
                        Abbrechen
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <div id="member-activity">
        <MemberActivityTimeline userId={member.id} applicationId={null} />
      </div>

      {showPaymentDialog ? (
        <EmailDialogShell
          title="Zahlungserinnerung"
          description={`An ${member.email}`}
          onClose={() => setShowPaymentDialog(false)}
          footer={
            <button
              type="button"
              disabled={pending || !paymentSignatureId}
              className="h-10 rounded-xl bg-fc-navy px-4 text-sm font-semibold text-white disabled:opacity-50"
              onClick={() => {
                startTransition(async () => {
                  try {
                    await sendMemberPaymentReminderEmail({
                      userId: member.id,
                      subject: paymentSubject,
                      body: paymentBody,
                      signatureId: paymentSignatureId,
                    });
                    setShowPaymentDialog(false);
                    router.refresh();
                  } catch (e) {
                    setActionError(e instanceof Error ? e.message : "Versand fehlgeschlagen");
                  }
                });
              }}
            >
              Senden
            </button>
          }
        >
          <label className="grid gap-1">
            <span className="text-sm font-medium text-slate-700">Signatur</span>
            <select
              value={paymentSignatureId}
              onChange={(e) => onPaymentSignatureChange(e.target.value)}
              className="h-11 rounded-xl border px-3 text-sm"
            >
              {paymentSignatures.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <label className="mt-3 grid gap-1">
            <span className="text-sm font-medium text-slate-700">Betreff</span>
            <input
              value={paymentSubject}
              onChange={(e) => setPaymentSubject(e.target.value)}
              className="h-11 rounded-xl border px-3 text-sm"
            />
          </label>
          <label className="mt-3 grid gap-1">
            <span className="text-sm font-medium text-slate-700">Nachricht</span>
            <textarea
              value={paymentBody}
              onChange={(e) => setPaymentBody(e.target.value)}
              rows={10}
              className="rounded-xl border px-3 py-2 text-sm"
            />
          </label>
        </EmailDialogShell>
      ) : null}
    </div>
  );
}
