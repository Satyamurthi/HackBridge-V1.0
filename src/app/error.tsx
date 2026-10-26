"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { AlertCircle, RotateCcw, Home } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[HackBridge Unhandled Error]:", error);
  }, [error]);

  return (
    <div className="flex-1 flex items-center justify-center px-4 py-20 bg-[#030407]">
      <div className="w-full max-w-md bg-[#0B0E18] border border-white/[0.08] p-8 rounded-2xl text-center space-y-6">
        <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 mx-auto flex items-center justify-center font-mono font-bold text-sm">
          500
        </div>

        <div className="space-y-2">
          <div className="text-[11px] font-mono text-slate-500 uppercase tracking-wider">
            ERR_INTERNAL_TELEMETRY_FAILURE
          </div>
          <h1 className="font-display text-2xl font-bold text-white tracking-tight">
            Unexpected Protocol Anomaly
          </h1>
          <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
            An internal transaction or rendering error interrupted this session. The failure has been captured in local diagnostics.
          </p>
        </div>

        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={() => reset()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-black font-semibold text-xs hover:bg-slate-200 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Retry Transaction
          </button>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.05] border border-white/10 text-white font-semibold text-xs hover:bg-white/10 transition-colors"
          >
            <Home className="w-3.5 h-3.5" />
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}
