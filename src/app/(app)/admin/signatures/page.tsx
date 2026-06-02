import { Topbar } from "@/components/app-shell/topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SignatureSettingsClient } from "./signature-settings.client";

export default async function AdminSignaturesPage() {
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

  return (
    <div className="min-h-screen">
      <Topbar title="Admin · Signatur" subtitle="Unterschrift zeichnen oder hochladen." />
      <main className="px-4 py-6 lg:px-6">
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>Deine Admin-Signatur</CardTitle>
          </CardHeader>
          <CardContent>
            <SignatureSettingsClient />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

