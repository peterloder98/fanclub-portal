"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { SignaturePad } from "@/components/profile/signature-pad";

export function AdminSignatureSettings() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [userId, setUserId] = useState<string | null>(null);
  const [sigText, setSigText] = useState("");
  const [sigPath, setSigPath] = useState<string | null>(null);
  const [sigImageUrl, setSigImageUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creatingNew, setCreatingNew] = useState(false);

  const loadImageUrl = useCallback(async (path: string | null) => {
    if (!path) {
      setSigImageUrl(null);
      return;
    }
    try {
      const res = await fetch("/api/signature/image");
      const json = (await res.json()) as { url?: string };
      if (res.ok && json.url) setSigImageUrl(json.url);
      else setSigImageUrl(null);
    } catch {
      setSigImageUrl(null);
    }
  }, []);

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      const { data: p } = await supabase
        .from("profiles")
        .select("admin_signature_text,admin_signature_image_path")
        .eq("id", user.id)
        .maybeSingle();
      setSigText((p as { admin_signature_text?: string })?.admin_signature_text ?? "");
      const path = (p as { admin_signature_image_path?: string })?.admin_signature_image_path ?? null;
      setSigPath(path);
      setCreatingNew(!path);
      await loadImageUrl(path);
    }
    void load();
  }, [supabase, loadImageUrl]);

  async function saveText() {
    if (!userId) return;
    setBusy(true);
    setError(null);
    try {
      const { error: upErr } = await supabase
        .from("profiles")
        .update({ admin_signature_text: sigText })
        .eq("id", userId);
      if (upErr) throw upErr;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Speichern fehlgeschlagen");
    } finally {
      setBusy(false);
    }
  }

  function confirmOverwrite(): boolean {
    if (!sigPath) return true;
    return window.confirm(
      "Die gespeicherte Unterschrift überschreiben?\n\nOK = überschreiben\nAbbrechen = verwerfen",
    );
  }

  async function upload(file: Blob, contentType: string) {
    if (!confirmOverwrite()) return;
    setBusy(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file, "signature.png");
      fd.append("contentType", contentType);
      const res = await fetch("/api/signature/upload", { method: "POST", body: fd });
      const json = (await res.json()) as { ok?: boolean; path?: string; error?: string };
      if (!res.ok || !json.ok) throw new Error(json.error ?? "Upload fehlgeschlagen");
      setSigPath(json.path ?? null);
      await loadImageUrl(json.path ?? null);
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
        Optional: deine persönliche Signatur für E-Mails, die du manuell versendest. Standard ist
        immer die allgemeine Fanclub-Signatur — nicht automatisch für andere Admins.
      </p>

      <label className="grid gap-1">
        <span className="text-sm font-medium text-slate-700">Signatur-Text (persönlich)</span>
        <textarea
          value={sigText}
          onChange={(e) => setSigText(e.target.value)}
          rows={4}
          className="w-full rounded-xl border bg-white px-3 py-2 text-sm outline-none focus:ring-4 focus:ring-[color:var(--ring)]"
        />
      </label>
      <button
        type="button"
        disabled={busy}
        onClick={() => void saveText()}
        className="h-10 w-fit rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white disabled:opacity-60"
      >
        Text speichern
      </button>

      <div className="rounded-2xl border bg-slate-50 p-4">
        <div className="text-sm font-semibold text-slate-900">Gespeicherte Unterschrift:</div>
        {sigImageUrl && !creatingNew ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={sigImageUrl}
            alt="Deine Unterschrift"
            className="mt-3 max-h-32 w-auto rounded-xl border bg-white p-2"
          />
        ) : (
          <p className="mt-2 text-sm text-slate-600">Noch keine Unterschrift gespeichert.</p>
        )}
      </div>

      {sigImageUrl && !creatingNew ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => setCreatingNew(true)}
          className="h-10 w-fit rounded-xl border bg-white px-4 text-sm font-semibold text-slate-800"
        >
          Neue Unterschrift erstellen
        </button>
      ) : null}

      {creatingNew || !sigImageUrl ? (
        <div className="grid gap-3 rounded-2xl border border-dashed border-slate-200 p-4">
          <SignaturePad disabled={busy} onSave={async (blob) => upload(blob, "image/png")} />
          <div className="text-sm font-medium text-slate-700">Oder Bild hochladen</div>
          <input
            type="file"
            accept="image/png,image/jpeg"
            disabled={busy}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              await upload(file, file.type || "image/png");
              e.target.value = "";
            }}
          />
          {sigImageUrl ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setCreatingNew(false);
                void loadImageUrl(sigPath);
              }}
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
