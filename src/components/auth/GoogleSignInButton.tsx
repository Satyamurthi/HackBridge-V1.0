"use client";

import React, { useState } from "react";
import { AlertCircle } from "lucide-react";

interface GoogleSignInButtonProps {
  role?: "STUDENT" | "HOST" | "JUDGE";
  orgType?: "college" | "company";
  action?: "login" | "register";
  className?: string;
  label?: string;
}

export default function GoogleSignInButton({
  role = "STUDENT",
  orgType,
  action = "login",
  className = "",
  label,
}: GoogleSignInButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleClick = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        role,
        action,
      });
      if (orgType) {
        params.set("orgType", orgType);
      }

      const res = await fetch(`/api/v1/auth/google/url?${params.toString()}`);
      const data = await res.json();

      if (!res.ok || !data.configured) {
        setError(
          data.error ||
            "Google sign-in is not configured on this environment. Please ensure GOOGLE_CLIENT_ID is set in .env."
        );
        setLoading(false);
        return;
      }

      // Redirect to Google's OAuth consent screen
      window.location.href = data.url;
    } catch {
      setError("Network error connecting to Google authentication service.");
      setLoading(false);
    }
  };

  const defaultLabel =
    label || (action === "register" ? "Sign up with Google" : "Continue with Google");

  return (
    <div className="w-full space-y-2">
      <button
        type="button"
        onClick={handleGoogleClick}
        disabled={loading}
        className={`w-full py-3 px-4 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.12] hover:border-[#6366F1]/50 text-[#F8FAFC] font-semibold text-xs flex items-center justify-center gap-3 transition-all backdrop-blur-md shadow-sm active:scale-[0.99] disabled:opacity-60 cursor-pointer ${className}`}
      >
        {loading ? (
          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
        )}
        <span>{defaultLabel}</span>
      </button>

      {error && (
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs font-mono text-amber-300 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
          <span className="text-[11px] leading-relaxed">{error}</span>
        </div>
      )}
    </div>
  );
}
