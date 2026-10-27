"use client";

import React from "react";
import Link from "next/link";
import { Terminal, Building, Briefcase, Award, ArrowRight } from "lucide-react";

export default function RegisterHubPage() {
  const options = [
    {
      title: "Student Builder",
      role: "STUDENT",
      desc: "Claim your permanent Hackathon ID (HB-XXXXXX), form squads, compete in arenas, and auto-sync GitHub commits.",
      href: "/signup/student",
      icon: Terminal,
      badge: "Builders & Teams",
      primary: true,
    },
    {
      title: "College / University",
      role: "COLLEGE",
      desc: "Host inter-collegiate hackathons, automate student admissions, manage QR fee proofs, and run live event days.",
      href: "/register/college",
      icon: Building,
      badge: "University Chapter",
      primary: false,
    },
    {
      title: "Company / Sponsor",
      role: "COMPANY",
      desc: "Sponsor competitive challenge tracks, recruit verified university talent, and evaluate production solutions.",
      href: "/register/company",
      icon: Briefcase,
      badge: "Enterprise & Sponsor",
      primary: false,
    },
    {
      title: "Judge / Mentor",
      role: "JUDGE",
      desc: "Review teams against weighted rubric criteria, run live code inspections, and submit immutable scores.",
      href: "/signup/judge",
      icon: Award,
      badge: "Industry Evaluator",
      primary: false,
    },
  ];

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 bg-transparent text-[#F8FAFC]">
      <div className="max-w-4xl w-full space-y-8 animate-fade-in text-center">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-xs font-mono text-[#F8FAFC]">
            <span className="w-2 h-2 rounded-full bg-[#6366F1] animate-pulse" />
            <span className="font-bold text-[#818CF8]">ONBOARDING PROTOCOL</span>
          </div>
          <h1 className="font-display text-3xl sm:text-5xl font-extrabold tracking-tight">
            Choose Your Platform Role
          </h1>
          <p className="text-sm text-[#94A3B8] max-w-xl mx-auto leading-relaxed font-mono">
            Deterministic credentials and access controls enforced across all hackathon arenas.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-left">
          {options.map((opt) => {
            const Icon = opt.icon;
            return (
              <Link
                key={opt.role}
                href={opt.href}
                className={`p-6 sm:p-7 rounded-3xl bg-[#0B0E18]/65 backdrop-blur-md border transition-all flex flex-col justify-between group hover:border-[#6366F1]/50 hover:bg-[#0B0E18]/80 ${
                  opt.primary ? "border-[#6366F1]/40" : "border-white/[0.08]"
                }`}
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-[#6366F1] group-hover:scale-105 transition-transform">
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-white/[0.03] border border-white/10 text-[10px] font-mono text-[#818CF8] font-bold">
                      {opt.badge}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <h2 className="text-lg font-bold text-[#F8FAFC] group-hover:text-white transition-colors">
                      {opt.title}
                    </h2>
                    <p className="text-xs text-[#94A3B8] leading-relaxed">
                      {opt.desc}
                    </p>
                  </div>
                </div>

                <div className="pt-6 mt-6 border-t border-white/[0.06] flex items-center justify-between text-xs font-bold text-[#818CF8] group-hover:text-white transition-colors">
                  <span>Register as {opt.role}</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform text-[#6366F1]" />
                </div>
              </Link>
            );
          })}
        </div>

        <div className="text-xs font-mono text-[#64748B]">
          Already have an account?{" "}
          <Link href="/login" className="text-[#818CF8] hover:underline font-bold">
            Sign In here
          </Link>
        </div>
      </div>
    </div>
  );
}
