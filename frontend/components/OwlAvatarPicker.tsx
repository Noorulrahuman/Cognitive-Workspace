"use client";

import React, { useState } from "react";
import Image from "next/image";
import { OWL_AVATARS, OwlAvatarDef } from "./CuteOwlAvatar";

export interface OwlAvatarPickerProps {
  selectedOwlId?: string;
  selected?: string;
  onSelect: (owlId: string) => void;
  className?: string;
  isModal?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
  title?: string;
}

export function OwlAvatarPicker({
  selectedOwlId,
  selected,
  onSelect,
  className = "",
  isModal = false,
  isOpen = true,
  onClose,
  title = "Choose Your Owl Avatar",
}: OwlAvatarPickerProps) {
  const activeId = selectedOwlId || selected || "avatar-1";
  const [highlightedId, setHighlightedId] = useState(activeId);

  // Sync state when activeId or modal visibility changes
  React.useEffect(() => {
    setHighlightedId(activeId);
  }, [activeId, isOpen]);

  const handleChoose = (id: string) => {
    setHighlightedId(id);
  };

  const handleDoubleClick = (id: string) => {
    setHighlightedId(id);
    onSelect(id);
    if (onClose) onClose();
  };

  const content = (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
        <div>
          <h3 className="text-sm font-bold text-white">{title}</h3>
          <p className="text-xs text-zinc-400">Select from the 12 collectible owl avatars</p>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border border-[var(--accent-border)] bg-[var(--accent-subtle)] text-[var(--accent-text)]">
          12 Avatars
        </span>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 max-h-72 overflow-y-auto p-2 rounded-2xl border border-zinc-800 bg-zinc-950/80">
        {OWL_AVATARS.map((owl) => {
          const isSelected = highlightedId === owl.id;
          return (
            <button
              key={owl.id}
              type="button"
              onClick={() => handleChoose(owl.id)}
              onDoubleClick={() => handleDoubleClick(owl.id)}
                className={`group relative flex flex-col items-center p-2 rounded-2xl border transition-all text-center cursor-pointer ${
                isSelected
                  ? "border-[var(--accent-color)] bg-[var(--accent-subtle)] ring-1 ring-[var(--accent-color)]/40 shadow-sm scale-105"
                  : "border-zinc-800 bg-zinc-900/60 hover:border-zinc-700 hover:bg-zinc-850 hover:scale-102"
              }`}
            >
              <div
                className={`relative w-14 h-14 rounded-full overflow-hidden border-2 transition-all ${
                  isSelected
                    ? "border-[var(--accent-color)] shadow-md"
                    : "border-transparent group-hover:border-zinc-600"
                }`}
              >
                <Image
                  src={`/assets/avatars/${owl.fileName}`}
                  alt={owl.name}
                  width={56}
                  height={56}
                  className="w-full h-full object-cover"
                  unoptimized
                />
                {isSelected && (
                  <div
                    className="absolute bottom-0 right-0 w-4 h-4 rounded-full flex items-center justify-center text-[10px] text-black font-bold"
                    style={{ backgroundColor: "var(--accent-color)" }}
                  >
                    ✓
                  </div>
                )}
              </div>
              <span className="mt-1.5 text-[11px] font-bold text-zinc-200 line-clamp-1 group-hover:text-white">
                {owl.name}
              </span>
              <span className="text-[9px] font-mono text-zinc-400 line-clamp-1">
                {owl.badge}
              </span>
            </button>
          );
        })}
      </div>

      {isModal && (
        <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
          <span className="text-[11px] font-mono text-zinc-500">Double-click to apply</span>
          <div className="flex items-center gap-2">
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 rounded-xl border border-zinc-800 text-xs text-zinc-300 hover:bg-zinc-800 transition"
              >
                Close
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                onSelect(highlightedId);
                if (onClose) onClose();
              }}
              className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-zinc-100 hover:bg-white text-zinc-950 transition active:scale-95 shadow-sm cursor-pointer"
            >
              Save Avatar
            </button>
          </div>
        </div>
      )}
    </div>
  );

  if (!isModal) return content;
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-3xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {content}
      </div>
    </div>
  );
}

export default OwlAvatarPicker;
