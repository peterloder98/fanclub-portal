"use client";

import { useState } from "react";
import { MemberEmailEditField } from "@/components/admin/member-email-edit-field.client";
import { isNoAppPlaceholderEmail } from "@/lib/members/no-app-access";

export function MemberAppAccessFields({
  noAppAccess,
  loginEmail,
  billingEmail,
}: {
  noAppAccess: boolean;
  loginEmail: string;
  billingEmail: string;
}) {
  const [offline, setOffline] = useState(noAppAccess);

  return (
    <div className="grid gap-3 md:col-span-2">
      <label className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
        <input type="hidden" name="no_app_access" value={offline ? "on" : ""} />
        <input
          type="checkbox"
          checked={offline}
          onChange={(e) => setOffline(e.target.checked)}
          className="mt-1 h-4 w-4"
        />
        <span>
          <span className="block text-sm font-medium text-slate-800">Kein eigener App-Zugang</span>
          <span className="mt-0.5 block text-xs text-slate-600">
            Nicht in der App und nicht in die WhatsApp-Gruppe. Nur Mitgliedschaft. Die
            Zahlungs-Mail darf die Adresse eines anderen Mitglieds sein.
          </span>
        </span>
      </label>
      {offline ? (
        <>
          <input type="hidden" name="email" value={loginEmail} />
          <label className="grid gap-1">
            <span className="text-sm font-medium text-slate-700">E-Mail nur für Beitragszahlungen *</span>
            <input
              name="billing_email"
              type="email"
              required
              defaultValue={billingEmail}
              className="h-11 rounded-xl border bg-white px-3 text-sm outline-none"
              placeholder="z. B. E-Mail der Mutter"
            />
          </label>
        </>
      ) : (
        <>
          <MemberEmailEditField
            value={isNoAppPlaceholderEmail(loginEmail) ? "" : loginEmail}
          />
          <input type="hidden" name="billing_email" value="" />
        </>
      )}
    </div>
  );
}