import { MapPin, Sparkles } from "lucide-react";
import { HoverEnlargeAvatar } from "@/components/ui/hover-enlarge-avatar";
import type { RecentMemberWelcome } from "@/lib/members/recent-members";
import { memberPortalPath } from "@/lib/members/intro-questions";

export function NewMembersWelcome({ members }: { members: RecentMemberWelcome[] }) {
  if (!members.length) return null;

  return (
    <section className="rounded-2xl border border-fc-ice bg-white p-4 shadow-sm sm:p-5">
      <div className="fc-accent-bar mb-2 w-16" />
      <div className="flex items-start gap-2.5">
        <div className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-fc-ice text-fc-navy">
          <Sparkles className="h-4 w-4" aria-hidden />
        </div>
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-fc-navy">Herzlich willkommen</h2>
          <p className="mt-0.5 text-sm text-[color:var(--muted)]">
            Wir begrüßen unsere neuesten Mitglieder im Fanclub.
          </p>
        </div>
      </div>

      <ul className="mt-4 grid gap-2 sm:grid-cols-3">
        {members.map((m) => (
          <li
            key={m.userId}
            className="rounded-xl border border-fc-navy/10 bg-fc-ice/40 px-3 py-2.5"
          >
            <HoverEnlargeAvatar
              name={m.name}
              avatarUrl={m.avatarUrl}
              size="sm"
              className="w-full gap-3"
              href={m.hasRegistered ? memberPortalPath(m.userId) : null}
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-fc-navy">{m.name}</p>
                {m.origin ? (
                  <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-slate-600">
                    <MapPin className="h-3 w-3 shrink-0 text-fc-blue" aria-hidden />
                    <span className="truncate">{m.origin}</span>
                  </p>
                ) : (
                  <p className="mt-0.5 text-xs text-slate-400">Ort noch offen</p>
                )}
                {m.hasRegistered ? (
                  <p className="mt-1 text-[11px] font-medium text-fc-blue">Zum Profil →</p>
                ) : (
                  <p className="mt-1 text-[11px] text-slate-400">Noch nicht in der App</p>
                )}
              </div>
            </HoverEnlargeAvatar>
          </li>
        ))}
      </ul>
    </section>
  );
}
