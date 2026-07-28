import { writeFile } from "fs/promises";
import { generateMembershipPdf } from "../src/lib/membership/generate-membership-pdf";

const data = {
  id: "test",
  membership_number: "42",
  first_name: "Friedhelm",
  last_name: "Meier",
  birthdate: "1988-08-08",
  street: "Baumweg 1",
  postal_code: "72383",
  city: "Ulm",
  country: "DE",
  phone: "",
  mobile_dial_code: "+49",
  mobile_number: "16034859345",
  email: "promotion@anniperka.de",
  membership_start_date: "2026-07-28",
  whatsapp_opt_in: true,
  whatsapp_dial_code: "+49",
  whatsapp_number: "16034859345",
  privacy_accepted: true,
  signed_at_place: "Ulm",
  signed_at_date: "2026-07-28",
  instagram: "@friedhelm",
  facebook: "Friedhelm Meier",
};

async function main() {
  const bytes = await generateMembershipPdf(data);
  await writeFile("tmp-filled-membership.pdf", Buffer.from(bytes));
  console.log("Wrote tmp-filled-membership.pdf");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
