"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GenderSelect } from "@/components/ui/gender-select";
import { MEMBER_COUNTRY_OPTIONS } from "@/lib/members/country";
import { createMember } from "@/app/(app)/admin/members/actions";

export function CreateMemberSection() {
  const [open, setOpen] = useState(false);

  return (
    <div className="mb-4">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="h-11 rounded-xl bg-fc-navy px-4 text-sm font-semibold text-white shadow-sm hover:bg-fc-blue"
        >
          + Person manuell anlegen
        </button>
      ) : (
        <Card id="create">
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle>Person anlegen</CardTitle>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-sm font-medium text-slate-600 hover:text-fc-navy"
            >
              Schließen
            </button>
          </CardHeader>
          <CardContent>
            <form action={createMember} className="grid gap-3 md:grid-cols-2">
              <label className="grid gap-1">
                <span className="text-sm font-medium text-slate-700">Mitgliedsnummer</span>
                <input
                  name="membership_number"
                  className="h-11 rounded-xl border bg-white px-3 text-sm outline-none focus:ring-4 focus:ring-[color:var(--ring)]"
                  placeholder="Leer lassen — wird bei Freigabe (Status aktiv) automatisch vergeben"
                />
              </label>
              <label className="grid gap-1">
                <span className="text-sm font-medium text-slate-700">Vorname</span>
                <input
                  name="first_name"
                  required
                  className="h-11 rounded-xl border bg-white px-3 text-sm outline-none focus:ring-4 focus:ring-[color:var(--ring)]"
                />
              </label>
              <label className="grid gap-1">
                <span className="text-sm font-medium text-slate-700">Nachname</span>
                <input
                  name="last_name"
                  required
                  className="h-11 rounded-xl border bg-white px-3 text-sm outline-none focus:ring-4 focus:ring-[color:var(--ring)]"
                />
              </label>
              <label className="grid gap-1 md:col-span-2">
                <span className="text-sm font-medium text-slate-700">E-Mail</span>
                <input
                  name="email"
                  type="email"
                  required
                  className="h-11 rounded-xl border bg-white px-3 text-sm outline-none focus:ring-4 focus:ring-[color:var(--ring)]"
                />
              </label>
              <label className="grid gap-1">
                <span className="text-sm font-medium text-slate-700">Telefon</span>
                <input
                  name="phone"
                  className="h-11 rounded-xl border bg-white px-3 text-sm outline-none focus:ring-4 focus:ring-[color:var(--ring)]"
                />
              </label>
              <label className="grid gap-1">
                <span className="text-sm font-medium text-slate-700">Geburtsdatum</span>
                <input
                  name="birthdate"
                  type="date"
                  className="h-11 rounded-xl border bg-white px-3 text-sm outline-none focus:ring-4 focus:ring-[color:var(--ring)]"
                />
              </label>
              <label className="grid gap-1 md:col-span-2">
                <span className="text-sm font-medium text-slate-700">Straße</span>
                <input
                  name="street"
                  className="h-11 rounded-xl border bg-white px-3 text-sm outline-none focus:ring-4 focus:ring-[color:var(--ring)]"
                />
              </label>
              <label className="grid gap-1">
                <span className="text-sm font-medium text-slate-700">PLZ</span>
                <input
                  name="postal_code"
                  className="h-11 rounded-xl border bg-white px-3 text-sm outline-none focus:ring-4 focus:ring-[color:var(--ring)]"
                />
              </label>
              <label className="grid gap-1">
                <span className="text-sm font-medium text-slate-700">Ort</span>
                <input
                  name="city"
                  className="h-11 rounded-xl border bg-white px-3 text-sm outline-none focus:ring-4 focus:ring-[color:var(--ring)]"
                />
              </label>
              <label className="grid gap-1">
                <span className="text-sm font-medium text-slate-700">Land *</span>
                <select
                  name="country"
                  required
                  defaultValue="DE"
                  className="h-11 rounded-xl border bg-white px-3 text-sm outline-none focus:ring-4 focus:ring-[color:var(--ring)]"
                >
                  {MEMBER_COUNTRY_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1">
                <span className="text-sm font-medium text-slate-700">Geschlecht *</span>
                <GenderSelect name="gender" value="" />
              </label>
              <label className="grid gap-1">
                <span className="text-sm font-medium text-slate-700">Beginn Mitgliedschaft</span>
                <input
                  name="membership_start"
                  type="date"
                  className="h-11 rounded-xl border bg-white px-3 text-sm outline-none focus:ring-4 focus:ring-[color:var(--ring)]"
                />
                <span className="text-xs text-slate-500">
                  Leer lassen, wenn die Person noch kein Mitglied ist (Beitrag steht noch aus). Dann
                  wird sie als „Mitgliedschaft beantragt“ angelegt — danach öffnet sich die Mail
                  „Antrag eingegangen / bitte zahlen“ (editierbar, Versand optional).
                </span>
              </label>
              <label className="grid gap-1">
                <span className="text-sm font-medium text-slate-700">Beitrag (€)</span>
                <input
                  name="fee_eur"
                  type="number"
                  step="0.01"
                  defaultValue="15"
                  className="h-11 rounded-xl border bg-white px-3 text-sm outline-none focus:ring-4 focus:ring-[color:var(--ring)]"
                />
              </label>
              <label className="grid gap-1">
                <span className="text-sm font-medium text-slate-700">Status</span>
                <select
                  name="status"
                  defaultValue="applied"
                  className="h-11 rounded-xl border bg-white px-3 text-sm outline-none"
                >
                  <option value="applied">Mitgliedschaft beantragt</option>
                  <option value="active">aktiv</option>
                  <option value="inactive">inaktiv</option>
                </select>
              </label>
              <label className="grid gap-1">
                <span className="text-sm font-medium text-slate-700">Rolle</span>
                <select
                  name="role"
                  defaultValue="member"
                  className="h-11 rounded-xl border bg-white px-3 text-sm outline-none"
                >
                  <option value="member">member</option>
                  <option value="anni">anni</option>
                  <option value="admin">admin</option>
                </select>
              </label>
              <div className="md:col-span-2">
                <button className="h-11 w-full rounded-xl bg-fc-navy text-sm font-semibold text-white shadow-sm shadow-slate-900/10 hover:bg-fc-blue">
                  Person anlegen
                </button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
