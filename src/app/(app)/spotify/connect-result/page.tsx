import { SpotifyConnectResultClient } from "./spotify-connect-result.client";

export default async function SpotifyConnectResultPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const raw = sp.status;
  const status = (typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : "") === "connected"
    ? "connected"
    : "error";
  const reasonRaw = sp.reason;
  const reason =
    typeof reasonRaw === "string"
      ? reasonRaw
      : Array.isArray(reasonRaw)
        ? reasonRaw[0] ?? null
        : null;

  return <SpotifyConnectResultClient status={status} reason={reason} />;
}
