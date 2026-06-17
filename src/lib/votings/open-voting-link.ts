const POPUP_WIDTH = 240;
const POPUP_HEIGHT = 410;

function isMobileDevice() {
  if (typeof window === "undefined") return false;
  if (window.matchMedia("(max-width: 768px)").matches) return true;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

/** Rechts am Bildschirm — halbe Größe, Fanclub bleibt links sichtbar. */
function desktopPopupFeatures(width: number, height: number) {
  const left = Math.max(0, window.screen.availWidth - width - 16);
  const top = Math.max(0, Math.round((window.screen.availHeight - height) / 2));
  return [
    `width=${width}`,
    `height=${height}`,
    `left=${left}`,
    `top=${top}`,
    "scrollbars=yes",
    "resizable=yes",
    "noopener",
    "noreferrer",
  ].join(",");
}

export type OpenVotingResult = "popup" | "tab";

/**
 * Desktop: kleines Popup rechts — Fanclub bleibt sichtbar.
 * Mobil: neuer Tab (Popups funktionieren dort kaum zuverlässig).
 */
export function openRadioVotingLink(url: string, campaignId: string): OpenVotingResult {
  if (isMobileDevice()) {
    window.open(url, "_blank", "noopener,noreferrer");
    return "tab";
  }

  const windowName = `fanclub-radio-voting-${campaignId}`;
  const popup = window.open(url, windowName, desktopPopupFeatures(POPUP_WIDTH, POPUP_HEIGHT));
  if (!popup) {
    window.open(url, "_blank", "noopener,noreferrer");
    return "tab";
  }

  popup.focus();
  return "popup";
}

export async function copyVotingLink(url: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(url);
    return true;
  } catch {
    return false;
  }
}
