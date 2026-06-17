"use client";

import { useEffect, useMemo, useState } from "react";
import { ExternalLink, Radio, Timer } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { activeRadioCampaigns, type RadioVotingCampaign } from "@/lib/votings/radio-campaigns";
import { formatCountdownVerbose } from "@/lib/countdown/format-countdown";

function CampaignCard({ campaign }: { campaign: RadioVotingCampaign }) {
  const endsAt = useMemo(() => new Date(campaign.endsAt).getTime(), [campaign.endsAt]);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const secondsLeft = Math.max(0, Math.floor((endsAt - now) / 1000));
  const endLabel = new Date(campaign.endsAt).toLocaleString("de-DE", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <Card className="overflow-hidden">
      <CardHeader className="space-y-2 border-b border-fc-ice/80 bg-gradient-to-r from-fc-ice/40 via-white to-rose-50/30 pb-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-fc-navy text-white">
                <Radio className="h-4 w-4" aria-hidden />
              </span>
              <div className="min-w-0">
                <CardTitle className="text-base leading-snug">{campaign.station}</CardTitle>
                <p className="text-xs text-slate-500">{campaign.region}</p>
              </div>
            </div>
          </div>
          <Badge variant="brand">{campaign.chartName}</Badge>
        </div>
        <p className="text-sm font-medium text-fc-navy">{campaign.songTitle}</p>
      </CardHeader>
      <CardContent className="grid gap-3 pt-4">
        <p className="text-sm leading-relaxed text-slate-700">{campaign.instructions}</p>

        <div className="rounded-xl border border-amber-200/80 bg-amber-50/70 px-3 py-2.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-amber-900/80">
            <Timer className="h-3.5 w-3.5" aria-hidden />
            Voting endet in
          </div>
          <p className="mt-1 text-sm font-semibold text-amber-950">
            {formatCountdownVerbose(secondsLeft)}
          </p>
          <p className="mt-0.5 text-xs text-amber-900/70">bis {endLabel}</p>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            So machst du mit
          </p>
          <ol className="mt-2 list-decimal space-y-1.5 pl-4 text-sm text-slate-700">
            {campaign.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </div>

        <a
          href={campaign.votingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-fc-navy px-4 text-sm font-semibold text-white shadow-sm shadow-slate-900/10 transition hover:bg-fc-blue"
        >
          Jetzt für Anni abstimmen
          <ExternalLink className="h-4 w-4" aria-hidden />
        </a>
      </CardContent>
    </Card>
  );
}

export function RadioVotingBoard() {
  const campaigns = activeRadioCampaigns();

  if (!campaigns.length) {
    return (
      <div className="rounded-2xl border bg-slate-50 px-4 py-6 text-sm text-slate-700">
        Aktuell läuft kein Radio-Voting. Schau bald wieder vorbei — neue Hörer-Charts werden
        hier angekündigt.
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {campaigns.map((c) => (
        <CampaignCard key={c.id} campaign={c} />
      ))}
    </div>
  );
}
