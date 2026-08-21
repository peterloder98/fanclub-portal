"use client";

import { useTransition } from "react";
import { Check, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  approvePostAction,
  rejectPostAction,
} from "@/app/(app)/admin/posts/actions";
import { HoverEnlargeAvatar } from "@/components/ui/hover-enlarge-avatar";
import { PostMediaGallery } from "@/components/feed/post-media-gallery";
import { formatBerlinDateTimeShort } from "@/lib/datetime/berlin";

export type PendingPostRow = {
  id: string;
  body: string;
  created_at: string;
  authorName: string;
  authorAvatarUrl: string | null;
  mediaUrls: string[];
};

export function PendingPostsQueue({ posts }: { posts: PendingPostRow[] }) {
  const [pending, startTransition] = useTransition();

  if (!posts.length) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-slate-600">
          Keine Posts in der Warteschlange.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-3">
      {posts.map((p) => (
        <Card key={p.id} className="overflow-hidden">
          <CardContent className="space-y-3 p-4">
            <div className="flex items-start justify-between gap-3">
              <HoverEnlargeAvatar
                name={p.authorName}
                avatarUrl={p.authorAvatarUrl}
                size="sm"
                className="min-w-0"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-slate-900">
                    {p.authorName}
                  </div>
                  <div className="text-xs text-slate-500">
                    {formatBerlinDateTimeShort(p.created_at)}
                  </div>
                </div>
              </HoverEnlargeAvatar>
              <Badge variant="warning">Wartend</Badge>
            </div>

            <p className="whitespace-pre-wrap text-sm leading-snug text-slate-800">
              {p.body}
            </p>

            {p.mediaUrls.length ? (
              <PostMediaGallery
                size="md"
                media={p.mediaUrls.map((url, i) => ({
                  id: `${p.id}-media-${i}`,
                  url,
                }))}
              />
            ) : null}

            <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3">
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    await approvePostAction(p.id);
                  })
                }
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                <Check className="h-3.5 w-3.5" />
                Freigeben
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  if (!window.confirm("Post wirklich ablehnen?")) return;
                  startTransition(async () => {
                    await rejectPostAction(p.id);
                  });
                }}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60"
              >
                <X className="h-3.5 w-3.5" />
                Ablehnen
              </button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
