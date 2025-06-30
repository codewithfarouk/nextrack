"use client";

import { format, differenceInHours } from "date-fns";
import { fr } from "date-fns/locale";
import React, { useState, useMemo, useCallback } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../ui/table";
import { ContentCard } from "../../../dashboard/ContentCard";
import { ChevronUp, ChevronDown, Clock, AlertTriangle, Users, TrendingUp, ChevronLeft, ChevronRight } from "lucide-react";

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

interface TicketTableProps {
  filteredTickets: ITSMTicket[];
   isLoading: boolean; // ✅ Ajout de cette ligne
}

type SortField =
  | "id"
  | "type"
  | "status"
  | "priority"
  | "createdAt"
  | "lastUpdatedAt"
  | "assignee"
  | "company";
type SortDirection = "asc" | "desc";

const CES_TEAM = [
  "Youssef RAYOUDE",
  "Nada BELMAATI",
  "Mohammed AZFAR AZAMI",
  "Chafik ZARHOUR",
];

const ROWS_PER_PAGE = 10;

export const TicketTable: React.FC<TicketTableProps> = ({ filteredTickets }) => {
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [currentPage, setCurrentPage] = useState(1);

  // Filter tickets to show only CES team members and valid IDs
  const cesTeamTickets = useMemo(() => {
    return filteredTickets.filter(ticket => 
      CES_TEAM.includes(ticket.assignee) && 
      (ticket.id.startsWith('CRQ') || ticket.id.startsWith('INC'))
    );
  }, [filteredTickets]);

  const handleSort = useCallback((field: SortField) => {
    if (field === sortField) {
      setSortDirection(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
    // Reset to first page when sorting changes
    setCurrentPage(1);
  }, [sortField]);

 const isTicketOverdue = useCallback((ticket: ITSMTicket): boolean => {
    // Check if status is resolved/closed (not overdue if resolved/closed)
    const normalizedStatus = ticket.status?.toLowerCase() || "";
    const isClosedStatus = ["fermé", "clos", "résolu", "closed", "resolved", "clot"].includes(normalizedStatus);
    
    if (isClosedStatus) {
      return false;
    }

    const now = new Date();
    return (
      differenceInHours(now, ticket.createdAt) > 24 ||
      differenceInHours(now, ticket.lastUpdatedAt) > 24
    );
  }, []);

  const getPriorityNumber = useCallback((priority: string): number => {
    return parseInt(priority.replace("P", ""), 10) || 0;
  }, []);

  const sortedTickets = useMemo(() => {
    return [...cesTeamTickets].sort((a, b) => {
      let compareResult = 0;

      switch (sortField) {
        case "id":
        case "type":
        case "status":
        case "assignee":
        case "company":
          compareResult = a[sortField].localeCompare(b[sortField]);
          break;
        case "priority":
          compareResult = getPriorityNumber(a.priority) - getPriorityNumber(b.priority);
          break;
        case "createdAt":
        case "lastUpdatedAt":
          compareResult = a[sortField].getTime() - b[sortField].getTime();
          break;
        default:
          compareResult = 0;
      }

      return sortDirection === "asc" ? compareResult : -compareResult;
    });
  }, [cesTeamTickets, sortField, sortDirection, getPriorityNumber]);

  // Calculate pagination
  const totalPages = Math.ceil(sortedTickets.length / ROWS_PER_PAGE);
  const startIndex = (currentPage - 1) * ROWS_PER_PAGE;
  const endIndex = startIndex + ROWS_PER_PAGE;
  const currentPageTickets = sortedTickets.slice(startIndex, endIndex);

  const handlePreviousPage = useCallback(() => {
    setCurrentPage(prev => Math.max(1, prev - 1));
  }, []);

  const handleNextPage = useCallback(() => {
    setCurrentPage(prev => Math.min(totalPages, prev + 1));
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
    const total = cesTeamTickets.length;
    const overdue = cesTeamTickets.filter(isTicketOverdue).length;
    const critical = cesTeamTickets.filter((t) => t.priority === "P1").length;

    // Calculate CRQ and INC counts per assignee
    const ticketCounts = CES_TEAM.reduce(
      (acc, assignee) => {
        acc[assignee] = {
          CRQ: cesTeamTickets.filter(
            (t) => t.assignee === assignee && t.type === "CRQ"
          ).length,
          INC: cesTeamTickets.filter(
            (t) => t.assignee === assignee && t.type === "INC"
          ).length,
        };
        return acc;
      },
      {} as Record<string, { CRQ: number; INC: number }>
    );

    return { total, overdue, critical, ticketCounts };
  }, [cesTeamTickets, isTicketOverdue]);

  const getStatusColor = useCallback((status: string) => {
    switch (status.toLowerCase()) {
      case "fermé":
        return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case "en attente":
        return "bg-amber-100 text-amber-800 border-amber-200";
      case "en cours":
        return "bg-blue-100 text-blue-800 border-blue-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  }, []);

  const getPriorityColor = useCallback((priority: string) => {
    switch (priority) {
      case "P1":
        return "bg-red-100 text-red-800 border-red-200";
      case "P2":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "P3":
        return "bg-blue-100 text-blue-800 border-blue-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  }, []);

  return (
    <ContentCard title="CES Team Tickets Dashboard">
      <div className="space-y-6">
        {/* Enhanced Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                  <p className="text-sm font-medium text-red-700">Critical (P1)</p>
                  <p className="text-2xl font-bold text-red-900">{getSummaryStats.critical}</p>
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
                <p className="text-xs text-green-600">Active assignees</p>
              </div>
              <Users className="h-8 w-8 text-green-600" />
            </div>
          </div>
        </div>

        {/* Team Distribution */}
        <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
            <Users className="h-4 w-4 mr-2" />
            Team Distribution
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {CES_TEAM.map((assignee) => (
              <div
                key={assignee}
                className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm"
              >
                <p className="text-xs font-medium text-gray-900 truncate mb-1">
                  {assignee.split(' ')[0]}
                </p>
                <div className="flex justify-between text-xs">
                  <span className="text-green-600 font-medium">
                    CRQ: {getSummaryStats.ticketCounts[assignee]?.CRQ || 0}
                  </span>
                  <span className="text-blue-600 font-medium">
                    INC: {getSummaryStats.ticketCounts[assignee]?.INC || 0}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Enhanced Table */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">
              CES Team Tickets
            </h3>
            
            {/* Pagination Controls */}
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
                    onClick={() => handleSort("lastUpdatedAt")}
                  >
                    <div className="flex items-center">
                      Last Updated {renderSortIcon("lastUpdatedAt")}
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
                    onClick={() => handleSort("company")}
                  >
                    <div className="flex items-center">
                      Company {renderSortIcon("company")}
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentPageTickets.map((ticket, index) => {
                  const isOverdue = isTicketOverdue(ticket);

                  return (
                    <TableRow
                      key={ticket.id}
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
                          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold border ${
                            ticket.type === "CRQ"
                              ? "bg-green-100 text-green-800 border-green-200"
                              : "bg-blue-100 text-blue-800 border-blue-200"
                          }`}
                        >
                          {ticket.type}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold border ${getStatusColor(ticket.status)}`}
                        >
                          {ticket.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold border ${getPriorityColor(ticket.priority)}`}
                        >
                          {ticket.priority}
                        </span>
                      </TableCell>
                      <TableCell
                        className={`text-sm ${isOverdue ? "text-amber-700 font-semibold" : "text-gray-600"}`}
                      >
                        {format(ticket.createdAt, "dd/MM/yyyy HH:mm", {
                          locale: fr,
                        })}
                      </TableCell>
                      <TableCell
                        className={`text-sm ${isOverdue ? "text-amber-700 font-semibold" : "text-gray-600"}`}
                      >
                        {format(ticket.lastUpdatedAt, "dd/MM/yyyy HH:mm", {
                          locale: fr,
                        })}
                      </TableCell>
                      <TableCell className="text-sm font-medium text-gray-900">
                        {ticket.assignee.split(' ')[0]}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {ticket.company}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {cesTeamTickets.length === 0 && (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">No CES team tickets found</p>
              <p className="text-gray-400 text-sm">Check filters or data source</p>
            </div>
          )}

          {/* Bottom Pagination */}
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