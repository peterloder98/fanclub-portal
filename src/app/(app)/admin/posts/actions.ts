"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdminAction } from "@/lib/admin/require-admin-action";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  notifyAdminsPendingPost,
  notifyMemberPostModerationResult,
} from "@/lib/email/post-moderation-notify";

const createSchema = z.object({
  author_role: z.enum(["admin", "anni"]).default("admin"),
  title: z.string().min(1),
  body: z.string().min(1),
});

async function requireAdmin() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (me?.role !== "admin") redirect("/dashboard");

  return { userId: user.id };
}

export async function createPost(formData: FormData) {
  const { userId } = await requireAdmin();
  const admin = createSupabaseAdminClient();
  const input = createSchema.parse(Object.fromEntries(formData.entries()));

  const { error } = await admin.from("posts").insert({
    author_id: userId,
    author_role: input.author_role,
    title: input.title,
    body: input.body,
    status: "approved",
    approved_at: new Date().toISOString(),
    approved_by: userId,
  });
  if (error) throw new Error(error.message);

  redirect("/admin/posts");
}

export async function seedDemoPosts() {
  const { userId } = await requireAdmin();
  const admin = createSupabaseAdminClient();

  const { error } = await admin.from("posts").insert([
    {
      author_id: userId,
      author_role: "admin",
      title: "Willkommen im Fanclub-Portal",
      body: "Das ist ein Test-Post für Likes und Kommentare. Bitte einmal ausprobieren: liken, kommentieren, wieder entliken.",
      status: "approved",
    },
    {
      author_id: userId,
      author_role: "admin",
      title: "Nächstes Konzert – wer ist dabei?",
      body: "Schreibt gerne in die Kommentare, ob ihr dabei seid. Später gibt es dafür Punkte.",
      status: "approved",
    },
  ]);
  if (error) throw new Error(error.message);

  redirect("/admin/posts");
}

/** Nach Mitglieder-Post: Admins per In-App + E-Mail informieren. */
export async function notifyPendingPostCreated(postId: string) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht angemeldet.");

  const admin = createSupabaseAdminClient();
  const { data: post, error } = await admin
    .from("posts")
    .select("id,author_id,body,status,title")
    .eq("id", postId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!post) throw new Error("Post nicht gefunden.");
  if (post.author_id !== user.id) throw new Error("Keine Berechtigung.");
  if (post.status !== "pending") return { ok: true as const, skipped: true };

  const { data: profile } = await admin
    .from("profiles")
    .select("first_name,last_name,email")
    .eq("id", user.id)
    .maybeSingle();
  const authorName =
    profile?.first_name && profile?.last_name
      ? `${profile.first_name} ${profile.last_name}`
      : profile?.email ?? "Mitglied";

  await notifyAdminsPendingPost({
    postId: post.id,
    authorId: user.id,
    authorName,
    body: post.body,
  });
  return { ok: true as const };
}

export async function approvePostAction(postId: string) {
  const { user } = await requireAdminAction();
  const id = postId.trim();
  if (!id) throw new Error("Post fehlt.");

  const admin = createSupabaseAdminClient();
  const { data: post, error: loadErr } = await admin
    .from("posts")
    .select("id,author_id,body,status")
    .eq("id", id)
    .maybeSingle();
  if (loadErr) throw new Error(loadErr.message);
  if (!post) throw new Error("Post nicht gefunden.");
  if (post.status !== "pending") throw new Error("Post ist nicht mehr wartend.");

  const { error } = await admin
    .from("posts")
    .update({
      status: "approved",
      approved_at: new Date().toISOString(),
      approved_by: user.id,
    })
    .eq("id", id);
  if (error) throw new Error(error.message);

  if (post.author_id) {
    await notifyMemberPostModerationResult({
      authorId: post.author_id,
      postId: post.id,
      approved: true,
      body: post.body,
    }).catch(console.error);
  }

  revalidatePath("/admin/posts");
  revalidatePath("/dashboard");
  revalidatePath("/posts");
  return { ok: true as const };
}

export async function rejectPostAction(postId: string) {
  await requireAdminAction();
  const id = postId.trim();
  if (!id) throw new Error("Post fehlt.");

  const admin = createSupabaseAdminClient();
  const { data: post, error: loadErr } = await admin
    .from("posts")
    .select("id,author_id,body,status")
    .eq("id", id)
    .maybeSingle();
  if (loadErr) throw new Error(loadErr.message);
  if (!post) throw new Error("Post nicht gefunden.");
  if (post.status !== "pending") throw new Error("Post ist nicht mehr wartend.");

  const { error } = await admin
    .from("posts")
    .update({ status: "rejected" })
    .eq("id", id);
  if (error) throw new Error(error.message);

  if (post.author_id) {
    await notifyMemberPostModerationResult({
      authorId: post.author_id,
      postId: post.id,
      approved: false,
      body: post.body,
    }).catch(console.error);
  }

  revalidatePath("/admin/posts");
  revalidatePath("/dashboard");
  revalidatePath("/posts");
  return { ok: true as const };
}

/** Legacy FormData wrappers */
export async function approvePost(formData: FormData) {
  await approvePostAction(String(formData.get("postId") ?? ""));
  redirect("/admin/posts");
}

export async function rejectPost(formData: FormData) {
  await rejectPostAction(String(formData.get("postId") ?? ""));
  redirect("/admin/posts");
}

export async function deletePostAdmin(formData: FormData) {
  await requireAdmin();
  const postId = String(formData.get("postId") ?? "");
  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("posts").delete().eq("id", postId);
  if (error) throw new Error(error.message);
  redirect("/admin/posts");
}

/** Fixiert einen Post oben im Feed bzw. löst die Fixierung (nur Admin). */
export async function setPostPinned(postId: string, pinned: boolean) {
  try {
    const { user } = await requireAdminAction();
    const id = postId.trim();
    if (!id) return { ok: false as const, error: "Post fehlt." };

    // User-Session nötig: Trigger posts_guard_pin_fields prüft is_admin() via auth.uid().
    // Service-Role hat kein uid → Pin würde fehlschlagen.
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase
      .from("posts")
      .update(
        pinned
          ? {
              is_pinned: true,
              pinned_at: new Date().toISOString(),
              pinned_by: user.id,
            }
          : {
              is_pinned: false,
              pinned_at: null,
              pinned_by: null,
            },
      )
      .eq("id", id);
    if (error) return { ok: false as const, error: error.message };

    revalidatePath("/dashboard");
    revalidatePath("/posts");
    return { ok: true as const };
  } catch (e) {
    return {
      ok: false as const,
      error: e instanceof Error ? e.message : "Fixieren fehlgeschlagen.",
    };
  }
}
