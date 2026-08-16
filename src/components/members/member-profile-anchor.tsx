import Link from "next/link";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { memberProfileHref } from "@/lib/members/hidden";
import { cn } from "@/lib/cn";

type Props = {
  userId: string | null | undefined;
  children: ReactNode;
  className?: string;
  /** Zusätzliche Props nur wenn ein Link gerendert wird. */
  linkProps?: Omit<ComponentPropsWithoutRef<typeof Link>, "href" | "className" | "children">;
};

/**
 * Name/Avatar als Link zum Mitglieder-Portal — bei Geistern nur Text (nicht klickbar).
 */
export function MemberProfileAnchor({ userId, children, className, linkProps }: Props) {
  const href = memberProfileHref(userId);
  if (!href) {
    return <span className={className}>{children}</span>;
  }
  return (
    <Link href={href} className={cn(className)} {...linkProps}>
      {children}
    </Link>
  );
}
