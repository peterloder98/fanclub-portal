import { Topbar } from "@/components/app-shell/topbar";
import { AdminBackLink } from "@/components/admin/admin-back-link";
import { requireAdmin } from "@/lib/admin/require-admin";
import { EmailTemplatesClient } from "./email-templates.client";

export default async function AdminEmailTemplatesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();
  const sp = await searchParams;
  const tabParam = sp.tab;
  const tab =
    tabParam === "birthday" || (Array.isArray(tabParam) && tabParam[0] === "birthday")
      ? "birthday"
      : "email";

  return (
    <div className="min-h-screen">
      <Topbar
        title="E-Mail & Geburtstagsgrüße"
        subtitle="System-E-Mails und rotierende Geburtstagspost-Vorlagen"
      />
      <main className="px-4 py-6 lg:px-8">
        <AdminBackLink />
        <div className="mt-4">
          <EmailTemplatesClient initialTab={tab} />
        </div>
      </main>
    </div>
  );
}
