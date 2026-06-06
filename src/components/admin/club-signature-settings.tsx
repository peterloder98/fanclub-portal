"use client";

import { useEffect, useState } from "react";
import { SignaturePad } from "@/components/profile/signature-pad";

export function ClubSignatureSettings() {
  const [text, setText] = useState("Anni-Perka-Fanclub e. V.\nVorstand");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creatingNew, setCreatingNew] = useState(false);

  async function load() {
    const res = await fetch("/api/admin/club-signature");
    if (!res.ok) return;
    const json = (await res.json()) as { text?: string; imageUrl?: string | null };
    setText(json.text ?? "");
    setImageUrl(json.imageUrl ?? null);
    setCreatingNew(!json.imageUrl);
  }

  useEffect(() => {
    void load();
  }, []);

  async function saveText() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/club-signature", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error("Speichern fehlgeschlagen");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fehler");
    } finally {
      setBusy(false);
    }
  }

  async function uploadImage(file: Blob, contentType: string) {
    if (imageUrl) {
      const ok = window.confirm(
        "Die gespeicherte Fanclub-Unterschrift überschreiben?\n\nOK = überschreiben\nAbbrechen = verwerfen",
      );
      if (!ok) return;
    }
    setBusy(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file, "signature.png");
      fd.append("contentType", contentType);
      const res = await fetch("/api/admin/club-signature", { method: "POST", body: fd });
      const json = (await res.json()) as { imageUrl?: string; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Upload fehlgeschlagen");
      setImageUrl(json.imageUrl ?? null);
      setCreatingNew(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload fehlgeschlagen");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-4">
      <p className="text-sm text-slate-600">
        Allgemeine Signatur des Fanclubs für System-E-Mails (z. B. Benachrichtigungen). Jeder Admin
        kann sie bearbeiten.
      </p>

      <label className="grid gap-1">
        <span className="text-sm font-medium text-slate-700">Signatur-Text (Fanclub)</span>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          className="w-full rounded-xl border bg-white px-3 py-2 text-sm outline-none focus:ring-4 focus:ring-[color:var(--ring)]"
        />
      </label>
      <button
        type="button"
        disabled={busy}
        onClick={() => void saveText()}
        className="h-10 w-fit rounded-xl bg-fc-navy px-4 text-sm font-semibold text-white disabled:opacity-60"
      >
        Text speichern
      </button>

      <div className="rounded-2xl border bg-slate-50 p-4">
        <div className="text-sm font-semibold text-fc-navy">Gespeicherte Unterschrift (Fanclub)</div>
        {imageUrl && !creatingNew ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt="Fanclub-Unterschrift"
            className="mt-3 max-h-32 w-auto rounded-xl border bg-white p-2"
          />
        ) : (
          <p className="mt-2 text-sm text-slate-600">Noch keine Bild-Unterschrift.</p>
        )}
      </div>

      {imageUrl && !creatingNew ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => setCreatingNew(true)}
          className="h-10 w-fit rounded-xl border bg-white px-4 text-sm font-semibold text-slate-800"
        >
          Neue Unterschrift erstellen
        </button>
      ) : null}

      {creatingNew || !imageUrl ? (
        <div className="grid gap-3 rounded-2xl border border-dashed border-slate-200 p-4">
          <SignaturePad
            disabled={busy}
            onSave={async (blob) => {
              await uploadImage(blob, "image/png");
            }}
          />
          <div className="text-sm font-medium text-slate-700">Oder Bild hochladen</div>
          <input
            type="file"
            accept="image/png,image/jpeg"
            disabled={busy}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              await uploadImage(file, file.type || "image/png");
              e.target.value = "";
            }}
          />
          {imageUrl ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => setCreatingNew(false)}
              className="h-9 w-fit rounded-lg border px-3 text-sm font-medium text-slate-700"
            >
              Abbrechen
            </button>
          ) : null}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {error}
        </div>
      ) : null}
    </div>
  );
}
