"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function MembershipPdfPanel({
  applicationId,
  title = "Vertrags-PDF (Antrag + Satzung)",
  downloadFilename,
}: {
  applicationId: string;
  title?: string;
  downloadFilename?: string;
}) {
  const [showPdf, setShowPdf] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const pdfViewUrl = `/api/membership/applications/${applicationId}/pdf`;
  const pdfDownloadUrl = `${pdfViewUrl}?download=1`;

  useEffect(() => {
    if (!showPdf) return;
    setLoadError(null);
    const timer = window.setTimeout(() => {
      setLoadError(
        "Das PDF lädt länger als erwartet. Bitte „PDF speichern“ nutzen oder die Seite neu laden.",
      );
    }, 25_000);
    return () => window.clearTimeout(timer);
  }, [showPdf, applicationId]);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setShowPdf(true);
              setLoadError(null);
            }}
            className="h-10 rounded-xl border bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            PDF anzeigen
          </button>
          <a
            href={pdfDownloadUrl}
            download={downloadFilename}
            className="inline-flex h-10 items-center rounded-xl bg-fc-navy px-4 text-sm font-semibold text-white hover:bg-fc-blue"
          >
            PDF speichern
          </a>
        </div>

        {showPdf ? (
          <div className="mt-3">
            {loadError ? (
              <p className="mb-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                {loadError}
              </p>
            ) : (
              <p className="mb-2 text-xs text-slate-500">PDF wird geladen…</p>
            )}
            <iframe
              title={title}
              src={pdfViewUrl}
              onLoad={() => setLoadError(null)}
              className="h-[min(70vh,640px)] w-full rounded-xl border bg-slate-50"
            />
          </div>
        ) : (
          <p className="mt-3 text-sm text-slate-500">
            Vorschau erst auf Klick — gespeicherte PDF wird bevorzugt (schneller).
          </p>
        )}
      </CardContent>
    </Card>
  );
}
