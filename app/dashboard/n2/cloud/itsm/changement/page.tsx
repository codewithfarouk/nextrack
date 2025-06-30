"use client";

import { useState, useMemo, useCallback } from "react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Download, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { write, utils } from "xlsx";
import { DateRange } from "react-day-picker";
import { FileUpload } from "../../../../../../components/n2/cloud/itsm/FileUpload";
import { FilterControls } from "../../../../../../components/n2/cloud/itsm/FilterControls";
import { OverviewStats } from "../../../../../../components/n2/cloud/itsm/OverviewStats";
import {
  TypeChart,
  PriorityChart,
  StatusChart,
  AssigneeChart,
  TicketsOverTimeChart,
  ChangesVsIncidentsChart,
  PriorityTrendsChart,
} from "../../../../../../components/n2/cloud/itsm/Charts";
import { TicketTable } from "../../../../../../components/n2/cloud/itsm/TicketTable";
import { BacklogManagerWrapper } from "../../../../../../components/n2/cloud/itsm/BacklogManagerWrapper";
import { formatDate } from "@/utils/dateUtils";
import { useBacklogs } from "@/hooks/use-backlogs";
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

export default function CloudITSMChangementPage() {
  const [tickets, setTickets] = useState<ITSMTicket[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [dateRange, setDateRange] = useState<DateRange | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [selectedPriority, setSelectedPriority] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { backlogs, saveBacklog, deleteBacklog, loadBacklog, exportBacklog } =
    useBacklogs("cloud-itsm-changement");

  const filteredTickets = useMemo(() => {
    setIsLoading(true);
    try {
      const sanitizedSearch = searchTerm.trim().toLowerCase();
      const validRange = dateRange?.from && dateRange?.to 
        ? { from: new Date(dateRange.from), to: new Date(dateRange.to) }
        : null;

      return tickets.filter((ticket) => {
        // Only include CRQ tickets
        if (!ticket.id.startsWith("CRQ") || ticket.type !== "CRQ") return false;

        // Search filter
        if (sanitizedSearch && !(
          ticket.id.toLowerCase().includes(sanitizedSearch) ||
          ticket.assignee.toLowerCase().includes(sanitizedSearch) ||
          ticket.company.toLowerCase().includes(sanitizedSearch)
        )) return false;

        // Date range filter
        if (validRange && (
          ticket.createdAt < validRange.from ||
          ticket.createdAt > validRange.to
        )) return false;

        // Status filter
        if (selectedStatus && selectedStatus !== "_all" && ticket.status !== selectedStatus) {
          return false;
        }

        // Priority filter
        if (selectedPriority && selectedPriority !== "_all" && ticket.priority !== selectedPriority) {
          return false;
        }

        return true;
      });
    } catch (error) {
      toast.error("Error filtering tickets");
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [tickets, searchTerm, dateRange, selectedStatus, selectedPriority]);

  const handleSearch = useCallback((term: string) => {
    setSearchTerm(term.slice(0, 100)); // Limit search term length
  }, []);

  const handleDateRangeChange = useCallback((range: DateRange | null) => {
    setDateRange(range);
  }, []);

  const handleExport = useCallback(() => {
    if (filteredTickets.length === 0) {
      toast.error("No tickets to export");
      return;
    }

    try {
      const exportData = filteredTickets.map((ticket) => ({
        ID: ticket.id,
        Type: ticket.type,
        Priority: ticket.priority,
        Status: ticket.status,
        Created: formatDate(ticket.createdAt, "dd/MM/yyyy HH:mm:ss"),
        "Last Updated": formatDate(ticket.lastUpdatedAt, "dd/MM/yyyy HH:mm:ss"),
        Assignee: ticket.assignee,
        Company: ticket.company,
      }));

      const ws = utils.json_to_sheet(exportData);
      const wb = utils.book_new();
      utils.book_append_sheet(wb, ws, "Change Requests");

      const fileName = `cloud-itsm-changement-${formatDate(new Date(), "yyyy-MM-dd-HH-mm")}.xlsx`;
      const wbout = write(wb, { bookType: "xlsx", type: "array" });
      const blob = new Blob([wbout], { type: "application/octet-stream" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success("Change requests exported successfully!");
    } catch (error) {
      toast.error("Error exporting change requests");
      console.error(error);
    }
  }, [filteredTickets]);

  const handleLoadBacklog = useCallback((id: string) => {
    setIsLoading(true);
    try {
      const backlog = loadBacklog(id);
      if (backlog) {
        const restored = backlog.content
          .filter((ticket: ITSMTicket) => ticket.id.startsWith("CRQ") && ticket.type === "CRQ")
          .map((ticket: ITSMTicket) => ({
            ...ticket,
            createdAt: new Date(ticket.createdAt),
            lastUpdatedAt: new Date(ticket.lastUpdatedAt),
          }));

        setTickets(restored);
        setSearchTerm("");
        setDateRange(null);
        setSelectedStatus("");
        setSelectedPriority("");
        toast.success(`Loaded change request backlog "${backlog.title}"`);
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
      (ticket) => ticket.id.startsWith("CRQ") && ticket.type === "CRQ"
    );
    setTickets(validTickets);
    toast.success(`Loaded ${validTickets.length} change requests`);
  }, []);

  const handleResetFilters = useCallback(() => {
    setSearchTerm("");
    setDateRange(null);
    setSelectedStatus("");
    setSelectedPriority("");
    toast.info("Filters reset");
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
  title="Change Management (Cloud)"
  description="Manage cloud change requests (CRQ) and track their progress."
>
  <div className="flex w-full">
    <div className="ml-auto flex items-center gap-2">
      <Button
        size="sm"
        variant="outline"
        onClick={handleExport}
        disabled={filteredTickets.length === 0 || isLoading}
      >
        <Download className="h-4 w-4 mr-2" />
        Export
      </Button>

      {/* ✅ Clear Button */}
      <Button
        size="sm"
        variant="secondary"
        onClick={() => {
          setTickets([]);
          setSearchTerm("");
          setDateRange(null);
          setSelectedStatus("");
          setSelectedPriority("");
          toast.info("Tickets cleared");
        }}
        disabled={filteredTickets.length === 0 || isLoading}
      >
        Clear
      </Button>

      <Button
        size="sm"
        onClick={handleResetFilters}
        disabled={filteredTickets.length === 0 || isLoading}
      >
        <RefreshCw className="h-4 w-4 mr-2" />
        Reset Filters
      </Button>
    </div>
  </div>
</PageHeader>


      {tickets.length === 0 ? (
        <div className="space-y-6">
          <FileUpload onFileProcessed={handleFileProcessed} />
          <BacklogManagerWrapper
            backlogs={backlogs}
            tickets={tickets}
            onSave={(name, roleIds) => saveBacklog(name, tickets, roleIds)}
            onDelete={deleteBacklog}
            onLoad={handleLoadBacklog}
            onExport={exportBacklog}
          />
        </div>
      ) : (
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="tickets">Change Requests</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="backlogs">Backlogs</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <OverviewStats filteredTickets={filteredTickets} />
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <PriorityChart tickets={tickets} filteredTickets={filteredTickets} />
              <StatusChart tickets={tickets} filteredTickets={filteredTickets} />
            </div>
            <AssigneeChart tickets={tickets} filteredTickets={filteredTickets} />
          </TabsContent>

          <TabsContent value="tickets">
            <ContentCard title="Change Request Management">
              <div className="space-y-4">
                <FilterControls
                  tickets={tickets}
                  searchTerm={searchTerm}
                  dateRange={dateRange}
                  selectedStatus={selectedStatus}
                  selectedType="_all" // Type filter hidden for CRQ-only page
                  selectedPriority={selectedPriority}
                  onSearch={handleSearch}
                  onDateRangeChange={handleDateRangeChange}
                  onStatusChange={setSelectedStatus}
                  onTypeChange={() => {}} // Type filter disabled
                  onPriorityChange={setSelectedPriority}
                  disabled={isLoading}
                />
                <TicketTable filteredTickets={filteredTickets} isLoading={isLoading} />
              </div>
            </ContentCard>
          </TabsContent>

          <TabsContent value="analytics">
            <div className="space-y-4">
              <TicketsOverTimeChart tickets={tickets} filteredTickets={filteredTickets} />
              <PriorityTrendsChart tickets={tickets} filteredTickets={filteredTickets} />
            </div>
          </TabsContent>

          <TabsContent value="backlogs">
            <BacklogManagerWrapper
              backlogs={backlogs}
              tickets={tickets}
              onSave={(name, roleIds) => saveBacklog(name, tickets, roleIds)}
              onDelete={deleteBacklog}
              onLoad={handleLoadBacklog}
              onExport={exportBacklog}
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}