"use client";

import React from "react";

interface CategoryChipsProps {
  categories: { label: string; query: string }[];
  activeCategory: string;
  onSelect: (query: string) => void;
}

export function CategoryChips({ categories, activeCategory, onSelect }: CategoryChipsProps) {
  return (
    <div className="chips-container">
      {categories.map((cat) => {
        const isActive = activeCategory === cat.query;
        return (
          <button
            key={cat.label}
            className={`chip-btn ${isActive ? "chip-active" : ""}`}
            onClick={() => onSelect(cat.query)}
          >
            {cat.label}
          </button>
        );
      })}

      <style jsx>{`
        .chips-container {
          display: flex;
          align-items: center;
          gap: 8px;
          overflow-x: auto;
          padding: 10px 16px;
          background: #0a0b0e;
          position: sticky;
          top: 0;
          z-index: 90;
          white-space: nowrap;
          border-bottom: 1px solid var(--border-subtle);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
          -webkit-overflow-scrolling: touch;
        }

        .chips-container::-webkit-scrollbar {
          display: none;
        }
        .chips-container {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }

        .chip-btn {
          padding: 6px 14px;
          background: var(--bg-elevated);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-sm);
          color: var(--text-primary);
          font-size: 0.82rem;
          font-weight: 500;
          transition: all 0.2s ease;
          flex-shrink: 0;
          touch-action: manipulation;
        }

        .chip-btn:hover {
          background: var(--bg-hover);
          border-color: rgba(255, 255, 255, 0.2);
        }

        .chip-active {
          background: #ffffff;
          color: #0f0f0f;
          font-weight: 600;
          border-color: #ffffff;
          box-shadow: 0 2px 10px rgba(255, 255, 255, 0.2);
        }

        .chip-active:hover {
          background: #f0f0f0;
        }

        @media (max-width: 640px) {
          .chips-container {
            padding: 8px 12px;
            gap: 6px;
          }
          .chip-btn {
            padding: 5px 12px;
            font-size: 0.78rem;
          }
        }
      `}</style>
    </div>
  );
}
