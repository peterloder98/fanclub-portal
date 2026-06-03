import type { SpotifyPlayerState } from "@/components/app-shell/spotify-web-player-types";

export type SpotifyPlayerInstance = {
  connect: () => Promise<boolean>;
  addListener: (event: string, cb: (state: SpotifyPlayerState) => void) => void;
  disconnect: () => void;
};

declare global {
  interface Window {
    Spotify?: {
      Player: new (opts: {
        name: string;
        getOAuthToken: (cb: (token: string) => void) => void;
        volume?: number;
      }) => SpotifyPlayerInstance;
    };
    onSpotifyWebPlaybackSDKReady?: () => void;
    __fanclubSpotifyPlayer?: SpotifyPlayerInstance;
    __fanclubSpotifyDeviceId?: string | null;
    __fanclubSpotifyPlayerReady?: Promise<string | null>;
  }
}

export function resetSpotifyWebPlaybackPlayer() {
  window.__fanclubSpotifyPlayer?.disconnect();
  window.__fanclubSpotifyPlayer = undefined;
  window.__fanclubSpotifyDeviceId = undefined;
  window.__fanclubSpotifyPlayerReady = undefined;
}

function loadSpotifySdk() {
  return new Promise<void>((resolve, reject) => {
    if (window.Spotify) {
      resolve();
      return;
    }
    const existing = document.querySelector('script[data-spotify-sdk="true"]');
    if (existing) {
      const done = () => resolve();
      window.onSpotifyWebPlaybackSDKReady = done;
      const poll = window.setInterval(() => {
        if (window.Spotify) {
          window.clearInterval(poll);
          done();
        }
      }, 150);
      window.setTimeout(() => window.clearInterval(poll), 12_000);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://sdk.scdn.co/spotify-player.js";
    script.async = true;
    script.dataset.spotifySdk = "true";
    window.onSpotifyWebPlaybackSDKReady = () => resolve();
    script.onerror = () => reject(new Error("Spotify SDK konnte nicht geladen werden."));
    document.body.appendChild(script);
  });
}

export function connectSpotifyWebPlaybackPlayer(getToken: () => Promise<string>) {
  if (window.__fanclubSpotifyPlayerReady) {
    return window.__fanclubSpotifyPlayerReady;
  }

  window.__fanclubSpotifyPlayerReady = (async () => {
    await loadSpotifySdk();
    if (!window.Spotify) throw new Error("Spotify SDK nicht verfügbar.");

    if (window.__fanclubSpotifyDeviceId && window.__fanclubSpotifyPlayer) {
      return window.__fanclubSpotifyDeviceId;
    }

    const player = new window.Spotify.Player({
      name: "Anni Perka Fanclub Portal",
      getOAuthToken: (cb) => {
        void getToken()
          .then(cb)
          .catch(() => cb(""));
      },
      volume: 0.8,
    });

    const deviceId = await new Promise<string | null>((resolve, reject) => {
      const timeout = window.setTimeout(() => {
        reject(
          new Error(
            "Spotify-Player antwortet nicht. E-Mail im Developer-Dashboard unter User Management eintragen — oder Extended Quota für alle Mitglieder (Admin). Spotify-App kurz öffnen hilft oft.",
          ),
        );
      }, 20_000);

      player.addListener("ready", ({ device_id }) => {
        window.clearTimeout(timeout);
        resolve(device_id ?? null);
      });
      player.addListener("initialization_error", ({ message }) => {
        window.clearTimeout(timeout);
        reject(new Error(message || "Player-Initialisierung fehlgeschlagen."));
      });
      player.addListener("authentication_error", ({ message }) => {
        window.clearTimeout(timeout);
        reject(new Error(message || "Spotify-Anmeldung fehlgeschlagen."));
      });
      player.addListener("account_error", () => {
        window.clearTimeout(timeout);
        reject(
          new Error(
            "Spotify meldet kein Premium für dieses Konto. Familien-Profil mit Premium-Slot nutzen oder anderes Konto.",
          ),
        );
      });

      void player.connect().then((ok) => {
        if (!ok) {
          window.clearTimeout(timeout);
          reject(new Error("Spotify connect() fehlgeschlagen."));
        }
      });
    });

    window.__fanclubSpotifyPlayer = player;
    window.__fanclubSpotifyDeviceId = deviceId;
    return deviceId;
  })();

  return window.__fanclubSpotifyPlayerReady;
}
