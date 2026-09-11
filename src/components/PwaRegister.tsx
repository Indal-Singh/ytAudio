"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export function PwaRegister() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  useEffect(() => {
    // 1. Register Service Worker
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js")
          .then((reg) => {
            console.log("[PWA] Service Worker registered with scope:", reg.scope);
          })
          .catch((err) => {
            console.warn("[PWA] Service Worker registration failed:", err);
          });
      });
    }

    // 2. Capture install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Only show banner if user hasn't dismissed it in this session
      const dismissed = sessionStorage.getItem("pwa_install_dismissed");
      if (!dismissed) {
        setShowInstallBanner(true);
      }
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    setShowInstallBanner(false);
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === "accepted") {
      console.log("[PWA] User accepted installation");
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowInstallBanner(false);
    sessionStorage.setItem("pwa_install_dismissed", "true");
  };

  if (!showInstallBanner) return null;

  return (
    <aside
      aria-label="Install App"
      style={{
        position: "fixed",
        bottom: "84px",
        right: "20px",
        zIndex: 9999,
        background: "rgba(18, 20, 29, 0.95)",
        backdropFilter: "blur(16px)",
        border: "1px solid rgba(0, 240, 255, 0.3)",
        boxShadow: "0 10px 32px rgba(0, 0, 0, 0.6), 0 0 20px rgba(0, 240, 255, 0.15)",
        borderRadius: "16px",
        padding: "14px 18px",
        display: "flex",
        alignItems: "center",
        gap: "14px",
        maxWidth: "340px",
        animation: "slideInUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
      }}
    >
      <div
        style={{
          width: "38px",
          height: "38px",
          borderRadius: "10px",
          background: "linear-gradient(135deg, #ff0033 0%, #9d4edd 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Download size={18} color="#ffffff" />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#ffffff" }}>
          Install YTaudio App
        </div>
        <div style={{ fontSize: "0.74rem", color: "var(--text-secondary)", marginTop: "2px" }}>
          Listen with screen off anytime
        </div>
      </div>

      <button
        onClick={handleInstallClick}
        style={{
          background: "linear-gradient(135deg, #ff0033 0%, #e60026 100%)",
          color: "#ffffff",
          border: "none",
          borderRadius: "20px",
          padding: "6px 14px",
          fontSize: "0.78rem",
          fontWeight: 700,
          cursor: "pointer",
          boxShadow: "0 2px 10px rgba(255, 0, 51, 0.4)",
        }}
      >
        Install
      </button>

      <button
        onClick={handleDismiss}
        aria-label="Close install prompt"
        style={{
          background: "transparent",
          border: "none",
          color: "var(--text-muted)",
          cursor: "pointer",
          padding: "4px",
          display: "flex",
          alignItems: "center",
        }}
      >
        <X size={16} />
      </button>
    </aside>
  );
}
