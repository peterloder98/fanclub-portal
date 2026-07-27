import { FEATURE_FLAGS } from "@/lib/feature-flags";
import { redirect } from "next/navigation";

export default function AdminMerchandiseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!FEATURE_FLAGS.merchandise) redirect("/admin");
  return children;
}
