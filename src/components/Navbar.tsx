"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Search,
  X,
  Link as LinkIcon,
  Activity,
  ListMusic,
  Menu,
  Music2,
  ArrowLeft,
  Clock,
  Trash2,
} from "lucide-react";
import { usePlayer } from "@/context/PlayerContext";

interface NavbarProps {
  onSearch: (query: string) => void;
  onToggleSidebar: () => void;
}

const STORAGE_KEY = "yt_audio_search_history";

export function Navbar({ onSearch, onToggleSidebar }: NavbarProps) {
  const [searchInput, setSearchInput] = useState("");
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [liveSuggestions, setLiveSuggestions] = useState<string[]>([]);
  const [isFocused, setIsFocused] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);

  const desktopSearchRef = useRef<HTMLDivElement | null>(null);
  const mobileSearchRef = useRef<HTMLDivElement | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const suggestAbortRef = useRef<AbortController | null>(null);
  const suggestReqIdRef = useRef(0);

  const {
    isPlaying,
    queue,
    queueIndex,
    setShowDirectModal,
    setShowVisualizer,
    showVisualizer,
    setShowQueueDrawer,
  } = usePlayer();

  const upcomingCount = Math.max(0, queue.length - queueIndex - 1);

  // Load search history from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setSearchHistory(parsed);
        }
      }
    } catch {
      // Ignore localStorage read errors
    }
  }, []);

  const saveToHistory = useCallback((query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return;
    setSearchHistory((prev) => {
      const filtered = prev.filter(
        (item) => item.toLowerCase() !== trimmed.toLowerCase()
      );
      const updated = [trimmed, ...filtered].slice(0, 25);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // Ignore localStorage write error
      }
      return updated;
    });
  }, []);

  const removeFromHistory = useCallback(
    (itemToRemove: string, e: React.MouseEvent) => {
      e.stopPropagation();
      setSearchHistory((prev) => {
        const updated = prev.filter((item) => item !== itemToRemove);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        } catch {
          // Ignore
        }
        return updated;
      });
    },
    []
  );

  const clearAllHistory = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setSearchHistory([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore
    }
  }, []);

  // Fetch live suggestions as user types
  useEffect(() => {
    const trimmed = searchInput.trim();
    if (!trimmed) {
      setLiveSuggestions([]);
      return;
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(async () => {
      suggestAbortRef.current?.abort();
      const controller = new AbortController();
      suggestAbortRef.current = controller;
      const reqId = ++suggestReqIdRef.current;

      try {
        const res = await fetch(`/api/suggest?q=${encodeURIComponent(trimmed)}`, {
          signal: controller.signal,
        });
        const data = await res.json();
        if (reqId !== suggestReqIdRef.current) return;
        if (Array.isArray(data.suggestions)) {
          setLiveSuggestions(data.suggestions);
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        if (reqId === suggestReqIdRef.current) {
          setLiveSuggestions([]);
        }
      }
    }, 180);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchInput]);

  // Click outside listener to dismiss suggestions
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        desktopSearchRef.current &&
        !desktopSearchRef.current.contains(e.target as Node) &&
        mobileSearchRef.current &&
        !mobileSearchRef.current.contains(e.target as Node)
      ) {
        setIsFocused(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Matching history comes FIRST
  const trimmed = searchInput.trim().toLowerCase();
  const matchingHistory = trimmed
    ? searchHistory.filter((h) => h.toLowerCase().includes(trimmed)).slice(0, 5)
    : searchHistory.slice(0, 6);

  // Suggestions excluding items already in matchingHistory
  const filteredSuggestions = liveSuggestions
    .filter((s) => !matchingHistory.some((h) => h.toLowerCase() === s.toLowerCase()))
    .slice(0, 8);

  const allItems = [
    ...matchingHistory.map((text) => ({ text, isHistory: true })),
    ...filteredSuggestions.map((text) => ({ text, isHistory: false })),
  ];

  const handleExecuteSearch = (query: string) => {
    const target = query.trim();
    if (!target) return;
    saveToHistory(target);
    onSearch(target);
    setIsFocused(false);
    setMobileSearchOpen(false);
    setSelectedIndex(-1);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedIndex >= 0 && allItems[selectedIndex]) {
      handleExecuteSearch(allItems[selectedIndex].text);
    } else {
      handleExecuteSearch(searchInput);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isFocused || allItems.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % allItems.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev <= 0 ? allItems.length - 1 : prev - 1));
    } else if (e.key === "Escape") {
      setIsFocused(false);
    }
  };

  const handleClear = () => {
    setSearchInput("");
    setSelectedIndex(-1);
  };

  const renderSuggestionsDropdown = () => {
    if (!isFocused) return null;
    if (allItems.length === 0) return null;

    return (
      <div className="suggestions-dropdown custom-suggestions-menu">
        {/* If empty query and history exists, show header with clear button */}
        {!trimmed && matchingHistory.length > 0 && (
          <div className="suggestions-header">
            <span>Recent Searches</span>
            <button
              type="button"
              className="clear-history-all-btn"
              onClick={clearAllHistory}
              title="Clear all search history"
            >
              <Trash2 size={12} />
              <span>Clear All</span>
            </button>
          </div>
        )}

        {/* List of items */}
        {allItems.map((item, idx) => {
          const isSelected = selectedIndex === idx;
          return (
            <div
              key={`${item.isHistory ? "h" : "s"}-${item.text}-${idx}`}
              className={`suggestion-row ${
                isSelected ? "suggestion-row-active" : ""
              } ${item.isHistory ? "history-row" : ""}`}
              onMouseDown={() => handleExecuteSearch(item.text)}
              onMouseEnter={() => setSelectedIndex(idx)}
            >
              <div className="suggestion-content">
                {item.isHistory ? (
                  <Clock size={16} className="item-icon icon-history" />
                ) : (
                  <Search size={16} className="item-icon icon-search" />
                )}
                <span
                  className={`suggestion-query-text ${
                    item.isHistory ? "text-history-highlight" : ""
                  }`}
                >
                  {item.text}
                </span>
              </div>

              {item.isHistory && (
                <button
                  type="button"
                  className="remove-history-item-btn"
                  onClick={(e) => removeFromHistory(item.text, e)}
                  title="Remove from history"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <header className="navbar-container glass-panel">
      {/* Mobile Search Overlay */}
      {mobileSearchOpen ? (
        <div className="mobile-search-bar" ref={mobileSearchRef}>
          <button
            type="button"
            className="icon-btn"
            onClick={() => {
              setMobileSearchOpen(false);
              setIsFocused(false);
            }}
            aria-label="Close search"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="mobile-search-box-wrap">
            <form className="mobile-search-form" onSubmit={handleSearchSubmit}>
              <input
                type="text"
                className="mobile-search-input"
                placeholder="Search songs, artists, podcasts..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onKeyDown={handleKeyDown}
                autoFocus
              />
              {searchInput && (
                <button
                  type="button"
                  className="clear-search-btn"
                  onClick={handleClear}
                  aria-label="Clear search input"
                >
                  <X size={18} />
                </button>
              )}
              <button
                type="submit"
                className="mobile-search-submit"
                aria-label="Search"
              >
                <Search size={18} />
              </button>
            </form>
            {renderSuggestionsDropdown()}
          </div>
        </div>
      ) : (
        <>
          {/* Left section: Hamburger & Brand */}
          <div className="navbar-brand-section">
            <button
              className="icon-btn hamburger-btn"
              onClick={onToggleSidebar}
              title="Toggle Menu"
              aria-label="Toggle Navigation Menu"
            >
              <Menu size={22} />
            </button>

            <div
              className="brand-logo"
              onClick={() => onSearch("trending music")}
              role="button"
              tabIndex={0}
            >
              <div className="brand-icon-wrapper">
                <div className="brand-icon-bg">
                  <Music2 size={18} color="#ffffff" />
                </div>
                {isPlaying && <span className="brand-pulse-dot" />}
              </div>
              <div className="brand-text-wrapper">
                <span className="brand-title">YT</span>
                <span className="brand-badge">audio</span>
              </div>
            </div>
          </div>

          {/* Center section: Desktop Search bar with Autocomplete */}
          <div className="desktop-search-outer" ref={desktopSearchRef}>
            <form className="navbar-search-form" onSubmit={handleSearchSubmit}>
              <div className="search-input-wrapper">
                <input
                  type="text"
                  className="search-input"
                  placeholder="Search songs, artists, podcasts, or paste a link..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onFocus={() => setIsFocused(true)}
                  onKeyDown={handleKeyDown}
                  autoComplete="off"
                />
                {searchInput && (
                  <button
                    type="button"
                    className="clear-search-btn"
                    onClick={handleClear}
                    aria-label="Clear search input"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
              <button
                type="submit"
                className="search-submit-btn"
                aria-label="Search"
                title="Search"
              >
                <Search size={19} />
              </button>
            </form>

            {/* Suggestions Dropdown */}
            {renderSuggestionsDropdown()}
          </div>

          {/* Right section: Action buttons */}
          <div className="navbar-actions">
            {/* Mobile search trigger icon */}
            <button
              className="icon-btn mobile-search-trigger"
              onClick={() => {
                setMobileSearchOpen(true);
                setIsFocused(true);
              }}
              aria-label="Open search"
              title="Search"
            >
              <Search size={20} />
            </button>

            {/* Paste URL Button */}
            <button
              className="action-pill-btn"
              onClick={() => setShowDirectModal(true)}
              title="Play from YouTube Link"
            >
              <LinkIcon size={16} />
              <span className="btn-label">Paste Link</span>
            </button>

            {/* Visualizer Toggle */}
            <button
              className={`icon-btn ${showVisualizer ? "icon-btn-active" : ""}`}
              onClick={() => setShowVisualizer((prev) => !prev)}
              title="Audio Visualizer"
              aria-label="Toggle Audio Visualizer"
            >
              <Activity
                size={20}
                className={isPlaying ? "visualizer-icon-active" : ""}
              />
            </button>

            {/* Queue Drawer Toggle */}
            <button
              className="icon-btn queue-btn"
              onClick={() => setShowQueueDrawer((prev) => !prev)}
              title="Up Next Queue"
              aria-label="View Queue"
            >
              <ListMusic size={20} />
              {upcomingCount > 0 && (
                <span className="queue-count-badge">{upcomingCount}</span>
              )}
            </button>
          </div>
        </>
      )}

      <style jsx>{`
        .navbar-container {
          position: sticky;
          top: 0;
          z-index: 1000;
          height: var(--header-height);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 20px;
          gap: 16px;
        }

        .navbar-brand-section {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-shrink: 0;
        }

        .brand-logo {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          user-select: none;
        }

        .brand-icon-wrapper {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .brand-icon-bg {
          width: 36px;
          height: 36px;
          border-radius: 9px;
          background: var(--gradient-brand);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 14px var(--yt-red-glow);
          transition: transform 0.2s ease;
        }

        .brand-pulse-dot {
          position: absolute;
          top: -2px;
          right: -2px;
          width: 9px;
          height: 9px;
          border-radius: 50%;
          background: var(--accent-cyan);
          box-shadow: 0 0 8px var(--accent-cyan);
          animation: pulse-subtle 1.2s infinite;
        }

        .brand-text-wrapper {
          display: flex;
          align-items: center;
          gap: 5px;
        }

        .brand-title {
          font-size: 1.22rem;
          font-weight: 800;
          letter-spacing: -0.4px;
          background: linear-gradient(180deg, #ffffff 40%, #c0c5d5 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .brand-badge {
          font-size: 0.62rem;
          font-weight: 700;
          letter-spacing: 0.7px;
          padding: 2px 6px;
          border-radius: 4px;
          background: rgba(255, 0, 51, 0.18);
          color: #ff4d6d;
          border: 1px solid rgba(255, 0, 51, 0.3);
        }

        /* Desktop Search Wrapper with Autocomplete */
        .desktop-search-outer {
          position: relative;
          flex: 1;
          max-width: 620px;
        }

        .navbar-search-form {
          width: 100%;
          display: flex;
          align-items: center;
        }

        .search-input-wrapper {
          flex: 1;
          position: relative;
          display: flex;
          align-items: center;
          background: var(--bg-surface);
          border: 1px solid var(--border-subtle);
          border-right: none;
          border-radius: var(--radius-full) 0 0 var(--radius-full);
          transition: border-color 0.2s ease, background-color 0.2s ease;
        }

        .search-input-wrapper:focus-within {
          border-color: #3ea6ff;
          background: var(--bg-elevated);
        }

        .search-input {
          width: 100%;
          padding: 9px 16px;
          background: transparent;
          border: none;
          color: var(--text-primary);
          font-size: 0.92rem;
        }

        .search-input::placeholder {
          color: var(--text-muted);
        }

        .clear-search-btn {
          padding: 8px 10px;
          color: var(--text-muted);
          display: flex;
          align-items: center;
        }

        .clear-search-btn:hover {
          color: var(--text-primary);
        }

        .search-submit-btn {
          background: var(--bg-hover);
          border: 1px solid var(--border-subtle);
          border-radius: 0 var(--radius-full) var(--radius-full) 0;
          padding: 9px 20px;
          color: var(--text-secondary);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        }

        .search-submit-btn:hover {
          background: var(--bg-active);
          color: var(--text-primary);
        }

        /* Suggestions Dropdown */
        .suggestions-dropdown {
          position: absolute;
          top: calc(100% + 4px);
          left: 0;
          right: 0;
          background: #14161d !important;
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 12px;
          padding: 8px 0;
          box-shadow: 0 16px 40px rgba(0, 0, 0, 0.95), 0 0 0 1px rgba(255, 255, 255, 0.06);
          z-index: 2500;
          max-height: 420px;
          overflow-y: auto;
          backdrop-filter: blur(28px);
          animation: dropFadeIn 0.15s ease;
        }

        @keyframes dropFadeIn {
          from {
            opacity: 0;
            transform: translateY(-4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .suggestions-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 6px 18px 8px;
          font-size: 0.68rem;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.7px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          margin-bottom: 4px;
        }

        .clear-history-all-btn {
          display: flex;
          align-items: center;
          gap: 5px;
          color: var(--text-muted);
          font-size: 0.7rem;
          font-weight: 600;
          padding: 2px 8px;
          border-radius: 4px;
          background: rgba(255, 255, 255, 0.04);
          transition: all 0.15s ease;
        }

        .clear-history-all-btn:hover {
          color: var(--yt-red);
          background: rgba(255, 0, 51, 0.12);
        }

        .suggestion-row {
          display: flex;
          flex-direction: row;
          align-items: center;
          justify-content: space-between;
          padding: 8px 16px;
          cursor: pointer;
          transition: background-color 0.12s ease;
          gap: 12px;
          position: relative;
        }

        .suggestion-row:hover,
        .suggestion-row-active {
          background: rgba(255, 255, 255, 0.08);
        }

        .history-row {
          background: rgba(157, 78, 221, 0.04);
        }

        .history-row:hover,
        .history-row.suggestion-row-active {
          background: rgba(157, 78, 221, 0.15);
        }

        .suggestion-content {
          display: flex;
          flex-direction: row;
          align-items: center;
          gap: 14px;
          min-width: 0;
          flex: 1;
        }

        .item-icon {
          flex-shrink: 0;
        }

        .icon-history {
          color: #c084fc;
        }

        .icon-search {
          color: var(--text-muted);
        }

        .suggestion-query-text {
          font-size: 0.9rem;
          color: #f1f5f9;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          font-weight: 400;
        }

        .text-history-highlight {
          color: #ffffff;
          font-weight: 600;
        }

        .remove-history-item-btn {
          color: var(--text-muted);
          width: 26px;
          height: 26px;
          border-radius: 50%;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: all 0.15s ease;
          background: transparent;
          border: none;
          cursor: pointer;
        }

        .remove-history-item-btn:hover {
          color: #ffffff;
          background: rgba(255, 0, 51, 0.25);
        }

        .navbar-actions {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-shrink: 0;
        }

        .mobile-search-trigger {
          display: none;
        }

        .icon-btn {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-secondary);
          background: transparent;
          transition: all 0.2s ease;
        }

        .icon-btn:hover {
          background: var(--bg-hover);
          color: var(--text-primary);
        }

        .icon-btn-active {
          background: rgba(255, 0, 51, 0.2);
          color: var(--yt-red);
          border: 1px solid rgba(255, 0, 51, 0.4);
        }

        .visualizer-icon-active {
          animation: pulse-subtle 1.2s infinite;
          color: #ff3366;
        }

        .action-pill-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          background: var(--bg-elevated);
          border: 1px solid var(--border-subtle);
          color: var(--text-primary);
          padding: 7px 14px;
          border-radius: var(--radius-full);
          font-size: 0.84rem;
          font-weight: 500;
          transition: all 0.2s ease;
        }

        .action-pill-btn:hover {
          background: var(--bg-hover);
          border-color: rgba(255, 255, 255, 0.2);
        }

        .queue-btn {
          position: relative;
        }

        .queue-count-badge {
          position: absolute;
          top: 2px;
          right: 2px;
          background: var(--yt-red);
          color: white;
          font-size: 0.62rem;
          font-weight: 700;
          min-width: 16px;
          height: 16px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 4px;
        }

        /* Mobile Search Bar View */
        .mobile-search-bar {
          display: flex;
          align-items: center;
          width: 100%;
          gap: 8px;
        }

        .mobile-search-box-wrap {
          flex: 1;
          position: relative;
        }

        .mobile-search-form {
          width: 100%;
          display: flex;
          align-items: center;
          background: var(--bg-surface);
          border: 1px solid #3ea6ff;
          border-radius: var(--radius-full);
          padding: 2px 8px 2px 14px;
        }

        .mobile-search-input {
          flex: 1;
          background: transparent;
          border: none;
          color: #ffffff;
          font-size: 0.95rem;
          padding: 6px 0;
        }

        .mobile-search-submit {
          color: var(--text-secondary);
          padding: 6px;
          display: flex;
          align-items: center;
        }

        @media (max-width: 768px) {
          .navbar-container {
            padding: 0 12px;
            gap: 8px;
          }

          .desktop-search-outer {
            display: none;
          }

          .mobile-search-trigger {
            display: flex;
          }

          .btn-label {
            display: none;
          }

          .action-pill-btn {
            padding: 8px;
            border-radius: 50%;
            width: 38px;
            height: 38px;
            justify-content: center;
          }

          .brand-title {
            font-size: 1.1rem;
          }
          .brand-badge {
            display: none;
          }
        }
      `}</style>
    </header>
  );
}
