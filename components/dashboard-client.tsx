"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { EventDialog } from "./event-dialog";
import { EventForm } from "./event-form";
import type { calendar_v3 } from "googleapis";

interface DashboardClientProps {
  events: calendar_v3.Schema$Event[];
  userName: string;
}

export function DashboardClient({ events, userName }: DashboardClientProps) {
  const router = useRouter();
  const [selectedEvent, setSelectedEvent] =
    useState<calendar_v3.Schema$Event | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const handleEdit = async (data: {
    title: string;
    start: string;
    end: string;
    location?: string;
    description?: string;
    attendees: string[];
  }) => {
    if (!selectedEvent?.id) return;

    const response = await fetch(`/api/events/${selectedEvent.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to update event");
    }

    setSelectedEvent(null);
    setIsEditing(false);
    router.refresh();
  };

  const handleDelete = async () => {
    if (!selectedEvent?.id) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/events/${selectedEvent.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete event");
      }

      setSelectedEvent(null);
      setDeleteConfirm(false);
      router.refresh();
    } catch (error) {
      console.error("Delete error:", error);
      alert("Failed to delete event");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      {/* Events List */}
      <div className="space-y-3">
        {events.map((event) => {
          const startDate = event.start?.dateTime
            ? new Date(event.start.dateTime)
            : null;
          const endDate = event.end?.dateTime
            ? new Date(event.end.dateTime)
            : null;

          return (
            <div
              key={event.id}
              onClick={() => setSelectedEvent(event)}
              className="group border border-gray-200 rounded-xl p-5 hover:shadow-md hover:border-blue-300 transition-all bg-white cursor-pointer"
            >
              <div className="flex items-start gap-4">
                {/* Date Badge */}
                {startDate && (
                  <div className="flex-shrink-0 w-16 text-center">
                    <div className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-lg p-2">
                      <div className="text-xs font-semibold uppercase">
                        {startDate.toLocaleDateString("en-US", {
                          weekday: "short",
                        })}
                      </div>
                      <div className="text-2xl font-bold">
                        {startDate.getDate()}
                      </div>
                      <div className="text-xs">
                        {startDate.toLocaleDateString("en-US", {
                          month: "short",
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* Event Details */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 text-lg group-hover:text-blue-600 transition-colors">
                    {event.summary || "Untitled Event"}
                  </h3>

                  {/* Time */}
                  {startDate && (
                    <div className="flex items-center gap-2 mt-2 text-sm text-gray-600">
                      <span className="font-medium">🕐</span>
                      <span>
                        {startDate.toLocaleTimeString("en-US", {
                          hour: "numeric",
                          minute: "2-digit",
                          hour12: true,
                        })}
                        {endDate &&
                          ` - ${endDate.toLocaleTimeString("en-US", {
                            hour: "numeric",
                            minute: "2-digit",
                            hour12: true,
                          })}`}
                      </span>
                    </div>
                  )}

                  {/* Location */}
                  {event.location && (
                    <div className="flex items-center gap-2 mt-2 text-sm text-gray-600">
                      <span className="font-medium">📍</span>
                      <span className="truncate">{event.location}</span>
                    </div>
                  )}

                  {/* Attendees */}
                  {event.attendees && event.attendees.length > 0 && (
                    <div className="flex items-center gap-2 mt-2 text-sm text-gray-600">
                      <span className="font-medium">👥</span>
                      <span>
                        {event.attendees.length} attendee
                        {event.attendees.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                  )}

                  {/* Description preview */}
                  {event.description && (
                    <p className="text-sm text-gray-500 mt-2 line-clamp-2">
                      {event.description}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Event Details/Edit Dialog */}
      <EventDialog
        isOpen={!!selectedEvent && !deleteConfirm}
        onClose={() => {
          setSelectedEvent(null);
          setIsEditing(false);
        }}
        title={isEditing ? "Edit Event" : "Event Details"}
      >
        {selectedEvent && !isEditing && (
          <div className="space-y-4">
            {/* Event Details View */}
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                {selectedEvent.summary || "Untitled Event"}
              </h3>

              {selectedEvent.start?.dateTime && (
                <div className="flex items-center gap-2 text-gray-600 mb-3">
                  <span className="font-medium">🕐</span>
                  <span>
                    {new Date(
                      selectedEvent.start.dateTime
                    ).toLocaleDateString("en-US", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                    {" at "}
                    {new Date(
                      selectedEvent.start.dateTime
                    ).toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                      hour12: true,
                    })}
                    {selectedEvent.end?.dateTime &&
                      ` - ${new Date(
                        selectedEvent.end.dateTime
                      ).toLocaleTimeString("en-US", {
                        hour: "numeric",
                        minute: "2-digit",
                        hour12: true,
                      })}`}
                  </span>
                </div>
              )}

              {selectedEvent.location && (
                <div className="flex items-center gap-2 text-gray-600 mb-3">
                  <span className="font-medium">📍</span>
                  <span>{selectedEvent.location}</span>
                </div>
              )}

              {selectedEvent.attendees && selectedEvent.attendees.length > 0 && (
                <div className="mb-3">
                  <div className="flex items-center gap-2 text-gray-600 mb-2">
                    <span className="font-medium">👥</span>
                    <span className="font-medium">Attendees:</span>
                  </div>
                  <ul className="ml-8 space-y-1">
                    {selectedEvent.attendees.map((attendee, idx) => (
                      <li key={idx} className="text-sm text-gray-600">
                        {attendee.email}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {selectedEvent.description && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {selectedEvent.description}
                  </p>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4 border-t">
              <button
                onClick={() => setIsEditing(true)}
                className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-medium px-4 py-2.5 rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all"
              >
                Edit Event
              </button>
              <button
                onClick={() => setDeleteConfirm(true)}
                className="px-4 py-2.5 bg-red-500 text-white font-medium rounded-lg hover:bg-red-600 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        )}

        {selectedEvent && isEditing && (
          <EventForm
            initialData={{
              id: selectedEvent.id,
              title: selectedEvent.summary || "",
              start: selectedEvent.start?.dateTime || "",
              end: selectedEvent.end?.dateTime || "",
              location: selectedEvent.location || "",
              description: selectedEvent.description || "",
              attendees:
                selectedEvent.attendees?.map((a) => a.email || "") || [],
            }}
            onSubmit={handleEdit}
            onCancel={() => setIsEditing(false)}
          />
        )}
      </EventDialog>

      {/* Delete Confirmation Dialog */}
      <EventDialog
        isOpen={deleteConfirm}
        onClose={() => setDeleteConfirm(false)}
        title="Delete Event"
      >
        <div className="space-y-4">
          <p className="text-gray-700">
            Are you sure you want to delete "{selectedEvent?.summary}"? This
            action cannot be undone.
          </p>
          <div className="flex gap-3">
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="flex-1 bg-red-500 text-white font-medium px-4 py-2.5 rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
            >
              {isDeleting ? "Deleting..." : "Yes, Delete"}
            </button>
            <button
              onClick={() => setDeleteConfirm(false)}
              disabled={isDeleting}
              className="flex-1 border border-gray-300 text-gray-700 font-medium px-4 py-2.5 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </EventDialog>
    </>
  );
}
