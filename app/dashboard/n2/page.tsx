import { PageHeader } from "../../../components/dashboard/PageHeader";
import React from "react";

export default function N2Page() {
  return (
    <div className="container p-4 md:p-6">
      <PageHeader
        title="N2"
        description="Welcome to the N2 section of the dashboard."
      />
      <div className="mt-8 text-center">
        <h2 className="text-2xl font-semibold">Hello! You are in N2</h2>
        <p className="mt-2 text-muted-foreground">
          Select a subsection from the sidebar to view specific content.
        </p>
      </div>
    </div>
  );
}