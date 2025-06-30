import { useState, useEffect } from "react";
import { toast } from "sonner";
import { write, utils } from "xlsx";
import { format } from "date-fns";

// hooks/use-backlogs.ts
export interface Backlog {
  id: string;
  title: string;
  content: any[];
  createdAt: string;
  namespace?: string;
  roles: { id: number; name: string }[];
  creator?: { id: string; name: string }; // ✅ Ajout ici
}


export function useBacklogs(namespace: string) {
  const [backlogs, setBacklogs] = useState<Backlog[]>([]);

  useEffect(() => {
    const fetchBacklogs = async () => {
      try {
        const response = await fetch(`/api/backlogs?moduleType=${namespace}`);
        if (response.ok) {
          const data = await response.json();
          setBacklogs(data);
        } else {
          toast.error("Failed to fetch backlogs");
        }
      } catch (error) {
        console.error("Error fetching backlogs:", error);
        toast.error("Error fetching backlogs");
      }
    };
    fetchBacklogs();
  }, [namespace]);

  const saveBacklog = async (title: string, content: any[], roleIds: number[]) => {
    if (!title.trim()) {
      toast.error("Backlog title cannot be empty");
      return;
    }
    if (content.length === 0) {
      toast.error("No data to save");
      return;
    }
    if (roleIds.length === 0) {
      toast.error("At least one role must be selected");
      return;
    }

    try {
      const response = await fetch("/api/backlogs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          content,
          moduleType: namespace,
          roleIds,
        }),
      });

      if (response.ok) {
        const newBacklog = await response.json();
        setBacklogs([...backlogs, newBacklog]);
        toast.success(`Backlog "${title}" saved successfully!`);
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to save backlog");
      }
    } catch (error) {
      console.error("Error saving backlog:", error);
      toast.error("Error saving backlog");
    }
  };

  const deleteBacklog = async (id: string) => {
    try {
      const response = await fetch(`/api/backlogs/${id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        setBacklogs(backlogs.filter((b) => b.id !== id));
        toast.success("Backlog deleted successfully!");
      } else {
        toast.error("Failed to delete backlog");
      }
    } catch (error) {
      console.error("Error deleting backlog:", error);
      toast.error("Error deleting backlog");
    }
  };

  const loadBacklog = (id: string) => {
    return backlogs.find((b) => b.id === id);
  };

  const exportBacklog = (id: string) => {
    const backlog = backlogs.find((b) => b.id === id);
    if (!backlog) {
      toast.error("Backlog not found");
      return;
    }

    const ws = utils.json_to_sheet(backlog.content);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "Backlog Data");

    const fileName = `backlog-${backlog.title}-${format(new Date(), "yyyy-MM-dd-HH-mm")}.xlsx`;
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
