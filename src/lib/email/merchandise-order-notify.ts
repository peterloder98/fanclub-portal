import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { formatEur } from "@/lib/club/ledger";
import { sendEmailWithLog } from "@/lib/email/send-log";
import { notifyAllAdmins } from "@/lib/notifications/create";
import { NOTIFICATION_KINDS } from "@/lib/notifications/kinds";

function appBaseUrl() {
  return (process.env.APP_BASE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
}

export async function notifyAdminsMerchandiseOrder(input: {
  orderId: string;
  buyerFirstName: string;
  buyerLastName: string;
  items: Array<{
    qty: number;
    productName: string;
    sizeLabel: string | null;
    lineTotalCents: number;
  }>;
}) {
  const admin = createSupabaseAdminClient();
  const { data: admins } = await admin
    .from("profiles")
    .select("email,first_name,last_name")
    .eq("role", "admin")
    .not("email", "is", null);

  const recipients = (admins ?? []).filter((a) => a.email?.trim());
  if (!recipients.length) {
    console.warn("[merchandise] Keine Admin-E-Mails für Bestellbenachrichtigung.");
    return { sent: false };
  }

  const base = appBaseUrl();
  const orderUrl = base
    ? `${base}/admin/merchandise/orders/${input.orderId}`
    : `/admin/merchandise/orders/${input.orderId}`;

  const lines = input.items
    .map((i) => {
      const size = i.sizeLabel ? `, Größe ${i.sizeLabel}` : "";
      return `- ${i.qty}× ${i.productName}${size} (${formatEur(i.lineTotalCents)})`;
    })
    .join("\n");

  const subject = `Neue Bestellung durch ${input.buyerFirstName} ${input.buyerLastName}`;
  const text = `Liebe Admins,

soeben ging eine Bestellung von ${input.buyerFirstName} ${input.buyerLastName} ein:
${lines}

Bitte schau dir hier die Bestellung an und leite alle weiteren Schritte dafür ein:
${orderUrl}

Deine Anni Perka Fanclub App`;

  await notifyAllAdmins({
    kind: NOTIFICATION_KINDS.merchandiseOrderAdmin,
    title: "Neue Merchandise-Bestellung",
    body: `${input.buyerFirstName} ${input.buyerLastName} — ${input.items.length} Position(en).`,
    linkUrl: orderUrl,
    linkLabel: "Bestellung öffnen",
    metadata: { order_id: input.orderId },
  }).catch(console.error);

  let sent = 0;
  for (const adm of recipients) {
    const result = await sendEmailWithLog({
      to: adm.email!,
      subject,
      text,
      html: text.replace(/\n/g, "<br>"),
      templateKey: "merchandise_order_admin",
      context: { order_id: input.orderId },
    });
    if (result.ok) sent++;
  }
  return { sent: sent > 0, count: sent };
}
