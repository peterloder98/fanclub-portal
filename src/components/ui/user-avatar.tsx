"use client";

import { useEffect, useState } from "react";
import { initialsFromName } from "@/lib/user/initials";
import { cn } from "@/lib/cn";

export function UserAvatar({
  name,
  avatarUrl,
  size = "sm",
  className,
}: {
  name: string;
  avatarUrl?: string | null;
  size?: "xs" | "sm";
  className?: string;
}) {
  const [imgFailed, setImgFailed] = useState(false);
  useEffect(() => {
    setImgFailed(false);
  }, [avatarUrl]);
  const dim = size === "xs" ? "h-6 w-6 text-[10px]" : "h-7 w-7 text-xs";
  const showImage = Boolean(avatarUrl) && !imgFailed;

  return (
    <div
      className={cn(
        "shrink-0 overflow-hidden rounded-full border bg-slate-50",
        dim,
        className,
      )}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatarUrl!}
          alt=""
          className="h-full w-full object-cover"
          onError={() => setImgFailed(true)}
        />
      ) : (
        <div className="grid h-full w-full place-items-center bg-gradient-to-br from-blue-600 to-rose-500 font-bold text-white">
          {initialsFromName(name)}
        </div>
      )}
    </div>
  );
}
