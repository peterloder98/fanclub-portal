import { AdminBackLink } from "@/components/admin/admin-back-link";
import { Topbar } from "@/components/app-shell/topbar";
import { requireAdmin } from "@/lib/admin/require-admin";
import {
  getAppSettingBool,
  NOTIFY_MEMBERS_NEW_GIVEAWAY_KEY,
  NOTIFY_MEMBERS_NEW_POLL_KEY,
} from "@/lib/settings/app-settings";
import { MemberNotifySettingsClient } from "./member-notify-settings.client";

export default async function AdminMemberNotifySettingsPage() {
  await requireAdmin();

  const [notifyNewGiveaway, notifyNewPoll] = await Promise.all([
    getAppSettingBool(NOTIFY_MEMBERS_NEW_GIVEAWAY_KEY, false),
    getAppSettingBool(NOTIFY_MEMBERS_NEW_POLL_KEY, false),
  ]);

  return (
    <div className="min-h-screen">
      <Topbar
        title="Mitglieder-Benachrichtigungen"
        subtitle="E-Mails bei neuen Gewinnspielen und Umfragen (optional)"
      />
      <main className="px-4 py-6 lg:px-8">
        <AdminBackLink />
        <div className="mt-4">
        <MemberNotifySettingsClient
          initialGiveaway={notifyNewGiveaway}
          initialPoll={notifyNewPoll}
        />
        </div>
      </main>
    </div>
  );
}
