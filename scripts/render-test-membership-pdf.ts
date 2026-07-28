import { writeFile } from "fs/promises";
import { generateMembershipPdf } from "../src/lib/membership/generate-membership-pdf";

const data = {
  id: "test",
  membership_number: "1234",
  first_name: "Heinz",
  last_name: "Hallo",
  birthdate: "1980-01-15",
  street: "Teststraße 1",
  postal_code: "12345",
  city: "Berlin",
  country: "DE",
  phone: "",
  mobile_dial_code: "+49",
  mobile_number: "170 1234567",
  email: "heinz@example.de",
  membership_start_date: "2026-06-01",
  whatsapp_opt_in: true,
  whatsapp_dial_code: "+49",
  whatsapp_number: "170 1234567",
  privacy_accepted: true,
  signed_at_place: "Berlin",
  signed_at_date: "2026-07-28",
  instagram: "@heinz",
  facebook: "Heinz Hallo",
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
