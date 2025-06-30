"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Download, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import { write, utils } from "xlsx";
import { useBacklogs } from "@/hooks/use-backlogs";
import { DateRange } from "react-day-picker";
import { FileUpload } from "../../../../../../components/n2/ces/itsm/FileUpload";
import { FilterControls } from "../../../../../../components/n2/ces/itsm/FilterControls";
import { OverviewStats } from "../../../../../../components/n2/ces/itsm/OverviewStats";
import {
  PriorityChart,
  StatusChart,
  AssigneeChart,
  TicketsOverTimeChart,
  PriorityTrendsChart,
  AssigneeWorkloadChart,
} from "../../../../../../components/n2/ces/itsm/Charts";
import { TicketTable } from "../../../../../../components/n2/ces/itsm/TicketTable";
import { BacklogManagerWrapper } from "../../../../../../components/n2/ces/itsm/BacklogManagerWrapper";
import { ContentCard } from "@/components/dashboard/ContentCard";

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

const CES_TEAM = [
  "Youssef RAYOUDE",
  "Nada BELMAATI",
  "Mohammed AZFAR AZAMI",
  "Chafik ZARHOUR",
];

export default function CesITSMIncidentPage() {
  const [tickets, setTickets] = useState<ITSMTicket[]>([]);
  const [filteredTickets, setFilteredTickets] = useState<ITSMTicket[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [dateRange, setDateRange] = useState<DateRange | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>("_all");
  const [selectedPriority, setSelectedPriority] = useState<string>("_all");
  const [selectedAssignee, setSelectedAssignee] = useState<string>("_all");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { backlogs, saveBacklog, deleteBacklog, loadBacklog, exportBacklog } =
    useBacklogs("ces-itsm-incident");

  const availableFilters = useMemo(() => {
    return {
      statuses: [...new Set(tickets.map((t) => t.status))].sort(),
      types: ["INC"],
      priorities: ["P1", "P2", "P3"],
      assignees: [...new Set(tickets.map((t) => t.assignee))].sort(),
    };
  }, [tickets]);

 useEffect(() => {
  setIsLoading(true);

  try {
    const sanitizedSearch = searchTerm.trim().toLowerCase();
    const validRange = dateRange?.from && dateRange?.to
      ? { from: new Date(dateRange.from), to: new Date(dateRange.to) }
      : null;

    const result = tickets.filter((ticket) => {
      if (!ticket.id.startsWith("INC") || ticket.type !== "INC" || !CES_TEAM.includes(ticket.assignee)) {
        return false;
      }

      if (sanitizedSearch && !(
        ticket.id.toLowerCase().includes(sanitizedSearch) ||
        ticket.assignee.toLowerCase().includes(sanitizedSearch) ||
        ticket.company.toLowerCase().includes(sanitizedSearch)
      )) {
        return false;
      }

      if (validRange && (
        ticket.createdAt < validRange.from ||
        ticket.createdAt > validRange.to
      )) {
        return false;
      }

      if (selectedStatus !== "_all" && ticket.status !== selectedStatus) {
        return false;
      }

      if (selectedPriority !== "_all" && ticket.priority !== selectedPriority) {
        return false;
      }

      if (selectedAssignee !== "_all" && ticket.assignee !== selectedAssignee) {
        return false;
      }

      return true;
    });

    setFilteredTickets(result);
  } catch (error) {
    toast.error("Error filtering incidents");
    console.error(error);
    setFilteredTickets([]);
  } finally {
    setIsLoading(false);
  }
}, [tickets, searchTerm, dateRange, selectedStatus, selectedPriority, selectedAssignee]);

  const handleSearch = useCallback((term: string) => {
    setSearchTerm(term.slice(0, 100)); // Limit search term length
  }, []);

  const handleDateRangeChange = useCallback((range: DateRange | null) => {
    setDateRange(range);
  }, []);

  const handleExport = useCallback(() => {
    if (filteredTickets.length === 0) {
      toast.error("No incidents to export");
      return;
    }

    try {
      const exportData = filteredTickets.map((ticket) => ({
        ID: ticket.id,
        Type: ticket.type,
        Priority: ticket.priority,
        Status: ticket.status,
        Created: format(ticket.createdAt, "dd/MM/yyyy HH:mm:ss", { locale: fr }),
        "Last Updated": format(ticket.lastUpdatedAt, "dd/MM/yyyy HH:mm:ss", { locale: fr }),
        Assignee: ticket.assignee,
        Company: ticket.company,
      }));

      const ws = utils.json_to_sheet(exportData);
      const wb = utils.book_new();
      utils.book_append_sheet(wb, ws, "Incidents");

      const fileName = `ces-itsm-incident-${format(new Date(), "yyyy-MM-dd-HH-mm")}.xlsx`;
      const wbout = write(wb, { bookType: "xlsx", type: "array" });
      const blob = new Blob([wbout], { type: "application/octet-stream" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success("Incidents exported successfully!");
    } catch (error) {
      toast.error("Error exporting incidents");
      console.error(error);
    }
  }, [filteredTickets]);

  const handleLoadBacklog = useCallback((id: string) => {
    setIsLoading(true);
    try {
      const backlog = loadBacklog(id);
      if (backlog) {
        const restored = backlog.content
          .filter((ticket: ITSMTicket) => ticket.id.startsWith("INC") && ticket.type === "INC" && CES_TEAM.includes(ticket.assignee))
          .map((ticket: ITSMTicket) => ({
            ...ticket,
            createdAt: new Date(ticket.createdAt),
            lastUpdatedAt: new Date(ticket.lastUpdatedAt),
          }));

        setTickets(restored);
        setSearchTerm("");
        setDateRange(null);
        setSelectedStatus("_all");
        setSelectedPriority("_all");
        setSelectedAssignee("_all");
        toast.success(`Loaded CES incident backlog "${backlog.title}" (${restored.length} tickets)`);
      }
    } catch (error) {
      toast.error("Error loading backlog");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, [loadBacklog]);

  const handleFileProcessed = useCallback((newTickets: ITSMTicket[]) => {
    const validTickets = newTickets.filter(
      (ticket) => ticket.id.startsWith("INC") && ticket.type === "INC" && CES_TEAM.includes(ticket.assignee)
    );
    setTickets(validTickets);
    setFilteredTickets(validTickets);
    setSearchTerm("");
    setDateRange(null);
    setSelectedStatus("_all");
    setSelectedPriority("_all");
    setSelectedAssignee("_all");
    toast.success(`Loaded ${validTickets.length} valid CES incidents`);
  }, []);

  const resetFilters = useCallback(() => {
    setSearchTerm("");
    setDateRange(null);
    setSelectedStatus("_all");
    setSelectedPriority("_all");
    setSelectedAssignee("_all");
    setFilteredTickets(tickets);
    toast.info("Filters reset");
  }, [tickets]);

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      <PageHeader
        title="Incident Management (CES)"
        description="Manage CES incident requests (INC) for Customer Enterprise Services"
      >
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleExport}
            disabled={filteredTickets.length === 0 || isLoading}
            className="transition-all hover:bg-primary/10"
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={resetFilters}
            disabled={filteredTickets.length === 0 || isLoading}
            className="transition-all hover:bg-primary/10"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Reset Filters
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setTickets([]);
              setFilteredTickets([]);
              setSearchTerm("");
              setDateRange(null);
              setSelectedStatus("_all");
              setSelectedPriority("_all");
              setSelectedAssignee("_all");
              toast.success("All change request data cleared");
            }}
            disabled={tickets.length === 0 || isLoading}
            className="transition-all hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
          >
            <RefreshCw className="h-4 w-4 mr-2 scale-x-[-1]" />
            Clear All
          </Button>
        </div>
      </PageHeader>

      {tickets.length === 0 ? (
        <div className="space-y-6">
          <ContentCard title="Upload CES Incident Data" className="bg-white">
            <FileUpload onFileProcessed={handleFileProcessed} />
          </ContentCard>
          <ContentCard title="Load Saved Backlogs" className="bg-white">
            <BacklogManagerWrapper
              backlogs={backlogs}
              tickets={tickets}
              onSave={(name, roleIds) => saveBacklog(name, tickets, roleIds)}
              onDelete={deleteBacklog}
              onLoad={handleLoadBacklog}
              onExport={exportBacklog}
            />
          </ContentCard>
        </div>
      ) : (
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="bg-gray-200 p-1 rounded-lg">
            <TabsTrigger
              value="overview"
              className="data-[state=active]:bg-white data-[state=active]:shadow-sm"
            >
              Overview
            </TabsTrigger>
            <TabsTrigger
              value="tickets"
              className="data-[state=active]:bg-white data-[state=active]:shadow-sm"
            >
              Incidents
            </TabsTrigger>
            <TabsTrigger
              value="analytics"
              className="data-[state=active]:bg-white data-[state=active]:shadow-sm"
            >
              Analytics
            </TabsTrigger>
            <TabsTrigger
              value="backlog"
              className="data-[state=active]:bg-white data-[state=active]:shadow-sm"
            >
              Backlogs
            </TabsTrigger>
          </TabsList>
          <TabsContent value="overview" className="space-y-4">
            <OverviewStats filteredTickets={filteredTickets} />
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <PriorityChart filteredTickets={filteredTickets} />
              <StatusChart filteredTickets={filteredTickets} />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <AssigneeChart filteredTickets={filteredTickets} />
              <TicketsOverTimeChart filteredTickets={filteredTickets} />
            </div>
          </TabsContent>

          <TabsContent value="tickets">
            <ContentCard title="Incident Management" className="bg-white">
              <div className="space-y-4">
                <FilterControls
                  tickets={tickets}
                  availableFilters={availableFilters}
                  searchTerm={searchTerm}
                  dateRange={dateRange}
                  selectedStatus={selectedStatus}
                  selectedType="_all" // Type filter hidden for INC-only
                  selectedPriority={selectedPriority}
                  selectedAssignee={selectedAssignee}
                  onSearch={handleSearch}
                  onDateRangeChange={handleDateRangeChange}
                  onStatusChange={setSelectedStatus}
                  onTypeChange={() => {}} // Type filter disabled
                  onPriorityChange={setSelectedPriority}
                  onAssigneeChange={setSelectedAssignee}
                  disabled={isLoading}
                />
                <TicketTable filteredTickets={filteredTickets} isLoading={isLoading} />
              </div>
            </ContentCard>
          </TabsContent>

          <TabsContent value="analytics">
            <div className="space-y-4">
              <TicketsOverTimeChart filteredTickets={filteredTickets} />
              <div className="grid gap-4 md:grid-cols-2">
                <PriorityTrendsChart filteredTickets={filteredTickets} />
                <AssigneeWorkloadChart filteredTickets={filteredTickets} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="backlog">
            <ContentCard title="Backlog Management" className="bg-white">
              <BacklogManagerWrapper
                backlogs={backlogs}
                tickets={tickets}
                onSave={(name, roleIds) => saveBacklog(name, tickets, roleIds)}
                onDelete={deleteBacklog}
                onLoad={handleLoadBacklog}
                onExport={exportBacklog}
              />
            </ContentCard>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}