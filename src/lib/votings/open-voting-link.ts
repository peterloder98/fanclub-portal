function isMobileDevice() {
  if (typeof window === "undefined") return false;
  if (window.matchMedia("(max-width: 768px)").matches) return true;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

function halfScreenPopupRect() {
  const width = Math.max(420, Math.round(window.screen.availWidth / 2));
  const height = Math.max(480, Math.round(window.screen.availHeight / 2));
  const left = Math.max(0, window.screen.availWidth - width - 12);
  const top = Math.max(0, Math.round((window.screen.availHeight - height) / 2));
  return { width, height, left, top };
}

function popupFeatures({ width, height, left, top }: ReturnType<typeof halfScreenPopupRect>) {
  return [
    "popup=yes",
    `width=${width}`,
    `height=${height}`,
    `left=${left}`,
    `top=${top}`,
    "scrollbars=yes",
    "resizable=yes",
    "menubar=no",
    "toolbar=no",
    "location=yes",
    "status=no",
  ].join(",");
}

function applyPopupGeometry(popup: Window) {
  const rect = halfScreenPopupRect();
  try {
    popup.resizeTo(rect.width, rect.height);
    popup.moveTo(rect.left, rect.top);
    popup.opener = null;
  } catch {
    /* Einige Browser blockieren nach Navigation — Features-String reicht dann */
  }
}

export type OpenVotingResult = "popup" | "tab";

/**
 * Desktop: halber Bildschirm rechts — Fanclub bleibt links sichtbar.
 * Mobil: neuer Tab.
 */
export function openRadioVotingLink(url: string, campaignId: string): OpenVotingResult {
  if (isMobileDevice()) {
    window.open(url, "_blank", "noopener,noreferrer");
    return "tab";
  }

  const rect = halfScreenPopupRect();
  const windowName = `fanclub-radio-voting-${campaignId}`;
  const popup = window.open(url, windowName, popupFeatures(rect));

  if (!popup) {
    window.open(url, "_blank", "noopener,noreferrer");
    return "tab";
  }

  applyPopupGeometry(popup);
  window.setTimeout(() => applyPopupGeometry(popup), 0);
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
