"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, Ban, Mail, Pencil, ShieldCheck, StickyNote, Trash2 } from "lucide-react";
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
  getMemberApplicationPaymentDraft,
  getMemberPaymentReminderDraft,
  revokeMemberWarning,
  sendMemberApplicationPaymentEmail,
  sendMemberPaymentReminderEmail,
  suspendMemberAppAccess,
  reactivateMemberAppAccess,
  markMemberAppRegistrationDeleted,
  clearMemberAppRegistration,
  setMemberGreetingPostSentAt,
  saveMemberBoardNote,
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
import {
  appRegistrationStatusLabel,
  appRegistrationBadgeClass,
  type AppRegistrationStatus,
} from "@/lib/membership/app-registration";
import { cn } from "@/lib/cn";
import { userFacingActionError } from "@/lib/admin/user-facing-action-error";
import { MEMBER_BOARD_NOTE_MAX } from "@/lib/members/board-notes";
import { resolvePaymentEmail } from "@/lib/members/no-app-access";

export type InitialPaperMailDraft = {
  subject: string;
  body: string;
  to?: string;
  signatures: MailSignatureOption[];
  defaultSignatureId: string;
  signatureTexts: Record<string, string>;
};

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
    suspension_reason?: string | null;
  } | null;
  application_id: string | null;
  app_registration_status: AppRegistrationStatus;
  app_registered_at: string | null;
  greeting_post_sent_at: string | null;
  board_note: string;
  no_app_access?: boolean;
  billing_email?: string | null;
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

function todayIsoDate() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function GreetingPostEditor({
  userId,
  sentAt,
  disabled,
  onError,
  onSaved,
}: {
  userId: string;
  sentAt: string | null;
  disabled?: boolean;
  onError: (msg: string | null) => void;
  onSaved: () => void;
}) {
  const [pendingLocal, startLocal] = useTransition();
  const [dateValue, setDateValue] = useState(sentAt?.slice(0, 10) ?? "");

  useEffect(() => {
    setDateValue(sentAt?.slice(0, 10) ?? "");
  }, [sentAt]);

  function save(next: string | null) {
    onError(null);
    startLocal(async () => {
      const result = await setMemberGreetingPostSentAt(userId, next);
      if (!result.ok) {
        onError(result.error);
        return;
      }
      onSaved();
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="inline-flex flex-wrap items-center gap-2">
        {sentAt ? (
          <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
            Versendet
          </span>
        ) : (
          <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-900">
            Offen
          </span>
        )}
        {sentAt ? (
          <span className="text-xs text-slate-500">am {formatDE(sentAt)}</span>
        ) : (
          <span className="text-xs text-slate-500">noch kein Begrüßungspost vermerkt</span>
        )}
      </span>
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="date"
          value={dateValue}
          disabled={disabled || pendingLocal}
          onChange={(e) => setDateValue(e.target.value)}
          className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm outline-none focus:ring-2 focus:ring-fc-blue/30 disabled:opacity-50"
          aria-label="Datum Begrüßungspost"
        />
        <button
          type="button"
          disabled={disabled || pendingLocal || !dateValue}
          onClick={() => save(dateValue)}
          className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
        >
          Datum speichern
        </button>
        <button
          type="button"
          disabled={disabled || pendingLocal}
          onClick={() => {
            const today = todayIsoDate();
            setDateValue(today);
            save(today);
          }}
          className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-100 disabled:opacity-50"
        >
          Heute als versendet
        </button>
        {sentAt ? (
          <button
            type="button"
            disabled={disabled || pendingLocal}
            onClick={() => {
              setDateValue("");
              save(null);
            }}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
          >
            Auf offen setzen
          </button>
        ) : null}
      </div>
    </div>
  );
}

function BoardNoteEditor({
  userId,
  note,
  disabled,
  onError,
  onSaved,
}: {
  userId: string;
  note: string;
  disabled?: boolean;
  onError: (msg: string | null) => void;
  onSaved: () => void;
}) {
  const [pendingLocal, startLocal] = useTransition();
  const [value, setValue] = useState(note);

  useEffect(() => {
    setValue(note);
  }, [note]);

  const dirty = value.trim() !== note.trim();
  const hasNote = Boolean(note.trim());

  function save() {
    onError(null);
    startLocal(async () => {
      const result = await saveMemberBoardNote(userId, value);
      if (!result.ok) {
        onError(result.error);
        return;
      }
      onSaved();
    });
  }

  return (
    <div
      className={cn(
        "rounded-2xl border px-4 py-3",
        hasNote
          ? "border-amber-300 bg-amber-50/90"
          : "border-slate-200 bg-slate-50/80",
      )}
    >
      <div className="flex items-start gap-2">
        <StickyNote
          className={cn("mt-0.5 h-4 w-4 shrink-0", hasNote ? "text-amber-700" : "text-slate-500")}
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-900">Interne Bemerkung</p>
          <p className="mt-0.5 text-xs text-slate-600">
            Nur für den Vorstand sichtbar — nicht im Mitgliederprofil und nicht in der App.
          </p>
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value.slice(0, MEMBER_BOARD_NOTE_MAX))}
            disabled={disabled || pendingLocal}
            rows={4}
            maxLength={MEMBER_BOARD_NOTE_MAX}
            placeholder="z. B. nicht kontaktieren, Hinweis zur Barrierefreiheit …"
            className="mt-2 w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-fc-navy/20 focus:ring-2 disabled:opacity-60"
          />
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <span className="text-[11px] text-slate-500">
              {value.trim().length}/{MEMBER_BOARD_NOTE_MAX}
            </span>
            <button
              type="button"
              disabled={disabled || pendingLocal || !dirty}
              onClick={save}
              className="rounded-lg bg-fc-navy px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-fc-navy/90 disabled:opacity-50"
            >
              {pendingLocal ? "Speichert…" : "Speichern"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
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
  if (kind === "chat") return "Gruppenchat";
  if (kind === "live_chat") return "Live-Chat";
  if (kind === "live_question") return "Live-Frage";
  return "Beitrag";
}

export function MemberDetailPanel({
  member,
  warnings,
  ledgerEntries,
  ledgerAvailable,
  contribution,
  contributions = [],
  autoOpenReminder = false,
  autoOpenPaperMail = false,
  initialPaperMailDraft = null,
  initialPaperMailError = null,
}: {
  member: MemberDetailData;
  warnings: MemberWarningRow[];
  ledgerEntries: ClubLedgerRow[];
  ledgerAvailable: boolean;
  /** @deprecated Nutze contributions — primärer/offener Beitrag */
  contribution?: MemberContributionInfo | null;
  contributions?: MemberContributionInfo[];
  autoOpenReminder?: boolean;
  /** Nach manuellem Papier-Antrag: Dialog mit Vorlage „Antrag eingegangen + zahlen“ */
  autoOpenPaperMail?: boolean;
  /** Vom Server vorbereitet (vermeidet Server-Action-Digest beim Auto-Open) */
  initialPaperMailDraft?: InitialPaperMailDraft | null;
  initialPaperMailError?: string | null;
}) {
  const router = useRouter();
  const openContributions = contributions
    .filter((c) => c.status !== "paid")
    .sort((a, b) => {
      const rank = (s: MemberContributionInfo["status"]) => (s === "overdue" ? 0 : 1);
      return rank(a.status) - rank(b.status) || a.calendarYear - b.calendarYear;
    });
  const primaryContribution =
    openContributions[0] ??
    contributions[contributions.length - 1] ??
    contribution ??
    null;
  const [pending, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentSubject, setPaymentSubject] = useState("");
  const [paymentBody, setPaymentBody] = useState("");
  const [paymentSignatures, setPaymentSignatures] = useState<MailSignatureOption[]>([]);
  const [paymentSignatureId, setPaymentSignatureId] = useState("");
  const [paymentSignatureTexts, setPaymentSignatureTexts] = useState<Record<string, string>>({});
  const [paymentActiveSignatureText, setPaymentActiveSignatureText] = useState("");
  const [paymentCalendarYear, setPaymentCalendarYear] = useState<number | null>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentMailKind, setPaymentMailKind] = useState<"reminder" | "application">("reminder");
  const [paymentTo, setPaymentTo] = useState("");
  const paymentEmail = resolvePaymentEmail(member);
  const hasPaymentEmail = Boolean(paymentEmail);

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

  const [visibleWarnings, setVisibleWarnings] = useState(warnings);
  const [warningCount, setWarningCount] = useState(member.warning_count);
  const [activityRefreshNonce, setActivityRefreshNonce] = useState(0);

  useEffect(() => {
    setVisibleWarnings(warnings);
    setWarningCount(member.warning_count);
  }, [warnings, member.warning_count]);

  function handleDelete() {
    if (!window.confirm(`Mitglied „${fullName}" wirklich löschen?`)) return;
    setActionError(null);
    startTransition(async () => {
      try {
        const result = await deleteMember(member.id);
        if (!result.ok) {
          setActionError(result.error);
          return;
        }
        router.replace("/admin/members");
        router.refresh();
      } catch (e) {
        setActionError(
          userFacingActionError(e, "Mitglied konnte nicht gelöscht werden. Bitte erneut versuchen."),
        );
      }
    });
  }

  async function openPaymentDialog(
    calendarYear?: number,
    kind: "reminder" | "application" = "reminder",
  ) {
    setActionError(null);
    setPaymentLoading(true);
    setPaymentCalendarYear(calendarYear ?? null);
    setPaymentMailKind(kind);
    try {
      if (kind === "application") {
        const draft = await getMemberApplicationPaymentDraft(member.id);
        if (!draft.ok) {
          setActionError(draft.error);
          return;
        }
        setPaymentSubject(draft.subject);
        setPaymentBody(draft.body);
        setPaymentSignatures(draft.signatures);
        setPaymentSignatureId(draft.defaultSignatureId);
        setPaymentSignatureTexts(draft.signatureTexts);
        setPaymentActiveSignatureText(draft.signatureTexts[draft.defaultSignatureId] ?? "");
        setPaymentTo(draft.to);
      } else {
        const draft = await getMemberPaymentReminderDraft(member.id, undefined, calendarYear);
        setPaymentSubject(draft.subject);
        setPaymentBody(draft.body);
        setPaymentSignatures(draft.signatures);
        setPaymentSignatureId(draft.defaultSignatureId);
        setPaymentSignatureTexts(draft.signatureTexts);
        setPaymentActiveSignatureText(draft.signatureTexts[draft.defaultSignatureId] ?? "");
        setPaymentTo(draft.to);
      }
      setShowPaymentDialog(true);
    } catch (e) {
      setActionError(
        userFacingActionError(
          e,
          kind === "application"
            ? "Vorlage „Antrag / Zahlungsinfo“ konnte nicht geladen werden. Bitte erneut versuchen."
            : "Zahlungserinnerungs-Vorlage konnte nicht geladen werden. Bitte erneut versuchen.",
        ),
      );
    } finally {
      setPaymentLoading(false);
    }
  }

  const isApplied = member.membership?.status === "applied";

  function applyPaperMailDraft(draft: InitialPaperMailDraft) {
    setPaymentMailKind("application");
    setPaymentSubject(draft.subject);
    setPaymentBody(draft.body);
    setPaymentSignatures(draft.signatures);
    setPaymentSignatureId(draft.defaultSignatureId);
    setPaymentSignatureTexts(draft.signatureTexts);
    setPaymentActiveSignatureText(draft.signatureTexts[draft.defaultSignatureId] ?? "");
    setPaymentTo(draft.to ?? paymentEmail ?? "");
    setShowPaymentDialog(true);
  }

  useEffect(() => {
    if (!hasPaymentEmail) return;

    if (autoOpenPaperMail) {
      if (initialPaperMailDraft) {
        applyPaperMailDraft(initialPaperMailDraft);
      } else if (initialPaperMailError) {
        setActionError(initialPaperMailError);
      } else {
        void openPaymentDialog(undefined, "application");
      }
      // Query-Param entfernen ohne RSC-Remount (sonst schließt der Dialog wieder)
      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        if (url.searchParams.has("paperMail")) {
          url.searchParams.delete("paperMail");
          window.history.replaceState(null, "", url.pathname + (url.search ? url.search : ""));
        }
      }
      return;
    }

    if (autoOpenReminder) {
      void openPaymentDialog(undefined, isApplied ? "application" : "reminder");
    }
    // nur einmal beim Öffnen mit ?paperMail=1 / ?remind=1
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoOpenPaperMail, autoOpenReminder, member.id]);

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
        const result = await revokeMemberWarning(warningId);
        setVisibleWarnings((prev) => prev.filter((w) => w.id !== warningId));
        setWarningCount(result.warningCount);
        setActivityRefreshNonce((n) => n + 1);
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

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={pending || paymentLoading || !hasPaymentEmail}
            onClick={() =>
              void openPaymentDialog(undefined, isApplied ? "application" : "reminder")
            }
            className={
              primaryContribution && primaryContribution.status !== "paid"
                ? "inline-flex h-10 items-center gap-2 rounded-xl bg-amber-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-700 disabled:opacity-50"
                : "fc-btn-secondary inline-flex h-10 items-center gap-2 disabled:opacity-50"
            }
          >
            <Mail className="h-4 w-4 shrink-0" aria-hidden />
            <span>
              {paymentLoading
                ? "Lade…"
                : isApplied
                  ? "Zahlungsinfo senden"
                  : "Zahlungserinnerung senden"}
            </span>
          </button>
        {member.membership?.status === "active" ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => {
                const reason = window.prompt(
                  "Grund der Deaktivierung (optional, wird dem Mitglied angezeigt):",
                  "Offener Mitgliedsbeitrag — bitte Vorstand kontaktieren.",
                );
              if (reason === null) return;
              setActionError(null);
              startTransition(async () => {
                try {
                  await suspendMemberAppAccess({ userId: member.id, reason });
                  router.refresh();
                } catch (e) {
                  setActionError(e instanceof Error ? e.message : "Deaktivierung fehlgeschlagen");
                }
              });
            }}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 text-sm font-semibold text-rose-800 transition hover:bg-rose-100 disabled:opacity-50"
          >
            <Ban className="h-4 w-4 shrink-0" aria-hidden />
            <span>Vorübergehend deaktivieren</span>
          </button>
        ) : null}
        {member.membership?.status === "suspended" ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              if (!window.confirm("App-Zugang für dieses Mitglied wieder freischalten?")) return;
              setActionError(null);
              startTransition(async () => {
                try {
                  await reactivateMemberAppAccess(member.id);
                  router.refresh();
                } catch (e) {
                  setActionError(e instanceof Error ? e.message : "Freischaltung fehlgeschlagen");
                }
              });
            }}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 text-sm font-semibold text-emerald-900 transition hover:bg-emerald-100 disabled:opacity-50"
          >
            <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden />
            <span>App freischalten</span>
          </button>
        ) : null}
        </div>
        <div className="flex items-center gap-2">
          <AdminIconButton
            label="Bearbeiten"
            icon={Pencil}
            variant="edit"
            href={`/admin/members/${member.id}/edit`}
          />
          <AdminIconButton
          label="Mitglied löschen"
          icon={Trash2}
          variant="delete"
          disabled={pending}
          onClick={handleDelete}
        />
        </div>
      </div>

      <BoardNoteEditor
        userId={member.id}
        note={member.board_note}
        disabled={pending}
        onError={setActionError}
        onSaved={() => router.refresh()}
      />

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex flex-wrap items-center gap-2">
              Stammdaten
              {member.no_app_access ? (
                <Badge variant="neutral" className="font-semibold">
                  Kein App-/WhatsApp-Zugang
                </Badge>
              ) : null}
              {warningCount > 0 ? (
                <Badge variant="danger" className="inline-flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" aria-hidden />
                  {warningCount} Verwarnung{warningCount === 1 ? "" : "en"}
                </Badge>
              ) : null}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl>
              <InfoRow label="Mitgliedsnr." value={member.membership_number ?? "—"} />
              <InfoRow label="Name" value={fullName} />
              {member.no_app_access ? (
                <>
                  <InfoRow
                    label="E-Mail (nur Beitrag)"
                    value={member.billing_email?.trim() || "—"}
                  />
                  <InfoRow
                    label="App / WhatsApp"
                    value="Kein eigener Zugang — nicht in die App und nicht in die WhatsApp-Gruppe aufnehmen."
                  />
                </>
              ) : (
                <InfoRow label="E-Mail" value={member.email ?? "—"} />
              )}
              <InfoRow label="Benutzername" value={member.username ?? "—"} />
              <InfoRow label="Mobil" value={member.phone ?? "—"} />
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
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Mitgliedschaft</CardTitle>
          </CardHeader>
          <CardContent>
            {member.membership?.status === "applied" ? (
              <p className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                Noch kein Mitglied. Beitrag steht aus — über „Zahlungsinfo senden“ die Mail mit
                Antragseingang und Überweisungsdaten (editierbar) schicken. Wenn das Geld da ist:
                unter Zahlungen bestätigen, Beitrittsdatum eintragen und Status auf „aktiv“ setzen.
                Erst dann gibt es Mitgliedsnummer und App-Zugang.
              </p>
            ) : null}
            <dl>
              <InfoRow label="Status" value={membershipStatusLabel(member.membership?.status ?? "")} />
              {member.membership?.status === "suspended" && member.membership.suspension_reason ? (
                <InfoRow label="Sperrgrund" value={member.membership.suspension_reason} />
              ) : null}
              <InfoRow
                label="In App registriert"
                value={
                  <span className="inline-flex flex-col items-start gap-2">
                    <span className="inline-flex flex-wrap items-center gap-2">
                      <span
                        className={cn(
                          "inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold",
                          appRegistrationBadgeClass(member.app_registration_status),
                        )}
                      >
                        {appRegistrationStatusLabel(member.app_registration_status, {
                          noAppAccess: member.no_app_access,
                        })}
                      </span>
                      {member.app_registered_at && member.app_registration_status === "registered" ? (
                        <span className="text-xs text-slate-500">
                          seit {formatWhen(member.app_registered_at)}
                        </span>
                      ) : null}
                    </span>
                    <span className="inline-flex flex-wrap gap-2">
                      {member.no_app_access ? (
                        <span className="text-xs text-slate-600">
                          Bewusst ohne App — keine Einladung senden, nicht in die WhatsApp-Gruppe.
                        </span>
                      ) : (
                        <>
                      {member.app_registration_status !== "deleted" ? (
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => {
                            if (
                              !window.confirm(
                                "App-Registrierung als „Gelöscht“ markieren? (Mitglied bleibt erhalten.)",
                              )
                            ) {
                              return;
                            }
                            setActionError(null);
                            startTransition(async () => {
                              try {
                                await markMemberAppRegistrationDeleted(member.id);
                                router.refresh();
                              } catch (e) {
                                setActionError(
                                  e instanceof Error ? e.message : "Markieren fehlgeschlagen",
                                );
                              }
                            });
                          }}
                          className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                        >
                          Als gelöscht markieren
                        </button>
                      ) : null}
                      {member.app_registration_status !== "open" ? (
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => {
                            if (
                              !window.confirm(
                                "Registrierungsstatus auf „Offen“ zurücksetzen?",
                              )
                            ) {
                              return;
                            }
                            setActionError(null);
                            startTransition(async () => {
                              try {
                                await clearMemberAppRegistration(member.id);
                                router.refresh();
                              } catch (e) {
                                setActionError(
                                  e instanceof Error ? e.message : "Zurücksetzen fehlgeschlagen",
                                );
                              }
                            });
                          }}
                          className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                        >
                          Auf Offen zurücksetzen
                        </button>
                      ) : null}
                        </>
                      )}
                    </span>
                  </span>
                }
              />
              <InfoRow
                label="Begrüßungspost"
                value={
                  <GreetingPostEditor
                    userId={member.id}
                    sentAt={member.greeting_post_sent_at}
                    disabled={pending}
                    onError={setActionError}
                    onSaved={() => router.refresh()}
                  />
                }
              />
              <InfoRow
                label="Beitrittsdatum"
                value={
                  member.membership?.status === "applied"
                    ? "noch nicht (nach Zahlung)"
                    : formatDE(member.membership?.start_date ?? null)
                }
              />
              <InfoRow
                label="Ende"
                value={
                  member.membership?.status === "applied"
                    ? "—"
                    : formatDE(member.membership?.end_date ?? null)
                }
              />
              <InfoRow label="Jahresbeitrag" value={`${feeEur} €`} />
              <InfoRow
                label="Beiträge"
                value={
                  contributions.length ? (
                    <ul className="space-y-2">
                      {contributions.map((c) => (
                        <li
                          key={c.calendarYear}
                          className="flex flex-wrap items-center gap-2 border-b border-slate-100 pb-2 last:border-0 last:pb-0"
                        >
                          <ContributionStatusBadge status={c.status} />
                          <span className="text-xs text-slate-600">
                            <span className="block">
                              {c.calendarYear}:{" "}
                              {c.status === "paid"
                                ? "bezahlt"
                                : `offen ${formatEur(c.openCents)}`}
                            </span>
                            {c.status !== "paid" ? (
                              <span className="block">
                                VWZ: <span className="font-mono">{c.paymentReference}</span>
                              </span>
                            ) : null}
                          </span>
                          {c.status !== "paid" ? (
                            <button
                              type="button"
                              disabled={pending || paymentLoading || !hasPaymentEmail}
                              onClick={() =>
                                void openPaymentDialog(
                                  c.calendarYear,
                                  isApplied ? "application" : "reminder",
                                )
                              }
                              className="text-xs font-semibold text-amber-800 underline-offset-2 hover:underline disabled:opacity-50"
                            >
                              {isApplied ? "Zahlungsinfo senden" : "Zahlungserinnerung senden"}
                            </button>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  ) : primaryContribution ? (
                    <span className="inline-flex flex-wrap items-center gap-2">
                      <ContributionStatusBadge status={primaryContribution.status} />
                      <span className="text-xs text-slate-600">
                        {primaryContribution.periodLabel}
                      </span>
                    </span>
                  ) : (
                    "—"
                  )
                }
              />
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

      {visibleWarnings.length > 0 ? (
        <Card className="border-rose-200">
          <CardHeader>
            <CardTitle className="text-rose-900">Verwarnungen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {visibleWarnings.map((w) => (
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
        <MemberActivityTimeline
          userId={member.id}
          applicationId={null}
          refreshNonce={activityRefreshNonce}
        />
      </div>

      {showPaymentDialog ? (
        <EmailDialogShell
          title={
            paymentMailKind === "application"
              ? "Antrag / Zahlungsinfo senden"
              : "Zahlungserinnerung senden"
          }
          description={
            paymentMailKind === "application"
              ? `An ${paymentTo || paymentEmail || "—"} · Vorlage editierbar · Versand optional · kein App-Zugangslink`
              : `An ${paymentTo || paymentEmail || "—"} · offener Jahresbeitrag`
          }
          onClose={() => setShowPaymentDialog(false)}
          footer={
            <button
              type="button"
              disabled={pending || !paymentSignatureId}
              className="h-10 rounded-xl bg-fc-navy px-4 text-sm font-semibold text-white disabled:opacity-50"
              onClick={() => {
                startTransition(async () => {
                  try {
                    if (paymentMailKind === "application") {
                      const result = await sendMemberApplicationPaymentEmail({
                        userId: member.id,
                        subject: paymentSubject,
                        body: paymentBody,
                        signatureId: paymentSignatureId,
                      });
                      if (!result.ok) {
                        setActionError(result.error);
                        return;
                      }
                    } else {
                      await sendMemberPaymentReminderEmail({
                        userId: member.id,
                        subject: paymentSubject,
                        body: paymentBody,
                        signatureId: paymentSignatureId,
                        calendarYear: paymentCalendarYear ?? undefined,
                      });
                    }
                    setShowPaymentDialog(false);
                    router.refresh();
                  } catch (e) {
                    setActionError(
                      userFacingActionError(
                        e,
                        "E-Mail konnte nicht gesendet werden. Bitte erneut versuchen oder SMTP prüfen.",
                      ),
                    );
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
