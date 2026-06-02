import type { ReactNode } from "react";
import Link from "next/link";

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[color:var(--background)]">
      <header className="border-b bg-white/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
          <Link href="/" className="text-sm font-semibold text-slate-900">
            Anni Perka Fanclub
          </Link>
          <Link href="/login" className="text-sm font-medium text-blue-600 hover:underline">
            Login
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8">{children}</main>
    </div>
  );
}
