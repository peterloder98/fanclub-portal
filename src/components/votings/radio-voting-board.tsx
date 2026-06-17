"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Check, Copy, ExternalLink, Radio, RotateCcw, Sparkles, Timer } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { RadioVotingCampaignView } from "@/lib/votings/radio-campaign-types";
import { formatCountdownVerbose } from "@/lib/countdown/format-countdown";
import { copyVotingLink, openRadioVotingLink } from "@/lib/votings/open-voting-link";
import { scrollToFocusElement } from "@/lib/navigation/scroll-to-focus";

function CampaignCard({
  campaign,
  onParticipated,
}: {
  campaign: RadioVotingCampaignView;
  onParticipated: (id: string) => void;
}) {
  const endsAt = useMemo(() => new Date(campaign.endsAt).getTime(), [campaign.endsAt]);
  const [now, setNow] = useState(() => Date.now());
  const [copied, setCopied] = useState(false);
  const [openedHint, setOpenedHint] = useState<string | null>(null);
  const [participated, setParticipated] = useState(campaign.participated ?? false);
  const [starHint, setStarHint] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!copied) return;
    const id = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(id);
  }, [copied]);

  useEffect(() => {
    if (!openedHint) return;
    const id = window.setTimeout(() => setOpenedHint(null), 5000);
    return () => window.clearTimeout(id);
  }, [openedHint]);

  useEffect(() => {
    if (!starHint) return;
    const id = window.setTimeout(() => setStarHint(null), 6000);
    return () => window.clearTimeout(id);
  }, [starHint]);

  const secondsLeft = Math.max(0, Math.floor((endsAt - now) / 1000));
  const endLabel = new Date(campaign.endsAt).toLocaleString("de-DE", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  async function recordParticipation() {
    if (recording || participated) return;
    setRecording(true);
    try {
      const res = await fetch("/api/radio-voting/participate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId: campaign.id }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        alreadyParticipated?: boolean;
        starsAwarded?: number;
        error?: string;
      };
      if (data.ok) {
        setParticipated(true);
        onParticipated(campaign.id);
        if (data.starsAwarded && data.starsAwarded > 0) {
          setStarHint(`+${data.starsAwarded} Anni-Star für deine Teilnahme — danke!`);
        } else if (data.alreadyParticipated) {
          setStarHint("Du hast in dieser Runde schon mitgemacht — danke!");
        }
      }
    } catch {
      /* Link öffnen trotzdem möglich */
    } finally {
      setRecording(false);
    }
  }

  async function handleOpen() {
    void recordParticipation();
    const mode = openRadioVotingLink(campaign.votingUrl, campaign.id);
    setOpenedHint(
      mode === "popup"
        ? "Voting-Fenster geöffnet — Fanclub bleibt hier offen. Nach dem Abstimmen einfach das kleine Fenster schließen."
        : "Voting im neuen Tab geöffnet — danach hierher zurückwechseln.",
    );
  }

  async function handleCopy() {
    const ok = await copyVotingLink(campaign.votingUrl);
    setCopied(ok);
  }

  return (
    <Card id={`voting-${campaign.id}`} className="overflow-hidden scroll-mt-24">
      <CardHeader className="space-y-2 border-b border-fc-ice/80 bg-gradient-to-r from-fc-ice/40 via-white to-rose-50/30 pb-3">
        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
          <div className="flex min-w-0 flex-1 items-start gap-2">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-fc-navy text-white">
              <Radio className="h-4 w-4" aria-hidden />
            </span>
            <div className="min-w-0">
              <CardTitle className="text-base leading-snug">{campaign.station}</CardTitle>
            </div>
          </div>
          <div className="shrink-0 text-right">
            <div className="flex items-center justify-end gap-1 text-xs font-semibold uppercase tracking-wide text-amber-900/80">
              <Timer className="h-3.5 w-3.5" aria-hidden />
              Voting endet in
            </div>
            <p className="mt-0.5 text-sm font-semibold text-amber-950">
              {formatCountdownVerbose(secondsLeft)}
            </p>
            <p className="text-[11px] text-amber-900/70">bis {endLabel}</p>
          </div>
        </div>
        {participated ? (
          <Badge variant="success" className="w-fit">
            <Check className="mr-1 h-3 w-3" aria-hidden />
            Mitgemacht
          </Badge>
        ) : null}
        <p className="text-sm font-medium text-fc-navy">{campaign.songTitle}</p>
      </CardHeader>
      <CardContent className="grid gap-3 pt-4">
        <p className="text-sm leading-relaxed text-slate-700">{campaign.instructions}</p>

        <p className="text-xs text-slate-500">
          <Sparkles className="mr-1 inline h-3 w-3 text-amber-500" aria-hidden />
          +1 Anni-Star pro Runde beim Abstimmen · zählt für Votingheld
        </p>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            So machst du mit
          </p>
          <ol className="mt-2 list-decimal space-y-1.5 pl-4 text-sm text-slate-700">
            {campaign.steps.map((step, i) => (
              <li key={`${campaign.id}-step-${i}`}>{step}</li>
            ))}
          </ol>
        </div>

        {starHint ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-950">
            {starHint}
          </p>
        ) : null}

        {openedHint ? (
          <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs leading-relaxed text-emerald-900">
            {openedHint}
          </p>
        ) : null}

        <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
          <button
            type="button"
            onClick={() => void handleOpen()}
            disabled={recording}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-fc-navy px-4 text-sm font-semibold text-white shadow-sm shadow-slate-900/10 transition hover:bg-fc-blue disabled:opacity-70"
          >
            Jetzt für Anni abstimmen
            <ExternalLink className="h-4 w-4" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => void handleCopy()}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border bg-white px-4 text-sm font-medium text-slate-700 shadow-sm shadow-slate-900/5 transition hover:bg-slate-50"
            title="Link kopieren — z. B. für tägliches Voting"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 text-emerald-600" aria-hidden />
                Kopiert
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" aria-hidden />
                Link kopieren
              </>
            )}
          </button>
        </div>

        <button
          type="button"
          onClick={() => void handleOpen()}
          className="inline-flex h-9 items-center justify-center gap-1.5 text-xs font-medium text-fc-blue hover:underline"
        >
          <RotateCcw className="h-3.5 w-3.5" aria-hidden />
          Erneut abstimmen (z. B. morgen wieder)
        </button>
      </CardContent>
    </Card>
  );
}

export function RadioVotingBoard({ campaigns }: { campaigns: RadioVotingCampaignView[] }) {
  const searchParams = useSearchParams();
  const focusId = searchParams.get("focus");
  const [localParticipated, setLocalParticipated] = useState<Record<string, boolean>>({});

  const merged = campaigns.map((c) => ({
    ...c,
    participated: localParticipated[c.id] ?? c.participated,
  }));

  useEffect(() => {
    if (!focusId || !campaigns.some((c) => c.id === focusId)) return;
    return scrollToFocusElement(`voting-${focusId}`);
  }, [focusId, campaigns]);

  if (!merged.length) {
    return (
      <div className="rounded-2xl border bg-slate-50 px-4 py-6 text-sm text-slate-700">
        Aktuell läuft kein Radio-Voting. Schau bald wieder vorbei — neue Hörer-Charts werden
        hier angekündigt.
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {merged.map((c) => (
        <CampaignCard
          key={c.id}
          campaign={c}
          onParticipated={(id) => setLocalParticipated((prev) => ({ ...prev, [id]: true }))}
        />
      ))}
    </div>
  );
}
