"use client";


import React from "react";
import { ContentCard } from "../../../dashboard/ContentCard";
import { BacklogManager } from "../../../dashboard/BacklogManager";

interface ITSMTicket {
  id: string;
  type: "CRQ" | "INC";
  priority: "P1" | "P2" | "P3";
  status: string;
  createdAt: Date;
  lastUpdatedAt: Date;
  assignee: string;
  company: string;
}

interface Backlog {
  id: string;
  title: string;
  content: ITSMTicket[];
  roles: { id: number; name: string }[];
  createdAt: string;
}

interface BacklogManagerWrapperProps {
  backlogs: Backlog[];
  tickets: ITSMTicket[];
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