"use client";

import { DateRange } from "react-day-picker";
import { Label } from "../../../ui/label";
import { Input } from "../../../ui/input";
import React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../ui/select";
import { DatePickerWithRange } from "./DatePickerWithRange";

interface ITSMTicket {
  id: string;
  type: "CRQ" | "INC" | string;
  priority: "P1" | "P2" | "P3" | string;
  status: string;
  createdAt: Date;
  lastUpdatedAt: Date;
  assignee: string;
  company: string;
}

interface FilterControlsProps {
  tickets: ITSMTicket[];
  availableFilters: { statuses: string[]; types: string[]; priorities: string[]; assignees: string[]; };
  searchTerm: string;
  dateRange: DateRange | null;
  selectedStatus: string;
  selectedType: string;
  selectedPriority: string;
  selectedAssignee: string;
  onSearch: (term: string) => void;
  onDateRangeChange: (range: DateRange | null) => void;
  onStatusChange: (status: string) => void;
  onTypeChange: (type: string) => void;
  onPriorityChange: (priority: string) => void;
  onAssigneeChange: (assignee: string) => void;
  disabled: boolean;
}


export const FilterControls: React.FC<FilterControlsProps> = ({
  availableFilters,
  searchTerm,
  dateRange,
  selectedStatus,
  selectedType,
  selectedPriority,
  selectedAssignee,
  onSearch,
  onDateRangeChange,
  onStatusChange,
  onTypeChange,
  onPriorityChange,
  onAssigneeChange,
}) => {
  const { statuses, types, priorities, assignees } = availableFilters;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 p-4 bg-white rounded-lg shadow-sm">
      <div>
        <Label htmlFor="search" className="text-sm font-medium">Search</Label>
        <Input
          id="search"
          placeholder="Search by ID, assignee, company..."
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
        <Label htmlFor="type" className="text-sm font-medium">Type</Label>
        <Select value={selectedType} onValueChange={onTypeChange}>
          <SelectTrigger id="type" className="mt-1 transition-all focus:ring-2 focus:ring-primary">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">All types</SelectItem>
            {types.sort().map((type) => (
              <SelectItem key={type} value={type}>
                {type}
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
        <Label htmlFor="assignee" className="text-sm font-medium">Assignee</Label>
        <Select value={selectedAssignee} onValueChange={onAssigneeChange}>
          <SelectTrigger id="assignee" className="mt-1 transition-all focus:ring-2 focus:ring-primary">
            <SelectValue placeholder="All assignees" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">All assignees</SelectItem>
            {assignees.sort().map((assignee) => (
              <SelectItem key={assignee} value={assignee}>
                {assignee}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="date-range" className="text-sm font-medium">Date Range</Label>
        <DatePickerWithRange
          value={dateRange}
          onChange={onDateRangeChange}
          className="mt-1 transition-all focus:ring-2 focus:ring-primary"
        />
      </div>
    </div>
  );
};