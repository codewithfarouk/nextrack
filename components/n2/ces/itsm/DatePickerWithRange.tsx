"use client";

import * as React from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Calendar as CalendarIcon } from "lucide-react";
import { DateRange } from "react-day-picker";
import { cn } from "../../../../lib/utils";
import { Button } from "../../../../components/ui/button";
import { Calendar } from "../../../../components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../../../components/ui/popover";

interface DatePickerWithRangeProps {
  className?: string;
  value?: DateRange | null;
  onChange?: (date: DateRange | null) => void;
}

export function DatePickerWithRange({
  className,
  value,
  onChange,
}: DatePickerWithRangeProps) {
  const selected = value === null ? undefined : value;

  const handleSelect = (
    range: DateRange | undefined,
    selectedDay: Date,
    activeModifiers: any,
    e: React.MouseEvent
  ) => {
    if (onChange) {
      onChange(range || null);
    }
  };

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal",
              !value && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {value?.from ? (
              value.to ? (
                <>
                  {format(value.from, "dd/MM/yyyy", { locale: fr })} -{" "}
                  {format(value.to, "dd/MM/yyyy", { locale: fr })}
                </>
              ) : (
                format(value.from, "dd/MM/yyyy", { locale: fr })
              )
            ) : (
              <span>Pick a date range</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={value?.from}
            selected={selected}
            onSelect={handleSelect}
            numberOfMonths={2}
            locale={fr}
            disabled={{ after: new Date() }}
            showOutsideDays
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}