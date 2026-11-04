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

const TECHNICAL_TEAM: TeamMember[] = [
  {
    name: "Sharath H N",
    designation: "Full Stack Engineer & Tech Lead",
    role: "Technical FSD (Architecture & Core Services)",
    image: "/images/developers/SharathHN.jpeg",
    github: "https://github.com/sharath-6363",
    linkedin: "https://www.linkedin.com/in/sharath-hn-368449228/",
  },
  {
    name: "Jasim Hussain K",
    designation: "Full Stack Engineer",
    role: "Technical FSD (Backend APIs & Data Pipeline)",
    image: "/images/developers/jasim.jpeg",
    github: "https://github.com/jasimk786",
    linkedin: "https://www.linkedin.com/in/jasim-hussaain",
  },
  {
    name: "Manju C G",
    designation: "Frontend Architect",
    role: "Technical Frontend (UI/UX Engineering & State Management)",
    image: "/images/developers/manju-c-g.jpeg",
    github: "https://github.com/manjucg39-design",
    linkedin: "https://www.linkedin.com/in/manju-c-g-48bb23335",
  },
  {
    name: "Manjunath P",
    designation: "Systems & Full Stack Engineer",
    role: "Technical FSD (Infrastructure, Database & Auth)",
    image: "/images/developers/manjuanath.jpeg",
    github: "https://github.com/namelessweakl1ng",
    linkedin: "https://www.linkedin.com/in/manjunatha67p/",
  },
  {
    name: "Pradeep Bhimappa Kadakol",
    designation: "Frontend Developer",
    role: "Technical Frontend (Component Architecture & Interactive Flows)",
    image: "/images/developers/person2.png",
    github: "https://github.com/pradeepkadakol",
    linkedin: "https://www.linkedin.com/in/pradeep-kadakol-602220333/",
  },
  {
    name: "Harshith H R",
    designation: "Creative Lead & UX Designer",
    role: "Design & Content (Brand Identity, Visual Assets & Copywriting)",
    image: "/images/developers/harshith.jpeg",
    phone: "+91 8296338351",
  },
];

const SPARK_IGNITORS: TeamMember[] = [
  {
    name: "Komal Kirthi Mittal B",
    designation: "President (Student Council)",
    role: "Overall Hackathon Lead & Finance In-Charge",
    department: "Dept. of Computer Science & Engineering",
    image: "/images/coordinators/komal.jpeg",
    email: "mittalkomal380@gmail.com",
    phone: "+91 9901727510",
  },
  {
    name: "Hiremata Rohith",
    designation: "President (Student Council)",
    role: "Operations Lead & Event Coordinator",
    department: "Dept. of Computer Science & Engineering",
    image: "/images/coordinators/rohith.jpeg",
    email: "4mn24cs404@gmail.com",
    phone: "+91 8125636397",
  },
  {
    name: "Manasa M Swamy",
    designation: "Vice President",
    role: "Operational Planning & Communications",
    department: "Dept. of Computer Science & Engineering",
    image: "/images/coordinators/manasa.jpeg",
    email: "manasauttam@gmail.com",
    phone: "+91 7760882899",
  },
  {
    name: "Kishore P",
    designation: "Vice President",
    role: "Logistics & Squad Management",
    department: "Dept. of Computer Science & Engineering",
    image: "/images/coordinators/kishore.jpeg",
    email: "kishkeerthi24@gmail.com",
    phone: "+91 7348928249",
  },
  {
    name: "Rakshitha K M",
    designation: "Secretary",
    role: "Participant Experience & Desk Management",
    department: "Dept. of Computer Science & Engineering",
    image: "/images/coordinators/rakshitha.jpeg",
    email: "rakshithakm1602@gmail.com",
    phone: "+91 9845058451",
  },
  {
    name: "Madan Gowda B U",
    designation: "Secretary",
    role: "Venue & Infrastructure Operations",
    department: "Dept. of Computer Science & Engineering",
    image: "/images/coordinators/madan.jpeg",
    email: "madangowdabu2005@gmail.com",
    phone: "+91 7676453140",
  },
  {
    name: "Bindu B S",
    designation: "Joint Secretary",
    role: "Stage, Hospitality & Participant Relations",
    department: "Dept. of Computer Science & Engineering",
    image: "/images/coordinators/bindu.jpeg",
    email: "bindu.bs807@gmail.com",
    phone: "+91 8073709238",
  },
  {
    name: "Arjun Urs R",
    designation: "Joint Secretary",
    role: "Squad Support & Protocol Administration",
    department: "Dept. of Computer Science & Engineering",
    image: "/images/coordinators/arjun.jpeg",
    email: "arjunursr2005@gmail.com",
    phone: "+91 7483522779",
  },
  {
    name: "Divya H",
    designation: "Joint Secretary",
    role: "AI & ML Track Coordination",
    department: "Dept. of CS&E (AI & ML)",
    image: "/images/coordinators/divya.jpeg",
    email: "divyahgowda0901@gmail.com",
    phone: "+91 7019231891",
  },
  {
    name: "Srinidhi TG",
    designation: "Joint Secretary",
    role: "Arena Monitoring & Support Desk",
    department: "Dept. of CS&E (AI & ML)",
    image: "/images/coordinators/Srinidhi.jpeg",
    email: "srinidhitg2006@gmail.com",
    phone: "+91 8660586517",
  },
];

const SPECIAL_MENTIONS: TeamMember[] = [
  {
    name: "Dr. Mahadeva Prasad Y N",
    designation: "Associate Professor & HOD",
    role: "Chief Faculty Advisor & Organizing Chair",
    department: "Department of Computer Science & Engineering",
    image: "/images/faculty_coordinators/mahadevprasad.png",
  },
  {
    name: "Dr. Malathi M",
    designation: "Professor",
    role: "Senior Faculty Mentor & Evaluation Jury Chair",
    department: "Department of Computer Science & Engineering",
    image: "/images/faculty_coordinators/malathimam.png",
  },
  {
    name: "Prof. Karthik V S",
    designation: "Assistant Professor",
    role: "Faculty Coordinator (Technical & Infrastructure)",
    department: "Department of Computer Science & Engineering",
    image: "/images/faculty_coordinators/karthik.png",
  },
  {
    name: "Prof. Srinidhi N Koppal",
    designation: "Assistant Professor",
    role: "Faculty Coordinator (AI/ML & Platform Architecture)",
    department: "Department of CS&E (AI & ML)",
    image: "/images/faculty_coordinators/sreenidhi.png",
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-6 text-left">
          <div className="p-5 rounded-2xl bg-[#0B0E18] border border-white/[0.08] space-y-2 shadow-sm">
            <div className="w-8 h-8 rounded-lg bg-[#6366F1]/15 text-[#818CF8] flex items-center justify-center font-bold">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h3 className="font-display font-bold text-sm text-white">Permanent Credentials</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Every student mints a permanent, collegiate-verified Hackathon ID that records their multi-event history.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-[#0B0E18] border border-white/[0.08] space-y-2 shadow-sm">
            <div className="w-8 h-8 rounded-lg bg-[#6366F1]/15 text-[#818CF8] flex items-center justify-center font-bold">
              <Zap className="w-4 h-4" />
            </div>
            <h3 className="font-display font-bold text-sm text-white">Atomic Allocation</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Transactional row locking eliminates overbooking and ensures mathematically balanced problem statement slots.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-[#0B0E18] border border-white/[0.08] space-y-2 shadow-sm">
            <div className="w-8 h-8 rounded-lg bg-[#6366F1]/15 text-[#818CF8] flex items-center justify-center font-bold">
              <Terminal className="w-4 h-4" />
            </div>
            <h3 className="font-display font-bold text-sm text-white">GitHub Auto-Sync</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Automated repository provisioning and commit verification preserves student engineering code forever.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-[#0B0E18] border border-white/[0.08] space-y-2 shadow-sm">
            <div className="w-8 h-8 rounded-lg bg-[#6366F1]/15 text-[#818CF8] flex items-center justify-center font-bold">
              <Award className="w-4 h-4" />
            </div>
            <h3 className="font-display font-bold text-sm text-white">Unified Evaluation</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Real-time multi-judge scoring with normalized weighted rubrics, live audit trails, and instant leaderboards.
            </p>
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
            6 Core Engineers
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {TECHNICAL_TEAM.map((member, i) => (
            <div
              key={i}
              className="group relative flex flex-col justify-between overflow-hidden rounded-2xl bg-[#0B0E18] border border-white/[0.08] hover:border-[#6366F1]/50 transition-all duration-300 shadow-sm hover:shadow-xl"
            >
              <div>
                {/* Photo */}
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-900">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={member.image}
                    alt={member.name}
                    className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0B0E18] via-transparent to-transparent opacity-80" />
                  <div className="absolute top-3 right-3 px-2.5 py-0.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-[10px] font-mono text-indigo-300">
                    Engineering
                  </div>
                </div>

                {/* Details */}
                <div className="p-5 space-y-2">
                  <h3 className="font-display text-lg font-bold text-white group-hover:text-[#818CF8] transition-colors">
                    {member.name}
                  </h3>
                  <div className="text-xs font-semibold text-[#818CF8]">
                    {member.designation}
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed pt-1">
                    {member.role}
                  </p>
                </div>
              </div>

              {/* Social / Connect Bar */}
              <div className="px-5 pb-5 pt-2 flex items-center gap-2 border-t border-white/[0.04] mt-auto">
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
                    className="p-2 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 transition-colors flex items-center gap-1.5 text-xs font-mono"
                    title={`Call ${member.name}`}
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>{member.phone}</span>
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
              Student Leadership Council &amp; Operatives
            </div>
            <h2 className="font-display text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
              Spark Ignitors
            </h2>
            <p className="text-sm text-slate-400 max-w-2xl leading-relaxed">
              The student coordinators, track heads, and logistics leads driving on-ground operations, squad administration, and participant enablement.
            </p>
          </div>
          <span className="text-xs font-mono px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/20 text-amber-300">
            10 Lead Coordinators
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
          {SPARK_IGNITORS.map((coord, i) => (
            <div
              key={i}
              className="group relative flex flex-col justify-between overflow-hidden rounded-2xl bg-[#0B0E18] border border-white/[0.08] hover:border-amber-400/50 transition-all duration-300 shadow-sm hover:shadow-xl"
            >
              <div>
                {/* Photo */}
                <div className="relative aspect-[4/5] w-full overflow-hidden bg-slate-900">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={coord.image}
                    alt={coord.name}
                    className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0B0E18] via-transparent to-transparent opacity-85" />
                  <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-[9px] font-mono text-amber-300">
                    Coordinator
                  </div>
                  <div className="absolute bottom-2.5 left-2.5 px-2 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/30 text-[10px] font-mono font-bold text-amber-200 backdrop-blur-sm">
                    {coord.designation}
                  </div>
                </div>

                {/* Details */}
                <div className="p-4 space-y-1.5">
                  <h3 className="font-display text-base font-bold text-white group-hover:text-amber-300 transition-colors">
                    {coord.name}
                  </h3>
                  <div className="text-[11px] font-mono text-slate-400">
                    {coord.department}
                  </div>
                  <p className="text-xs text-slate-300 leading-snug pt-1">
                    {coord.role}
                  </p>
                </div>
              </div>

              {/* Contact Actions */}
              <div className="p-4 pt-2 border-t border-white/[0.04] mt-auto">
                <div className="grid grid-cols-2 gap-1.5">
                  {coord.phone && (
                    <a
                      href={`tel:${coord.phone.replace(/[^0-9+]/g, "")}`}
                      className="px-2 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-[11px] font-mono text-slate-200 flex items-center justify-center gap-1 transition-colors"
                      title={`Call ${coord.name}`}
                    >
                      <Phone className="w-3 h-3 text-emerald-400" />
                      <span>Call</span>
                    </a>
                  )}
                  {coord.email && (
                    <a
                      href={`mailto:${coord.email}`}
                      className="px-2 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-[11px] font-mono text-slate-200 flex items-center justify-center gap-1 transition-colors"
                      title={`Email ${coord.name}`}
                    >
                      <Mail className="w-3 h-3 text-[#818CF8]" />
                      <span>Email</span>
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── 4. Special Mentions ── */}
      <section id="special-mentions" className="space-y-8 scroll-mt-24">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-white/[0.08] pb-6">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-rose-400">
              <Heart className="w-3.5 h-3.5 fill-rose-400 text-rose-400" />
              Advisors, Mentors &amp; Patrons
            </div>
            <h2 className="font-display text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
              Special Mentions
            </h2>
            <p className="text-sm text-slate-400 max-w-2xl leading-relaxed">
              With deepest gratitude to the distinguished faculty advisors, departmental heads, and institutional patrons whose vision and mentorship brought this collegiate arena to life.
            </p>
          </div>
          <span className="text-xs font-mono px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-300">
            Faculty Mentors &amp; Institutions
          </span>
        </div>

        {/* Faculty Mentors Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {SPECIAL_MENTIONS.map((faculty, i) => (
            <div
              key={i}
              className="group relative flex flex-col justify-between overflow-hidden rounded-2xl bg-[#0B0E18] border border-white/[0.08] hover:border-rose-400/40 transition-all duration-300 shadow-sm hover:shadow-xl"
            >
              <div>
                <div className="relative aspect-[4/4.5] w-full overflow-hidden bg-slate-900">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={faculty.image}
                    alt={faculty.name}
                    className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0B0E18] via-transparent to-transparent opacity-85" />
                  <div className="absolute top-3 right-3 px-2.5 py-0.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-[10px] font-mono text-rose-300">
                    Faculty Advisor
                  </div>
                </div>

                <div className="p-5 space-y-1.5">
                  <h3 className="font-display text-base font-bold text-white group-hover:text-rose-300 transition-colors">
                    {faculty.name}
                  </h3>
                  <div className="text-xs font-semibold text-[#818CF8]">
                    {faculty.designation}
                  </div>
                  <div className="text-[11px] font-mono text-slate-400">
                    {faculty.department}
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed pt-2">
                    {faculty.role}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Institutional Patrons & Partners Card */}
        <div className="rounded-3xl p-6 sm:p-8 bg-[#0B0E18] border border-white/[0.08] space-y-6">
          <div className="flex items-center gap-2.5 text-xs font-mono uppercase tracking-widest text-[#818CF8]">
            <Building2 className="w-4 h-4 text-[#818CF8]" />
            Institutional Patrons &amp; Ecosystem Partners
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-2">
              <div className="font-display font-bold text-base text-white">
                Maharaja Education Trust ® (MET)
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Under the visionary leadership of Maharaja Education Trust, empowering thousands of engineering students across Karnataka with world-class infrastructure and educational excellence.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-2">
              <div className="font-display font-bold text-base text-white">
                MIT Thandavapura (MITT)
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Department of Computer Science &amp; Engineering and Department of CS&E (AI &amp; ML), hosting the premier 24-hour national hackathons.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-2">
              <div className="font-display font-bold text-base text-white">
                Vigyanlabs Innovations
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Strategic industry collaboration partner, providing real-world enterprise problem statements, technical mentorship, and cutting-edge industrial problem challenges.
              </p>
            </div>
          </div>

          <div className="pt-4 flex flex-wrap items-center justify-between gap-4 border-t border-white/[0.06]">
            <span className="text-xs font-mono text-slate-400">
              HackBridge · Engineered with precision for collegiate engineering excellence.
            </span>
            <Link
              href="/hackathons"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#6366F1] hover:bg-[#4F46E5] text-white text-xs font-semibold shadow-md transition-all"
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
