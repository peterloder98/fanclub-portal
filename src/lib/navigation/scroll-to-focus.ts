function findScrollParent(el: HTMLElement): HTMLElement | null {
  let parent = el.parentElement;
  while (parent) {
    const { overflowY } = getComputedStyle(parent);
    if (
      (overflowY === "auto" || overflowY === "scroll") &&
      parent.scrollHeight > parent.clientHeight + 1
    ) {
      return parent;
    }
    parent = parent.parentElement;
  }
  return null;
}

function scrollElementIntoView(el: HTMLElement) {
  const scrollParent = findScrollParent(el);
  if (scrollParent) {
    const elRect = el.getBoundingClientRect();
    const parentRect = scrollParent.getBoundingClientRect();
    const offset =
      scrollParent.scrollTop +
      (elRect.top - parentRect.top) -
      parentRect.height / 2 +
      elRect.height / 2;
    scrollParent.scrollTo({ top: Math.max(0, offset), behavior: "smooth" });
    return;
  }
  el.scrollIntoView({ behavior: "smooth", block: "center" });
}

/** Scrollt zu einem Element und hebt es kurz hervor (Deep-Link aus Benachrichtigungen). */
export function scrollToFocusElement(
  elementId: string,
  options?: { delayMs?: number; highlightMs?: number; highlightClass?: string; maxAttempts?: number },
) {
  const delayMs = options?.delayMs ?? 250;
  const highlightMs = options?.highlightMs ?? 4500;
  const maxAttempts = options?.maxAttempts ?? 10;
  const highlightClass =
    options?.highlightClass ?? "ring-2 ring-fc-blue ring-offset-2 shadow-md";

  let cancelled = false;
  let attempt = 0;
  let retryTimer: number | undefined;

  const tryScroll = () => {
    if (cancelled) return;
    const el = document.getElementById(elementId);
    if (!el) {
      attempt += 1;
      if (attempt < maxAttempts) {
        retryTimer = window.setTimeout(tryScroll, 120);
      }
      return;
    }

    scrollElementIntoView(el);
    el.classList.add(...highlightClass.split(/\s+/).filter(Boolean));
    window.setTimeout(() => {
      el.classList.remove(...highlightClass.split(/\s+/).filter(Boolean));
    }, highlightMs);
  };

  const scrollTimer = window.setTimeout(tryScroll, delayMs);

  return () => {
    cancelled = true;
    window.clearTimeout(scrollTimer);
    if (retryTimer) window.clearTimeout(retryTimer);
  };
}
