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
}

interface BacklogManagerWrapperProps {
  backlogs: Backlog[];
  tickets: ClarifyTicket[];
  onSave: (name: string, roleIds: number[]) => void;
  onDelete: (id: string) => void;
  onLoad: (id: string) => void;
  onExport: (id: string) => void;
}

export const BacklogManagerWrapper: React.FC<BacklogManagerWrapperProps> = ({
  backlogs,
  tickets,
  onSave,
  onDelete,
  onLoad,
  onExport,
}) => {
  return (
    <ContentCard title="Manage Backlogs">
      <BacklogManager
        backlogs={backlogs}
        onSave={onSave}
        onDelete={onDelete}
        onLoad={onLoad}
        onExport={onExport}
        currentData={tickets}
      />
    </ContentCard>
  );
};