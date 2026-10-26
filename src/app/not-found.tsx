import React from "react";
import Link from "next/link";
import { Terminal, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex-1 flex items-center justify-center px-4 py-20 bg-[#030407]">
      <div className="w-full max-w-md bg-[#0B0E18] border border-white/[0.08] p-8 rounded-2xl text-center space-y-6">
        <div className="w-12 h-12 rounded-xl bg-white/[0.04] border border-white/10 text-slate-300 mx-auto flex items-center justify-center font-mono font-bold text-sm">
          404
        </div>

        <div className="space-y-2">
          <div className="text-[11px] font-mono text-slate-500 uppercase tracking-wider">
            ERR_TRACK_NOT_FOUND
          </div>
          <h1 className="font-display text-2xl font-bold text-white tracking-tight">
            Signal Lost in the Arena Void
          </h1>
          <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
            The hackathon track, team submission, or protocol page you are querying does not exist or has been archived.
          </p>
        </div>

        <div className="pt-2">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-black font-semibold text-xs hover:bg-slate-200 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Return to HackBridge Home
          </Link>
        </div>
      </div>
    </div>
  );
}
