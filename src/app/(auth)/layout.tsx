import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-fc-ice via-[color:var(--background)] to-fc-mist">
      <div className="mx-auto flex min-h-screen w-full max-w-md items-center px-4 py-10">
        {children}
      </div>
    </div>
  );
}

