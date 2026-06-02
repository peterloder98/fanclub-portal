export const POINTS_GAIN_EVENT = "fc-points-gain";

export type PointsGainDetail = { delta: number };

export function emitPointsGain(delta: number) {
  if (typeof window === "undefined" || delta === 0) return;
  window.dispatchEvent(
    new CustomEvent<PointsGainDetail>(POINTS_GAIN_EVENT, { detail: { delta } }),
  );
}

// Alias for clarity in newer callers
export const emitPointsDelta = emitPointsGain;
