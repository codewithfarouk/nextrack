"use client";

import React from "react";
import { BacklogManager } from "../../../dashboard/BacklogManager";
import { ContentCard } from "../../../dashboard/ContentCard";

interface ClarifyTicket {
  id: string;
  status: string;
  severity: string;
  priority: string;
  createdAt: Date;
  incidentStartDate: Date;
  closedAt: Date | null;
  lastUpdatedAt: Date;
  owner: string;
  region: string;
  company: string;
  city: string;
}

interface Backlog {
  id: string;
  title: string;
  content: ClarifyTicket[];
  roles: { id: number; name: string }[];
  createdAt: string;
  creator?: {
    id: string;
    name: string;
    email?: string;
  };
}

interface BacklogManagerWrapperProps {
  backlogs: Backlog[];
  tickets: ClarifyTicket[];
  onSave: (name: string, roleIds: number[], createdById: string) => void; // ✅ Added createdById parameter
  onDelete: (id: string) => void;
  onLoad: (id: string) => void;
  onExport: (id: string) => void;
  onHistorique?: (backlogId: string | null) => void; // ✅ Added optional historique callback
  isLoading: boolean;
}

export const BacklogManagerWrapper: React.FC<BacklogManagerWrapperProps> = ({
  backlogs,
  tickets,
  onSave,
  onDelete,
  onLoad,
  onExport,
  onHistorique, // ✅ Added historique prop
  isLoading, // ✅ Added isLoading prop (though not used in this simple wrapper)
}) => {
  return (
    <ContentCard title="Saved Backlogs">
      <BacklogManager
        backlogs={backlogs}
        onSave={onSave} // ✅ Now matches the expected signature (name, roleIds, createdById)
        onDelete={onDelete}
        onLoad={onLoad}
        onExport={onExport}
        onHistorique={onHistorique} // ✅ Pass through historique callback
        currentData={tickets}
      />
    </ContentCard>
  );
};