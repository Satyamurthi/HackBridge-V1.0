import React from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Building2,
  Terminal,
  ArrowRight,
  Code2,
  Zap,
  Users,
  Award,
  Sparkles,
  Github,
  Linkedin,
  Phone,
  Mail,
  Heart,
  Globe,
  Layers,
  CheckCircle2,
  ExternalLink,
  Briefcase,
  GraduationCap,
} from "lucide-react";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface TeamMember {
  name: string;
  designation: string;
  role: string;
  image: string;
  github?: string;
  linkedin?: string;
  phone?: string;
  email?: string;
  department?: string;
}

interface CollaboratingBody {
  name: string;
  type: string;
  category: string;
  tagline: string;
  logo: string;
  logoContainerClass: string;
  website: string;
  description: string;
  keyContributions: string[];
}

const TECHNICAL_TEAM: TeamMember[] = [
  {
    name: "Prof. Shreenidhi N Koppal",
    designation: "Assistant Professor",
    role: "Technical FSD (Architecture & Core Services)",
    image: "/images/developers/sreenidhi-face.jpg",
    github: "https://github.com/Satyamurthi",
    linkedin: "https://www.linkedin.com/in/shreenidhi-n-koppal-koppal-0ab295211/",
    department: "Dept. of CS&E (AI & ML)",
  },
  {
    name: "Prof. Shivumanjesh P",
    designation: "Assistant Professor",
    role: "Technical FSD (Backend APIs & Data Pipeline)",
    image: "/images/developers/Shivamanjesh-face.jpg",
    github: "https://github.com/shivamanjesh",
    linkedin: "https://www.linkedin.com/in/shivamanjesh-p-2778401b4/",
    department: "Dept. of Computer Science & Engineering",
  },
  {
    name: "Prof. Bharath Bharadwaj B S",
    designation: "Assistant Professor",
    role: "Technical Frontend (UI/UX Engineering & State Management)",
    image: "/images/developers/bharath-face.jpg",
    github: "https://github.com/bharathbharadwaj",
    linkedin: "https://www.linkedin.com/in/bharath-bharadwaj-b-s-37213b19b/",
    department: "Dept. of Computer Science & Engineering",
  },
  {
    name: "Prof. Karthik V S",
    designation: "Assistant Professor",
    role: "Technical FSD (Infrastructure, Database & Auth)",
    image: "/images/developers/karthik-Medium-face.jpg",
    github: "https://github.com/karthikvs",
    linkedin: "https://www.linkedin.com/in/karthik-v-s-761a29124/",
    department: "Dept. of Computer Science & Engineering",
  },
];

const SPARK_IGNITORS: TeamMember[] = [
  {
    name: "Dr. H K Chethan",
    designation: "Professor & Dean",
    role: "Chief Academic Mentor & Patron",
    department: "MIT Thandavapura",
    image: "/images/IdeaSpark/chethan.jpg",
    email: "chethanhk@mitmysore.in",
    phone: "+91 9620228009",
  },
  {
    name: "Dr. Ranjit K N",
    designation: "Professor & HOD, CSE",
    role: "Departmental Chair & Mentor",
    department: "MIT Thandavapura",
    image: "/images/IdeaSpark/ranjith_new-Medium-face.jpg",
    email: "hodcse@mitmysore.in",
  },
  {
    name: "Dr. Sunil C",
    designation: "Associate Professor & HOD, AI & ML",
    role: "AI & ML Academic Chair & Mentor",
    department: "MIT Thandavapura",
    image: "/images/IdeaSpark/Dr.Sunil-C_new-Medium-face.jpg",
    email: "hodaiandml@gmail.com",
    phone: "+91 9739459309",
  },
  {
    name: "Vijayanand Gurudev",
    designation: "Chief Marketing Officer (CMO)",
    role: "Idea Champion & Industry Strategist",
    department: "Vigyanlabs Innovations",
    image: "/images/IdeaSpark/VijayanandGurudev.jpeg",
    email: "vijayanandgurudev10@gmail.com",
  },
  {
    name: "Sreenidhi",
    designation: "Co-Founder & CEO",
    role: "Idea Champion & Cloud Architect",
    department: "Cynefian Technologies",
    image: "/images/IdeaSpark/Sreenidhi.png",
    email: "contact@cynefian.com",
  },
];

const COLLABORATING_BODIES: CollaboratingBody[] = [
  {
    name: "Maharaja Institute of Technology Thandavapura (MITT)",
    type: "Collegiate Academic Institution",
    category: "Academic Collegiate Host",
    tagline: "Department of CS&E & Department of CS&E (AI & ML)",
    logo: "/images/collaborations/mit-logo.png",
    logoContainerClass: "bg-white border border-slate-200/80 shadow-sm",
    website: "https://mitt.edu.in",
    description:
      "Premier technical institute under Maharaja Education Trust ® (MET), affiliated to VTU Belagavi and approved by AICTE. Providing state-of-the-art campus computational laboratories, high-speed network infrastructure, and collegiate mentorship.",
    keyContributions: [
      "High-Performance Computing Infrastructure & MCA/CS Labs",
      "Departmental Faculty Advisory & Academic Jury Governance",
      "Collegiate Student Authentication & On-Campus Logistics",
    ],
  },
  {
    name: "Vigyanlabs Innovations",
    type: "Enterprise Technology Partner",
    category: "Industry Technology Partner",
    tagline: "Enterprise Cloud, Server Telemetry & Intelligent Green Computing",
    logo: "/images/collaborations/vigyanlabs-logo.jpeg",
    logoContainerClass: "bg-white border border-slate-200/80 shadow-sm",
    website: "https://vigyanlabs.com",
    description:
      "Global innovation leader specializing in intelligent cloud, server power telemetry, and energy sustainability. Delivering real-world enterprise problem challenges, technical executive mentorship, and industry career pathways.",
    keyContributions: [
      "Enterprise Problem Challenges & Industry Datasets",
      "Executive Mentorship & Real-World Jury Evaluation",
      "Industry Acceleration & Engineering Career Tracks",
    ],
  },
  {
    name: "Cynefian Technologies",
    type: "Cloud Architecture Enterprise",
    category: "Cloud Infrastructure & Ecosystem Partner",
    tagline: "Enterprise Cloud, Hybrid Architecture & AI-Ops Systems",
    logo: "/images/collaborations/cynefian.a6468e65420181555a92.png",
    logoContainerClass: "bg-[#060913] border border-white/10 shadow-sm",
    website: "https://cynefian.com",
    description:
      "Specializing in designing, operating, and automating resilient enterprise, hybrid, and rural-first cloud architectures across India. Providing cutting-edge cloud engineering problem statements, infrastructure sandboxes, and system incubation.",
    keyContributions: [
      "Cloud Computing & AI-Ops Track Sponsorship",
      "Continuous GitHub Repository & Code Quality Audits",
      "Startup Incubation & Production Prototype Pathways",
    ],
  },
];

export default function AboutPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20 w-full space-y-24">
      {/* ── 1. Hero & Brief Description of HackBridge ── */}
      <section className="relative text-center max-w-4xl mx-auto space-y-6">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#6366F1]/10 border border-[#6366F1]/30 text-xs font-mono text-[#818CF8] uppercase tracking-wider">
          <span className="w-2 h-2 rounded-full bg-[#6366F1] animate-pulse" />
          The Collegiate Engineering Platform
        </div>

        <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.1]">
          Architectural Infrastructure for{" "}
          <span className="bg-gradient-to-r from-[#818CF8] via-[#6366F1] to-[#C084FC] bg-clip-text text-transparent">
            High-Stakes Hackathons
          </span>
        </h1>

        <p className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-3xl mx-auto">
          <strong className="text-white font-semibold">HackBridge</strong> is an institutional competitive platform engineered to replace messy spreadsheet tracking, unverified payment screenshots, and chaotic communication with a deterministic, cryptographically verified infrastructure.
        </p>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-6 text-left items-stretch">
          <div className="p-5 rounded-2xl bg-[#0B0E18] border border-white/[0.08] space-y-2 shadow-sm flex flex-col justify-between h-full">
            <div className="space-y-2">
              <div className="w-8 h-8 rounded-lg bg-[#6366F1]/15 text-[#818CF8] flex items-center justify-center font-bold">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <h3 className="font-display font-bold text-sm text-white">Permanent Credentials</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Every student mints a permanent, collegiate-verified Hackathon ID that records their multi-event history.
              </p>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-[#0B0E18] border border-white/[0.08] space-y-2 shadow-sm flex flex-col justify-between h-full">
            <div className="space-y-2">
              <div className="w-8 h-8 rounded-lg bg-[#6366F1]/15 text-[#818CF8] flex items-center justify-center font-bold">
                <Zap className="w-4 h-4" />
              </div>
              <h3 className="font-display font-bold text-sm text-white">Atomic Allocation</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Transactional row locking eliminates overbooking and ensures mathematically balanced problem statement slots.
              </p>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-[#0B0E18] border border-white/[0.08] space-y-2 shadow-sm flex flex-col justify-between h-full">
            <div className="space-y-2">
              <div className="w-8 h-8 rounded-lg bg-[#6366F1]/15 text-[#818CF8] flex items-center justify-center font-bold">
                <Terminal className="w-4 h-4" />
              </div>
              <h3 className="font-display font-bold text-sm text-white">GitHub Auto-Sync</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Automated repository provisioning and commit verification preserves student engineering code forever.
              </p>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-[#0B0E18] border border-white/[0.08] space-y-2 shadow-sm flex flex-col justify-between h-full">
            <div className="space-y-2">
              <div className="w-8 h-8 rounded-lg bg-[#6366F1]/15 text-[#818CF8] flex items-center justify-center font-bold">
                <Award className="w-4 h-4" />
              </div>
              <h3 className="font-display font-bold text-sm text-white">Unified Evaluation</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Real-time multi-judge scoring with normalized weighted rubrics, live audit trails, and instant leaderboards.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 2. Technical Team ── */}
      <section id="technical-team" className="space-y-8 scroll-mt-24">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-white/[0.08] pb-6">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#818CF8]">
              <Code2 className="w-3.5 h-3.5" />
              Engineers &amp; Architects
            </div>
            <h2 className="font-display text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
              Technical Team
            </h2>
            <p className="text-sm text-slate-400 max-w-2xl leading-relaxed">
              The core engineering architects, full-stack engineers, and product designers responsible for building the HackBridge platform.
            </p>
          </div>
          <span className="text-xs font-mono px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-slate-300">
            {TECHNICAL_TEAM.length} Faculty &amp; Engineers
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
          {TECHNICAL_TEAM.map((member, i) => (
            <div
              key={i}
              className="group relative flex flex-col justify-between overflow-hidden rounded-2xl bg-[#0B0E18] border border-white/[0.08] hover:border-[#6366F1]/50 transition-all duration-300 shadow-sm hover:shadow-xl h-full"
            >
              <div>
                {/* Photo — 3:4 portrait frame, face at top */}
                <div className="relative aspect-[3/4] w-full overflow-hidden bg-slate-900 flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={member.image}
                    alt={member.name}
                    className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0B0E18] via-transparent to-transparent opacity-85 pointer-events-none" />
                  <div className="absolute top-3 right-3 px-2.5 py-0.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-[10px] font-mono text-indigo-300">
                    Engineering
                  </div>
                </div>

                {/* Details */}
                <div className="p-5 space-y-2">
                  <h3 className="font-display text-base sm:text-lg font-bold text-white group-hover:text-[#818CF8] transition-colors line-clamp-1">
                    {member.name}
                  </h3>
                  <div className="text-xs font-semibold text-[#818CF8] line-clamp-1">
                    {member.designation}
                  </div>
                  {member.department && (
                    <div className="text-[11px] font-mono text-slate-400 line-clamp-1">
                      {member.department}
                    </div>
                  )}
                  <p className="text-xs text-slate-300 leading-relaxed pt-1 line-clamp-2 min-h-[2.5rem]">
                    {member.role}
                  </p>
                </div>
              </div>

              {/* Social / Connect Bar pinned to bottom */}
              <div className="px-5 pb-5 pt-3 flex items-center gap-2 border-t border-white/[0.04] mt-auto">
                {member.github && (
                  <a
                    href={member.github}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-slate-300 hover:text-white transition-colors"
                    title="GitHub Profile"
                  >
                    <Github className="w-3.5 h-3.5" />
                  </a>
                )}
                {member.linkedin && (
                  <a
                    href={member.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg bg-[#0A66C2]/15 hover:bg-[#0A66C2]/25 border border-[#0A66C2]/30 text-[#4DA3FF] transition-colors"
                    title="LinkedIn Profile"
                  >
                    <Linkedin className="w-3.5 h-3.5" />
                  </a>
                )}
                {member.phone && (
                  <a
                    href={`tel:${member.phone.replace(/[^0-9+]/g, "")}`}
                    className="p-2 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 transition-colors flex items-center gap-1.5 text-xs font-mono ml-auto"
                    title={`Call ${member.name}`}
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Call</span>
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── 3. Spark Ignitors ── */}
      <section id="spark-ignitors" className="space-y-8 scroll-mt-24">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-white/[0.08] pb-6">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-amber-400">
              <Sparkles className="w-3.5 h-3.5" />
              Leadership Council &amp; Mentors
            </div>
            <h2 className="font-display text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
              Spark Ignitors
            </h2>
            <p className="text-sm text-slate-400 max-w-2xl leading-relaxed">
              The visionary academic leaders, deans, industry champions, and strategic mentors driving innovation, problem formulation, and operational guidance.
            </p>
          </div>
          <span className="text-xs font-mono px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/20 text-amber-300">
            {SPARK_IGNITORS.length} Leaders &amp; Mentors
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 items-stretch">
          {SPARK_IGNITORS.map((coord, i) => (
            <div
              key={i}
              className="group relative flex flex-col justify-between overflow-hidden rounded-2xl bg-[#0B0E18] border border-white/[0.08] hover:border-amber-400/50 transition-all duration-300 shadow-sm hover:shadow-xl h-full"
            >
              <div>
                {/* Photo — 3:4 portrait frame, face at top */}
                <div className="relative aspect-[3/4] w-full overflow-hidden bg-slate-900 flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={coord.image}
                    alt={coord.name}
                    className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0B0E18] via-transparent to-transparent opacity-85 pointer-events-none" />
                  <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-[9px] font-mono text-amber-300">
                    Leader
                  </div>
                  <div className="absolute bottom-2.5 left-2.5 right-2.5 px-2 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/30 text-[10px] font-mono font-bold text-amber-200 backdrop-blur-sm truncate">
                    {coord.role}
                  </div>
                </div>

                {/* Details */}
                <div className="p-4 space-y-1.5">
                  <h3 className="font-display text-base font-bold text-white group-hover:text-amber-300 transition-colors line-clamp-1">
                    {coord.name}
                  </h3>
                  <div className="text-xs font-semibold text-amber-200/90 line-clamp-2 min-h-[2rem]">
                    {coord.designation}
                  </div>
                  {coord.department && (
                    <div className="text-[11px] font-mono text-slate-400 line-clamp-1 min-h-[1rem]">
                      {coord.department}
                    </div>
                  )}
                </div>
              </div>

              {/* Contact Actions pinned to bottom */}
              <div className="p-4 pt-2 border-t border-white/[0.04] mt-auto">
                <div className="grid grid-cols-2 gap-1.5">
                  {coord.phone ? (
                    <a
                      href={`tel:${coord.phone.replace(/[^0-9+]/g, "")}`}
                      className="px-2 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-[11px] font-mono text-slate-200 flex items-center justify-center gap-1 transition-colors"
                      title={`Call ${coord.name}`}
                    >
                      <Phone className="w-3 h-3 text-emerald-400" />
                      <span>Call</span>
                    </a>
                  ) : (
                    <span className="px-2 py-1.5 rounded-lg bg-white/[0.02] border border-white/[0.04] text-[10px] font-mono text-slate-500 flex items-center justify-center">
                      Advisory
                    </span>
                  )}
                  {coord.email ? (
                    <a
                      href={`mailto:${coord.email}`}
                      className="px-2 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-[11px] font-mono text-slate-200 flex items-center justify-center gap-1 transition-colors truncate"
                      title={`Email ${coord.name}`}
                    >
                      <Mail className="w-3 h-3 text-[#818CF8] shrink-0" />
                      <span>Email</span>
                    </a>
                  ) : (
                    <span className="px-2 py-1.5 rounded-lg bg-white/[0.02] border border-white/[0.04] text-[10px] font-mono text-slate-500 flex items-center justify-center">
                      Active
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── 4. Special Mentions: Collaboration of 3 Bodies ── */}
      <section id="special-mentions" className="space-y-10 scroll-mt-24">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-white/[0.08] pb-6">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-rose-400">
              <Heart className="w-3.5 h-3.5 fill-rose-400 text-rose-400" />
              Strategic Ecosystem Partnership
            </div>
            <h2 className="font-display text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
              Special Mentions: Collaboration of 3 Bodies
            </h2>
            <p className="text-sm text-slate-400 max-w-2xl leading-relaxed">
              HackBridge is proud to be driven by a tripartite institutional collaboration uniting academia, enterprise green cloud pioneers, and agile cloud infrastructure architects.
            </p>
          </div>
          <span className="text-xs font-mono px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-300">
            Tripartite Partnership
          </span>
        </div>

        {/* 3 Collaborating Bodies Showcase Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
          {COLLABORATING_BODIES.map((body, i) => (
            <div
              key={i}
              className="group relative flex flex-col justify-between overflow-hidden rounded-3xl bg-[#0B0E18] border border-white/[0.08] hover:border-rose-400/50 transition-all duration-300 p-6 sm:p-7 shadow-lg space-y-6 h-full"
            >
              <div className="space-y-5">
                {/* Logo Showcase Banner with branded styling */}
                <div
                  className={`w-full h-28 rounded-2xl ${body.logoContainerClass} p-4 flex items-center justify-center overflow-hidden transition-all duration-300 group-hover:scale-[1.01]`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={body.logo}
                    alt={body.name}
                    className="max-h-20 max-w-[85%] w-auto object-contain drop-shadow-sm filter contrast-105"
                  />
                </div>

                {/* Body Meta Header */}
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-500/15 border border-rose-500/30 text-[10px] font-mono text-rose-300 uppercase tracking-wider">
                      {body.category}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 px-2 py-0.5 rounded-md bg-white/[0.04]">
                      {body.type}
                    </span>
                  </div>
                  <h3 className="font-display text-xl font-bold text-white group-hover:text-rose-300 transition-colors">
                    {body.name}
                  </h3>
                  <div className="text-xs font-mono text-[#818CF8]">
                    {body.tagline}
                  </div>
                </div>

                {/* Editorial Description */}
                <p className="text-xs text-slate-300 leading-relaxed">
                  {body.description}
                </p>

                {/* Key Contributions Checklist */}
                <div className="space-y-2 pt-2 border-t border-white/[0.06]">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold">
                    Core Collaboration Pillars:
                  </div>
                  <ul className="space-y-1.5">
                    {body.keyContributions.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-xs text-slate-300">
                        <CheckCircle2 className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Action / Link footer */}
              {body.website && (
                <div className="pt-4 border-t border-white/[0.06] mt-auto">
                  <a
                    href={body.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-mono text-[#818CF8] hover:text-white transition-colors"
                  >
                    <span>Visit Official Website</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Bottom Banner */}
        <div className="rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-[#0B0E18] via-[#111524] to-[#0B0E18] border border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-6 shadow-xl">
          <div className="space-y-1 max-w-2xl">
            <h4 className="font-display text-lg font-bold text-white">
              Ready to experience HackBridge?
            </h4>
            <p className="text-xs sm:text-sm text-slate-400">
              Join collegiate developers and university hackathon organizers building on our deterministic competition platform.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link
              href="/hackathons"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#6366F1] hover:bg-[#4F46E5] text-white text-xs font-bold shadow-md transition-all"
            >
              <span>Explore Active Arenas</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
