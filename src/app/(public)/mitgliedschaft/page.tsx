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

/** Marketing-Seite: Mitgliederzahl ist gecacht (siehe public-stats), ISR ok. */
export const revalidate = 600;

export default async function MitgliedschaftPage() {
  const memberCount = await getPublicActiveMemberCount();
  const memberCountLabel = formatMemberCountLabel(memberCount);

  return (
    <div className="grid gap-6 sm:gap-8 lg:gap-10">
      <MembershipLanding memberCountLabel={memberCountLabel} />
      {/* Form stays readable on wide screens / phones */}
      <div className="mx-auto w-full max-w-3xl">
        <MembershipApplicationForm />
      </div>
    </div>
  );
}
