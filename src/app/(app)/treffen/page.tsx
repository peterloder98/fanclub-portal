import { redirect } from "next/navigation";

export default function TreffenIndexPage() {
  redirect("/mitglieder?tab=treffen");
}
