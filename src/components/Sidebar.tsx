"use client";

import React from "react";
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
} from "lucide-react";
import { usePlayer } from "@/context/PlayerContext";

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

        {/* Footer Brand Info (Expanded mode only) */}
        <div className="sidebar-footer">
          <div className="tech-badge">
            <Sparkles size={14} color="#00f0ff" />
            <span>Made for listening</span>
          </div>
        </div>
      </aside>

      <style jsx>{`
        .sidebar-container {
          height: calc(100vh - var(--header-height));
          background: var(--bg-surface);
          border-right: 1px solid var(--border-subtle);
          display: flex;
          flex-direction: column;
          justify-content: flex-start;
          transition: width 0.2s cubic-bezier(0.4, 0, 0.2, 1), transform 0.25s ease;
          overflow-y: auto;
          overflow-x: hidden;
          flex-shrink: 0;
          z-index: 120;
        }

        /* Desktop Expanded (240px) */
        .sidebar-expanded {
          width: var(--sidebar-width);
          padding: 0 10px 14px;
        }

        /* Desktop Collapsed Mini Guide (72px) */
        .sidebar-collapsed {
          width: var(--sidebar-collapsed-width);
          padding: 0 4px 14px;
          align-items: center;
        }

        .sidebar-top-mobile {
          display: none;
          align-items: center;
          justify-content: space-between;
          padding: 6px 10px 14px;
          border-bottom: 1px solid var(--border-subtle);
          margin-bottom: 10px;
        }

        .mobile-sidebar-title {
          font-weight: 700;
          font-size: 1rem;
        }

        .mobile-close-btn {
          color: var(--text-secondary);
          padding: 6px;
          border-radius: 50%;
        }

        .mobile-close-btn:hover {
          background: var(--bg-hover);
          color: var(--text-primary);
        }

        .mobile-backdrop {
          display: none;
        }

        .sidebar-section {
          display: flex;
          flex-direction: column;
          gap: 2px;
          width: 100%;
        }

        .section-label {
          font-size: 0.72rem;
          font-weight: 700;
          color: var(--text-muted);
          letter-spacing: 0.8px;
          padding: 6px 14px 4px 14px;
          user-select: none;
        }

        .nav-list {
          display: flex;
          flex-direction: column;
          gap: 3px;
          width: 100%;
        }

        /* Default (Expanded) Nav Item */
        .nav-item {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 10px 14px;
          border-radius: var(--radius-md);
          color: var(--text-secondary);
          transition: all 0.15s ease;
          position: relative;
          width: 100%;
          text-align: left;
        }

        .nav-item:hover {
          background: var(--bg-hover);
          color: var(--text-primary);
        }

        .nav-item-active {
          background: rgba(255, 0, 51, 0.12);
          color: #ffffff;
          font-weight: 600;
        }

        .nav-item-active .nav-icon-box {
          color: var(--yt-red);
        }

        .nav-icon-box {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .nav-label-full {
          font-size: 0.9rem;
          font-weight: 500;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .nav-label-mini {
          display: none;
        }

        .active-glow-pill {
          position: absolute;
          right: 6px;
          width: 4px;
          height: 18px;
          border-radius: 4px;
          background: var(--yt-red);
          box-shadow: 0 0 10px var(--yt-red);
        }

        .sidebar-divider {
          height: 1px;
          background: var(--border-subtle);
          margin: 14px 10px;
          width: calc(100% - 20px);
        }

        .sidebar-footer {
          margin-top: auto;
          padding: 16px 10px 8px;
        }

        .tech-badge {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          background: rgba(0, 240, 255, 0.06);
          border: 1px solid rgba(0, 240, 255, 0.15);
          border-radius: var(--radius-sm);
          font-size: 0.75rem;
          color: var(--text-secondary);
          user-select: none;
        }

        /* Collapsed Mode (Mini Guide: 72px) */
        .sidebar-collapsed .section-label,
        .sidebar-collapsed .sidebar-divider,
        .sidebar-collapsed .sidebar-footer,
        .sidebar-collapsed .active-glow-pill,
        .sidebar-collapsed .nav-label-full {
          display: none !important;
        }

        .sidebar-collapsed .nav-item {
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 12px 2px;
          width: 64px;
          margin: 0 auto 4px auto;
          border-radius: var(--radius-md);
        }

        .sidebar-collapsed .nav-label-mini {
          display: block !important;
          font-size: 0.66rem;
          font-weight: 500;
          color: var(--text-secondary);
          text-align: center;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 60px;
          line-height: 1.1;
        }

        .sidebar-collapsed .nav-item-active .nav-label-mini {
          color: #ffffff;
          font-weight: 700;
        }

        /* Desktop Sticky Rules */
        @media (min-width: 769px) {
          .sidebar-container {
            position: sticky;
            top: 0;
            height: calc(100vh - var(--header-height));
          }
          .sidebar-top-mobile,
          .mobile-backdrop {
            display: none !important;
          }
        }

        /* Mobile Responsive View (<= 768px) */
        @media (max-width: 768px) {
          .mobile-backdrop {
            display: block;
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.75);
            backdrop-filter: blur(6px);
            z-index: 110;
          }

          .sidebar-container {
            position: fixed;
            top: 0;
            bottom: 0;
            left: 0;
            height: 100vh;
            width: 280px !important;
            box-shadow: 10px 0 30px rgba(0, 0, 0, 0.85);
            z-index: 120;
            padding: 16px 12px;
          }

          /* On mobile, collapsed means closed off-canvas */
          .sidebar-collapsed {
            transform: translateX(-100%);
          }

          /* On mobile, expanded means opened drawer */
          .sidebar-expanded {
            transform: translateX(0);
          }

          .sidebar-top-mobile {
            display: flex;
          }

          /* On mobile drawer, always show full labels */
          .nav-label-full,
          .section-label,
          .sidebar-divider,
          .sidebar-footer {
            display: block !important;
          }

          .nav-label-mini {
            display: none !important;
          }

          .nav-item {
            flex-direction: row !important;
            align-items: center !important;
            justify-content: flex-start !important;
            padding: 10px 14px !important;
            width: 100% !important;
          }
        }
      `}</style>
    </>
  );
}
