import { SupabaseCheckClient } from "./supabase-check-client";

export default function SupabaseCheckPage() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return (
      <div className="p-6 text-sm text-slate-700">
        Missing Supabase env. Set NEXT_PUBLIC_SUPABASE_URL and
        NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local (server check)
      </div>
    );
  }

  return <SupabaseCheckClient url={url} anonKey={anonKey} />;
}

