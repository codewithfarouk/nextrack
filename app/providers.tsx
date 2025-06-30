"use client";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "../components/theme-provider";
import { ReactNode } from "react";
import React from "react";

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <SessionProvider>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        {children}
      </ThemeProvider>
    </SessionProvider>
  );
}