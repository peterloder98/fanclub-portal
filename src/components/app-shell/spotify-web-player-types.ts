export type SpotifyPlayerState = { device_id?: string; message?: string };

export type SpotifyDiagnostics = {
  tokenOk: boolean;
  tokenError: string | null;
  scopeOk: boolean;
  scopes?: string;
  premium: boolean | null;
  product: string | null;
};
