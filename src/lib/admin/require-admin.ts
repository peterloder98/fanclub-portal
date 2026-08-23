import { redirect } from "next/navigation";
import { getRequestMeProfile } from "@/lib/auth/request-auth";

export async function requireAdmin() {
  const { supabase, user, profile } = await getRequestMeProfile();
  if (!user) redirect("/login");
  if (profile?.role !== "admin") redirect("/dashboard");
  return { user, profile, supabase };
}
