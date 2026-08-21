import { AccessToken, RoomServiceClient } from "livekit-server-sdk";

export function getLiveKitConfig(): {
  url: string;
  apiKey: string;
  apiSecret: string;
} | null {
  const url = (process.env.LIVEKIT_URL ?? process.env.NEXT_PUBLIC_LIVEKIT_URL ?? "").trim();
  const apiKey = (process.env.LIVEKIT_API_KEY ?? "").trim();
  const apiSecret = (process.env.LIVEKIT_API_SECRET ?? "").trim();
  if (!url || !apiKey || !apiSecret) return null;
  return { url, apiKey, apiSecret };
}

/** Hard cleanup / Host-Ende: Raum schließen → alle Teilnehmer disconnecten. */
export async function deleteLiveKitRoom(roomName: string): Promise<void> {
  const name = roomName.trim();
  if (!name) return;
  const cfg = getLiveKitConfig();
  if (!cfg) return;
  try {
    const client = new RoomServiceClient(cfg.url, cfg.apiKey, cfg.apiSecret);
    await client.deleteRoom(name);
  } catch (e) {
    // Raum existiert ggf. nicht mehr — kein harter Fehler
    console.warn("[livekit] deleteRoom failed", name, e);
  }
}

export async function mintLiveKitToken(input: {
  roomName: string;
  identity: string;
  name: string;
  canPublish: boolean;
}): Promise<{ token: string; url: string }> {
  const cfg = getLiveKitConfig();
  if (!cfg) {
    throw new Error(
      "LiveKit ist nicht konfiguriert (LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET).",
    );
  }

  const at = new AccessToken(cfg.apiKey, cfg.apiSecret, {
    identity: input.identity,
    name: input.name,
    ttl: "4h",
  });
  at.addGrant({
    roomJoin: true,
    room: input.roomName,
    canPublish: input.canPublish,
    canSubscribe: true,
    canPublishData: false,
  });

  return { token: await at.toJwt(), url: cfg.url };
}
