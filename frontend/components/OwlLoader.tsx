"use client";

import React from "react";
import Image from "next/image";

export interface OwlLoaderProps {
  size?: "sm" | "md" | "lg";
  text?: string;
  subtext?: string;
  className?: string;
}

export function OwlLoader({
  size = "md",
  text = "Buffering Workspace Context...",
  subtext = "Syncing cognitive agents & semantic records",
  className = "",
}: OwlLoaderProps) {
  const sizeMap = {
    sm: {
      wrapper: "h-14 w-14",
      ringSize: "h-14 w-14",
      owlImg: 30,
      textSize: "text-xs",
    },
    md: {
      wrapper: "h-20 w-20",
      ringSize: "h-20 w-20",
      owlImg: 42,
      textSize: "text-sm",
    },
    lg: {
      wrapper: "h-28 w-28",
      ringSize: "h-28 w-28",
      owlImg: 58,
      textSize: "text-base",
    },
  }[size];

  return (
    <div className={`flex flex-col items-center justify-center py-8 select-none ${className}`}>
      {/* Central Black & White Owl Buffering Container */}
      <div className={`relative flex items-center justify-center ${sizeMap.wrapper}`}>
        {/* Simple Normal Outer Rotating Ring (Black & White) */}
        <div
          className={`absolute inset-0 rounded-full border-2 border-zinc-800 border-t-white animate-spin ${sizeMap.ringSize}`}
          style={{ animationDuration: "1.2s" }}
        />

        {/* Central Owl Emblem in Pure Black & White */}
        <div
          className="relative rounded-full bg-black/95 border border-zinc-800 flex items-center justify-center p-1.5 shadow-md"
          style={{
            width: sizeMap.owlImg + 12,
            height: sizeMap.owlImg + 12,
          }}
        >
          <div
            className="w-full h-full flex items-center justify-center opacity-90 transition-opacity"
            style={{
              filter: "grayscale(100%) brightness(2.2) contrast(1.2)",
            }}
          >
            <Image
              src="/golden-owl-logo.png"
              alt="Owl Loading Emblem"
              width={sizeMap.owlImg}
              height={sizeMap.owlImg}
              priority
              className="object-contain"
            />
          </div>
        </div>
      </div>

      {/* Buffering Text & Normal Monochrome Indicator */}
      {text && (
        <div className="mt-4 flex flex-col items-center text-center">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
            <p className={`font-mono font-medium tracking-wide text-zinc-200 ${sizeMap.textSize}`}>
              {text}
            </p>
          </div>
          {subtext && (
            <p className="mt-1 text-xs text-zinc-400 font-mono tracking-wide max-w-xs">
              {subtext}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default OwlLoader;
