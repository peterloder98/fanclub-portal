"use client";

import { X } from "lucide-react";
import type { ReactNode } from "react";

export function EmailDialogShell({
  title,
  description,
  onClose,
  children,
  footer,
}: {
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 p-4"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border bg-white shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="email-dialog-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50"
          aria-label="Schließen"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="border-b border-slate-100 bg-gradient-to-r from-sky-50/80 via-white to-rose-50/50 px-5 pb-4 pt-5 pr-14">
          <h3 id="email-dialog-title" className="text-base font-semibold text-slate-900">
            {title}
          </h3>
          {description ? <p className="mt-1 text-sm text-slate-600">{description}</p> : null}
        </div>

        <div className="px-5 py-4">{children}</div>

        {footer ? (
          <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4">{footer}</div>
        ) : null}
      </div>
    </div>
  );
}
