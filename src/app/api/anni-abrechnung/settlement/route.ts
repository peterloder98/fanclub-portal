import { NextResponse } from "next/server";
import { getRequestMeProfile } from "@/lib/auth/request-auth";
import { requireAnniManagementFinanceAction } from "@/lib/anni-management/require";
import { loadAnniMgmtFinanceBundle } from "@/lib/anni-management/queries";
import {
  buildMonthlySettlementPdf,
  settlementPdfFilename,
} from "@/lib/anni-management/settlement-pdf";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    await requireAnniManagementFinanceAction();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "forbidden";
    const status = /angemeldet/i.test(msg) ? 401 : 403;
    return NextResponse.json({ error: msg }, { status });
  }

  const url = new URL(request.url);
  const year = Number(url.searchParams.get("year"));
  const month = Number(url.searchParams.get("month"));
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return NextResponse.json({ error: "Jahr/Monat ungültig." }, { status: 400 });
  }

  const { profile } = await getRequestMeProfile();
  const generatedByName =
    profile?.first_name && profile?.last_name
      ? `${profile.first_name} ${profile.last_name}`
      : profile?.email || "Abrechnung";

  const bundle = await loadAnniMgmtFinanceBundle();
  if (!bundle.schemaReady) {
    return NextResponse.json({ error: "Schema fehlt noch." }, { status: 503 });
  }

  const bytes = await buildMonthlySettlementPdf({
    jobs: bundle.jobs,
    year,
    month,
    generatedByName,
  });

  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${settlementPdfFilename(year, month)}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
