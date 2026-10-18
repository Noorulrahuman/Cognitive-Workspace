"use client";

import React from "react";
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
  animated = false,
  showTagline = false,
  showCWPill = false,
  className = "",
  onClick,
}: CognitiveLogoProps) {
  // Dimension presets
  const sizeConfig = {
    xs: {
      wrapper: "w-7 h-7 sm:w-8 sm:h-8",
      imageSize: 32,
      textSize: "text-xs",
      subtextSize: "text-[9px]",
    },
    sm: {
      wrapper: "w-9 h-9 sm:w-10 sm:h-10",
      imageSize: 40,
      textSize: "text-sm",
      subtextSize: "text-[10px]",
    },
    md: {
      wrapper: "w-14 h-14 sm:w-16 sm:h-16",
      imageSize: 64,
      textSize: "text-base sm:text-lg",
      subtextSize: "text-xs",
    },
    lg: {
      wrapper: "w-20 h-20 sm:w-24 sm:h-24",
      imageSize: 96,
      textSize: "text-xl sm:text-2xl",
      subtextSize: "text-xs sm:text-sm",
    },
    xl: {
      wrapper: "w-32 h-32 sm:w-40 sm:h-40",
      imageSize: 160,
      textSize: "text-2xl sm:text-3xl",
      subtextSize: "text-xs sm:text-sm",
    },
  }[size];

  return (
    <div
      onClick={onClick}
      className={`inline-flex flex-col items-center justify-center select-none ${className}`}
      aria-label="Cognitive Workspace Logo"
    >
      {/* Pure Simple Logo Container (No accent glow, no accent filters) */}
      <div className={`relative flex items-center justify-center ${sizeConfig.wrapper}`}>
        <Image
          src="/golden-owl-logo.png"
          alt="Cognitive Workspace Logo"
          width={sizeConfig.imageSize}
          height={sizeConfig.imageSize}
          priority={size === "xl" || size === "lg"}
          className="w-full h-full object-contain"
        />
      </div>

      {/* Brand Typography in Golden Hue Monospace */}
      {variant === "full" && (
        <div className="mt-2.5 flex flex-col items-center text-center">
          <h2
            className={`font-mono font-bold tracking-wider uppercase bg-linear-to-r from-amber-500 via-yellow-200 to-amber-500 bg-[length:200%_auto] bg-clip-text text-transparent animate-gold-shimmer drop-shadow-[0_0_8px_rgba(251,191,36,0.35)] ${sizeConfig.textSize}`}
          >
            Cognitive Workspace
          </h2>

          {showTagline && (
            <p className={`mt-0.5 font-mono tracking-widest uppercase text-zinc-400 font-medium ${sizeConfig.subtextSize}`}>
              Think &bull; Plan &bull; Create
            </p>
          )}
        </div>
      )}
    </div>
  );
}
