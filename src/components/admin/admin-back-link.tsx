import Link from "next/link";

export function AdminBackLink({
  href = "/admin",
  label = "← Admin",
}: {
  href?: string;
  label?: string;
}) {
  return (
    <Link href={href} className="text-sm font-medium text-fc-blue hover:underline">
      {label}
    </Link>
  );
}
