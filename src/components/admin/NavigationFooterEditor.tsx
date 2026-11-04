"use client";

import React, { useState, useEffect } from "react";
import {
  Save,
  RotateCcw,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Globe,
  Compass,
  Layout,
  ExternalLink,
  Phone,
  Mail,
  Shield,
  Megaphone,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  DEFAULT_SITE_NAVIGATION,
  SiteNavigationConfig,
  NavbarConfig,
  FooterConfig,
  NavLinkItem,
  FooterColumn,
  FooterSocialLink,
} from "@/lib/navigation-defaults";

export default function NavigationFooterEditor() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [navbar, setNavbar] = useState<NavbarConfig>(DEFAULT_SITE_NAVIGATION.navbar);
  const [footer, setFooter] = useState<FooterConfig>(DEFAULT_SITE_NAVIGATION.footer);
  const [activeSubTab, setActiveSubTab] = useState<"navbar" | "footer">("navbar");

  // Load active navigation configuration
  useEffect(() => {
    fetch("/api/v1/content/navigation")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: SiteNavigationConfig | null) => {
        if (data) {
          if (data.navbar) setNavbar(data.navbar);
          if (data.footer) setFooter(data.footer);
        }
      })
      .catch(() => {
        setFeedback({ type: "error", text: "Failed to load live navigation configuration." });
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/v1/content/navigation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ navbar, footer }),
      });

      const data = await res.json();
      if (!res.ok) {
        setFeedback({ type: "error", text: data.error || "Failed to update configuration." });
        return;
      }

      setFeedback({
        type: "success",
        text: `Navbar and Footer updated successfully! Changes are live across the site.`,
      });
      setTimeout(() => setFeedback(null), 5000);
    } catch {
      setFeedback({ type: "error", text: "Network error saving navigation configuration." });
    } finally {
      setSaving(false);
    }
  };

  const handleResetDefaults = () => {
    if (!confirm("Are you sure you want to revert Navbar & Footer to protocol defaults?")) return;
    setNavbar(DEFAULT_SITE_NAVIGATION.navbar);
    setFooter(DEFAULT_SITE_NAVIGATION.footer);
    setFeedback({ type: "success", text: "Restored defaults in editor. Click 'Save' to apply live." });
  };

  // Nav link helpers
  const handleUpdateNavLink = (
    key: "publicNavLinks" | "studentNavLinks" | "hostNavLinks" | "judgeNavLinks" | "adminNavLinks",
    index: number,
    field: "label" | "href",
    val: string
  ) => {
    setNavbar((prev) => {
      const list = [...(prev[key] || [])];
      list[index] = { ...list[index], [field]: val };
      return { ...prev, [key]: list };
    });
  };

  const handleAddNavLink = (key: "publicNavLinks" | "studentNavLinks" | "hostNavLinks" | "judgeNavLinks" | "adminNavLinks") => {
    setNavbar((prev) => ({
      ...prev,
      [key]: [...(prev[key] || []), { label: "New Link", href: "/" }],
    }));
  };

  const handleRemoveNavLink = (
    key: "publicNavLinks" | "studentNavLinks" | "hostNavLinks" | "judgeNavLinks" | "adminNavLinks",
    index: number
  ) => {
    setNavbar((prev) => ({
      ...prev,
      [key]: (prev[key] || []).filter((_, i) => i !== index),
    }));
  };

  // Footer column helpers
  const handleAddFooterColumn = () => {
    setFooter((prev) => ({
      ...prev,
      columns: [
        ...(prev.columns || []),
        {
          title: "New Column",
          links: [{ label: "New Link", href: "/" }],
        },
      ],
    }));
  };

  const handleRemoveFooterColumn = (colIndex: number) => {
    if (!confirm("Remove this entire footer column?")) return;
    setFooter((prev) => ({
      ...prev,
      columns: (prev.columns || []).filter((_, i) => i !== colIndex),
    }));
  };

  const handleUpdateColumnTitle = (colIndex: number, title: string) => {
    setFooter((prev) => {
      const cols = [...(prev.columns || [])];
      cols[colIndex] = { ...cols[colIndex], title };
      return { ...prev, columns: cols };
    });
  };

  const handleAddColumnLink = (colIndex: number) => {
    setFooter((prev) => {
      const cols = [...(prev.columns || [])];
      cols[colIndex] = {
        ...cols[colIndex],
        links: [...cols[colIndex].links, { label: "New Link", href: "/" }],
      };
      return { ...prev, columns: cols };
    });
  };

  const handleUpdateColumnLink = (
    colIndex: number,
    linkIndex: number,
    field: "label" | "href",
    val: string
  ) => {
    setFooter((prev) => {
      const cols = [...(prev.columns || [])];
      const links = [...cols[colIndex].links];
      links[linkIndex] = { ...links[linkIndex], [field]: val };
      cols[colIndex] = { ...cols[colIndex], links };
      return { ...prev, columns: cols };
    });
  };

  const handleRemoveColumnLink = (colIndex: number, linkIndex: number) => {
    setFooter((prev) => {
      const cols = [...(prev.columns || [])];
      cols[colIndex] = {
        ...cols[colIndex],
        links: cols[colIndex].links.filter((_, i) => i !== linkIndex),
      };
      return { ...prev, columns: cols };
    });
  };

  // Social link helpers
  const handleAddSocialLink = () => {
    setFooter((prev) => ({
      ...prev,
      socialLinks: [...(prev.socialLinks || []), { platform: "github", url: "https://github.com" }],
    }));
  };

  const handleUpdateSocialLink = (index: number, field: "platform" | "url", val: string) => {
    setFooter((prev) => {
      const list = [...(prev.socialLinks || [])];
      list[index] = { ...list[index], [field]: val };
      return { ...prev, socialLinks: list };
    });
  };

  const handleRemoveSocialLink = (index: number) => {
    setFooter((prev) => ({
      ...prev,
      socialLinks: (prev.socialLinks || []).filter((_, i) => i !== index),
    }));
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-xs font-mono text-[#64748B]">
        Loading navigation and footer settings...
      </div>
    );
  }

  return (
    <div className="bg-[#0B0E18]/70 backdrop-blur-md border border-white/[0.08] rounded-2xl p-6 space-y-6 shadow-sm font-mono text-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-[#6366F1] uppercase tracking-wider mb-1">
            <Compass className="w-3.5 h-3.5" />
            <span>Dynamic Layout Engine</span>
          </div>
          <h2 className="text-base font-bold text-[#F8FAFC]">
            Navigation Bar &amp; Footer Visual Editor
          </h2>
          <p className="text-[11px] text-[#94A3B8] mt-0.5">
            Modify brand identity, announcement banner, header links, footer columns, contact details, and copyright live.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleResetDefaults}
            className="px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/10 text-[#94A3B8] hover:text-[#F8FAFC] transition-colors flex items-center gap-1.5"
            title="Reset to protocol defaults"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-1.5 rounded-xl bg-[#6366F1] text-white font-bold hover:bg-[#4F46E5] disabled:opacity-50 transition-colors flex items-center gap-2 shadow-sm"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saving ? "Saving..." : "Save Live"}</span>
          </button>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-3 rounded-xl border flex items-center gap-2 animate-fade-in ${
            feedback.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
              : "bg-red-500/10 border-red-500/20 text-red-400"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Sub-Tabs: Navbar vs Footer */}
      <div className="flex items-center gap-2 border-b border-white/[0.08] pb-3">
        <button
          onClick={() => setActiveSubTab("navbar")}
          className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-2 text-xs ${
            activeSubTab === "navbar"
              ? "bg-[#6366F1] text-white font-bold"
              : "text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-white/[0.04]"
          }`}
        >
          <Compass className="w-3.5 h-3.5" />
          <span>Navbar &amp; Announcement</span>
        </button>
        <button
          onClick={() => setActiveSubTab("footer")}
          className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-2 text-xs ${
            activeSubTab === "footer"
              ? "bg-[#6366F1] text-white font-bold"
              : "text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-white/[0.04]"
          }`}
        >
          <Layout className="w-3.5 h-3.5" />
          <span>Footer &amp; Contact Info</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* NAVBAR SETTINGS */}
      {/* ========================================================================= */}
      {activeSubTab === "navbar" && (
        <div className="space-y-6">
          {/* Brand Identity */}
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-4">
            <div className="text-[11px] font-bold uppercase text-[#818CF8]">
              Header Branding &amp; Monogram
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] text-[#64748B] uppercase mb-1">
                  Brand Name
                </label>
                <input
                  type="text"
                  value={navbar.brandName || ""}
                  onChange={(e) => setNavbar({ ...navbar, brandName: e.target.value })}
                  placeholder="HackBridge"
                  className="w-full px-3 py-1.5 rounded-lg bg-[#111524] border border-white/10 text-white placeholder-[#64748B] focus:outline-none focus:border-[#6366F1]"
                />
              </div>

              <div>
                <label className="block text-[10px] text-[#64748B] uppercase mb-1">
                  Version Tag
                </label>
                <input
                  type="text"
                  value={navbar.versionTag || ""}
                  onChange={(e) => setNavbar({ ...navbar, versionTag: e.target.value })}
                  placeholder="v1.0"
                  className="w-full px-3 py-1.5 rounded-lg bg-[#111524] border border-white/10 text-white placeholder-[#64748B] focus:outline-none focus:border-[#6366F1]"
                />
              </div>

              <div>
                <label className="block text-[10px] text-[#64748B] uppercase mb-1">
                  Brand Logo Asset URL
                </label>
                <input
                  type="text"
                  value={navbar.brandLogoUrl || ""}
                  onChange={(e) => setNavbar({ ...navbar, brandLogoUrl: e.target.value })}
                  placeholder="/brand/hackbridge-mark.png"
                  className="w-full px-3 py-1.5 rounded-lg bg-[#111524] border border-white/10 text-white placeholder-[#64748B] focus:outline-none focus:border-[#6366F1]"
                />
              </div>
            </div>
          </div>

          {/* Top Announcement Bar */}
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-amber-400" />
                <span className="text-[11px] font-bold uppercase text-[#F8FAFC]">
                  Top Announcement Strip
                </span>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={navbar.announcement?.enabled || false}
                  onChange={(e) =>
                    setNavbar({
                      ...navbar,
                      announcement: {
                        ...(navbar.announcement || { text: "", link: "" }),
                        enabled: e.target.checked,
                      },
                    })
                  }
                  className="rounded border-white/20 bg-[#111524] text-[#6366F1] focus:ring-0"
                />
                <span className="text-[11px] text-[#94A3B8]">Show Banner</span>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] text-[#64748B] uppercase mb-1">
                  Banner Text
                </label>
                <input
                  type="text"
                  value={navbar.announcement?.text || ""}
                  onChange={(e) =>
                    setNavbar({
                      ...navbar,
                      announcement: {
                        ...(navbar.announcement || { enabled: false }),
                        text: e.target.value,
                      },
                    })
                  }
                  placeholder="e.g. National Hackathon Registrations Are Now Live!"
                  className="w-full px-3 py-1.5 rounded-lg bg-[#111524] border border-white/10 text-white placeholder-[#64748B] focus:outline-none focus:border-[#6366F1]"
                />
              </div>

              <div>
                <label className="block text-[10px] text-[#64748B] uppercase mb-1">
                  Action Link URL (Optional)
                </label>
                <input
                  type="text"
                  value={navbar.announcement?.link || ""}
                  onChange={(e) =>
                    setNavbar({
                      ...navbar,
                      announcement: {
                        ...(navbar.announcement || { enabled: false }),
                        link: e.target.value,
                      },
                    })
                  }
                  placeholder="/hackathons"
                  className="w-full px-3 py-1.5 rounded-lg bg-[#111524] border border-white/10 text-white placeholder-[#64748B] focus:outline-none focus:border-[#6366F1]"
                />
              </div>
            </div>
          </div>

          {/* Public Navigation Links */}
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[11px] font-bold uppercase text-[#818CF8]">
                  Public Header Links (Logged Out)
                </div>
                <div className="text-[10px] text-[#64748B]">
                  Links displayed to prospective participants and campus visitors.
                </div>
              </div>
              <button
                onClick={() => handleAddNavLink("publicNavLinks")}
                className="px-2.5 py-1 rounded bg-[#6366F1]/20 border border-[#6366F1]/40 text-[#818CF8] hover:bg-[#6366F1]/30 text-[10px] font-bold flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Add Link
              </button>
            </div>

            <div className="space-y-2">
              {(navbar.publicNavLinks || []).map((link, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="text-[10px] text-[#64748B] w-5">#{idx + 1}</span>
                  <input
                    type="text"
                    value={link.label}
                    onChange={(e) => handleUpdateNavLink("publicNavLinks", idx, "label", e.target.value)}
                    placeholder="Label"
                    className="flex-1 px-3 py-1.5 rounded-lg bg-[#111524] border border-white/10 text-white placeholder-[#64748B] focus:outline-none focus:border-[#6366F1]"
                  />
                  <input
                    type="text"
                    value={link.href}
                    onChange={(e) => handleUpdateNavLink("publicNavLinks", idx, "href", e.target.value)}
                    placeholder="/path"
                    className="flex-1 px-3 py-1.5 rounded-lg bg-[#111524] border border-white/10 text-[#818CF8] placeholder-[#64748B] focus:outline-none focus:border-[#6366F1]"
                  />
                  <button
                    onClick={() => handleRemoveNavLink("publicNavLinks", idx)}
                    className="p-1.5 rounded bg-red-500/10 hover:bg-red-500/20 text-red-400"
                    title="Remove Link"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Student Dashboard Nav Links */}
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[11px] font-bold uppercase text-[#818CF8]">
                  Student App Header Links
                </div>
                <div className="text-[10px] text-[#64748B]">
                  Navigation bar items displayed for authenticated students.
                </div>
              </div>
              <button
                onClick={() => handleAddNavLink("studentNavLinks")}
                className="px-2.5 py-1 rounded bg-[#6366F1]/20 border border-[#6366F1]/40 text-[#818CF8] hover:bg-[#6366F1]/30 text-[10px] font-bold flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Add Link
              </button>
            </div>

            <div className="space-y-2">
              {(navbar.studentNavLinks || []).map((link, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="text-[10px] text-[#64748B] w-5">#{idx + 1}</span>
                  <input
                    type="text"
                    value={link.label}
                    onChange={(e) => handleUpdateNavLink("studentNavLinks", idx, "label", e.target.value)}
                    placeholder="Label"
                    className="flex-1 px-3 py-1.5 rounded-lg bg-[#111524] border border-white/10 text-white placeholder-[#64748B] focus:outline-none focus:border-[#6366F1]"
                  />
                  <input
                    type="text"
                    value={link.href}
                    onChange={(e) => handleUpdateNavLink("studentNavLinks", idx, "href", e.target.value)}
                    placeholder="/path"
                    className="flex-1 px-3 py-1.5 rounded-lg bg-[#111524] border border-white/10 text-[#818CF8] placeholder-[#64748B] focus:outline-none focus:border-[#6366F1]"
                  />
                  <button
                    onClick={() => handleRemoveNavLink("studentNavLinks", idx)}
                    className="p-1.5 rounded bg-red-500/10 hover:bg-red-500/20 text-red-400"
                    title="Remove Link"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* FOOTER SETTINGS */}
      {/* ========================================================================= */}
      {activeSubTab === "footer" && (
        <div className="space-y-6">
          {/* Company / Brand Blurb & Status */}
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-4">
            <div className="text-[11px] font-bold uppercase text-[#818CF8]">
              Footer Platform Info &amp; Operational Status
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] text-[#64748B] uppercase mb-1">
                  Footer Brand Name
                </label>
                <input
                  type="text"
                  value={footer.brandName || ""}
                  onChange={(e) => setFooter({ ...footer, brandName: e.target.value })}
                  placeholder="HackBridge"
                  className="w-full px-3 py-1.5 rounded-lg bg-[#111524] border border-white/10 text-white placeholder-[#64748B] focus:outline-none focus:border-[#6366F1]"
                />
              </div>

              <div>
                <label className="block text-[10px] text-[#64748B] uppercase mb-1">
                  Platform Description / Blurb
                </label>
                <textarea
                  rows={2}
                  value={footer.brandDescription || ""}
                  onChange={(e) => setFooter({ ...footer, brandDescription: e.target.value })}
                  placeholder="Collegiate engineering infrastructure..."
                  className="w-full px-3 py-1.5 rounded-lg bg-[#111524] border border-white/10 text-white placeholder-[#64748B] focus:outline-none focus:border-[#6366F1]"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] text-[#64748B] uppercase mb-1">
                    Operational Status Strip
                  </label>
                  <input
                    type="text"
                    value={footer.statusText || ""}
                    onChange={(e) => setFooter({ ...footer, statusText: e.target.value })}
                    placeholder="Core Protocol Operational · v1.0.4 Production"
                    className="w-full px-3 py-1.5 rounded-lg bg-[#111524] border border-white/10 text-white placeholder-[#64748B] focus:outline-none focus:border-[#6366F1]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-[#64748B] uppercase mb-1">
                    Direct Contact Phone
                  </label>
                  <input
                    type="text"
                    value={footer.contactPhone || ""}
                    onChange={(e) => setFooter({ ...footer, contactPhone: e.target.value })}
                    placeholder="9380968402"
                    className="w-full px-3 py-1.5 rounded-lg bg-[#111524] border border-white/10 text-white placeholder-[#64748B] focus:outline-none focus:border-[#6366F1]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-[#64748B] uppercase mb-1">
                    Support / Admin Email
                  </label>
                  <input
                    type="text"
                    value={footer.contactEmail || ""}
                    onChange={(e) => setFooter({ ...footer, contactEmail: e.target.value })}
                    placeholder="admin@hackbridge.tech"
                    className="w-full px-3 py-1.5 rounded-lg bg-[#111524] border border-white/10 text-white placeholder-[#64748B] focus:outline-none focus:border-[#6366F1]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Footer Navigation Columns */}
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[11px] font-bold uppercase text-[#818CF8]">
                  Footer Navigation Columns
                </div>
                <div className="text-[10px] text-[#64748B]">
                  Organize links under custom column categories.
                </div>
              </div>
              <button
                onClick={handleAddFooterColumn}
                className="px-2.5 py-1 rounded bg-[#6366F1]/20 border border-[#6366F1]/40 text-[#818CF8] hover:bg-[#6366F1]/30 text-[10px] font-bold flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Add Column
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(footer.columns || []).map((col, cIdx) => (
                <div key={cIdx} className="p-3 rounded-lg bg-[#111524]/70 border border-white/10 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <input
                      type="text"
                      value={col.title}
                      onChange={(e) => handleUpdateColumnTitle(cIdx, e.target.value)}
                      placeholder="Column Title"
                      className="px-2 py-1 rounded bg-[#0B0E18] border border-white/10 text-white font-bold text-xs flex-1 focus:outline-none focus:border-[#6366F1]"
                    />
                    <button
                      onClick={() => handleRemoveFooterColumn(cIdx)}
                      className="p-1 rounded text-[#64748B] hover:text-red-400"
                      title="Delete Column"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    {col.links.map((link, lIdx) => (
                      <div key={lIdx} className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={link.label}
                          onChange={(e) => handleUpdateColumnLink(cIdx, lIdx, "label", e.target.value)}
                          placeholder="Label"
                          className="w-1/2 px-2 py-1 rounded bg-[#0B0E18] border border-white/5 text-[11px] text-white focus:outline-none focus:border-[#6366F1]"
                        />
                        <input
                          type="text"
                          value={link.href}
                          onChange={(e) => handleUpdateColumnLink(cIdx, lIdx, "href", e.target.value)}
                          placeholder="/path"
                          className="w-1/2 px-2 py-1 rounded bg-[#0B0E18] border border-white/5 text-[11px] text-[#818CF8] focus:outline-none focus:border-[#6366F1]"
                        />
                        <button
                          onClick={() => handleRemoveColumnLink(cIdx, lIdx)}
                          className="p-1 rounded text-[#64748B] hover:text-red-400"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => handleAddColumnLink(cIdx)}
                    className="w-full py-1 rounded bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 text-[10px] text-[#94A3B8] hover:text-[#F8FAFC] flex items-center justify-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Add Link
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Copyright, Bottom Notice & Socials */}
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-4">
            <div className="text-[11px] font-bold uppercase text-[#818CF8]">
              Legal Notice, Copyright &amp; Social Profiles
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] text-[#64748B] uppercase mb-1">
                  Copyright Text
                </label>
                <input
                  type="text"
                  value={footer.copyrightText || ""}
                  onChange={(e) => setFooter({ ...footer, copyrightText: e.target.value })}
                  placeholder="© 2026 HackBridge. All rights reserved."
                  className="w-full px-3 py-1.5 rounded-lg bg-[#111524] border border-white/10 text-white placeholder-[#64748B] focus:outline-none focus:border-[#6366F1]"
                />
              </div>

              <div>
                <label className="block text-[10px] text-[#64748B] uppercase mb-1">
                  Bottom Compliance / Protocol Badge
                </label>
                <input
                  type="text"
                  value={footer.bottomNotice || ""}
                  onChange={(e) => setFooter({ ...footer, bottomNotice: e.target.value })}
                  placeholder="Institutional Integrity Secured · Strict Anti-AI-Tells Design System"
                  className="w-full px-3 py-1.5 rounded-lg bg-[#111524] border border-white/10 text-white placeholder-[#64748B] focus:outline-none focus:border-[#6366F1]"
                />
              </div>
            </div>

            {/* Social Links */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-[#64748B] uppercase">Social Media Handles</span>
                <button
                  onClick={handleAddSocialLink}
                  className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-[10px] text-[#94A3B8] flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Add Social Profile
                </button>
              </div>

              {(footer.socialLinks || []).map((s, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={s.platform}
                    onChange={(e) => handleUpdateSocialLink(idx, "platform", e.target.value)}
                    placeholder="Platform (e.g. github, twitter, discord)"
                    className="w-1/3 px-3 py-1.5 rounded-lg bg-[#111524] border border-white/10 text-white focus:outline-none focus:border-[#6366F1]"
                  />
                  <input
                    type="text"
                    value={s.url}
                    onChange={(e) => handleUpdateSocialLink(idx, "url", e.target.value)}
                    placeholder="https://..."
                    className="flex-1 px-3 py-1.5 rounded-lg bg-[#111524] border border-white/10 text-[#818CF8] focus:outline-none focus:border-[#6366F1]"
                  />
                  <button
                    onClick={() => handleRemoveSocialLink(idx)}
                    className="p-1.5 rounded bg-red-500/10 hover:bg-red-500/20 text-red-400"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
