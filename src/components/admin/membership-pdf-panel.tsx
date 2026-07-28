"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

async function fetchMembershipPdf(
  url: string,
  signal?: AbortSignal,
): Promise<Blob> {
  const res = await fetch(url, { credentials: "include", signal });
  if (!res.ok) {
    let message = `PDF konnte nicht geladen werden (${res.status})`;
    try {
      const json = (await res.json()) as { error?: string };
      if (json.error?.trim()) message = json.error.trim();
    } catch {
      /* Antwort war kein JSON */
    }
    throw new Error(message);
  }
  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("pdf")) {
    throw new Error("Server hat kein PDF geliefert. Bitte Seite neu laden oder Support melden.");
  }
  return res.blob();
}

export function MembershipPdfPanel({
  applicationId,
  title = "Vertrags-PDF (Antrag + Satzung)",
  downloadFilename = "Mitgliedsantrag.pdf",
}: {
  applicationId: string;
  title?: string;
  downloadFilename?: string;
}) {
  const [showPdf, setShowPdf] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const blobUrlRef = useRef<string | null>(null);

  const pdfViewUrl = `/api/membership/applications/${applicationId}/pdf`;
  const pdfDownloadUrl = `${pdfViewUrl}?download=1`;

  const revokeBlobUrl = useCallback(() => {
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
    setPdfBlobUrl(null);
  }, []);

  useEffect(() => {
    return () => {
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
    };
  }, []);

  useEffect(() => {
    revokeBlobUrl();
    setShowPdf(false);
    setLoadError(null);
    setLoading(false);
  }, [applicationId, revokeBlobUrl]);

  const loadPdf = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    revokeBlobUrl();
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 45_000);
    try {
      const blob = await fetchMembershipPdf(pdfViewUrl, controller.signal);
      const url = URL.createObjectURL(blob);
      blobUrlRef.current = url;
      setPdfBlobUrl(url);
      setShowPdf(true);
    } catch (e) {
      const msg =
        e instanceof Error && e.name === "AbortError"
          ? "Das PDF hat zu lange gedauert. Bitte „PDF speichern“ versuchen oder die Seite neu laden."
          : e instanceof Error
            ? e.message
            : "PDF konnte nicht geladen werden.";
      setLoadError(msg);
      setShowPdf(false);
    } finally {
      window.clearTimeout(timeout);
      setLoading(false);
    }
  }, [pdfViewUrl, revokeBlobUrl]);

  async function handleDownload() {
    setLoadError(null);
    setLoading(true);
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 45_000);
    try {
      const blob = await fetchMembershipPdf(pdfDownloadUrl, controller.signal);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = downloadFilename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      const msg =
        e instanceof Error && e.name === "AbortError"
          ? "Download hat zu lange gedauert. Bitte erneut versuchen."
          : e instanceof Error
            ? e.message
            : "Download fehlgeschlagen.";
      setLoadError(msg);
    } finally {
      window.clearTimeout(timeout);
      setLoading(false);
    }
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void loadPdf()}
            disabled={loading}
            className="h-10 rounded-xl border bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            {loading ? "Bitte warten…" : "PDF anzeigen"}
          </button>
          <button
            type="button"
            onClick={() => void handleDownload()}
            disabled={loading}
            className="inline-flex h-10 items-center rounded-xl bg-fc-navy px-4 text-sm font-semibold text-white hover:bg-fc-blue disabled:opacity-60"
          >
            PDF speichern
          </button>
        </div>

        {loadError ? (
          <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            {loadError}
          </p>
        ) : null}

        {showPdf && pdfBlobUrl ? (
          <div className="mt-3">
            <object
              data={pdfBlobUrl}
              type="application/pdf"
              className="h-[min(70vh,640px)] w-full rounded-xl border bg-slate-50"
            >
              <p className="p-4 text-sm text-slate-600">
                PDF-Vorschau wird von diesem Browser nicht unterstützt. Bitte „PDF speichern“ nutzen.
              </p>
            </object>
          </div>
        ) : (
          <p className="mt-3 text-sm text-slate-500">
            Vorschau auf Klick — gespeicherte PDF-Datei wird bevorzugt (schneller, ca. 1&nbsp;MB).
          </p>
        )}
      </CardContent>
    </Card>
  );
}
