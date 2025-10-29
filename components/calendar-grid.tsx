"use client";

import { useMemo } from "react";
import { format, startOfWeek, addDays, isSameDay, parseISO } from "date-fns";

interface TimeSlot {
  start: string;
  end: string;
}

interface CalendarGridProps {
  slots: TimeSlot[];
  onSelectSlot: (slot: TimeSlot) => void;
}

export function CalendarGrid({ slots, onSelectSlot }: CalendarGridProps) {
  // Group slots by date
  const slotsByDate = useMemo(() => {
    const grouped: { [date: string]: TimeSlot[] } = {};

    slots.forEach((slot) => {
      const date = format(parseISO(slot.start), "yyyy-MM-dd");
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(slot);
    });

    return grouped;
  }, [slots]);

  // Get unique dates
  const dates = useMemo(() => {
    return Object.keys(slotsByDate).sort();
  }, [slotsByDate]);

  if (dates.length === 0) {
    return null;
  }

  // Get earliest and latest dates to determine full range
  const firstDate = parseISO(dates[0]);
  const lastDate = parseISO(dates[dates.length - 1]);

  // Get week start of first date and week end of last date
  const firstWeekStart = startOfWeek(firstDate);
  const lastWeekEnd = addDays(startOfWeek(lastDate), 6);

  // Calculate number of weeks to display
  const daysDiff = Math.ceil((lastWeekEnd.getTime() - firstWeekStart.getTime()) / (1000 * 60 * 60 * 24));
  const numWeeks = Math.ceil(daysDiff / 7);

  // Generate all weeks
  const weeks = Array.from({ length: numWeeks }, (_, weekIndex) => {
    const weekStart = addDays(firstWeekStart, weekIndex * 7);
    return Array.from({ length: 7 }, (_, dayIndex) => addDays(weekStart, dayIndex));
  });

  return (
    <div className="space-y-6">
      {weeks.map((weekDays, weekIndex) => (
        <div key={weekIndex}>
          {/* Week header */}
          <div className="text-sm font-medium text-gray-700 mb-2">
            {format(weekDays[0], "MMM d")} - {format(weekDays[6], "MMM d, yyyy")}
          </div>

          {/* Week grid */}
          <div className="grid grid-cols-7 gap-2">
            {weekDays.map((day) => {
              const dateKey = format(day, "yyyy-MM-dd");
              const daySlots = slotsByDate[dateKey] || [];
              const hasSlots = daySlots.length > 0;
              const isPast = day < new Date(new Date().setHours(0, 0, 0, 0));

              return (
                <div
                  key={dateKey}
                  className={`border rounded-lg p-3 min-h-32 ${
                    isPast
                      ? "bg-gray-100 border-gray-200 opacity-50"
                      : hasSlots
                      ? "bg-green-50 border-green-300"
                      : "bg-gray-50 border-gray-200"
                  }`}
                >
                  <div className="text-center mb-2">
                    <div className="text-xs font-medium text-gray-600 uppercase">
                      {format(day, "EEE")}
                    </div>
                    <div
                      className={`text-lg font-bold ${
                        isPast
                          ? "text-gray-400"
                          : hasSlots
                          ? "text-green-700"
                          : "text-gray-400"
                      }`}
                    >
                      {format(day, "d")}
                    </div>
                    <div className="text-xs text-gray-500">
                      {format(day, "MMM")}
                    </div>
                  </div>

                  {hasSlots && !isPast && (
                    <div className="space-y-1">
                      {daySlots.slice(0, 3).map((slot, idx) => {
                        const start = parseISO(slot.start);
                        return (
                          <button
                            key={idx}
                            onClick={() => onSelectSlot(slot)}
                            className="w-full text-xs bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded transition-colors"
                          >
                            {format(start, "h:mm a")}
                          </button>
                        );
                      })}
                      {daySlots.length > 3 && (
                        <div className="text-xs text-center text-green-700 font-medium">
                          +{daySlots.length - 3} more
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 text-sm pt-4 border-t">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-50 border-2 border-green-300 rounded"></div>
          <span className="text-gray-600">Available times</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gray-50 border-2 border-gray-200 rounded"></div>
          <span className="text-gray-600">No availability</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gray-100 border-2 border-gray-200 rounded opacity-50"></div>
          <span className="text-gray-600">Past dates</span>
        </div>
      </div>
    </div>
  );
}
