import { MembershipApplicationForm } from "@/components/membership/membership-application-form";
import { MembershipLanding } from "@/components/membership/membership-landing";
import {
  formatMemberCountLabel,
  getPublicActiveMemberCount,
} from "@/lib/membership/public-stats";

export const metadata = {
  title: "Mitglied werden · Anni Perka Fanclub",
  description:
    "Werde Teil des offiziellen Anni Perka Fanclubs — digital anmelden, Community erleben, exklusive Vorteile genießen.",
};

export default async function MitgliedschaftPage() {
  const memberCount = await getPublicActiveMemberCount();
  const memberCountLabel = formatMemberCountLabel(memberCount);

  return (
    <div className="grid gap-12 lg:gap-16">
      <MembershipLanding memberCountLabel={memberCountLabel} />
      <MembershipApplicationForm />
    </div>
  );
}
