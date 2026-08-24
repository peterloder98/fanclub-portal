import type { SupabaseClient } from "@supabase/supabase-js";
import { renderEmailFromTemplate } from "@/lib/email/render-template";
import { EMAIL_TEMPLATE_KEYS, type EmailTemplateKey } from "@/lib/email/template-keys";
import { emailPersonVars } from "@/lib/email/salutation-block";
import { sendEmailWithLog } from "@/lib/email/send-log";
import { paceBulkOutboundEmail } from "@/lib/smtp/outbound-throttle";
import { resolveLiveAnniEmail } from "@/lib/live/anni-recipient";
import { boardMeetingRoomUrl, type BoardVideoMeetingRow } from "@/lib/board-video/types";
import { BOARD_VIDEO_MEETING_SELECT } from "@/lib/board-video/lifecycle";
import { formatBerlinDateTime, formatBerlinTime } from "@/lib/datetime/berlin";

type MeetingMail = Pick<
  BoardVideoMeetingRow,
  "id" | "slug" | "title" | "starts_at" | "ends_at" | "join_opens_at"
>;

function meetingMailVars(session: MeetingMail) {
  return {
    meeting_title: session.title,
    meeting_date: formatBerlinDateTime(session.starts_at),
    meeting_time: formatBerlinTime(session.starts_at),
    join_opens_time: formatBerlinTime(session.join_opens_at),
  };
}

async function sendOneBoardMeetingEmail(input: {
  to: string;
  templateKey: EmailTemplateKey;
  vars: Record<string, string>;
  meetingId: string;
}): Promise<boolean> {
  try {
    const rendered = await renderEmailFromTemplate(input.templateKey, input.vars);
    const result = await sendEmailWithLog({
      to: input.to,
      subject: rendered.subject,
      text: rendered.text,
      html: rendered.html,
      templateKey: input.templateKey,
      context: { board_video_meeting_id: input.meetingId },
    });
    return result.ok;
  } catch (e) {
    console.error("[board-video] email failed", input.to, e);
    return false;
  }
}

export async function sendBoardMeetingInviteEmails(input: {
  meeting: MeetingMail;
  adminParticipants: Array<{
    email: string;
    firstName: string | null;
    gender: string | null;
  }>;
  anniGuestUrl: string;
}): Promise<{ sent: number }> {
  const baseVars = meetingMailVars(input.meeting);
  const roomUrl = boardMeetingRoomUrl(input.meeting.slug);
  let sent = 0;
  let index = 0;

  for (const p of input.adminParticipants) {
    const person = emailPersonVars({
      firstName: p.firstName ?? "",
      gender: p.gender as "male" | "female" | "other" | null,
    });
    const ok = await sendOneBoardMeetingEmail({
      to: p.email,
      templateKey: EMAIL_TEMPLATE_KEYS.boardVideoMeetingInvite,
      vars: { ...person, ...baseVars, meeting_url: roomUrl },
      meetingId: input.meeting.id,
    });
    if (ok) sent += 1;
    index += 1;
    await paceBulkOutboundEmail(index);
  }

  const anniOk = await sendOneBoardMeetingEmail({
    to: resolveLiveAnniEmail(),
    templateKey: EMAIL_TEMPLATE_KEYS.boardVideoMeetingAnniInvite,
    vars: {
      ...emailPersonVars({ firstName: "Anni", gender: "female" }),
      ...baseVars,
      meeting_url: input.anniGuestUrl,
    },
    meetingId: input.meeting.id,
  });
  if (anniOk) sent += 1;

  return { sent };
}

export async function runBoardVideoMeetingReminders(admin: SupabaseClient): Promise<{
  meetings: number;
  emails: number;
}> {
  const now = new Date();
  const windowStart = new Date(now.getTime() + 20 * 3600_000);
  const windowEnd = new Date(now.getTime() + 28 * 3600_000);

  const { data: meetings, error } = await admin
    .from("board_video_meetings")
    .select(BOARD_VIDEO_MEETING_SELECT)
    .eq("status", "scheduled")
    .is("reminder_sent_at", null)
    .gte("starts_at", windowStart.toISOString())
    .lte("starts_at", windowEnd.toISOString());

  if (error) {
    console.error("[board-video-reminder] load failed", error.message);
    return { meetings: 0, emails: 0 };
  }

  let emails = 0;
  for (const meeting of meetings ?? []) {
    const { data: participants } = await admin
      .from("board_video_meeting_participants")
      .select("id,email,is_anni,user_id")
      .eq("meeting_id", meeting.id);

    if (!participants?.length) continue;

    const baseVars = meetingMailVars(meeting as MeetingMail);
    const roomUrl = boardMeetingRoomUrl(meeting.slug);
    let meetingEmails = 0;

    for (const p of participants) {
      if (p.is_anni) continue;
      const { data: profile } = p.user_id
        ? await admin
            .from("profiles")
            .select("first_name,gender")
            .eq("id", p.user_id)
            .maybeSingle()
        : { data: null };

      const person = emailPersonVars({
        firstName: profile?.first_name ?? null,
        gender: (profile?.gender as "male" | "female" | "other" | null) ?? null,
      });
      const ok = await sendOneBoardMeetingEmail({
        to: p.email,
        templateKey: EMAIL_TEMPLATE_KEYS.boardVideoMeetingReminder,
        vars: { ...person, ...baseVars, meeting_url: roomUrl },
        meetingId: meeting.id,
      });
      if (ok) meetingEmails += 1;
    }

    if (meetingEmails > 0) {
      await admin
        .from("board_video_meetings")
        .update({
          reminder_sent_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", meeting.id);
      emails += meetingEmails;
    }
  }

  return { meetings: meetings?.length ?? 0, emails };
}
