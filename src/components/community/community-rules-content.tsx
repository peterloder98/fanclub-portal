import {
  COMMUNITY_RULES,
  COMMUNITY_RULES_INTRO,
  COMMUNITY_RULES_SUBTITLE,
  COMMUNITY_RULES_TITLE,
} from "@/lib/community/rules";

export function CommunityRulesContent({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? "space-y-4" : "space-y-5"}>
      <header className={compact ? "space-y-1" : "space-y-2"}>
        <p className="text-xs font-semibold uppercase tracking-wide text-fc-blue">
          {COMMUNITY_RULES_SUBTITLE}
        </p>
        <h2
          className={
            compact
              ? "text-lg font-semibold text-fc-navy"
              : "text-xl font-semibold tracking-tight text-fc-navy"
          }
        >
          {COMMUNITY_RULES_TITLE}
        </h2>
        <p className="text-sm leading-relaxed text-slate-600">{COMMUNITY_RULES_INTRO}</p>
      </header>

      <ol className="grid gap-3">
        {COMMUNITY_RULES.map((rule) => (
          <li
            key={rule.number}
            className="rounded-xl border border-slate-200/80 bg-white px-4 py-3 shadow-sm shadow-slate-900/5"
          >
            <p className="text-sm font-semibold text-fc-navy">
              <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-fc-ice text-xs font-bold text-fc-blue">
                {rule.number}
              </span>
              {rule.title}
            </p>
            <p className="mt-1.5 pl-8 text-sm leading-relaxed text-slate-600">{rule.body}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
