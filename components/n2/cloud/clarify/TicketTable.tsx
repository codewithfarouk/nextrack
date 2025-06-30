"use client";

import { format, differenceInHours, differenceInDays } from "date-fns";
import { fr } from "date-fns/locale";
import React, { useState, useMemo, useCallback, memo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../../components/ui/table";
import { ContentCard } from "../../../../components/dashboard/ContentCard";
import {
  ChevronUp,
  ChevronDown,
  Clock,
  AlertTriangle,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  Download,
  X,
  FileSpreadsheet,
  User,
  Calendar,
  AlertCircle,
  Timer,
  ExternalLink,
} from "lucide-react";
import { Badge } from "../../../../components/ui/badge";
import { Button } from "../../../../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../../../components/ui/dialog";

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
interface TicketTableProps {
  filteredTickets: ClarifyTicket[];
  onOverdueStatsClick?: () => void;
}

type SortField =
  | "id"
  | "status"
  | "severity"
  | "priority"
  | "createdAt"
  | "lastUpdatedAt"
  | "region"
  | "city"
  | "company"
  | "owner";
type SortDirection = "asc" | "desc";

const ROWS_PER_PAGE = 50;


const getOverdueInfo = (ticket: ClarifyTicket) => {
  const now = new Date();

  if (
    !ticket.createdAt ||
    !ticket.lastUpdatedAt ||
    !(ticket.createdAt instanceof Date) ||
    !(ticket.lastUpdatedAt instanceof Date) ||
    isNaN(ticket.createdAt.getTime()) ||
    isNaN(ticket.lastUpdatedAt.getTime())
  ) {
    return {
      isOverdue: false,
      level: "none",
      hoursOverdue: 0,
      daysOverdue: 0,
    };
  }

  // Check if status is closed (not overdue if closed)
  const normalizedStatus = ticket.status?.toLowerCase() || "";
  const isClosedStatus = ["fermé", "closed", "clot", "résolu"].includes(normalizedStatus);
  
  if (isClosedStatus) {
    return {
      isOverdue: false,
      level: "none",
      hoursOverdue: 0,
      daysOverdue: 0,
    };
  }

  const hoursSinceCreated = differenceInHours(now, ticket.createdAt);
  const hoursSinceUpdated = differenceInHours(now, ticket.lastUpdatedAt);
  const daysSinceCreated = differenceInDays(now, ticket.createdAt);
  const daysSinceUpdated = differenceInDays(now, ticket.lastUpdatedAt);

  // New criterion: time between creation and last update > 24h
  const hoursBetweenCreationAndUpdate = differenceInHours(ticket.lastUpdatedAt, ticket.createdAt);
  const isStagnant = hoursBetweenCreationAndUpdate > 24;

  const maxHours = Math.max(hoursSinceCreated, hoursSinceUpdated);
  const maxDays = Math.max(daysSinceCreated, daysSinceUpdated);

  const getThresholds = (severity: string) => {
    switch (severity) {
      case "1":
        return { warning: 4, critical: 12, severe: 24 };
      case "2":
        return { warning: 8, critical: 24, severe: 48 };
      case "3":
        return { warning: 24, critical: 72, severe: 168 };
      default:
        return { warning: 48, critical: 168, severe: 336 };
    }
  };

  const thresholds = getThresholds(ticket.severity);

  // Check if ticket is overdue based on existing criteria OR new stagnant criterion
  const isOverdueByTime = maxHours >= thresholds.warning;
  const isOverdue = isOverdueByTime || isStagnant;

  if (!isOverdue) {
    return {
      isOverdue: false,
      level: "none",
      hoursOverdue: 0,
      daysOverdue: 0,
    };
  }

  // Determine overdue level - prioritize stagnant tickets
  if (isStagnant && !isOverdueByTime) {
    return {
      isOverdue: true,
      level: "stagnant", // New level for tickets stagnant > 24h
      hoursOverdue: hoursBetweenCreationAndUpdate,
      daysOverdue: Math.floor(hoursBetweenCreationAndUpdate / 24),
    };
  }

  // Existing severity-based levels
  if (maxHours >= thresholds.severe) {
    return {
      isOverdue: true,
      level: "severe",
      hoursOverdue: maxHours,
      daysOverdue: maxDays,
    };
  } else if (maxHours >= thresholds.critical) {
    return {
      isOverdue: true,
      level: "critical",
      hoursOverdue: maxHours,
      daysOverdue: maxDays,
    };
  } else if (maxHours >= thresholds.warning) {
    return {
      isOverdue: true,
      level: "warning",
      hoursOverdue: maxHours,
      daysOverdue: maxDays,
    };
  }

  return {
    isOverdue: false,
    level: "none",
    hoursOverdue: 0,
    daysOverdue: 0,
  };
};

// Enhanced Excel export function with proper structure
export const exportToExcel = (tickets: ClarifyTicket[]) => {
  const BOM = "\uFEFF";
  const reportDate = new Date();

  const headers = [
    "Ticket ID",
    "Status",
    "Severity",
    "Priority",
    "Owner",
    "Region",
    "City",
    "Company",
    "Created Date",
    "Last Updated",
    "Hours Overdue",
    "Days Overdue",
    "Overdue Level",
  ];

  const rows = tickets.map((ticket) => {
    const overdue = getOverdueInfo(ticket);

    const safeValue = (value: string | number | null | undefined): string =>
      `"${String(value ?? "").replace(/"/g, '""')}"`;

    return [
      safeValue(ticket.id),
      safeValue(ticket.status),
      safeValue("S" + ticket.severity),
      safeValue(ticket.priority),
      safeValue(ticket.owner),
      safeValue(ticket.region),
      safeValue(ticket.city),
      safeValue(ticket.company),
      safeValue(format(ticket.createdAt, "dd/MM/yyyy HH:mm:ss")),
      safeValue(format(ticket.lastUpdatedAt, "dd/MM/yyyy HH:mm:ss")),
      safeValue(overdue.hoursOverdue),
      safeValue(overdue.daysOverdue),
      safeValue(overdue.level),
    ].join(",");
  });

  const csv = [
    `"Overdue Tickets Export - ${format(reportDate, "PPP 'at' p", {
      locale: fr,
    })}"`,
    "",
    headers.map((h) => `"${h}"`).join(","),
    ...rows,
  ].join("\n");

  const blob = new Blob([BOM + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute(
    "download",
    `overdue_tickets_${format(reportDate, "yyyy-MM-dd_HHmm")}.csv`
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// Overdue Report Modal Component
const OverdueReportModal = ({
  isOpen,
  onClose,
  overdueTickets,
}: {
  isOpen: boolean;
  onClose: () => void;
  overdueTickets: ClarifyTicket[];
}) => {
  const overdueStats = useMemo(() => {
    const stats = { severe: 0, critical: 0, warning: 0 };
    overdueTickets.forEach((ticket) => {
      const info = getOverdueInfo(ticket);
      if (info.level in stats) {
        stats[info.level as keyof typeof stats]++;
      }
    });
    return stats;
  }, [overdueTickets]);

  const sortedOverdueTickets = useMemo(() => {
    return [...overdueTickets]
      .map((ticket) => ({ ...ticket, overdueInfo: getOverdueInfo(ticket) }))
      .sort((a, b) => {
        const levelOrder = { severe: 3, critical: 2, warning: 1, none: 0 };
        const aLevel =
          levelOrder[a.overdueInfo.level as keyof typeof levelOrder] || 0;
        const bLevel =
          levelOrder[b.overdueInfo.level as keyof typeof levelOrder] || 0;
        if (aLevel !== bLevel) return bLevel - aLevel;
        return b.overdueInfo.hoursOverdue - a.overdueInfo.hoursOverdue;
      });
  }, [overdueTickets]);

  const getLevelColor = (level: string) => {
    switch (level) {
      case "severe":
        return "bg-purple-100 text-purple-800 border-purple-300";
      case "critical":
        return "bg-red-100 text-red-800 border-red-300";
      case "warning":
        return "bg-amber-100 text-amber-800 border-amber-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold text-gray-900">
              Overdue Tickets Report
            </DialogTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportToExcel(overdueTickets)}
              className="flex items-center gap-2 bg-green-50 hover:bg-green-100 text-green-700 border-green-300"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Export Excel Report
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-r from-red-50 to-red-100 border border-red-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-red-700">
                    Total Overdue
                  </p>
                  <p className="text-2xl font-bold text-red-900">
                    {overdueTickets.length}
                  </p>
                </div>
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>
            </div>

            <div className="bg-gradient-to-r from-purple-50 to-purple-100 border border-purple-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-700">Severe</p>
                  <p className="text-2xl font-bold text-purple-900">
                    {overdueStats.severe}
                  </p>
                </div>
                <Timer className="h-8 w-8 text-purple-600" />
              </div>
            </div>

            <div className="bg-gradient-to-r from-red-50 to-red-100 border border-red-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-red-700">Critical</p>
                  <p className="text-2xl font-bold text-red-900">
                    {overdueStats.critical}
                  </p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
            </div>

            <div className="bg-gradient-to-r from-amber-50 to-amber-100 border border-amber-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-amber-700">Warning</p>
                  <p className="text-2xl font-bold text-amber-900">
                    {overdueStats.warning}
                  </p>
                </div>
                <Clock className="h-8 w-8 text-amber-600" />
              </div>
            </div>
          </div>

          {/* Detailed Table */}
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">
                  Detailed Overdue Tickets
                </h3>
                <p className="text-sm text-gray-600">
                  Report generated:{" "}
                  {format(new Date(), "PPP 'at' HH:mm", { locale: fr })}
                </p>
              </div>
            </div>
            <div className="max-h-96 overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-white">
                  <TableRow>
                    <TableHead>Ticket ID</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Created Date</TableHead>
                    <TableHead>Last Updated</TableHead>
                    <TableHead>Region</TableHead>
                    <TableHead>Company</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedOverdueTickets.map((ticket) => (
                    <TableRow key={ticket.id}>
                      <TableCell className="font-mono font-medium">
                        {ticket.id}
                      </TableCell>
                      <TableCell className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-400" />
                        {ticket.owner}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            ticket.severity === "1"
                              ? "destructive"
                              : "secondary"
                          }
                        >
                          S{ticket.severity}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            ticket.priority?.toLowerCase() === "haute"
                              ? "destructive"
                              : ticket.priority?.toLowerCase() === "moyenne"
                              ? "default"
                              : "secondary"
                          }
                        >
                          {ticket.priority}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-gray-400" />
                          {format(ticket.createdAt, "dd/MM/yyyy HH:mm")}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-gray-400" />
                          {format(ticket.lastUpdatedAt, "dd/MM/yyyy HH:mm")}
                        </div>
                      </TableCell>
                      <TableCell>{ticket.region}</TableCell>
                      <TableCell>{ticket.company}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="text-sm text-gray-600">
              <div className="flex flex-col gap-1">
                <p>
                  Generated on{" "}
                  {format(new Date(), "PPP 'at' p", { locale: fr })}
                </p>
                <p className="text-xs text-gray-500">
                  Report includes: Ticket details, creation & update timestamps,
                  days since events
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
              <Button
                onClick={() => exportToExcel(overdueTickets)}
                className="bg-green-600 hover:bg-green-700"
              >
                <Download className="h-4 w-4 mr-2" />
                Download Excel Report
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Memoized table row component
const TicketRow = memo(
  ({
    ticket,
    index,
    overdueInfo,
    getStatusColor,
    getSeverityColor,
    getPriorityColor,
  }: {
    ticket: ClarifyTicket;
    index: number;
    overdueInfo: {
      isOverdue: boolean;
      level: string;
      hoursOverdue: number;
      daysOverdue: number;
    };
    getStatusColor: (status: string) => string;
    getSeverityColor: (severity: string) => string;
    getPriorityColor: (priority: string) => string;
  }) => (
    <TableRow
      className={`hover:bg-blue-50/50 transition-all duration-200 ${
        overdueInfo.isOverdue
          ? "bg-amber-50/50 border-l-4 border-l-amber-400"
          : ""
      } ${index % 2 === 0 ? "bg-gray-50/30" : "bg-white"}`}
    >
      <TableCell className="font-medium">
        <div className="flex items-center space-x-2">
          {overdueInfo.isOverdue && (
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4 text-amber-500 animate-pulse" />
              <Badge
                variant="outline"
                className={`text-xs ${
                  overdueInfo.level === "severe"
                    ? "border-purple-400 text-purple-700"
                    : overdueInfo.level === "critical"
                    ? "border-red-400 text-red-700"
                    : "border-amber-400 text-amber-700"
                }`}
              >
                {overdueInfo.daysOverdue > 0
                  ? `${overdueInfo.daysOverdue}d`
                  : `${overdueInfo.hoursOverdue}h`}
              </Badge>
            </div>
          )}
          <span className="text-sm font-mono">{ticket.id}</span>
        </div>
      </TableCell>
      <TableCell>
        <span
          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold border ${getStatusColor(
            ticket.status
          )}`}
        >
          {ticket.status}
        </span>
      </TableCell>
      <TableCell>
        <span
          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold border ${getSeverityColor(
            ticket.severity
          )}`}
        >
          S{ticket.severity}
        </span>
      </TableCell>
      <TableCell>
        <span
          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold border ${getPriorityColor(
            ticket.priority
          )}`}
        >
          {ticket.priority}
        </span>
      </TableCell>
      <TableCell className="text-sm text-gray-600">{ticket.region}</TableCell>
      <TableCell className="text-sm text-gray-600">{ticket.city}</TableCell>
      <TableCell className="text-sm text-gray-600">{ticket.company}</TableCell>
      <TableCell
        className={`text-sm ${
          overdueInfo.isOverdue
            ? "text-amber-700 font-semibold"
            : "text-gray-600"
        }`}
      >
        {ticket.createdAt instanceof Date && !isNaN(ticket.createdAt.getTime())
          ? format(ticket.createdAt, "dd/MM/yyyy HH:mm", { locale: fr })
          : "-"}
      </TableCell>
      <TableCell
        className={`text-sm ${
          overdueInfo.isOverdue
            ? "text-amber-700 font-semibold"
            : "text-gray-600"
        }`}
      >
        {ticket.lastUpdatedAt instanceof Date &&
        !isNaN(ticket.lastUpdatedAt.getTime())
          ? format(ticket.lastUpdatedAt, "dd/MM/yyyy HH:mm", { locale: fr })
          : "-"}
      </TableCell>
      <TableCell className="text-sm font-medium text-gray-900">
        {ticket.owner}
      </TableCell>
    </TableRow>
  )
);

TicketRow.displayName = "TicketRow";

export const TicketTable: React.FC<TicketTableProps> = ({
  filteredTickets,
  onOverdueStatsClick,
}) => {
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [showOverdueReport, setShowOverdueReport] = useState(false);

  // Filter for C-series tickets
  const validTickets = useMemo(() => {
    return filteredTickets.filter((ticket) => {
      return (
        ticket.id &&
        typeof ticket.id === "string" &&
        ticket.id.trim() !== "" &&
        ticket.id.trim().toUpperCase().startsWith("C")
      );
    });
  }, [filteredTickets]);

  // Calculate overdue tickets
  const overdueTickets = useMemo(() => {
    return validTickets.filter((ticket) => getOverdueInfo(ticket).isOverdue);
  }, [validTickets]);

  const handleSort = useCallback(
    (field: SortField) => {
      if (field === sortField) {
        setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
      } else {
        setSortField(field);
        setSortDirection("desc");
      }
      setCurrentPage(1);
    },
    [sortField]
  );

  const getSeverityNumber = useCallback((severity: string): number => {
    return parseInt(severity, 10) || 0;
  }, []);

  const getPriorityNumber = useCallback((priority: string): number => {
    const normalizedPriority = priority?.toLowerCase() || "";
    switch (normalizedPriority) {
      case "haute":
        return 1;
      case "moyenne":
        return 2;
      case "basse":
        return 3;
      default:
        return 4;
    }
  }, []);

  const sortedTickets = useMemo(() => {
    if (validTickets.length === 0) return [];

    return [...validTickets].sort((a, b) => {
      let compareResult = 0;

      switch (sortField) {
        case "id":
        case "status":
        case "region":
        case "city":
        case "company":
        case "owner":
          compareResult = (a[sortField] || "").localeCompare(
            b[sortField] || ""
          );
          break;
        case "severity":
          compareResult =
            getSeverityNumber(a.severity) - getSeverityNumber(b.severity);
          break;
        case "priority":
          compareResult =
            getPriorityNumber(a.priority) - getPriorityNumber(b.priority);
          break;
        case "createdAt":
        case "lastUpdatedAt":
          const aTime = a[sortField]?.getTime() || 0;
          const bTime = b[sortField]?.getTime() || 0;
          compareResult = aTime - bTime;
          break;
        default:
          compareResult = 0;
      }

      return sortDirection === "asc" ? compareResult : -compareResult;
    });
  }, [
    validTickets,
    sortField,
    sortDirection,
    getSeverityNumber,
    getPriorityNumber,
  ]);

  const totalPages = Math.ceil(sortedTickets.length / ROWS_PER_PAGE);
  const startIndex = (currentPage - 1) * ROWS_PER_PAGE;
  const endIndex = startIndex + ROWS_PER_PAGE;
  const currentPageTickets = sortedTickets.slice(startIndex, endIndex);

  const handlePreviousPage = useCallback(() => {
    setCurrentPage((prev) => Math.max(1, prev - 1));
  }, []);

  const handleNextPage = useCallback(() => {
    setCurrentPage((prev) => Math.min(totalPages, prev + 1));
  }, [totalPages]);

  const renderSortIcon = useCallback(
    (field: SortField) => {
      if (field === sortField) {
        return sortDirection === "asc" ? (
          <ChevronUp className="h-4 w-4 ml-1 text-blue-600" />
        ) : (
          <ChevronDown className="h-4 w-4 ml-1 text-blue-600" />
        );
      }
      return <div className="h-4 w-4 ml-1" />;
    },
    [sortField, sortDirection]
  );

  const getSummaryStats = useMemo(() => {
    const total = sortedTickets.length;
    const overdue = overdueTickets.length;
    const severityOne = sortedTickets.filter(
      (ticket) => ticket.severity === "1"
    ).length;

    return { total, overdue, severityOne };
  }, [sortedTickets, overdueTickets]);

  const getStatusColor = useCallback((status: string) => {
    const normalizedStatus = status?.toLowerCase() || "";
    switch (normalizedStatus) {
      case "fermé":
        return "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300";
      case "nouveau":
        return "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300";
      default:
        return "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300";
    }
  }, []);

  const getSeverityColor = useCallback((severity: string) => {
    switch (severity) {
      case "1":
        return "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300";
      case "2":
        return "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300";
      default:
        return "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300";
    }
  }, []);

  const getPriorityColor = useCallback((priority: string) => {
    const normalizedPriority = priority?.toLowerCase() || "";
    switch (normalizedPriority) {
      case "haute":
        return "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300";
      case "moyenne":
        return "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300";
      case "basse":
        return "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/30 dark:text-gray-300";
    }
  }, []);

  const handleOverdueClick = () => {
    if (onOverdueStatsClick) {
      onOverdueStatsClick();
    }
    setShowOverdueReport(true);
  };

  return (
    <ContentCard title="Ticket Management - C Series Only">
      <div className="space-y-6">
        {/* Filter Info Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-blue-600" />
            <p className="text-sm text-blue-800">
              <strong>Filter Active:</strong> Showing only tickets with IDs
              starting with C ({sortedTickets.length} of{" "}
              {filteredTickets.length} total tickets)
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-700">
                  C-Series Tickets
                </p>
                <p className="text-2xl font-bold text-blue-900">
                  {getSummaryStats.total}
                </p>
                <p className="text-xs text-blue-600">
                  Page {currentPage} of {totalPages}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-600" />
            </div>
          </div>

          {getSummaryStats.overdue > 0 && (
            <div
              className="bg-gradient-to-r from-amber-50 to-amber-100 border border-amber-200 rounded-xl p-4 cursor-pointer hover:shadow-lg transition-all duration-200 animate-pulse"
              onClick={handleOverdueClick}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-amber-700">
                    Overdue Tickets
                  </p>
                  <p className="text-2xl font-bold text-amber-900">
                    {getSummaryStats.overdue}
                  </p>
                  <p className="text-xs text-amber-600 flex items-center gap-1">
                    Click for report <ExternalLink className="h-3 w-3" />
                  </p>
                </div>
                <Clock className="h-8 w-8 text-amber-600" />
              </div>
            </div>
          )}

          {getSummaryStats.severityOne > 0 && (
            <div className="bg-gradient-to-r from-red-50 to-red-100 border border-red-200 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-red-700">
                    Critical (S1)
                  </p>
                  <p className="text-2xl font-bold text-red-900">
                    {getSummaryStats.severityOne}
                  </p>
                  <p className="text-xs text-red-600">High priority</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
            </div>
          )}
        </div>

        {/* Main Table */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">
              C-Series Tickets
            </h3>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                Showing {startIndex + 1}-
                {Math.min(endIndex, sortedTickets.length)} of{" "}
                {sortedTickets.length}
              </span>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handlePreviousPage}
                  disabled={currentPage === 1}
                  className={`p-2 rounded-lg border transition-all duration-200 ${
                    currentPage === 1
                      ? "border-gray-200 text-gray-400 cursor-not-allowed"
                      : "border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 cursor-pointer"
                  }`}
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-lg text-sm font-medium">
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages}
                  className={`p-2 rounded-lg border transition-all duration-200 ${
                    currentPage === totalPages
                      ? "border-gray-200 text-gray-400 cursor-not-allowed"
                      : "border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 cursor-pointer"
                  }`}
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/50 hover:bg-gray-50">
                  <TableHead
                    className="cursor-pointer hover:bg-gray-100 transition-colors font-semibold"
                    onClick={() => handleSort("id")}
                  >
                    <div className="flex items-center">
                      ID {renderSortIcon("id")}
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-gray-100 transition-colors font-semibold"
                    onClick={() => handleSort("status")}
                  >
                    <div className="flex items-center">
                      Status {renderSortIcon("status")}
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-gray-100 transition-colors font-semibold"
                    onClick={() => handleSort("severity")}
                  >
                    <div className="flex items-center">
                      Severity {renderSortIcon("severity")}
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-gray-100 transition-colors font-semibold"
                    onClick={() => handleSort("priority")}
                  >
                    <div className="flex items-center">
                      Priority {renderSortIcon("priority")}
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-gray-100 transition-colors font-semibold"
                    onClick={() => handleSort("region")}
                  >
                    <div className="flex items-center">
                      Region {renderSortIcon("region")}
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-gray-100 transition-colors font-semibold"
                    onClick={() => handleSort("city")}
                  >
                    <div className="flex items-center">
                      City {renderSortIcon("city")}
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-gray-100 transition-colors font-semibold"
                    onClick={() => handleSort("company")}
                  >
                    <div className="flex items-center">
                      Company {renderSortIcon("company")}
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-gray-100 transition-colors font-semibold"
                    onClick={() => handleSort("createdAt")}
                  >
                    <div className="flex items-center">
                      Created {renderSortIcon("createdAt")}
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-gray-100 transition-colors font-semibold"
                    onClick={() => handleSort("lastUpdatedAt")}
                  >
                    <div className="flex items-center">
                      Last Updated {renderSortIcon("lastUpdatedAt")}
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-gray-100 transition-colors font-semibold"
                    onClick={() => handleSort("owner")}
                  >
                    <div className="flex items-center">
                      Owner {renderSortIcon("owner")}
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentPageTickets.map((ticket, index) => (
                  <TicketRow
                    key={ticket.id}
                    ticket={ticket}
                    index={index}
                    overdueInfo={getOverdueInfo(ticket)}
                    getStatusColor={getStatusColor}
                    getSeverityColor={getSeverityColor}
                    getPriorityColor={getPriorityColor}
                  />
                ))}
              </TableBody>
            </Table>
          </div>

          {sortedTickets.length === 0 && (
            <div className="text-center py-12">
              <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">No C-series tickets found</p>
              <p className="text-gray-400 text-sm">
                All tickets with IDs starting with C have been filtered out
              </p>
            </div>
          )}

          {totalPages > 1 && (
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
              <div className="text-sm text-gray-600">
                Total: {sortedTickets.length} C-series tickets
                {getSummaryStats.overdue > 0 && (
                  <span className="ml-2 text-amber-600 font-medium">
                    • {getSummaryStats.overdue} overdue
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handlePreviousPage}
                  disabled={currentPage === 1}
                  className={`px-4 py-2 rounded-lg border transition-all duration-200 ${
                    currentPage === 1
                      ? "border-gray-200 text-gray-400 cursor-not-allowed"
                      : "border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 cursor-pointer"
                  }`}
                >
                  <div className="flex items-center space-x-1">
                    <ChevronLeft className="h-4 w-4" />
                    <span>Previous</span>
                  </div>
                </button>
                <span className="px-4 py-2 bg-blue-100 text-blue-800 rounded-lg text-sm font-medium">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages}
                  className={`px-4 py-2 rounded-lg border transition-all duration-200 ${
                    currentPage === totalPages
                      ? "border-gray-200 text-gray-400 cursor-not-allowed"
                      : "border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 cursor-pointer"
                  }`}
                >
                  <div className="flex items-center space-x-1">
                    <span>Next</span>
                    <ChevronRight className="h-4 w-4" />
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Overdue Report Modal */}
        <OverdueReportModal
          isOpen={showOverdueReport}
          onClose={() => setShowOverdueReport(false)}
          overdueTickets={overdueTickets}
        />
      </div>
    </ContentCard>
  );
};
