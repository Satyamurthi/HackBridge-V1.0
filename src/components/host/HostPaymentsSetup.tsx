"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  CreditCard, 
  QrCode, 
  CheckCircle2, 
  AlertCircle, 
  Lock, 
  Building2, 
  RefreshCw, 
  ExternalLink,
  Eye,
  EyeOff,
  Zap,
  Sparkles,
  Upload,
  Download,
  Copy,
  Check
} from "lucide-react";
import { isValidUpiId, generateUpiQrCode, readQrImageFile } from "@/lib/upi-qr";

interface PaymentSetupData {
  razorpayKeyId: string;
  maskedKeyId: string;
  hasSecret: boolean;
  upiId: string;
  bankAccountName: string;
  qrImageUrl: string;
  isConfigured: boolean;
}

export default function HostPaymentsSetup() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showSecret, setShowSecret] = useState(false);

  const [setup, setSetup] = useState<PaymentSetupData>({
    razorpayKeyId: "",
    maskedKeyId: "",
    hasSecret: false,
    upiId: "",
    bankAccountName: "",
    qrImageUrl: "",
    isConfigured: false,
  });

  const [keyIdInput, setKeyIdInput] = useState("");
  const [keySecretInput, setKeySecretInput] = useState("");
  const [upiIdInput, setUpiIdInput] = useState("");
  const [bankAccountNameInput, setBankAccountNameInput] = useState("");
  const [qrImageUrlInput, setQrImageUrlInput] = useState("");

  const [qrMode, setQrMode] = useState<"AUTOGEN" | "UPLOAD">("AUTOGEN");
  const [generatingQr, setGeneratingQr] = useState(false);
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [saveResult, setSaveResult] = useState<{ success: boolean; message: string } | null>(null);

  const fetchSetup = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/host/payments-setup");
      if (res.ok) {
        const data = await res.json();
        if (data.setup) {
          setSetup(data.setup);
          setKeyIdInput(data.setup.razorpayKeyId || "");
          setUpiIdInput(data.setup.upiId || "");
          setBankAccountNameInput(data.setup.bankAccountName || "");
          setQrImageUrlInput(data.setup.qrImageUrl || "");
          if (data.setup.qrImageUrl && !data.setup.qrImageUrl.startsWith("data:image")) {
            setQrMode("UPLOAD");
          }
        }
      }
    } catch (err) {
      console.error("[HostPaymentsSetup] Failed to load setup:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSetup();
  }, []);

  // Auto-generate QR code whenever upiIdInput or bankAccountNameInput changes in AUTOGEN mode
  useEffect(() => {
    if (qrMode !== "AUTOGEN") return;

    const trimmedUpi = upiIdInput.trim();
    if (!trimmedUpi || !isValidUpiId(trimmedUpi)) {
      return;
    }

    let isMounted = true;
    setGeneratingQr(true);

    generateUpiQrCode({
      upiId: trimmedUpi,
      payeeName: bankAccountNameInput.trim() || "Host Organizer",
      note: "Hackathon Registration Fee",
    })
      .then((qrUrl) => {
        if (isMounted) {
          setQrImageUrlInput(qrUrl);
        }
      })
      .catch((err) => {
        console.error("[HostPaymentsSetup] Failed to auto-generate UPI QR:", err);
      })
      .finally(() => {
        if (isMounted) setGeneratingQr(false);
      });

    return () => {
      isMounted = false;
    };
  }, [qrMode, upiIdInput, bankAccountNameInput]);

  const handleQrFileUpload = async (file: File) => {
    setUploadError(null);
    try {
      const dataUrl = await readQrImageFile(file);
      setQrImageUrlInput(dataUrl);
    } catch (err: any) {
      setUploadError(err.message || "Failed to process image file.");
    }
  };

  const copyUpiId = () => {
    if (!upiIdInput) return;
    navigator.clipboard.writeText(upiIdInput.trim());
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const downloadQrCode = () => {
    if (!qrImageUrlInput) return;
    const a = document.createElement("a");
    a.href = qrImageUrlInput;
    a.download = `hackbridge-host-upi-qr-${(upiIdInput || "payment").replace(/[^a-z0-9]/g, "-")}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/v1/host/payments-setup/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          razorpayKeyId: keyIdInput.trim(),
          razorpayKeySecret: keySecretInput.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setTestResult({
          success: true,
          message: data.message || "Razorpay API test connection passed successfully!",
        });
      } else {
        setTestResult({
          success: false,
          message: data.error || "Connection failed. Please check your credentials.",
        });
      }
    } catch {
      setTestResult({
        success: false,
        message: "Network error attempting to reach Razorpay verification service.",
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveResult(null);

    const payload: any = {
      razorpayKeyId: keyIdInput.trim(),
      upiId: upiIdInput.trim(),
      bankAccountName: bankAccountNameInput.trim(),
      qrImageUrl: qrImageUrlInput.trim(),
    };

    if (keySecretInput.trim()) {
      payload.razorpayKeySecret = keySecretInput.trim();
    }

    try {
      const res = await fetch("/api/v1/host/payments-setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok) {
        setSaveResult({
          success: true,
          message: "Payment credentials saved and encrypted securely on server.",
        });
        setKeySecretInput(""); // Clear plain text password field
        await fetchSetup();
      } else {
        setSaveResult({
          success: false,
          message: data.error || "Failed to save payment setup.",
        });
      }
    } catch {
      setSaveResult({
        success: false,
        message: "Network error saving payment setup.",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 rounded-2xl bg-[#0B0E18]/70 border border-white/[0.08] text-center space-y-3">
        <RefreshCw className="w-6 h-6 animate-spin text-[#6366F1] mx-auto" />
        <p className="text-xs font-mono text-[#94A3B8]">Loading encrypted payment configuration...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Card */}
      <div className="p-6 rounded-2xl bg-[#0B0E18]/70 backdrop-blur-md border border-white/[0.08] shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-4 mb-6">
          <div className="space-y-1">
            <div className="text-[10px] font-mono uppercase tracking-wider text-[#6366F1] font-bold flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" />
              <span>Zero-Exposure Key Vault</span>
            </div>
            <h2 className="text-xl font-bold font-display text-[#F8FAFC]">
              Institutional Payment Gateway Setup
            </h2>
            <p className="text-xs text-[#94A3B8] max-w-xl">
              Configure your college or company Razorpay API credentials and UPI QR code. Student registration fees will be directly credited to your institutional bank account.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`px-3 py-1 rounded-full text-[11px] font-mono font-extrabold border ${
                setup.isConfigured
                  ? "bg-[#6366F1]/20 text-[#818CF8] border-[#6366F1]/40"
                  : "bg-amber-500/10 text-amber-300 border-amber-500/30"
              }`}
            >
              {setup.isConfigured ? "CONFIGURED FOR PUBLISH" : "SETUP REQUIRED"}
            </span>
          </div>
        </div>

        {/* Warning if not configured */}
        {!setup.isConfigured && (
          <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-3 text-xs text-amber-200">
            <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong>Publication Gate Notice:</strong> To publish a hackathon with an entry fee, HackBridge requires either verified Razorpay API keys or a valid UPI QR code configured below.
            </p>
          </div>
        )}

        {/* Status Alerts */}
        {testResult && (
          <div
            className={`mb-6 p-4 rounded-xl border flex items-start gap-3 text-xs ${
              testResult.success
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-200"
                : "bg-rose-500/10 border-rose-500/30 text-rose-200"
            }`}
          >
            {testResult.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
            )}
            <p className="leading-relaxed">{testResult.message}</p>
          </div>
        )}

        {saveResult && (
          <div
            className={`mb-6 p-4 rounded-xl border flex items-start gap-3 text-xs ${
              saveResult.success
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-200"
                : "bg-rose-500/10 border-rose-500/30 text-rose-200"
            }`}
          >
            {saveResult.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
            )}
            <p className="leading-relaxed">{saveResult.message}</p>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          {/* Section 1: Razorpay Automated Gateway */}
          <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-4">
            <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-[#F8FAFC]">
              <CreditCard className="w-4 h-4 text-[#6366F1]" />
              <span>Razorpay API Credentials (Primary Instant Gateway)</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-mono text-[#94A3B8] uppercase">
                  Razorpay Key ID
                </label>
                <input
                  type="text"
                  value={keyIdInput}
                  onChange={(e) => setKeyIdInput(e.target.value)}
                  placeholder="rzp_test_... or rzp_live_..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#111524] border border-white/[0.08] text-white placeholder-[#64748B] text-xs font-mono focus:outline-none focus:border-[#6366F1]/50"
                />
                {setup.maskedKeyId && (
                  <p className="text-[10px] font-mono text-[#64748B]">
                    Active Saved: {setup.maskedKeyId}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-mono text-[#94A3B8] uppercase">
                    Razorpay Key Secret
                  </label>
                  {setup.hasSecret && (
                    <span className="text-[10px] font-mono text-emerald-400 font-bold">
                      ✓ Encrypted On Server
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type={showSecret ? "text" : "password"}
                    value={keySecretInput}
                    onChange={(e) => setKeySecretInput(e.target.value)}
                    placeholder={
                      setup.hasSecret
                        ? "•••••••••••••••• (Leave blank to keep existing)"
                        : "Enter your Razorpay Key Secret"
                    }
                    className="w-full px-3.5 py-2.5 pr-10 rounded-xl bg-[#111524] border border-white/[0.08] text-white placeholder-[#64748B] text-xs font-mono focus:outline-none focus:border-[#6366F1]/50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecret(!showSecret)}
                    className="absolute right-3 top-2.5 text-[#64748B] hover:text-white"
                  >
                    {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[10px] font-mono text-[#64748B]">
                  AES-256 encrypted before persistence. Never exposed in API payloads.
                </p>
              </div>
            </div>

            <div className="pt-2 flex justify-start">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testing || (!keyIdInput && !setup.razorpayKeyId)}
                className="px-4 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-white font-mono text-xs flex items-center gap-2 transition-colors disabled:opacity-50"
              >
                {testing ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#818CF8]" />
                ) : (
                  <Zap className="w-3.5 h-3.5 text-[#818CF8]" />
                )}
                {testing ? "Testing Handshake..." : "Test Connection"}
              </button>
            </div>
          </div>

          {/* Section 2: UPI QR & Manual Verification */}
          <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-[#F8FAFC]">
                <QrCode className="w-4 h-4 text-[#818CF8]" />
                <span>UPI ID &amp; Payment QR Code Setup</span>
              </div>

              {/* Dual Mode Switcher Tabs */}
              <div className="flex items-center gap-1 bg-[#111524] p-1 rounded-xl border border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => setQrMode("AUTOGEN")}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-mono font-semibold flex items-center gap-1.5 transition-all ${
                    qrMode === "AUTOGEN"
                      ? "bg-[#6366F1] text-white shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Sparkles className="w-3 h-3" /> Auto-Generate
                </button>
                <button
                  type="button"
                  onClick={() => setQrMode("UPLOAD")}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-mono font-semibold flex items-center gap-1.5 transition-all ${
                    qrMode === "UPLOAD"
                      ? "bg-[#6366F1] text-white shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Upload className="w-3 h-3" /> Upload Custom
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-mono text-[#94A3B8] uppercase font-semibold flex items-center gap-2">
                    <span>Receiving UPI ID *</span>
                    <span className="text-[9px] text-[#818CF8] bg-[#6366F1]/10 px-1.5 py-0.5 rounded">Compulsory</span>
                  </label>
                  {upiIdInput && (
                    <span className="text-[10px] font-mono">
                      {isValidUpiId(upiIdInput) ? (
                        <span className="text-emerald-400 flex items-center gap-1">
                          <Check className="w-3 h-3" /> Valid VPA
                        </span>
                      ) : (
                        <span className="text-red-400">Invalid handle</span>
                      )}
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  value={upiIdInput}
                  onChange={(e) => setUpiIdInput(e.target.value)}
                  placeholder="e.g. collegecouncil@oksbi or organizer@upi"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#111524] border border-white/[0.08] text-white placeholder-[#64748B] text-xs font-mono focus:outline-none focus:border-[#6366F1]/50"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-mono text-[#94A3B8] uppercase font-semibold">
                  Beneficiary Account / Organization Name
                </label>
                <input
                  type="text"
                  value={bankAccountNameInput}
                  onChange={(e) => setBankAccountNameInput(e.target.value)}
                  placeholder="e.g. Dept of CS, MIT College"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#111524] border border-white/[0.08] text-white placeholder-[#64748B] text-xs focus:outline-none focus:border-[#6366F1]/50"
                />
              </div>
            </div>

            {/* Hidden file input for custom QR upload */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleQrFileUpload(file);
              }}
            />

            {/* Mode 1: Auto-Generated Live QR */}
            {qrMode === "AUTOGEN" && (
              <div className="p-4 rounded-xl bg-[#111524]/60 border border-white/[0.06]">
                {isValidUpiId(upiIdInput) ? (
                  <div className="flex flex-col sm:flex-row items-center gap-5">
                    <div className="relative flex-shrink-0">
                      <div className="w-36 h-36 bg-white p-2 rounded-2xl shadow-xl flex items-center justify-center border border-white/20">
                        {generatingQr ? (
                          <div className="flex flex-col items-center justify-center text-slate-800 text-xs font-mono gap-1">
                            <RefreshCw className="w-5 h-5 animate-spin text-[#6366F1]" />
                            <span className="text-[10px]">Generating...</span>
                          </div>
                        ) : qrImageUrlInput ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={qrImageUrlInput}
                            alt="Auto-generated Host UPI QR"
                            className="w-full h-full object-contain rounded-lg"
                          />
                        ) : (
                          <QrCode className="w-12 h-12 text-slate-400" />
                        )}
                      </div>
                      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-[#6366F1] text-[8px] font-mono text-white font-bold whitespace-nowrap shadow-md flex items-center gap-1">
                        <Sparkles className="w-2.5 h-2.5" /> Auto-Generated
                      </div>
                    </div>

                    <div className="flex-1 space-y-2 text-left">
                      <div className="text-[10px] font-mono text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1">
                        <Check className="w-3 h-3" /> Auto-Generated from UPI VPA
                      </div>
                      <div className="text-xs text-white font-semibold">
                        NPCI Standard UPI QR Link
                      </div>
                      <p className="text-[11px] font-mono text-slate-400 leading-relaxed">
                        Linked directly to <strong className="text-slate-200">{upiIdInput}</strong> ({bankAccountNameInput || "Host Organizer"}). Student squads scanning this in PhonePe, GPay, or Paytm will get your payee details pre-filled.
                      </p>
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={copyUpiId}
                          className="px-2.5 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 text-slate-300 text-[10px] font-mono flex items-center gap-1.5 transition-colors"
                        >
                          {copiedUpi ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          {copiedUpi ? "Copied" : "Copy UPI ID"}
                        </button>
                        <button
                          type="button"
                          onClick={downloadQrCode}
                          disabled={!qrImageUrlInput}
                          className="px-2.5 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 text-slate-300 text-[10px] font-mono flex items-center gap-1.5 transition-colors disabled:opacity-40"
                        >
                          <Download className="w-3 h-3" /> Download PNG
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="py-4 px-3 text-center space-y-1.5">
                    <QrCode className="w-8 h-8 text-slate-500 mx-auto" />
                    <div className="text-xs font-mono text-slate-300 font-semibold">
                      Enter UPI ID to Auto-Generate QR
                    </div>
                    <p className="text-[10px] font-mono text-slate-500">
                      Type your institutional UPI handle above (e.g. organizer@oksbi).
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Mode 2: Custom Uploaded QR */}
            {qrMode === "UPLOAD" && (
              <div className="space-y-3">
                {qrImageUrlInput ? (
                  <div className="p-4 rounded-xl bg-[#111524]/60 border border-white/[0.06] flex flex-col sm:flex-row items-center gap-5">
                    <div className="relative flex-shrink-0">
                      <div className="w-36 h-36 bg-white p-2 rounded-2xl shadow-xl flex items-center justify-center border border-white/20">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={qrImageUrlInput}
                          alt="Custom Merchant QR"
                          className="w-full h-full object-contain rounded-lg"
                        />
                      </div>
                      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-emerald-600 text-[8px] font-mono text-white font-bold whitespace-nowrap shadow-md flex items-center gap-1">
                        <Check className="w-2.5 h-2.5" /> Custom QR Active
                      </div>
                    </div>

                    <div className="flex-1 space-y-2 text-left">
                      <div className="text-[10px] font-mono text-emerald-400 font-bold uppercase tracking-wider">
                        Custom QR Image Uploaded
                      </div>
                      <p className="text-[11px] font-mono text-slate-400 leading-relaxed">
                        This merchant QR code image will be displayed to all student teams paying registration fees for your hackathons.
                      </p>
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 text-white text-[11px] font-mono flex items-center gap-1.5 transition-colors"
                        >
                          <Upload className="w-3 h-3" /> Replace Image
                        </button>
                        <button
                          type="button"
                          onClick={() => setQrImageUrlInput("")}
                          className="px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-300 text-[11px] font-mono transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const file = e.dataTransfer.files?.[0];
                      if (file) handleQrFileUpload(file);
                    }}
                    className="p-6 rounded-xl bg-[#111524]/40 border-2 border-dashed border-white/10 hover:border-[#6366F1]/50 cursor-pointer text-center space-y-2 transition-colors group"
                  >
                    <Upload className="w-6 h-6 text-[#818CF8] mx-auto group-hover:scale-105 transition-transform" />
                    <div className="text-xs font-mono text-white font-semibold">
                      Click to browse or drag &amp; drop QR Code image
                    </div>
                    <p className="text-[10px] font-mono text-slate-500">
                      Supports PNG, JPG, or WebP (max 5MB)
                    </p>
                  </div>
                )}

                {uploadError && (
                  <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-300 font-mono flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {uploadError}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-[11px] font-mono text-[#64748B]">
              Changes take effect immediately across all published arenas
            </span>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-[#6366F1] hover:bg-[#4F46E5] text-white font-bold text-xs uppercase tracking-wider transition-colors disabled:opacity-50 flex items-center gap-2 shadow-sm"
            >
              {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
              {saving ? "Saving..." : "Save Payment Credentials"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
