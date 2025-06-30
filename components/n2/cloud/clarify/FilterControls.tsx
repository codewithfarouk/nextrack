"use client";

import { Input } from "../../../../components/ui/input";
import { Label } from "../../../../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../../components/ui/select";
import {DatePickerWithRange}  from "../../../../components/ui/date-range-picker";
import { DateRange } from "react-day-picker";
import React from "react";

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

interface FilterControlsProps {
  tickets: ClarifyTicket[];
  searchTerm: string;
  dateRange: DateRange | null;
  selectedStatus: string;
  selectedPriority: string;
  selectedRegion: string;
  selectedSeverity: string;
  onSearch: (term: string) => void;
  onDateRangeChange: (range: DateRange | null) => void;
  onStatusChange: (value: string) => void;
  onPriorityChange: (value: string) => void;
  onRegionChange: (value: string) => void;
  onSeverityChange: (value: string) => void;
}

export const FilterControls: React.FC<FilterControlsProps> = ({
  tickets,
  searchTerm,
  dateRange,
  selectedStatus,
  selectedPriority,
  selectedRegion,
  selectedSeverity,
  onSearch,
  onDateRangeChange,
  onStatusChange,
  onPriorityChange,
  onRegionChange,
  onSeverityChange,
}) => {
  const uniqueStatuses = Array.from(new Set(tickets.map((t) => t.status)));
  const uniquePriorities = Array.from(new Set(tickets.map((t) => t.priority)));
  const uniqueRegions = Array.from(new Set(tickets.map((t) => t.region)));
  const uniqueSeverities = Array.from(new Set(tickets.map((t) => t.severity)));

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
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
        <Label>Severity</Label>
        <Select value={selectedSeverity} onValueChange={onSeverityChange}>
          <SelectTrigger>
            <SelectValue placeholder="All severities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">All severities</SelectItem>
            {uniqueSeverities.map((severity) => (
              <SelectItem key={severity} value={severity}>
                {severity}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Region</Label>
        <Select value={selectedRegion} onValueChange={onRegionChange}>
          <SelectTrigger>
            <SelectValue placeholder="All regions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">All regions</SelectItem>
            {uniqueRegions.map((region) => (
              <SelectItem key={region} value={region}>
                {region}
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