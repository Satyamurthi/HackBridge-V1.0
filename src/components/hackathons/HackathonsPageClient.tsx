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
import HackathonTimingCard, { HackathonCardData } from "@/components/hackathons/HackathonTimingCard";
import ServerClockChip from "@/components/ui/ServerClockChip";

interface HackathonsPageClientProps {
  initialSections?: any[];
}

export default function HackathonsPageClient({ initialSections = [] }: HackathonsPageClientProps) {
  const [hackathons, setHackathons] = useState<HackathonCardData[]>([]);
  const [contentSections, setContentSections] = useState<any[]>(initialSections);
  const [loading, setLoading] = useState(true);
  const [serverTimeOffset, setServerTimeOffset] = useState<number>(0);
  const [search, setSearch] = useState("");
  const [modeFilter, setModeFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Fetch published CMS content on mount and on focus
  useEffect(() => {
    const fetchLatest = () => {
      fetch(`/api/v1/content/page_arenas?t=${Date.now()}`, { cache: "no-store" })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data && Array.isArray(data.sections)) {
            setContentSections(data.sections);
          }
        })
        .catch(() => {});
    };

    fetchLatest();

    const handleFocus = () => fetchLatest();
    window.addEventListener("focus", handleFocus);
    const handleVis = () => {
      if (document.visibilityState === "visible") fetchLatest();
    };
    document.addEventListener("visibilitychange", handleVis);

    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVis);
    };
  }, []);

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
        if (data.serverTime) {
          const sTime = new Date(data.serverTime).getTime();
          setServerTimeOffset(sTime - Date.now());
        }
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

  const headerSection = contentSections?.find((s) => s.type === "header" || s.type === "hero");
  const heading = headerSection?.heading || "Active Collegiate Hackathons";
  const subheading = headerSection?.subheading || "Browse verified hackathons with permanent student registration, server-locked problem statements, and automated GitHub repository provisioning.";

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-14 w-full bg-transparent text-[#F8FAFC] relative z-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 pb-8 border-b border-white/[0.08] gap-4">
        <div>
          <div className="text-xs font-mono uppercase tracking-wider text-[#818CF8] font-bold mb-1">
            Discovery Arena
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-[#F8FAFC] tracking-tight">
            {heading}
          </h1>
          <p className="text-sm text-[#94A3B8] mt-2 max-w-lg leading-relaxed">
            {subheading}
          </p>
        </div>

        {/* Server Clock Chip & Quick Counters */}
        <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
          <ServerClockChip serverTimeOffset={serverTimeOffset} />
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
              <HackathonTimingCard key={h.id} hackathon={h} serverTimeOffset={serverTimeOffset} />
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
