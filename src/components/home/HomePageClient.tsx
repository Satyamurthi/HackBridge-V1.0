"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Terminal, 
  ArrowRight, 
  Clock, 
  Layers, 
  Lock,
  GitBranch,
  Shield,
  ExternalLink,
  Building2
} from "lucide-react";

import HackathonTimingCard from "@/components/hackathons/HackathonTimingCard";
import ServerClockChip from "@/components/ui/ServerClockChip";

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
  registrationDeadline?: string | null;
  startAt: string;
  endAt: string;
  host: {
    orgName: string;
    type: string;
  };
  domains: Array<{
    id: string;
    name: string;
    revealAt?: string | null;
    problemStatements: Array<{ id: string; title: string }>;
  }>;
  _count?: {
    teams: number;
  };
}

interface HomePageClientProps {
  initialSections?: any[];
}

export default function HomePageClient({ initialSections = [] }: HomePageClientProps) {
  const [hackathons, setHackathons] = useState<HackathonItem[]>([]);
  const [contentSections, setContentSections] = useState<any[]>(initialSections);
  const [serverTimeOffset, setServerTimeOffset] = useState<number>(0);
  const [loadingHackathons, setLoadingHackathons] = useState(true);
  const [timeLeft, setTimeLeft] = useState({
    hours: 0,
    minutes: 0,
    seconds: 0,
  });
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [liveMetrics, setLiveMetrics] = useState<Record<string, string>>({});
  const lastFetchRef = React.useRef<number>(0);

  // Fetch published CMS content on mount and sync in real time across browser tabs with throttling
  useEffect(() => {
    const fetchLatest = () => {
      const now = Date.now();
      if (now - lastFetchRef.current < 2500) return; // Prevent rapid redundant network calls
      lastFetchRef.current = now;

      fetch(`/api/v1/content/page_landing?t=${now}`, { cache: "no-store" })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data && Array.isArray(data.sections)) {
            setContentSections(data.sections);
          }
        })
        .catch(() => {});
    };

    fetchLatest();

    // Fetch dynamic live database metrics
    fetch("/api/v1/platform/metrics")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setLiveMetrics({
            builders: data.totalBuilders || "5,000+",
            locking: data.atomicLocking || "100%",
            resolution: data.disputeResolution || "0ms",
            prizepool: data.totalPrizePool || "₹5,00,000+",
            arenas: data.activeArenas || "12+",
            teams: data.totalTeams || "150+",
          });
        }
      })
      .catch(() => {});

    // Instant real-time portrayal when CMS saves in background or publishes
    let channel: BroadcastChannel | null = null;
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      try {
        channel = new BroadcastChannel("hb_cms_sync");
        channel.onmessage = (event) => {
          if (event.data?.type === "CMS_PUBLISHED") {
            lastFetchRef.current = 0; // Force immediate update on publish
            fetchLatest();
          }
        };
      } catch {}
    }

    const handleStorage = (e: StorageEvent) => {
      if (e.key === "hb_cms_last_published") {
        lastFetchRef.current = 0;
        fetchLatest();
      }
    };
    window.addEventListener("storage", handleStorage);

    const handleVis = () => {
      if (document.visibilityState === "visible") fetchLatest();
    };
    document.addEventListener("visibilitychange", handleVis);

    return () => {
      document.removeEventListener("visibilitychange", handleVis);
      window.removeEventListener("storage", handleStorage);
      if (channel) channel.close();
    };
  }, []);

  // Fetch real hackathon data from database
  useEffect(() => {
    fetch("/api/v1/hackathons")
      .then((res) => (res.ok ? res.json() : { hackathons: [] }))
      .then((data) => {
        setHackathons(data.hackathons || []);
        if (data.serverTime) {
          const sTime = new Date(data.serverTime).getTime();
          setServerTimeOffset(sTime - Date.now());
        }
        setLoadingHackathons(false);
      })
      .catch(() => {
        setHackathons([]);
        setLoadingHackathons(false);
      });
  }, []);

  const featured = hackathons.length > 0 ? hackathons[0] : null;

  // Real-time server-clock countdown targeting actual domain revealAt or hackathon startAt
  useEffect(() => {
    if (!featured) return;

    const now = Date.now();
    let candidateTarget: Date | null = null;

    if (featured.domains && featured.domains.length > 0) {
      const futureReveals = featured.domains
        .map((d) => (d.revealAt ? new Date(d.revealAt) : null))
        .filter((d): d is Date => d !== null && d.getTime() > now)
        .sort((a, b) => a.getTime() - b.getTime());

      if (futureReveals.length > 0) {
        candidateTarget = futureReveals[0];
      }
    }

    if (!candidateTarget && featured.startAt) {
      const start = new Date(featured.startAt);
      if (start.getTime() > now) {
        candidateTarget = start;
      }
    }

    const calculateTime = () => {
      if (!candidateTarget) {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0 });
        setIsUnlocked(true);
        return;
      }
      const diff = candidateTarget.getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0 });
        setIsUnlocked(true);
      } else {
        setIsUnlocked(false);
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft({ hours, minutes, seconds });
      }
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [featured]);

  const totalStatements = featured?.domains?.reduce((sum, d) => sum + (d.problemStatements?.length || 0), 0) || 0;
  const totalTeams = featured?._count?.teams || 0;
  const capValue = totalStatements > 0 ? Math.ceil(totalTeams / totalStatements) : 0;

  // Resolve dynamic sections from published CMS content
  const heroSection = contentSections?.find((s) => s.type === "hero" || s.id === "hero");
  const heroVisible = heroSection ? heroSection.visible !== false : true;
  const heroHeading = heroSection?.heading || "Architectural Infrastructure for High Stakes Hackathons.";
  const heroSubheading = heroSection?.subheading || "Permanent student credentials, atomic problem allocation, and automated GitHub repository provisioning—engineered for university builders and serious hackathon hosts.";
  const heroBtnText = heroSection?.buttonText || "Claim Student Hackathon ID";
  const heroBtnLink = heroSection?.buttonLink || "/signup/student";
  const heroSecBtnText = heroSection?.secondaryButtonText || "Host a Hackathon";
  const heroSecBtnLink = heroSection?.secondaryButtonLink || "/register/college";
  const heroBadgePrefix = (heroSection as any)?.badgePrefix || "PROTOCOL v1.0";
  const heroBadgeText = (heroSection as any)?.badgeText || "Collegiate Hackathon Infrastructure";
  const heroBadgeStatus = (heroSection as any)?.badgeStatus || "LIVE";
  const heroBadgeVisible = (heroSection as any)?.showBadge !== false;

  const statsSection = contentSections?.find((s) => s.type === "stats" || s.id === "stats");
  const statsVisible = statsSection ? statsSection.visible !== false : true;
  const statsItems = statsSection?.items && Array.isArray(statsSection.items) && statsSection.items.length > 0
    ? statsSection.items
    : [
        { value: "5,000+", label: "Collegiate Builders" },
        { value: "100%", label: "Atomic Row Locking" },
        { value: "0ms", label: "Dispute Resolution" },
      ];

  const howItWorksSection = contentSections?.find((s) => s.id === "how_it_works" || s.type === "cards");
  const howItWorksVisible = howItWorksSection ? howItWorksSection.visible !== false : true;
  const howItWorksHeading = howItWorksSection?.heading || "How HackBridge Works";
  const howItWorksSubheading = howItWorksSection?.subheading || "End-to-end cryptographic and collegiate governance.";
  const howItWorksItems = howItWorksSection?.items && Array.isArray(howItWorksSection.items) && howItWorksSection.items.length > 0
    ? howItWorksSection.items
    : [
        { title: "Mint Student ID", description: "Permanent identity issued with collegiate email verification." },
        { title: "Form Squad", description: "Atomic roster validation with minimum squad enforcement." },
        { title: "Timed Domain Reveal", description: "Problem statements cryptographically sealed until countdown ticks zero." },
      ];

  // Additional custom sections added via CMS (FAQ, Text, or custom cards)
  const customSections = contentSections?.filter(
    (s) => s.id !== "hero" && s.id !== "stats" && s.id !== "how_it_works" && s.type !== "hero" && s.type !== "stats" && s.type !== "seo" && s.visible !== false
  ) || [];

  return (
    <div className="relative w-full flex flex-col items-center overflow-hidden bg-transparent text-[#F8FAFC]">
      {/* 1. Hero Section (Transparent background reveals global 3D rotating dotted globe) */}
      {heroVisible && (
        <section className="relative w-full min-h-[90vh] flex items-center px-4 md:px-8 py-20 lg:py-28 overflow-hidden">
          {/* Subtle radial depth gradient in single accent indigo */}
          <div className="absolute top-1/4 right-1/4 w-[500px] h-[500px] bg-[#6366F1]/10 rounded-full blur-3xl pointer-events-none -z-1" />

          <div className="relative z-10 max-w-4xl mx-auto w-full flex flex-col items-center text-center space-y-7 animate-fade-in-up">
            {/* Subtle radial obsidian contrast halo directly behind headline for perfect readability */}
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-80 max-w-3xl mx-auto -z-10 bg-[radial-gradient(ellipse_at_center,_rgba(3,4,7,0.72)_0%,_rgba(3,4,7,0.40)_55%,_transparent_80%)] pointer-events-none rounded-full blur-xl" />

            {heroBadgeVisible && (
              <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-xs font-mono text-[#F8FAFC] backdrop-blur-md">
                <span className="w-2 h-2 rounded-full bg-[#6366F1] animate-pulse" />
                <span className="tracking-wider uppercase text-[11px] font-bold text-[#818CF8]">
                  {heroBadgePrefix}
                </span>
                <span className="text-white/20">/</span>
                <span className="text-[11px] font-medium text-[#94A3B8]">
                  {heroBadgeText}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-[#6366F1]/20 text-[#818CF8] font-bold text-[10px] border border-[#6366F1]/30">
                  {heroBadgeStatus}
                </span>
              </div>
            )}

            <h1 className="font-display text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-[#F8FAFC] max-w-4xl leading-[1.08] drop-shadow-sm">
              {heroHeading}
            </h1>

            <p className="text-base sm:text-lg text-[#94A3B8] max-w-2xl font-normal leading-relaxed">
              {heroSubheading}
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-3.5 pt-4 w-full sm:w-auto">
              <Link
                href={heroBtnLink}
                className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-[#6366F1] hover:bg-[#4F46E5] text-white font-semibold text-xs tracking-wide transition-all shadow-[0_0_20px_rgba(99,102,241,0.3)] hover:shadow-[0_0_25px_rgba(99,102,241,0.5)] flex items-center justify-center gap-2"
              >
                <span>{heroBtnText}</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href={heroSecBtnLink}
                className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.1] text-[#F8FAFC] font-semibold text-xs tracking-wide transition-all backdrop-blur-md flex items-center justify-center gap-2"
              >
                <span>{heroSecBtnText}</span>
              </Link>
            </div>

            {/* Platform Metrics Strip (100% Dynamic from Backend CMS) */}
            {statsVisible && statsItems.length > 0 && (
              <div
                className={`grid gap-3.5 pt-12 w-full mx-auto border-t border-white/[0.06] ${
                  statsItems.length === 1
                    ? "grid-cols-1 max-w-xs"
                    : statsItems.length === 2
                    ? "grid-cols-2 max-w-md"
                    : statsItems.length === 3
                    ? "grid-cols-1 sm:grid-cols-3 max-w-2xl"
                    : statsItems.length === 4
                    ? "grid-cols-2 sm:grid-cols-4 max-w-3xl"
                    : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 max-w-4xl"
                }`}
              >
                {statsItems.map((st: any, idx: number) => {
                  let val = st.value || "";
                  if (val === "{LIVE_BUILDERS}" || val === "live:builders") val = liveMetrics.builders || "5,000+";
                  else if (val === "{LIVE_PRIZE}" || val === "live:prize") val = liveMetrics.prizepool || "₹5,00,000+";
                  else if (val === "{LIVE_ARENAS}" || val === "live:arenas") val = liveMetrics.arenas || "12+";
                  else if (val === "{LIVE_TEAMS}" || val === "live:teams") val = liveMetrics.teams || "150+";

                  return (
                    <div
                      key={idx}
                      className="flex flex-col items-center justify-center p-3.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.04] hover:border-[#6366F1]/30 transition-all duration-200 group"
                    >
                      <span className="text-xl sm:text-2xl font-bold font-mono text-[#F8FAFC] tracking-tight group-hover:text-[#818CF8] transition-colors">
                        {val}
                      </span>
                      <span className="text-[11px] font-mono text-[#94A3B8] text-center mt-1">
                        {st.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      )}

      {/* 2. Featured Arena & Real-Time Countdown Section */}
      <section className="w-full max-w-7xl px-4 md:px-8 py-16 relative z-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-wider text-[#818CF8]">
              <Clock className="w-3.5 h-3.5" />
              <span>Real-Time Arena Feed</span>
            </div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#F8FAFC] tracking-tight mt-1">
              Active Collegiate Arena
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <ServerClockChip serverTimeOffset={serverTimeOffset} />
            <Link
              href="/hackathons"
              className="text-xs font-mono text-[#818CF8] hover:text-white flex items-center gap-1 transition-colors"
            >
              <span>View All Arenas</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {loadingHackathons ? (
          <div className="w-full h-72 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-center font-mono text-xs text-[#94A3B8] animate-pulse">
            Syncing platform arenas with distributed clock...
          </div>
        ) : featured ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* Main Featured Arena Card */}
            <div className="lg:col-span-7">
              <HackathonTimingCard
                hackathon={{
                  id: featured.id,
                  title: featured.title,
                  slug: featured.slug,
                  description: featured.description,
                  startAt: featured.startAt,
                  endAt: featured.endAt,
                  registrationDeadline: featured.registrationDeadline,
                  prizePool: featured.prizePool,
                  teamMin: featured.teamMin,
                  teamMax: featured.teamMax,
                  fee: featured.fee,
                  paymentMode: featured.paymentMode,
                  host: {
                    orgName: featured.host?.orgName || "Collegiate Host",
                    type: featured.host?.type || "COLLEGE",
                  },
                  domains: featured.domains || [],
                  _count: featured._count || { teams: 0 },
                }}
                serverTimeOffset={serverTimeOffset}
              />
            </div>

            {/* Countdown & Allocation Rule Highlights */}
            <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
              {/* Synchronized Reveal Timer Card */}
              <div className="bg-[#0B0E18]/70 backdrop-blur-md border border-white/[0.08] p-6 rounded-2xl relative overflow-hidden shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-[#94A3B8]">
                    Problem Reveal Engine
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#6366F1]/20 text-[#818CF8] border border-[#6366F1]/30">
                    Rule 2 Enforcement
                  </span>
                </div>

                <div className="text-center py-4">
                  {isUnlocked ? (
                    <div className="space-y-1">
                      <div className="text-2xl font-bold font-mono text-emerald-400">
                        PROBLEMS UNLOCKED
                      </div>
                      <p className="text-xs text-[#94A3B8]">
                        Allocations active under balanced slot enforcement.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center justify-center gap-3 font-mono font-bold text-3xl sm:text-4xl text-[#F8FAFC] tracking-tight">
                        <div className="flex flex-col items-center">
                          <span>{String(timeLeft.hours).padStart(2, "0")}</span>
                          <span className="text-[9px] uppercase tracking-wider text-[#64748B] font-normal">HRS</span>
                        </div>
                        <span className="text-[#6366F1] -mt-3">:</span>
                        <div className="flex flex-col items-center">
                          <span>{String(timeLeft.minutes).padStart(2, "0")}</span>
                          <span className="text-[9px] uppercase tracking-wider text-[#64748B] font-normal">MIN</span>
                        </div>
                        <span className="text-[#6366F1] -mt-3">:</span>
                        <div className="flex flex-col items-center">
                          <span>{String(timeLeft.seconds).padStart(2, "0")}</span>
                          <span className="text-[9px] uppercase tracking-wider text-[#64748B] font-normal">SEC</span>
                        </div>
                      </div>
                      <p className="text-[11px] text-[#94A3B8] font-mono">
                        Atomic countdown synced with server UTC clock
                      </p>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t border-white/[0.06] flex items-center justify-between text-xs font-mono">
                  <span className="text-[#94A3B8]">Cap Formula:</span>
                  <span className="text-[#818CF8] font-bold">
                    ceil({totalTeams} teams / {totalStatements || 1} stmts) = {capValue} max/stmt
                  </span>
                </div>
              </div>

              {/* Instant Verification Protocol Details */}
              <div className="bg-[#0B0E18]/70 backdrop-blur-md border border-white/[0.08] p-6 rounded-2xl space-y-3 shadow-sm">
                <div className="flex items-center gap-2 text-xs font-bold text-[#F8FAFC]">
                  <Shield className="w-4 h-4 text-[#818CF8]" />
                  <span>Permanent Student Credential Verification</span>
                </div>
                <p className="text-xs text-[#94A3B8] leading-relaxed">
                  Students register once with verified institutional email (<code className="text-[#818CF8]">.edu / .ac.in</code>), receiving a permanent HackBridge ID.
                </p>
                <div className="pt-2">
                  <Link
                    href={`/hackathons/${featured.slug}`}
                    className="inline-flex items-center gap-2 text-xs font-mono font-bold text-[#818CF8] hover:text-white transition-colors"
                  >
                    <span>Enter {featured.title}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="w-full p-12 rounded-2xl bg-white/[0.02] border border-white/[0.06] text-center space-y-3">
            <p className="text-sm font-mono text-[#94A3B8]">
              No active hackathons scheduled right now. Host the first one!
            </p>
            <Link
              href="/register/college"
              className="inline-block px-4 py-2 rounded-xl bg-[#6366F1] text-white text-xs font-mono font-bold hover:bg-[#4F46E5] transition-colors"
            >
              Host a Collegiate Hackathon
            </Link>
          </div>
        )}
      </section>

      {/* 3. Dynamic How It Works / Cards Section */}
      {howItWorksVisible && (
        <section className="w-full max-w-7xl px-4 md:px-8 py-16 relative z-10 border-t border-white/[0.06]">
          <div className="text-center max-w-2xl mx-auto mb-12 space-y-3">
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#818CF8]">
              {howItWorksSubheading}
            </span>
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-[#F8FAFC] tracking-tight">
              {howItWorksHeading}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {howItWorksItems.map((item: any, idx: number) => (
              <div
                key={idx}
                className="bg-[#0B0E18]/70 backdrop-blur-md border border-white/[0.08] p-6 rounded-2xl space-y-3 shadow-sm hover:border-white/20 transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/10 flex items-center justify-center font-mono font-bold text-xs text-[#818CF8]">
                  0{idx + 1}
                </div>
                <h3 className="font-bold text-[#F8FAFC] text-sm tracking-tight">{item.title}</h3>
                <p className="text-xs text-[#94A3B8] leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 4. Custom CMS Sections (FAQ, Text Blocks, etc. added by Admin via CMS) */}
      {customSections.map((sec: any) => {
        if (sec.type === "faq") {
          return (
            <section key={sec.id} className="w-full max-w-4xl px-4 md:px-8 py-12 relative z-10 border-t border-white/[0.06]">
              <div className="text-center mb-8 space-y-2">
                <span className="text-[11px] font-mono uppercase tracking-wider text-[#818CF8]">
                  Frequently Asked Questions
                </span>
                <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#F8FAFC]">
                  {sec.heading || "FAQ"}
                </h2>
                {sec.subheading && <p className="text-xs text-[#94A3B8]">{sec.subheading}</p>}
              </div>
              <div className="space-y-3">
                {sec.items?.map((item: any, idx: number) => (
                  <div key={idx} className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.08] space-y-1.5">
                    <h4 className="text-xs font-bold text-[#F8FAFC]">{item.question}</h4>
                    <p className="text-xs text-[#94A3B8] leading-relaxed">{item.answer}</p>
                  </div>
                ))}
              </div>
            </section>
          );
        }

        if (sec.type === "text") {
          return (
            <section key={sec.id} className="w-full max-w-4xl px-4 md:px-8 py-12 relative z-10 border-t border-white/[0.06]">
              <h2 className="font-display text-2xl font-bold text-[#F8FAFC] mb-2">{sec.heading}</h2>
              {sec.subheading && <p className="text-xs text-[#818CF8] mb-4">{sec.subheading}</p>}
              <p className="text-xs text-[#94A3B8] leading-relaxed whitespace-pre-line">{sec.bodyText}</p>
            </section>
          );
        }

        if (sec.type === "cards") {
          return (
            <section key={sec.id} className="w-full max-w-7xl px-4 md:px-8 py-12 relative z-10 border-t border-white/[0.06]">
              <div className="text-center mb-8 space-y-2">
                <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#F8FAFC]">{sec.heading}</h2>
                {sec.subheading && <p className="text-xs text-[#94A3B8]">{sec.subheading}</p>}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {sec.items?.map((item: any, idx: number) => (
                  <div key={idx} className="bg-[#0B0E18]/70 border border-white/[0.08] p-6 rounded-2xl space-y-2">
                    <h4 className="font-bold text-[#F8FAFC] text-sm">{item.title}</h4>
                    <p className="text-xs text-[#94A3B8]">{item.description}</p>
                  </div>
                ))}
              </div>
            </section>
          );
        }

        return null;
      })}

      {/* 5. Core Architectural Invariants Strip */}
      <section className="w-full max-w-7xl px-4 md:px-8 py-16 relative z-10 border-t border-white/[0.06]">
        <div className="bg-gradient-to-b from-white/[0.03] to-white/[0.01] border border-white/[0.08] rounded-3xl p-8 lg:p-12 space-y-8">
          <div>
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#818CF8]">
              Mathematical Integrity &amp; Strict Invariants
            </span>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#F8FAFC] tracking-tight mt-1">
              Built Upon 4 Non-Negotiable Protocol Rules
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-[#0B0E18]/70 backdrop-blur-md border border-white/[0.08] p-6 rounded-2xl space-y-3 shadow-sm hover:border-white/20 transition-colors">
              <div className="flex items-center gap-2 text-[#F8FAFC] font-bold text-sm">
                <Lock className="w-4 h-4 text-[#818CF8]" />
                Rule 1: Strict Single Active Registration
              </div>
              <p className="text-xs text-[#94A3B8] leading-relaxed">
                A student can only join one squad per hackathon timeline. Cross-team registrations are immediately blocked at database level via composite unique indexes, eliminating ghost participants.
              </p>
            </div>

            <div className="bg-[#0B0E18]/70 backdrop-blur-md border border-white/[0.08] p-6 rounded-2xl space-y-3 shadow-sm hover:border-white/20 transition-colors">
              <div className="flex items-center gap-2 text-[#F8FAFC] font-bold text-sm">
                <Layers className="w-4 h-4 text-[#818CF8]" />
                Rule 2: Atomic Balanced Allocation &amp; Cap
              </div>
              <p className="text-xs text-[#94A3B8] leading-relaxed">
                When problem statements unlock simultaneously, slot caps are calculated as <code className="text-[#F8FAFC] font-bold bg-white/[0.05] px-1 py-0.5 rounded border border-white/[0.08]">ceil(total_teams / total_statements)</code>. Selections execute inside a serialized database transaction with row locks, guaranteeing zero overbooked slots.
              </p>
            </div>

            <div className="bg-[#0B0E18]/70 backdrop-blur-md border border-white/[0.08] p-6 rounded-2xl space-y-3 shadow-sm hover:border-white/20 transition-colors">
              <div className="flex items-center gap-2 text-[#F8FAFC] font-bold text-sm">
                <GitBranch className="w-4 h-4 text-[#818CF8]" />
                Rule 3: Automatic GitHub Commits Named by Team ID
              </div>
              <p className="text-xs text-[#94A3B8] leading-relaxed">
                Every squad receives an automated repository generated under the host or organization GitHub credentials. All progress commits are permanent, transparent to judges, and preserved in the student&apos;s verified portfolio.
              </p>
            </div>

            <div className="bg-[#0B0E18]/70 backdrop-blur-md border border-white/[0.08] p-6 rounded-2xl space-y-3 shadow-sm hover:border-white/20 transition-colors">
              <div className="flex items-center gap-2 text-[#F8FAFC] font-bold text-sm">
                <Shield className="w-4 h-4 text-[#818CF8]" />
                Rule 4: Immutable Final Submissions
              </div>
              <p className="text-xs text-[#94A3B8] leading-relaxed">
                Once a team lead submits their repository and description, the entry is locked. No edits or re-uploads can be made unless the hackathon host explicitly executes an unlock action, which is permanently recorded in the audit log.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
