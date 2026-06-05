import { redirect } from "next/navigation";

export default function AdminBirthdayPostsRedirect() {
  redirect("/admin/settings/email-templates?tab=birthday");
}
