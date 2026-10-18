"use client";

import React from "react";
import Image from "next/image";

export interface OwlAvatarDef {
  id: string;
  name: string;
  title: string;
  badge: string;
  fileName: string;
}

export const OWL_AVATARS: OwlAvatarDef[] = [
  { id: "avatar-1", name: "Classic Scholar", title: "Scholar Owl", badge: "Scholar", fileName: "avatar-1.png" },
  { id: "avatar-2", name: "Detective Inspector", title: "Inspector Owl", badge: "Detective", fileName: "avatar-2.png" },
  { id: "avatar-3", name: "Spring Bonnet", title: "Floral Bonnet Owl", badge: "Spring", fileName: "avatar-3.png" },
  { id: "avatar-4", name: "Cool Shutter", title: "Shutter Shades Owl", badge: "Cool", fileName: "avatar-4.png" },
  { id: "avatar-5", name: "Retro Afro", title: "Afro Aviators Owl", badge: "Retro", fileName: "avatar-5.png" },
  { id: "avatar-6", name: "Pink Bow Lavender", title: "Lavender Chibi Owl", badge: "Lavender", fileName: "avatar-6.png" },
  { id: "avatar-7", name: "Zombie Monster", title: "Zombie Horned Owl", badge: "Monster", fileName: "avatar-7.png" },
  { id: "avatar-8", name: "Cybernetic Mecha", title: "Cyborg Neural Owl", badge: "Cyber", fileName: "avatar-8.png" },
  { id: "avatar-9", name: "Pirate Buccaneer", title: "Eyepatch Pirate Owl", badge: "Pirate", fileName: "avatar-9.png" },
  { id: "avatar-10", name: "Bandana Cowboy", title: "Outlaw Cowboy Owl", badge: "Cowboy", fileName: "avatar-10.png" },
  { id: "avatar-11", name: "Mystic Wizard", title: "Astral Wizard Owl", badge: "Wizard", fileName: "avatar-11.png" },
  { id: "avatar-12", name: "Flower Crown", title: "Princess Flora Owl", badge: "Flora", fileName: "avatar-12.png" },
];

// Map legacy IDs or numeric indices to one of the 12 avatars
const LEGACY_MAP: Record<string, string> = {
  "owl-gold": "avatar-1",
  "owl-scholar": "avatar-2",
  "owl-astro": "avatar-4",
  "owl-coder": "avatar-2",
  "owl-ninja": "avatar-7",
  "owl-cyber": "avatar-8",
  "owl-wizard": "avatar-11",
  "owl-spark": "avatar-12",
};

export function resolveAvatar(id?: string | null): OwlAvatarDef {
  if (!id) return OWL_AVATARS[0];
  const mappedId = LEGACY_MAP[id] || id;
  const found = OWL_AVATARS.find((o) => o.id === mappedId || o.fileName === mappedId || o.fileName === `${mappedId}.png`);
  if (found) return found;

  // Handle "owl-1" to "owl-12"
  const match = id.match(/^(?:avatar|owl)[-_]?(\d+)$/i);
  if (match) {
    const num = Math.min(12, Math.max(1, parseInt(match[1], 10)));
    return OWL_AVATARS[num - 1] || OWL_AVATARS[0];
  }

  return OWL_AVATARS[0];
}

export interface CuteOwlAvatarProps {
  owlId?: string | null;
  name?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
  showBadge?: boolean;
  animated?: boolean;
  onClick?: () => void;
}

export function CuteOwlAvatar({
  owlId = "avatar-1",
  name,
  size = "md",
  className = "",
  showBadge = false,
  animated = false,
  onClick,
}: CuteOwlAvatarProps) {
  const avatar = resolveAvatar(owlId);

  const sizeConfig = {
    xs: { box: "w-6 h-6", px: 24, badge: "text-[8px]" },
    sm: { box: "w-8 h-8", px: 32, badge: "text-[9px]" },
    md: { box: "w-11 h-11", px: 44, badge: "text-[10px]" },
    lg: { box: "w-16 h-16", px: 64, badge: "text-xs" },
    xl: { box: "w-24 h-24", px: 96, badge: "text-xs" },
  }[size];

  return (
    <div
      onClick={onClick}
      className={`relative inline-flex items-center justify-center shrink-0 select-none group ${className}`}
      title={name ? `${name} (${avatar.name})` : `${avatar.name} - ${avatar.title}`}
    >
      <div
        className={`${sizeConfig.box} rounded-full overflow-hidden border border-zinc-800/80 bg-black shadow-md flex items-center justify-center transition-transform duration-200 ${
          animated ? "group-hover:scale-108" : ""
        }`}
      >
        <Image
          src={`/assets/avatars/${avatar.fileName}`}
          alt={name || avatar.name}
          width={sizeConfig.px}
          height={sizeConfig.px}
          className="w-full h-full object-cover"
          unoptimized
        />
      </div>

      {showBadge && (
        <span
          className={`absolute -bottom-1 -right-1 px-1.5 py-0.2 rounded-full border border-[var(--accent-border)] bg-zinc-950 font-mono font-bold text-[var(--accent-text)] shadow-xs ${sizeConfig.badge}`}
        >
          {avatar.badge}
        </span>
      )}
    </div>
  );
}

export default CuteOwlAvatar;
