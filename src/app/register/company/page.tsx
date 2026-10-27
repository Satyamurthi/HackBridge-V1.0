"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Building2, 
  Mail, 
  User, 
  Phone, 
  MapPin, 
  Globe, 
  Upload, 
  Lock, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  Copy, 
  Check, 
  ShieldCheck,
  FileCheck,
  Briefcase
} from "lucide-react";

export default function RegisterCompanyPage() {
  const router = useRouter();

  const [orgName, setOrgName] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [website, setWebsite] = useState("");
  const [password, setPassword] = useState("");
  const [docUrl, setDocUrl] = useState("");
  const [docFileName, setDocFileName] = useState("");

  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [submittedData, setSubmittedData] = useState<{
    hackId: string;
    email: string;
    orgName: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  // Field-level error validation state
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const validate = () => {
    const errors: Record<string, string> = {};
    if (!orgName.trim()) errors.orgName = "Company / Enterprise name is required";
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = "Valid official corporate email is required";
    }
    if (!name.trim()) errors.name = "Lead organizer / representative name is required";
    if (!phone.trim() || phone.trim().length < 10) {
      errors.phone = "Valid 10-digit phone number is required";
    }
    if (!city.trim()) errors.city = "Headquarters / branch city is required";
    if (!address.trim()) errors.address = "Office address is required";
    if (!website.trim() || !website.includes(".")) {
      errors.website = "Valid company website URL is required";
    }
    if (!password || password.length < 8) {
      errors.password = "Password must be at least 8 characters";
    }
    if (!docUrl.trim()) {
      errors.docUrl = "Corporate verification document (GSTIN/CIN/Incorporation letter) is required";
    }
    return errors;
  };

  const errors = validate();

  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setDocFileName(file.name);
      const reader = new FileReader();
      reader.onload = () => {
        setDocUrl(reader.result as string);
        setTouched((prev) => ({ ...prev, docUrl: true }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({
      orgName: true,
      email: true,
      name: true,
      phone: true,
      city: true,
      address: true,
      website: true,
      password: true,
      docUrl: true,
    });

    const currentErrors = validate();
    if (Object.keys(currentErrors).length > 0) {
      setFormError("Please fix the validation errors before submitting.");
      return;
    }

    setLoading(true);
    setFormError(null);

    try {
      const res = await fetch("/api/v1/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: "HOST",
          orgType: "company",
          orgName: orgName.trim(),
          email: email.trim().toLowerCase(),
          name: name.trim(),
          phone: phone.trim(),
          city: city.trim(),
          address: address.trim(),
          website: website.trim(),
          password,
          docUrl,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || "Company registration failed");
        setLoading(false);
        return;
      }

      setSubmittedData({
        hackId: data.user?.hackId || "HOST-REGISTERED",
        email: data.user?.email || email,
        orgName: data.user?.orgName || orgName,
      });
      setLoading(false);
    } catch {
      setFormError("Network error connecting to the registration service.");
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex-1 flex min-h-[calc(100vh-65px)] bg-transparent text-[#F8FAFC]">
      {/* Left Brand Panel */}
      <div className="hidden lg:flex lg:w-5/12 bg-[#0B0E18]/60 backdrop-blur-md border-r border-white/[0.08] p-12 flex-col justify-between relative overflow-hidden">
        <div className="space-y-6 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-[11px] font-mono text-[#F8FAFC]">
            <span className="w-2 h-2 rounded-full bg-[#6366F1] animate-pulse" />
            <span className="font-bold text-[#818CF8]">CORPORATE ARENA HOST</span>
          </div>

          <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-[#F8FAFC] tracking-tight leading-snug">
            Industry Hackathons & Technical Hiring Arenas.
          </h2>

          <p className="text-sm text-[#94A3B8] leading-relaxed">
            Sponsor problem statements, recruit top university engineering talent, provision automated team repositories, and evaluate working prototypes in live code execution streams.
          </p>

          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-3 text-xs font-mono text-[#94A3B8]">
            <div className="text-[#F8FAFC] font-semibold flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#6366F1]" />
              Enterprise Verification Gate
            </div>
            <p className="text-[11px] leading-relaxed text-[#94A3B8]">
              All corporate and enterprise host accounts are reviewed by the HackBridge Super Admin team. Once verified, your enterprise hackathon publishing portal is unlocked immediately.
            </p>
          </div>
        </div>

        <div className="pt-8 border-t border-white/[0.08] text-xs font-mono text-[#94A3B8] flex items-center justify-between">
          <span>Already registered?</span>
          <Link href="/login" className="text-[#818CF8] hover:underline font-bold">
            Sign In to Corporate Portal →
          </Link>
        </div>
      </div>

      {/* Right Form Panel */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12 bg-transparent">
        <div className="w-full max-w-xl space-y-6">
          {submittedData ? (
            /* Pending Approval Confirmation Screen */
            <div className="p-8 sm:p-10 rounded-3xl bg-[#0B0E18]/65 backdrop-blur-md border border-white/[0.08] text-center space-y-6 animate-fade-in">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
                <CheckCircle2 className="w-7 h-7" />
              </div>

              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-[11px] font-mono text-amber-300 font-bold">
                  <span>PENDING SUPER ADMIN APPROVAL</span>
                </div>
                <h2 className="font-display text-2xl font-extrabold text-[#F8FAFC]">
                  Company Registration Submitted
                </h2>
                <p className="text-xs text-[#94A3B8] max-w-md mx-auto leading-relaxed">
                  Your corporate chapter application for <strong className="text-white">{submittedData.orgName}</strong> has been received and queued for Super Admin compliance verification.
                </p>
              </div>

              {/* Permanent Host HACK ID Card */}
              <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-2 text-left">
                <span className="text-[10px] font-mono uppercase text-[#64748B]">Issued Host Identifier (HACK ID)</span>
                <div className="flex items-center justify-between gap-3 bg-black/40 p-3 rounded-xl border border-white/10 font-mono">
                  <span className="text-base font-bold text-[#818CF8]">{submittedData.hackId}</span>
                  <button
                    onClick={() => copyToClipboard(submittedData.hackId)}
                    className="flex items-center gap-1.5 text-xs text-[#94A3B8] hover:text-white px-2 py-1 rounded hover:bg-white/10 transition-colors"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>
                <p className="text-[11px] font-mono text-[#64748B] pt-1">
                  Registered Corporate Email: <span className="text-slate-300">{submittedData.email}</span>
                </p>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                <Link
                  href="/dashboard/host"
                  className="w-full sm:w-1/2 py-3 rounded-xl bg-[#6366F1] hover:bg-[#4F46E5] text-white font-bold text-xs tracking-wider uppercase transition-colors flex items-center justify-center gap-2"
                >
                  Go to Host Console
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/login"
                  className="w-full sm:w-1/2 py-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-white font-semibold text-xs tracking-wider uppercase transition-colors text-center"
                >
                  Sign In Later
                </Link>
              </div>
            </div>
          ) : (
            /* Registration Form */
            <form onSubmit={handleSubmit} className="p-7 sm:p-9 rounded-3xl bg-[#0B0E18]/65 backdrop-blur-md border border-white/[0.08] space-y-6">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-mono text-[#818CF8]">
                  <span>STEP 1 OF 1</span>
                  <span>·</span>
                  <span className="uppercase">ENTERPRISE ONBOARDING</span>
                </div>
                <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-[#F8FAFC]">
                  Register Company / Sponsor
                </h1>
                <p className="text-xs text-[#94A3B8]">
                  Register your organization to sponsor tracks and host technical hackathons.
                </p>
              </div>

              {formError && (
                <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-xs font-mono text-red-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Company / Enterprise Name */}
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-xs font-mono text-[#94A3B8] flex items-center justify-between">
                    <span>Company / Organization Name *</span>
                    {touched.orgName && errors.orgName && (
                      <span className="text-red-400 text-[11px]">{errors.orgName}</span>
                    )}
                  </label>
                  <div className="relative">
                    <Briefcase className="absolute left-3 top-3 w-4 h-4 text-[#64748B]" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Acme Cloud Technologies Pvt Ltd"
                      value={orgName}
                      onChange={(e) => setOrgName(e.target.value)}
                      onBlur={() => handleBlur("orgName")}
                      className={`w-full pl-9 pr-3 py-2.5 rounded-xl bg-white/[0.03] border text-xs text-[#F8FAFC] placeholder:text-[#64748B] focus:outline-none transition-colors ${
                        touched.orgName && errors.orgName ? "border-red-500/50" : "border-white/[0.08] focus:border-[#6366F1]"
                      }`}
                    />
                  </div>
                </div>

                {/* Corporate Email */}
                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-[#94A3B8] flex items-center justify-between">
                    <span>Corporate Email *</span>
                    {touched.email && errors.email && (
                      <span className="text-red-400 text-[11px]">{errors.email}</span>
                    )}
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 w-4 h-4 text-[#64748B]" />
                    <input
                      type="email"
                      required
                      placeholder="hackathons@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onBlur={() => handleBlur("email")}
                      className={`w-full pl-9 pr-3 py-2.5 rounded-xl bg-white/[0.03] border text-xs text-[#F8FAFC] placeholder:text-[#64748B] focus:outline-none transition-colors ${
                        touched.email && errors.email ? "border-red-500/50" : "border-white/[0.08] focus:border-[#6366F1]"
                      }`}
                    />
                  </div>
                </div>

                {/* Contact Person Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-[#94A3B8] flex items-center justify-between">
                    <span>Contact Person *</span>
                    {touched.name && errors.name && (
                      <span className="text-red-400 text-[11px]">{errors.name}</span>
                    )}
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 w-4 h-4 text-[#64748B]" />
                    <input
                      type="text"
                      required
                      placeholder="Pooja Sharma (Talent / Tech Lead)"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      onBlur={() => handleBlur("name")}
                      className={`w-full pl-9 pr-3 py-2.5 rounded-xl bg-white/[0.03] border text-xs text-[#F8FAFC] placeholder:text-[#64748B] focus:outline-none transition-colors ${
                        touched.name && errors.name ? "border-red-500/50" : "border-white/[0.08] focus:border-[#6366F1]"
                      }`}
                    />
                  </div>
                </div>

                {/* Phone */}
                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-[#94A3B8] flex items-center justify-between">
                    <span>Phone Number *</span>
                    {touched.phone && errors.phone && (
                      <span className="text-red-400 text-[11px]">{errors.phone}</span>
                    )}
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 w-4 h-4 text-[#64748B]" />
                    <input
                      type="tel"
                      required
                      placeholder="+91 98765 12345"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      onBlur={() => handleBlur("phone")}
                      className={`w-full pl-9 pr-3 py-2.5 rounded-xl bg-white/[0.03] border text-xs text-[#F8FAFC] placeholder:text-[#64748B] focus:outline-none transition-colors ${
                        touched.phone && errors.phone ? "border-red-500/50" : "border-white/[0.08] focus:border-[#6366F1]"
                      }`}
                    />
                  </div>
                </div>

                {/* City */}
                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-[#94A3B8] flex items-center justify-between">
                    <span>City *</span>
                    {touched.city && errors.city && (
                      <span className="text-red-400 text-[11px]">{errors.city}</span>
                    )}
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 w-4 h-4 text-[#64748B]" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Hyderabad, Telangana"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      onBlur={() => handleBlur("city")}
                      className={`w-full pl-9 pr-3 py-2.5 rounded-xl bg-white/[0.03] border text-xs text-[#F8FAFC] placeholder:text-[#64748B] focus:outline-none transition-colors ${
                        touched.city && errors.city ? "border-red-500/50" : "border-white/[0.08] focus:border-[#6366F1]"
                      }`}
                    />
                  </div>
                </div>

                {/* Headquarters Address */}
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-xs font-mono text-[#94A3B8] flex items-center justify-between">
                    <span>Corporate Office Address *</span>
                    {touched.address && errors.address && (
                      <span className="text-red-400 text-[11px]">{errors.address}</span>
                    )}
                  </label>
                  <textarea
                    rows={2}
                    required
                    placeholder="Registered corporate address, tech park, pincode"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    onBlur={() => handleBlur("address")}
                    className={`w-full p-3 rounded-xl bg-white/[0.03] border text-xs text-[#F8FAFC] placeholder:text-[#64748B] focus:outline-none transition-colors ${
                      touched.address && errors.address ? "border-red-500/50" : "border-white/[0.08] focus:border-[#6366F1]"
                    }`}
                  />
                </div>

                {/* Website */}
                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-[#94A3B8] flex items-center justify-between">
                    <span>Company Website *</span>
                    {touched.website && errors.website && (
                      <span className="text-red-400 text-[11px]">{errors.website}</span>
                    )}
                  </label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-3 w-4 h-4 text-[#64748B]" />
                    <input
                      type="url"
                      required
                      placeholder="https://acme.com"
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      onBlur={() => handleBlur("website")}
                      className={`w-full pl-9 pr-3 py-2.5 rounded-xl bg-white/[0.03] border text-xs text-[#F8FAFC] placeholder:text-[#64748B] focus:outline-none transition-colors ${
                        touched.website && errors.website ? "border-red-500/50" : "border-white/[0.08] focus:border-[#6366F1]"
                      }`}
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-[#94A3B8] flex items-center justify-between">
                    <span>Account Password *</span>
                    {touched.password && errors.password && (
                      <span className="text-red-400 text-[11px]">{errors.password}</span>
                    )}
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 w-4 h-4 text-[#64748B]" />
                    <input
                      type="password"
                      required
                      placeholder="Min 8 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onBlur={() => handleBlur("password")}
                      className={`w-full pl-9 pr-3 py-2.5 rounded-xl bg-white/[0.03] border text-xs text-[#F8FAFC] placeholder:text-[#64748B] focus:outline-none transition-colors ${
                        touched.password && errors.password ? "border-red-500/50" : "border-white/[0.08] focus:border-[#6366F1]"
                      }`}
                    />
                  </div>
                </div>

                {/* Verification Document Upload */}
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-xs font-mono text-[#94A3B8] flex items-center justify-between">
                    <span>Corporate Verification Document *</span>
                    {touched.docUrl && errors.docUrl && (
                      <span className="text-red-400 text-[11px]">{errors.docUrl}</span>
                    )}
                  </label>
                  <div className="p-4 rounded-xl border border-dashed border-white/20 bg-white/[0.02] text-center space-y-2 relative hover:border-[#6366F1]/50 transition-colors">
                    <input
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg"
                      onChange={handleFileUpload}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className="flex flex-col items-center justify-center gap-1.5 pointer-events-none">
                      {docFileName ? (
                        <>
                          <FileCheck className="w-6 h-6 text-emerald-400" />
                          <span className="text-xs font-bold text-white">{docFileName}</span>
                          <span className="text-[10px] text-emerald-400 font-mono">Document uploaded and verified</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-6 h-6 text-[#818CF8]" />
                          <span className="text-xs text-[#F8FAFC] font-medium">
                            Upload Certificate of Incorporation / GSTIN / Corporate Authorization Letter
                          </span>
                          <span className="text-[10px] text-[#64748B] font-mono">
                            PDF, PNG or JPG (Max 10MB)
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  {/* Or document URL fallback */}
                  <div className="pt-1">
                    <input
                      type="text"
                      placeholder="Or paste official corporate document link: https://..."
                      value={docUrl.startsWith("data:") ? "" : docUrl}
                      onChange={(e) => {
                        setDocUrl(e.target.value);
                        setDocFileName("Linked Document");
                      }}
                      className="w-full px-3 py-1.5 rounded-lg bg-white/[0.02] border border-white/[0.06] text-[11px] text-[#94A3B8] placeholder:text-[#64748B] focus:outline-none focus:border-[#6366F1]"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl bg-[#6366F1] hover:bg-[#4F46E5] disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-md shadow-indigo-500/20 flex items-center justify-center gap-2"
              >
                {loading ? "Registering Corporate Account..." : "Submit Company Application"}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
