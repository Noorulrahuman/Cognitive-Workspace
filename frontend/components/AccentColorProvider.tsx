"use client";

import React, { createContext, useContext, useEffect, useState, useMemo } from "react";

export interface AccentPreset {
  id: string;
  name: string;
  hex: string;
  description: string;
}

export const ACCENT_PRESETS: AccentPreset[] = [
  {
    id: "sky",
    name: "Nordic Sky",
    hex: "#93c5fd",
    description: "Cool airy soft sky blue for crisp, balanced architectural focus",
  },
  {
    id: "violet",
    name: "Cosmic Violet",
    hex: "#c084fc",
    description: "Sleek luminous amethyst for deep creative focus and AI agentic poise",
  },
  {
    id: "emerald",
    name: "Aurora Emerald",
    hex: "#34d399",
    description: "Radiant high-contrast emerald for live health, momentum and clarity",
  },
  {
    id: "amber",
    name: "Golden Topaz",
    hex: "#fbbf24",
    description: "Lustrous warm cyber gold matching the executive Owl emblem",
  },
  {
    id: "periwinkle",
    name: "Soft Periwinkle",
    hex: "#a5b4fc",
    description: "Balanced, refined blue-violet tone with executive serenity",
  },
  {
    id: "rose",
    name: "Rose Quartz",
    hex: "#fda4af",
    description: "Subtle muted dusty rose with graceful modern elegance",
  },
  {
    id: "sage",
    name: "Soft Sage",
    hex: "#98d8aa",
    description: "Calming botanical mint sage for clean, organic clarity",
  },
  {
    id: "slate",
    name: "Frosted Slate",
    hex: "#cbd5e1",
    description: "Neutral architectural titanium slate for minimalist poise",
  },
];


export const DEFAULT_ACCENT = "#93c5fd"; // Gentle Nordic Sky - crisp, soft, and modern

interface AccentContextType {
  accentColor: string;
  setAccentColor: (hex: string) => void;
  presets: AccentPreset[];
  isLoaded: boolean;
  activePreset: AccentPreset | null;
}

const AccentContext = createContext<AccentContextType>({
  accentColor: DEFAULT_ACCENT,
  setAccentColor: () => {},
  presets: ACCENT_PRESETS,
  isLoaded: false,
  activePreset: null,
});

/**
 * Parses 3 or 6 digit hex string into RGB numbers
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  let cleaned = hex.trim().replace(/^#/, "");
  if (cleaned.length === 3) {
    cleaned = cleaned
      .split("")
      .map((c) => c + c)
      .join("");
  }
  if (cleaned.length !== 6) return null;
  const num = parseInt(cleaned, 16);
  if (isNaN(num)) return null;
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

/**
 * Calculates a slightly darker shade for hover states
 */
function adjustBrightness(rgb: { r: number; g: number; b: number }, factor: number): string {
  const r = Math.min(255, Math.max(0, Math.round(rgb.r * factor)));
  const g = Math.min(255, Math.max(0, Math.round(rgb.g * factor)));
  const b = Math.min(255, Math.max(0, Math.round(rgb.b * factor)));
  const toHex = (n: number) => n.toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Applies CSS variables directly to :root (document.documentElement)
 */
export function applyAccentToCss(hex: string) {
  if (typeof document === "undefined") return;
  const rgb = hexToRgb(hex);
  if (!rgb) return;

  const root = document.documentElement;
  const hoverHex = adjustBrightness(rgb, 0.85);
  const luminance = 0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b;
  const textTint = luminance > 190 ? "#ffffff" : adjustBrightness(rgb, 1.4);

  root.style.setProperty("--accent-color", hex);
  root.style.setProperty("--accent-hover", hoverHex);
  root.style.setProperty("--accent-rgb", `${rgb.r}, ${rgb.g}, ${rgb.b}`);
  root.style.setProperty("--accent-subtle", `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.16)`);
  root.style.setProperty("--accent-border", `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.28)`);
  root.style.setProperty("--accent-glow", `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.28)`);
  root.style.setProperty("--accent-ring", `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.4)`);
  root.style.setProperty("--accent-text", textTint);

  window.dispatchEvent(
    new CustomEvent("accent-color-change", {
      detail: { hex, rgb, hoverHex },
    })
  );
}

export function AccentColorProvider({ children }: { children: React.ReactNode }) {
  const [accentColor, setAccentColorState] = useState<string>(DEFAULT_ACCENT);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("cognitive_accent_color");
      if (saved && hexToRgb(saved)) {
        setAccentColorState(saved);
        applyAccentToCss(saved);
      } else {
        applyAccentToCss(DEFAULT_ACCENT);
      }
    } catch {
      applyAccentToCss(DEFAULT_ACCENT);
    }
    setIsLoaded(true);
  }, []);

  const setAccentColor = (newHex: string) => {
    const valid = hexToRgb(newHex);
    if (!valid) return;
    setAccentColorState(newHex);
    applyAccentToCss(newHex);
    try {
      localStorage.setItem("cognitive_accent_color", newHex);
    } catch {
      // Storage error ignored
    }
  };

  const activePreset = useMemo(() => {
    return (
      ACCENT_PRESETS.find(
        (p) => p.hex.toLowerCase() === accentColor.toLowerCase()
      ) || null
    );
  }, [accentColor]);

  return (
    <AccentContext.Provider
      value={{
        accentColor,
        setAccentColor,
        presets: ACCENT_PRESETS,
        isLoaded,
        activePreset,
      }}
    >
      {children}
    </AccentContext.Provider>
  );
}

export const useAccent = () => useContext(AccentContext);
