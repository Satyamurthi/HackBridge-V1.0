"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Github, Twitter, ShieldCheck, Mail, Phone, Globe } from "lucide-react";
import { DEFAULT_FOOTER_CONFIG, FooterConfig } from "@/lib/navigation-defaults";

export default function Footer() {
  const pathname = usePathname();
  const isDashboard = pathname.startsWith("/dashboard");
  const [footerConfig, setFooterConfig] = useState<FooterConfig>(DEFAULT_FOOTER_CONFIG);

  useEffect(() => {
    fetch("/api/v1/content/navigation")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.footer) {
          setFooterConfig(data.footer);
        }
      })
      .catch(() => {});
  }, [pathname]);

  // Slim minimal footer inside dashboards
  if (isDashboard) {
    return (
      <footer className="w-full bg-[#030407]/40 backdrop-blur-sm border-t border-white/[0.08] py-3 px-4 md:px-8 relative z-10 text-[11px] font-mono text-[#64748B]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#6366F1] animate-pulse" />
            <span className="text-[#94A3B8] font-medium">{footerConfig.statusText || "HackBridge Protocol Operational"}</span>
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
            {footerConfig.contactPhone && (
              <span className="text-[#64748B] flex items-center gap-1">
                <Phone className="w-3 h-3" /> {footerConfig.contactPhone}
              </span>
            )}
            <span className="text-[#64748B]">{footerConfig.copyrightText || "© 2026 HackBridge"}</span>
          </div>
        </div>
      </footer>
    );
  }

  // Full marketing footer on public and non-dashboard pages
  const columns = footerConfig.columns && footerConfig.columns.length > 0
    ? footerConfig.columns
    : DEFAULT_FOOTER_CONFIG.columns;

  const socialLinks = footerConfig.socialLinks && footerConfig.socialLinks.length > 0
    ? footerConfig.socialLinks
    : DEFAULT_FOOTER_CONFIG.socialLinks;

  return (
    <footer className="w-full bg-[#030407]/40 backdrop-blur-sm border-t border-white/[0.08] mt-24 pt-16 pb-12 px-4 md:px-8 relative z-10">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-5 gap-10 lg:gap-12">
        {/* Brand & Status Column */}
        <div className="md:col-span-2 space-y-4">
          <Link href="/" className="flex items-center gap-2.5 group">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/hackbridge-mark.png"
              alt={footerConfig.brandName || "HackBridge"}
              className="h-7 w-auto max-h-7 object-contain group-hover:scale-105 transition-transform drop-shadow-sm"
            />
            <span className="font-display font-bold text-base tracking-tight text-[#F8FAFC]">
              {footerConfig.brandName || "HackBridge"}
            </span>
          </Link>
          <p className="text-xs text-[#94A3B8] max-w-sm leading-relaxed">
            {footerConfig.brandDescription || DEFAULT_FOOTER_CONFIG.brandDescription}
          </p>

          <div className="pt-2 flex items-center gap-2 text-xs font-mono text-[#94A3B8]">
            <span className="w-2 h-2 rounded-full bg-[#6366F1] animate-pulse" />
            <span className="font-medium text-[#F8FAFC]">{footerConfig.statusText || DEFAULT_FOOTER_CONFIG.statusText}</span>
          </div>

          {(footerConfig.contactPhone || footerConfig.contactEmail) && (
            <div className="pt-2 text-[11px] font-mono text-[#94A3B8] space-y-1">
              {footerConfig.contactPhone && (
                <div className="flex items-center gap-1.5">
                  <Phone className="w-3 h-3 text-[#6366F1]" />
                  <span>Direct: {footerConfig.contactPhone}</span>
                </div>
              )}
              {footerConfig.contactEmail && (
                <div className="flex items-center gap-1.5">
                  <Mail className="w-3 h-3 text-[#6366F1]" />
                  <span>Support: {footerConfig.contactEmail}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Dynamic Nav Columns */}
        {columns.map((col, idx) => (
          <div key={col.title + idx} className="space-y-3">
            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-[#F8FAFC]">
              {col.title}
            </h4>
            <ul className="space-y-2 text-xs text-[#94A3B8]">
              {col.links.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="hover:text-[#6366F1] transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="max-w-7xl mx-auto mt-12 pt-6 border-t border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-[#64748B]">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[#6366F1]" />
          <span>{footerConfig.bottomNotice || DEFAULT_FOOTER_CONFIG.bottomNotice}</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[11px] text-[#64748B]">{footerConfig.copyrightText || DEFAULT_FOOTER_CONFIG.copyrightText}</span>
          {socialLinks.map((s, idx) => {
            const isGithub = s.platform.toLowerCase().includes("github");
            const isTwitter = s.platform.toLowerCase().includes("twitter") || s.platform.toLowerCase().includes("x");
            return (
              <a
                key={s.platform + idx}
                href={s.url}
                target="_blank"
                rel="noreferrer"
                className="hover:text-[#F8FAFC] transition-colors p-1"
                title={s.platform}
              >
                {isGithub ? <Github className="w-4 h-4" /> : isTwitter ? <Twitter className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
              </a>
            );
          })}
        </div>
      </div>
    </footer>
  );
}
