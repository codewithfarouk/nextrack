"use client";

import React from "react";
import { SessionProvider } from "next-auth/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/react-query";
import { ProfileProvider } from "@/lib/ProfileContext"; // 👈 Import du provider
import "./globals.css";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SessionProvider>
          <QueryClientProvider client={queryClient}>
            <ProfileProvider> {/* 👈 Encapsule tes composants ici */}
              {children}
            </ProfileProvider>
          </QueryClientProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
