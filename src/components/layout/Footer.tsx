"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Github, Twitter, ShieldCheck } from "lucide-react";

export default function Footer() {
  const pathname = usePathname();
  const isDashboard = pathname.startsWith("/dashboard");

  // Slim minimal footer inside dashboards
  if (isDashboard) {
    return (
      <footer className="w-full bg-[#030407]/40 backdrop-blur-sm border-t border-white/[0.08] py-3 px-4 md:px-8 relative z-10 text-[11px] font-mono text-[#64748B]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#6366F1] animate-pulse" />
            <span className="text-[#94A3B8] font-medium">HackBridge Protocol Operational</span>
            <span>·</span>
            <span>v1.0.4 Production</span>
          </div>
          <div className="flex items-center gap-4 text-[#94A3B8]">
            <Link href="/terms" className="hover:text-[#F8FAFC] transition-colors">
              Terms
            </Link>
            <Link href="/privacy" className="hover:text-[#F8FAFC] transition-colors">
              Privacy
            </Link>
            <Link href="/api/v1/health" target="_blank" className="hover:text-[#F8FAFC] transition-colors">
              Health
            </Link>
            <span className="text-[#64748B]">© 2026 HackBridge</span>
          </div>
        </div>
      </footer>
    );
  }

  // Full marketing footer on public and non-dashboard pages
  return (
    <footer className="w-full bg-[#030407]/40 backdrop-blur-sm border-t border-white/[0.08] mt-24 pt-16 pb-12 px-4 md:px-8 relative z-10">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-5 gap-10 lg:gap-12">
        {/* Brand & Status Column */}
        <div className="md:col-span-2 space-y-4">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-6 h-6 rounded-lg bg-[#6366F1] text-white flex items-center justify-center font-bold text-xs tracking-tighter shadow-sm group-hover:scale-105 transition-transform">
              HB
            </div>
            <span className="font-display font-bold text-base tracking-tight text-[#F8FAFC]">
              HackBridge
            </span>
          </Link>
          <p className="text-xs text-[#94A3B8] max-w-sm leading-relaxed">
            The collegiate engineering infrastructure for high-stakes competitive hackathons. Permanent credentials, atomic problem statement reveals, and automated GitHub repository synchronization.
          </p>

          <div className="pt-2 flex items-center gap-2 text-xs font-mono text-[#94A3B8]">
            <span className="w-2 h-2 rounded-full bg-[#6366F1] animate-pulse" />
            <span className="font-medium text-[#F8FAFC]">Core Protocol Operational</span>
            <span className="text-[#64748B]">·</span>
            <span className="text-[#64748B]">v1.0.4 Production</span>
          </div>
        </div>

        {/* Competitor Links */}
        <div className="space-y-3">
          <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-[#F8FAFC]">
            Platform
          </h4>
          <ul className="space-y-2 text-xs text-[#94A3B8]">
            <li>
              <Link href="/hackathons" className="hover:text-[#6366F1] transition-colors">
                Active Arenas
              </Link>
            </li>
            <li>
              <Link href="/signup/student" className="hover:text-[#6366F1] transition-colors">
                Claim Hackathon ID
              </Link>
            </li>
            <li>
              <Link href="/docs" className="hover:text-[#6366F1] transition-colors">
                Allocation Algorithm
              </Link>
            </li>
            <li>
              <Link href="/developers" className="hover:text-[#6366F1] transition-colors">
                GitHub Repo Storage
              </Link>
            </li>
          </ul>
        </div>

        {/* Organizer & Judge Links */}
        <div className="space-y-3">
          <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-[#F8FAFC]">
            Organizers
          </h4>
          <ul className="space-y-2 text-xs text-[#94A3B8]">
            <li>
              <Link href="/register/college" className="hover:text-[#6366F1] transition-colors">
                Host Collegiate Track
              </Link>
            </li>
            <li>
              <Link href="/register/company" className="hover:text-[#6366F1] transition-colors">
                Host Corporate Track
              </Link>
            </li>
            <li>
              <Link href="/signup/judge" className="hover:text-[#6366F1] transition-colors">
                Judge Registration
              </Link>
            </li>
            <li>
              <Link href="/docs#scoring" className="hover:text-[#6366F1] transition-colors">
                Weighted Rubric Guide
              </Link>
            </li>
            <li>
              <Link href="/about" className="hover:text-[#6366F1] transition-colors">
                Campus Partners
              </Link>
            </li>
          </ul>
        </div>

        {/* Governance & Compliance */}
        <div className="space-y-3">
          <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-[#F8FAFC]">
            Governance
          </h4>
          <ul className="space-y-2 text-xs text-[#94A3B8]">
            <li>
              <Link href="/terms" className="hover:text-[#6366F1] transition-colors">
                Terms of Protocol
              </Link>
            </li>
            <li>
              <Link href="/privacy" className="hover:text-[#6366F1] transition-colors">
                Privacy Policy
              </Link>
            </li>
            <li>
              <Link href="/dashboard/student/profile" className="hover:text-[#6366F1] transition-colors">
                DPDP Data Export
              </Link>
            </li>
            <li>
              <Link href="/api/v1/health" target="_blank" className="hover:text-[#6366F1] transition-colors">
                System Health Check
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="max-w-7xl mx-auto mt-12 pt-6 border-t border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-[#64748B]">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[#6366F1]" />
          <span>Institutional Integrity Secured · Strict Anti-AI-Tells Design System</span>
        </div>
        <div className="flex items-center gap-4">
          <a
            href="https://github.com"
            target="_blank"
            rel="noreferrer"
            className="hover:text-[#F8FAFC] transition-colors"
          >
            <Github className="w-4 h-4" />
          </a>
          <a
            href="https://twitter.com"
            target="_blank"
            rel="noreferrer"
            className="hover:text-[#F8FAFC] transition-colors"
          >
            <Twitter className="w-4 h-4" />
          </a>
        </div>
      </div>
    </footer>
  );
}
