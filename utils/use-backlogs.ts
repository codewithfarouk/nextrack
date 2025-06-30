import { useState, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";
import { write, utils } from "xlsx";
import { format } from "date-fns";

export interface Backlog {
  id: string;
  name: string;
  createdAt: Date;
  data: any[];
  namespace: string;
}

export function useBacklogs(namespace: string) {
  const [backlogs, setBacklogs] = useState<Backlog[]>([]);

  useEffect(() => {
    // Load backlogs from localStorage
    const stored = localStorage.getItem(`backlogs_${namespace}`);
    if (stored) {
      const parsed = JSON.parse(stored, (key, value) => {
        if (key === "createdAt") return new Date(value);
        return value;
      });
      setBacklogs(parsed);
    }
  }, [namespace]);

  const saveBacklog = (name: string, data: any[]) => {
    if (!name.trim()) {
      toast.error("Backlog name cannot be empty");
      return;
    }

    const newBacklog: Backlog = {
      id: uuidv4(),
      name,
      createdAt: new Date(),
      data,
      namespace,
    };

    const updatedBacklogs = [...backlogs, newBacklog];
    setBacklogs(updatedBacklogs);
    localStorage.setItem(`backlogs_${namespace}`, JSON.stringify(updatedBacklogs));
    toast.success(`Backlog "${name}" saved successfully!`);
  };

  const deleteBacklog = (id: string) => {
    const updatedBacklogs = backlogs.filter((b) => b.id !== id);
    setBacklogs(updatedBacklogs);
    localStorage.setItem(`backlogs_${namespace}`, JSON.stringify(updatedBacklogs));
    toast.success("Backlog deleted successfully!");
  };

  const loadBacklog = (id: string) => {
    const backlog = backlogs.find((b) => b.id === id);
    return backlog;
  };

  const exportBacklog = (id: string) => {
    const backlog = backlogs.find((b) => b.id === id);
    if (!backlog) {
      toast.error("Backlog not found");
      return;
    }

    const ws = utils.json_to_sheet(backlog.data);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "Backlog Data");

    const fileName = `backlog-${backlog.name}-${format(new Date(), "yyyy-MM-dd-HH-mm")}.xlsx`;
    try {
      const wbout = write(wb, { bookType: "xlsx", type: "array" });
      const blob = new Blob([wbout], { type: "application/octet-stream" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success("Backlog exported successfully!");
    } catch (error) {
      toast.error("Error exporting backlog");
    }
  };

  return { backlogs, saveBacklog, deleteBacklog, loadBacklog, exportBacklog };
}