"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Search,
  Calendar,
  Users,
  Trophy,
  ArrowRight,
  Clock,
  Filter,
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
    ? { label: "LIVE", cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" }
    : isUpcoming
    ? { label: "UPCOMING", cls: "bg-[#6366F1]/10 text-[#6366F1] border-[#6366F1]/20" }
    : { label: "ENDED", cls: "bg-white/5 text-slate-400 border-white/10" };

  return (
    <Link
      href={`/hackathons/${h.slug || h.id}`}
      className="group block bg-[#0B0E18] border border-white/[0.08] hover:border-white/20 rounded-2xl p-6 flex flex-col justify-between space-y-5 transition-all duration-200 hover:-translate-y-0.5"
    >
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-white/[0.04] border border-white/10 text-slate-400">
            {h.host?.orgName || "Collegiate Host"}
          </span>
          <span className={`text-[10px] font-mono px-2 py-0.5 rounded border font-semibold ${statusBadge.cls}`}>
            {statusBadge.label}
          </span>
        </div>

        {/* Title + Description */}
        <div>
          <h3 className="font-display text-lg font-bold text-white tracking-tight leading-snug group-hover:text-[#6366F1] transition-colors">
            {h.title}
          </h3>
          <p className="text-xs text-slate-400 mt-2 line-clamp-2 leading-relaxed">
            {h.description}
          </p>
        </div>

        {/* Domain Tags */}
        {h.domains?.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {h.domains.slice(0, 3).map((d) => (
              <span
                key={d.id}
                className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/[0.03] border border-white/5 text-slate-400"
              >
                {d.name}
              </span>
            ))}
            {h.domains.length > 3 && (
              <span className="text-[10px] font-mono text-slate-500">
                +{h.domains.length - 3} more
              </span>
            )}
          </div>
        )}
      </div>

      {/* Footer Stats */}
      <div className="pt-4 border-t border-white/[0.06] space-y-3">
        {/* Countdown or date */}
        <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-400">
          <Clock className="w-3.5 h-3.5" />
          {isLive ? (
            <span className="text-emerald-400">Hackathon in progress</span>
          ) : isUpcoming ? (
            <span>
              Starts in{" "}
              <span className="text-white font-semibold">
                {daysLeft > 0 ? `${daysLeft}d ${hoursLeft}h` : `${hoursLeft}h`}
              </span>
            </span>
          ) : (
            <span>Ended {new Date(h.endAt).toLocaleDateString("en-IN")}</span>
          )}
        </div>

        <div className="flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-3 text-slate-400">
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              {h.teamMin}–{h.teamMax} members
            </span>
            {h.prizePool && (
              <span className="flex items-center gap-1">
                <Trophy className="w-3 h-3" />
                {h.prizePool}
              </span>
            )}
          </div>
          <span className={`text-[10px] font-semibold ${h.fee === 0 ? "text-emerald-400" : "text-slate-300"}`}>
            {feeLabel}
          </span>
        </div>

        <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
          <span>{h._count?.teams ?? 0} squads registered</span>
          <span className="text-[#6366F1] group-hover:translate-x-0.5 transition-transform inline-flex items-center gap-1">
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
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  const fetchHackathons = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (modeFilter) params.set("mode", modeFilter);
    if (typeFilter) params.set("type", typeFilter);

    try {
      const res = await fetch(`/api/v1/hackathons?${params}`);
      const data = res.ok ? await res.json() : { hackathons: [] };
      setHackathons(data.hackathons || []);
    } catch {
      setHackathons([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, modeFilter, typeFilter]);

  useEffect(() => {
    fetchHackathons();
  }, [fetchHackathons]);

  const liveCount = hackathons.filter((h) => {
    const now = new Date();
    return now >= new Date(h.startAt) && now <= new Date(h.endAt);
  }).length;

  const upcomingCount = hackathons.filter((h) => new Date() < new Date(h.startAt)).length;

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-16 w-full">
      {/* Page Header */}
      <div className="mb-12 space-y-4">
        <div className="text-xs font-mono uppercase tracking-wider text-[#6366F1]">
          Live Platform
        </div>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="font-display text-3xl sm:text-4xl font-bold text-white tracking-tight">
              Active & Upcoming Hackathons
            </h1>
            <p className="text-sm text-slate-400 mt-2 leading-relaxed max-w-xl">
              Approved collegiate and company-hosted technical competitions. All problem statements
              are locked server-side until the host-configured reveal time.
            </p>
          </div>

          {/* Live stats */}
          {!loading && (
            <div className="flex items-center gap-4 text-xs font-mono flex-shrink-0">
              {liveCount > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {liveCount} LIVE
                </div>
              )}
              <div className="flex items-center gap-1.5 text-slate-400">
                <Zap className="w-3.5 h-3.5" />
                {upcomingCount} upcoming
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Search & Filters Bar */}
      <div className="mb-8 flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search hackathons by name or description..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#0B0E18] border border-white/[0.08] text-white placeholder-slate-500 text-sm focus:outline-none focus:border-[#6366F1]/50 transition-colors"
          />
        </div>

        {/* Mode Filter */}
        <div className="relative">
          <select
            value={modeFilter}
            onChange={(e) => setModeFilter(e.target.value)}
            className="appearance-none pl-3 pr-8 py-2.5 rounded-xl bg-[#0B0E18] border border-white/[0.08] text-sm text-slate-300 focus:outline-none focus:border-[#6366F1]/50 transition-colors cursor-pointer"
          >
            <option value="">All Fees</option>
            <option value="FREE">Free to Enter</option>
            <option value="QR">QR Payment</option>
            <option value="RAZORPAY">Razorpay</option>
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-slate-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Host Type Filter */}
        <div className="relative">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="appearance-none pl-3 pr-8 py-2.5 rounded-xl bg-[#0B0E18] border border-white/[0.08] text-sm text-slate-300 focus:outline-none focus:border-[#6366F1]/50 transition-colors cursor-pointer"
          >
            <option value="">All Hosts</option>
            <option value="college">College Chapters</option>
            <option value="company">Company/Startup</option>
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-slate-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {/* Hackathon Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-72 rounded-2xl bg-[#0B0E18] border border-white/5 animate-pulse"
            />
          ))}
        </div>
      ) : hackathons.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-28 text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-center">
            <Building2 className="w-5 h-5 text-slate-500" />
          </div>
          <div>
            <h3 className="font-display text-lg font-bold text-white">No Hackathons Found</h3>
            <p className="text-sm text-slate-400 mt-1 max-w-sm">
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
              className="text-xs font-mono text-[#6366F1] underline underline-offset-4 hover:text-white transition-colors"
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
          <p className="text-center text-xs text-slate-500 font-mono mt-10">
            {hackathons.length} approved track{hackathons.length !== 1 ? "s" : ""} displayed ·{" "}
            All hosted on HackBridge Protocol v1.0
          </p>
        </>
      )}
    </div>
  );
}
