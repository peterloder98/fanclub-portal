"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import { membershipStatusLabel } from "@/lib/membership/provision-applicant";
import { ContributionStatusBadge } from "@/components/admin/contribution-status-badge";
import type { ContributionStatus } from "@/lib/club/membership-contribution";
import { MEMBERSHIP_NUMBER_PENDING_LABEL } from "@/lib/membership/numbers";
import { EmptyState } from "@/components/ui/empty-state";

const PAGE_SIZE = 30;

function matchesQuery(q: string, parts: (string | null | undefined)[]) {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  return parts.some((p) => (p ?? "").toLowerCase().includes(needle));
}

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
type AppSortKey = "created_at" | "first_name" | "last_name" | "email" | "status";

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
  const [navPending, startNav] = useTransition();
  const [navTarget, setNavTarget] = useState<string | null>(null);
  const [memberSort, setMemberSort] = useState<{ key: MemberSortKey; dir: "asc" | "desc" }>({
    key: "membership_number",
    dir: "asc",
  });
  const [appSort, setAppSort] = useState<{ key: AppSortKey; dir: "asc" | "desc" }>({
    key: "created_at",
    dir: "desc",
  });
  const [memberSearch, setMemberSearch] = useState("");
  const [appSearch, setAppSearch] = useState("");
  const [memberPage, setMemberPage] = useState(0);
  const [appPage, setAppPage] = useState(0);

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
    const rows = members.filter((r) =>
      matchesQuery(memberSearch, [
        r.first_name,
        r.last_name,
        r.email,
        r.membership_number,
        String(r.warning_count),
      ]),
    );
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
  }, [members, memberSort, memberSearch]);

  const sortedApps = useMemo(() => {
    const rows = applications.filter((r) =>
      matchesQuery(appSearch, [
        r.first_name,
        r.last_name,
        r.email,
        r.membership_number,
        applicationStatusLabel(r.status),
      ]),
    );
    const dir = appSort.dir === "asc" ? 1 : -1;
    rows.sort((a, b) => {
      const pick = (r: AdminApplicationRow) => {
        switch (appSort.key) {
          case "created_at":
            return r.created_at;
          case "first_name":
            return r.first_name;
          case "last_name":
            return r.last_name;
          case "email":
            return r.email;
          case "status":
            return r.status;
        }
      };
      return compareStr(pick(a), pick(b)) * dir;
    });
    return rows;
  }, [applications, appSort, appSearch]);

  const memberPageCount = Math.max(1, Math.ceil(sortedMembers.length / PAGE_SIZE));
  const appPageCount = Math.max(1, Math.ceil(sortedApps.length / PAGE_SIZE));
  const pagedMembers = sortedMembers.slice(
    memberPage * PAGE_SIZE,
    memberPage * PAGE_SIZE + PAGE_SIZE,
  );
  const pagedApps = sortedApps.slice(appPage * PAGE_SIZE, appPage * PAGE_SIZE + PAGE_SIZE);

  const memberSortOptions: { key: MemberSortKey; label: string }[] = [
    { key: "membership_number", label: "Mitgliedsnr." },
    { key: "last_name", label: "Nachname" },
    { key: "joined_at", label: "Beitritt" },
    { key: "warning_count", label: "Verwarnungen" },
    { key: "membership_status", label: "Status" },
    { key: "contribution_status", label: "Beitrag" },
  ];

  function openRecord(href: string) {
    setNavTarget(href);
    startNav(() => {
      router.push(href);
    });
  }

  const appSortOptions: { key: AppSortKey; label: string }[] = [
    { key: "created_at", label: "Eingang" },
    { key: "last_name", label: "Nachname" },
    { key: "first_name", label: "Vorname" },
    { key: "email", label: "E-Mail" },
    { key: "status", label: "Status" },
  ];

  return (
    <div className="grid gap-4">
      <Card className="border-amber-200 bg-amber-50/30">
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2">
            Mitgliedschaftsanträge
            {applications.length ? <Badge variant="warning">{applications.length}</Badge> : null}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-xs text-slate-500">
            Antrag anklicken öffnet den Datensatz mit Aktionen und PDF.
          </p>

          {applicationsError ? (
            <div className="text-rose-700">{applicationsError}</div>
          ) : applications.length === 0 ? (
            <EmptyState />
          ) : sortedApps.length === 0 ? (
            <div className="text-slate-600">Keine Treffer für die Suche.</div>
          ) : (
            <>
            <div className="mb-3">
              <input
                type="search"
                value={appSearch}
                onChange={(e) => {
                  setAppSearch(e.target.value);
                  setAppPage(0);
                }}
                placeholder="Suchen: Name, E-Mail, Mitgliedsnr. …"
                className="h-10 w-full rounded-xl border px-3 text-sm"
              />
            </div>
            <div className="mb-3 flex items-center gap-2 lg:hidden">
              <label className="text-xs font-semibold text-slate-600">Sortieren</label>
              <select
                value={`${appSort.key}:${appSort.dir}`}
                onChange={(e) => {
                  const [key, dir] = e.target.value.split(":") as [AppSortKey, "asc" | "desc"];
                  setAppSort({ key, dir });
                }}
                className="h-9 flex-1 rounded-lg border px-2 text-xs"
              >
                {appSortOptions.flatMap((o) => [
                  <option key={`${o.key}:asc`} value={`${o.key}:asc`}>
                    {o.label} ↑
                  </option>,
                  <option key={`${o.key}:desc`} value={`${o.key}:desc`}>
                    {o.label} ↓
                  </option>,
                ])}
              </select>
            </div>
            <div className="grid gap-2 lg:hidden">
              {pagedApps.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => openRecord(`/admin/members/applications/${a.id}`)}
                  className={`w-full rounded-xl border bg-white p-3 text-left transition hover:border-slate-300 hover:bg-slate-50 ${navPending && navTarget === `/admin/members/applications/${a.id}` ? "opacity-60" : ""}`}
                >
                  <div className="font-semibold text-slate-900">
                    {a.last_name}, {a.first_name}
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
                </button>
              ))}
            </div>
            {sortedApps.length > PAGE_SIZE ? (
              <div className="mb-2 flex items-center justify-between text-xs text-slate-600 lg:hidden">
                <span>
                  Seite {appPage + 1} von {appPageCount} ({sortedApps.length} Anträge)
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={appPage === 0}
                    onClick={() => setAppPage((p) => Math.max(0, p - 1))}
                    className="rounded-lg border px-2 py-1 disabled:opacity-40"
                  >
                    Zurück
                  </button>
                  <button
                    type="button"
                    disabled={appPage >= appPageCount - 1}
                    onClick={() => setAppPage((p) => p + 1)}
                    className="rounded-lg border px-2 py-1 disabled:opacity-40"
                  >
                    Weiter
                  </button>
                </div>
              </div>
            ) : null}
            <div className="hidden overflow-x-auto rounded-xl border bg-white lg:block">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="border-b bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
                  <tr>
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
                        label="Vorname"
                        active={appSort.key === "first_name"}
                        dir={appSort.dir}
                        onClick={() => toggleAppSort("first_name")}
                      />
                    </th>
                    <th className="px-3 py-2">
                      <SortBtn
                        label="Nachname"
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
                  {pagedApps.map((a) => (
                    <tr
                      key={a.id}
                      onClick={() => openRecord(`/admin/members/applications/${a.id}`)}
                      className={`cursor-pointer border-b transition hover:bg-slate-50 ${navPending && navTarget === `/admin/members/applications/${a.id}` ? "opacity-60" : ""}`}
                    >
                      <td className="px-3 py-2 tabular-nums text-slate-600">
                        {a.membership_number ?? MEMBERSHIP_NUMBER_PENDING_LABEL}
                      </td>
                      <td className="px-3 py-2">{a.first_name}</td>
                      <td className="px-3 py-2 font-medium text-slate-900">{a.last_name}</td>
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
          ) : members.length === 0 ? (
            <EmptyState />
          ) : sortedMembers.length === 0 ? (
            <div className="text-slate-600">Keine Treffer für die Suche.</div>
          ) : (
            <>
            <div className="mb-3">
              <input
                type="search"
                value={memberSearch}
                onChange={(e) => {
                  setMemberSearch(e.target.value);
                  setMemberPage(0);
                }}
                placeholder="Suchen: Name, E-Mail, Mitgliedsnr. …"
                className="h-10 w-full rounded-xl border px-3 text-sm"
              />
            </div>
            <div className="mb-3 flex items-center gap-2 lg:hidden">
              <label className="text-xs font-semibold text-slate-600">Sortieren</label>
              <select
                value={`${memberSort.key}:${memberSort.dir}`}
                onChange={(e) => {
                  const [key, dir] = e.target.value.split(":") as [MemberSortKey, "asc" | "desc"];
                  setMemberSort({ key, dir });
                }}
                className="h-9 flex-1 rounded-lg border px-2 text-xs"
              >
                {memberSortOptions.flatMap((o) => [
                  <option key={`${o.key}:asc`} value={`${o.key}:asc`}>
                    {o.label} ↑
                  </option>,
                  <option key={`${o.key}:desc`} value={`${o.key}:desc`}>
                    {o.label} ↓
                  </option>,
                ])}
              </select>
            </div>
            <div className="grid gap-2 lg:hidden">
              {pagedMembers.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => openRecord(`/admin/members/${m.id}`)}
                  className={`w-full rounded-xl border bg-white p-3 text-left transition hover:border-slate-300 hover:bg-slate-50 ${navPending && navTarget === `/admin/members/${m.id}` ? "opacity-60" : ""}`}
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
            {sortedMembers.length > PAGE_SIZE ? (
              <div className="mb-2 flex items-center justify-between text-xs text-slate-600 lg:hidden">
                <span>
                  Seite {memberPage + 1} von {memberPageCount} ({sortedMembers.length} Mitglieder)
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={memberPage === 0}
                    onClick={() => setMemberPage((p) => Math.max(0, p - 1))}
                    className="rounded-lg border px-2 py-1 disabled:opacity-40"
                  >
                    Zurück
                  </button>
                  <button
                    type="button"
                    disabled={memberPage >= memberPageCount - 1}
                    onClick={() => setMemberPage((p) => p + 1)}
                    className="rounded-lg border px-2 py-1 disabled:opacity-40"
                  >
                    Weiter
                  </button>
                </div>
              </div>
            ) : null}
            <div className="hidden overflow-x-auto rounded-xl border bg-white lg:block">
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
                  {pagedMembers.map((m) => (
                    <tr
                      key={m.id}
                      onClick={() => openRecord(`/admin/members/${m.id}`)}
                      className={`cursor-pointer border-b transition hover:bg-slate-50 ${navPending && navTarget === `/admin/members/${m.id}` ? "opacity-60" : ""}`}
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
    </div>
  );
}
