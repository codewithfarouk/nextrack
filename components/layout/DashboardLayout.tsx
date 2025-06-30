"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { AppBar } from "./AppBar";
import { Sidebar } from "./Sidebar";
import { ThemeProvider } from "../../components/theme-provider";
import { Toaster } from "../../components/ui/sonner";
import { cn } from "../../lib/utils";
import React from "react";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname();
  const { status } = useSession();
  const router = useRouter();

  // Sidebar width configuration (matching the Sidebar component)
  const EXPANDED_WIDTH = 320; // 320px when expanded
  const COLLAPSED_WIDTH = 80;  // 80px when collapsed

  // ✅ Proper initialization based on screen size
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    if (typeof window !== "undefined") {
      return window.innerWidth >= 768;
    }
    return true;
  });

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);

    if (status === "unauthenticated") {
      router.push("/login");
    }

    const handleResize = () => {
      if (window.innerWidth < 768) {
        setIsSidebarOpen(false);
      } else {
        setIsSidebarOpen(true);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [status, router]);

  // Close sidebar automatically on page change for small screens
  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  }, [pathname]);

  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => !prev);
  };

  // Function to get the proper margin/padding based on sidebar state
  const getMainContentClass = () => {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      // On mobile, no margin needed as sidebar is overlay
      return "";
    }
    
    if (!isSidebarOpen) {
      // Sidebar is completely hidden on desktop
      return "md:pl-0";
    }
    
    // Sidebar is open - use the actual width
    return `md:pl-[${EXPANDED_WIDTH}px]`;
  };

  if (!isMounted || status === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return null;
  }

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <div className="min-h-screen bg-background">
        <AppBar 
          toggleSidebar={toggleSidebar} 
          isSidebarOpen={isSidebarOpen}
        />
        
        <Sidebar 
          isOpen={isSidebarOpen} 
          onClose={() => setIsSidebarOpen(false)}
        />
        
        <main
          className={cn(
            "transition-all duration-300 ease-in-out pt-16 min-h-screen",
            // Dynamic left margin based on sidebar state and screen size
            isSidebarOpen && "lg:ml-80", // 320px = 80 * 4 in Tailwind (ml-80)
            // Fallback for exact pixel value if needed
            "relative"
          )}
          style={{
            // Inline style as fallback for exact pixel positioning
            marginLeft: typeof window !== "undefined" && window.innerWidth >= 1024 && isSidebarOpen 
              ? `${EXPANDED_WIDTH}px` 
              : '0px'
          }}
        >
          {/* Content container with proper padding */}
          <div className="container mx-auto p-6 max-w-full">
            {children}
          </div>
        </main>
        
        {/* Overlay for mobile when sidebar is open */}
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-30 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}
        
        <Toaster />
      </div>
    </ThemeProvider>
  );
}