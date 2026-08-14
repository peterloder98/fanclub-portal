/**
 * Liste aktive Mitglieder ohne App-Registrierung (kein Login / kein last_app_active_at).
 *
 *   npx --yes tsx --env-file=.env.local scripts/list-unregistered-members.ts
 */
import { createClient } from "@supabase/supabase-js";
import { isHiddenProfileId } from "../src/lib/members/hidden";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(url, serviceRoleKey);

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function isInvalidPlaceholderEmail(email: string): boolean {
  const e = normalizeEmail(email);
  if (!e) return true;
  if (e.includes("@fanclub-import.invalid")) return true;
  if (e === "noemail" || e.startsWith("noemail@") || e.includes("noemail")) return true;
  if (!e.includes("@") || e.endsWith("@") || e.startsWith("@")) return true;
  return false;
}

function membershipKey(n: string | null | undefined): string {
  return String(n ?? "").trim().replace(/^0+/, "") || "";
}

async function loadAuthSignInMap(): Promise<Map<string, string | null>> {
  const map = new Map<string, string | null>();
  let page = 1;
  const perPage = 200;
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) {
      console.warn("Auth listUsers:", error.message);
      break;
    }
    const users = data.users ?? [];
    for (const u of users) {
      map.set(u.id, u.last_sign_in_at ?? null);
    }
    if (users.length < perPage) break;
    page += 1;
  }
  return map;
}

async function main() {
  const { data: memberships, error: mErr } = await admin
    .from("memberships")
    .select("user_id,status")
    .eq("status", "active");
  if (mErr) throw new Error(mErr.message);

  const userIds = [...new Set((memberships ?? []).map((m) => m.user_id).filter(Boolean))];
  const profiles: Array<{
    id: string;
    email: string | null;
    first_name: string | null;
    last_name: string | null;
    membership_number: string | null;
    last_app_active_at?: string | null;
    app_registration_status?: string | null;
    is_hidden?: boolean | null;
  }> = [];

  const chunkSize = 200;
  let usedStatusColumn = true;
  for (let i = 0; i < userIds.length; i += chunkSize) {
    const chunk = userIds.slice(i, i + chunkSize);
    const withStatus = await admin
      .from("profiles")
      .select(
        "id,email,first_name,last_name,membership_number,last_app_active_at,app_registration_status,is_hidden",
      )
      .in("id", chunk);
    if (withStatus.error && /app_registration_status|is_hidden|does not exist/i.test(withStatus.error.message)) {
      usedStatusColumn = false;
      const fallback = await admin
        .from("profiles")
        .select("id,email,first_name,last_name,membership_number,last_app_active_at")
        .in("id", chunk);
      if (fallback.error) {
        const minimal = await admin
          .from("profiles")
          .select("id,email,first_name,last_name,membership_number")
          .in("id", chunk);
        if (minimal.error) throw new Error(minimal.error.message);
        profiles.push(...(minimal.data ?? []));
      } else {
        profiles.push(...(fallback.data ?? []));
      }
    } else if (withStatus.error) {
      throw new Error(withStatus.error.message);
    } else {
      profiles.push(...(withStatus.data ?? []));
    }
  }

  const signIn = await loadAuthSignInMap();

  type Row = {
    nr: string;
    name: string;
    email: string;
    reason: string;
    skip?: string;
  };

  const unregistered: Row[] = [];
  const registered: Row[] = [];
  const skipped: Row[] = [];

  for (const p of profiles) {
    const nr = membershipKey(p.membership_number);
    const name = `${p.first_name?.trim() ?? ""} ${p.last_name?.trim() ?? ""}`.trim() || "—";
    const email = p.email?.trim() ?? "";
    const lastSignIn = signIn.get(p.id) ?? null;
    const lastActive = p.last_app_active_at ?? null;
    const status = p.app_registration_status ?? null;
    const hidden = Boolean(p.is_hidden) || isHiddenProfileId(p.id);

    const isRegistered =
      status === "registered" || Boolean(lastActive) || Boolean(lastSignIn);

    const rowBase = { nr: nr || "?", name, email: email || "—" };

    if (hidden) {
      skipped.push({ ...rowBase, reason: "versteckt", skip: "hidden" });
      continue;
    }
    if (["1", "2", "3"].includes(nr)) {
      skipped.push({ ...rowBase, reason: "Nr. 1–3", skip: "exclude-nr" });
      continue;
    }

    if (isRegistered) {
      registered.push({
        ...rowBase,
        reason: status === "registered" ? "status" : lastActive ? "app-aktiv" : "login",
      });
      continue;
    }

    if (!email || isInvalidPlaceholderEmail(email)) {
      skipped.push({ ...rowBase, reason: "keine gültige E-Mail", skip: "invalid-email" });
      continue;
    }

    unregistered.push({ ...rowBase, reason: "offen" });
  }

  const byNr = (a: Row, b: Row) => Number(a.nr) - Number(b.nr) || a.nr.localeCompare(b.nr);
  unregistered.sort(byNr);
  registered.sort(byNr);
  skipped.sort(byNr);

  const emails = unregistered.map((r) => normalizeEmail(r.email));
  const uniqueEmails = new Set(emails);
  const duplicateEmails = emails.filter((e, i) => emails.indexOf(e) !== i);

  console.log(`Spalte app_registration_status: ${usedStatusColumn ? "ja" : "nein (Fallback last_app_active_at + Auth-Login)"}`);
  console.log(`Aktive Mitgliedschaften: ${userIds.length}`);
  console.log(`Profile geladen: ${profiles.length}`);
  console.log(`Bereits registriert (Login oder App-Aktivität): ${registered.length}`);
  console.log(`Noch nicht registriert (Kampagnen-Kandidaten): ${unregistered.length}`);
  console.log(`Übersprungen (versteckt / Nr.1–3 / ungültige Mail): ${skipped.length}`);
  console.log(`Einzigartige Inboxen unter den Kandidaten: ${uniqueEmails.size}`);
  if (duplicateEmails.length) {
    console.log(`Geteilte Inboxen: ${[...new Set(duplicateEmails)].join(", ")}`);
  }
  console.log("");
  console.log("--- Noch nicht registriert ---");
  for (const r of unregistered) {
    console.log(`${String(r.nr).padStart(3)}  ${r.name}  <${r.email}>`);
  }
  console.log("");
  console.log("--- Übersprungen ---");
  for (const r of skipped) {
    console.log(`${String(r.nr).padStart(3)}  ${r.name}  <${r.email}>  [${r.reason}]`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
