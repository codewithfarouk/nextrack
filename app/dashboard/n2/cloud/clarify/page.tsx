"use client";

import { useState } from "react";
import { PageHeader } from "../../../../../components/dashboard/PageHeader";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../../../../components/ui/tabs";
import { Button } from "../../../../../components/ui/button";
import { Download, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { write, utils } from "xlsx";
import { useBacklogs } from "../../../../../hooks/use-backlogs";
import { DateRange } from "react-day-picker";
import { FileUpload } from "../../../../../components/n2/cloud/clarify/FileUpload";
import { FilterControls } from "../../../../../components/n2/cloud/clarify/FilterControls";
import { OverviewStats } from "../../../../../components/n2/cloud/clarify/OverviewStats";
import {
  StatusChart,
  SeverityChart,
  RegionChart,
  CompanyChart,
  PriorityChart,
  TicketsOverTimeChart,
  TicketsByMonthChart,
} from "../../../../../components/n2/cloud/clarify/Charts";
import { TicketTable } from "../../../../../components/n2/cloud/clarify/TicketTable";
import { BacklogManagerWrapper } from "../../../../../components/n2/cloud/clarify/BacklogManagerWrapper";
import { ContentCard } from "../../../../../components/dashboard/ContentCard";

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

export default function CloudClarifyPage() {
  const [tickets, setTickets] = useState<ClarifyTicket[]>([]);
  const [filteredTickets, setFilteredTickets] = useState<ClarifyTicket[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [selectedPriority, setSelectedPriority] = useState<string>("");
  const [selectedRegion, setSelectedRegion] = useState<string>("");
  const [selectedSeverity, setSelectedSeverity] = useState<string>("");
  const { backlogs, saveBacklog, deleteBacklog, loadBacklog, exportBacklog } =
    useBacklogs("cloud-clarify");

  const filterTickets = (
    term: string,
    range: { from: Date; to: Date } | null,
    status: string,
    priority: string,
    region: string,
    severity: string
  ) => {
    let filtered = [...tickets];

    if (term) {
      const searchLower = term.toLowerCase();
      filtered = filtered.filter(
        (ticket) =>
          ticket.id.toLowerCase().includes(searchLower) ||
          ticket.company.toLowerCase().includes(searchLower) ||
          ticket.city.toLowerCase().includes(searchLower) ||
          ticket.owner.toLowerCase().includes(searchLower)
      );
    }

    if (range?.from && range?.to) {
      filtered = filtered.filter(
        (ticket) =>
          ticket.createdAt >= range.from && ticket.createdAt <= range.to
      );
    }

    if (status && status !== "_all") {
      filtered = filtered.filter((ticket) => ticket.status === status);
    }

    if (priority && priority !== "_all") {
      filtered = filtered.filter((ticket) => ticket.priority === priority);
    }

    if (region && region !== "_all") {
      filtered = filtered.filter((ticket) => ticket.region === region);
    }

    if (severity && severity !== "_all") {
      filtered = filtered.filter((ticket) => ticket.severity === severity);
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
      selectedPriority,
      selectedRegion,
      selectedSeverity
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
      selectedPriority,
      selectedRegion,
      selectedSeverity
    );
  };
  const isValidDate = (date: any): boolean =>
    date instanceof Date && !isNaN(date.getTime());

  const handleExport = () => {
    const exportData = filteredTickets.map((ticket) => ({
      ID: ticket.id,
      Status: ticket.status,
      Severity: ticket.severity,
      Priority: ticket.priority,
      Created: isValidDate(ticket.createdAt)
        ? format(ticket.createdAt, "dd/MM/yyyy HH:mm:ss")
        : "N/A",
      "Last Updated": isValidDate(ticket.lastUpdatedAt)
        ? format(ticket.lastUpdatedAt, "dd/MM/yyyy HH:mm:ss")
        : "N/A",
      Region: ticket.region,
      City: ticket.city,
      Company: ticket.company,
      Owner: ticket.owner,
    }));

    const ws = utils.json_to_sheet(exportData);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "Cloud Tickets");

    const fileName = `cloud-clarify-export-${format(
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
      const restored = backlog.content.map((ticket) => ({
        ...ticket,
        createdAt: new Date(ticket.createdAt),
        lastUpdatedAt: new Date(ticket.lastUpdatedAt),
        incidentStartDate: new Date(ticket.incidentStartDate),
        closedAt: ticket.closedAt ? new Date(ticket.closedAt) : null,
      }));

      setTickets(restored);
      setFilteredTickets(restored);
      setSearchTerm("");
      setDateRange(null);
      setSelectedStatus("");
      setSelectedPriority("");
      setSelectedRegion("");
      setSelectedSeverity("");
      toast.success(`Loaded backlog "${backlog.title}"`);
    }
  };

  const handleFileProcessed = (newTickets: ClarifyTicket[]) => {
    setTickets(newTickets);
    setFilteredTickets(newTickets);
  };

  return (
    <div className="space-y-6">
      <PageHeader
  title="Clarify (Cloud)"
  description="Cloud service ticket analysis and management dashboard."
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
          setSelectedPriority("");
          setSelectedRegion("");
          setSelectedSeverity("");
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
          setSelectedPriority("");
          setSelectedRegion("");
          setSelectedSeverity("");
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
              <StatusChart
                tickets={tickets}
                filteredTickets={filteredTickets}
              />
              <SeverityChart
                tickets={tickets}
                filteredTickets={filteredTickets}
              />
              <RegionChart
                tickets={tickets}
                filteredTickets={filteredTickets}
              />
            </div>
            <CompanyChart tickets={tickets} filteredTickets={filteredTickets} />
          </TabsContent>

          <TabsContent value="tickets">
            <ContentCard title="Ticket Management">
              <div className="space-y-4">
                <FilterControls
                  tickets={tickets}
                  searchTerm={searchTerm}
                  dateRange={dateRange}
                  selectedStatus={selectedStatus}
                  selectedPriority={selectedPriority}
                  selectedRegion={selectedRegion}
                  selectedSeverity={selectedSeverity}
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
                      selectedPriority,
                      selectedRegion,
                      selectedSeverity
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
                      value,
                      selectedRegion,
                      selectedSeverity
                    );
                  }}
                  onRegionChange={(value) => {
                    setSelectedRegion(value);
                    const validRange =
                      dateRange?.from && dateRange?.to
                        ? { from: dateRange.from, to: dateRange.to }
                        : null;
                    filterTickets(
                      searchTerm,
                      validRange,
                      selectedStatus,
                      selectedPriority,
                      value,
                      selectedSeverity
                    );
                  }}
                  onSeverityChange={(value) => {
                    setSelectedSeverity(value);
                    const validRange =
                      dateRange?.from && dateRange?.to
                        ? { from: dateRange.from, to: dateRange.to }
                        : null;
                    filterTickets(
                      searchTerm,
                      validRange,
                      selectedStatus,
                      selectedPriority,
                      selectedRegion,
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
              <div className="grid gap-4 md:grid-cols-2">
                <PriorityChart
                  tickets={tickets}
                  filteredTickets={filteredTickets}
                />
                <TicketsOverTimeChart
                  tickets={tickets}
                  filteredTickets={filteredTickets}
                />
              </div>
              <TicketsByMonthChart
                tickets={tickets}
                filteredTickets={filteredTickets}
              />
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
