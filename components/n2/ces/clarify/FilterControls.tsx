"use client";

import { DateRange } from "react-day-picker";
import { Label } from "../../../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../ui/select";
import React from "react";
import { Input } from "../../../ui/input";
import  {DatePickerWithRange}  from "../../../ui/date-range-picker"

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

const OWNER_NAME_MAPPING: Record<string, string> = {
  ee0023059: "Nada BELMAATI",
  ee0023068: "Mohamed AZFAR AZAMI",
  ee0023070: "Youssef RAYOUD",
  ee0095270: "Chafik ZARHOUR",
};

interface FilterControlsProps {
  tickets: ClarifyTicket[];
  availableFilters: {
    statuses: string[];
    priorities: string[];
    regions: string[];
    severities: string[];
    owners: string[];
  };
  searchTerm: string;
  dateRange: DateRange | null;
  selectedStatus: string;
  selectedPriority: string;
  selectedRegion: string;
  selectedSeverity: string;
  selectedOwner: string;
  onSearch: (term: string) => void;
  onDateRangeChange: (range: DateRange | null) => void;
  onStatusChange: (value: string) => void;
  onPriorityChange: (value: string) => void;
  onRegionChange: (value: string) => void;
  onSeverityChange: (value: string) => void;
  onOwnerChange: (value: string) => void;
}

export const FilterControls: React.FC<FilterControlsProps> = ({
  availableFilters,
  searchTerm,
  dateRange,
  selectedStatus,
  selectedPriority,
  selectedRegion,
  selectedSeverity,
  selectedOwner,
  onSearch,
  onDateRangeChange,
  onStatusChange,
  onPriorityChange,
  onRegionChange,
  onSeverityChange,
  onOwnerChange,
}) => {
  const { statuses, priorities, regions, severities, owners } = availableFilters;

  return (
    <div className="p-4 bg-white rounded-lg shadow-sm">
      {/* First row with main filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-4">
        <div>
          <Label htmlFor="search" className="text-sm font-medium">Search</Label>
          <Input
            id="search"
            placeholder="Search by ID, company, city, owner..."
            value={searchTerm}
            onChange={(e) => onSearch(e.target.value)}
            className="mt-1 transition-all focus:ring-2 focus:ring-primary"
          />
        </div>
        <div>
          <Label htmlFor="status" className="text-sm font-medium">Status</Label>
          <Select value={selectedStatus} onValueChange={onStatusChange}>
            <SelectTrigger id="status" className="mt-1 transition-all focus:ring-2 focus:ring-primary">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">All statuses</SelectItem>
              {statuses.sort().map((status) => (
                <SelectItem key={status} value={status}>
                  {status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="priority" className="text-sm font-medium">Priority</Label>
          <Select value={selectedPriority} onValueChange={onPriorityChange}>
            <SelectTrigger id="priority" className="mt-1 transition-all focus:ring-2 focus:ring-primary">
              <SelectValue placeholder="All priorities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">All priorities</SelectItem>
              {priorities.sort().map((priority) => (
                <SelectItem key={priority} value={priority}>
                  {priority}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="severity" className="text-sm font-medium">Severity</Label>
          <Select value={selectedSeverity} onValueChange={onSeverityChange}>
            <SelectTrigger id="severity" className="mt-1 transition-all focus:ring-2 focus:ring-primary">
              <SelectValue placeholder="All severities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">All severities</SelectItem>
              {severities.sort((a, b) => parseInt(a) - parseInt(b)).map((severity) => (
                <SelectItem key={severity} value={severity}>
                  S{severity}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="region" className="text-sm font-medium">Region</Label>
          <Select value={selectedRegion} onValueChange={onRegionChange}>
            <SelectTrigger id="region" className="mt-1 transition-all focus:ring-2 focus:ring-primary">
              <SelectValue placeholder="All regions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">All regions</SelectItem>
              {regions.sort().map((region) => (
                <SelectItem key={region} value={region}>
                  {region}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="owner" className="text-sm font-medium">Owner</Label>
          <Select value={selectedOwner} onValueChange={onOwnerChange}>
            <SelectTrigger id="owner" className="mt-1 transition-all focus:ring-2 focus:ring-primary">
              <SelectValue placeholder="All owners" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">All owners</SelectItem>
              {owners.sort().map((owner) => (
                <SelectItem key={owner} value={owner}>
                  {owner}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Second row with date range */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <div>
          <Label htmlFor="date-range" className="text-sm font-medium">Date Range</Label>
          <DatePickerWithRange
            value={dateRange}
            onChange={onDateRangeChange}
            className="mt-1 transition-all focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>
    </div>
  );
};