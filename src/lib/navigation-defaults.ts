export interface NavLinkItem {
  label: string;
  href: string;
}

export interface NavbarConfig {
  brandName: string;
  brandLogoUrl: string;
  versionTag: string;
  announcement: {
    enabled: boolean;
    text: string;
    link?: string;
  };
  publicNavLinks: NavLinkItem[];
  studentNavLinks: NavLinkItem[];
  hostNavLinks: NavLinkItem[];
  judgeNavLinks: NavLinkItem[];
  adminNavLinks: NavLinkItem[];
}

export interface FooterColumn {
  title: string;
  links: NavLinkItem[];
}

export interface FooterSocialLink {
  platform: string;
  url: string;
}

export interface FooterConfig {
  brandName: string;
  brandDescription: string;
  statusText: string;
  columns: FooterColumn[];
  bottomNotice: string;
  copyrightText: string;
  socialLinks: FooterSocialLink[];
  contactPhone: string;
  contactEmail: string;
}

export interface SiteNavigationConfig {
  navbar: NavbarConfig;
  footer: FooterConfig;
}

export const DEFAULT_NAVBAR_CONFIG: NavbarConfig = {
  brandName: "HackBridge",
  brandLogoUrl: "/brand/hackbridge-mark.png",
  versionTag: "",
  announcement: {
    enabled: false,
    text: "Welcome to HackBridge: The collegiate engineering arena infrastructure.",
    link: "/hackathons",
  },
  publicNavLinks: [
    { label: "Home", href: "/" },
    { label: "Arenas", href: "/hackathons" },
    { label: "Host a Hackathon", href: "/register/college" },
    { label: "Protocol Specs", href: "/docs" },
    { label: "About", href: "/about" },
  ],
  studentNavLinks: [
    { label: "Dashboard", href: "/dashboard/student" },
    { label: "My Teams", href: "/dashboard/student/teams" },
    { label: "My Hackathons", href: "/dashboard/student/hackathons" },
    { label: "Payments", href: "/dashboard/student/payments" },
    { label: "Notifications", href: "/dashboard/student/notifications" },
    { label: "Profile", href: "/dashboard/student/profile" },
  ],
  hostNavLinks: [
    { label: "Dashboard", href: "/dashboard/host" },
    { label: "My Hackathons", href: "/dashboard/host" },
    { label: "Notifications", href: "/dashboard/host?tab=notifications" },
    { label: "Profile", href: "/dashboard/host?tab=profile" },
  ],
  judgeNavLinks: [
    { label: "Dashboard", href: "/dashboard/judge" },
    { label: "Assigned Hackathons", href: "/dashboard/judge?tab=assigned" },
    { label: "Scoring", href: "/dashboard/judge?tab=scoring" },
    { label: "Profile", href: "/dashboard/judge?tab=profile" },
  ],
  adminNavLinks: [
    { label: "Users", href: "/dashboard/admin?tab=users" },
    { label: "Hackathons", href: "/dashboard/admin?tab=hackathons" },
    { label: "Approvals", href: "/dashboard/admin?tab=approvals" },
    { label: "Judges", href: "/dashboard/admin?tab=judges" },
    { label: "Payments", href: "/dashboard/admin?tab=payments" },
    { label: "Site CMS", href: "/dashboard/admin?tab=content" },
    { label: "Settings", href: "/dashboard/admin?tab=settings" },
  ],
};

export const DEFAULT_FOOTER_CONFIG: FooterConfig = {
  brandName: "HackBridge",
  brandDescription:
    "The collegiate engineering infrastructure for high-stakes competitive hackathons. Permanent credentials, atomic problem statement reveals, and automated GitHub repository synchronization.",
  statusText: "Core Protocol Operational",
  columns: [
    {
      title: "Platform",
      links: [
        { label: "Active Arenas", href: "/hackathons" },
        { label: "Claim Hackathon ID", href: "/signup/student" },
        { label: "Allocation Algorithm", href: "/docs" },
      ],
    },
    {
      title: "Organizers",
      links: [
        { label: "Host Collegiate Track", href: "/register/college" },
        { label: "Host Corporate Track", href: "/register/company" },
        { label: "Judge Registration", href: "/signup/judge" },
        { label: "Weighted Rubric Guide", href: "/docs#scoring" },
        { label: "Campus Partners", href: "/about" },
      ],
    },
    {
      title: "Governance",
      links: [
        { label: "Terms of Protocol", href: "/terms" },
        { label: "Privacy Policy", href: "/privacy" },
        { label: "DPDP Data Export", href: "/dashboard/student/profile" },
        { label: "System Health Check", href: "/api/v1/health" },
      ],
    },
  ],
  bottomNotice: "Institutional Integrity Secured · Strict Anti-AI-Tells Design System",
  copyrightText: "© 2026 HackBridge. All rights reserved.",
  socialLinks: [
    { platform: "github", url: "https://github.com" },
    { platform: "twitter", url: "https://twitter.com" },
  ],
  contactPhone: "9380968402",
  contactEmail: "admin@hackbridge.tech",
};

export const DEFAULT_SITE_NAVIGATION: SiteNavigationConfig = {
  navbar: DEFAULT_NAVBAR_CONFIG,
  footer: DEFAULT_FOOTER_CONFIG,
};
