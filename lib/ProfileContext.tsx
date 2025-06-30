// lib/ProfileContext.tsx
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useSession } from "next-auth/react";

interface ProfileContextType {
  profile: {
    name: string | null;
    email: string | null;
    image: string | null;
  };
  updateProfile: (updates: Partial<ProfileContextType["profile"]>) => void;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession();
  const [profile, setProfile] = useState<ProfileContextType["profile"]>({
    name: null,
    email: null,
    image: null,
  });

  useEffect(() => {
    // Initialize with session data
    setProfile({
      name: session?.user?.name || null,
      email: session?.user?.email || null,
      image: session?.user?.image || null,
    });
  }, [session]);

  const updateProfile = (updates: Partial<ProfileContextType["profile"]>) => {
    setProfile((prev) => ({ ...prev, ...updates }));
  };

  return (
    <ProfileContext.Provider value={{ profile, updateProfile }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error("useProfile must be used within a ProfileProvider");
  }
  return context;
}