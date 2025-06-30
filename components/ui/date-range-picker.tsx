"use client";

import * as React from "react";
import { format, startOfYear, endOfYear, startOfMonth, endOfMonth, addYears, subYears, addMonths, subMonths, isSameMonth, isSameYear } from "date-fns";
import { fr } from "date-fns/locale";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X, RotateCcw } from "lucide-react";
import { DateRange } from "react-day-picker";
import { cn } from "../../lib/utils";
import { Button } from "../../components/ui/button";
import { Calendar } from "../../components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../components/ui/popover";

interface DatePickerWithRangeProps {
  className?: string;
  value?: DateRange | null;
  onChange?: (date: DateRange | null) => void;
  placeholder?: string;
  disabled?: boolean;
  maxDate?: Date;
  minDate?: Date;
}

const PRESET_RANGES = [
  {
    label: "Today",
    value: "today",
    getValue: () => ({ from: new Date(), to: new Date() })
  },
  {
    label: "Last 7 days",
    value: "last7",
    getValue: () => {
      const today = new Date();
      const weekAgo = new Date(today);
      weekAgo.setDate(today.getDate() - 7);
      return { from: weekAgo, to: today };
    }
  },
  {
    label: "Last 30 days",
    value: "last30",
    getValue: () => {
      const today = new Date();
      const monthAgo = new Date(today);
      monthAgo.setDate(today.getDate() - 30);
      return { from: monthAgo, to: today };
    }
  },
  {
    label: "This month",
    value: "thisMonth",
    getValue: () => {
      const today = new Date();
      return { from: startOfMonth(today), to: endOfMonth(today) };
    }
  },
  {
    label: "Last month",
    value: "lastMonth",
    getValue: () => {
      const today = new Date();
      const lastMonth = subMonths(today, 1);
      return { from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) };
    }
  },
  {
    label: "This year",
    value: "thisYear",
    getValue: () => {
      const today = new Date();
      return { from: startOfYear(today), to: endOfYear(today) };
    }
  },
  {
    label: "Last year",
    value: "lastYear",
    getValue: () => {
      const today = new Date();
      const lastYear = subYears(today, 1);
      return { from: startOfYear(lastYear), to: endOfYear(lastYear) };
    }
  }
];

// Generate year presets dynamically
const YEAR_PRESETS = Array.from({ length: new Date().getFullYear() - 2020 + 1 }, (_, i) => ({
  label: `${2020 + i}`,
  value: `year-${2020 + i}`,
  getValue: () => {
    const year = 2020 + i;
    return { from: startOfYear(new Date(year, 0, 1)), to: endOfYear(new Date(year, 0, 1)) };
  }
})).reverse();

export function DatePickerWithRange({
  className,
  value,
  onChange,
  placeholder = "Select date range",
  disabled = false,
  maxDate = new Date(),
  minDate = new Date(2020, 0, 1),
}: DatePickerWithRangeProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [displayMonth, setDisplayMonth] = React.useState(value?.from || new Date());
  const [viewMode, setViewMode] = React.useState<'calendar' | 'year' | 'month'>('calendar');
  const [selectedPreset, setSelectedPreset] = React.useState<string | null>(null);

  const yearOptions = React.useMemo(() => {
    const startYear = minDate.getFullYear();
    const endYear = maxDate.getFullYear();
    return Array.from({ length: endYear - startYear + 1 }, (_, i) => startYear + i).reverse();
  }, [minDate, maxDate]);

  const monthOptions = React.useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => ({
      value: i,
      label: format(new Date(2023, i, 1), 'MMM', { locale: fr })
    }));
  }, []);

  const selected = value === null ? undefined : value;

  const handleSelect = (range: DateRange | undefined) => {
    setSelectedPreset(null);
    if (onChange) {
      onChange(range || null);
    }
  };

  const handlePresetSelect = (preset: typeof PRESET_RANGES[0] | typeof YEAR_PRESETS[0]) => {
    const range = preset.getValue();
    setSelectedPreset(preset.value);
    handleSelect(range);
    setIsOpen(false);
  };

  const handleYearSelect = (year: number) => {
    const newDate = new Date(year, displayMonth.getMonth(), 1);
    setDisplayMonth(newDate);
    setViewMode('calendar');
  };

  const handleMonthSelect = (month: number) => {
    const newDate = new Date(displayMonth.getFullYear(), month, 1);
    setDisplayMonth(newDate);
    setViewMode('calendar');
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newMonth = direction === 'next' 
      ? addMonths(displayMonth, 1) 
      : subMonths(displayMonth, 1);
    setDisplayMonth(newMonth);
  };

  const formatDisplayValue = () => {
    if (!value?.from) return placeholder;
    
    if (value.to) {
      if (value.from.getTime() === value.to.getTime()) {
        return format(value.from, "dd MMM yyyy", { locale: fr });
      }
      if (isSameMonth(value.from, value.to)) {
        return `${format(value.from, "dd", { locale: fr })} - ${format(value.to, "dd MMM yyyy", { locale: fr })}`;
      }
      if (isSameYear(value.from, value.to)) {
        return `${format(value.from, "dd MMM", { locale: fr })} - ${format(value.to, "dd MMM yyyy", { locale: fr })}`;
      }
      return `${format(value.from, "dd MMM yyyy", { locale: fr })} - ${format(value.to, "dd MMM yyyy", { locale: fr })}`;
    }
    
    return format(value.from, "dd MMM yyyy", { locale: fr });
  };

  const clearSelection = (e: React.MouseEvent) => {
    e.stopPropagation();
    handleSelect(undefined);
    setSelectedPreset(null);
  };

  const resetToToday = () => {
    const today = new Date();
    setDisplayMonth(today);
    setViewMode('calendar');
  };

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant="outline"
            disabled={disabled}
            className={cn(
              "w-full justify-start text-left font-normal group relative",
              "h-10 px-3 py-2",
              "bg-white border border-input rounded-md",
              "shadow-sm transition-all duration-200",
              "hover:bg-accent hover:border-accent-foreground/20",
              "focus:ring-2 focus:ring-ring focus:ring-offset-2",
              !value && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4 shrink-0 opacity-60" />
            <span className="truncate flex-1 text-sm">{formatDisplayValue()}</span>
            {value && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={clearSelection}
                className="ml-2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 hover:bg-destructive/10 text-destructive rounded-sm transition-all duration-200"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </Button>
        </PopoverTrigger>
        
        <PopoverContent 
          className="w-auto p-0 shadow-lg border" 
          align="start" 
          sideOffset={4}
        >
          <div className="flex min-w-[320px]">
            {/* Sidebar with presets */}
            <div className="w-44 border-r bg-muted/30 p-3">
              <div className="space-y-1">
                <h4 className="text-sm font-medium text-muted-foreground mb-3">Quick Select</h4>
                
                <div className="space-y-1">
                  {PRESET_RANGES.map((preset) => (
                    <Button
                      key={preset.value}
                      variant={selectedPreset === preset.value ? "secondary" : "ghost"}
                      size="sm"
                      className="w-full justify-start h-8 text-xs font-normal"
                      onClick={() => handlePresetSelect(preset)}
                    >
                      {preset.label}
                    </Button>
                  ))}
                </div>

                <div className="pt-2 mt-3 border-t">
                  <h5 className="text-xs font-medium text-muted-foreground mb-2">Years</h5>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {YEAR_PRESETS.slice(0, 5).map((preset) => (
                      <Button
                        key={preset.value}
                        variant={selectedPreset === preset.value ? "secondary" : "ghost"}
                        size="sm"
                        className="w-full justify-start h-7 text-xs font-normal"
                        onClick={() => handlePresetSelect(preset)}
                      >
                        {preset.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Main calendar area */}
            <div className="flex-1 p-4">
              {/* Header with navigation */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigateMonth('prev')}
                    className="h-8 w-8 p-0"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost" 
                      size="sm"
                      onClick={() => setViewMode(viewMode === 'month' ? 'calendar' : 'month')}
                      className="text-sm font-medium h-8 px-2"
                    >
                      {format(displayMonth, 'MMMM', { locale: fr })}
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="sm" 
                      onClick={() => setViewMode(viewMode === 'year' ? 'calendar' : 'year')}
                      className="text-sm font-medium h-8 px-2"
                    >
                      {displayMonth.getFullYear()}
                    </Button>
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigateMonth('next')}
                    className="h-8 w-8 p-0"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetToToday}
                  className="h-8 w-8 p-0"
                  title="Go to today"
                >
                  <RotateCcw className="h-3 w-3" />
                </Button>
              </div>

              {/* Calendar content */}
              <div className="min-h-[280px]">
                {viewMode === 'calendar' && (
                  <Calendar
                    mode="range"
                    defaultMonth={displayMonth}
                    month={displayMonth}
                    onMonthChange={setDisplayMonth}
                    selected={selected}
                    onSelect={handleSelect}
                    numberOfMonths={1}
                    locale={fr}
                    disabled={{ after: maxDate, before: minDate }}
                    showOutsideDays={false}
                    className="rounded-md"
                  />
                )}

                {viewMode === 'year' && (
                  <div className="grid grid-cols-4 gap-2 p-2">
                    {yearOptions.map((year) => (
                      <Button
                        key={year}
                        variant={year === displayMonth.getFullYear() ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleYearSelect(year)}
                        className="h-9 text-sm"
                      >
                        {year}
                      </Button>
                    ))}
                  </div>
                )}

                {viewMode === 'month' && (
                  <div className="grid grid-cols-3 gap-2 p-2">
                    {monthOptions.map((month) => (
                      <Button
                        key={month.value}
                        variant={month.value === displayMonth.getMonth() ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleMonthSelect(month.value)}
                        className="h-9 text-sm"
                      >
                        {month.label}
                      </Button>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer actions */}
              <div className="flex items-center justify-between pt-3 mt-3 border-t">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    handleSelect(undefined);
                    setSelectedPreset(null);
                  }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  Clear
                </Button>
                
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setIsOpen(false)}
                    disabled={!value?.from}
                  >
                    Apply
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}