"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function MembershipPdfPanel({
  applicationId,
  title = "Vertrags-PDF (Antrag + Satzung)",
}: {
  applicationId: string;
  title?: string;
}) {
  const [showPdf, setShowPdf] = useState(false);
  const [iframeReady, setIframeReady] = useState(false);

  const pdfViewUrl = `/api/membership/applications/${applicationId}/pdf`;
  const pdfDownloadUrl = `${pdfViewUrl}?download=1`;

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
              setIframeReady(false);
            }}
            className="h-10 rounded-xl border bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            PDF anzeigen
          </button>
          <a
            href={pdfDownloadUrl}
            download
            className="inline-flex h-10 items-center rounded-xl bg-fc-navy px-4 text-sm font-semibold text-white hover:bg-fc-blue"
          >
            PDF speichern
          </a>
        </div>

        {showPdf ? (
          <div className="relative mt-3">
            {!iframeReady ? (
              <div className="flex h-48 items-center justify-center rounded-xl border bg-slate-50 text-sm text-slate-600">
                PDF wird geladen…
              </div>
            ) : null}
            <iframe
              title={title}
              src={pdfViewUrl}
              onLoad={() => setIframeReady(true)}
              className={`w-full rounded-xl border bg-slate-50 ${
                iframeReady ? "h-[min(70vh,640px)]" : "absolute h-0 w-0 opacity-0"
              }`}
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
