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
    id: "amber",
    name: "Imperial Gold",
    hex: "#f59e0b",
    description: "Warm cognitive sunlight and executive leadership sheen",
  },
  {
    id: "silver",
    name: "Translucent Silver",
    hex: "#e2e8f0",
    description: "Pure frosted silver luminance and modern glass clarity",
  },
  {
    id: "teal",
    name: "Electric Teal",
    hex: "#06b6d4",
    description: "Futuristic vector retrieval and high-velocity computing",
  },
  {
    id: "emerald",
    name: "Emerald Green",
    hex: "#10b981",
    description: "Crisp, balanced biological & financial intelligence tint",
  },
  {
    id: "royal",
    name: "Royal Blue",
    hex: "#2563eb",
    description: "Deep enterprise authority and clean analytical clarity",
  },
  {
    id: "amethyst",
    name: "Amethyst Purple",
    hex: "#8b5cf6",
    description: "Creative neural orchestrations and high-level reasoning",
  },
  {
    id: "crimson",
    name: "Crimson Rose",
    hex: "#e11d48",
    description: "Vibrant high-priority alerts and energetic execution",
  },
];

export const DEFAULT_ACCENT = "#f59e0b"; // Warm Imperial Gold default translucent accent

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
  root.style.setProperty("--accent-border", `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.38)`);
  root.style.setProperty("--accent-glow", `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.45)`);
  root.style.setProperty("--accent-ring", `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.55)`);
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
