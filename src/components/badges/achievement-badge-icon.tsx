"use client";

import { useId } from "react";
import { Cake, Music, Shield, Shirt, Trophy, Users, Vote } from "lucide-react";
import { cn } from "@/lib/cn";
import type { AchievementTier } from "@/lib/badges/tiers";
import { tierVisual } from "@/lib/badges/tier-styles";

function BadgeGlyph({
  iconKey,
  className,
  color,
  size,
}: {
  iconKey: string;
  className?: string;
  color: string;
  size: number;
}) {
  const props = {
    className,
    strokeWidth: 2.2,
    color,
    width: size,
    height: size,
    "aria-hidden": true as const,
  };
  switch (iconKey) {
    case "music":
      return <Music {...props} />;
    case "vote":
      return <Vote {...props} />;
    case "cake":
      return <Cake {...props} />;
    case "shield":
      return <Shield {...props} />;
    case "shirt":
      return <Shirt {...props} />;
    case "users":
      return <Users {...props} />;
    default:
      return <Trophy {...props} />;
  }
}

/** Metallisches Abzeichen in Stufenfarbe (Konzertprofi u. a.). */
export function AchievementBadgeIcon({
  iconKey,
  tier,
  size = 52,
  className,
}: {
  slug?: string;
  iconKey: string;
  tier: AchievementTier;
  size?: number;
  className?: string;
}) {
  const uid = useId().replace(/:/g, "");
  const v = tierVisual(tier);
  const glyphSize = Math.round(size * 0.34);

  return (
    <div
      className={cn("relative shrink-0", className)}
      style={{ width: size, height: size }}
      title={`${tier} Abzeichen`}
    >
      <svg
        viewBox="0 0 80 88"
        width={size}
        height={size}
        className="drop-shadow-sm"
        aria-hidden
      >
        <defs>
          <linearGradient id={`${uid}-face`} x1="15%" y1="5%" x2="85%" y2="95%">
            <stop offset="0%" stopColor={v.fillFrom} />
            <stop offset="48%" stopColor={v.fillVia} />
            <stop offset="100%" stopColor={v.fillTo} />
          </linearGradient>
          <linearGradient id={`${uid}-ribbon`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={v.fillVia} />
            <stop offset="100%" stopColor={v.ribbon} />
          </linearGradient>
          <radialGradient id={`${uid}-shine`} cx="35%" cy="28%" r="45%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Band / Rosette */}
        <path
          d="M18 62 L12 78 L28 70 L40 82 L52 70 L68 78 L62 62 Z"
          fill={`url(#${uid}-ribbon)`}
          stroke={v.rim}
          strokeWidth="1.2"
          strokeLinejoin="round"
        />

        {/* Äußerer Rand */}
        <circle cx="40" cy="36" r="30" fill={v.rim} />
        <circle cx="40" cy="36" r="27" fill={`url(#${uid}-face)`} stroke={v.rim} strokeWidth="1.5" />

        {/* Glanz */}
        <circle cx="40" cy="36" r="27" fill={`url(#${uid}-shine)`} />

        {/* Innerer Ring */}
        <circle
          cx="40"
          cy="36"
          r="21"
          fill="none"
          stroke={v.rim}
          strokeWidth="1"
          opacity="0.35"
        />
        <circle
          cx="40"
          cy="36"
          r="17"
          fill="none"
          stroke="#ffffff"
          strokeWidth="0.8"
          opacity="0.25"
        />
      </svg>

      <div
        className="pointer-events-none absolute inset-0 flex items-center justify-center"
        style={{ paddingBottom: size * 0.14 }}
      >
        <BadgeGlyph
          iconKey={iconKey}
          color={v.icon}
          className="drop-shadow-sm"
          size={glyphSize}
        />
      </div>
    </div>
  );
}
