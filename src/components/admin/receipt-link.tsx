"use client";

import { useState } from "react";
import { FileImage } from "lucide-react";

export function ReceiptLink({ path, label = "Beleg" }: { path: string; label?: string }) {
  const [busy, setBusy] = useState(false);

  async function open() {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/club-documents/signed?path=${encodeURIComponent(path)}`);
      const json = (await res.json()) as { url?: string; error?: string };
      if (json.url) window.open(json.url, "_blank", "noopener,noreferrer");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => void open()}
      className="inline-flex items-center gap-1 text-xs font-medium text-fc-blue hover:underline disabled:opacity-50"
    >
      <FileImage className="h-3.5 w-3.5" aria-hidden />
      {busy ? "Lädt…" : label}
    </button>
  );
}
