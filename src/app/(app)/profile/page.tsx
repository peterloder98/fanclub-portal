"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Topbar } from "@/components/app-shell/topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UploadDropzone } from "@/components/ui/upload-dropzone";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { getAvatarPublicUrl } from "@/lib/avatars/url";
import { AvatarCropModal } from "@/components/profile/avatar-crop-modal";
import { AdminSignatureSettings } from "@/components/admin/admin-signature-settings";
import { PointsGuideCard } from "@/components/points/points-guide-card";
import {
  AVATAR_ACCEPT,
  AVATAR_MIN_DIMENSION,
  isAllowedAvatarFile,
  readImageDimensions,
} from "@/lib/avatars/constants";

export default function ProfilePage() {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [name, setName] = useState<string>("Mitglied");
  const [avatarPath, setAvatarPath] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [role, setRole] = useState<"admin" | "anni" | "member">("member");
  const avatarUrl = getAvatarPublicUrl(avatarPath);

  useEffect(() => {
    async function load() {
      setError(null);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      setEmail(user.email ?? null);

      const { data: profile, error: profileErr } = await supabase
        .from("profiles")
        .select("first_name,last_name,avatar_path,role")
        .eq("id", user.id)
        .maybeSingle();
      if (profileErr) {
        setError(
          profileErr.message.includes("avatar_path")
            ? "DB ist noch nicht aktualisiert. Bitte `supabase/007a_avatars_profiles.sql` in Supabase ausführen."
            : profileErr.message,
        );
        return;
      }
      const displayName =
        profile?.first_name && profile?.last_name
          ? `${profile.first_name} ${profile.last_name}`
          : user.email ?? "Mitglied";
      setName(displayName);
      setAvatarPath(profile?.avatar_path ?? null);
      setRole((profile?.role ?? "member") as "admin" | "anni" | "member");
    }
    void load();
  }, [supabase]);

  async function uploadCropped(params: { blob: Blob; contentType: string }) {
    setBusy(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", params.blob, "avatar.webp");
      fd.append("contentType", params.contentType);

      const res = await fetch("/api/avatar/upload", { method: "POST", body: fd });
      const json = (await res.json()) as { ok?: boolean; avatar_path?: string; error?: string };
      if (!res.ok || !json.ok) {
        throw new Error(json.error ?? "Upload fehlgeschlagen");
      }

      setAvatarPath(json.avatar_path ?? null);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload fehlgeschlagen");
    } finally {
      setBusy(false);
      setCropFile(null);
    }
  }

  async function onPickFile(file: File) {
    setError(null);
    if (!isAllowedAvatarFile(file)) {
      setError("Bitte nur JPG, PNG oder WebP hochladen.");
      return;
    }
    try {
      const { width, height } = await readImageDimensions(file);
      if (width < AVATAR_MIN_DIMENSION || height < AVATAR_MIN_DIMENSION) {
        setError(
          `Das Bild ist zu klein (${width}×${height}). Mindestens ${AVATAR_MIN_DIMENSION}×${AVATAR_MIN_DIMENSION} Pixel.`,
        );
        return;
      }
    } catch {
      setError("Bild konnte nicht gelesen werden. Bitte JPG, PNG oder WebP verwenden.");
      return;
    }
    setCropFile(file);
  }

  return (
    <div className="min-h-screen">
      <Topbar title="Profil" subtitle="Profilbild hochladen/ändern." />
      <main className="px-4 py-6 lg:px-8">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Badge variant="neutral">{email ?? "—"}</Badge>
        </div>

        <Card className="max-w-xl">
          <CardHeader>
            <CardTitle>Profilbild</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 overflow-hidden rounded-full border bg-slate-50">
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatarUrl}
                    alt="Avatar"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="grid h-full w-full place-items-center text-sm font-semibold text-slate-600">
                    {name
                      .split(" ")
                      .filter(Boolean)
                      .slice(0, 2)
                      .map((p) => p[0]?.toUpperCase())
                      .join("")}
                  </div>
                )}
              </div>

              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-slate-900">{name}</div>
              </div>
            </div>

            <UploadDropzone
              accept={AVATAR_ACCEPT}
              disabled={busy}
              hint="Wird als 256×256 WebP gespeichert (optimiert)"
              onFile={onPickFile}
            />

            {error ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
                {error}
              </div>
            ) : null}

            {busy ? <div className="text-sm text-slate-600">Upload…</div> : null}
          </CardContent>
        </Card>

        <div className="mt-4">
          <PointsGuideCard />
        </div>

        {role === "admin" ? (
          <Card className="mt-4 max-w-xl">
            <CardHeader>
              <CardTitle>Admin-Signatur</CardTitle>
            </CardHeader>
            <CardContent>
              <AdminSignatureSettings />
            </CardContent>
          </Card>
        ) : null}
      </main>

      {cropFile ? (
        <AvatarCropModal
          file={cropFile}
          onClose={() => setCropFile(null)}
          onSave={uploadCropped}
        />
      ) : null}
    </div>
  );
}
