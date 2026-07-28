import Link from "next/link";
import { BookOpen, ExternalLink } from "lucide-react";
import { AdminBackLink } from "@/components/admin/admin-back-link";
import {
  ADMIN_HANDBOOK_CHAPTERS,
  ADMIN_HANDBOOK_INTRO,
  ADMIN_HANDBOOK_UPDATED,
  type AdminHandbookBlock,
} from "@/lib/admin/admin-handbook";

function HandbookBlock({ block }: { block: AdminHandbookBlock }) {
  if (block.type === "p") {
    return <p className="text-sm leading-relaxed text-slate-700">{block.text}</p>;
  }
  if (block.type === "note") {
    return (
      <p className="rounded-xl border border-amber-200/80 bg-amber-50/90 px-3 py-2.5 text-sm leading-relaxed text-amber-950">
        {block.text}
      </p>
    );
  }
  if (block.type === "ul") {
    return (
      <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-slate-700">
        {block.items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    );
  }
  if (block.type === "ol") {
    return (
      <ol className="list-decimal space-y-1.5 pl-5 text-sm leading-relaxed text-slate-700">
        {block.items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ol>
    );
  }
  return (
    <Link
      href={block.href}
      className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-fc-navy/10 bg-fc-ice/50 px-3 py-2 text-sm font-semibold text-fc-navy transition hover:border-fc-blue/40 hover:bg-fc-ice"
    >
      <span className="min-w-0 truncate">{block.label}</span>
      <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-60" aria-hidden />
      {block.hint ? (
        <span className="hidden font-normal text-slate-500 sm:inline">· {block.hint}</span>
      ) : null}
    </Link>
  );
}

export function AdminHandbookPanel() {
  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <AdminBackLink />

      <header className="overflow-hidden rounded-2xl border border-fc-navy/10 bg-gradient-to-br from-fc-ice/80 via-white to-rose-50/50 p-5 shadow-sm sm:p-6">
        <div className="flex gap-4">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-fc-navy text-white shadow-sm">
            <BookOpen className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight text-fc-navy">Admin-Handbuch</h1>
            <p className="mt-1 text-sm leading-relaxed text-slate-600">{ADMIN_HANDBOOK_INTRO}</p>
            <p className="mt-2 text-xs text-slate-500">
              Stand:{" "}
              {new Date(`${ADMIN_HANDBOOK_UPDATED}T12:00:00`).toLocaleDateString("de-DE", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
        </div>
      </header>

      <nav
        className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm sm:p-5"
        aria-label="Inhaltsverzeichnis"
      >
        <h2 className="text-sm font-semibold uppercase tracking-wide text-fc-navy/70">
          Inhaltsverzeichnis
        </h2>
        <ol className="mt-4 space-y-5">
          {ADMIN_HANDBOOK_CHAPTERS.map((chapter) => (
            <li key={chapter.id}>
              <p className="text-sm font-semibold text-fc-navy">
                <span className="tabular-nums text-fc-blue">{chapter.number}.</span> {chapter.title}
              </p>
              <ol className="mt-2 space-y-1 border-l-2 border-fc-sky/30 pl-3 sm:pl-4">
                {chapter.sections.map((section) => (
                  <li key={section.id}>
                    <a
                      href={`#hilfe-${section.id}`}
                      className="flex gap-2 rounded-lg px-2 py-1.5 text-sm text-slate-700 transition hover:bg-fc-ice hover:text-fc-navy"
                    >
                      <span className="shrink-0 tabular-nums font-semibold text-fc-blue/80">
                        {section.number}
                      </span>
                      <span className="min-w-0 leading-snug">{section.title}</span>
                    </a>
                  </li>
                ))}
              </ol>
            </li>
          ))}
        </ol>
      </nav>

      <div className="space-y-8">
        {ADMIN_HANDBOOK_CHAPTERS.map((chapter) => (
          <div key={chapter.id} className="space-y-4">
            <div className="px-0.5">
              <h2 className="text-lg font-semibold tracking-tight text-fc-navy">
                <span className="tabular-nums text-fc-blue">{chapter.number}.</span> {chapter.title}
              </h2>
            </div>
            {chapter.sections.map((section) => (
              <section
                key={section.id}
                id={`hilfe-${section.id}`}
                className="scroll-mt-24 overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm shadow-slate-900/5"
              >
                <div className="border-b border-slate-100 bg-slate-50/80 px-5 py-4">
                  <h3 className="text-base font-semibold text-fc-navy">
                    <span className="tabular-nums text-fc-blue">{section.number}</span>{" "}
                    {section.title}
                  </h3>
                  <p className="mt-0.5 text-sm text-slate-500">{section.summary}</p>
                </div>
                <div className="space-y-3 px-5 py-4">
                  {section.blocks.map((block, index) => (
                    <HandbookBlock key={`${section.id}-${index}`} block={block} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
