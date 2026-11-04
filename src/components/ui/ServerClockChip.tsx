"use client";

import React, { useState, useEffect } from "react";
import { Clock } from "lucide-react";

interface ServerClockChipProps {
  serverTimeOffset?: number; // ms offset: serverNow - clientNow
  className?: string;
}

export default function ServerClockChip({
  serverTimeOffset = 0,
  className = "",
}: ServerClockChipProps) {
  const [currentTimeStr, setCurrentTimeStr] = useState<string>("");

  useEffect(() => {
    const update = () => {
      const serverNow = new Date(Date.now() + serverTimeOffset);
      setCurrentTimeStr(
        serverNow.toLocaleString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
          timeZoneName: "short",
        })
      );
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [serverTimeOffset]);

  if (!currentTimeStr) return null;

  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#111524]/80 border border-white/[0.08] text-xs font-mono text-[#94A3B8] shadow-sm backdrop-blur-md ${className}`}
      title="Master Server Clock synchronizing problem unlocks and registration gates"
    >
      <span className="w-2 h-2 rounded-full bg-[#6366F1] animate-pulse" />
      <span className="text-[10px] text-[#64748B] uppercase font-bold tracking-wider">
        SERVER CLOCK:
      </span>
      <span className="text-white font-semibold text-[11px]">{currentTimeStr}</span>
    </div>
  );
}
