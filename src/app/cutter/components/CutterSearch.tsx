"use client";

import React from "react";
import { Search, X, Loader2 } from "lucide-react";
import { SearchResult, extractYouTubeId } from "../types";

interface CutterSearchProps {
  inputQuery: string;
  setInputQuery: (val: string) => void;
  isSearching: boolean;
  searchResults: SearchResult[];
  hasSearched: boolean;
  setHasSearched: (val: boolean) => void;
  searchError: string | null;
  suggestions: string[];
  showSuggestions: boolean;
  setShowSuggestions: (val: boolean) => void;
  selectedSuggestionIndex: number;
  setSelectedSuggestionIndex: React.Dispatch<React.SetStateAction<number>>;
  searchWrapRef: React.RefObject<HTMLDivElement | null>;
  executeSearch: (queryText: string) => void;
  handleSearchOrLoad: (e?: React.FormEvent) => void;
  handleInputKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  loadVideo: (id: string, title?: string, author?: string, durationSec?: number) => void;
}

export function CutterSearch({
  inputQuery,
  setInputQuery,
  isSearching,
  searchResults,
  hasSearched,
  setHasSearched,
  searchError,
  suggestions,
  showSuggestions,
  setShowSuggestions,
  selectedSuggestionIndex,
  setSelectedSuggestionIndex,
  searchWrapRef,
  executeSearch,
  handleSearchOrLoad,
  handleInputKeyDown,
  loadVideo,
}: CutterSearchProps) {
  return (
    <>
      {/* Search & URL Input Card */}
      <section className="cutter-card">
        <form className="cutter-search-form" onSubmit={handleSearchOrLoad}>
          <div className="cutter-search-input-wrap" ref={searchWrapRef}>
            <Search className="cutter-search-icon" size={20} />
            <input
              id="cutter-input-field"
              type="text"
              className="cutter-search-input"
              placeholder="Paste YouTube video URL or search by song, artist, video name…"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              onFocus={() => {
                if (suggestions.length > 0) setShowSuggestions(true);
              }}
              onKeyDown={handleInputKeyDown}
              autoComplete="off"
            />
            {inputQuery && (
              <button
                type="button"
                className="cutter-clear-btn"
                onClick={() => {
                  setInputQuery("");
                  setShowSuggestions(false);
                }}
                title="Clear"
              >
                <X size={18} />
              </button>
            )}

            {/* Suggestions Dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="cutter-suggestions-dropdown">
                <div className="cutter-suggestions-header">
                  <span>Search Suggestions</span>
                </div>
                {suggestions.map((item, idx) => (
                  <div
                    key={`${item}-${idx}`}
                    className={`cutter-suggestion-item ${
                      selectedSuggestionIndex === idx ? "active" : ""
                    }`}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      executeSearch(item);
                    }}
                    onMouseEnter={() => setSelectedSuggestionIndex(idx)}
                  >
                    <Search size={15} className="cutter-suggestion-icon" />
                    <span className="cutter-suggestion-text">{item}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            type="submit"
            className="cutter-action-btn"
            disabled={isSearching || !inputQuery.trim()}
            id="cutter-search-submit"
          >
            {isSearching ? (
              <>
                <Loader2 size={18} className="cutter-spinner" />
                <span>Searching…</span>
              </>
            ) : (
              <>
                <Search size={18} />
                <span>Fetch & Load</span>
              </>
            )}
          </button>
        </form>

        {/* Quick Example Chips */}
        <div className="cutter-quick-chips">
          <span className="cutter-chip-label">Try Examples:</span>
          <button
            type="button"
            className="cutter-chip"
            onClick={async () => {
              try {
                const clip = await navigator.clipboard.readText();
                if (clip) {
                  setInputQuery(clip);
                  const id = extractYouTubeId(clip);
                  if (id) loadVideo(id);
                  else executeSearch(clip);
                }
              } catch {}
            }}
          >
            📋 Paste from Clipboard
          </button>
          <button
            type="button"
            className="cutter-chip"
            onClick={() => {
              setInputQuery("Lofi hip hop beats to relax");
              executeSearch("Lofi hip hop beats to relax");
            }}
          >
            🎧 Lofi Chill
          </button>
          <button
            type="button"
            className="cutter-chip"
            onClick={() => {
              setInputQuery("Bollywood romantic songs mashup");
              executeSearch("Bollywood romantic songs mashup");
            }}
          >
            🎵 Bollywood Mashup
          </button>
          <button
            type="button"
            className="cutter-chip"
            onClick={() => {
              setInputQuery("Synthwave 80s retro electro");
              executeSearch("Synthwave 80s retro electro");
            }}
          >
            ⚡ Synthwave 80s
          </button>
        </div>
      </section>

      {/* Search Results Grid */}
      {hasSearched && (
        <section className="cutter-card cutter-results-section">
          <div className="cutter-results-header">
            <h2 className="cutter-results-title">
              <Search size={18} color="#00f0ff" />
              <span>Search Results</span>
              <span style={{ fontSize: "0.85rem", color: "#94a3b8", fontWeight: 400 }}>
                ({searchResults.length} videos)
              </span>
            </h2>
            <button
              type="button"
              className="cutter-btn-secondary"
              onClick={() => setHasSearched(false)}
            >
              <X size={14} />
              <span>Close Results</span>
            </button>
          </div>

          {searchError && (
            <p style={{ color: "#ff4757", fontSize: "0.9rem" }}>{searchError}</p>
          )}

          <div className="cutter-results-grid">
            {searchResults.map((item) => (
              <div
                key={item.id}
                className="cutter-result-card"
                onClick={() => {
                  loadVideo(item.id, item.title, item.uploader, item.duration);
                  setHasSearched(false);
                }}
              >
                <div className="cutter-result-thumb-wrap">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.thumbnail}
                    alt={item.title}
                    className="cutter-result-thumb"
                    loading="lazy"
                  />
                  <span className="cutter-result-duration">{item.duration_string}</span>
                </div>
                <div className="cutter-result-info">
                  <div className="cutter-result-name" title={item.title}>
                    {item.title}
                  </div>
                  <div className="cutter-result-channel">{item.uploader}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
