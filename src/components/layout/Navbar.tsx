"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  Terminal, 
  Copy, 
  Check, 
  LogOut, 
  LayoutDashboard, 
  Menu, 
  X,
  ChevronRight,
  Shield
} from "lucide-react";
import NotificationBell from "@/components/notifications/NotificationBell";

interface UserSession {
  userId: string;
  email: string;
  role: "STUDENT" | "HOST" | "JUDGE" | "SUPER_ADMIN";
  name: string;
  hackathonId?: string;
  status: string;
}

export default function Navbar() {
  const [session, setSession] = useState<UserSession | null>(null);
  const [copied, setCopied] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  // Blur on scroll
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 15);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    fetch("/api/v1/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user) {
          setSession(data.user);
        } else {
          setSession(null);
        }
      })
      .catch(() => setSession(null));
  }, [pathname]);

  const copyHackathonId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/v1/auth/logout", { method: "POST" });
      setSession(null);
      router.push("/");
      router.refresh();
    } catch (e) {
      console.error(e);
    }
  };

  const getDashboardHref = (role: string) => {
    switch (role) {
      case "SUPER_ADMIN":
        return "/dashboard/admin";
      case "HOST":
        return "/dashboard/host";
      case "JUDGE":
        return "/dashboard/judge";
      case "STUDENT":
      default:
        return "/dashboard/student";
    }
  };

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-all duration-200 border-b ${
        scrolled
          ? "bg-[#030407]/90 backdrop-blur-md border-white/[0.08] shadow-sm py-2.5"
          : "bg-[#030407] border-white/[0.06] py-3.5"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 md:px-8 flex items-center justify-between">
        {/* Brand Monogram */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-7 h-7 rounded bg-white text-black flex items-center justify-center font-bold text-xs tracking-tighter">
            HB
          </div>
          <span className="font-display font-bold text-base tracking-tight text-white flex items-center gap-1.5">
            HackBridge
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-white/5 border border-white/10 text-slate-400 font-normal">
              v1.0
            </span>
          </span>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-7 text-xs font-medium text-slate-400">
          <Link
            href="/hackathons"
            className={`transition-colors hover:text-white ${
              pathname.startsWith("/hackathons") ? "text-white font-semibold" : ""
            }`}
          >
            Arenas
          </Link>
          <Link
            href="/docs"
            className={`transition-colors hover:text-white ${
              pathname.startsWith("/docs") ? "text-white font-semibold" : ""
            }`}
          >
            Protocol Specs
          </Link>
          <Link
            href="/developers"
            className={`transition-colors hover:text-white ${
              pathname.startsWith("/developers") ? "text-white font-semibold" : ""
            }`}
          >
            API & GitHub Sync
          </Link>
          <Link
            href="/about"
            className={`transition-colors hover:text-white ${
              pathname.startsWith("/about") ? "text-white font-semibold" : ""
            }`}
          >
            About
          </Link>
        </nav>

        {/* Right Action / Auth Area */}
        <div className="hidden md:flex items-center gap-3">
          {session ? (
            <div className="flex items-center gap-2.5">
              {/* Student Permanent Hackathon ID Pill */}
              {session.hackathonId && (
                <div
                  onClick={() => copyHackathonId(session.hackathonId!)}
                  className="flex items-center gap-2 px-2.5 py-1 rounded bg-white/[0.04] border border-white/10 cursor-pointer hover:border-white/20 transition-colors"
                  title="Click to copy your permanent Hackathon ID"
                >
                  <span className="text-[10px] font-mono text-slate-500 uppercase">ID</span>
                  <span className="text-xs font-mono font-bold text-white">{session.hackathonId}</span>
                  {copied ? (
                    <Check className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <Copy className="w-3 h-3 text-slate-500 hover:text-slate-300" />
                  )}
                </div>
              )}

              {/* Role Indicator Tag */}
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-white/[0.04] border border-white/10 text-slate-400">
                {session.role}
              </span>

              {/* In-App Notifications Tray */}
              <NotificationBell />

              {/* Dashboard Link */}
              <Link
                href={getDashboardHref(session.role)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded bg-[#6366F1] hover:bg-[#4F46E5] text-white transition-colors"
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                Console
              </Link>

              {/* Sign Out */}
              <button
                onClick={handleLogout}
                className="p-1.5 rounded hover:bg-white/5 text-slate-400 hover:text-white transition-colors"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2.5">
              <Link
                href="/login"
                className="px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/signup/student"
                className="px-3.5 py-1.5 text-xs font-semibold rounded bg-white text-black hover:bg-slate-200 transition-colors flex items-center gap-1"
              >
                Register
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Hamburger */}
        <div className="md:hidden flex items-center gap-2">
          {session?.hackathonId && (
            <div
              onClick={() => copyHackathonId(session.hackathonId!)}
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-white/[0.04] border border-white/10 text-[10px] font-mono text-slate-300"
            >
              <span>{session.hackathonId}</span>
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            </div>
          )}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 text-slate-400 hover:text-white"
            aria-label="Toggle Navigation"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-white/10 bg-[#030407] px-4 py-4 space-y-3">
          <Link
            href="/hackathons"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-xs font-medium text-slate-300 hover:text-white py-1"
          >
            Arenas
          </Link>
          <Link
            href="/docs"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-xs font-medium text-slate-300 hover:text-white py-1"
          >
            Protocol Specs
          </Link>
          <Link
            href="/developers"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-xs font-medium text-slate-300 hover:text-white py-1"
          >
            API & GitHub Sync
          </Link>
          <Link
            href="/about"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-xs font-medium text-slate-300 hover:text-white py-1"
          >
            About
          </Link>
          <div className="pt-3 border-t border-white/10 flex flex-col gap-2">
            {session ? (
              <>
                <Link
                  href={getDashboardHref(session.role)}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 text-xs font-semibold text-white py-1.5"
                >
                  <LayoutDashboard className="w-3.5 h-3.5 text-[#6366F1]" />
                  Open {session.role} Console
                </Link>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleLogout();
                  }}
                  className="text-xs text-slate-400 hover:text-white text-left py-1"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-2 pt-1">
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-center py-2 text-xs font-medium rounded border border-white/10 text-white"
                >
                  Sign In
                </Link>
                <Link
                  href="/signup/student"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-center py-2 text-xs font-semibold rounded bg-white text-black"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
