const POPUP_WIDTH = 480;
const POPUP_HEIGHT = 820;

function isMobileDevice() {
  if (typeof window === "undefined") return false;
  if (window.matchMedia("(max-width: 768px)").matches) return true;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

function centeredPopupFeatures(width: number, height: number) {
  const left = Math.max(0, Math.round((window.screen.availWidth - width) / 2));
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
 * Desktop: schmales Popup — Fanclub bleibt sichtbar dahinter.
 * Mobil: neuer Tab (Popups funktionieren dort kaum zuverlässig).
 */
export function openRadioVotingLink(url: string, campaignId: string): OpenVotingResult {
  if (isMobileDevice()) {
    window.open(url, "_blank", "noopener,noreferrer");
    return "tab";
  }

  const windowName = `fanclub-radio-voting-${campaignId}`;
  const popup = window.open(url, windowName, centeredPopupFeatures(POPUP_WIDTH, POPUP_HEIGHT));
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
