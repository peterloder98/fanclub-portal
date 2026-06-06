type Rect = { left: number; top: number; right: number; bottom: number };

export type HoverPlacementSide = "top" | "bottom" | "left" | "right";

export type HoverPlacement = {
  left: number;
  top: number;
  side: HoverPlacementSide;
};

function rectFromLT(left: number, top: number, w: number, h: number): Rect {
  return { left, top, right: left + w, bottom: top + h };
}

function intersects(a: Rect, b: Rect): boolean {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

function overlapArea(a: Rect, b: Rect): number {
  if (!intersects(a, b)) return 0;
  const w = Math.min(a.right, b.right) - Math.max(a.left, b.left);
  const h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
  return Math.max(0, w) * Math.max(0, h);
}

function clampRect(
  rect: Rect,
  margin: number,
  mapW: number,
  mapH: number,
  cardW: number,
  cardH: number,
): Rect {
  const left = Math.max(margin, Math.min(rect.left, mapW - margin - cardW));
  const top = Math.max(margin, Math.min(rect.top, mapH - margin - cardH));
  return rectFromLT(left, top, cardW, cardH);
}

function rankSides(
  pt: { x: number; y: number },
  mapW: number,
  mapH: number,
  space: Record<HoverPlacementSide, number>,
): HoverPlacementSide[] {
  const sides: HoverPlacementSide[] = ["top", "bottom", "left", "right"];

  const score = (side: HoverPlacementSide) => {
    let s = space[side];
    if (side === "bottom" && pt.y < mapH * 0.38) s += mapH * 0.55;
    if (side === "top" && pt.y > mapH * 0.62) s += mapH * 0.55;
    if (side === "right" && pt.x < mapW * 0.3) s += mapW * 0.45;
    if (side === "left" && pt.x > mapW * 0.7) s += mapW * 0.45;
    if (side === "top" || side === "bottom") s += 8;
    return s;
  };

  return [...sides].sort((a, b) => score(b) - score(a));
}

/**
 * Positioniert die Hover-Karte so, dass der Pin sichtbar bleibt.
 */
export function computeMapHoverPlacement(input: {
  pt: { x: number; y: number };
  cardW: number;
  cardH: number;
  mapW: number;
  mapH: number;
  pinHalfW?: number;
  pinHeight?: number;
  gap?: number;
  margin?: number;
}): HoverPlacement {
  const {
    pt,
    cardW,
    cardH,
    mapW,
    mapH,
    pinHalfW = 20,
    pinHeight = 48,
    gap = 12,
    margin = 10,
  } = input;

  const pin = rectFromLT(pt.x - pinHalfW, pt.y - pinHeight, pinHalfW * 2, pinHeight + 6);

  const raw: Record<HoverPlacementSide, { left: number; top: number }> = {
    top: { left: pt.x - cardW / 2, top: pin.top - gap - cardH },
    bottom: { left: pt.x - cardW / 2, top: pin.bottom + gap },
    left: { left: pin.left - gap - cardW, top: pt.y - cardH / 2 },
    right: { left: pin.right + gap, top: pt.y - cardH / 2 },
  };

  const space: Record<HoverPlacementSide, number> = {
    top: pin.top - margin,
    bottom: mapH - margin - pin.bottom,
    left: pin.left - margin,
    right: mapW - margin - pin.right,
  };

  const preference = rankSides(pt, mapW, mapH, space);

  for (const side of preference) {
    const candidate = clampRect(
      rectFromLT(raw[side].left, raw[side].top, cardW, cardH),
      margin,
      mapW,
      mapH,
      cardW,
      cardH,
    );
    if (!intersects(candidate, pin)) {
      return { left: candidate.left, top: candidate.top, side };
    }
  }

  let best: HoverPlacement = { left: margin, top: margin, side: preference[0] };
  let bestOverlap = Number.POSITIVE_INFINITY;

  for (const side of preference) {
    const candidate = clampRect(
      rectFromLT(raw[side].left, raw[side].top, cardW, cardH),
      margin,
      mapW,
      mapH,
      cardW,
      cardH,
    );
    const overlap = overlapArea(candidate, pin);
    if (overlap < bestOverlap) {
      bestOverlap = overlap;
      best = { left: candidate.left, top: candidate.top, side };
    }
  }

  return best;
}
