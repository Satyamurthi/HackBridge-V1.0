"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Search,
  Users,
  Trophy,
  ArrowRight,
  Clock,
  Building2,
  Zap,
  ChevronDown,
} from "lucide-react";

interface HackathonItem {
  id: string;
  title: string;
  slug: string;
  description: string;
  prizePool?: string;
  teamMin: number;
  teamMax: number;
  fee: number;
  paymentMode: string;
  startAt: string;
  endAt: string;
  host: { orgName: string; type: string };
  domains: Array<{ id: string; name: string; problemStatements: Array<{ id: string; title: string }> }>;
  _count?: { teams: number };
}

function HackathonCard({ h }: { h: HackathonItem }) {
  const now = new Date();
  const start = new Date(h.startAt);
  const end = new Date(h.endAt);
  const isLive = now >= start && now <= end;
  const isUpcoming = now < start;

  const msLeft = start.getTime() - now.getTime();
  const daysLeft = Math.max(0, Math.floor(msLeft / (1000 * 60 * 60 * 24)));
  const hoursLeft = Math.max(0, Math.floor((msLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)));

  const feeLabel =
    h.paymentMode === "FREE" || h.fee === 0
      ? "FREE"
      : `₹${h.fee} · ${h.paymentMode === "QR" ? "QR Proof" : "Razorpay"}`;

  const statusBadge = isLive
    ? { label: "LIVE", cls: "bg-[#6366F1]/20 text-[#818CF8] border border-[#6366F1]/40" }
    : isUpcoming
    ? { label: "UPCOMING", cls: "bg-white/[0.05] text-[#94A3B8] border border-white/[0.1]" }
    : { label: "ENDED", cls: "bg-white/[0.02] text-[#64748B] border border-white/[0.04]" };

  return (
    <Link
      href={`/hackathons/${h.slug || h.id}`}
      className="group block bg-[#0B0E18]/70 backdrop-blur-md border border-white/[0.08] hover:border-[#6366F1]/50 rounded-2xl p-6 flex flex-col justify-between space-y-5 transition-all duration-200 hover:-translate-y-1 shadow-lg hover:shadow-indigo-500/10"
    >
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <span className="text-[11px] font-mono px-2.5 py-1 rounded bg-white/[0.04] border border-white/[0.08] text-[#F8FAFC] font-medium">
            {h.host?.orgName || "Collegiate Host"}
          </span>
          <span className={`text-[10px] font-mono px-2.5 py-0.5 rounded font-bold ${statusBadge.cls}`}>
            {statusBadge.label}
          </span>
        </div>

        {/* Title + Description */}
        <div>
          <h3 className="font-display text-xl font-bold text-[#F8FAFC] tracking-tight leading-snug group-hover:text-[#818CF8] transition-colors">
            {h.title}
          </h3>
          <p className="text-xs text-[#94A3B8] mt-2 line-clamp-2 leading-relaxed">
            {h.description}
          </p>
        </div>

        {/* Domain Tags */}
        {h.domains?.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {h.domains.slice(0, 3).map((d) => (
              <span
                key={d.id}
                className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/[0.03] border border-white/[0.06] text-[#94A3B8] font-medium"
              >
                {d.name}
              </span>
            ))}
            {h.domains.length > 3 && (
              <span className="text-[10px] font-mono text-[#64748B] font-semibold">
                +{h.domains.length - 3} more
              </span>
            )}
          </div>
        )}
      </div>

      {/* Footer Stats */}
      <div className="pt-4 border-t border-white/[0.08] space-y-3">
        {/* Countdown or date */}
        <div className="flex items-center gap-1.5 text-[11px] font-mono text-[#94A3B8]">
          <Clock className="w-3.5 h-3.5 text-[#818CF8]" />
          {isLive ? (
            <span className="text-[#818CF8] font-bold bg-[#6366F1]/10 px-2 py-0.5 rounded">Hackathon in progress</span>
          ) : isUpcoming ? (
            <span>
              Starts in{" "}
              <span className="text-[#F8FAFC] font-bold">
                {daysLeft > 0 ? `${daysLeft}d ${hoursLeft}h` : `${hoursLeft}h`}
              </span>
            </span>
          ) : (
            <span>Ended {new Date(h.endAt).toLocaleDateString("en-IN")}</span>
          )}
        </div>

        <div className="flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-3 text-[#94A3B8]">
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3 text-[#818CF8]" />
              {h.teamMin}–{h.teamMax} members
            </span>
            {h.prizePool && (
              <span className="flex items-center gap-1 font-semibold text-[#F8FAFC]">
                <Trophy className="w-3 h-3 text-[#818CF8]" />
                {h.prizePool}
              </span>
            )}
          </div>
          <span className={`text-[10px] font-bold ${h.fee === 0 ? "text-[#818CF8] bg-[#6366F1]/15 px-2 py-0.5 rounded" : "text-[#F8FAFC]"}`}>
            {feeLabel}
          </span>
        </div>

        <div className="flex items-center justify-between text-[10px] font-mono text-[#64748B]">
          <span>{h._count?.teams ?? 0} squads registered</span>
          <span className="text-[#818CF8] font-bold group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
            View Details <ArrowRight className="w-3 h-3" />
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function HackathonsPage() {
  const [hackathons, setHackathons] = useState<HackathonItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modeFilter, setModeFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchHackathons = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (modeFilter) params.set("mode", modeFilter);
      if (typeFilter) params.set("type", typeFilter);

      const res = await fetch(`/api/v1/hackathons?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setHackathons(data.hackathons || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, modeFilter, typeFilter]);

  useEffect(() => {
    fetchHackathons();
  }, [fetchHackathons]);

  const liveCount = hackathons.filter((h) => {
    const n = new Date();
    return n >= new Date(h.startAt) && n <= new Date(h.endAt);
  }).length;

  const upcomingCount = hackathons.filter((h) => new Date() < new Date(h.startAt)).length;

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-14 w-full bg-transparent text-[#F8FAFC] relative z-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 pb-8 border-b border-white/[0.08] gap-4">
        <div>
          <div className="text-xs font-mono uppercase tracking-wider text-[#818CF8] font-bold mb-1">
            Discovery Arena
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-[#F8FAFC] tracking-tight">
            Active Collegiate Hackathons
          </h1>
          <p className="text-sm text-[#94A3B8] mt-2 max-w-lg leading-relaxed">
            Browse verified hackathons with permanent student registration, server-locked problem statements, and automated GitHub repository provisioning.
          </p>
        </div>

        {/* Quick Counters */}
        <div className="flex items-center gap-4 text-xs font-mono">
          {liveCount > 0 && (
            <div className="flex items-center gap-1.5 text-[#818CF8] font-bold bg-[#6366F1]/15 px-3 py-1 rounded-full border border-[#6366F1]/30">
              <span className="w-2 h-2 rounded-full bg-[#6366F1] animate-pulse" />
              {liveCount} Live Now
            </div>
          )}
          {upcomingCount > 0 && (
            <div className="flex items-center gap-1.5 text-[#F8FAFC] font-semibold bg-white/[0.04] border border-white/[0.08] px-3 py-1 rounded-full">
              <Zap className="w-3.5 h-3.5 text-[#818CF8]" />
              {upcomingCount} upcoming
            </div>
          )}
        </div>
      </div>

      {/* Search & Filters Bar */}
      <div className="mb-8 flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search hackathons by name or description..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#0B0E18]/80 backdrop-blur-md border border-white/[0.08] text-[#F8FAFC] placeholder-[#64748B] text-sm focus:outline-none focus:border-[#6366F1] transition-colors shadow-sm"
          />
        </div>

        {/* Mode Filter */}
        <div className="relative">
          <select
            value={modeFilter}
            onChange={(e) => setModeFilter(e.target.value)}
            className="appearance-none pl-3 pr-8 py-2.5 rounded-xl bg-[#0B0E18]/80 backdrop-blur-md border border-white/[0.08] text-sm text-[#F8FAFC] focus:outline-none focus:border-[#6366F1] transition-colors cursor-pointer shadow-sm font-semibold"
          >
            <option value="" className="bg-[#0B0E18] text-[#F8FAFC]">All Fees</option>
            <option value="FREE" className="bg-[#0B0E18] text-[#F8FAFC]">Free to Enter</option>
            <option value="QR" className="bg-[#0B0E18] text-[#F8FAFC]">QR Payment</option>
            <option value="RAZORPAY" className="bg-[#0B0E18] text-[#F8FAFC]">Razorpay</option>
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-[#64748B] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Host Type Filter */}
        <div className="relative">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="appearance-none pl-3 pr-8 py-2.5 rounded-xl bg-[#0B0E18]/80 backdrop-blur-md border border-white/[0.08] text-sm text-[#F8FAFC] focus:outline-none focus:border-[#6366F1] transition-colors cursor-pointer shadow-sm font-semibold"
          >
            <option value="" className="bg-[#0B0E18] text-[#F8FAFC]">All Hosts</option>
            <option value="college" className="bg-[#0B0E18] text-[#F8FAFC]">College Chapters</option>
            <option value="company" className="bg-[#0B0E18] text-[#F8FAFC]">Company/Startup</option>
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-[#64748B] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {/* Hackathon Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-72 rounded-2xl bg-[#0B0E18]/60 border border-white/[0.08] animate-pulse shadow-sm"
            />
          ))}
        </div>
      ) : hackathons.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-28 text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center shadow-sm">
            <Building2 className="w-5 h-5 text-[#818CF8]" />
          </div>
          <div>
            <h3 className="font-display text-lg font-bold text-[#F8FAFC]">No Hackathons Found</h3>
            <p className="text-sm text-[#94A3B8] mt-1 max-w-sm">
              {search || modeFilter || typeFilter
                ? "Try adjusting your search or filters."
                : "No approved hackathons are currently published. Check back soon."}
            </p>
          </div>
          {(search || modeFilter || typeFilter) && (
            <button
              onClick={() => {
                setSearch("");
                setModeFilter("");
                setTypeFilter("");
              }}
              className="text-xs font-mono font-bold text-[#818CF8] underline underline-offset-4 hover:text-white transition-colors"
            >
              Clear all filters
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {hackathons.map((h) => (
              <HackathonCard key={h.id} h={h} />
            ))}
          </div>
          <p className="text-center text-xs text-[#64748B] font-mono mt-10">
            {hackathons.length} approved track{hackathons.length !== 1 ? "s" : ""} displayed ·{" "}
            All hosted on HackBridge Protocol v1.0
          </p>
        </>
      )}
    </div>
  );
}
