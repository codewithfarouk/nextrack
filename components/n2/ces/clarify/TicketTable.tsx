"use client";

import { format, differenceInHours } from "date-fns";
import { fr } from "date-fns/locale";
import React, { useState, useMemo, useCallback, memo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../ui/table";
import { ContentCard } from "../../../dashboard/ContentCard";
import { ChevronUp, ChevronDown, Clock, AlertTriangle, Users, TrendingUp, ChevronLeft, ChevronRight, Filter } from "lucide-react";

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
}

type SortField = "id" | "status" | "severity" | "priority" | "createdAt" | "lastUpdatedAt" | "region" | "city" | "company" | "owner";
type SortDirection = "asc" | "desc";

const OWNER_NAME_MAPPING: Record<string, string> = {
  ee0023059: "Nada BELMAATI",
  ee0023068: "Mohamed AZFAR AZAMI",
  ee0023070: "Youssef RAYOUD",
  ee0095270: "Chafik ZARHOUR",
};

const CES_TEAM = Object.values(OWNER_NAME_MAPPING);
const ROWS_PER_PAGE = 50; // Increased for better performance with large datasets

// Memoized table row component to prevent unnecessary re-renders
const CESTicketRow = memo(({ 
  ticket, 
  index, 
  isOverdue, 
  getStatusColor, 
  getSeverityColor, 
  getPriorityColor 
}: {
  ticket: ClarifyTicket;
  index: number;
  isOverdue: boolean;
  getStatusColor: (status: string) => string;
  getSeverityColor: (severity: string) => string;
  getPriorityColor: (priority: string) => string;
}) => (
  <TableRow
    className={`hover:bg-blue-50/50 transition-all duration-200 ${
      isOverdue ? "bg-amber-50/50 border-l-4 border-l-amber-400" : ""
    } ${index % 2 === 0 ? "bg-gray-50/30" : "bg-white"}`}
  >
    <TableCell className="font-medium">
      <div className="flex items-center space-x-2">
        {isOverdue && <Clock className="h-4 w-4 text-amber-500 animate-pulse" />}
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
      className={`text-sm ${isOverdue ? "text-amber-700 font-semibold" : "text-gray-600"}`}
    >
      {ticket.createdAt instanceof Date && !isNaN(ticket.createdAt.getTime())
        ? format(ticket.createdAt, "dd/MM/yyyy HH:mm", { locale: fr })
        : "-"}
    </TableCell>
    <TableCell
      className={`text-sm ${isOverdue ? "text-amber-700 font-semibold" : "text-gray-600"}`}
    >
      {ticket.lastUpdatedAt instanceof Date && !isNaN(ticket.lastUpdatedAt.getTime())
        ? format(ticket.lastUpdatedAt, "dd/MM/yyyy HH:mm", { locale: fr })
        : "-"}
    </TableCell>
    <TableCell className="text-sm font-medium text-gray-900">
      {ticket.owner.split(" ")[0]}
    </TableCell>
  </TableRow>
));

CESTicketRow.displayName = 'CESTicketRow';

export const TicketTable: React.FC<TicketTableProps> = ({ filteredTickets }) => {
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [currentPage, setCurrentPage] = useState(1);

  // Optimized filtering: First filter for CES team members, then for C-series IDs
  const validCESTickets = useMemo(() => {
    return filteredTickets.filter((ticket) => {
      // First check if owner is in CES team
      const isCESTeamMember = CES_TEAM.includes(ticket.owner);
      
      // Then check if ID is valid and starts with "C"
      const hasValidCId = ticket.id && 
                         typeof ticket.id === 'string' && 
                         ticket.id.trim() !== '' && 
                         ticket.id.trim().toUpperCase().startsWith('C');
      
      return isCESTeamMember && hasValidCId;
    });
  }, [filteredTickets]);

  const handleSort = useCallback((field: SortField) => {
    if (field === sortField) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
    setCurrentPage(1);
  }, [sortField]);

  // Optimized with memoization for large datasets
 // Optimized with memoization for large datasets
  const isTicketOverdue = useCallback((ticket: ClarifyTicket): boolean => {
    // Check if status is resolved/closed (not overdue if resolved/closed)
    const normalizedStatus = ticket.status?.toLowerCase() || "";
    const isClosedStatus = ["fermé", "clos", "résolu", "closed", "resolved", "clot"].includes(normalizedStatus);
    
    if (isClosedStatus) {
      return false;
    }

    const now = new Date();
    return (
      ticket.createdAt instanceof Date &&
      ticket.lastUpdatedAt instanceof Date &&
      !isNaN(ticket.createdAt.getTime()) &&
      !isNaN(ticket.lastUpdatedAt.getTime()) &&
      (differenceInHours(now, ticket.createdAt) > 24 ||
        differenceInHours(now, ticket.lastUpdatedAt) > 24)
    );
  }, []);

  const getSeverityNumber = useCallback((severity: string): number => {
    return parseInt(severity, 10) || 0;
  }, []);

  // Optimized sorting with better performance for large datasets
  const sortedTickets = useMemo(() => {
    if (validCESTickets.length === 0) return [];
    
    return [...validCESTickets].sort((a, b) => {
      let compareResult = 0;

      switch (sortField) {
        case "id":
        case "status":
        case "priority":
        case "region":
        case "city":
        case "company":
          compareResult = (a[sortField] || '').localeCompare(b[sortField] || '');
          break;
        case "owner":
          compareResult = (a.owner || '').localeCompare(b.owner || '');
          break;
        case "severity":
          compareResult = getSeverityNumber(a.severity) - getSeverityNumber(b.severity);
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
  }, [validCESTickets, sortField, sortDirection, getSeverityNumber]);

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

  const renderSortIcon = useCallback((field: SortField) => {
    if (field === sortField) {
      return sortDirection === "asc" ? (
        <ChevronUp className="h-4 w-4 ml-1 text-blue-600" />
      ) : (
        <ChevronDown className="h-4 w-4 ml-1 text-blue-600" />
      );
    }
    return <div className="h-4 w-4 ml-1" />;
  }, [sortField, sortDirection]);

  // Optimized summary stats calculation with single pass
  const getSummaryStats = useMemo(() => {
    const total = sortedTickets.length;
    let overdue = 0;
    let severityOne = 0;

    // Initialize ticket counts for CES team members
    const ticketCounts = CES_TEAM.reduce(
      (acc, ownerName) => {
        acc[ownerName] = 0;
        return acc;
      },
      {} as Record<string, number>
    );

    // Single pass through data for better performance
    for (const ticket of sortedTickets) {
      if (isTicketOverdue(ticket)) overdue++;
      if (ticket.severity === "1") severityOne++;
      if (ticketCounts.hasOwnProperty(ticket.owner)) {
        ticketCounts[ticket.owner]++;
      }
    }

    return { total, overdue, severityOne, ticketCounts };
  }, [sortedTickets, isTicketOverdue]);

  // Memoized color functions for better performance
  const getStatusColor = useCallback((status: string) => {
    const normalizedStatus = status?.toLowerCase() || '';
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
    const normalizedPriority = priority?.toLowerCase() || '';
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

  // Calculate total CES tickets (before C-filter) for comparison
  const totalCESTickets = useMemo(() => {
    return filteredTickets.filter((ticket) => CES_TEAM.includes(ticket.owner)).length;
  }, [filteredTickets]);

  return (
    <ContentCard title="CES Team - C Series Tickets Only">
      <div className="space-y-6">
        {/* Filter Info Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <Filter className="h-5 w-5 text-blue-600" />
            <p className="text-sm text-blue-800">
              <strong>Active Filters:</strong> CES Team members only + IDs starting with C 
              ({sortedTickets.length} of {totalCESTickets} CES team tickets)
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-700">C-Series Tickets</p>
                <p className="text-2xl font-bold text-blue-900">{getSummaryStats.total}</p>
                <p className="text-xs text-blue-600">Page {currentPage} of {totalPages}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-600" />
            </div>
          </div>
          {getSummaryStats.overdue > 0 && (
            <div className="bg-gradient-to-r from-amber-50 to-amber-100 border border-amber-200 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-amber-700">Overdue</p>
                  <p className="text-2xl font-bold text-amber-900">{getSummaryStats.overdue}</p>
                  <p className="text-xs text-amber-600">Needs attention</p>
                </div>
                <Clock className="h-8 w-8 text-amber-600" />
              </div>
            </div>
          )}
          {getSummaryStats.severityOne > 0 && (
            <div className="bg-gradient-to-r from-red-50 to-red-100 border border-red-200 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-red-700">Critical (S1)</p>
                  <p className="text-2xl font-bold text-red-900">{getSummaryStats.severityOne}</p>
                  <p className="text-xs text-red-600">High priority</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
            </div>
          )}
          <div className="bg-gradient-to-r from-green-50 to-green-100 border border-green-200 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-700">Team Members</p>
                <p className="text-2xl font-bold text-green-900">{CES_TEAM.length}</p>
                <p className="text-xs text-green-600">Active owners</p>
              </div>
              <Users className="h-8 w-8 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
            <Users className="h-4 w-4 mr-2" />
            CES Team C-Series Distribution
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {CES_TEAM.map((owner) => (
              <div
                key={owner}
                className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm"
              >
                <p className="text-xs font-medium text-gray-900 truncate mb-1">
                  {owner.split(" ")[0]}
                </p>
                <div className="flex justify-between text-xs">
                  <span className="text-blue-600 font-medium">
                    C-Tickets: {getSummaryStats.ticketCounts[owner] || 0}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">
              CES Team C-Series Tickets
            </h3>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                Showing {startIndex + 1}-{Math.min(endIndex, sortedTickets.length)} of {sortedTickets.length}
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
                  <CESTicketRow
                    key={ticket.id}
                    ticket={ticket}
                    index={index}
                    isOverdue={isTicketOverdue(ticket)}
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
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">No CES team C-series tickets found</p>
              <p className="text-gray-400 text-sm">All C-series tickets for CES team have been filtered out or no data available</p>
            </div>
          )}

          {totalPages > 1 && (
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
              <div className="text-sm text-gray-600">
                Total: {sortedTickets.length} CES C-series tickets
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
      </div>
    </ContentCard>
  );
};