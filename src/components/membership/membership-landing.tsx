"use client";

import Image from "next/image";
import {
  ArrowDown,
  CalendarDays,
  Car,
  Check,
  Gift,
  Heart,
  MessageCircle,
  Mic2,
  Smartphone,
  Star,
} from "lucide-react";
import { MEMBERSHIP_FEE_EUR, MEMBERSHIP_FORM_ANCHOR_ID } from "@/lib/membership/constants";

import type { ReactNode } from "react";

type Benefit = {
  icon: ReactNode;
  title: string;
  description: string;
  tags?: string[];
  wide?: boolean;
};

const BENEFITS: Benefit[] = [
  {
    icon: <Mic2 className="h-6 w-6" aria-hidden />,
    title: "Ganz nah an Anni",
    description:
      "Erhalte exklusive Grüße, News und Einblicke direkt von Anni.",
  },
  {
    icon: <Gift className="h-6 w-6" aria-hidden />,
    title: "Gewinnspiele & exklusive Aktionen",
    description:
      "Regelmäßig tolle Gewinne wie Fanartikel oder Eintrittskarten.",
  },
  {
    icon: <Smartphone className="h-6 w-6" aria-hidden />,
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
      "Fanshop",
    ],
    wide: true,
  },
  {
    icon: <Car className="h-6 w-6" aria-hidden />,
    title: "Gemeinsam zu Konzerten",
    description:
      "Plane Fahrgemeinschaften und finde andere Fans aus deiner Region.",
  },
  {
    icon: <CalendarDays className="h-6 w-6" aria-hidden />,
    title: "Fantreffen & Veranstaltungen",
    description: "Gemeinsame Erlebnisse stehen im Mittelpunkt.",
  },
  {
    icon: <Star className="h-6 w-6" aria-hidden />,
    title: "Anni-Stars",
    description:
      "Sammle Anni-Stars, erreiche neue Fan-Level und sichere dir Chancen auf exklusive Jahresverlosungen.",
  },
];

const STEPS = [
  "Formular ausfüllen",
  "Digital unterschreiben",
  "Antrag absenden",
  "Mitgliedsbeitrag bezahlen",
  "Willkommen im Fanclub",
];

const TESTIMONIALS = [
  {
    quote:
      "Durch den Fanclub habe ich viele tolle Menschen kennengelernt und wir fahren inzwischen gemeinsam zu den Konzerten.",
    name: "Sabine",
    initial: "S",
  },
  {
    quote:
      "Die App ist richtig klasse. Alles an einem Ort und super einfach.",
    name: "Michael",
    initial: "M",
  },
  {
    quote: "Man merkt, wie viel Herzblut in diesem Fanclub steckt.",
    name: "Heike",
    initial: "H",
  },
];

function scrollToForm() {
  document.getElementById(MEMBERSHIP_FORM_ANCHOR_ID)?.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
}

export function MembershipLanding({ memberCountLabel }: { memberCountLabel: string }) {
  return (
    <div className="grid gap-16 pb-4 lg:gap-20">
      <section className="relative overflow-hidden rounded-3xl border border-fc-sky/25 bg-gradient-to-br from-fc-ice via-white to-white shadow-sm">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-fc-sky/15 blur-3xl"
        />
        <div className="grid items-center gap-8 p-5 sm:p-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-10 lg:p-10">
          <div className="relative order-2 lg:order-1">
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl shadow-lg shadow-fc-navy/10 ring-1 ring-black/5">
              <Image
                src="/images/membership-hero.png"
                alt="Anni Perka mit Fans des offiziellen Fanclubs"
                fill
                priority
                className="object-cover object-[center_35%]"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-fc-navy/70 via-fc-navy/20 to-transparent px-4 pb-4 pt-16">
                <p className="text-sm font-medium text-white/95">
                  Gemeinsam Musik erleben — herzlich, offiziell, nah an Anni.
                </p>
              </div>
            </div>
          </div>

          <div className="order-1 flex flex-col gap-5 lg:order-2">
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/fanclub-logo.png"
                alt=""
                width={56}
                height={56}
                className="h-14 w-14 shrink-0 rounded-2xl object-cover shadow-md shadow-fc-navy/15 ring-2 ring-white"
              />
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-fc-blue">
                  Offizieller Fanclub
                </p>
                <p className="truncate text-lg font-bold text-fc-navy">Anni Perka</p>
              </div>
            </div>

            <div>
              <h1 className="text-2xl font-bold tracking-tight text-fc-navy sm:text-3xl lg:text-[2rem] lg:leading-tight">
                <span className="mr-1.5" aria-hidden>
                  ❤️
                </span>
                Werde Teil des offiziellen Anni Perka Fanclubs!
              </h1>
              <p className="mt-3 text-base leading-relaxed text-slate-600 sm:text-lg">
                Gemeinsam Musik erleben. Freundschaften schließen. Exklusive Vorteile genießen.
              </p>
              <p className="mt-4 rounded-2xl border border-fc-sky/20 bg-white/80 px-4 py-3 text-sm leading-relaxed text-slate-700 shadow-sm">
                Der offizielle Anni Perka Fanclub ist mehr als nur eine Fangemeinschaft — er
                verbindet Menschen, die Annis Musik lieben, gemeinsam Konzerte erleben und Teil
                einer herzlichen Community sein möchten.
              </p>
            </div>

            <ul className="grid gap-2.5">
              {[
                "Offizieller Fanclub von Anni Perka",
                `${memberCountLabel} aktive Mitglieder aus ganz Deutschland`,
                `Nur ${MEMBERSHIP_FEE_EUR} € Jahresbeitrag`,
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-slate-700">
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
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-fc-navy px-6 text-sm font-semibold text-white shadow-md shadow-fc-navy/20 transition hover:bg-fc-blue sm:w-auto sm:min-w-[15rem]"
            >
              Jetzt Mitglied werden
              <ArrowDown className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </div>
      </section>

      <section>
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-bold text-fc-navy sm:text-3xl">Warum solltest du dabei sein?</h2>
          <p className="mt-2 text-slate-600">Nicht 15 Vorteile — nur 6 starke.</p>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {BENEFITS.map((benefit) => (
            <article
              key={benefit.title}
              className={`group flex flex-col rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:border-fc-sky/40 hover:shadow-md ${
                benefit.wide ? "sm:col-span-2 lg:col-span-3 lg:flex-row lg:items-start lg:gap-6" : ""
              }`}
            >
              <span className="mb-4 inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-fc-navy to-fc-blue text-white shadow-sm transition-transform group-hover:scale-105 lg:mb-0">
                {benefit.icon}
              </span>
              <div className="min-w-0">
                <h3 className="font-semibold text-fc-navy">{benefit.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{benefit.description}</p>
                {benefit.tags ? (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {benefit.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-fc-ice px-2.5 py-0.5 text-xs font-medium text-fc-navy"
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

      <section className="rounded-3xl border border-slate-200/80 bg-gradient-to-b from-slate-50 to-white p-6 sm:p-8">
        <h2 className="text-center text-2xl font-bold text-fc-navy">So einfach funktioniert&apos;s</h2>
        <ol className="mt-8 grid gap-6 sm:grid-cols-5 sm:gap-3">
          {STEPS.map((step, i) => (
            <li key={step} className="relative flex flex-col items-center text-center">
              {i < STEPS.length - 1 ? (
                <span
                  aria-hidden
                  className="absolute left-[calc(50%+1.25rem)] top-5 hidden h-0.5 w-[calc(100%-2.5rem)] bg-gradient-to-r from-fc-sky to-fc-blue/40 sm:block"
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

      <section>
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-fc-navy sm:text-3xl">Was unsere Mitglieder sagen</h2>
            <p className="mt-1 text-slate-600">Echte Stimmen aus der Community.</p>
          </div>
          <MessageCircle className="hidden h-8 w-8 shrink-0 text-fc-sky/60 sm:block" aria-hidden />
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {TESTIMONIALS.map((t) => (
            <blockquote
              key={t.name}
              className="flex h-full flex-col rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm"
            >
              <div className="flex gap-0.5 text-amber-400" aria-label="5 von 5 Sternen">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-current" aria-hidden />
                ))}
              </div>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-slate-700">&ldquo;{t.quote}&rdquo;</p>
              <footer className="mt-4 flex items-center gap-3 border-t border-slate-100 pt-4">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-fc-ice to-fc-sky/30 text-sm font-bold text-fc-navy">
                  {t.initial}
                </span>
                <cite className="not-italic font-semibold text-fc-navy">{t.name}</cite>
              </footer>
            </blockquote>
          ))}
        </div>
      </section>

      <section id={MEMBERSHIP_FORM_ANCHOR_ID} className="scroll-mt-6">
        <div className="rounded-3xl border-2 border-fc-navy/15 bg-gradient-to-br from-fc-navy to-fc-blue p-6 text-white shadow-lg sm:p-8">
          <h2 className="text-xl font-bold sm:text-2xl">Jetzt Mitglied werden</h2>
          <p className="mt-2 max-w-2xl text-sm text-white/90 sm:text-base">
            Fülle das Formular aus — digital, unkompliziert und in wenigen Minuten erledigt.
          </p>
        </div>
      </section>
    </div>
  );
}
