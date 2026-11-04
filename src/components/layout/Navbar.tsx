"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
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

import { 
  DEFAULT_NAVBAR_CONFIG, 
  NavbarConfig, 
  NavLinkItem 
} from "@/lib/navigation-defaults";

export default function Navbar() {
  const [session, setSession] = useState<UserSession | null>(null);
  const [navConfig, setNavConfig] = useState<NavbarConfig>(DEFAULT_NAVBAR_CONFIG);
  const [copied, setCopied] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [registerMenuOpen, setRegisterMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isLightMode, setIsLightMode] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  // Load custom navigation config
  useEffect(() => {
    fetch("/api/v1/content/navigation")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.navbar) {
          setNavConfig(data.navbar);
        }
      })
      .catch(() => {});
  }, [pathname]);

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
      const isLight = stored === "light";
      setIsLightMode(isLight);
      if (isLight) {
        document.documentElement.classList.remove("dark");
        document.documentElement.classList.add("light");
        document.documentElement.style.colorScheme = "light";
      } else {
        document.documentElement.classList.add("dark");
        document.documentElement.classList.remove("light");
        document.documentElement.style.colorScheme = "dark";
      }
    }
  }, []);

  const toggleTheme = () => {
    if (typeof window === "undefined") return;
    const nextMode = !isLightMode;
    setIsLightMode(nextMode);
    if (nextMode) {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
      document.documentElement.style.colorScheme = "light";
      localStorage.setItem("hb_theme", "light");
    } else {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
      document.documentElement.style.colorScheme = "dark";
      localStorage.setItem("hb_theme", "dark");
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
    if (!session) {
      const links = [...(navConfig.publicNavLinks || DEFAULT_NAVBAR_CONFIG.publicNavLinks)];
      if (!links.some((l) => l.href === "/" || l.label.toLowerCase() === "home")) {
        links.unshift({ label: "Home", href: "/" });
      }
      if (!links.some((l) => l.href === "/about" || l.label.toLowerCase() === "about")) {
        links.push({ label: "About", href: "/about" });
      }
      return links;
    }
    switch (session.role) {
      case "STUDENT":
        return navConfig.studentNavLinks || DEFAULT_NAVBAR_CONFIG.studentNavLinks;
      case "HOST":
        return navConfig.hostNavLinks || DEFAULT_NAVBAR_CONFIG.hostNavLinks;
      case "JUDGE":
        return navConfig.judgeNavLinks || DEFAULT_NAVBAR_CONFIG.judgeNavLinks;
      case "SUPER_ADMIN":
        return navConfig.adminNavLinks || DEFAULT_NAVBAR_CONFIG.adminNavLinks;
      default:
        return navConfig.publicNavLinks || DEFAULT_NAVBAR_CONFIG.publicNavLinks;
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
    <>
      {/* Optional Top Announcement Bar (hidden on admin governance dashboard per requirement) */}
      {navConfig.announcement?.enabled && navConfig.announcement?.text && !pathname.startsWith("/dashboard/admin") && (
        <aside 
          aria-label="Platform Announcement"
          className="w-full bg-[#6366F1] text-white text-[11px] font-mono py-1.5 px-4 text-center tracking-wide flex items-center justify-center gap-2 z-50 relative"
        >
          <span>{navConfig.announcement.text}</span>
          {navConfig.announcement.link && (
            <Link href={navConfig.announcement.link} className="underline font-bold hover:text-white/80 ml-1">
              Explore →
            </Link>
          )}
        </aside>
      )}

      <header
        className={`sticky top-0 z-50 w-full transition-all duration-200 border-b ${
          scrolled
            ? "bg-[#030407]/85 backdrop-blur-md border-white/[0.08] shadow-lg py-2.5"
            : "bg-[#030407]/65 backdrop-blur-sm border-white/[0.06] py-3.5"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 md:px-8 flex items-center justify-between gap-4">
          {/* Brand Logo */}
          <Link 
            href={session ? getDashboardHref(session.role) : "/"} 
            className="flex items-center gap-2.5 group shrink-0"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={navConfig.brandLogoUrl || "/brand/hackbridge-mark.png"}
              alt={navConfig.brandName || "HackBridge"}
              className="h-8 w-auto max-h-8 object-contain transition-transform group-hover:scale-105 drop-shadow-sm"
            />
            <span className="font-display font-bold text-base tracking-tight text-[#F8FAFC] flex items-center gap-1.5">
              {navConfig.brandName || "HackBridge"}
              {navConfig.versionTag && (
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#6366F1]/15 border border-[#6366F1]/30 text-[#818CF8] font-semibold">
                  {navConfig.versionTag}
                </span>
              )}
            </span>
          </Link>

        {/* Center Navigation Bar */}
        {/* If logged in: Role-based App Bar (Dashboard, Teams, Hackathons, Payments, etc.) */}
        {/* If logged out: Public Links (Arenas, Protocol Specs, API & GitHub Sync, About) */}
        <Suspense
          fallback={
            <nav className="hidden md:flex items-center gap-5 lg:gap-6 text-xs font-medium text-[#94A3B8] overflow-x-auto py-1">
              {activeNavItems.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className="transition-colors whitespace-nowrap hover:text-[#818CF8]"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          }
        >
          <NavLinksBar items={activeNavItems} pathname={pathname} />
        </Suspense>

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

              {/* Interactive Register Button & Track Options */}
              <div className="relative flex items-center">
                <Link
                  href="/signup/student"
                  className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-[#6366F1] text-white hover:bg-[#4F46E5] transition-all flex items-center gap-1 shadow-sm"
                >
                  Register
                </Link>
                <button
                  type="button"
                  aria-label="More registration options"
                  onClick={(e) => {
                    e.stopPropagation();
                    setRegisterMenuOpen(!registerMenuOpen);
                  }}
                  className="p-1 text-white/80 hover:text-white transition-colors ml-0.5"
                >
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
          <Suspense
            fallback={
              <div className="space-y-1">
                {activeNavItems.map((item) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="block text-xs font-medium text-[#F8FAFC] py-1.5"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            }
          >
            <MobileNavLinksBar
              items={activeNavItems}
              pathname={pathname}
              onNavigate={() => setMobileMenuOpen(false)}
            />
          </Suspense>

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
    </>
  );
}

function NavLinksBar({
  items,
  pathname,
}: {
  items: NavLinkItem[];
  pathname: string;
}) {
  const searchParams = useSearchParams();
  const currentTab = searchParams.get("tab");

  const getDefaultTab = (path: string) => {
    if (path.startsWith("/dashboard/admin")) return "users";
    return null;
  };

  const defaultTab = getDefaultTab(pathname);

  return (
    <nav className="hidden md:flex items-center gap-5 lg:gap-6 text-xs font-medium text-[#94A3B8] overflow-x-auto py-1">
      {items.map((item) => {
        const [itemPath, itemQuery] = item.href.split("?");
        const itemTab = itemQuery ? new URLSearchParams(itemQuery).get("tab") : null;
        let isActive = false;
        if (itemTab) {
          isActive = pathname === itemPath && (currentTab || defaultTab) === itemTab;
        } else {
          isActive = pathname === itemPath && !currentTab;
        }

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
  );
}

function MobileNavLinksBar({
  items,
  pathname,
  onNavigate,
}: {
  items: NavLinkItem[];
  pathname: string;
  onNavigate: () => void;
}) {
  const searchParams = useSearchParams();
  const currentTab = searchParams.get("tab");

  const getDefaultTab = (path: string) => {
    if (path.startsWith("/dashboard/admin")) return "users";
    return null;
  };

  const defaultTab = getDefaultTab(pathname);

  return (
    <div className="space-y-1">
      {items.map((item) => {
        const [itemPath, itemQuery] = item.href.split("?");
        const itemTab = itemQuery ? new URLSearchParams(itemQuery).get("tab") : null;
        let isActive = false;
        if (itemTab) {
          isActive = pathname === itemPath && (currentTab || defaultTab) === itemTab;
        } else {
          isActive = pathname === itemPath && !currentTab;
        }

        return (
          <Link
            key={item.label}
            href={item.href}
            onClick={onNavigate}
            className={`block text-xs font-medium py-1.5 transition-colors ${
              isActive ? "text-[#818CF8] font-bold" : "text-[#F8FAFC] hover:text-[#818CF8]"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
