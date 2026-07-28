import type { ReactNode } from "react";
import Link from "next/link";

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[color:var(--background)]">
      <header className="sticky top-0 z-20 border-b bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-12 max-w-6xl items-center justify-between gap-3 px-3 sm:h-14 sm:px-4">
          <Link href="/mitgliedschaft" className="flex min-w-0 items-center gap-2 sm:gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/fanclub-logo.png"
              alt=""
              width={36}
              height={36}
              className="h-8 w-8 shrink-0 rounded-lg object-cover shadow-sm sm:h-9 sm:w-9"
            />
            <span className="truncate text-sm font-semibold text-slate-900">
              Anni Perka Fanclub
            </span>
          </Link>
          <Link
            href="/login"
            className="shrink-0 text-sm font-medium text-fc-blue hover:underline"
          >
            Login
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-3 py-5 sm:px-4 sm:py-8">{children}</main>
    </div>
  );
}
