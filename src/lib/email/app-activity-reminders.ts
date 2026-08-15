import type { SupabaseClient } from "@supabase/supabase-js";
import { renderEmailFromTemplate } from "@/lib/email/render-template";
import { EMAIL_TEMPLATE_KEYS } from "@/lib/email/template-keys";
import { sendEmailWithLog } from "@/lib/email/send-log";
import { emailPersonVars } from "@/lib/email/salutation-block";
import { userAllowsMemberEmail } from "@/lib/email/member-email-prefs";
import { getAccountAccessFlowForUser } from "@/lib/auth/account-access-flow";
import { rotateAccountSetupToken } from "@/lib/auth/account-setup-token";

const SIGNUP_MAX = 4;
const SIGNUP_INTERVAL_DAYS = 7;
const INACTIVE_AFTER_DAYS = 30;

function appBaseUrl() {
  return (process.env.APP_BASE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "").replace(
    /\/$/,
    "",
  );
}

function daysSince(iso: string | null | undefined, ref = new Date()): number | null {
  if (!iso) return null;
  const start = new Date(iso);
  if (Number.isNaN(start.getTime())) return null;
  return Math.floor((ref.getTime() - start.getTime()) / 86_400_000);
}

async function buildSetupUrl(email: string, userId: string): Promise<string | null> {
  try {
    // Keine Setup-Erinnerung an bereits registrierte (z. B. Login ohne last_app_active_at)
    const flow = await getAccountAccessFlowForUser(userId);
    if (flow === "password_reset") return null;
    const { setupUrl } = await rotateAccountSetupToken({ email, userId });
    return setupUrl;
  } catch (e) {
    console.error(
      "[app-activity-reminders] setup link:",
      e instanceof Error ? e.message : e,
    );
    return null;
  }
}

type ProfileReminderRow = {
  id: string;
  first_name: string | null;
  email: string | null;
  gender: string | null;
  last_app_active_at: string | null;
  created_at: string | null;
  app_signup_reminder_count: number | null;
  app_signup_reminder_last_at: string | null;
  app_inactive_reminder_sent_at: string | null;
};

export async function runAppActivityReminders(admin: SupabaseClient) {
  const base = appBaseUrl();
  if (!base) {
    return {
      signupSent: 0,
      inactiveSent: 0,
      skipped: 0,
      error: "APP_BASE_URL fehlt",
    };
  }

  const { data: members, error } = await admin
    .from("memberships")
    .select("user_id,start_date")
    .eq("status", "active");

  if (error) throw new Error(error.message);
  if (!members?.length) {
    return { signupSent: 0, inactiveSent: 0, skipped: 0, checked: 0 };
  }

  const userIds = members.map((m) => m.user_id);
  const startByUser = new Map(members.map((m) => [m.user_id, m.start_date as string | null]));

  const { data: profiles, error: profileErr } = await admin
    .from("profiles")
    .select(
      "id,first_name,email,gender,last_app_active_at,created_at,app_signup_reminder_count,app_signup_reminder_last_at,app_inactive_reminder_sent_at",
    )
    .in("id", userIds);

  if (profileErr) {
    if (/app_signup_reminder|app_inactive_reminder|does not exist/i.test(profileErr.message)) {
      return {
        signupSent: 0,
        inactiveSent: 0,
        skipped: 0,
        checked: 0,
        error: "Migration 122_app_activity_reminder_emails.sql fehlt",
      };
    }
    throw new Error(profileErr.message);
  }

  let signupSent = 0;
  let inactiveSent = 0;
  let skipped = 0;
  const now = new Date();

  for (const profile of (profiles ?? []) as ProfileReminderRow[]) {
    if (!profile.email?.trim()) {
      skipped += 1;
      continue;
    }

    if (!(await userAllowsMemberEmail(profile.id, "app_activity"))) {
      skipped += 1;
      continue;
    }

    const neverActive = !profile.last_app_active_at;

    if (neverActive) {
      const count = profile.app_signup_reminder_count ?? 0;
      if (count >= SIGNUP_MAX) {
        skipped += 1;
        continue;
      }

      const reference =
        count === 0
          ? startByUser.get(profile.id) || profile.created_at || null
          : profile.app_signup_reminder_last_at;
      const days = daysSince(reference, now);
      if (days == null || days < SIGNUP_INTERVAL_DAYS) {
        skipped += 1;
        continue;
      }

      const setupUrl = await buildSetupUrl(profile.email, profile.id);
      if (!setupUrl) {
        skipped += 1;
        continue;
      }

      const person = emailPersonVars({
        firstName: profile.first_name?.trim() || "Fan",
        gender: profile.gender,
      });

      try {
        const rendered = await renderEmailFromTemplate(EMAIL_TEMPLATE_KEYS.appSignupReminder, {
          ...person,
          setup_url: setupUrl,
        });
        await sendEmailWithLog({
          to: profile.email,
          subject: rendered.subject,
          text: rendered.text,
          html: rendered.html,
          attachments: rendered.signatureAttachment
            ? [rendered.signatureAttachment]
            : undefined,
          templateKey: EMAIL_TEMPLATE_KEYS.appSignupReminder,
          context: {
            user_id: profile.id,
            reminder_number: count + 1,
          },
        });

        await admin
          .from("profiles")
          .update({
            app_signup_reminder_count: count + 1,
            app_signup_reminder_last_at: now.toISOString(),
          })
          .eq("id", profile.id);

        signupSent += 1;
      } catch (e) {
        console.error("[app-activity-reminders] signup:", e);
        skipped += 1;
      }
      continue;
    }

    // Inaktiv: war schon einmal aktiv, aber ≥ 30 Tage nicht mehr
    const inactiveDays = daysSince(profile.last_app_active_at, now);
    if (inactiveDays == null || inactiveDays < INACTIVE_AFTER_DAYS) {
      skipped += 1;
      continue;
    }

    const alreadyReminded =
      profile.app_inactive_reminder_sent_at &&
      new Date(profile.app_inactive_reminder_sent_at).getTime() >=
        new Date(profile.last_app_active_at!).getTime();

    if (alreadyReminded) {
      skipped += 1;
      continue;
    }

    const person = emailPersonVars({
      firstName: profile.first_name?.trim() || "Fan",
      gender: profile.gender,
    });
    const appUrl = `${base}/dashboard`;

    try {
      const rendered = await renderEmailFromTemplate(EMAIL_TEMPLATE_KEYS.appInactiveReminder, {
        ...person,
        app_url: appUrl,
      });
      await sendEmailWithLog({
        to: profile.email,
        subject: rendered.subject,
        text: rendered.text,
        html: rendered.html,
        attachments: rendered.signatureAttachment
          ? [rendered.signatureAttachment]
          : undefined,
        templateKey: EMAIL_TEMPLATE_KEYS.appInactiveReminder,
        context: {
          user_id: profile.id,
          inactive_days: inactiveDays,
        },
      });

      await admin
        .from("profiles")
        .update({ app_inactive_reminder_sent_at: now.toISOString() })
        .eq("id", profile.id);

      inactiveSent += 1;
    } catch (e) {
      console.error("[app-activity-reminders] inactive:", e);
      skipped += 1;
    }
  }

  return {
    signupSent,
    inactiveSent,
    skipped,
    checked: profiles?.length ?? 0,
  };
}
