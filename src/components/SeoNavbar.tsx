"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Music2,
  Play,
  Menu,
  X,
  Info,
  Zap,
  GitCommit,
  Radio,
  ArrowRight,
} from "lucide-react";
import "./SeoNavbar.css";

interface SeoNavbarProps {
  activePage: "about" | "features" | "changelog";
}

export function SeoNavbar({ activePage }: SeoNavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const closeMenu = useCallback(() => {
    setMobileMenuOpen(false);
  }, []);

  // Handle ESC key and scroll lock
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (mobileMenuOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          closeMenu();
        }
      };

      window.addEventListener("keydown", handleKeyDown);
      return () => {
        document.body.style.overflow = originalOverflow;
        window.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [mobileMenuOpen, closeMenu]);

  // Handle popstate for hardware back button on Android
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (mobileMenuOpen) {
      window.history.pushState({ isModal: true, modal: "seoNavMenu" }, "");
      const handlePop = () => {
        closeMenu();
      };
      window.addEventListener("popstate", handlePop);
      return () => window.removeEventListener("popstate", handlePop);
    }
  }, [mobileMenuOpen, closeMenu]);

  const navLinks = [
    {
      id: "about",
      href: "/about",
      label: "Why YTaudio?",
      miniLabel: "Why YTaudio?",
      subLabel: "Lock-screen, 90% data saved & battery life",
      icon: Info,
    },
    {
      id: "features",
      href: "/features",
      label: "Features",
      miniLabel: "Features",
      subLabel: "Visualizer, MP3 downloader & queue",
      icon: Zap,
    },
    {
      id: "changelog",
      href: "/changelog",
      label: "Changelog",
      miniLabel: "Changelog",
      subLabel: "v2.2.0 release notes & update history",
      icon: GitCommit,
    },
  ];

  return (
    <header className="seo-navbar-header glass-panel">
      <div className="seo-navbar-inner">
        {/* Left: Brand Logo */}
        <Link href="/" className="seo-brand-link" onClick={closeMenu}>
          <div className="seo-brand-icon-wrapper">
            <div className="seo-brand-icon-bg">
              <Music2 size={18} color="#ffffff" />
            </div>
            <span className="seo-brand-pulse-dot" />
          </div>
          <div className="seo-brand-text">
            <span className="seo-brand-name">YT</span>
            <span className="seo-brand-badge">audio</span>
          </div>
        </Link>

        {/* Center/Right: Desktop Navigation */}
        <nav className="seo-desktop-nav" aria-label="Main Navigation">
          {navLinks.map((link) => {
            const isActive = activePage === link.id;
            return (
              <Link
                key={link.id}
                href={link.href}
                className={`seo-nav-link-item ${isActive ? "active" : ""}`}
              >
                <span>{link.label}</span>
                {isActive && <span className="seo-nav-active-indicator" />}
              </Link>
            );
          })}
        </nav>

        {/* Desktop & Mobile Actions */}
        <div className="seo-navbar-actions">
          {/* Quick Launch Player Button */}
          <Link href="/" className="seo-launch-btn" title="Launch YTaudio Player">
            <Play size={14} fill="#ffffff" />
            <span className="seo-launch-text">Launch Player</span>
            <span className="seo-launch-mobile-text">Play</span>
          </Link>

          {/* Mobile Hamburger Button */}
          <button
            type="button"
            className={`seo-hamburger-btn ${mobileMenuOpen ? "open" : ""}`}
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu & Overlay */}
      {mobileMenuOpen && (
        <div className="seo-mobile-overlay" onClick={closeMenu}>
          <div
            className="seo-mobile-drawer glass-panel"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="seo-drawer-header">
              <div className="seo-drawer-title">
                <Radio size={16} color="var(--accent-cyan)" />
                <span>Navigation</span>
              </div>
              <button
                type="button"
                className="seo-drawer-close-btn"
                onClick={closeMenu}
                aria-label="Close menu"
              >
                <X size={20} />
              </button>
            </div>

            {/* Prominent Launch Player Button inside drawer */}
            <div className="seo-drawer-cta-wrap">
              <Link
                href="/"
                className="seo-drawer-player-cta"
                onClick={closeMenu}
              >
                <div className="seo-drawer-cta-icon">
                  <Play size={18} fill="#ffffff" />
                </div>
                <div className="seo-drawer-cta-text">
                  <strong>Open Music Player</strong>
                  <span>Stream, queue, and search audio</span>
                </div>
                <ArrowRight size={18} className="seo-drawer-cta-arrow" />
              </Link>
            </div>

            <div className="seo-drawer-section-label">PAGES & DOCS</div>

            {/* Mobile Nav Links */}
            <nav className="seo-mobile-nav-list">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = activePage === link.id;
                return (
                  <Link
                    key={link.id}
                    href={link.href}
                    className={`seo-mobile-nav-item ${isActive ? "active" : ""}`}
                    onClick={closeMenu}
                  >
                    <div className="seo-mobile-item-icon-box">
                      <Icon size={18} />
                    </div>
                    <div className="seo-mobile-item-content">
                      <div className="seo-mobile-item-title">
                        <span>{link.label}</span>
                        {isActive && (
                          <span className="seo-mobile-active-badge">Current</span>
                        )}
                      </div>
                      <span className="seo-mobile-item-sub">{link.subLabel}</span>
                    </div>
                  </Link>
                );
              })}
            </nav>

            <div className="seo-drawer-footer">
              <span className="seo-drawer-version">YTaudio v2.2.0 • Free & Web-Based</span>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
