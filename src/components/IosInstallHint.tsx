"use client";
import { useEffect, useState } from "react";
import { Share, X } from "lucide-react";

const KEY = "split-ios-hint-dismissed";

export function IosInstallHint() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem(KEY) === "1") return;
    const nav = window.navigator as Navigator & { standalone?: boolean };
    const isIos = /iphone|ipad|ipod/i.test(nav.userAgent);
    const inStandalone = nav.standalone === true;
    if (isIos && !inStandalone) {
      const t = setTimeout(() => setShow(true), 1500);
      return () => clearTimeout(t);
    }
  }, []);

  if (!show) return null;
  const dismiss = () => {
    localStorage.setItem(KEY, "1");
    setShow(false);
  };

  return (
    <div className="fixed inset-x-3 bottom-3 z-50 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-2xl slide-up">
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        className="absolute right-2 top-2 text-[var(--color-muted)] p-2"
      >
        <X size={18} />
      </button>
      <p className="text-sm pr-6">
        Install <strong>split</strong> on your home screen: tap{" "}
        <Share size={14} className="inline-block align-text-bottom" /> Share, then
        <em> Add to Home Screen</em>.
      </p>
    </div>
  );
}
