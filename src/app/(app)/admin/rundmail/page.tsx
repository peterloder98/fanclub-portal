import { AdminBackLink } from "@/components/admin/admin-back-link";
import { Topbar } from "@/components/app-shell/topbar";
import { requireAdmin } from "@/lib/admin/require-admin";
import { listRundmailRecipients } from "@/lib/email/board-rundmail-recipients";
import { RundmailComposer } from "./rundmail-composer.client";

export default async function AdminRundmailPage() {
  await requireAdmin();

  let recipients: Awaited<ReturnType<typeof listRundmailRecipients>> = [];
  let loadError: string | null = null;
  try {
    recipients = await listRundmailRecipients();
  } catch (error) {
    console.error("[rundmail] Liste fehlgeschlagen:", error instanceof Error ? error.message : "unknown");
    loadError = "Die Mitgliederliste konnte nicht geladen werden. Bitte die Seite neu öffnen.";
  }

  return (
    <div className="min-h-screen">
      <Topbar title="Rundmail" subtitle="Eine Mail an alle oder an ausgewählte Mitglieder" />
      <main className="px-4 py-6 lg:px-8">
        <AdminBackLink />
        <div className="mt-4">
          {loadError ? (
            <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800" role="alert">
              {loadError}
            </p>
          ) : (
            <RundmailComposer recipients={recipients} />
          )}
        </div>
      </main>
    </div>
  );
}
