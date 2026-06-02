import { Suspense } from "react";
import { LoginClient } from "./login-client";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="w-full text-sm text-slate-600">Lade…</div>}>
      <LoginClient />
    </Suspense>
  );
}

