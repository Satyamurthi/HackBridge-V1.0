// Standard pages supported by the CMS per Prompt 11
export interface CMSPageDefinition {
  key: string;
  title: string;
  defaultSections: any[];
}

export const CMS_DEFAULT_PAGES: CMSPageDefinition[] = [
  {
    key: "page_landing",
    title: "Landing Page (Public Home)",
    defaultSections: [
      {
        id: "hero",
        type: "hero",
        visible: true,
        heading: "Architectural Infrastructure for High-Stakes Hackathons.",
        subheading: "Permanent student credentials, atomic problem allocation, and automated GitHub repository provisioning—engineered for university builders and serious hackathon hosts.",
        badgePrefix: "PROTOCOL v1.0",
        badgeText: "Collegiate Hackathon Infrastructure",
        badgeStatus: "LIVE",
        buttonText: "Claim Student Hackathon ID",
        buttonLink: "/signup/student",
        secondaryButtonText: "Host a Hackathon",
        secondaryButtonLink: "/register/college",
      },
      {
        id: "stats",
        type: "stats",
        visible: true,
        heading: "Platform Metrics",
        items: [
          { label: "Collegiate Builders", value: "5,000+" },
          { label: "Atomic Row Locking", value: "100%" },
          { label: "Dispute Resolution", value: "0ms" },
        ],
      },
      {
        id: "how_it_works",
        type: "cards",
        visible: true,
        heading: "How HackBridge Works",
        subheading: "End-to-end cryptographic and collegiate governance.",
        items: [
          { title: "Mint Student ID", description: "Permanent identity issued with collegiate email verification." },
          { title: "Form Squad", description: "Atomic roster validation with minimum squad enforcement." },
          { title: "Timed Domain Reveal", description: "Problem statements cryptographically sealed until countdown ticks zero." },
        ],
      },
      {
        id: "seo",
        type: "seo",
        visible: true,
        metaTitle: "HackBridge — Collegiate Hackathon Infrastructure",
        metaDescription: "Verified student hackathon credentialing and atomic problem statement allocation platform.",
      },
    ],
  },
  {
    key: "page_arenas",
    title: "Arenas Page (/hackathons)",
    defaultSections: [
      {
        id: "header",
        type: "header",
        visible: true,
        heading: "Active Hackathon Arenas",
        subheading: "Discover accredited collegiate hackathons, explore problem domains, and register your engineering squad.",
      },
      {
        id: "seo",
        type: "seo",
        visible: true,
        metaTitle: "Arenas — HackBridge",
        metaDescription: "Browse all verified active hackathons on HackBridge.",
      },
    ],
  },
  {
    key: "page_about",
    title: "About Page (/about)",
    defaultSections: [
      {
        id: "hero",
        type: "hero",
        visible: true,
        heading: "Built for High-Trust Competitive Engineering",
        subheading: "HackBridge replaces spreadsheet tracking and disputed problem statements with atomic server state.",
      },
      {
        id: "faq",
        type: "faq",
        visible: true,
        heading: "Frequently Asked Questions",
        items: [
          { question: "What is a permanent Hackathon ID?", answer: "A unique identifier formatted as HB-XXXXXX bound to your collegiate developer profile." },
          { question: "How does host payment verification work?", answer: "Hosts configure direct Razorpay API credentials or UPI QR codes, receiving funds directly to their accounts." },
        ],
      },
    ],
  },
  {
    key: "page_docs",
    title: "Protocol Specs & Docs (/docs)",
    defaultSections: [
      {
        id: "header",
        type: "header",
        visible: true,
        heading: "Protocol Specifications",
        subheading: "Cryptographic invariants, atomic allocation constraints, and evaluation rubric standards.",
      },
    ],
  },
  {
    key: "page_legal",
    title: "Legal & Privacy Policy (/legal)",
    defaultSections: [
      {
        id: "content",
        type: "text",
        visible: true,
        heading: "Terms of Service & Data Governance",
        subheading: "Institutional compliance, zero-telemetry guidelines, and data retention policies.",
        bodyText: "HackBridge protects student data and enforces strict role-based access control.",
      },
    ],
  },
  {
    key: "page_404",
    title: "404 Not Found Page",
    defaultSections: [
      {
        id: "message",
        type: "hero",
        visible: true,
        heading: "404 — Track Not Found",
        subheading: "The requested protocol resource or arena endpoint does not exist on this server.",
        buttonText: "Return to Home",
        buttonLink: "/",
      },
    ],
  },
  {
    key: "page_500",
    title: "500 Server Error Page",
    defaultSections: [
      {
        id: "message",
        type: "hero",
        visible: true,
        heading: "500 — System Exception",
        subheading: "An internal server error occurred. Our automated telemetry has logged this incident.",
        buttonText: "Return to Safety",
        buttonLink: "/",
      },
    ],
  },
];
