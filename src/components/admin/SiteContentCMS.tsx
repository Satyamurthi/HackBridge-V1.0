"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  FileText,
  Save,
  Send,
  Eye,
  History,
  RotateCcw,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  CheckCircle2,
  AlertCircle,
  Code,
  Layers,
  Sparkles,
  ExternalLink,
  Sliders,
  Globe,
  Compass,
} from "lucide-react";
import NavigationFooterEditor from "@/components/admin/NavigationFooterEditor";

export interface SiteContentCMSProps {
  initialSection?: "pages" | "navigation";
}

interface SectionItem {
  id: string;
  type: string;
  visible: boolean;
  heading?: string;
  subheading?: string;
  bodyText?: string;
  buttonText?: string;
  buttonLink?: string;
  secondaryButtonText?: string;
  secondaryButtonLink?: string;
  metaTitle?: string;
  metaDescription?: string;
  badgePrefix?: string;
  badgeText?: string;
  badgeStatus?: string;
  showBadge?: boolean;
  items?: Array<any>;
}

interface PageContentRecord {
  id: string;
  key: string;
  jsonValue: string;
  draftJsonValue?: string | null;
  history?: string | null;
  version: number;
  published: boolean;
  updatedAt: string;
}

export default function SiteContentCMS({ initialSection = "pages" }: SiteContentCMSProps) {
  const [cmsSection, setCmsSection] = useState<"pages" | "navigation">(initialSection);

  useEffect(() => {
    if (initialSection) {
      setCmsSection(initialSection);
    }
  }, [initialSection]);

  const [pages, setPages] = useState<PageContentRecord[]>([]);
  const [selectedKey, setSelectedKey] = useState<string>("page_landing");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Active page section model
  const [sections, setSections] = useState<SectionItem[]>([]);
  const [version, setVersion] = useState<number>(1);
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [bgStatus, setBgStatus] = useState<"idle" | "saving" | "saved">("saved");
  const isInitialLoad = useRef(true);

  // View modes
  const [showCodeEditor, setShowCodeEditor] = useState(false);
  const [rawJsonText, setRawJsonText] = useState("");
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  const getPageLiveUrl = (key: string) => {
    switch (key) {
      case "page_landing":
        return "/";
      case "page_arenas":
        return "/hackathons";
      case "page_about":
        return "/about";
      case "page_docs":
        return "/docs";
      case "page_legal":
        return "/legal";
      default:
        return "/";
    }
  };

  const getPageTitle = (key: string) => {
    switch (key) {
      case "page_landing":
        return "Home (/)";
      case "page_arenas":
        return "Arenas (/hackathons)";
      case "page_about":
        return "About (/about)";
      case "page_docs":
        return "Docs (/docs)";
      case "page_legal":
        return "Legal (/legal)";
      case "page_404":
        return "404 Error";
      case "page_500":
        return "500 Error";
      default:
        return key.replace("page_", "").toUpperCase();
    }
  };

  const fetchPages = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/v1/admin/site-content");
      const data = await res.json();
      if (res.ok) {
        const list: PageContentRecord[] = data.contents || [];
        setPages(list);

        const current = list.find((p) => p.key === selectedKey) || list[0];
        if (current) {
          loadPageData(current);
        }
      }
    } catch {
      setFeedback({ type: "error", text: "Failed to connect to CMS API." });
    } finally {
      setLoading(false);
    }
  }, [selectedKey]);

  useEffect(() => {
    fetchPages();
  }, [fetchPages]);

  const loadPageData = (page: PageContentRecord) => {
    isInitialLoad.current = true;
    setSelectedKey(page.key);
    setVersion(page.version);

    // Prefer draft over published if draft exists
    const raw = page.draftJsonValue || page.jsonValue;
    setRawJsonText(raw);

    try {
      const parsed = JSON.parse(raw);
      setSections(Array.isArray(parsed) ? parsed : []);
    } catch {
      setSections([]);
    }

    if (page.history) {
      try {
        setHistoryList(JSON.parse(page.history));
      } catch {
        setHistoryList([]);
      }
    } else {
      setHistoryList([]);
    }
    lastSavedJsonRef.current = raw;
    setBgStatus("saved");
  };

  const lastSavedJsonRef = useRef<string>("");

  // Background Auto-Save to Drafts (debounced by 2000ms, only when content actually changes)
  useEffect(() => {
    if (isInitialLoad.current) {
      isInitialLoad.current = false;
      return;
    }
    if (!selectedKey || sections.length === 0) return;

    const jsonToSave = showCodeEditor ? rawJsonText : JSON.stringify(sections, null, 2);

    // Strict dirty check: If content matches what's already saved, avoid network overhead
    if (jsonToSave === lastSavedJsonRef.current) {
      return;
    }

    setBgStatus("saving");
    const timer = setTimeout(async () => {
      try {
        await fetch("/api/v1/admin/site-content", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            key: selectedKey,
            action: "SAVE_DRAFT",
            draftJsonValue: jsonToSave,
          }),
        });
        lastSavedJsonRef.current = jsonToSave;
        setBgStatus("saved");
      } catch {
        setBgStatus("idle");
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [sections, rawJsonText, selectedKey, showCodeEditor]);

  const handleSelectPage = (key: string) => {
    const found = pages.find((p) => p.key === key);
    if (found) {
      loadPageData(found);
      setFeedback(null);
    }
  };

  // Section manipulation
  const updateSection = (index: number, updates: Partial<SectionItem>) => {
    setSections((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...updates };
      setRawJsonText(JSON.stringify(next, null, 2));
      return next;
    });
  };

  const moveSection = (index: number, direction: "up" | "down") => {
    setSections((prev) => {
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;
      const next = [...prev];
      const temp = next[index];
      next[index] = next[targetIndex];
      next[targetIndex] = temp;
      setRawJsonText(JSON.stringify(next, null, 2));
      return next;
    });
  };

  const deleteSection = (index: number) => {
    if (!confirm("Are you sure you want to remove this section?")) return;
    setSections((prev) => {
      const next = prev.filter((_, i) => i !== index);
      setRawJsonText(JSON.stringify(next, null, 2));
      return next;
    });
  };

  const addSection = (type: string) => {
    const newSec: SectionItem = {
      id: `section_${Date.now()}`,
      type,
      visible: true,
      heading: type === "hero" ? "New Hero Headline" : type === "faq" ? "Frequently Asked Questions" : "Section Title",
      subheading: "Configure your descriptive content here.",
      items: type === "cards" 
        ? [{ title: "Card 1", description: "Details" }] 
        : type === "stats"
        ? [{ label: "New Metric", value: "1,000+" }]
        : type === "faq" 
        ? [{ question: "Question?", answer: "Answer" }] 
        : [],
    };
    setSections((prev) => {
      const next = [...prev, newSec];
      setRawJsonText(JSON.stringify(next, null, 2));
      return next;
    });
  };

  // Item manipulation inside sections
  const updateSectionItem = (secIdx: number, itemIdx: number, updates: any) => {
    setSections((prev) => {
      const next = [...prev];
      const items = [...(next[secIdx].items || [])];
      items[itemIdx] = { ...items[itemIdx], ...updates };
      next[secIdx] = { ...next[secIdx], items };
      setRawJsonText(JSON.stringify(next, null, 2));
      return next;
    });
  };

  const addSectionItem = (secIdx: number, defaultItem: any) => {
    setSections((prev) => {
      const next = [...prev];
      const items = [...(next[secIdx].items || []), defaultItem];
      next[secIdx] = { ...next[secIdx], items };
      setRawJsonText(JSON.stringify(next, null, 2));
      return next;
    });
  };

  const removeSectionItem = (secIdx: number, itemIdx: number) => {
    setSections((prev) => {
      const next = [...prev];
      const items = (next[secIdx].items || []).filter((_, i) => i !== itemIdx);
      next[secIdx] = { ...next[secIdx], items };
      setRawJsonText(JSON.stringify(next, null, 2));
      return next;
    });
  };

  // Primary Action: Save directly to Live Browser
  const handleSaveToLive = async () => {
    setSaving(true);
    setFeedback(null);
    try {
      const jsonToPublish = showCodeEditor ? rawJsonText : JSON.stringify(sections, null, 2);
      const res = await fetch("/api/v1/admin/site-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: selectedKey,
          action: "PUBLISH",
          jsonValue: jsonToPublish,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setFeedback({ type: "error", text: data.error || "Failed to publish live." });
      } else {
        setBgStatus("saved");
        const liveUrl = getPageLiveUrl(selectedKey);
        setFeedback({ 
          type: "success", 
          text: `Saved to Live! Version ${data.content?.version || version + 1} is now immediately active on the live website.` 
        });

        // Broadcast to all open client tabs for immediate portrayal
        if (typeof window !== "undefined" && "BroadcastChannel" in window) {
          try {
            const channel = new BroadcastChannel("hb_cms_sync");
            channel.postMessage({ type: "CMS_PUBLISHED", key: selectedKey, timestamp: Date.now() });
            channel.close();
          } catch {}
        }
        if (typeof window !== "undefined") {
          localStorage.setItem("hb_cms_last_published", String(Date.now()));
        }

        fetchPages();
      }
    } catch {
      setFeedback({ type: "error", text: "Network error saving to live." });
    } finally {
      setSaving(false);
      setTimeout(() => setFeedback(null), 6000);
    }
  };

  // Secondary Action: Save Draft Only (Private)
  const handleSaveDraft = async () => {
    setSaving(true);
    setFeedback(null);
    try {
      const jsonToSave = showCodeEditor ? rawJsonText : JSON.stringify(sections, null, 2);
      const res = await fetch("/api/v1/admin/site-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: selectedKey,
          action: "SAVE_DRAFT",
          draftJsonValue: jsonToSave,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setFeedback({ type: "error", text: data.error || "Failed to save draft." });
      } else {
        setFeedback({ type: "success", text: "Draft saved. (Click 'Save to Live' to push changes to visitors)." });
        fetchPages();
      }
    } catch {
      setFeedback({ type: "error", text: "Network error saving draft." });
    } finally {
      setSaving(false);
      setTimeout(() => setFeedback(null), 5000);
    }
  };

  // Rollback to previous version
  const handleRollback = async (targetVer: number) => {
    if (!confirm(`Rollback to version ${targetVer}? This will restore its published content live.`)) return;
    setSaving(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/v1/admin/site-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: selectedKey,
          action: "ROLLBACK",
          targetVersion: targetVer,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setFeedback({ type: "error", text: data.error || "Failed to rollback version." });
      } else {
        setFeedback({ type: "success", text: `Successfully rolled back to version ${targetVer} and pushed live.` });
        setShowHistoryModal(false);
        fetchPages();
      }
    } catch {
      setFeedback({ type: "error", text: "Network error during rollback." });
    } finally {
      setSaving(false);
      setTimeout(() => setFeedback(null), 5000);
    }
  };

  const livePageUrl = getPageLiveUrl(selectedKey);

  return (
    <div className="space-y-6 font-mono text-xs">
      {/* Site CMS Unified Header & Mode Switcher */}
      <div className="bg-[#0B0E18]/70 backdrop-blur-md border border-white/[0.08] rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-[#F8FAFC] tracking-tight">
              Site Content Management System (CMS)
            </h2>
            <span className="px-2 py-0.5 rounded bg-[#6366F1]/20 text-[#818CF8] text-[10px] font-bold border border-[#6366F1]/30">
              SUPER ADMIN
            </span>
          </div>
          <p className="text-[11px] text-[#94A3B8] mt-0.5">
            Manage public page content, global Navbar identity &amp; links, and multi-column Footer live from a single unified CMS.
          </p>
        </div>

        {/* CMS Mode Switcher Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-white/[0.03] border border-white/[0.08] rounded-xl self-start sm:self-auto shrink-0">
          <button
            onClick={() => setCmsSection("pages")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer ${
              cmsSection === "pages"
                ? "bg-[#6366F1] text-white font-bold shadow-sm"
                : "text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-white/[0.04]"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Public Pages CMS</span>
          </button>
          <button
            onClick={() => setCmsSection("navigation")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer ${
              cmsSection === "navigation"
                ? "bg-[#6366F1] text-white font-bold shadow-sm"
                : "text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-white/[0.04]"
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Navbar &amp; Footer CMS</span>
          </button>
        </div>
      </div>

      {cmsSection === "navigation" ? (
        <NavigationFooterEditor />
      ) : (
        <div className="bg-[#0B0E18]/70 backdrop-blur-md border border-white/[0.08] rounded-2xl p-6 space-y-6 shadow-sm">
          {/* Top Header & Page Selector */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-[#F8FAFC] tracking-tight">
                  Page Sections &amp; SEO Editor
                </h3>
                <span className="px-2 py-0.5 rounded bg-[#6366F1]/20 text-[#818CF8] text-[10px] font-bold border border-[#6366F1]/30">
                  v{version} LIVE
                </span>
              </div>
              <p className="text-[11px] text-[#94A3B8] mt-0.5">
                Edit text, headings, buttons, metrics, and cards across public pages. Any changes saved to live reflect immediately in browser.
              </p>
            </div>

        {/* Global CMS Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Direct Live Link */}
          <a
            href={`${livePageUrl}?t=${Date.now()}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-[#818CF8] hover:text-white border border-white/10 flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Open the corresponding live public page in a new browser tab"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Open Live Page</span>
          </a>

          {/* Real-time background save status badge */}
          <div
            className="px-2.5 py-1.5 rounded-lg bg-white/[0.04] border border-white/10 flex items-center gap-1.5 text-[11px] font-mono shrink-0 select-none"
            title="Changes are continuously preserved in the background"
          >
            <span
              className={`w-2 h-2 rounded-full transition-colors ${
                bgStatus === "saving" ? "bg-amber-400 animate-pulse" : "bg-emerald-400"
              }`}
            />
            <span className={bgStatus === "saving" ? "text-amber-300 font-medium" : "text-emerald-300 font-medium"}>
              {bgStatus === "saving" ? "Saving in background..." : "Saved in background"}
            </span>
          </div>

          <button
            onClick={() => setShowPreviewModal(true)}
            className="px-3 py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-[#F8FAFC] border border-white/10 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5 text-[#818CF8]" />
            <span>Preview</span>
          </button>

          <button
            onClick={() => setShowHistoryModal(true)}
            className="px-3 py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-[#F8FAFC] border border-white/10 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <History className="w-3.5 h-3.5 text-amber-400" />
            <span>Revisions ({historyList.length})</span>
          </button>

          <button
            onClick={handleSaveDraft}
            disabled={saving}
            className="px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-[#94A3B8] hover:text-white border border-white/10 flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
            title="Save draft without pushing live"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Draft</span>
          </button>

          {/* Prominent Primary Save & Publish Button */}
          <button
            onClick={handleSaveToLive}
            disabled={saving}
            className="px-4 py-1.5 rounded-lg bg-[#6366F1] hover:bg-[#4F46E5] text-white font-bold flex items-center gap-1.5 transition-all shadow-[0_0_15px_rgba(99,102,241,0.3)] hover:shadow-[0_0_20px_rgba(99,102,241,0.5)] disabled:opacity-50 cursor-pointer"
            title="Save and push immediately to live website"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{saving ? "Saving..." : "Save to Live"}</span>
          </button>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-3 rounded-xl border text-xs flex items-center justify-between gap-3 font-bold ${
            feedback.type === "error"
              ? "bg-red-500/10 border-red-500/30 text-red-400"
              : "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === "error" ? (
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            ) : (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            )}
            <span>{feedback.text}</span>
          </div>

          {feedback.type === "success" && (
            <a
              href={`${livePageUrl}?t=${Date.now()}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-200 text-[11px] flex items-center gap-1 shrink-0"
            >
              <span>View Live Now</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      )}

      {/* Page Tabs */}
      <div className="space-y-1.5">
        <label className="text-[10px] text-[#64748B] uppercase tracking-wider font-bold">
          Select Page to Edit
        </label>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
          {pages.map((p) => {
            const isSelected = p.key === selectedKey;
            return (
              <button
                key={p.key}
                onClick={() => handleSelectPage(p.key)}
                className={`px-3 py-1.5 rounded-xl border transition-all shrink-0 cursor-pointer text-left ${
                  isSelected
                    ? "bg-[#6366F1] text-white font-bold border-[#6366F1] shadow-sm"
                    : "bg-white/[0.02] text-[#94A3B8] border-white/[0.08] hover:text-[#F8FAFC] hover:bg-white/[0.05]"
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span>{getPageTitle(p.key)}</span>
                  <span className={`text-[9px] px-1 rounded ${isSelected ? "bg-white/20 text-white" : "bg-white/[0.06] text-[#64748B]"}`}>
                    v{p.version}
                  </span>
                </div>
              </button>
            );
          })}

          {/* Quick link button to Navbar & Footer editor */}
          <button
            onClick={() => setCmsSection("navigation")}
            className="px-3 py-1.5 rounded-xl border border-dashed border-[#6366F1]/40 text-[#818CF8] hover:bg-[#6366F1]/10 flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
            title="Switch to Navbar & Footer Layout Editor"
          >
            <Compass className="w-3 h-3" />
            <span>Navbar &amp; Footer Layout</span>
          </button>
        </div>
      </div>

      {/* Editor Controls Strip */}
      <div className="flex items-center justify-between pt-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCodeEditor(!showCodeEditor)}
            className={`px-2.5 py-1 rounded-lg border text-[11px] flex items-center gap-1.5 transition-colors cursor-pointer ${
              showCodeEditor
                ? "bg-[#6366F1]/20 text-[#818CF8] border-[#6366F1]/40"
                : "bg-white/[0.03] text-[#94A3B8] border-white/[0.08] hover:text-white"
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            <span>{showCodeEditor ? "Switch to Visual Blocks" : "Raw JSON Editor"}</span>
          </button>
        </div>

        {/* Add Section dropdown */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-[#64748B] uppercase font-bold">Add Block:</span>
          {["hero", "cards", "stats", "faq", "text", "seo"].map((type) => (
            <button
              key={type}
              onClick={() => addSection(type)}
              className="px-2 py-0.5 rounded bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-[10px] text-[#818CF8] hover:text-white transition-colors cursor-pointer"
            >
              +{type.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Main Editing Area */}
      {showCodeEditor ? (
        <div className="space-y-2">
          <div className="text-[10px] text-[#64748B] uppercase font-bold">
            Raw JSON Document (Direct Editing)
          </div>
          <textarea
            rows={18}
            value={rawJsonText}
            onChange={(e) => {
              setRawJsonText(e.target.value);
              try {
                const parsed = JSON.parse(e.target.value);
                if (Array.isArray(parsed)) setSections(parsed);
              } catch {}
            }}
            className="w-full p-4 rounded-xl bg-[#030407] border border-white/[0.12] text-[#818CF8] font-mono text-xs focus:outline-none focus:border-[#6366F1] leading-relaxed"
          />
        </div>
      ) : (
        <div className="space-y-4">
          {sections.length === 0 ? (
            <div className="p-8 text-center border border-dashed border-white/10 rounded-2xl text-[#64748B]">
              No sections defined for this page yet. Use the &ldquo;+Add Block&rdquo; buttons above.
            </div>
          ) : (
            sections.map((sec, idx) => (
              <div
                key={sec.id || idx}
                className={`p-4 rounded-xl border transition-all ${
                  sec.visible ? "bg-white/[0.02] border-white/[0.08]" : "bg-black/40 border-white/[0.04] opacity-50"
                }`}
              >
                {/* Block Title & Controls */}
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/[0.06]">
                  <div className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded bg-white/[0.06] text-[#818CF8] flex items-center justify-center font-bold text-[10px]">
                      {idx + 1}
                    </span>
                    <span className="font-bold text-[#F8FAFC] uppercase text-[11px]">
                      {sec.type} BLOCK
                    </span>
                    <span className="text-[10px] text-[#64748B] font-mono">#{sec.id}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <label className="flex items-center gap-1 mr-2 text-[10px] text-[#94A3B8] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={sec.visible}
                        onChange={(e) => updateSection(idx, { visible: e.target.checked })}
                        className="rounded bg-white/5 border-white/10 text-[#6366F1]"
                      />
                      <span>Visible</span>
                    </label>

                    <button
                      onClick={() => moveSection(idx, "up")}
                      disabled={idx === 0}
                      className="p-1 rounded bg-white/[0.04] hover:bg-white/[0.08] text-[#94A3B8] disabled:opacity-30 cursor-pointer"
                      title="Move Up"
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => moveSection(idx, "down")}
                      disabled={idx === sections.length - 1}
                      className="p-1 rounded bg-white/[0.04] hover:bg-white/[0.08] text-[#94A3B8] disabled:opacity-30 cursor-pointer"
                      title="Move Down"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => deleteSection(idx)}
                      className="p-1 rounded bg-red-500/10 hover:bg-red-500/20 text-red-400 ml-1 cursor-pointer"
                      title="Delete Section"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Form Fields according to Block Type */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {sec.type !== "seo" && (
                    <>
                      <div className="sm:col-span-2 space-y-1">
                        <label className="text-[10px] text-[#94A3B8] uppercase">Headline / Title</label>
                        <input
                          type="text"
                          value={sec.heading || ""}
                          onChange={(e) => updateSection(idx, { heading: e.target.value })}
                          className="w-full px-3 py-1.5 rounded-lg bg-[#0B0E18] border border-white/10 text-white focus:outline-none focus:border-[#6366F1]"
                        />
                      </div>

                      <div className="sm:col-span-2 space-y-1">
                        <label className="text-[10px] text-[#94A3B8] uppercase">Subheading / Description</label>
                        <textarea
                          rows={2}
                          value={sec.subheading || ""}
                          onChange={(e) => updateSection(idx, { subheading: e.target.value })}
                          className="w-full px-3 py-1.5 rounded-lg bg-[#0B0E18] border border-white/10 text-white focus:outline-none focus:border-[#6366F1]"
                        />
                      </div>
                    </>
                  )}

                  {/* Hero Top Pill Badge & Buttons */}
                  {sec.type === "hero" && (
                    <>
                      <div className="sm:col-span-2 p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-bold text-[#818CF8] uppercase tracking-wider flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-[#6366F1] animate-pulse" />
                            Hero Top Pill Badge (Header Live Tag)
                          </label>
                          <label className="flex items-center gap-1.5 text-[10px] text-[#94A3B8] cursor-pointer">
                            <input
                              type="checkbox"
                              checked={sec.showBadge !== false}
                              onChange={(e) => updateSection(idx, { showBadge: e.target.checked })}
                              className="rounded border-white/20 bg-[#0B0E18] text-[#6366F1] focus:ring-0"
                            />
                            <span>Show Pill Badge</span>
                          </label>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="space-y-1">
                            <label className="text-[9px] text-[#94A3B8] uppercase">Badge Prefix (e.g. PROTOCOL v1.0)</label>
                            <input
                              type="text"
                              value={sec.badgePrefix || ""}
                              placeholder="PROTOCOL v1.0"
                              onChange={(e) => updateSection(idx, { badgePrefix: e.target.value })}
                              className="w-full px-2.5 py-1.5 rounded-lg bg-[#0B0E18] border border-white/10 text-white text-xs focus:outline-none focus:border-[#6366F1]"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] text-[#94A3B8] uppercase">Pill Sub-Label / Description</label>
                            <input
                              type="text"
                              value={sec.badgeText || ""}
                              placeholder="Collegiate Hackathon Infrastructure"
                              onChange={(e) => updateSection(idx, { badgeText: e.target.value })}
                              className="w-full px-2.5 py-1.5 rounded-lg bg-[#0B0E18] border border-white/10 text-white text-xs focus:outline-none focus:border-[#6366F1]"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] text-[#94A3B8] uppercase">Status Tag (e.g. LIVE)</label>
                            <input
                              type="text"
                              value={sec.badgeStatus || ""}
                              placeholder="LIVE"
                              onChange={(e) => updateSection(idx, { badgeStatus: e.target.value })}
                              className="w-full px-2.5 py-1.5 rounded-lg bg-[#0B0E18] border border-white/10 text-white text-xs focus:outline-none focus:border-[#6366F1]"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] text-[#94A3B8] uppercase">Primary Button Label</label>
                        <input
                          type="text"
                          value={sec.buttonText || ""}
                          onChange={(e) => updateSection(idx, { buttonText: e.target.value })}
                          className="w-full px-3 py-1.5 rounded-lg bg-[#0B0E18] border border-white/10 text-white focus:outline-none focus:border-[#6366F1]"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-[#94A3B8] uppercase">Primary Button Link</label>
                        <input
                          type="text"
                          value={sec.buttonLink || ""}
                          onChange={(e) => updateSection(idx, { buttonLink: e.target.value })}
                          className="w-full px-3 py-1.5 rounded-lg bg-[#0B0E18] border border-white/10 text-white focus:outline-none focus:border-[#6366F1]"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-[#94A3B8] uppercase">Secondary Button Label</label>
                        <input
                          type="text"
                          value={sec.secondaryButtonText || ""}
                          onChange={(e) => updateSection(idx, { secondaryButtonText: e.target.value })}
                          className="w-full px-3 py-1.5 rounded-lg bg-[#0B0E18] border border-white/10 text-white focus:outline-none focus:border-[#6366F1]"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-[#94A3B8] uppercase">Secondary Button Link</label>
                        <input
                          type="text"
                          value={sec.secondaryButtonLink || ""}
                          onChange={(e) => updateSection(idx, { secondaryButtonLink: e.target.value })}
                          className="w-full px-3 py-1.5 rounded-lg bg-[#0B0E18] border border-white/10 text-white focus:outline-none focus:border-[#6366F1]"
                        />
                      </div>
                    </>
                  )}

                  {/* Body Text for Text Block */}
                  {sec.type === "text" && (
                    <div className="sm:col-span-2 space-y-1">
                      <label className="text-[10px] text-[#94A3B8] uppercase">Body Text</label>
                      <textarea
                        rows={4}
                        value={sec.bodyText || ""}
                        onChange={(e) => updateSection(idx, { bodyText: e.target.value })}
                        className="w-full px-3 py-1.5 rounded-lg bg-[#0B0E18] border border-white/10 text-white focus:outline-none focus:border-[#6366F1]"
                      />
                    </div>
                  )}

                  {/* Stats Items List */}
                  {sec.type === "stats" && (
                    <div className="sm:col-span-2 space-y-3 pt-2">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/[0.06] pb-2 gap-2">
                        <div>
                          <span className="text-[10px] text-[#818CF8] uppercase font-bold">Metric Items (Dynamic to Backend)</span>
                          <p className="text-[10px] text-[#64748B]">
                            Use custom static numbers or live backend tags (<code className="text-[#818CF8]">{"{LIVE_BUILDERS}"}</code>, <code className="text-[#818CF8]">{"{LIVE_PRIZE}"}</code>, <code className="text-[#818CF8]">{"{LIVE_ARENAS}"}</code>).
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <button
                            type="button"
                            onClick={() => addSectionItem(idx, { label: "Collegiate Builders", value: "{LIVE_BUILDERS}" })}
                            className="px-2 py-0.5 rounded bg-[#6366F1]/10 hover:bg-[#6366F1]/20 text-[10px] text-[#818CF8] border border-[#6366F1]/20 cursor-pointer"
                            title="Inserts live builder count from SQLite database"
                          >
                            + Live Builders
                          </button>
                          <button
                            type="button"
                            onClick={() => addSectionItem(idx, { label: "Verified Prize Pools", value: "{LIVE_PRIZE}" })}
                            className="px-2 py-0.5 rounded bg-[#6366F1]/10 hover:bg-[#6366F1]/20 text-[10px] text-[#818CF8] border border-[#6366F1]/20 cursor-pointer"
                            title="Inserts live total prize pool from active hackathons"
                          >
                            + Live Prize
                          </button>
                          <button
                            type="button"
                            onClick={() => addSectionItem(idx, { label: "New Metric", value: "1,000+" })}
                            className="px-2 py-0.5 rounded bg-white/[0.05] hover:bg-white/[0.1] text-[10px] text-[#F8FAFC] border border-white/10 cursor-pointer"
                          >
                            + Add Custom Metric
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {sec.items?.map((item: any, itemIdx: number) => (
                          <div key={itemIdx} className="p-2.5 rounded-lg bg-black/40 border border-white/[0.06] space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] text-[#64748B]">Metric #{itemIdx + 1}</span>
                              <button
                                type="button"
                                onClick={() => removeSectionItem(idx, itemIdx)}
                                className="text-red-400 hover:text-red-300 text-[10px] cursor-pointer"
                              >
                                Remove
                              </button>
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] text-[#94A3B8] uppercase">Value</label>
                              <input
                                type="text"
                                value={item.value || ""}
                                onChange={(e) => updateSectionItem(idx, itemIdx, { value: e.target.value })}
                                className="w-full px-2 py-1 rounded bg-[#0B0E18] border border-white/10 text-white text-xs"
                                placeholder="5,000+"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] text-[#94A3B8] uppercase">Label</label>
                              <input
                                type="text"
                                value={item.label || ""}
                                onChange={(e) => updateSectionItem(idx, itemIdx, { label: e.target.value })}
                                className="w-full px-2 py-1 rounded bg-[#0B0E18] border border-white/10 text-white text-xs"
                                placeholder="Collegiate Builders"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Cards Items List (How It Works, Features) */}
                  {sec.type === "cards" && (
                    <div className="sm:col-span-2 space-y-3 pt-2">
                      <div className="flex items-center justify-between border-b border-white/[0.06] pb-1.5">
                        <span className="text-[10px] text-[#818CF8] uppercase font-bold">Card Items</span>
                        <button
                          type="button"
                          onClick={() => addSectionItem(idx, { title: "New Step", description: "Card details and description." })}
                          className="px-2 py-0.5 rounded bg-white/[0.05] hover:bg-white/[0.1] text-[10px] text-[#818CF8] hover:text-white border border-white/10 cursor-pointer"
                        >
                          + Add Card
                        </button>
                      </div>

                      <div className="space-y-2">
                        {sec.items?.map((item: any, itemIdx: number) => (
                          <div key={itemIdx} className="p-3 rounded-lg bg-black/40 border border-white/[0.06] space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] text-[#64748B]">Card #{itemIdx + 1}</span>
                              <button
                                type="button"
                                onClick={() => removeSectionItem(idx, itemIdx)}
                                className="text-red-400 hover:text-red-300 text-[10px] cursor-pointer"
                              >
                                Remove
                              </button>
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] text-[#94A3B8] uppercase">Title</label>
                              <input
                                type="text"
                                value={item.title || ""}
                                onChange={(e) => updateSectionItem(idx, itemIdx, { title: e.target.value })}
                                className="w-full px-2 py-1 rounded bg-[#0B0E18] border border-white/10 text-white text-xs"
                                placeholder="Step or Feature Title"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] text-[#94A3B8] uppercase">Description</label>
                              <textarea
                                rows={2}
                                value={item.description || ""}
                                onChange={(e) => updateSectionItem(idx, itemIdx, { description: e.target.value })}
                                className="w-full px-2 py-1 rounded bg-[#0B0E18] border border-white/10 text-white text-xs"
                                placeholder="Details..."
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* FAQ Items List */}
                  {sec.type === "faq" && (
                    <div className="sm:col-span-2 space-y-3 pt-2">
                      <div className="flex items-center justify-between border-b border-white/[0.06] pb-1.5">
                        <span className="text-[10px] text-[#818CF8] uppercase font-bold">FAQ Q&amp;A Items</span>
                        <button
                          type="button"
                          onClick={() => addSectionItem(idx, { question: "New Question?", answer: "Answer description." })}
                          className="px-2 py-0.5 rounded bg-white/[0.05] hover:bg-white/[0.1] text-[10px] text-[#818CF8] hover:text-white border border-white/10 cursor-pointer"
                        >
                          + Add FAQ
                        </button>
                      </div>

                      <div className="space-y-2">
                        {sec.items?.map((item: any, itemIdx: number) => (
                          <div key={itemIdx} className="p-3 rounded-lg bg-black/40 border border-white/[0.06] space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] text-[#64748B]">FAQ #{itemIdx + 1}</span>
                              <button
                                type="button"
                                onClick={() => removeSectionItem(idx, itemIdx)}
                                className="text-red-400 hover:text-red-300 text-[10px] cursor-pointer"
                              >
                                Remove
                              </button>
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] text-[#94A3B8] uppercase">Question</label>
                              <input
                                type="text"
                                value={item.question || ""}
                                onChange={(e) => updateSectionItem(idx, itemIdx, { question: e.target.value })}
                                className="w-full px-2 py-1 rounded bg-[#0B0E18] border border-white/10 text-white text-xs"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] text-[#94A3B8] uppercase">Answer</label>
                              <textarea
                                rows={2}
                                value={item.answer || ""}
                                onChange={(e) => updateSectionItem(idx, itemIdx, { answer: e.target.value })}
                                className="w-full px-2 py-1 rounded bg-[#0B0E18] border border-white/10 text-white text-xs"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* SEO Metadata Block */}
                  {sec.type === "seo" && (
                    <>
                      <div className="sm:col-span-2 space-y-1">
                        <label className="text-[10px] text-[#94A3B8] uppercase">Meta Title Tag</label>
                        <input
                          type="text"
                          value={sec.metaTitle || ""}
                          onChange={(e) => updateSection(idx, { metaTitle: e.target.value })}
                          className="w-full px-3 py-1.5 rounded-lg bg-[#0B0E18] border border-white/10 text-white focus:outline-none focus:border-[#6366F1]"
                        />
                      </div>
                      <div className="sm:col-span-2 space-y-1">
                        <label className="text-[10px] text-[#94A3B8] uppercase">Meta Description Tag</label>
                        <textarea
                          rows={2}
                          value={sec.metaDescription || ""}
                          onChange={(e) => updateSection(idx, { metaDescription: e.target.value })}
                          className="w-full px-3 py-1.5 rounded-lg bg-[#0B0E18] border border-white/10 text-white focus:outline-none focus:border-[#6366F1]"
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
        </div>
      )}

      {/* Live Preview Modal */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-4xl w-full max-h-[85vh] overflow-y-auto bg-[#030407] border border-white/15 rounded-3xl p-8 space-y-8 shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-bold text-white uppercase text-xs">Preview: {getPageTitle(selectedKey)}</span>
              </div>
              <button
                onClick={() => setShowPreviewModal(false)}
                className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs cursor-pointer"
              >
                Close Preview
              </button>
            </div>

            <div className="space-y-10 text-center">
              {sections
                .filter((s) => s.visible && s.type !== "seo")
                .map((sec, i) => (
                  <div key={sec.id || i} className="space-y-4 py-6 border-b border-white/5 last:border-0">
                    <span className="text-[10px] font-mono uppercase text-[#818CF8] bg-[#6366F1]/10 px-2 py-0.5 rounded border border-[#6366F1]/30">
                      {sec.type}
                    </span>
                    {sec.type === "hero" && sec.showBadge !== false && (
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-xs font-mono text-[#F8FAFC]">
                        <span className="w-2 h-2 rounded-full bg-[#6366F1] animate-pulse" />
                        <span className="tracking-wider uppercase text-[10px] font-bold text-[#818CF8]">
                          {sec.badgePrefix || "PROTOCOL v1.0"}
                        </span>
                        <span className="text-white/20">/</span>
                        <span className="text-[10px] text-[#94A3B8]">
                          {sec.badgeText || "Collegiate Hackathon Infrastructure"}
                        </span>
                        <span className="px-1.5 py-0.5 rounded-full bg-[#6366F1]/20 text-[#818CF8] font-bold text-[9px] border border-[#6366F1]/30">
                          {sec.badgeStatus || "LIVE"}
                        </span>
                      </div>
                    )}
                    <h3 className="font-display text-2xl sm:text-3xl font-extrabold text-[#F8FAFC]">
                      {sec.heading}
                    </h3>
                    <p className="text-xs text-[#94A3B8] max-w-xl mx-auto leading-relaxed">
                      {sec.subheading}
                    </p>
                    {sec.buttonText && (
                      <div className="pt-2 flex items-center justify-center gap-3">
                        <span className="px-5 py-2.5 rounded-xl bg-[#6366F1] text-white font-bold text-xs inline-block">
                          {sec.buttonText}
                        </span>
                        {sec.secondaryButtonText && (
                          <span className="px-5 py-2.5 rounded-xl bg-white/10 text-white font-semibold text-xs inline-block">
                            {sec.secondaryButtonText}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Version History & Rollback Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-xl w-full max-h-[80vh] overflow-y-auto bg-[#0B0E18] border border-white/15 rounded-3xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-amber-400" />
                <span className="font-bold text-white text-xs uppercase">Version History ({getPageTitle(selectedKey)})</span>
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="px-2.5 py-1 rounded bg-white/10 hover:bg-white/20 text-white text-xs cursor-pointer"
              >
                Close
              </button>
            </div>

            {historyList.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#64748B]">
                No previous revisions recorded yet. Each time you click &ldquo;Save to Live&rdquo;, a snapshot is preserved here for instant rollback.
              </div>
            ) : (
              <div className="space-y-2.5">
                {historyList.map((hist, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-white/[0.02] border border-white/10 flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#F8FAFC]">Version {hist.version}</span>
                        <span className="text-[10px] text-[#64748B]">
                          {new Date(hist.publishedAt).toLocaleString()}
                        </span>
                      </div>
                      <div className="text-[10px] text-[#94A3B8] truncate max-w-xs mt-0.5">
                        {hist.jsonValue.slice(0, 60)}...
                      </div>
                    </div>

                    <button
                      onClick={() => handleRollback(hist.version)}
                      disabled={saving}
                      className="px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 disabled:opacity-50"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Rollback</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
