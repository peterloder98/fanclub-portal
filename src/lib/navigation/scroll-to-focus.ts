/** Scrollt zu einem Element und hebt es kurz hervor (Deep-Link aus Benachrichtigungen). */
export function scrollToFocusElement(
  elementId: string,
  options?: { delayMs?: number; highlightMs?: number; highlightClass?: string },
) {
  const delayMs = options?.delayMs ?? 350;
  const highlightMs = options?.highlightMs ?? 4500;
  const highlightClass =
    options?.highlightClass ?? "ring-2 ring-fc-blue ring-offset-2 shadow-md";

  const scrollTimer = window.setTimeout(() => {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add(...highlightClass.split(/\s+/).filter(Boolean));
    window.setTimeout(() => {
      el.classList.remove(...highlightClass.split(/\s+/).filter(Boolean));
    }, highlightMs);
  }, delayMs);

  return () => window.clearTimeout(scrollTimer);
}
