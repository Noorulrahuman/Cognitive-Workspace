"use client";

import React, { useState } from "react";
import Image from "next/image";

export interface CognitiveLogoProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  variant?: "icon" | "full";
  animated?: boolean;
  showTagline?: boolean;
  showCWPill?: boolean;
  className?: string;
  onClick?: () => void;
}

export default function CognitiveLogo({
  size = "md",
  variant = "icon",
  animated = true,
  showTagline = true,
  showCWPill = true,
  className = "",
  onClick,
}: CognitiveLogoProps) {
  const [isHovered, setIsHovered] = useState(false);

  // Dimension presets
  const sizeConfig = {
    xs: {
      wrapper: "w-7 h-7",
      imageSize: 28,
      borderPad: "p-0.5",
      rounded: "rounded-lg",
      textSize: "text-xs",
      subtextSize: "text-[9px]",
      pillSize: "text-[8px] px-1 py-0.2",
    },
    sm: {
      wrapper: "w-9 h-9 sm:w-10 sm:h-10",
      imageSize: 40,
      borderPad: "p-0.5",
      rounded: "rounded-xl",
      textSize: "text-sm",
      subtextSize: "text-[10px]",
      pillSize: "text-[9px] px-1.5 py-0.2",
    },
    md: {
      wrapper: "w-14 h-14 sm:w-16 sm:h-16",
      imageSize: 64,
      borderPad: "p-1",
      rounded: "rounded-2xl",
      textSize: "text-lg",
      subtextSize: "text-xs",
      pillSize: "text-[10px] px-2 py-0.5",
    },
    lg: {
      wrapper: "w-36 h-36 sm:w-44 sm:h-44",
      imageSize: 176,
      borderPad: "p-1.5",
      rounded: "rounded-3xl",
      textSize: "text-2xl sm:text-3xl",
      subtextSize: "text-xs sm:text-sm",
      pillSize: "text-xs px-3 py-1",
    },
    xl: {
      wrapper: "w-56 h-56 sm:w-72 sm:h-72 lg:w-80 lg:h-80",
      imageSize: 320,
      borderPad: "p-2",
      rounded: "rounded-[32px] sm:rounded-[40px]",
      textSize: "text-3xl sm:text-4xl lg:text-5xl",
      subtextSize: "text-xs sm:text-sm",
      pillSize: "text-xs px-3.5 py-1",
    },
  }[size];

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`inline-flex flex-col items-center justify-center select-none group ${className}`}
      aria-label="Cognitive Workspace Logo"
    >
      {/* ===== 1. ICON CONTAINER WITH DYNAMIC GRADIENT & NEON GLOW ===== */}
      <div className={`relative flex items-center justify-center ${sizeConfig.wrapper}`}>
        {/* Ambient Neon Backlight Halo */}
        {animated && (
          <div
            className={`absolute -inset-3 sm:-inset-5 rounded-full blur-2xl sm:blur-3xl opacity-60 transition-opacity duration-700 pointer-events-none ${
              isHovered ? "opacity-95 scale-105" : "opacity-60"
            }`}
            style={{
              background: `radial-gradient(circle, rgba(6,182,212,0.55) 0%, rgba(168,85,247,0.45) 45%, rgba(236,72,153,0.25) 75%, transparent 100%)`,
            }}
          />
        )}

        {/* Outer Rotating Gradient Border (Cyan to Purple-Magenta) */}
        <div
          className={`relative w-full h-full ${sizeConfig.borderPad} ${sizeConfig.rounded} transition-transform duration-500 ${
            isHovered ? "scale-105 shadow-[0_0_35px_rgba(6,182,212,0.6)]" : "shadow-[0_0_20px_rgba(168,85,247,0.35)]"
          }`}
          style={{
            background: animated
              ? `linear-gradient(135deg, #06b6d4 0%, #3b82f6 30%, #8b5cf6 60%, #ec4899 90%, #06b6d4 100%)`
              : `linear-gradient(135deg, #06b6d4, #8b5cf6)`,
            backgroundSize: "300% 300%",
          }}
        >
          {/* Inner Masked Container for the Chip Image & SVG Circuits */}
          <div
            className={`relative w-full h-full bg-[#0d1117] ${sizeConfig.rounded} overflow-hidden flex items-center justify-center border border-white/10`}
          >
            {/* The Authentic High-Tech CW Cybernetic Owl Emblem */}
            <Image
              src="/logo.jpg"
              alt="Cognitive Workspace CW Cybernetic Owl Logo"
              width={sizeConfig.imageSize}
              height={sizeConfig.imageSize}
              priority={size === "xl" || size === "lg"}
              className={`w-full h-full object-cover transition-transform duration-700 ${
                isHovered ? "scale-108" : "scale-100"
              }`}
            />

            {/* Specular Light Reflection Sweep */}
            {animated && (
              <div
                className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"
                style={{
                  transform: isHovered ? "translateX(100%)" : "translateX(-100%)",
                  transition: "transform 1.2s ease-in-out, opacity 0.5s",
                }}
              />
            )}

            {/* Live Neon Pulse Overlay on the Owl Crest */}
            {animated && (size === "lg" || size === "xl") && (
              <div className="absolute inset-0 pointer-events-none">
                {/* SVG Circuit Lines & CW Laser Path */}
                <svg
                  className="w-full h-full opacity-60 group-hover:opacity-100 transition-opacity duration-500"
                  viewBox="0 0 200 200"
                  fill="none"
                >
                  {/* Glowing perimeter circuit traces */}
                  <path
                    d="M 20,40 L 40,40 L 40,20 M 180,40 L 160,40 L 160,20 M 20,160 L 40,160 L 40,180 M 180,160 L 160,160 L 160,180"
                    stroke="#06b6d4"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeDasharray="4 6"
                    className="animate-circuit-flow"
                  />
                  {/* Subtle CW Crest accent beam */}
                  <path
                    d="M 75,55 Q 100,70 125,55"
                    stroke="#ec4899"
                    strokeWidth="1"
                    strokeLinecap="round"
                    opacity="0.8"
                  />
                </svg>
              </div>
            )}
          </div>
        </div>

        
      </div>

      {/* ===== 2. CW IDENTIFIER & TYPOGRAPHY (WHEN VARIANT IS FULL OR SHOWING CW PILL) ===== */}
      {variant === "full" && (
        <div className="mt-4 flex flex-col items-center text-center">
          {/* Defining "CW" Clearly as the Owl's Horns / Crest */}
          {showCWPill && (
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-0.5 backdrop-blur-md">
              <span className="font-mono text-[10px] font-bold tracking-wider text-cyan-300 uppercase flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
                <span className="text-white font-extrabold tracking-widest">[ C W ]</span>
                <span className="opacity-70">&bull;</span>
                <span className="text-cyan-200">Cognitive Workspace</span>
              </span>
            </div>
          )}

          {/* Main Title: Cognitive Workspace */}
          <h2
            className={`font-extrabold tracking-tight text-white transition-colors duration-300 ${sizeConfig.textSize}`}
          >
            <span className="bg-gradient-to-r from-white via-cyan-200 to-fuchsia-300 bg-clip-text text-transparent group-hover:drop-shadow-[0_0_16px_rgba(6,182,212,0.5)]">
              Cognitive Workspace
            </span>
          </h2>

          {/* Tagline: THINK • PLAN • CREATE */}
          {showTagline && (
            <p
              className={`mt-1 font-mono tracking-[0.25em] uppercase text-zinc-400 font-medium ${sizeConfig.subtextSize}`}
            >
              <span className="hover:text-cyan-300 transition-colors">Think</span>
              <span className="mx-2 text-cyan-500/60 font-bold">&bull;</span>
              <span className="hover:text-purple-300 transition-colors">Plan</span>
              <span className="mx-2 text-cyan-500/60 font-bold">&bull;</span>
              <span className="hover:text-pink-300 transition-colors">Create</span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
