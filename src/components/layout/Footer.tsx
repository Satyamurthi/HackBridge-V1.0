import React from "react";
import Link from "next/link";
import { Github, Twitter, ShieldCheck } from "lucide-react";

export default function Footer() {
  return (
    <footer className="w-full bg-[#030407] border-t border-white/[0.08] mt-24 pt-16 pb-12 px-4 md:px-8">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-5 gap-10 lg:gap-12">
        {/* Brand & Status Column */}
        <div className="md:col-span-2 space-y-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-white text-black flex items-center justify-center font-bold text-xs tracking-tighter">
              HB
            </div>
            <span className="font-display font-bold text-base tracking-tight text-white">
              HackBridge
            </span>
          </Link>
          <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
            The collegiate engineering infrastructure for high-stakes competitive hackathons. Permanent credentials, atomic problem statement reveals, and automated GitHub repository synchronization.
          </p>

          <div className="pt-2 flex items-center gap-2 text-xs font-mono text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Core Protocol Operational</span>
            <span className="text-slate-600">·</span>
            <span className="text-slate-500">v1.0.4 Production</span>
          </div>
        </div>

        {/* Competitor Links */}
        <div className="space-y-3">
          <h4 className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-300">
            Platform
          </h4>
          <ul className="space-y-2 text-xs text-slate-400">
            <li>
              <Link href="/hackathons" className="hover:text-white transition-colors">
                Active Arenas
              </Link>
            </li>
            <li>
              <Link href="/signup/student" className="hover:text-white transition-colors">
                Claim Hackathon ID
              </Link>
            </li>
            <li>
              <Link href="/docs" className="hover:text-white transition-colors">
                Allocation Algorithm
              </Link>
            </li>
            <li>
              <Link href="/developers" className="hover:text-white transition-colors">
                GitHub Repo Storage
              </Link>
            </li>
          </ul>
        </div>

        {/* Organizer & Judge Links */}
        <div className="space-y-3">
          <h4 className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-300">
            Organizers
          </h4>
          <ul className="space-y-2 text-xs text-slate-400">
            <li>
              <Link href="/signup/host" className="hover:text-white transition-colors">
                Host Collegiate Track
              </Link>
            </li>
            <li>
              <Link href="/signup/judge" className="hover:text-white transition-colors">
                Judge Registration
              </Link>
            </li>
            <li>
              <Link href="/docs#scoring" className="hover:text-white transition-colors">
                Weighted Rubric Guide
              </Link>
            </li>
            <li>
              <Link href="/about" className="hover:text-white transition-colors">
                Campus Partners
              </Link>
            </li>
          </ul>
        </div>

        {/* Governance & Compliance */}
        <div className="space-y-3">
          <h4 className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-300">
            Governance
          </h4>
          <ul className="space-y-2 text-xs text-slate-400">
            <li>
              <Link href="/terms" className="hover:text-white transition-colors">
                Terms of Protocol
              </Link>
            </li>
            <li>
              <Link href="/privacy" className="hover:text-white transition-colors">
                Privacy (DPDP Act)
              </Link>
            </li>
            <li>
              <Link href="/refunds" className="hover:text-white transition-colors">
                Refund Guidelines
              </Link>
            </li>
            <li>
              <Link href="/host-agreement" className="hover:text-white transition-colors">
                Host Operating Agreement
              </Link>
            </li>
          </ul>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="max-w-7xl mx-auto mt-14 pt-6 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 font-mono gap-3">
        <p>© 2026 HackBridge Protocol. All competitive rights reserved.</p>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            Audited & Encrypted at Rest
          </span>
        </div>
      </div>
    </footer>
  );
}
