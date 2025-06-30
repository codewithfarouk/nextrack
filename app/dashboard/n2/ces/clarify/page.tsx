"use client";

import { useState, useCallback, useMemo } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import { write, utils } from "xlsx";
import { DateRange } from "react-day-picker";
import { Download, RefreshCw, FileUp, Save, List } from "lucide-react";

// UI Components
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ContentCard } from "@/components/dashboard/ContentCard";
import { Skeleton } from "@/components/ui/skeleton";

// Custom Components
import { FileUpload } from "../../../../../components/n2/ces/clarify/FileUpload";
import { FilterControls } from "@/components/n2/ces/clarify/FilterControls";
import { OverviewStats } from "@/components/n2/ces/clarify/OverviewStats";
import { TicketTable } from "@/components/n2/ces/clarify/TicketTable";
import { BacklogManagerWrapper } from "@/components/n2/ces/clarify/BacklogManagerWrapper";

// Charts
import {
  StatusChart,
  SeverityChart,
  RegionChart,
  CompanyChart,
  TicketsOverTimeChart,
  PriorityChart,
  SeverityTrendsChart,
  ResolutionTimeChart,
  OwnerChart,
} from "@/components/n2/ces/clarify/Charts";

// Hooks
import { useBacklogs } from "@/hooks/use-backlogs";

export interface ClarifyTicket {
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
  description?: string;
  sla?: {
    target: Date;
    status: 'within' | 'approaching' | 'exceeded';
  };
}

const OWNER_NAME_MAPPING: Record<string, string> = {
  ee0023059: "Nada BELMAATI",
  ee0023068: "Mohamed AZFAR AZAMI",
  ee0023070: "Youssef RAYOUD",
  ee0095270: "Chafik ZARHOUR",
};

export default function CesClarifyPage() {
  // State management
  const [isLoading, setIsLoading] = useState(false);
  const [tickets, setTickets] = useState<ClarifyTicket[]>([]);
  const [filteredTickets, setFilteredTickets] = useState<ClarifyTicket[]>([]);

  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | null>(null);
  const [selectedStatus, setSelectedStatus] = useState("_all");
  const [selectedPriority, setSelectedPriority] = useState("_all");
  const [selectedRegion, setSelectedRegion] = useState("_all");
  const [selectedSeverity, setSelectedSeverity] = useState("_all");
  const [selectedOwner, setSelectedOwner] = useState("_all");

  const { backlogs, saveBacklog, deleteBacklog, loadBacklog, exportBacklog } =
    useBacklogs("ces-clarify");

  const availableFilters = useMemo(() => {
    return {
      statuses: [...new Set(tickets.map(t => t.status))],
      priorities: [...new Set(tickets.map(t => t.priority))],
      regions: [...new Set(tickets.map(t => t.region))],
      severities: [...new Set(tickets.map(t => t.severity))],
      owners: [...new Set(tickets.map(t => OWNER_NAME_MAPPING[t.owner.toLowerCase()] || t.owner))], // Use mapped names
    };
  }, [tickets]);

  const filterTickets = useCallback(
    (term: string, range: { from: Date; to: Date } | null, status: string, priority: string, region: string, severity: string, owner: string) => {
      let filtered = [...tickets];
      if (term) {
        const searchLower = term.toLowerCase();
        filtered = filtered.filter(ticket =>
          ticket.id.toLowerCase().includes(searchLower) ||
          ticket.company.toLowerCase().includes(searchLower) ||
          ticket.city.toLowerCase().includes(searchLower) ||
          (OWNER_NAME_MAPPING[ticket.owner.toLowerCase()] || ticket.owner).toLowerCase().includes(searchLower) ||
          ticket.description?.toLowerCase().includes(searchLower)
        );
      }
      if (range?.from && range.to) {
        filtered = filtered.filter(t => t.createdAt >= range.from && t.createdAt <= range.to);
      }
      if (status !== "_all") filtered = filtered.filter(t => t.status === status);
      if (priority !== "_all") filtered = filtered.filter(t => t.priority === priority);
      if (region !== "_all") filtered = filtered.filter(t => t.region === region);
      if (severity !== "_all") filtered = filtered.filter(t => t.severity === severity);
      if (owner !== "_all") filtered = filtered.filter(t => (OWNER_NAME_MAPPING[t.owner.toLowerCase()] || t.owner) === owner);
      setFilteredTickets(filtered);
    },
    [tickets]
  );

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    const validRange = dateRange?.from && dateRange.to
      ? { from: dateRange.from, to: dateRange.to }
      : null;
    filterTickets(term, validRange, selectedStatus, selectedPriority, selectedRegion, selectedSeverity, selectedOwner);
  };

  const handleDateRangeChange = (range: DateRange | null) => {
    const validRange = range?.from && range.to ? { from: range.from, to: range.to } : null;
    setDateRange(range); // Store full range, including partial selections
    filterTickets(searchTerm, validRange, selectedStatus, selectedPriority, selectedRegion, selectedSeverity, selectedOwner);
  };

  const getValidRange = (range: DateRange | null): { from: Date; to: Date } | null => {
    return range?.from && range.to ? { from: range.from, to: range.to } : null;
  };

  const handleLoadBacklog = (id: string) => {
    const backlog = loadBacklog(id);
    if (!backlog) return;

    const restored = backlog.content.map(ticket => ({
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
    setSelectedStatus("_all");
    setSelectedPriority("_all");
    setSelectedRegion("_all");
    setSelectedSeverity("_all");
    setSelectedOwner("_all");
    toast.success(`Loaded backlog "${backlog.title}"`);
  };

  const handleExport = () => {
    const exportData = filteredTickets.map(ticket => ({
      ID: ticket.id,
      Status: ticket.status,
      Severity: ticket.severity,
      Priority: ticket.priority,
      Created: format(ticket.createdAt, "dd/MM/yyyy HH:mm:ss", { locale: fr }),
      "Last Updated": format(ticket.lastUpdatedAt, "dd/MM/yyyy HH:mm:ss", { locale: fr }),
      "Closed At": ticket.closedAt ? format(ticket.closedAt, "dd/MM/yyyy HH:mm:ss", { locale: fr }) : "N/A",
      Region: ticket.region,
      City: ticket.city,
      Company: ticket.company,
      Owner: OWNER_NAME_MAPPING[ticket.owner.toLowerCase()] || ticket.owner, // Use mapped name
      "SLA Status": ticket.sla?.status || "N/A",
    }));

    const ws = utils.json_to_sheet(exportData);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "Clarify Tickets");

    const fileName = `ces-clarify-export-${format(new Date(), "yyyy-MM-dd-HH-mm")}.xlsx`;
    const wbout = write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([wbout], { type: "application/octet-stream" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success("Export completed successfully!");
  };

  const handleFileProcessed = (data: ClarifyTicket[]) => {
    setTickets(data);
    setFilteredTickets(data);
    toast.success(`Loaded ${data.length} tickets successfully`);
  };

  const resetFilters = () => {
    setSearchTerm("");
    setDateRange(null);
    setSelectedStatus("_all");
    setSelectedPriority("_all");
    setSelectedRegion("_all");
    setSelectedSeverity("_all");
    setSelectedOwner("_all");
    setFilteredTickets(tickets);
  };

  return (
    <div className="space-y-6 p-6 pb-24 max-w-7xl mx-auto">
      <PageHeader
        title="Clarify (CES)"
        description="Upload, analyze, and manage Clarify tickets for the CES team."
      >
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleExport}
            disabled={tickets.length === 0 || isLoading}
            className="transition-all hover:bg-primary/10"
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={resetFilters}
            disabled={tickets.length === 0 || isLoading}
            className="transition-all hover:bg-primary/10"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
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
              setSelectedRegion("_all");
              setSelectedSeverity("_all");
              setSelectedOwner("_all");
              toast.success("All data cleared");
            }}
            disabled={tickets.length === 0 || isLoading}
            className="transition-all hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
          >
            <FileUp className="h-4 w-4 mr-2 rotate-180" />
            Clear All
          </Button>
        </div>
      </PageHeader>

      {tickets.length === 0 ? (
        <div className="space-y-6">
          <ContentCard title="Upload Your Clarify Data" className="bg-white">
            <FileUpload onFileProcessed={handleFileProcessed} isLoading={isLoading} setIsLoading={setIsLoading} />
          </ContentCard>
          <ContentCard title="Load Saved Backlog" className="bg-white">
            <BacklogManagerWrapper
              backlogs={backlogs}
              tickets={tickets}
              onSave={(name, roleIds) => saveBacklog(name, tickets, roleIds.map(Number))}
              onDelete={deleteBacklog}
              onLoad={handleLoadBacklog}
              onExport={exportBacklog}
              isLoading={isLoading}
            />
          </ContentCard>
        </div>
      ) : (
        <Tabs defaultValue="overview" className="space-y-4">
          <div className="flex justify-between items-center mb-2">
            <TabsList className="bg-gray-100 p-1 rounded-lg">
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
                Tickets
              </TabsTrigger>
              <TabsTrigger
                value="analytics"
                className="data-[state=active]:bg-white data-[state=active]:shadow-sm"
              >
                Analytics
              </TabsTrigger>
              <TabsTrigger
                value="backlogs"
                className="data-[state=active]:bg-white data-[state=active]:shadow-sm"
              >
                Backlogs
              </TabsTrigger>
            </TabsList>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="ghost" onClick={() => toast.info(`Viewing ${filteredTickets.length} of ${tickets.length} tickets`)}>
                <List className="h-4 w-4 mr-2" />
                {filteredTickets.length} / {tickets.length}
              </Button>
            </div>
          </div>

          <TabsContent value="overview" className="space-y-4">
            {isLoading ? (
              <OverviewSkeleton />
            ) : (
              <>
                <OverviewStats filteredTickets={filteredTickets} />
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <StatusChart filteredTickets={filteredTickets} />
                  <SeverityChart filteredTickets={filteredTickets} />
                  <PriorityChart filteredTickets={filteredTickets} />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <RegionChart filteredTickets={filteredTickets} />
                  <OwnerChart filteredTickets={filteredTickets} />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <CompanyChart filteredTickets={filteredTickets} />
                  <TicketsOverTimeChart filteredTickets={filteredTickets} />
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="tickets">
            <ContentCard title="Ticket Management" className="bg-white">
              <div className="space-y-4">
                <FilterControls
                  tickets={tickets}
                  availableFilters={availableFilters}
                  searchTerm={searchTerm}
                  dateRange={dateRange}
                  selectedStatus={selectedStatus}
                  selectedPriority={selectedPriority}
                  selectedRegion={selectedRegion}
                  selectedSeverity={selectedSeverity}
                  selectedOwner={selectedOwner}
                  onSearch={handleSearch}
                  onDateRangeChange={handleDateRangeChange}
                  onStatusChange={(value) => {
                    setSelectedStatus(value);
                    filterTickets(
                      searchTerm,
                      getValidRange(dateRange),
                      value,
                      selectedPriority,
                      selectedRegion,
                      selectedSeverity,
                      selectedOwner
                    );
                  }}
                  onPriorityChange={(value) => {
                    setSelectedPriority(value);
                    filterTickets(
                      searchTerm,
                      getValidRange(dateRange),
                      selectedStatus,
                      value,
                      selectedRegion,
                      selectedSeverity,
                      selectedOwner
                    );
                  }}
                  onRegionChange={(value) => {
                    setSelectedRegion(value);
                    filterTickets(
                      searchTerm,
                      getValidRange(dateRange),
                      selectedStatus,
                      selectedPriority,
                      value,
                      selectedSeverity,
                      selectedOwner
                    );
                  }}
                  onSeverityChange={(value) => {
                    setSelectedSeverity(value);
                    filterTickets(
                      searchTerm,
                      getValidRange(dateRange),
                      selectedStatus,
                      selectedPriority,
                      selectedRegion,
                      value,
                      selectedOwner
                    );
                  }}
                  onOwnerChange={(value) => {
                    setSelectedOwner(value);
                    filterTickets(
                      searchTerm,
                      getValidRange(dateRange),
                      selectedStatus,
                      selectedPriority,
                      selectedRegion,
                      selectedSeverity,
                      value
                    );
                  }}
                />
                {isLoading ? (
                  <TableSkeleton />
                ) : (
                  <TicketTable filteredTickets={filteredTickets} />
                )}
              </div>
            </ContentCard>
          </TabsContent>

          <TabsContent value="analytics">
            {isLoading ? (
              <AnalyticsSkeleton />
            ) : (
              <div className="space-y-4">
                <TicketsOverTimeChart filteredTickets={filteredTickets} />
                <div className="grid gap-4 md:grid-cols-2">
                  <SeverityTrendsChart filteredTickets={filteredTickets} />
                  <RegionChart filteredTickets={filteredTickets} />
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="backlogs">
            <ContentCard title="Backlog Management" className="bg-white">
              <BacklogManagerWrapper
                backlogs={backlogs}
                tickets={tickets}
                onSave={(name, roleIds) => saveBacklog(name, tickets, roleIds.map(Number))}
                onDelete={deleteBacklog}
                onLoad={handleLoadBacklog}
                onExport={exportBacklog}
                isLoading={isLoading}
              />
            </ContentCard>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

// Skeleton loaders for better UX during loading states
const OverviewSkeleton = () => (
  <div className="space-y-4">
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <Skeleton key={i} className="h-28 w-full" />
      ))}
    </div>
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {[...Array(3)].map((_, i) => (
        <Skeleton key={i} className="h-64 w-full" />
      ))}
    </div>
    <Skeleton className="h-80 w-full" />
  </div>
);

const TableSkeleton = () => (
  <div className="space-y-4">
    <Skeleton className="h-12 w-full" />
    <Skeleton className="h-96 w-full" />
  </div>
);

const AnalyticsSkeleton = () => (
  <div className="space-y-4">
    <Skeleton className="h-80 w-full" />
    <div className="grid gap-4 md:grid-cols-2">
      <Skeleton className="h-64 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
    <Skeleton className="h-80 w-full" />
  </div>
);