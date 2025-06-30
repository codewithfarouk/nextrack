"use client";


import { DateRange } from "react-day-picker";
import { Label } from "../../../ui/label";
import { Input } from "../../../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../ui/select";
import React from "react";
import {DatePickerWithRange}  from "../../../ui/date-range-picker";

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

interface FilterControlsProps {
  tickets: ITSMTicket[];
  searchTerm: string;
  dateRange: DateRange | null;
  selectedStatus: string;
  selectedType: string;
  selectedPriority: string;
  onSearch: (term: string) => void;
  onDateRangeChange: (range: DateRange | null) => void;
  onStatusChange: (value: string) => void;
  onTypeChange: (value: string) => void;
  onPriorityChange: (value: string) => void;
    disabled?: boolean; // ✅ Ajouté ici
}

export const FilterControls: React.FC<FilterControlsProps> = ({
  tickets,
  searchTerm,
  dateRange,
  selectedStatus,
  selectedType,
  selectedPriority,
  onSearch,
  onDateRangeChange,
  onStatusChange,
  onTypeChange,
  onPriorityChange,
}) => {
  const uniqueStatuses = Array.from(new Set(tickets.map((t) => t.status)));
  const uniqueTypes = ["CRQ", "INC"];
  const uniquePriorities = ["P1", "P2", "P3"];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
      <div>
        <Label htmlFor="search">Search</Label>
        <Input
          id="search"
          placeholder="Search tickets..."
          value={searchTerm}
          onChange={(e) => onSearch(e.target.value)}
        />
      </div>
      <div>
        <Label>Status</Label>
        <Select value={selectedStatus} onValueChange={onStatusChange}>
          <SelectTrigger>
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">All statuses</SelectItem>
            {uniqueStatuses.map((status) => (
              <SelectItem key={status} value={status}>
                {status}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Type</Label>
        <Select value={selectedType} onValueChange={onTypeChange}>
          <SelectTrigger>
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">All types</SelectItem>
            {uniqueTypes.map((type) => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Priority</Label>
        <Select value={selectedPriority} onValueChange={onPriorityChange}>
          <SelectTrigger>
            <SelectValue placeholder="All priorities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">All priorities</SelectItem>
            {uniquePriorities.map((priority) => (
              <SelectItem key={priority} value={priority}>
                {priority}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Date Range</Label>
        <DatePickerWithRange value={dateRange} onChange={onDateRangeChange} />
      </div>
    </div>
  );
};