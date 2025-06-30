"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";

export function Breadcrumb() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length === 0) return null;

  // Generate readable titles by capitalizing and replacing hyphens
  const formatTitle = (segment: string) => {
    return segment
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  return (
    <nav aria-label="Breadcrumb" className="flex items-center text-sm text-muted-foreground">
      <ol className="flex items-center flex-wrap">
        <li className="flex items-center">
          <Link href="/dashboard" className="flex items-center hover:text-foreground transition-colors">
            <Home className="h-4 w-4" />
            <span className="sr-only">Dashboard</span>
          </Link>
        </li>
        
        {segments.map((segment, index) => {
          // Skip "dashboard" as it's represented by the home icon
          if (segment === "dashboard") return null;
          
          // Build the accumulated path for the link
          const segmentPath = `/${segments.slice(0, index + 1).join("/")}`;
          const isLast = index === segments.length - 1;
          
          return (
            <li key={index} className="flex items-center">
              <ChevronRight className="h-4 w-4 mx-2" />
              {isLast ? (
                <span className="font-medium text-foreground">
                  {formatTitle(segment)}
                </span>
              ) : (
                <Link
                  href={segmentPath}
                  className="hover:text-foreground transition-colors"
                >
                  {formatTitle(segment)}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}