"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import {
  ArrowDown,
  CalendarDays,
  Car,
  Check,
  Gift,
  Heart,
  Mic2,
  Smartphone,
  Star,
} from "lucide-react";
import { MEMBERSHIP_FEE_EUR, MEMBERSHIP_FORM_ANCHOR_ID } from "@/lib/membership/constants";

type Benefit = {
  icon: ReactNode;
  title: string;
  description: string;
  tags?: string[];
};

const BENEFITS: Benefit[] = [
  {
    icon: <Mic2 className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden />,
    title: "Ganz nah an Anni",
    description: "Erhalte exklusive Grüße, News und Einblicke direkt von Anni.",
  },
  {
    icon: <Gift className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden />,
    title: "Gewinnspiele & Aktionen",
    description: "Regelmäßig tolle Gewinne wie Fanartikel oder Eintrittskarten.",
  },
  {
    icon: <Smartphone className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden />,
    title: "Moderne Fanclub-App",
    description:
      "Eine Community, die es so vermutlich kein zweiter Fanclub in Deutschland bietet.",
    tags: [
      "Chat",
      "Umfragen",
      "Reiseplanung",
      "Eventinfos",
      "Gewinnspiele",
      "Anni-Stars",
    ],
  },
  {
    icon: <Car className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden />,
    title: "Gemeinsam zu Konzerten",
    description: "Plane Fahrgemeinschaften und finde andere Fans aus deiner Region.",
  },
  {
    icon: <CalendarDays className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden />,
    title: "Fantreffen & Events",
    description: "Gemeinsame Erlebnisse stehen im Mittelpunkt.",
  },
  {
    icon: <Star className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden />,
    title: "Anni-Stars",
    description:
      "Sammle Anni-Stars, erreiche neue Fan-Level und sichere dir Chancen auf exklusive Jahresverlosungen.",
  },
];

/** Farbige Hover-Akzente für Feature-Badges (Landing + Antrag). */
const FEATURE_BADGE_HOVER = [
  "hover:border-sky-400 hover:bg-sky-100 hover:text-sky-950",
  "hover:border-violet-400 hover:bg-violet-100 hover:text-violet-950",
  "hover:border-emerald-400 hover:bg-emerald-100 hover:text-emerald-950",
  "hover:border-amber-400 hover:bg-amber-100 hover:text-amber-950",
  "hover:border-rose-400 hover:bg-rose-100 hover:text-rose-950",
  "hover:border-orange-400 hover:bg-orange-100 hover:text-orange-950",
  "hover:border-cyan-400 hover:bg-cyan-100 hover:text-cyan-950",
  "hover:border-fuchsia-400 hover:bg-fuchsia-100 hover:text-fuchsia-950",
] as const;

const STEPS = [
  "Formular ausfüllen",
  "Digital unterschreiben",
  "Antrag absenden",
  "Mitgliedsbeitrag bezahlen",
  "Willkommen im Fanclub",
];

function scrollToForm() {
  document.getElementById(MEMBERSHIP_FORM_ANCHOR_ID)?.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
}

export function MembershipLanding({ memberCountLabel }: { memberCountLabel: string }) {
  return (
    <div className="grid gap-10 pb-2 sm:gap-14 lg:gap-16">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl border border-fc-sky/25 bg-gradient-to-br from-fc-ice via-white to-white shadow-sm sm:rounded-3xl">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-16 hidden h-64 w-64 rounded-full bg-fc-sky/15 blur-3xl sm:block"
        />
        <div className="grid items-center gap-5 p-4 sm:gap-8 sm:p-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-10 lg:p-10">
          <div className="order-1 flex flex-col gap-4 sm:gap-5 lg:order-2">
            <div className="flex items-center gap-2.5 sm:gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/fanclub-logo.png"
                alt=""
                width={48}
                height={48}
                className="h-11 w-11 shrink-0 rounded-xl object-cover shadow-md shadow-fc-navy/15 ring-2 ring-white sm:h-14 sm:w-14 sm:rounded-2xl"
              />
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-fc-blue sm:text-xs">
                  Offizieller Fanclub
                </p>
                <p className="truncate text-base font-bold text-fc-navy sm:text-lg">Anni Perka</p>
              </div>
            </div>

            <div>
              <h1 className="text-[1.35rem] font-bold leading-snug tracking-tight text-fc-navy sm:text-3xl lg:text-[2rem] lg:leading-tight">
                <span className="mr-1" aria-hidden>
                  ❤️
                </span>
                Werde Teil des offiziellen Anni Perka Fanclubs!
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-slate-600 sm:mt-3 sm:text-lg">
                Gemeinsam Musik erleben. Freundschaften schließen. Exklusive Vorteile genießen.
              </p>
              <p className="mt-3 rounded-xl border border-fc-sky/20 bg-white/80 px-3.5 py-2.5 text-[13px] leading-relaxed text-slate-700 shadow-sm sm:mt-4 sm:rounded-2xl sm:px-4 sm:py-3 sm:text-sm">
                Der offizielle Anni Perka Fanclub ist mehr als nur eine Fangemeinschaft — er
                verbindet Menschen, die Annis Musik lieben, gemeinsam Konzerte erleben und Teil
                einer herzlichen Community sein möchten.
              </p>
            </div>

            <ul className="grid gap-2 sm:gap-2.5">
              {[
                "Offizieller Fanclub von Anni Perka",
                `${memberCountLabel} aktive Mitglieder aus ganz Deutschland`,
                `Nur ${MEMBERSHIP_FEE_EUR} € Jahresbeitrag`,
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-[13px] text-slate-700 sm:text-sm">
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-700">
                    <Check className="h-3 w-3" strokeWidth={3} aria-hidden />
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <button
              type="button"
              onClick={scrollToForm}
              className="inline-flex h-12 w-full touch-manipulation items-center justify-center gap-2 rounded-2xl bg-fc-navy px-6 text-sm font-semibold text-white shadow-md shadow-fc-navy/20 transition active:scale-[0.98] hover:bg-fc-blue sm:w-auto sm:min-w-[15rem]"
            >
              Jetzt Mitglied werden
              <ArrowDown className="h-4 w-4" aria-hidden />
            </button>
          </div>

          <div className="relative order-2 lg:order-1">
            <div className="relative aspect-[16/10] overflow-hidden rounded-xl shadow-lg shadow-fc-navy/10 ring-1 ring-black/5 sm:aspect-[4/3] sm:rounded-2xl">
              <Image
                src="/images/membership-hero.png"
                alt="Anni Perka mit Fans des offiziellen Fanclubs"
                fill
                priority
                className="object-cover object-[center_30%]"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-fc-navy/75 via-fc-navy/25 to-transparent px-3 pb-3 pt-12 sm:px-4 sm:pb-4 sm:pt-16">
                <p className="text-xs font-medium text-white/95 sm:text-sm">
                  Gemeinsam Musik erleben — herzlich, offiziell, nah an Anni.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="mx-auto max-w-2xl px-1 text-center">
          <h2 className="text-xl font-bold text-fc-navy sm:text-3xl">
            Warum solltest du dabei sein?
          </h2>
          <p className="mt-1.5 text-sm text-slate-600 sm:mt-2 sm:text-base">
            Keine zig Versprechen — dafür 6 große Vorteile!
          </p>
        </div>
        <div className="mt-5 grid grid-cols-1 gap-3 sm:mt-8 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
          {BENEFITS.map((benefit) => (
            <article
              key={benefit.title}
              className="group flex h-full flex-col rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm transition hover:border-fc-sky/40 hover:shadow-md sm:p-5"
            >
              <span className="mb-3 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-fc-navy to-fc-blue text-white shadow-sm transition-transform group-hover:scale-105 sm:mb-4 sm:h-12 sm:w-12 sm:rounded-2xl">
                {benefit.icon}
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="text-[15px] font-semibold text-fc-navy sm:text-base">
                  {benefit.title}
                </h3>
                <p className="mt-1 text-[13px] leading-relaxed text-slate-600 sm:mt-1.5 sm:text-sm">
                  {benefit.description}
                </p>
                {benefit.tags ? (
                  <div className="mt-2.5 flex flex-wrap gap-1.5 sm:mt-3">
                    {benefit.tags.map((tag, i) => (
                      <span
                        key={tag}
                        className={`rounded-full border border-transparent bg-fc-ice px-2 py-0.5 text-[11px] font-medium text-fc-navy transition sm:px-2.5 sm:text-xs ${FEATURE_BADGE_HOVER[i % FEATURE_BADGE_HOVER.length]}`}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200/80 bg-gradient-to-b from-slate-50 to-white p-4 sm:rounded-3xl sm:p-8">
        <h2 className="text-center text-xl font-bold text-fc-navy sm:text-2xl">
          So einfach funktioniert&apos;s
        </h2>

        <ol className="mt-5 space-y-0 sm:hidden">
          {STEPS.map((step, i) => (
            <li key={step} className="relative flex gap-3 pb-5 last:pb-0">
              {i < STEPS.length - 1 ? (
                <span
                  aria-hidden
                  className="absolute bottom-0 left-[1.15rem] top-10 w-0.5 bg-gradient-to-b from-fc-sky to-fc-blue/30"
                />
              ) : null}
              <span className="relative z-10 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-fc-navy text-sm font-bold text-white shadow-md">
                {i + 1}
              </span>
              <div className="flex min-w-0 flex-1 items-center gap-2 pt-1.5">
                <p className="text-sm font-medium leading-snug text-slate-800">{step}</p>
                {i === STEPS.length - 1 ? (
                  <Heart className="h-4 w-4 shrink-0 text-rose-500" aria-hidden />
                ) : null}
              </div>
            </li>
          ))}
        </ol>

        <ol className="mt-8 hidden gap-3 sm:grid sm:grid-cols-5">
          {STEPS.map((step, i) => (
            <li key={step} className="relative flex flex-col items-center text-center">
              {i < STEPS.length - 1 ? (
                <span
                  aria-hidden
                  className="absolute left-[calc(50%+1.25rem)] top-5 h-0.5 w-[calc(100%-2.5rem)] bg-gradient-to-r from-fc-sky to-fc-blue/40"
                />
              ) : null}
              <span className="relative z-10 grid h-10 w-10 place-items-center rounded-full bg-fc-navy text-sm font-bold text-white shadow-md">
                {i + 1}
              </span>
              <p className="mt-3 text-sm font-medium leading-snug text-slate-800">{step}</p>
              {i === STEPS.length - 1 ? (
                <Heart className="mt-1 h-4 w-4 text-rose-500" aria-hidden />
              ) : null}
            </li>
          ))}
        </ol>
      </section>

      <section id={MEMBERSHIP_FORM_ANCHOR_ID} className="scroll-mt-4 sm:scroll-mt-6">
        <div className="rounded-2xl border-2 border-fc-navy/15 bg-gradient-to-br from-fc-navy to-fc-blue p-5 text-white shadow-lg sm:rounded-3xl sm:p-8">
          <h2 className="text-lg font-bold sm:text-2xl">Jetzt Mitglied werden</h2>
          <p className="mt-1.5 max-w-2xl text-sm text-white/90 sm:mt-2 sm:text-base">
            Fülle das Formular aus — digital, unkompliziert und in wenigen Minuten erledigt.
          </p>
        </div>
      </section>
    </div>
  );
}

export { FEATURE_BADGE_HOVER };
