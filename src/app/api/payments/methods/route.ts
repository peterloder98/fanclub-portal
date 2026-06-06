import { NextResponse } from "next/server";
import { listEnabledPaymentMethods } from "@/lib/payments/config";

export async function GET() {
  try {
    const methods = await listEnabledPaymentMethods();
    return NextResponse.json({
      methods: methods.map((m) => ({
        provider: m.provider,
        is_enabled: m.is_enabled,
        is_test_mode: m.is_test_mode,
      })),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Laden fehlgeschlagen";
    return NextResponse.json({ error: msg, methods: [] }, { status: 500 });
  }
}
