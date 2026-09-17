import { KM_RATE_CENTS_PER_KM } from "@/lib/anni-management/types";

export function parseEurToCents(raw: string): number | null {
  const normalized = raw.trim().replace(/\s/g, "").replace(/€/g, "");
  if (!normalized) return null;
  const hasComma = normalized.includes(",");
  const hasDot = normalized.includes(".");
  let n: number;
  if (hasComma && hasDot) {
    n = Number(normalized.replace(/\./g, "").replace(",", "."));
  } else if (hasComma) {
    n = Number(normalized.replace(",", "."));
  } else {
    n = Number(normalized);
  }
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

export function centsToEurNumber(cents: number): number {
  return cents / 100;
}

export function formatNetEur(cents: number): string {
  const sign = cents < 0 ? "−" : "";
  const abs = Math.abs(cents);
  return `${sign}${(abs / 100).toFixed(2).replace(".", ",")} €`;
}

export function autoKmNetCents(km: number): number {
  if (!Number.isFinite(km) || km <= 0) return 0;
  return Math.round(km * KM_RATE_CENTS_PER_KM);
}

export function commissionCents(baseCents: number, percent = 20): number {
  if (!Number.isFinite(baseCents) || baseCents <= 0) return 0;
  return Math.round((baseCents * percent) / 100);
}
