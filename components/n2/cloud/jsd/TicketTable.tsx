"use client";

import { differenceInHours } from "date-fns";
import React, { useState, useMemo, useCallback } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../../components/ui/table";
import { ContentCard } from "../../../../components/dashboard/ContentCard";
import { ChevronUp, ChevronDown, Clock, AlertTriangle, TrendingUp, ChevronLeft, ChevronRight } from "lucide-react";
import { formatDate } from "../../../../utils/dateUtils";

interface JiraTicket {
  key: string;
  type: string;
  priority: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  assignee: string;
  reporter: string;
}

interface TicketTableProps {
  filteredTickets: JiraTicket[];
}

type SortField =
  | "key"
  | "type"
  | "status"
  | "priority"
  | "createdAt"
  | "updatedAt"
  | "assignee"
  | "reporter";
type SortDirection = "asc" | "desc";

const ROWS_PER_PAGE = 10;

export const TicketTable: React.FC<TicketTableProps> = ({ filteredTickets }) => {
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [currentPage, setCurrentPage] = useState(1);

  const handleSort = useCallback((field: SortField) => {
    if (field === sortField) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
    setCurrentPage(1);
  }, [sortField]);

  const isTicketOverdue = useCallback((ticket: JiraTicket): boolean => {
    // Check if status is resolved/closed (not overdue if resolved/closed)
    const normalizedStatus = ticket.status?.toLowerCase() || "";
    const isClosedStatus = ["clos", "résolu", "done", "closed", "resolved", "fermé", "clot"].includes(normalizedStatus);
    
    if (isClosedStatus) {
      return false;
    }

    const now = new Date();
    return (
      ticket.createdAt instanceof Date &&
      ticket.updatedAt instanceof Date &&
      !isNaN(ticket.createdAt.getTime()) &&
      !isNaN(ticket.updatedAt.getTime()) &&
      (differenceInHours(now, ticket.createdAt) > 24 ||
        differenceInHours(now, ticket.updatedAt) > 24)
    );
  }, []);

  const getPriorityNumber = useCallback((priority: string): number => {
    switch (priority.toLowerCase()) {
      case "high":
        return 1;
      case "medium":
        return 2;
      case "low":
        return 3;
      default:
        return 4; // Unknown priorities sort last
    }
  }, []);

  const sortedTickets = useMemo(() => {
    return [...filteredTickets].sort((a, b) => {
      let compareResult = 0;

      switch (sortField) {
        case "key":
        case "type":
        case "status":
        case "assignee":
        case "reporter":
          compareResult = (a[sortField] || "").localeCompare(b[sortField] || "");
          break;
        case "priority":
          compareResult = getPriorityNumber(a.priority) - getPriorityNumber(b.priority);
          break;
        case "createdAt":
        case "updatedAt":
          compareResult = a[sortField].getTime() - b[sortField].getTime();
          break;
        default:
          compareResult = 0;
      }

      return sortDirection === "asc" ? compareResult : -compareResult;
    });
  }, [filteredTickets, sortField, sortDirection, getPriorityNumber]);

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

  const getSummaryStats = useMemo(() => {
    const total = sortedTickets.length;
    const overdue = sortedTickets.filter(isTicketOverdue).length;
    const critical = sortedTickets.filter((t) => t.priority.toLowerCase() === "high").length;

    return { total, overdue, critical };
  }, [sortedTickets, isTicketOverdue]);

  const getTypeColor = useCallback((type: string) => {
    switch (type.toLowerCase()) {
      case "bug":
        return "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300";
      case "task":
        return "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300";
      case "story":
        return "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/30 dark:text-gray-300";
    }
  }, []);

  const getStatusColor = useCallback((status: string) => {
    switch (status.toLowerCase()) {
      case "done":
        return "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300";
      case "to do":
        return "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300";
      case "in progress":
        return "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/30 dark:text-gray-300";
    }
  }, []);

  const getPriorityColor = useCallback((priority: string) => {
    switch (priority.toLowerCase()) {
      case "high":
        return "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300";
      case "medium":
        return "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300";
      case "low":
        return "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/30 dark:text-gray-300";
    }
  }, []);

  return (
    <ContentCard title="Ticket Management">
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-700">Total Tickets</p>
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
          {getSummaryStats.critical > 0 && (
            <div className="bg-gradient-to-r from-red-50 to-red-100 border border-red-200 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-red-700">Critical (High)</p>
                  <p className="text-2xl font-bold text-red-900">{getSummaryStats.critical}</p>
                  <p className="text-xs text-red-600">High priority</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">Tickets</h3>
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
                    onClick={() => handleSort("key")}
                  >
                    <div className="flex items-center">
                      Key {renderSortIcon("key")}
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-gray-100 transition-colors font-semibold"
                    onClick={() => handleSort("type")}
                  >
                    <div className="flex items-center">
                      Type {renderSortIcon("type")}
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
                    onClick={() => handleSort("priority")}
                  >
                    <div className="flex items-center">
                      Priority {renderSortIcon("priority")}
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
                    onClick={() => handleSort("updatedAt")}
                  >
                    <div className="flex items-center">
                      Updated {renderSortIcon("updatedAt")}
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-gray-100 transition-colors font-semibold"
                    onClick={() => handleSort("assignee")}
                  >
                    <div className="flex items-center">
                      Assignee {renderSortIcon("assignee")}
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-gray-100 transition-colors font-semibold"
                    onClick={() => handleSort("reporter")}
                  >
                    <div className="flex items-center">
                      Reporter {renderSortIcon("reporter")}
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentPageTickets.map((ticket, index) => {
                  const isOverdue = isTicketOverdue(ticket);

                  return (
                    <TableRow
                      key={ticket.key}
                      className={`hover:bg-blue-50/50 transition-all duration-200 ${
                        isOverdue ? "bg-amber-50/50 border-l-4 border-l-amber-400" : ""
                      } ${index % 2 === 0 ? "bg-gray-50/30" : "bg-white"}`}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center space-x-2">
                          {isOverdue && <Clock className="h-4 w-4 text-amber-500 animate-pulse" />}
                          <span className="text-sm font-mono">{ticket.key}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold border ${getTypeColor(
                            ticket.type
                          )}`}
                        >
                          {ticket.type}
                        </span>
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
                          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold border ${getPriorityColor(
                            ticket.priority
                          )}`}
                        >
                          {ticket.priority}
                        </span>
                      </TableCell>
                      <TableCell
                        className={`text-sm ${isOverdue ? "text-amber-700 font-semibold" : "text-gray-600"}`}
                      >
                        {ticket.createdAt instanceof Date && !isNaN(ticket.createdAt.getTime())
                          ? formatDate(ticket.createdAt, "dd/MM/yyyy HH:mm")
                          : "-"}
                      </TableCell>
                      <TableCell
                        className={`text-sm ${isOverdue ? "text-amber-700 font-semibold" : "text-gray-600"}`}
                      >
                        {ticket.updatedAt instanceof Date && !isNaN(ticket.updatedAt.getTime())
                          ? formatDate(ticket.updatedAt, "dd/MM/yyyy HH:mm")
                          : "-"}
                      </TableCell>
                      <TableCell className="text-sm font-medium text-gray-900">
                        {ticket.assignee || "-"}
                      </TableCell>
                      <TableCell className="text-sm font-medium text-gray-900">
                        {ticket.reporter || "-"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {sortedTickets.length === 0 && (
            <div className="text-center py-12">
              <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">No tickets found</p>
              <p className="text-gray-400 text-sm">Check filters or try again</p>
            </div>
          )}

          {totalPages > 1 && (
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
              <div className="text-sm text-gray-600">
                Total: {sortedTickets.length} tickets
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