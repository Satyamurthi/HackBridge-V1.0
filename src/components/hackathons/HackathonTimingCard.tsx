"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Users,
  Trophy,
  ArrowRight,
  Clock,
  Calendar,
  Lock,
  CheckCircle2,
  AlertTriangle,
  Radio,
} from "lucide-react";
import { isV5Enabled } from "@/lib/version-gate";

export interface HackathonCardData {
  id: string;
  title: string;
  slug: string;
  description: string;
  prizePool?: string | null;
  teamMin: number;
  teamMax: number;
  fee: number;
  paymentMode: string;
  registrationDeadline?: string | null;
  startAt: string;
  endAt: string;
  host?: { orgName: string; type: string };
  domains?: Array<{ id: string; name: string; problemStatements?: Array<{ id: string; title: string }> }>;
  _count?: { teams: number };
  maxSquads?: number;
  hasWinners?: boolean;
  isWinner?: boolean;
}

interface HackathonTimingCardProps {
  hackathon: HackathonCardData;
  serverTimeOffset?: number; // ms offset: serverNow - clientNow
}

function formatDateWithTz(dateStr: string): string {
  if (!dateStr) return "N/A";
  try {
    const d = new Date(dateStr);
    return d.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      timeZoneName: "short",
    });
  } catch {
    return dateStr;
  }
}

export default function HackathonTimingCard({
  hackathon,
  serverTimeOffset = 0,
}: HackathonTimingCardProps) {
  const [currentServerTime, setCurrentServerTime] = useState<number>(() => Date.now() + serverTimeOffset);
  const [v5Active, setV5Active] = useState(false);

  useEffect(() => {
    setV5Active(isV5Enabled());
  }, []);

  // Tick every second synchronized to server offset
  useEffect(() => {
    const update = () => setCurrentServerTime(Date.now() + serverTimeOffset);
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [serverTimeOffset]);

  const startMs = new Date(hackathon.startAt).getTime();
  const endMs = new Date(hackathon.endAt).getTime();
  const regDeadlineMs = hackathon.registrationDeadline
    ? new Date(hackathon.registrationDeadline).getTime()
    : startMs;

  const registeredSquads = hackathon._count?.teams ?? 0;
  const isSquadsFull = Boolean(hackathon.maxSquads && registeredSquads >= hackathon.maxSquads);

  // Compute status state
  let statusBadge: {
    label: "Registration Open" | "Closing Soon" | "Registration Closed" | "Live" | "Ended";
    cls: string;
  };
  let countdownTargetMs: number;
  let countdownLabel: string;
  let isRegistrationClosed = false;
  let isEventEnded = false;
  let isEventLive = false;

  if (currentServerTime >= endMs) {
    statusBadge = {
      label: "Ended",
      cls: "bg-white/[0.04] text-[#64748B] border-white/[0.08]",
    };
    countdownTargetMs = endMs;
    countdownLabel = "Concluded";
    isEventEnded = true;
    isRegistrationClosed = true;
  } else if (currentServerTime >= startMs) {
    statusBadge = {
      label: "Live",
      cls: "bg-[#6366F1]/20 text-[#818CF8] border-[#6366F1]/40 font-bold",
    };
    countdownTargetMs = endMs;
    countdownLabel = "Event concludes in:";
    isEventLive = true;
    isRegistrationClosed = true;
  } else {
    // Before event start
    countdownTargetMs = startMs;
    countdownLabel = "Event starts in:";

    if (currentServerTime >= regDeadlineMs) {
      statusBadge = {
        label: "Registration Closed",
        cls: "bg-rose-500/10 text-rose-300 border-rose-500/30 font-bold",
      };
      isRegistrationClosed = true;
    } else {
      const msUntilRegClose = regDeadlineMs - currentServerTime;
      const hoursUntilClose = msUntilRegClose / (1000 * 60 * 60);

      if (hoursUntilClose < 24) {
        statusBadge = {
          label: "Closing Soon",
          cls: "bg-amber-500/10 text-amber-300 border-amber-500/30 font-bold animate-pulse",
        };
      } else {
        statusBadge = {
          label: "Registration Open",
          cls: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30 font-bold",
        };
      }
    }
  }

  // Calculate Days, Hours, Minutes, Seconds for target countdown
  const diff = Math.max(0, countdownTargetMs - currentServerTime);
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  // Calculate registration deadline countdown if open
  const regDiff = Math.max(0, regDeadlineMs - currentServerTime);
  const regDays = Math.floor(regDiff / (1000 * 60 * 60 * 24));
  const regHours = Math.floor((regDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const regMinutes = Math.floor((regDiff % (1000 * 60 * 60)) / (1000 * 60));
  const regSeconds = Math.floor((regDiff % (1000 * 60)) / 1000);

  const feeLabel =
    hackathon.paymentMode === "FREE" || hackathon.fee === 0
      ? "FREE"
      : `₹${hackathon.fee} · ${hackathon.paymentMode === "QR" ? "UPI QR" : "Razorpay"}`;

  return (
    <div className="bg-[#0B0E18]/75 backdrop-blur-md border border-white/[0.08] hover:border-[#6366F1]/50 rounded-2xl p-6 flex flex-col justify-between space-y-5 transition-all duration-200 shadow-xl group">
      <div className="space-y-4">
        {/* Header Badges */}
        <div className="flex items-start justify-between gap-3">
          <span className="text-[11px] font-mono px-2.5 py-1 rounded bg-white/[0.04] border border-white/[0.08] text-[#F8FAFC] font-medium">
            {hackathon.host?.orgName || "Collegiate Host"}
          </span>
          <div className="flex items-center gap-2">
            {v5Active && (hackathon.hasWinners || hackathon.isWinner) && (
              <Link
                href={`/hackathons/${hackathon.slug || hackathon.id}#leaderboard`}
                className="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 hover:bg-emerald-500/25 transition-all shadow-sm shadow-emerald-500/10"
              >
                <span>Winners →</span>
              </Link>
            )}
            <span className={`text-[10px] font-mono px-2.5 py-0.5 rounded border ${statusBadge.cls}`}>
              {statusBadge.label}
            </span>
          </div>
        </div>

        {/* Title & Description */}
        <div>
          <Link href={`/hackathons/${hackathon.slug || hackathon.id}`}>
            <h3 className="font-display text-xl font-bold text-[#F8FAFC] tracking-tight leading-snug group-hover:text-[#818CF8] transition-colors">
              {hackathon.title}
            </h3>
          </Link>
          <p className="text-xs text-[#94A3B8] mt-2 line-clamp-2 leading-relaxed">
            {hackathon.description}
          </p>
        </div>

        {/* Domains */}
        {hackathon.domains && hackathon.domains.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {hackathon.domains.slice(0, 3).map((d) => (
              <span
                key={d.id}
                className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/[0.03] border border-white/[0.06] text-[#94A3B8]"
              >
                {d.name}
              </span>
            ))}
            {hackathon.domains.length > 3 && (
              <span className="text-[10px] font-mono text-[#64748B]">
                +{hackathon.domains.length - 3} more
              </span>
            )}
          </div>
        )}

        {/* Live Countdown Block (Prompt 8.1 & 8.3) */}
        <div className="p-4 rounded-xl bg-[#111524]/80 border border-white/[0.06] space-y-2">
          <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-[#94A3B8]">
            <span className="flex items-center gap-1.5 font-bold">
              <Clock className="w-3.5 h-3.5 text-[#818CF8]" />
              {countdownLabel}
            </span>
            <span className="text-[#64748B] text-[9px]">Server Synchronized</span>
          </div>

          {isEventEnded ? (
            <div className="py-2 text-center text-xs font-mono text-[#64748B]">
              This hackathon ended on {formatDateWithTz(hackathon.endAt)}
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-2 text-center font-mono pt-1">
              <div className="p-2 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                <div className="text-lg font-black text-white">{String(days).padStart(2, "0")}</div>
                <div className="text-[9px] text-[#94A3B8] uppercase">Days</div>
              </div>
              <div className="p-2 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                <div className="text-lg font-black text-white">{String(hours).padStart(2, "0")}</div>
                <div className="text-[9px] text-[#94A3B8] uppercase">Hours</div>
              </div>
              <div className="p-2 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                <div className="text-lg font-black text-white">{String(minutes).padStart(2, "0")}</div>
                <div className="text-[9px] text-[#94A3B8] uppercase">Mins</div>
              </div>
              <div className="p-2 rounded-lg bg-[#6366F1]/10 border border-[#6366F1]/30">
                <div className="text-lg font-black text-[#818CF8]">{String(seconds).padStart(2, "0")}</div>
                <div className="text-[9px] text-[#818CF8] uppercase">Secs</div>
              </div>
            </div>
          )}

          {/* Show secondary 'Registration closes in' if before event start and registration is open */}
          {!isRegistrationClosed && !isEventEnded && (
            <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-[10px] font-mono text-[#94A3B8]">
              <span className="text-amber-300/90 font-medium">Registration closes in:</span>
              <span className="font-bold text-white">
                {regDays > 0 ? `${regDays}d ` : ""}
                {String(regHours).padStart(2, "0")}h {String(regMinutes).padStart(2, "0")}m {String(regSeconds).padStart(2, "0")}s
              </span>
            </div>
          )}
        </div>

        {/* Clear Dates per Hackathon with Timezone (Prompt 8.2) */}
        <div className="space-y-1.5 text-[10px] font-mono text-[#94A3B8] bg-white/[0.01] p-3 rounded-xl border border-white/[0.04]">
          <div className="flex items-center justify-between">
            <span className="text-[#64748B]">Registration Deadline:</span>
            <span className="text-white font-medium">
              {formatDateWithTz(hackathon.registrationDeadline || hackathon.startAt)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#64748B]">Event Starts:</span>
            <span className="text-white font-medium">{formatDateWithTz(hackathon.startAt)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#64748B]">Event Ends:</span>
            <span className="text-white font-medium">{formatDateWithTz(hackathon.endAt)}</span>
          </div>
        </div>
      </div>

      {/* Footer Stats & Action Buttons (Prompt 8.4) */}
      <div className="pt-4 border-t border-white/[0.08] space-y-3">
        <div className="flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-3 text-[#94A3B8]">
            <span className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-[#818CF8]" />
              {hackathon.teamMin}–{hackathon.teamMax} builders
            </span>
            {hackathon.prizePool && (
              <span className="flex items-center gap-1 font-semibold text-[#F8FAFC]">
                <Trophy className="w-3.5 h-3.5 text-[#818CF8]" />
                {hackathon.prizePool}
              </span>
            )}
          </div>
          <span
            className={`text-[10px] font-bold ${
              hackathon.fee === 0
                ? "text-[#818CF8] bg-[#6366F1]/15 px-2 py-0.5 rounded"
                : "text-[#F8FAFC]"
            }`}
          >
            {feeLabel}
          </span>
        </div>

        {/* Action Button states per Prompt 8.4 */}
        <div className="pt-1 flex items-center justify-between gap-3">
          <div className="text-[11px] font-mono text-[#64748B]">
            {isSquadsFull ? (
              <span className="text-amber-400 font-bold">Squads Full ({registeredSquads} max)</span>
            ) : (
              <span>{registeredSquads} squads registered</span>
            )}
          </div>

          {isEventEnded ? (
            <button
              disabled
              className="px-4 py-2 rounded-xl bg-white/[0.04] text-[#64748B] text-xs font-mono font-bold cursor-not-allowed border border-white/[0.06]"
            >
              Event Ended
            </button>
          ) : isRegistrationClosed ? (
            <button
              disabled
              className="px-4 py-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-mono font-bold cursor-not-allowed"
            >
              Registration Closed
            </button>
          ) : isSquadsFull ? (
            <button
              disabled
              className="px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-mono font-bold cursor-not-allowed"
            >
              Squads Full
            </button>
          ) : (
            <Link
              href={`/hackathons/${hackathon.slug}/apply`}
              className="px-4 py-2 rounded-xl bg-[#6366F1] hover:bg-[#4F46E5] text-white text-xs font-mono font-bold flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <span>Register Squad</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
