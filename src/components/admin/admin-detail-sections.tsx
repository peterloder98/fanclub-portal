import type { ReactNode } from "react";

/** Einheitliches Admin-Detail-Layout: Aktionen oben, Inhalt, optional Historie unten. */
export function AdminDetailSections({
  actions,
  children,
  footer,
}: {
  actions?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="grid gap-4">
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      <div className="grid gap-4">{children}</div>
      {footer ? <div className="mt-2 border-t pt-4">{footer}</div> : null}
    </div>
  );
}
