"use client";

import { useEffect, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { HoverEnlargeAvatar } from "@/components/ui/hover-enlarge-avatar";
import {
  approveProfileChangeRequest,
  rejectProfileChangeRequest,
} from "@/app/(app)/admin/members/profile-changes/actions";
import {
  formatProfileChangeValue,
  PROFILE_CHANGE_FIELD_LABELS,
  type ProfileChangeField,
  type ProfileChangeValues,
} from "@/lib/profile/change-requests";
import { formatBerlinDateTimeMedium } from "@/lib/datetime/berlin";

export type PendingProfileChangeRow = {
  id: string;
  created_at: string;
  membershipNumber: string | null;
  memberName: string;
  memberAvatarUrl: string | null;
  userId: string;
  previous: Partial<ProfileChangeValues>;
  proposed: Partial<ProfileChangeValues>;
};

export function ProfileChangesQueue({ rows }: { rows: PendingProfileChangeRow[] }) {
  const [pending, startTransition] = useTransition();
  const searchParams = useSearchParams();
  const router = useRouter();
  const focus = searchParams.get("focus");

  useEffect(() => {
    if (!focus) return;
    const el = document.getElementById(`profile-change-${focus}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [focus]);

  if (!rows.length) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-slate-600">
          Keine offenen Stammdaten-Änderungen.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-3">
      {rows.map((r) => {
        const fields = Object.keys(r.proposed) as ProfileChangeField[];
        const highlighted = focus === r.id;
        return (
          <Card
            key={r.id}
            id={`profile-change-${r.id}`}
            className={
              highlighted
                ? "overflow-hidden ring-2 ring-fc-blue"
                : "overflow-hidden"
            }
          >
            <CardContent className="space-y-3 p-4">
              <div className="flex items-start justify-between gap-3">
                <HoverEnlargeAvatar
                  name={r.memberName}
                  avatarUrl={r.memberAvatarUrl}
                  size="sm"
                  className="min-w-0"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-slate-900">
                      {r.memberName}
                      {r.membershipNumber ? (
                        <span className="ml-1.5 font-normal text-slate-500">
                          · Nr. {r.membershipNumber}
                        </span>
                      ) : null}
                    </div>
                    <div className="text-xs text-slate-500">
                      {formatBerlinDateTimeMedium(r.created_at)}
                    </div>
                  </div>
                </HoverEnlargeAvatar>
                <Badge variant="warning">Wartend</Badge>
              </div>

              <div className="overflow-hidden rounded-xl border border-slate-200">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-3 py-2 font-semibold">Feld</th>
                      <th className="px-3 py-2 font-semibold">Bisher</th>
                      <th className="px-3 py-2 font-semibold">Neu</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {fields.map((field) => (
                      <tr key={field}>
                        <td className="px-3 py-2 font-medium text-slate-700">
                          {PROFILE_CHANGE_FIELD_LABELS[field]}
                        </td>
                        <td className="px-3 py-2 text-slate-500">
                          {formatProfileChangeValue(field, r.previous[field])}
                        </td>
                        <td className="px-3 py-2 font-medium text-fc-navy">
                          {formatProfileChangeValue(field, r.proposed[field])}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      await approveProfileChangeRequest(r.id);
                      router.refresh();
                    })
                  }
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  <Check className="h-3.5 w-3.5" />
                  Freigeben
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => {
                    if (!window.confirm("Änderung wirklich ablehnen?")) return;
                    startTransition(async () => {
                      await rejectProfileChangeRequest(r.id);
                      router.refresh();
                    });
                  }}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60"
                >
                  <X className="h-3.5 w-3.5" />
                  Ablehnen
                </button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
