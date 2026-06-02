"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

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
    },
    {
      author_id: userId,
      author_role: "admin",
      title: "Nächstes Konzert – wer ist dabei?",
      body: "Schreibt gerne in die Kommentare, ob ihr dabei seid. Später gibt es dafür Punkte.",
    },
    {
      author_id: userId,
      author_role: "admin",
      title: "Mini-Umfrage (Test)",
      body: "Welche Farbe soll die Hauptfarbe im Portal haben? Blau oder Pink/Rot? (Nur Test, echte Umfragen kommen später.)",
    },
  ]);
  if (error) throw new Error(error.message);

  redirect("/admin/posts");
}

export async function approvePost(formData: FormData) {
  const { userId } = await requireAdmin();
  const postId = String(formData.get("postId") ?? "");
  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("posts")
    .update({
      status: "approved",
      approved_at: new Date().toISOString(),
      approved_by: userId,
    })
    .eq("id", postId);
  if (error) throw new Error(error.message);
  redirect("/admin/posts");
}

export async function rejectPost(formData: FormData) {
  await requireAdmin();
  const postId = String(formData.get("postId") ?? "");
  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("posts")
    .update({ status: "rejected" })
    .eq("id", postId);
  if (error) throw new Error(error.message);
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

