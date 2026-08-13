"use server";

import { headers } from "next/headers";
import { requestForgotPasswordViaSmtp } from "@/lib/auth/forgot-password-request";

function clientIpFromHeaders(h: Headers): string | null {
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return h.get("x-real-ip")?.trim() || null;
}

export async function requestForgotPasswordEmail(email: string): Promise<
  { ok: true; message: string } | { ok: false; error: string }
> {
  const h = await headers();
  return requestForgotPasswordViaSmtp({
    email,
    clientIp: clientIpFromHeaders(h),
  });
}
