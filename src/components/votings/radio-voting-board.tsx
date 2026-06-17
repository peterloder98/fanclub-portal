"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Check, Copy, ExternalLink, Radio, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RunningCountdownBadge } from "@/components/ui/running-countdown-badge";
import type { RadioVotingCampaignView } from "@/lib/votings/radio-campaign-types";
import { copyVotingLink, openRadioVotingLink } from "@/lib/votings/open-voting-link";
import { scrollToFocusElement } from "@/lib/navigation/scroll-to-focus";
import { flyPointsFromElement } from "@/lib/points/fly";
import { cn } from "@/lib/cn";

const countdownClass = "!px-2 !py-1 !text-[11px]";

function CampaignCard({
  campaign,
  onParticipated,
}: {
  campaign: RadioVotingCampaignView;
  onParticipated: (id: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const [openedHint, setOpenedHint] = useState<string | null>(null);
  const [participated, setParticipated] = useState(campaign.participated ?? false);
  const [recording, setRecording] = useState(false);
  const voteBtnRef = useRef<HTMLButtonElement>(null);

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
        starsAwarded?: number;
      };
      if (data.ok) {
        setParticipated(true);
        onParticipated(campaign.id);
        if (data.starsAwarded && data.starsAwarded > 0) {
          flyPointsFromElement({ fromEl: voteBtnRef.current, delta: data.starsAwarded });
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
        ? "Voting-Fenster geöffnet — Fanclub bleibt hier offen."
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
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 flex-1 gap-2">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-fc-navy text-white">
              <Radio className="h-4 w-4" aria-hidden />
            </span>
            <div className="min-w-0">
              <CardTitle className="text-base leading-snug">{campaign.station}</CardTitle>
              {participated ? (
                <Badge variant="success" className="mt-1">
                  <Check className="mr-1 h-3 w-3" aria-hidden />
                  Mitgemacht
                </Badge>
              ) : null}
            </div>
          </div>
          <RunningCountdownBadge
            endsAt={campaign.endsAt}
            endedLabel="Beendet"
            runningPrefix="Endet in"
            inline
            className={cn(countdownClass, "shrink-0")}
          />
        </div>
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

        {openedHint ? (
          <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs leading-relaxed text-emerald-900">
            {openedHint}
          </p>
        ) : null}

        <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
          <button
            ref={voteBtnRef}
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
            title="Link kopieren"
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
