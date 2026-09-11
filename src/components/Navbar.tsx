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
import "./Navbar.css";

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

  // Hardware Back button support for mobile search overlay
  const isMobileSearchPopstateRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (mobileSearchOpen) {
      window.history.pushState({ isModal: true, modal: "mobileSearch" }, "");
    } else {
      if (!isMobileSearchPopstateRef.current && window.history.state?.modal === "mobileSearch") {
        window.history.back();
      }
    }
  }, [mobileSearchOpen]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handlePopState = () => {
      if (mobileSearchOpen) {
        isMobileSearchPopstateRef.current = true;
        setMobileSearchOpen(false);
        setIsFocused(false);
        setTimeout(() => {
          isMobileSearchPopstateRef.current = false;
        }, 80);
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [mobileSearchOpen]);

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

  const isNavigatingRef = useRef(false);

  // Fetch live suggestions as user types
  useEffect(() => {
    if (isNavigatingRef.current) {
      isNavigatingRef.current = false;
      return;
    }

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
    setSearchInput(target);
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
      setSelectedIndex((prev) => {
        const next = (prev + 1) % allItems.length;
        if (allItems[next]) {
          isNavigatingRef.current = true;
          setSearchInput(allItems[next].text);
        }
        return next;
      });
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => {
        const next = prev <= 0 ? allItems.length - 1 : prev - 1;
        if (allItems[next]) {
          isNavigatingRef.current = true;
          setSearchInput(allItems[next].text);
        }
        return next;
      });
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
              onMouseDown={(e) => {
                e.preventDefault();
                handleExecuteSearch(item.text);
              }}
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

    </header>
  );
}
