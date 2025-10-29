"use client";

import { useState, useMemo } from "react";
import {
  format,
  startOfWeek,
  addDays,
  isSameDay,
  parseISO,
  differenceInMinutes,
} from "date-fns";

interface CalendarEvent {
  id?: string;
  title: string;
  start: string;
  end: string;
  location?: string | null;
  description?: string | null;
  attendees?: string[] | null;
}

interface FriendCalendar {
  userId: string;
  displayName: string;
  email: string;
  permission: "busy-only" | "full-details";
  events: CalendarEvent[];
}

interface FriendsCalendarViewProps {
  calendars: FriendCalendar[];
  currentWeekStart: Date;
}

const COLORS = [
  { bg: "bg-blue-500", text: "text-white" },
  { bg: "bg-green-500", text: "text-white" },
  { bg: "bg-purple-500", text: "text-white" },
  { bg: "bg-pink-500", text: "text-white" },
  { bg: "bg-yellow-500", text: "text-white" },
  { bg: "bg-indigo-500", text: "text-white" },
  { bg: "bg-red-500", text: "text-white" },
  { bg: "bg-teal-500", text: "text-white" },
];

export function FriendsCalendarView({
  calendars,
  currentWeekStart,
}: FriendsCalendarViewProps) {
  const [selectedEvent, setSelectedEvent] = useState<(CalendarEvent & { calendar: FriendCalendar }) | null>(null);

  // Generate week days
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i)),
    [currentWeekStart]
  );

  // Hours to display (8 AM - 11 PM)
  const hours = Array.from({ length: 16 }, (_, i) => i + 8); // 8-23
  const HOUR_HEIGHT = 60; // pixels per hour

  // Separate all-day events from timed events
  const { allDayEvents, timedEvents } = useMemo(() => {
    const allDay: Array<CalendarEvent & { calendar: FriendCalendar }> = [];
    const timed: Array<CalendarEvent & { calendar: FriendCalendar }> = [];

    calendars.forEach((calendar) => {
      calendar.events.forEach((event) => {
        // Check if it's an all-day event (date-only, no time)
        const isAllDay = !event.start.includes("T") || !event.end.includes("T");

        // Filter out 0-minute events (data errors)
        const eventStart = new Date(event.start);
        const eventEnd = new Date(event.end);
        const duration = eventEnd.getTime() - eventStart.getTime();

        if (duration <= 0) {
          console.log(`Filtering out 0-minute event: ${event.title} at ${event.start}`);
          return; // Skip this event
        }

        if (isAllDay) {
          allDay.push({ ...event, calendar });
        } else {
          timed.push({ ...event, calendar });
        }
      });
    });

    return { allDayEvents: allDay, timedEvents: timed };
  }, [calendars]);

  const getEventsForDay = (day: Date) => {
    return timedEvents.filter((event) => {
      const eventStart = new Date(event.start);
      return isSameDay(eventStart, day);
    });
  };

  const getAllDayEventsForDay = (day: Date) => {
    const seen = new Set<string>();
    const dayString = format(day, "yyyy-MM-dd");

    return allDayEvents.filter((event) => {
      // For all-day events, event.start is just a date string like "2025-10-31"
      // Don't parse it with Date() as it will cause timezone issues
      const eventDateString = event.start.split('T')[0]; // Get just the date part
      const eventKey = `${event.calendar.userId}-${event.title}-${event.start}`;

      // Only show event on its start day (not repeated across multi-day events)
      if (eventDateString === dayString && !seen.has(eventKey)) {
        seen.add(eventKey);
        return true;
      }
      return false;
    });
  };

  const getEventPosition = (event: CalendarEvent) => {
    const eventStart = new Date(event.start);
    const eventEnd = new Date(event.end);
    const dayStart = new Date(eventStart);
    dayStart.setHours(8, 0, 0, 0); // 8 AM

    const startMinutes = differenceInMinutes(eventStart, dayStart);
    const duration = differenceInMinutes(eventEnd, eventStart);

    const top = (startMinutes / 60) * HOUR_HEIGHT;
    const height = (duration / 60) * HOUR_HEIGHT;

    return { top, height };
  };

  // Just sort events by start time - no complex column logic
  const sortEventsByStart = (dayEvents: Array<CalendarEvent & { calendar: FriendCalendar }>) => {
    return [...dayEvents].sort((a, b) =>
      new Date(a.start).getTime() - new Date(b.start).getTime()
    );
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Week header with day labels */}
      <div className="grid grid-cols-8 border-b border-gray-200 bg-gray-50 sticky top-0 z-10">
        <div className="p-2 text-xs font-medium text-gray-600 border-r border-gray-200">
          Time
        </div>
        {weekDays.map((day, idx) => (
          <div
            key={idx}
            className="p-2 text-center border-r border-gray-200 last:border-r-0"
          >
            <div className="text-xs font-medium text-gray-600 uppercase">
              {format(day, "EEE")}
            </div>
            <div className="text-lg font-bold text-gray-900">
              {format(day, "d")}
            </div>
          </div>
        ))}
      </div>

      {/* All-day events row */}
      {allDayEvents.length > 0 && (
        <div className="grid grid-cols-8 border-b-2 border-gray-300 bg-gray-50">
          <div className="p-2 text-xs font-medium text-gray-600 border-r border-gray-200">
            All Day
          </div>
          {weekDays.map((day, dayIdx) => {
            const dayEvents = getAllDayEventsForDay(day);
            return (
              <div
                key={dayIdx}
                className="p-1 border-r border-gray-200 last:border-r-0 min-h-[40px]"
              >
                {dayEvents.map((event, eventIdx) => {
                  const calendarIndex = calendars.findIndex(
                    (c) => c.userId === event.calendar.userId
                  );
                  const color = COLORS[calendarIndex % COLORS.length];

                  return (
                    <div
                      key={eventIdx}
                      className={`${color.bg} ${color.text} rounded px-2 py-1 mb-1 text-xs font-medium`}
                      title={event.title}
                    >
                      <div className="truncate">{event.title}</div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}

      {/* Calendar grid */}
      <div className="overflow-auto max-h-[600px]">
        <div className="grid grid-cols-8">
          {/* Hour labels column */}
          <div className="border-r border-gray-200">
            {hours.map((hour) => (
              <div
                key={hour}
                className="border-b border-gray-200 p-2 text-xs text-gray-600"
                style={{ height: `${HOUR_HEIGHT}px` }}
              >
                {format(new Date().setHours(hour, 0, 0, 0), "h:mm a")}
              </div>
            ))}
          </div>

          {/* Day columns with events */}
          {weekDays.map((day, dayIdx) => {
            const dayEvents = sortEventsByStart(getEventsForDay(day));

            return (
              <div
                key={dayIdx}
                className="border-r border-gray-200 last:border-r-0 relative"
              >
                {/* Hour grid lines */}
                {hours.map((hour) => (
                  <div
                    key={hour}
                    className="border-b border-gray-200"
                    style={{ height: `${HOUR_HEIGHT}px` }}
                  />
                ))}

                {/* Events as absolute positioned blocks - overlapping is OK */}
                {dayEvents.map((event, eventIdx) => {
                  const { top, height } = getEventPosition(event);
                  const calendarIndex = calendars.findIndex(
                    (c) => c.userId === event.calendar.userId
                  );
                  const color = COLORS[calendarIndex % COLORS.length];

                  return (
                    <div
                      key={eventIdx}
                      onClick={() => setSelectedEvent(event)}
                      className={`${color.bg} ${color.text} absolute rounded shadow-md px-2 py-1 overflow-hidden cursor-pointer hover:z-50 hover:scale-105 transition-transform border border-white`}
                      style={{
                        top: `${top}px`,
                        height: `${Math.max(height, 25)}px`,
                        left: `2px`,
                        right: `2px`,
                        opacity: 0.95,
                      }}
                    >
                      <div className="text-xs font-semibold truncate">
                        {event.calendar.permission === "full-details"
                          ? event.title
                          : event.calendar.displayName}
                      </div>
                      <div className="text-xs truncate">
                        {format(new Date(event.start), "h:mm a")} - {format(new Date(event.end), "h:mm a")}
                      </div>
                      {event.calendar.permission === "full-details" && event.location && height > 40 && (
                        <div className="text-xs truncate opacity-90">
                          📍 {event.location}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* Event Details Modal */}
      {selectedEvent && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setSelectedEvent(null)}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className={`${COLORS[calendars.findIndex(c => c.userId === selectedEvent.calendar.userId) % COLORS.length].bg} ${COLORS[calendars.findIndex(c => c.userId === selectedEvent.calendar.userId) % COLORS.length].text} p-4`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-bold">
                    {selectedEvent.calendar.permission === "full-details"
                      ? selectedEvent.title
                      : selectedEvent.calendar.displayName}
                  </h3>
                  <p className="text-sm opacity-90 mt-1">
                    {selectedEvent.calendar.displayName}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedEvent(null)}
                  className="ml-4 p-1 hover:bg-white hover:bg-opacity-20 rounded transition-colors"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-4 space-y-4">
              {/* Date & Time */}
              <div className="flex items-start gap-3">
                <svg
                  className="w-5 h-5 text-gray-500 mt-0.5 flex-shrink-0"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <div>
                  <div className="font-medium text-gray-900">
                    {format(new Date(selectedEvent.start), "EEEE, MMMM d, yyyy")}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    {format(new Date(selectedEvent.start), "h:mm a")} -{" "}
                    {format(new Date(selectedEvent.end), "h:mm a")}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Duration: {Math.round(
                      (new Date(selectedEvent.end).getTime() -
                        new Date(selectedEvent.start).getTime()) /
                        (1000 * 60)
                    )}{" "}
                    minutes
                  </div>
                </div>
              </div>

              {/* Location */}
              {selectedEvent.calendar.permission === "full-details" &&
                selectedEvent.location && (
                  <div className="flex items-start gap-3">
                    <svg
                      className="w-5 h-5 text-gray-500 mt-0.5 flex-shrink-0"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                      <path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                    </svg>
                    <div className="text-gray-700">{selectedEvent.location}</div>
                  </div>
                )}

              {/* Description */}
              {selectedEvent.calendar.permission === "full-details" &&
                selectedEvent.description && (
                  <div className="flex items-start gap-3">
                    <svg
                      className="w-5 h-5 text-gray-500 mt-0.5 flex-shrink-0"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path d="M4 6h16M4 12h16M4 18h7"></path>
                    </svg>
                    <div className="text-gray-700 text-sm whitespace-pre-wrap">
                      {selectedEvent.description}
                    </div>
                  </div>
                )}

              {/* Attendees */}
              {selectedEvent.calendar.permission === "full-details" &&
                selectedEvent.attendees &&
                selectedEvent.attendees.length > 0 && (
                  <div className="flex items-start gap-3">
                    <svg
                      className="w-5 h-5 text-gray-500 mt-0.5 flex-shrink-0"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path>
                    </svg>
                    <div>
                      <div className="text-sm font-medium text-gray-900 mb-1">
                        Attendees ({selectedEvent.attendees.length})
                      </div>
                      <div className="space-y-1">
                        {selectedEvent.attendees.slice(0, 5).map((email, idx) => (
                          <div key={idx} className="text-sm text-gray-600">
                            {email}
                          </div>
                        ))}
                        {selectedEvent.attendees.length > 5 && (
                          <div className="text-xs text-gray-500">
                            +{selectedEvent.attendees.length - 5} more
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

              {/* Busy-only message */}
              {selectedEvent.calendar.permission === "busy-only" && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <p className="text-sm text-gray-600">
                    🔒 This event is marked as private. Only the time slot is
                    visible.
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="bg-gray-50 px-4 py-3 flex justify-end">
              <button
                onClick={() => setSelectedEvent(null)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
