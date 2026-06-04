"use server";

import { revalidatePath } from "next/cache";
import { requireAdminAction } from "@/lib/admin/require-admin-action";
import {
  getAppSettingBool,
  NOTIFY_MEMBERS_NEW_GIVEAWAY_KEY,
  NOTIFY_MEMBERS_NEW_POLL_KEY,
  setAppSetting,
} from "@/lib/settings/app-settings";

export async function getMemberNotifySettingsAction() {
  await requireAdminAction();
  return {
    notifyNewGiveaway: await getAppSettingBool(NOTIFY_MEMBERS_NEW_GIVEAWAY_KEY, false),
    notifyNewPoll: await getAppSettingBool(NOTIFY_MEMBERS_NEW_POLL_KEY, false),
  };
}

export async function updateMemberNotifySettingsAction(input: {
  notifyNewGiveaway: boolean;
  notifyNewPoll: boolean;
}) {
  await requireAdminAction();
  await setAppSetting(NOTIFY_MEMBERS_NEW_GIVEAWAY_KEY, input.notifyNewGiveaway ? "true" : "false");
  await setAppSetting(NOTIFY_MEMBERS_NEW_POLL_KEY, input.notifyNewPoll ? "true" : "false");
  revalidatePath("/admin/settings/notifications");
  return { ok: true as const };
}
