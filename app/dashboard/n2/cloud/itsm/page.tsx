"use client";

import { useState } from "react";
import { PageHeader } from "../../../../../components/dashboard/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../../../components/ui/tabs";
import { Button } from "../../../../../components/ui/button";
import { Download, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { write, utils } from "xlsx";

import { DateRange } from "react-day-picker";
import { FileUpload } from "../../../../../components/n2/cloud/itsm/FileUpload";
import { FilterControls } from "../../../../../components/n2/cloud/itsm/FilterControls";
import { OverviewStats } from "../../../../../components/n2/cloud/itsm/OverviewStats";
import {
  TypeChart,
  PriorityChart,
  StatusChart,
  AssigneeChart,
  TicketsOverTimeChart,
  ChangesVsIncidentsChart,
  PriorityTrendsChart,
} from "../../../../../components/n2/cloud/itsm/Charts";
import { TicketTable } from "../../../../../components/n2/cloud/itsm/TicketTable";
import { BacklogManagerWrapper } from "../../../../../components/n2/cloud/itsm/BacklogManagerWrapper";
import { formatDate } from "../../../../../utils/dateUtils";
import { useBacklogs } from "../../../../../hooks/use-backlogs";
import { ContentCard } from "../../../../../components/dashboard/ContentCard";


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

export default function CloudITSMPage() {
  const [tickets, setTickets] = useState<ITSMTicket[]>([]);
  const [filteredTickets, setFilteredTickets] = useState<ITSMTicket[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [selectedType, setSelectedType] = useState<string>("");
  const [selectedPriority, setSelectedPriority] = useState<string>("");
  const { backlogs, saveBacklog, deleteBacklog, loadBacklog, exportBacklog } =
    useBacklogs("cloud-itsm");

  const filterTickets = (
    term: string,
    range: { from: Date; to: Date } | null,
    status: string,
    type: string,
    priority: string
  ) => {
    let filtered = [...tickets];

    if (term) {
      const searchLower = term.toLowerCase();
      filtered = filtered.filter(
        (ticket) =>
          ticket.id.toLowerCase().includes(searchLower) ||
          ticket.assignee.toLowerCase().includes(searchLower) ||
          ticket.company.toLowerCase().includes(searchLower)
      );
    }

    if (range?.from && range?.to) {
      filtered = filtered.filter(
        (ticket) =>
          range.from !== undefined &&
          range.to !== undefined &&
          ticket.createdAt >= range.from &&
          ticket.createdAt <= range.to
      );
    }

    if (status && status !== "_all") {
      filtered = filtered.filter((ticket) => ticket.status === status);
    }

    if (type && type !== "_all") {
      filtered = filtered.filter((ticket) => ticket.type === type);
    }

    if (priority && priority !== "_all") {
      filtered = filtered.filter((ticket) => ticket.priority === priority);
    }

    setFilteredTickets(filtered);
  };

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    const validRange =
      dateRange?.from && dateRange?.to
        ? { from: dateRange.from, to: dateRange.to }
        : null;
    filterTickets(
      term,
      validRange,
      selectedStatus,
      selectedType,
      selectedPriority
    );
  };

  const handleDateRangeChange = (range: DateRange | null) => {
    setDateRange(range);
    const validRange =
      range?.from && range?.to ? { from: range.from, to: range.to } : null;
    filterTickets(
      searchTerm,
      validRange,
      selectedStatus,
      selectedType,
      selectedPriority
    );
  };

  const handleExport = () => {
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
    utils.book_append_sheet(wb, ws, "ITSM Tickets");

    const fileName = `cloud-itsm-export-${formatDate(
      new Date(),
      "yyyy-MM-dd-HH-mm"
    )}.xlsx`;
    try {
      const wbout = write(wb, { bookType: "xlsx", type: "array" });
      const blob = new Blob([wbout], { type: "application/octet-stream" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success("Export completed successfully!");
    } catch (error) {
      toast.error("Error exporting data");
    }
  };

 const handleLoadBacklog = (id: string) => {
  const backlog = loadBacklog(id);
  if (backlog) {
    const restored = backlog.content.map(ticket => ({
      ...ticket,
      createdAt: new Date(ticket.createdAt),
      lastUpdatedAt: new Date(ticket.lastUpdatedAt),
    }));

    setTickets(restored);
    setFilteredTickets(restored);
    setSearchTerm("");
    setDateRange(null);
    setSelectedStatus("");
    setSelectedType("");
    setSelectedPriority("");
    toast.success(`Loaded backlog "${backlog.title}"`);
  }
};


  const handleFileProcessed = (newTickets: ITSMTicket[]) => {
    setTickets(newTickets);
    setFilteredTickets(newTickets);
  };

  return (
    <div className="space-y-6">
      <PageHeader
  title="ITSM (Cloud)"
  description="IT Service Management for cloud resources."
>
  <div className="flex w-full">
    <div className="ml-auto flex items-center gap-2">
      <Button
        size="sm"
        variant="outline"
        onClick={handleExport}
        disabled={tickets.length === 0}
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
          setFilteredTickets([]);
          setSearchTerm("");
          setDateRange(null);
          setSelectedStatus("");
          setSelectedType("");
          setSelectedPriority("");
          toast.info("Tickets cleared");
        }}
        disabled={tickets.length === 0}
      >
        Clear
      </Button>

      <Button
        size="sm"
        onClick={() => {
          setSearchTerm("");
          setDateRange(null);
          setSelectedStatus("");
          setSelectedType("");
          setSelectedPriority("");
          setFilteredTickets(tickets);
        }}
        disabled={tickets.length === 0}
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
            <TabsTrigger value="tickets">Tickets</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="backlogs">Backlogs</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <OverviewStats filteredTickets={filteredTickets} />
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <TypeChart tickets={tickets} filteredTickets={filteredTickets} />
              <PriorityChart
                tickets={tickets}
                filteredTickets={filteredTickets}
              />
              <StatusChart
                tickets={tickets}
                filteredTickets={filteredTickets}
              />
            </div>
            <AssigneeChart
              tickets={tickets}
              filteredTickets={filteredTickets}
            />
          </TabsContent>

          <TabsContent value="tickets">
            <ContentCard title="Ticket Management">
              <div className="space-y-4">
                <FilterControls
                  tickets={tickets}
                  searchTerm={searchTerm}
                  dateRange={dateRange}
                  selectedStatus={selectedStatus}
                  selectedType={selectedType}
                  selectedPriority={selectedPriority}
                  onSearch={handleSearch}
                  onDateRangeChange={handleDateRangeChange}
                  onStatusChange={(value) => {
                    setSelectedStatus(value);
                    const validRange =
                      dateRange?.from && dateRange?.to
                        ? { from: dateRange.from, to: dateRange.to }
                        : null;
                    filterTickets(
                      searchTerm,
                      validRange,
                      value,
                      selectedType,
                      selectedPriority
                    );
                  }}
                  onTypeChange={(value) => {
                    setSelectedType(value);
                    const validRange =
                      dateRange?.from && dateRange?.to
                        ? { from: dateRange.from, to: dateRange.to }
                        : null;
                    filterTickets(
                      searchTerm,
                      validRange,
                      selectedStatus,
                      value,
                      selectedPriority
                    );
                  }}
                  onPriorityChange={(value) => {
                    setSelectedPriority(value);
                    const validRange =
                      dateRange?.from && dateRange?.to
                        ? { from: dateRange.from, to: dateRange.to }
                        : null;
                    filterTickets(
                      searchTerm,
                      validRange,
                      selectedStatus,
                      selectedType,
                      value
                    );
                  }}
                />
                <TicketTable filteredTickets={filteredTickets} />
              </div>
            </ContentCard>
          </TabsContent>

          <TabsContent value="analytics">
            <div className="space-y-4">
              <TicketsOverTimeChart
                tickets={tickets}
                filteredTickets={filteredTickets}
              />
              <div className="grid gap-4 md:grid-cols-2">
                <ChangesVsIncidentsChart
                  tickets={tickets}
                  filteredTickets={filteredTickets}
                />
                <PriorityTrendsChart
                  tickets={tickets}
                  filteredTickets={filteredTickets}
                />
              </div>
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