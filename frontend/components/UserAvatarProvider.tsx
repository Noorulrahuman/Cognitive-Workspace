"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";

interface UserAvatarContextType {
  avatarId: string;
  setAvatarId: (id: string) => void;
}

const UserAvatarContext = createContext<UserAvatarContextType>({
  avatarId: "avatar-1",
  setAvatarId: () => {},
});

export function UserAvatarProvider({ children }: { children: React.ReactNode }) {
  const [avatarId, setAvatarIdState] = useState<string>("avatar-1");
  const supabase = createClient();

  useEffect(() => {
    // 1. Check local storage first for instant load
    const saved = localStorage.getItem("user_owl_avatar");
    if (saved) {
      setAvatarIdState(saved);
    }

    // 2. Check if logged in user has an avatar in user_metadata
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.user_metadata?.owl_avatar) {
        setAvatarIdState(user.user_metadata.owl_avatar);
        localStorage.setItem("user_owl_avatar", user.user_metadata.owl_avatar);
      }
    });

    // 3. Listen for window custom events
    const handleAvatarChange = (e: CustomEvent) => {
      if (e.detail) {
        setAvatarIdState(e.detail);
      }
    };

    window.addEventListener("user_avatar_change" as any, handleAvatarChange);
    return () => {
      window.removeEventListener("user_avatar_change" as any, handleAvatarChange);
    };
  }, []);

  const setAvatarId = (newId: string) => {
    setAvatarIdState(newId);
    try {
      localStorage.setItem("user_owl_avatar", newId);
      window.dispatchEvent(new CustomEvent("user_avatar_change", { detail: newId }));

      // Optionally sync to Supabase user metadata
      supabase.auth.updateUser({
        data: { owl_avatar: newId },
      }).catch(() => {});
    } catch {}
  };

  return (
    <UserAvatarContext.Provider value={{ avatarId, setAvatarId }}>
      {children}
    </UserAvatarContext.Provider>
  );
}

export function useUserAvatar() {
  return useContext(UserAvatarContext);
}
