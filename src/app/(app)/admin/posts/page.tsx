import { Topbar } from "@/components/app-shell/topbar";
import { PendingPostsQueue } from "@/components/admin/pending-posts-queue.client";
import { requireAdmin } from "@/lib/admin/require-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getAvatarPublicUrl } from "@/lib/avatars/url";
import { postMediaPublicUrl } from "@/lib/posts/media-url";
import { AdminBackLink } from "@/components/admin/admin-back-link";
import { isUnsubmittedComposerDraft } from "@/lib/posts/composer-draft";

export default async function AdminPostsPage() {
  await requireAdmin();
  const admin = createSupabaseAdminClient();

  const { data: pending } = await admin
    .from("posts")
    .select("id,body,created_at,author_id,status,author_role")
    .eq("status", "pending")
    .neq("body", "")
    .order("created_at", { ascending: true })
    .limit(50);

  const rows = (pending ?? []).filter(
    (r) => !isUnsubmittedComposerDraft(r) && r.author_role !== "admin" && r.author_role !== "anni",
  );
  const authorIds = Array.from(
    new Set(rows.map((r) => r.author_id).filter(Boolean)),
  ) as string[];
  const postIds = rows.map((r) => r.id);

  const [{ data: profiles }, { data: media }] = await Promise.all([
    authorIds.length
      ? admin
          .from("profiles")
          .select("id,first_name,last_name,email,avatar_path,updated_at")
          .in("id", authorIds)
      : Promise.resolve({ data: [] as Array<{
          id: string;
          first_name: string | null;
          last_name: string | null;
          email: string | null;
          avatar_path: string | null;
          updated_at: string | null;
        }> }),
    postIds.length
      ? admin
          .from("post_media")
          .select("post_id,storage_path")
          .in("post_id", postIds)
      : Promise.resolve({ data: [] as Array<{ post_id: string; storage_path: string }> }),
  ]);

  const profileMap = new Map(
    (profiles ?? []).map((p) => [
      p.id,
      {
        name:
          p.first_name && p.last_name
            ? `${p.first_name} ${p.last_name}`
            : (p.email ?? "Mitglied"),
        avatarUrl: getAvatarPublicUrl(p.avatar_path, p.updated_at),
      },
    ]),
  );

  const mediaByPost = new Map<string, string[]>();
  for (const m of media ?? []) {
    const url = postMediaPublicUrl(m.storage_path);
    if (!url) continue;
    const list = mediaByPost.get(m.post_id) ?? [];
    list.push(url);
    mediaByPost.set(m.post_id, list);
  }

  const queue = rows.map((r) => ({
    id: r.id,
    body: r.body,
    created_at: r.created_at,
    authorName: r.author_id
      ? profileMap.get(r.author_id)?.name ?? "Mitglied"
      : "Mitglied",
    authorAvatarUrl: r.author_id
      ? profileMap.get(r.author_id)?.avatarUrl ?? null
      : null,
    mediaUrls: mediaByPost.get(r.id) ?? [],
  }));

  return (
    <div className="min-h-full">
      <Topbar title="Posts freigeben" subtitle="Mitgliederbeiträge prüfen" />
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-6">
        <AdminBackLink href="/admin" label="← Admin" />
        <p className="text-sm text-slate-600">
          Beiträge von Mitgliedern erscheinen erst nach Freigabe im Feed. Bei Ablehnung
          erhält das Mitglied eine In-App-Benachrichtigung (keine E-Mail).
        </p>
        <PendingPostsQueue posts={queue} />
      </div>
    </div>
  );
}
