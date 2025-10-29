"use client";

import { useState } from "react";
import { format } from "date-fns";

interface EventFormProps {
  initialData?: {
    id?: string;
    title: string;
    start: string;
    end: string;
    location?: string;
    description?: string;
    attendees?: string[];
  };
  onSubmit: (data: {
    title: string;
    start: string;
    end: string;
    location?: string;
    description?: string;
    attendees: string[];
  }) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
}

export function EventForm({
  initialData,
  onSubmit,
  onCancel,
  isLoading,
}: EventFormProps) {
  const [title, setTitle] = useState(initialData?.title || "");
  const [date, setDate] = useState(
    initialData?.start
      ? format(new Date(initialData.start), "yyyy-MM-dd")
      : format(new Date(), "yyyy-MM-dd")
  );
  const [startTime, setStartTime] = useState(
    initialData?.start
      ? format(new Date(initialData.start), "HH:mm")
      : "09:00"
  );
  const [endTime, setEndTime] = useState(
    initialData?.end ? format(new Date(initialData.end), "HH:mm") : "10:00"
  );
  const [location, setLocation] = useState(initialData?.location || "");
  const [description, setDescription] = useState(
    initialData?.description || ""
  );
  const [attendeesText, setAttendeesText] = useState(
    initialData?.attendees?.join(", ") || ""
  );
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validate
    if (!title.trim()) {
      setError("Title is required");
      return;
    }

    // Build ISO datetime strings
    const start = new Date(`${date}T${startTime}`).toISOString();
    const end = new Date(`${date}T${endTime}`).toISOString();

    if (new Date(end) <= new Date(start)) {
      setError("End time must be after start time");
      return;
    }

    // Parse attendees (comma or space separated emails)
    const attendees = attendeesText
      .split(/[,\s]+/)
      .map((email) => email.trim())
      .filter((email) => email.length > 0);

    try {
      await onSubmit({
        title,
        start,
        end,
        location: location || undefined,
        description: description || undefined,
        attendees,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save event");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded">
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Title */}
      <div>
        <label
          htmlFor="title"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Title *
        </label>
        <input
          type="text"
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Team Meeting"
          required
        />
      </div>

      {/* Date */}
      <div>
        <label
          htmlFor="date"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Date *
        </label>
        <input
          type="date"
          id="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          required
        />
      </div>

      {/* Time Range */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="startTime"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Start Time *
          </label>
          <input
            type="time"
            id="startTime"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
        </div>
        <div>
          <label
            htmlFor="endTime"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            End Time *
          </label>
          <input
            type="time"
            id="endTime"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
        </div>
      </div>

      {/* Location */}
      <div>
        <label
          htmlFor="location"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Location
        </label>
        <input
          type="text"
          id="location"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Conference Room A or Zoom Link"
        />
      </div>

      {/* Attendees */}
      <div>
        <label
          htmlFor="attendees"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Attendees
        </label>
        <input
          type="text"
          id="attendees"
          value={attendeesText}
          onChange={(e) => setAttendeesText(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="email1@example.com, email2@example.com"
        />
        <p className="text-xs text-gray-500 mt-1">
          Separate multiple emails with commas
        </p>
      </div>

      {/* Description */}
      <div>
        <label
          htmlFor="description"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Description
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Add any notes or agenda items..."
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-4">
        <button
          type="submit"
          disabled={isLoading}
          className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-medium px-4 py-2.5 rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? "Saving..." : initialData?.id ? "Update Event" : "Create Event"}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
