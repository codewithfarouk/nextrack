import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ContentCardProps {
  title: string;
  description?: string;
  className?: string;
  children: React.ReactNode;
    extra?: React.ReactNode;
}

export function ContentCard({
  title,
  description,
  className,
  children,
}: ContentCardProps) {
  return (
    <Card className={cn("h-full", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-medium">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}