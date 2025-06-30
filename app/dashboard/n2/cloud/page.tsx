import React from "react";
import { PageHeader } from "../../../../components/dashboard/PageHeader";

export default function CloudPage() {
  return (
    <div className="container p-4 md:p-6">
      <PageHeader
        title="Cloud"
        description="Welcome to the Cloud section of N2."
      />
      <div className="mt-8 text-center">
        <h2 className="text-2xl font-semibold">Hello! You are in Cloud</h2>
        <p className="mt-2 text-muted-foreground">
          Select a service from the sidebar to view specific content.
        </p>
      </div>
    </div>
  );
}