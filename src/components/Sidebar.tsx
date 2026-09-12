"use client";

import React from "react";
import Link from "next/link";
import {
  Flame,
  Coffee,
  Radio,
  Gamepad2,
  Disc3,
  Headphones,
  Compass,
  History,
  Sparkles,
  Music,
  X,
  Info,
  Zap,
  GitCommit,
} from "lucide-react";
import { usePlayer } from "@/context/PlayerContext";
import "./Sidebar.css";

interface SidebarProps {
  collapsed: boolean;
  activeCategory: string;
  onSelectCategory: (cat: string) => void;
  onCloseMobile?: () => void;
}

export function Sidebar({
  collapsed,
  activeCategory,
  onSelectCategory,
  onCloseMobile,
}: SidebarProps) {
  const { setShowQueueDrawer } = usePlayer();

  const mainNav = [
    { label: "For You", mini: "For You", query: "__for_you__", icon: Sparkles },
    { label: "Trending", mini: "Trending", query: "trending music", icon: Flame },
    { label: "Lofi & Chill", mini: "Lofi", query: "lofi hip hop radio beats to relax", icon: Coffee },
    { label: "Synthwave", mini: "Synthwave", query: "synthwave chillwave retrowave mix", icon: Disc3 },
    { label: "Gaming Beats", mini: "Gaming", query: "gaming music soundtrack remix", icon: Gamepad2 },
    { label: "Podcasts & Talks", mini: "Podcasts", query: "popular podcast audio", icon: Radio },
    { label: "Bollywood & Hits", mini: "Bollywood", query: "trending bollywood songs audio", icon: Headphones },
    { label: "Deep Focus", mini: "Focus", query: "focus study ambient music", icon: Compass },
    { label: "Acoustic Pop", mini: "Pop", query: "acoustic pop live session", icon: Music },
  ];

  const handleItemClick = (query: string) => {
    onSelectCategory(query);
    if (onCloseMobile) onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop Overlay (only on small screens when drawer is open) */}
      {!collapsed && (
        <div className="mobile-backdrop" onClick={onCloseMobile} />
      )}

      <aside
        className={`sidebar-container ${
          collapsed ? "sidebar-collapsed" : "sidebar-expanded"
        }`}
      >
        {/* Mobile Header with Title and Close Button */}
        <div className="sidebar-top-mobile">
          <div className="mobile-sidebar-title">Categories</div>
          <button
            className="mobile-close-btn"
            onClick={onCloseMobile}
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        {/* Discover Audio Section */}
        <div className="sidebar-section">
          <div className="section-label">DISCOVER AUDIO</div>
          <nav className="nav-list">
            {mainNav.map((item) => {
              const Icon = item.icon;
              const isActive = activeCategory === item.query;
              return (
                <button
                  key={item.label}
                  className={`nav-item ${isActive ? "nav-item-active" : ""}`}
                  onClick={() => handleItemClick(item.query)}
                  title={item.label}
                >
                  <div className="nav-icon-box">
                    <Icon size={20} />
                  </div>
                  <span className="nav-label-full">{item.label}</span>
                  <span className="nav-label-mini">{item.mini}</span>
                  {isActive && <div className="active-glow-pill" />}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="sidebar-divider" />

        {/* Library / Queue Section */}
        <div className="sidebar-section">
          <div className="section-label">YOUR LIBRARY</div>
          <button
            className="nav-item"
            onClick={() => {
              setShowQueueDrawer(true);
              if (onCloseMobile) onCloseMobile();
            }}
            title="Playlist & Rewind"
          >
            <div className="nav-icon-box">
              <History size={20} />
            </div>
            <span className="nav-label-full">Playlist & Rewind</span>
            <span className="nav-label-mini">Rewind</span>
          </button>
        </div>

        <div className="sidebar-divider" />

        {/* Explore & Info Section */}
        <div className="sidebar-section">
          <div className="section-label">EXPLORE</div>
          <Link
            href="/about"
            className="nav-item"
            style={{ textDecoration: "none" }}
            title="Why YTaudio?"
            onClick={onCloseMobile}
          >
            <div className="nav-icon-box">
              <Info size={20} />
            </div>
            <span className="nav-label-full">Why YTaudio?</span>
            <span className="nav-label-mini">About</span>
          </Link>
          <Link
            href="/features"
            className="nav-item"
            style={{ textDecoration: "none" }}
            title="All Features"
            onClick={onCloseMobile}
          >
            <div className="nav-icon-box">
              <Zap size={20} />
            </div>
            <span className="nav-label-full">Features</span>
            <span className="nav-label-mini">Features</span>
          </Link>
          <Link
            href="/changelog"
            className="nav-item"
            style={{ textDecoration: "none" }}
            title="Version Changelog & Release Notes"
            onClick={onCloseMobile}
          >
            <div className="nav-icon-box">
              <GitCommit size={20} />
            </div>
            <span className="nav-label-full">Changelog</span>
            <span className="nav-label-mini">v2.1</span>
          </Link>
        </div>

        {/* Footer Brand Info (Expanded mode only) */}
        <div className="sidebar-footer">
          <Link
            href="/changelog"
            className="tech-badge"
            style={{ textDecoration: "none" }}
            title="View v2.3.0 release notes"
            onClick={onCloseMobile}
          >
            <Sparkles size={14} color="#00f0ff" />
            <span>v2.3.0 • Changelog</span>
          </Link>
        </div>
      </aside>

    </>
  );
}
