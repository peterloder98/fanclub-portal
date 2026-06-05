"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import { membershipStatusLabel } from "@/lib/membership/provision-applicant";
import {
  approveMembershipApplicationWithNumber,
  deleteMembershipApplication,
  getPaymentReminderDraft,
  rejectMembershipApplication,
  sendPaymentReminderEmail,
} from "@/app/(app)/admin/members/applications/actions";
import { MemberActivityTimeline } from "@/components/admin/member-activity-timeline";
import { ContributionStatusBadge } from "@/components/admin/contribution-status-badge";
import type { ContributionStatus } from "@/lib/club/membership-contribution";
import { replaceTrailingSignature } from "@/lib/email/signature-body";
import { MEMBERSHIP_NUMBER_PENDING_LABEL } from "@/lib/membership/numbers";
import { EmailDialogShell } from "@/components/ui/email-dialog-shell";
import type { MailSignatureOption } from "@/lib/email/signatures";

export type AdminMemberRow = {
  id: string;
  membership_number: string | null;
  first_name: string;
  last_name: string;
  birthdate: string | null;
  joined_at: string | null;
  warning_count: number;
  membership_status: string | null;
  contribution_status: ContributionStatus | null;
  contribution_open_cents: number | null;
  email: string | null;
};

export type AdminApplicationRow = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  status: string;
  created_at: string;
  user_id: string | null;
  membership_number: string | null;
};

type MemberSortKey =
  | "membership_number"
  | "first_name"
  | "last_name"
  | "birthdate"
  | "joined_at"
  | "warning_count"
  | "membership_status"
  | "contribution_status";
type AppSortKey = "created_at" | "last_name" | "email" | "status";

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

function compareStr(a: string, b: string) {
  return a.localeCompare(b, "de", { numeric: true, sensitivity: "base" });
}

function SortBtn({
  label,
  active,
  dir,
  onClick,
}: {
  label: string;
  active: boolean;
  dir: "asc" | "desc";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 font-semibold text-slate-700 hover:text-slate-900",
        active && "text-blue-700",
      )}
    >
      {label}
      {active ? <span className="text-[10px]">{dir === "asc" ? "▲" : "▼"}</span> : null}
    </button>
  );
}

function WarningCountBadge({ count }: { count: number }) {
  if (count <= 0) {
    return <span className="text-slate-500">0</span>;
  }
  return (
    <span
      className="inline-flex items-center gap-1 font-semibold text-rose-700"
      title={`${count} Verwarnung${count === 1 ? "" : "en"}`}
    >
      <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden />
      {count}
    </span>
  );
}

export function AdminMembersWorkspace({
  members,
  applications,
  membersError,
  applicationsError,
}: {
  members: AdminMemberRow[];
  applications: AdminApplicationRow[];
  membersError: string | null;
  applicationsError: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [memberSort, setMemberSort] = useState<{ key: MemberSortKey; dir: "asc" | "desc" }>({
    key: "membership_number",
    dir: "asc",
  });
  const [appSort, setAppSort] = useState<{ key: AppSortKey; dir: "asc" | "desc" }>({
    key: "created_at",
    dir: "desc",
  });
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentSubject, setPaymentSubject] = useState("");
  const [paymentBody, setPaymentBody] = useState("");
  const [paymentSignatures, setPaymentSignatures] = useState<MailSignatureOption[]>([]);
  const [paymentSignatureId, setPaymentSignatureId] = useState("");
  const [paymentSignatureTexts, setPaymentSignatureTexts] = useState<Record<string, string>>({});
  const [paymentActiveSignatureText, setPaymentActiveSignatureText] = useState("");
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  function applicationStatusLabel(status: string) {
    switch (status) {
      case "submitted":
        return "Eingegangen";
      case "reviewed":
        return "In Prüfung";
      case "approved":
        return "Freigegeben";
      case "rejected":
        return "Abgelehnt";
      default:
        return status;
    }
  }

  function applicationStatusVariant(status: string): "warning" | "success" | "neutral" | "danger" {
    if (status === "approved") return "success";
    if (status === "rejected") return "danger";
    if (status === "reviewed") return "neutral";
    return "warning";
  }

  function toggleMemberSort(key: MemberSortKey) {
    setMemberSort((s) =>
      s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" },
    );
  }

  function toggleAppSort(key: AppSortKey) {
    setAppSort((s) =>
      s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" },
    );
  }

  const sortedMembers = useMemo(() => {
    const rows = [...members];
    const dir = memberSort.dir === "asc" ? 1 : -1;
    rows.sort((a, b) => {
      const pick = (r: AdminMemberRow) => {
        switch (memberSort.key) {
          case "membership_number":
            return r.membership_number ?? "";
          case "first_name":
            return r.first_name;
          case "last_name":
            return r.last_name;
          case "birthdate":
            return r.birthdate ?? "";
          case "joined_at":
            return r.joined_at ?? "";
          case "warning_count":
            return String(r.warning_count);
          case "membership_status":
            return r.membership_status ?? "";
          case "contribution_status":
            return r.contribution_status ?? "";
        }
      };
      return compareStr(pick(a), pick(b)) * dir;
    });
    return rows;
  }, [members, memberSort]);

  const sortedApps = useMemo(() => {
    const rows = [...applications];
    const dir = appSort.dir === "asc" ? 1 : -1;
    rows.sort((a, b) => {
      const pick = (r: AdminApplicationRow) => {
        switch (appSort.key) {
          case "created_at":
            return r.created_at;
          case "last_name":
            return `${r.last_name} ${r.first_name}`;
          case "email":
            return r.email;
          case "status":
            return r.status;
        }
      };
      return compareStr(pick(a), pick(b)) * dir;
    });
    return rows;
  }, [applications, appSort]);

  const selectedApp = sortedApps.find((a) => a.id === selectedAppId) ?? null;


  function openApproveDialog() {
    if (!selectedApp) return;
    if (selectedApp.status === "rejected") {
      setActionError("Abgelehnte Anträge können nicht freigegeben werden.");
      return;
    }
    setShowApproveDialog(true);
    setActionError(null);
  }

  const selectedAppActionable =
    selectedApp && selectedApp.status !== "approved" && selectedApp.status !== "rejected";

  async function loadPaymentDraft(appId: string, signatureId?: string) {
    setPaymentLoading(true);
    try {
      const draft = await getPaymentReminderDraft(appId, signatureId);
      setPaymentSubject(draft.subject);
      setPaymentBody(draft.body);
      setPaymentSignatures(draft.signatures);
      setPaymentSignatureId(draft.defaultSignatureId);
      setPaymentSignatureTexts(draft.signatureTexts);
      setPaymentActiveSignatureText(draft.signatureTexts[draft.defaultSignatureId] ?? "");
      return true;
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Vorlage konnte nicht geladen werden");
      return false;
    } finally {
      setPaymentLoading(false);
    }
  }

  async function openPaymentDialog() {
    if (!selectedAppId) return;
    setActionError(null);
    const ok = await loadPaymentDraft(selectedAppId);
    if (ok) setShowPaymentDialog(true);
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

  return (
    <div className="grid gap-4">
      {actionError ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {actionError}
        </div>
      ) : null}

      <Card className="border-amber-200 bg-amber-50/30">
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2">
            Mitgliedschaftsanträge
            {applications.length ? <Badge variant="warning">{applications.length}</Badge> : null}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={!selectedAppActionable || pending}
              onClick={() => openApproveDialog()}
              className="h-10 rounded-xl bg-emerald-700 px-4 text-sm font-semibold text-white disabled:opacity-50"
            >
              Mitgliedsantrag freigeben
            </button>
            <button
              type="button"
              disabled={!selectedAppActionable || pending}
              onClick={() => void openPaymentDialog()}
              className="h-10 rounded-xl border bg-white px-4 text-sm font-semibold text-slate-700 disabled:opacity-50"
            >
              Zahlungserinnerung per E-Mail
            </button>
            <button
              type="button"
              disabled={!selectedAppActionable || pending}
              onClick={() => {
                setRejectReason("");
                setShowRejectDialog(true);
                setActionError(null);
              }}
              className="h-10 rounded-xl border border-amber-200 bg-amber-50 px-4 text-sm font-semibold text-amber-900 disabled:opacity-50"
            >
              Antrag ablehnen
            </button>
            <button
              type="button"
              disabled={!selectedAppId || pending}
              onClick={() => {
                if (!selectedApp) return;
                const label = `${selectedApp.first_name} ${selectedApp.last_name}`;
                if (
                  !window.confirm(
                    `Antrag von „${label}“ vollständig löschen?\n\nDatensatz, PDF, Unterschriften und ggf. Test-Benutzerkonto werden unwiderruflich entfernt.`,
                  )
                ) {
                  return;
                }
                setActionError(null);
                const appId = selectedApp.id;
                startTransition(async () => {
                  try {
                    await deleteMembershipApplication(appId);
                    setSelectedAppId(null);
                    router.refresh();
                  } catch (e) {
                    setActionError(e instanceof Error ? e.message : "Löschen fehlgeschlagen");
                  }
                });
              }}
              className="h-10 rounded-xl border border-rose-200 bg-rose-50 px-4 text-sm font-semibold text-rose-800 disabled:opacity-50"
            >
              Antrag komplett löschen
            </button>
            <Link
              href={selectedAppId ? `/admin/members/applications/${selectedAppId}` : "#"}
              className={cn(
                "inline-flex h-10 items-center rounded-xl border bg-white px-4 text-sm font-semibold text-blue-700",
                !selectedAppId && "pointer-events-none opacity-50",
              )}
            >
              Antrag & PDF
            </Link>
          </div>

          {applicationsError ? (
            <div className="text-rose-700">{applicationsError}</div>
          ) : sortedApps.length === 0 ? (
            <div className="text-slate-600">Keine offenen Anträge.</div>
          ) : (
            <>
            <div className="grid gap-2 md:hidden">
              {sortedApps.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setSelectedAppId(a.id)}
                  className={cn(
                    "w-full rounded-xl border bg-white p-3 text-left transition",
                    selectedAppId === a.id && "border-blue-300 bg-blue-50/60",
                  )}
                >
                  <div className="flex items-start gap-2">
                    <input
                      type="radio"
                      checked={selectedAppId === a.id}
                      onChange={() => setSelectedAppId(a.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="mt-1"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-slate-900">
                        {a.first_name} {a.last_name}
                      </div>
                      <div className="mt-0.5 truncate text-xs text-slate-600">{a.email}</div>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                        <span className="text-slate-500">{formatDE(a.created_at)}</span>
                        <Badge variant={applicationStatusVariant(a.status)}>
                          {applicationStatusLabel(a.status)}
                        </Badge>
                        <span className="text-slate-500">
                          {a.membership_number ?? MEMBERSHIP_NUMBER_PENDING_LABEL}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
            <div className="hidden overflow-x-auto rounded-xl border bg-white md:block">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="border-b bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
                  <tr>
                    <th className="px-3 py-2 w-10" />
                    <th className="px-3 py-2">
                      <SortBtn
                        label="Mitgliedsnr."
                        active={false}
                        dir="asc"
                        onClick={() => {}}
                      />
                    </th>
                    <th className="px-3 py-2">
                      <SortBtn
                        label="Name"
                        active={appSort.key === "last_name"}
                        dir={appSort.dir}
                        onClick={() => toggleAppSort("last_name")}
                      />
                    </th>
                    <th className="px-3 py-2">
                      <SortBtn
                        label="E-Mail"
                        active={appSort.key === "email"}
                        dir={appSort.dir}
                        onClick={() => toggleAppSort("email")}
                      />
                    </th>
                    <th className="px-3 py-2">
                      <SortBtn
                        label="Eingang"
                        active={appSort.key === "created_at"}
                        dir={appSort.dir}
                        onClick={() => toggleAppSort("created_at")}
                      />
                    </th>
                    <th className="px-3 py-2">
                      <SortBtn
                        label="Status"
                        active={appSort.key === "status"}
                        dir={appSort.dir}
                        onClick={() => toggleAppSort("status")}
                      />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedApps.map((a) => (
                    <tr
                      key={a.id}
                      onClick={() => setSelectedAppId(a.id)}
                      className={cn(
                        "cursor-pointer border-b transition hover:bg-slate-50",
                        selectedAppId === a.id && "bg-blue-50/60",
                      )}
                    >
                      <td className="px-3 py-2">
                        <input
                          type="radio"
                          checked={selectedAppId === a.id}
                          onChange={() => setSelectedAppId(a.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </td>
                      <td className="px-3 py-2 tabular-nums text-slate-600">
                        {a.membership_number ?? MEMBERSHIP_NUMBER_PENDING_LABEL}
                      </td>
                      <td className="px-3 py-2 font-medium text-slate-900">
                        {a.first_name} {a.last_name}
                      </td>
                      <td className="px-3 py-2 text-slate-600">{a.email}</td>
                      <td className="px-3 py-2">{formatDE(a.created_at)}</td>
                      <td className="px-3 py-2">
                        <Badge variant={applicationStatusVariant(a.status)}>
                          {applicationStatusLabel(a.status)}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </>
          )}

          {selectedApp ? (
            <div className="mt-4">
              <MemberActivityTimeline
                userId={selectedApp.user_id}
                applicationId={selectedApp.id}
              />
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Mitgliederliste</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-xs text-slate-500">
            Zeile oder Karte anklicken öffnet den Mitgliedsdatensatz.
          </p>

          {membersError ? (
            <div className="text-rose-700">{membersError}</div>
          ) : sortedMembers.length === 0 ? (
            <div className="text-slate-600">Keine Mitglieder gefunden.</div>
          ) : (
            <>
            <div className="grid gap-2 md:hidden">
              {sortedMembers.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => router.push(`/admin/members/${m.id}`)}
                  className="w-full rounded-xl border bg-white p-3 text-left transition hover:border-slate-300 hover:bg-slate-50"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate font-semibold text-slate-900">
                        {m.first_name} {m.last_name}
                      </div>
                      <div className="mt-0.5 text-xs text-slate-500">
                        Nr. {m.membership_number ?? "—"}
                      </div>
                    </div>
                    <WarningCountBadge count={m.warning_count} />
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                    {m.membership_status ? (
                      <Badge
                        variant={
                          m.membership_status === "active"
                            ? "success"
                            : m.membership_status === "applied"
                              ? "warning"
                              : "neutral"
                        }
                      >
                        {membershipStatusLabel(m.membership_status)}
                      </Badge>
                    ) : null}
                    {m.contribution_status ? (
                      <ContributionStatusBadge status={m.contribution_status} />
                    ) : null}
                    <span className="text-slate-500">Beitritt {formatDE(m.joined_at)}</span>
                  </div>
                </button>
              ))}
            </div>
            <div className="hidden overflow-x-auto rounded-xl border bg-white md:block">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="border-b bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
                  <tr>
                    <th className="px-3 py-2">
                      <SortBtn
                        label="Mitgliedsnr."
                        active={memberSort.key === "membership_number"}
                        dir={memberSort.dir}
                        onClick={() => toggleMemberSort("membership_number")}
                      />
                    </th>
                    <th className="px-3 py-2">
                      <SortBtn
                        label="Vorname"
                        active={memberSort.key === "first_name"}
                        dir={memberSort.dir}
                        onClick={() => toggleMemberSort("first_name")}
                      />
                    </th>
                    <th className="px-3 py-2">
                      <SortBtn
                        label="Nachname"
                        active={memberSort.key === "last_name"}
                        dir={memberSort.dir}
                        onClick={() => toggleMemberSort("last_name")}
                      />
                    </th>
                    <th className="px-3 py-2">
                      <SortBtn
                        label="Geb. Datum"
                        active={memberSort.key === "birthdate"}
                        dir={memberSort.dir}
                        onClick={() => toggleMemberSort("birthdate")}
                      />
                    </th>
                    <th className="px-3 py-2">
                      <SortBtn
                        label="Beitrittsdatum"
                        active={memberSort.key === "joined_at"}
                        dir={memberSort.dir}
                        onClick={() => toggleMemberSort("joined_at")}
                      />
                    </th>
                    <th className="px-3 py-2">
                      <SortBtn
                        label="Verwarn."
                        active={memberSort.key === "warning_count"}
                        dir={memberSort.dir}
                        onClick={() => toggleMemberSort("warning_count")}
                      />
                    </th>
                    <th className="px-3 py-2">
                      <SortBtn
                        label="Status"
                        active={memberSort.key === "membership_status"}
                        dir={memberSort.dir}
                        onClick={() => toggleMemberSort("membership_status")}
                      />
                    </th>
                    <th className="px-3 py-2">
                      <SortBtn
                        label="Beitrag"
                        active={memberSort.key === "contribution_status"}
                        dir={memberSort.dir}
                        onClick={() => toggleMemberSort("contribution_status")}
                      />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedMembers.map((m) => (
                    <tr
                      key={m.id}
                      onClick={() => router.push(`/admin/members/${m.id}`)}
                      className="cursor-pointer border-b transition hover:bg-slate-50"
                    >
                      <td className="px-3 py-2 tabular-nums font-medium text-slate-900">
                        {m.membership_number ?? "—"}
                      </td>
                      <td className="px-3 py-2">{m.first_name}</td>
                      <td className="px-3 py-2">{m.last_name}</td>
                      <td className="px-3 py-2">{formatDE(m.birthdate)}</td>
                      <td className="px-3 py-2">{formatDE(m.joined_at)}</td>
                      <td className="px-3 py-2 tabular-nums">
                        <WarningCountBadge count={m.warning_count} />
                      </td>
                      <td className="px-3 py-2">
                        {m.membership_status ? (
                          <Badge
                            variant={
                              m.membership_status === "active"
                                ? "success"
                                : m.membership_status === "applied"
                                  ? "warning"
                                  : "neutral"
                            }
                          >
                            {membershipStatusLabel(m.membership_status)}
                          </Badge>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {m.contribution_status ? (
                          <ContributionStatusBadge status={m.contribution_status} compact />
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </>
          )}

        </CardContent>
      </Card>

      {showApproveDialog && selectedApp ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-2xl border bg-white p-5 shadow-xl">
            <h3 className="text-base font-semibold text-slate-900">Antrag freigeben</h3>
            <p className="mt-1 text-sm text-slate-600">
              {selectedApp.first_name} {selectedApp.last_name} — Status wird auf „aktiv“ gesetzt.
              Die nächste freie Mitgliedsnummer wird automatisch vergeben; der Vertrag-PDF wird
              ergänzt und im Mitgliedsdatensatz hinterlegt.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="h-10 rounded-xl border px-4 text-sm font-semibold"
                onClick={() => setShowApproveDialog(false)}
              >
                Abbrechen
              </button>
              <button
                type="button"
                disabled={pending}
                className="h-10 rounded-xl bg-emerald-700 px-4 text-sm font-semibold text-white disabled:opacity-50"
                onClick={() => {
                  startTransition(async () => {
                    try {
                      await approveMembershipApplicationWithNumber(selectedApp.id);
                    } catch (e) {
                      setActionError(e instanceof Error ? e.message : "Freigabe fehlgeschlagen");
                      setShowApproveDialog(false);
                    }
                  });
                }}
              >
                Freigeben
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showRejectDialog && selectedApp ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-2xl border bg-white p-5 shadow-xl">
            <h3 className="text-base font-semibold text-slate-900">Antrag ablehnen</h3>
            <p className="mt-1 text-sm text-slate-600">
              {selectedApp.first_name} {selectedApp.last_name} — Status wird auf „abgelehnt“ gesetzt
              (z. B. keine Zahlung oder Aufnahme nicht gewünscht).
            </p>
            <label className="mt-4 grid gap-1">
              <span className="text-sm font-medium text-slate-700">Grund (optional, intern)</span>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
                className="rounded-xl border px-3 py-2 text-sm"
                placeholder="z. B. Mitgliedsbeitrag nicht eingegangen"
              />
            </label>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="h-10 rounded-xl border px-4 text-sm font-semibold"
                onClick={() => setShowRejectDialog(false)}
              >
                Abbrechen
              </button>
              <button
                type="button"
                disabled={pending}
                className="h-10 rounded-xl bg-amber-700 px-4 text-sm font-semibold text-white disabled:opacity-50"
                onClick={() => {
                  startTransition(async () => {
                    try {
                      await rejectMembershipApplication({
                        applicationId: selectedApp.id,
                        reason: rejectReason,
                      });
                      setShowRejectDialog(false);
                      setSelectedAppId(null);
                      router.refresh();
                    } catch (e) {
                      setActionError(e instanceof Error ? e.message : "Ablehnen fehlgeschlagen");
                      setShowRejectDialog(false);
                    }
                  });
                }}
              >
                Ablehnen
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showPaymentDialog && selectedAppId ? (
        <EmailDialogShell
          title="Zahlungserinnerung"
          description="Vorlage unter Admin → E-Mail-Vorlagen. Signatur unter Admin → Unterschriften."
          onClose={() => setShowPaymentDialog(false)}
          footer={
            <button
              type="button"
              disabled={pending || paymentLoading || !paymentSignatureId}
              className="h-10 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white disabled:opacity-50"
              onClick={() => {
                startTransition(async () => {
                  try {
                    await sendPaymentReminderEmail({
                      applicationId: selectedAppId,
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
              disabled={paymentLoading}
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
