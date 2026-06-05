"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  addClubLedgerEntry,
  deleteClubLedgerEntry,
  updateClubLedgerEntry,
} from "@/app/(app)/admin/members/detail-actions";
import { cn } from "@/lib/cn";
import {
  filterLedgerByPeriod,
  formatEur,
  ledgerYearOptions,
  LEDGER_CATEGORY_LABELS,
  sumLedgerRows,
  type ClubLedgerRow,
  type LedgerCategory,
  type LedgerPeriodMode,
} from "@/lib/club/ledger";
import type { MemberContributionInfo } from "@/lib/club/membership-contribution";
import { ContributionStatusBadge } from "@/components/admin/contribution-status-badge";
import { ReceiptLink } from "@/components/admin/receipt-link";
import {
  DocumentUploadField,
  uploadClubDocument,
} from "@/components/ui/document-upload-field";

const MONTHS = [
  "Januar",
  "Februar",
  "März",
  "April",
  "Mai",
  "Juni",
  "Juli",
  "August",
  "September",
  "Oktober",
  "November",
  "Dezember",
];

type LedgerSortKey = "entry_date" | "entry_type" | "amount_cents" | "category" | "description";

function formatDE(date: string | null) {
  if (!date) return "—";
  const [y, m, d] = date.split("-");
  return `${d}.${m}.${y}`;
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

export function ClubAccountingPanel({
  entries,
  openContributions,
  ledgerAvailable,
}: {
  entries: ClubLedgerRow[];
  openContributions: MemberContributionInfo[];
  ledgerAvailable: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [periodMode, setPeriodMode] = useState<LedgerPeriodMode>("all");
  const now = new Date();
  const [filterYear, setFilterYear] = useState(now.getFullYear());
  const [filterMonth, setFilterMonth] = useState(now.getMonth() + 1);
  const [ledgerType, setLedgerType] = useState<"income" | "expense">("income");
  const [ledgerAmount, setLedgerAmount] = useState("");
  const [ledgerDesc, setLedgerDesc] = useState("");
  const [ledgerCategory, setLedgerCategory] = useState<LedgerCategory>("general");
  const [ledgerDate, setLedgerDate] = useState(now.toISOString().slice(0, 10));
  const [receiptPath, setReceiptPath] = useState<string | null>(null);
  const [sort, setSort] = useState<{ key: LedgerSortKey; dir: "asc" | "desc" }>({
    key: "entry_date",
    dir: "desc",
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editType, setEditType] = useState<"income" | "expense">("income");
  const [editAmount, setEditAmount] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editCategory, setEditCategory] = useState<LedgerCategory>("general");
  const [editDate, setEditDate] = useState("");

  const yearOptions = useMemo(() => ledgerYearOptions(entries), [entries]);

  const filteredEntries = useMemo(
    () => filterLedgerByPeriod(entries, periodMode, filterYear, filterMonth),
    [entries, periodMode, filterYear, filterMonth],
  );

  const sortedEntries = useMemo(() => {
    const rows = [...filteredEntries];
    const dirMul = sort.dir === "asc" ? 1 : -1;
    rows.sort((a, b) => {
      const pick = (r: ClubLedgerRow) => {
        switch (sort.key) {
          case "entry_date":
            return r.entry_date;
          case "entry_type":
            return r.entry_type;
          case "amount_cents":
            return String(r.amount_cents);
          case "category":
            return r.category;
          case "description":
            return r.description;
        }
      };
      return compareStr(pick(a), pick(b)) * dirMul;
    });
    return rows;
  }, [filteredEntries, sort]);

  function toggleSort(key: LedgerSortKey) {
    setSort((prev) =>
      prev.key === key ? { key, dir: prev.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" },
    );
  }

  function startEdit(row: ClubLedgerRow) {
    setEditingId(row.id);
    setEditType(row.entry_type);
    setEditAmount((row.amount_cents / 100).toFixed(2));
    setEditDesc(row.description);
    setEditCategory(row.category);
    setEditDate(row.entry_date);
    setError(null);
  }

  function cancelEdit() {
    setEditingId(null);
  }

  function handleUpdate(original: ClubLedgerRow) {
    const amount = Number(editAmount.replace(",", "."));
    if (!editDesc.trim() || !amount || amount <= 0) return;
    const amountChanged = Math.round(amount * 100) !== original.amount_cents;
    const dateChanged = editDate !== original.entry_date;
    if (amountChanged || dateChanged) {
      const parts: string[] = [];
      if (amountChanged) {
        parts.push(
          `Betrag von ${formatEur(original.amount_cents)} auf ${formatEur(Math.round(amount * 100))}`,
        );
      }
      if (dateChanged) {
        parts.push(`Datum von ${formatDE(original.entry_date)} auf ${formatDE(editDate)}`);
      }
      if (!window.confirm(`${parts.join(" und ")} ändern — wirklich speichern?`)) return;
    }
    setError(null);
    startTransition(async () => {
      try {
        await updateClubLedgerEntry({
          entryId: original.id,
          entryType: editType,
          amountEur: amount,
          description: editDesc.trim(),
          category: editCategory,
          entryDate: editDate,
          memberId: original.member_id,
          receiptStoragePath: original.receipt_storage_path,
        });
        setEditingId(null);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Speichern fehlgeschlagen");
      }
    });
  }

  const { incomeCents, expenseCents } = useMemo(
    () => sumLedgerRows(filteredEntries),
    [filteredEntries],
  );
  const balance = incomeCents - expenseCents;

  const periodLabel =
    periodMode === "all"
      ? "Gesamt"
      : periodMode === "year"
        ? `Jahr ${filterYear}`
        : `${MONTHS[filterMonth - 1]} ${filterYear}`;

  function handleAdd() {
    const amount = Number(ledgerAmount.replace(",", "."));
    if (!ledgerDesc.trim() || !amount || amount <= 0) return;
    setError(null);
    startTransition(async () => {
      try {
        await addClubLedgerEntry({
          entryType: ledgerType,
          amountEur: amount,
          description: ledgerDesc.trim(),
          category: ledgerCategory,
          memberId: null,
          entryDate: ledgerDate,
          receiptStoragePath: receiptPath,
        });
        setLedgerAmount("");
        setLedgerDesc("");
        setReceiptPath(null);
        setShowAddForm(false);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Eintrag fehlgeschlagen");
      }
    });
  }

  function handleDelete(id: string) {
    if (!window.confirm("Eintrag löschen?")) return;
    startTransition(async () => {
      try {
        await deleteClubLedgerEntry(id);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Löschen fehlgeschlagen");
      }
    });
  }

  if (!ledgerAvailable) {
    return (
      <Card>
        <CardContent className="py-8 text-sm text-amber-800">
          Buchhaltung noch nicht eingerichtet. Bitte{" "}
          <code className="rounded bg-amber-100 px-1">supabase/049_club_ledger.sql</code> im SQL
          Editor ausführen.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4">
      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {error}
        </div>
      ) : null}

      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 pt-5">
          <label className="grid gap-1">
            <span className="text-xs font-semibold text-slate-600">Zeitraum</span>
            <select
              value={periodMode}
              onChange={(e) => setPeriodMode(e.target.value as LedgerPeriodMode)}
              className="h-10 rounded-xl border px-3 text-sm"
            >
              <option value="all">Gesamt</option>
              <option value="year">Pro Jahr</option>
              <option value="month">Pro Monat</option>
            </select>
          </label>
          {periodMode !== "all" ? (
            <label className="grid gap-1">
              <span className="text-xs font-semibold text-slate-600">Jahr</span>
              <select
                value={filterYear}
                onChange={(e) => setFilterYear(Number(e.target.value))}
                className="h-10 rounded-xl border px-3 text-sm"
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          {periodMode === "month" ? (
            <label className="grid gap-1">
              <span className="text-xs font-semibold text-slate-600">Monat</span>
              <select
                value={filterMonth}
                onChange={(e) => setFilterMonth(Number(e.target.value))}
                className="h-10 rounded-xl border px-3 text-sm"
              >
                {MONTHS.map((name, i) => (
                  <option key={name} value={i + 1}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <p className="text-sm text-slate-500">{periodLabel}</p>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs font-semibold uppercase text-slate-500">Einnahmen</p>
            <p className="mt-1 text-2xl font-bold text-emerald-700">{formatEur(incomeCents)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs font-semibold uppercase text-slate-500">Ausgaben</p>
            <p className="mt-1 text-2xl font-bold text-rose-700">{formatEur(expenseCents)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs font-semibold uppercase text-slate-500">Saldo</p>
            <p
              className={`mt-1 text-2xl font-bold ${balance >= 0 ? "text-slate-900" : "text-rose-700"}`}
            >
              {formatEur(balance)}
            </p>
          </CardContent>
        </Card>
      </div>

      {openContributions.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Offene Beiträge ({openContributions.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 md:hidden">
              {openContributions.map((c) => (
                <Link
                  key={c.userId}
                  href={`/admin/members/${c.userId}`}
                  className="block rounded-xl border bg-white p-3 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  <div className="font-semibold text-slate-900">
                    {c.lastName}, {c.firstName}
                    {c.membershipNumber ? (
                      <span className="ml-1 text-xs font-normal text-slate-500">
                        Nr. {c.membershipNumber}
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                    <ContributionStatusBadge status={c.status} />
                    <span className="font-semibold text-amber-800">{formatEur(c.openCents)} offen</span>
                    <span className="text-slate-500">{c.periodLabel}</span>
                  </div>
                </Link>
              ))}
            </div>
            <div className="hidden overflow-x-auto rounded-xl border md:block">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead className="border-b bg-slate-50 text-xs uppercase text-slate-600">
                  <tr>
                    <th className="px-3 py-2">Mitglied</th>
                    <th className="px-3 py-2">Periode</th>
                    <th className="px-3 py-2">Offen</th>
                    <th className="px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {openContributions.map((c) => (
                    <tr key={c.userId} className="border-b">
                      <td className="px-3 py-2">
                        <Link
                          href={`/admin/members/${c.userId}`}
                          className="font-medium text-blue-600 hover:underline"
                        >
                          {c.lastName}, {c.firstName}
                          {c.membershipNumber ? ` (Nr. ${c.membershipNumber})` : ""}
                        </Link>
                      </td>
                      <td className="px-3 py-2 text-slate-600">{c.periodLabel}</td>
                      <td className="px-3 py-2 font-semibold tabular-nums text-amber-800">
                        {formatEur(c.openCents)}
                      </td>
                      <td className="px-3 py-2">
                        <ContributionStatusBadge status={c.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Neue Buchung</CardTitle>
          {!showAddForm ? (
            <button
              type="button"
              onClick={() => setShowAddForm(true)}
              className="h-9 rounded-lg border bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Neuen Eintrag anlegen
            </button>
          ) : null}
        </CardHeader>
        {showAddForm ? (
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              <select
                value={ledgerType}
                onChange={(e) => setLedgerType(e.target.value as "income" | "expense")}
                className="h-10 rounded-xl border px-3 text-sm"
              >
                <option value="income">Einnahme</option>
                <option value="expense">Ausgabe</option>
              </select>
              <select
                value={ledgerCategory}
                onChange={(e) => setLedgerCategory(e.target.value as LedgerCategory)}
                className="h-10 rounded-xl border px-3 text-sm"
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
                className="h-10 rounded-xl border px-3 text-sm"
              />
              <input
                type="date"
                value={ledgerDate}
                onChange={(e) => setLedgerDate(e.target.value)}
                className="h-10 rounded-xl border px-3 text-sm"
              />
              <input
                value={ledgerDesc}
                onChange={(e) => setLedgerDesc(e.target.value)}
                placeholder="Beschreibung"
                className="h-10 rounded-xl border px-3 text-sm sm:col-span-2"
              />
              <div className="sm:col-span-2 lg:col-span-3">
                <DocumentUploadField
                  label="Beleg (optional)"
                  disabled={pending}
                  onFileSelected={async (file) => {
                    const path = await uploadClubDocument(file, "receipt");
                    setReceiptPath(path);
                  }}
                  onClear={() => setReceiptPath(null)}
                />
              </div>
              <div className="flex gap-2 sm:col-span-2 lg:col-span-3">
                <button
                  type="button"
                  disabled={pending || !ledgerDesc.trim() || !ledgerAmount}
                  onClick={handleAdd}
                  className="h-10 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white disabled:opacity-50"
                >
                  Speichern
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => setShowAddForm(false)}
                  className="h-10 rounded-xl border px-4 text-sm font-semibold text-slate-600"
                >
                  Abbrechen
                </button>
              </div>
            </div>
          </CardContent>
        ) : null}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Buchungen ({sortedEntries.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {sortedEntries.length === 0 ? (
            <p className="text-sm text-slate-500">Keine Einträge in diesem Zeitraum.</p>
          ) : (
            <>
            <div className="grid gap-2 md:hidden">
              {sortedEntries.map((e) =>
                editingId === e.id ? (
                  <div key={e.id} className="rounded-xl border bg-slate-50 p-3 text-sm">
                    <div className="grid gap-2">
                      <select
                        value={editType}
                        onChange={(ev) => setEditType(ev.target.value as "income" | "expense")}
                        className="h-10 rounded-xl border px-3 text-sm"
                      >
                        <option value="income">Einnahme</option>
                        <option value="expense">Ausgabe</option>
                      </select>
                      <input
                        type="date"
                        value={editDate}
                        onChange={(ev) => setEditDate(ev.target.value)}
                        className="h-10 rounded-xl border px-3 text-sm"
                      />
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={editAmount}
                        onChange={(ev) => setEditAmount(ev.target.value)}
                        className="h-10 rounded-xl border px-3 text-sm"
                      />
                      <input
                        value={editDesc}
                        onChange={(ev) => setEditDesc(ev.target.value)}
                        placeholder="Beschreibung"
                        className="h-10 rounded-xl border px-3 text-sm"
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={pending || !editDesc.trim() || !editAmount}
                          onClick={() => handleUpdate(e)}
                          className="text-sm font-semibold text-emerald-700 disabled:opacity-50"
                        >
                          Speichern
                        </button>
                        <button
                          type="button"
                          disabled={pending}
                          onClick={cancelEdit}
                          className="text-sm font-semibold text-slate-600 disabled:opacity-50"
                        >
                          Abbrechen
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div key={e.id} className="rounded-xl border bg-white p-3 text-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900">{e.description}</p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {formatDE(e.entry_date)} · {LEDGER_CATEGORY_LABELS[e.category]}
                        </p>
                      </div>
                      <p
                        className={`shrink-0 font-bold tabular-nums ${e.entry_type === "income" ? "text-emerald-700" : "text-rose-700"}`}
                      >
                        {e.entry_type === "income" ? "+" : "−"}
                        {formatEur(e.amount_cents)}
                      </p>
                    </div>
                    {e.member_id ? (
                      <Link
                        href={`/admin/members/${e.member_id}`}
                        className="mt-2 inline-block text-xs font-medium text-blue-600 hover:underline"
                      >
                        {e.member_name ?? "Mitglied"}
                      </Link>
                    ) : null}
                    <div className="mt-2 flex flex-wrap gap-3 text-xs">
                      {e.receipt_storage_path ? (
                        <ReceiptLink path={e.receipt_storage_path} />
                      ) : null}
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => startEdit(e)}
                        className="font-medium text-blue-600 hover:underline disabled:opacity-50"
                      >
                        Bearbeiten
                      </button>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => handleDelete(e.id)}
                        className="font-medium text-rose-600 hover:underline disabled:opacity-50"
                      >
                        Löschen
                      </button>
                    </div>
                  </div>
                ),
              )}
            </div>
            <div className="hidden overflow-x-auto rounded-xl border md:block">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="border-b bg-slate-50 text-xs uppercase text-slate-600">
                  <tr>
                    <th className="px-3 py-2">
                      <SortBtn
                        label="Datum"
                        active={sort.key === "entry_date"}
                        dir={sort.dir}
                        onClick={() => toggleSort("entry_date")}
                      />
                    </th>
                    <th className="px-3 py-2">
                      <SortBtn
                        label="Art"
                        active={sort.key === "entry_type"}
                        dir={sort.dir}
                        onClick={() => toggleSort("entry_type")}
                      />
                    </th>
                    <th className="px-3 py-2">
                      <SortBtn
                        label="Betrag"
                        active={sort.key === "amount_cents"}
                        dir={sort.dir}
                        onClick={() => toggleSort("amount_cents")}
                      />
                    </th>
                    <th className="px-3 py-2">
                      <SortBtn
                        label="Kategorie"
                        active={sort.key === "category"}
                        dir={sort.dir}
                        onClick={() => toggleSort("category")}
                      />
                    </th>
                    <th className="px-3 py-2">
                      <SortBtn
                        label="Beschreibung"
                        active={sort.key === "description"}
                        dir={sort.dir}
                        onClick={() => toggleSort("description")}
                      />
                    </th>
                    <th className="px-3 py-2">Mitglied</th>
                    <th className="px-3 py-2">Beleg</th>
                    <th className="px-3 py-2">Angelegt von</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {sortedEntries.map((e) =>
                    editingId === e.id ? (
                      <tr key={e.id} id={`ledger-${e.id}`} className="border-b bg-slate-50/80">
                        <td className="px-3 py-2">
                          <input
                            type="date"
                            value={editDate}
                            onChange={(ev) => setEditDate(ev.target.value)}
                            className="h-9 w-full min-w-[8.5rem] rounded-lg border px-2 text-xs"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <select
                            value={editType}
                            onChange={(ev) => setEditType(ev.target.value as "income" | "expense")}
                            className="h-9 w-full rounded-lg border px-2 text-xs"
                          >
                            <option value="income">Einnahme</option>
                            <option value="expense">Ausgabe</option>
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={editAmount}
                            onChange={(ev) => setEditAmount(ev.target.value)}
                            className="h-9 w-full min-w-[5rem] rounded-lg border px-2 text-xs"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <select
                            value={editCategory}
                            onChange={(ev) => setEditCategory(ev.target.value as LedgerCategory)}
                            className="h-9 w-full rounded-lg border px-2 text-xs"
                          >
                            {Object.entries(LEDGER_CATEGORY_LABELS).map(([k, v]) => (
                              <option key={k} value={k}>
                                {v}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <input
                            value={editDesc}
                            onChange={(ev) => setEditDesc(ev.target.value)}
                            className="h-9 w-full min-w-[8rem] rounded-lg border px-2 text-xs"
                          />
                        </td>
                        <td className="px-3 py-2 text-slate-600">
                          {e.member_name ?? "—"}
                        </td>
                        <td className="px-3 py-2">
                          {e.receipt_storage_path ? (
                            <ReceiptLink path={e.receipt_storage_path} />
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-3 py-2 text-xs text-slate-500">
                          {e.created_by_name ?? "—"}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex flex-col gap-1">
                            <button
                              type="button"
                              disabled={pending || !editDesc.trim() || !editAmount}
                              onClick={() => handleUpdate(e)}
                              className="text-xs font-medium text-emerald-700 hover:underline disabled:opacity-50"
                            >
                              Speichern
                            </button>
                            <button
                              type="button"
                              disabled={pending}
                              onClick={cancelEdit}
                              className="text-xs font-medium text-slate-600 hover:underline disabled:opacity-50"
                            >
                              Abbrechen
                            </button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      <tr key={e.id} id={`ledger-${e.id}`} className="border-b">
                        <td className="px-3 py-2">{formatDE(e.entry_date)}</td>
                        <td className="px-3 py-2">
                          {e.entry_type === "income" ? "Einnahme" : "Ausgabe"}
                        </td>
                        <td
                          className={`px-3 py-2 font-semibold tabular-nums ${e.entry_type === "income" ? "text-emerald-700" : "text-rose-700"}`}
                        >
                          {e.entry_type === "income" ? "+" : "−"}
                          {formatEur(e.amount_cents)}
                        </td>
                        <td className="px-3 py-2">{LEDGER_CATEGORY_LABELS[e.category]}</td>
                        <td className="px-3 py-2">{e.description}</td>
                        <td className="px-3 py-2">
                          {e.member_id ? (
                            <Link
                              href={`/admin/members/${e.member_id}`}
                              className="font-medium text-blue-600 hover:underline"
                            >
                              {e.member_name ?? "Mitglied"}
                            </Link>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-3 py-2">
                          {e.receipt_storage_path ? (
                            <ReceiptLink path={e.receipt_storage_path} />
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-3 py-2 text-xs text-slate-600">
                          {e.created_by_name ?? "—"}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex flex-col gap-1">
                            <button
                              type="button"
                              disabled={pending}
                              onClick={() => startEdit(e)}
                              className="text-xs font-medium text-blue-600 hover:underline disabled:opacity-50"
                            >
                              Bearbeiten
                            </button>
                            <button
                              type="button"
                              disabled={pending}
                              onClick={() => handleDelete(e.id)}
                              className="text-xs font-medium text-rose-600 hover:underline disabled:opacity-50"
                            >
                              Löschen
                            </button>
                          </div>
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
