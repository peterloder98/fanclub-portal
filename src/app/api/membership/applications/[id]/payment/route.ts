import { NextResponse } from "next/server";
import { z } from "zod";
import { createApplicationMembershipPayment } from "@/lib/payments/application-payment";

const schema = z.object({
  token: z.string().min(1),
  paymentMethod: z.enum([
    "bank_transfer",
    "paypal",
    "stripe",
    "apple_pay",
    "amazon_pay",
  ]),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id: applicationId } = await context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const payment = await createApplicationMembershipPayment({
      applicationId,
      token: parsed.data.token,
      paymentMethod: parsed.data.paymentMethod,
    });
    return NextResponse.json({ ok: true, payment });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Zahlung fehlgeschlagen";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
