"use client";

import { useEffect } from "react";
import { useTopbarMeta } from "@/components/app-shell/topbar-context";

/** Setzt Seitentitel in der persistenten Topbar — rendert nichts Sichtbares. */
export function Topbar({
  title,
  subtitle,
  className,
}: {
  title: string;
  subtitle?: string;
  className?: string;
}) {
  const { setMeta } = useTopbarMeta();

  useEffect(() => {
    setMeta({ title, subtitle, className });
  }, [title, subtitle, className, setMeta]);

  return null;
}
