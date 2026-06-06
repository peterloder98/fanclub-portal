import { MembershipApplicationForm } from "@/components/membership/membership-application-form";

export const metadata = {
  title: "Mitglied werden · Anni Perka Fanclub",
  description: "Online-Antrag auf Mitgliedschaft im Fanclub.",
};

export default function MitgliedschaftPage() {
  return (
    <div className="grid gap-6">
      <h1 className="text-2xl font-semibold text-slate-900">Mitglied werden</h1>
      <MembershipApplicationForm />
    </div>
  );
}
