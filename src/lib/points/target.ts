/** Live reference to the topbar points counter (set by Topbar on mount). */
let pointsTargetEl: HTMLElement | null = null;

export const POINTS_TARGET_ID = "fc-points-target";

export function setPointsTargetElement(el: HTMLElement | null) {
  pointsTargetEl = el;
}

export function getPointsTargetElement(): HTMLElement | null {
  if (pointsTargetEl?.isConnected) return pointsTargetEl;
  return document.getElementById(POINTS_TARGET_ID);
}
