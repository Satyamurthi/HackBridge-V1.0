"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  Copy, 
  Check, 
  LogOut, 
  Menu, 
  X,
  ChevronRight,
  Sun,
  Moon
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

interface NavLinkItem {
  label: string;
  href: string;
}

const PUBLIC_NAV: NavLinkItem[] = [
  { label: "Arenas", href: "/hackathons" },
  { label: "Host a Hackathon", href: "/register/college" },
  { label: "Protocol Specs", href: "/docs" },
  { label: "API & GitHub Sync", href: "/developers" },
  { label: "About", href: "/about" },
];

const STUDENT_NAV: NavLinkItem[] = [
  { label: "Dashboard", href: "/dashboard/student" },
  { label: "My Teams", href: "/dashboard/student/teams" },
  { label: "My Hackathons", href: "/dashboard/student/hackathons" },
  { label: "Payments", href: "/dashboard/student/payments" },
  { label: "Notifications", href: "/dashboard/student/notifications" },
  { label: "Profile", href: "/dashboard/student/profile" },
];

const HOST_NAV: NavLinkItem[] = [
  { label: "Dashboard", href: "/dashboard/host" },
  { label: "Hackathons", href: "/dashboard/host?tab=hackathons" },
  { label: "Create Track", href: "/dashboard/host/create" },
  { label: "Payments", href: "/dashboard/host/payments" },
  { label: "Judges", href: "/dashboard/host?tab=judges" },
  { label: "Live Arena", href: "/dashboard/host/arena" },
  { label: "Profile", href: "/dashboard/host?tab=profile" },
];

const JUDGE_NAV: NavLinkItem[] = [
  { label: "Dashboard", href: "/dashboard/judge" },
  { label: "Review Queue", href: "/dashboard/judge?tab=queue" },
  { label: "Rubric", href: "/dashboard/judge?tab=rubric" },
  { label: "Profile", href: "/dashboard/judge?tab=profile" },
];

const ADMIN_NAV: NavLinkItem[] = [
  { label: "Dashboard", href: "/dashboard/admin" },
  { label: "Host Approvals", href: "/dashboard/admin?tab=hosts" },
  { label: "Audit Stream", href: "/dashboard/admin?tab=audit" },
  { label: "Site CMS", href: "/dashboard/admin?tab=cms" },
  { label: "Platform Rules", href: "/dashboard/admin?tab=settings" },
  { label: "Profile", href: "/dashboard/admin?tab=profile" },
];

export default function Navbar() {
  const [session, setSession] = useState<UserSession | null>(null);
  const [copied, setCopied] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [registerMenuOpen, setRegisterMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isLightMode, setIsLightMode] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  // Scroll blur & background
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 15);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Sync theme toggle state (defaulting to dark)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("hb_theme");
      setIsLightMode(stored === "light");
    }
  }, []);

  const toggleTheme = () => {
    if (typeof window === "undefined") return;
    if (isLightMode) {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
      localStorage.setItem("hb_theme", "dark");
      setIsLightMode(false);
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
      localStorage.setItem("hb_theme", "light");
      setIsLightMode(true);
    }
  };

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

  const getRoleNavItems = (): NavLinkItem[] => {
    if (!session) return PUBLIC_NAV;
    switch (session.role) {
      case "STUDENT":
        return STUDENT_NAV;
      case "HOST":
        return HOST_NAV;
      case "JUDGE":
        return JUDGE_NAV;
      case "SUPER_ADMIN":
        return ADMIN_NAV;
      default:
        return PUBLIC_NAV;
    }
  };

  const activeNavItems = getRoleNavItems();

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
          ? "bg-[#030407]/85 backdrop-blur-md border-white/[0.08] shadow-lg py-2.5"
          : "bg-[#030407]/65 backdrop-blur-sm border-white/[0.06] py-3.5"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 md:px-8 flex items-center justify-between gap-4">
        {/* Brand Monogram */}
        <Link 
          href={session ? getDashboardHref(session.role) : "/"} 
          className="flex items-center gap-2.5 group shrink-0"
        >
          <div className="w-7 h-7 rounded-lg bg-[#6366F1] text-white flex items-center justify-center font-bold text-xs tracking-tighter shadow-sm group-hover:scale-105 transition-transform">
            HB
          </div>
          <span className="font-display font-bold text-base tracking-tight text-[#F8FAFC] flex items-center gap-1.5">
            HackBridge
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#6366F1]/15 border border-[#6366F1]/30 text-[#818CF8] font-semibold">
              v1.0
            </span>
          </span>
        </Link>

        {/* Center Navigation Bar */}
        {/* If logged in: Role-based App Bar (Dashboard, Teams, Hackathons, Payments, etc.) */}
        {/* If logged out: Public Links (Arenas, Protocol Specs, API & GitHub Sync, About) */}
        <nav className="hidden md:flex items-center gap-5 lg:gap-6 text-xs font-medium text-[#94A3B8] overflow-x-auto py-1">
          {activeNavItems.map((item) => {
            const isActive = pathname === item.href.split("?")[0];
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`transition-colors whitespace-nowrap hover:text-[#818CF8] ${
                  isActive ? "text-[#818CF8] font-bold" : ""
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Right Action / Auth Area */}
        <div className="hidden md:flex items-center gap-2.5 shrink-0">
          {/* Optional Light Mode Toggle */}
          <button
            onClick={toggleTheme}
            className="p-1.5 rounded-lg border border-white/[0.08] hover:border-white/20 text-[#94A3B8] hover:text-[#F8FAFC] transition-colors"
            title={isLightMode ? "Switch to Dark Mode" : "Switch to Light Mode"}
            aria-label="Toggle theme"
          >
            {isLightMode ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
          </button>

          {session ? (
            <div className="flex items-center gap-2.5">
              {/* Permanent Hackathon ID Chip (for students or any role with an ID) */}
              {session.hackathonId && (
                <div
                  onClick={() => copyHackathonId(session.hackathonId!)}
                  className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.08] cursor-pointer hover:border-[#6366F1]/50 transition-colors shadow-sm"
                  title="Click to copy your permanent Hackathon ID"
                >
                  <span className="text-[10px] font-mono text-[#64748B] uppercase">ID</span>
                  <span className="text-xs font-mono font-bold text-[#F8FAFC]">{session.hackathonId}</span>
                  {copied ? (
                    <Check className="w-3 h-3 text-[#6366F1]" />
                  ) : (
                    <Copy className="w-3 h-3 text-[#64748B] hover:text-[#F8FAFC]" />
                  )}
                </div>
              )}

              {/* Role Indicator Tag */}
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-[#6366F1]/15 border border-[#6366F1]/30 text-[#818CF8] font-semibold">
                {session.role}
              </span>

              {/* In-App Notifications Tray */}
              <NotificationBell />

              {/* Sign Out */}
              <button
                onClick={handleLogout}
                className="p-1.5 rounded-lg border border-white/[0.08] hover:border-white/20 hover:bg-white/[0.06] text-[#94A3B8] hover:text-red-400 transition-colors ml-1"
                title="Sign out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2.5 relative">
              <Link
                href="/login"
                className="px-3.5 py-1.5 text-xs font-medium text-[#94A3B8] hover:text-[#F8FAFC] transition-colors"
              >
                Sign In
              </Link>

              {/* Interactive Register Dropdown Menu */}
              <div className="relative">
                <button
                  onClick={() => setRegisterMenuOpen(!registerMenuOpen)}
                  onBlur={() => setTimeout(() => setRegisterMenuOpen(false), 200)}
                  className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-[#6366F1] text-white hover:bg-[#4F46E5] transition-all flex items-center gap-1 shadow-sm"
                >
                  Register
                  <ChevronRight className={`w-3.5 h-3.5 transition-transform ${registerMenuOpen ? "rotate-90" : ""}`} />
                </button>

                {registerMenuOpen && (
                  <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-[#0B0E18]/95 backdrop-blur-xl border border-white/10 shadow-2xl p-2 z-50 animate-fade-in text-left">
                    <div className="px-3 py-1.5 text-[10px] font-mono text-[#64748B] uppercase tracking-wider">
                      Select Registration Track
                    </div>

                    <Link
                      href="/signup/student"
                      className="flex flex-col gap-0.5 p-2.5 rounded-xl hover:bg-white/[0.06] transition-colors group"
                      onClick={() => setRegisterMenuOpen(false)}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#F8FAFC] group-hover:text-[#818CF8]">Student</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-300">Builder</span>
                      </div>
                      <span className="text-[11px] text-[#94A3B8]">Participate, form squads & code</span>
                    </Link>

                    <Link
                      href="/register/college"
                      className="flex flex-col gap-0.5 p-2.5 rounded-xl hover:bg-white/[0.06] transition-colors group"
                      onClick={() => setRegisterMenuOpen(false)}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#F8FAFC] group-hover:text-[#818CF8]">College / University</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-blue-500/10 text-blue-300">Host</span>
                      </div>
                      <span className="text-[11px] text-[#94A3B8]">Host collegiate arena & manage tracks</span>
                    </Link>

                    <Link
                      href="/register/company"
                      className="flex flex-col gap-0.5 p-2.5 rounded-xl hover:bg-white/[0.06] transition-colors group"
                      onClick={() => setRegisterMenuOpen(false)}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#F8FAFC] group-hover:text-[#818CF8]">Company / Sponsor</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-300">Host</span>
                      </div>
                      <span className="text-[11px] text-[#94A3B8]">Sponsor tracks & recruit engineers</span>
                    </Link>

                    <Link
                      href="/signup/judge"
                      className="flex flex-col gap-0.5 p-2.5 rounded-xl hover:bg-white/[0.06] transition-colors group"
                      onClick={() => setRegisterMenuOpen(false)}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#F8FAFC] group-hover:text-[#818CF8]">Judge / Mentor</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-purple-500/10 text-purple-300">Evaluator</span>
                      </div>
                      <span className="text-[11px] text-[#94A3B8]">Score submissions against rubric</span>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Mobile Hamburger Controls */}
        <div className="md:hidden flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="p-1.5 rounded-lg border border-white/[0.08] text-[#94A3B8]"
            aria-label="Toggle theme"
          >
            {isLightMode ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </button>
          {session?.hackathonId && (
            <div
              onClick={() => copyHackathonId(session.hackathonId!)}
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.08] text-[10px] font-mono text-[#F8FAFC]"
            >
              <span>{session.hackathonId}</span>
              {copied ? <Check className="w-3 h-3 text-[#6366F1]" /> : <Copy className="w-3 h-3" />}
            </div>
          )}
          {session && <NotificationBell />}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 text-[#F8FAFC] hover:text-[#6366F1]"
            aria-label="Toggle Navigation"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-white/[0.08] bg-[#030407]/95 backdrop-blur-md px-4 py-4 space-y-3">
          <div className="space-y-1">
            {activeNavItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className="block text-xs font-medium text-[#F8FAFC] hover:text-[#818CF8] py-1.5"
              >
                {item.label}
              </Link>
            ))}
          </div>

          {session ? (
            <div className="pt-3 border-t border-white/[0.08] flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-[#6366F1]/15 text-[#818CF8]">
                {session.role}
              </span>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleLogout();
                }}
                className="flex items-center gap-1.5 text-xs font-medium text-red-400 hover:text-red-300"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign Out
              </button>
            </div>
          ) : (
            <div className="pt-3 border-t border-white/[0.08] space-y-2">
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="block w-full text-center py-2 text-xs font-medium text-[#F8FAFC] bg-white/[0.05] rounded-lg"
              >
                Sign In
              </Link>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <Link
                  href="/signup/student"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-center py-2 text-[11px] font-bold text-white bg-[#6366F1] rounded-lg"
                >
                  Student
                </Link>
                <Link
                  href="/register/college"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-center py-2 text-[11px] font-bold text-white bg-white/[0.08] hover:bg-white/[0.12] rounded-lg"
                >
                  College
                </Link>
                <Link
                  href="/register/company"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-center py-2 text-[11px] font-bold text-white bg-white/[0.08] hover:bg-white/[0.12] rounded-lg"
                >
                  Company
                </Link>
                <Link
                  href="/signup/judge"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-center py-2 text-[11px] font-bold text-white bg-white/[0.08] hover:bg-white/[0.12] rounded-lg"
                >
                  Judge
                </Link>
              </div>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
