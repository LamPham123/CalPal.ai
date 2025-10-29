"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format, addDays, startOfDay, endOfDay } from "date-fns";
import { CalendarGrid } from "@/components/calendar-grid";

interface Friend {
  friendshipId: string;
  user: {
    _id: string;
    email: string;
    displayName: string;
  };
}

interface TimeSlot {
  start: string;
  end: string;
}

export default function FindTimePage() {
  const router = useRouter();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [durationHours, setDurationHours] = useState(1);
  const [durationMinutes, setDurationMinutes] = useState(0);
  const [dateRange, setDateRange] = useState("next-week");
  const [customStart, setCustomStart] = useState(
    format(addDays(new Date(), 1), "yyyy-MM-dd")
  );
  const [customEnd, setCustomEnd] = useState(
    format(addDays(new Date(), 8), "yyyy-MM-dd")
  );
  const [timePreference, setTimePreference] = useState("anytime");
  const [avoidWeekends, setAvoidWeekends] = useState(false);

  const durationMin = durationHours * 60 + durationMinutes;

  const [isLoading, setIsLoading] = useState(false);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [error, setError] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());

  // Group slots by day
  const slotsByDay = useMemo(() => {
    const grouped: { [date: string]: TimeSlot[] } = {};

    slots.forEach(slot => {
      const date = new Date(slot.start).toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric"
      });
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(slot);
    });

    // Sort slots within each day by start time
    Object.keys(grouped).forEach(date => {
      grouped[date].sort((a, b) => {
        return new Date(a.start).getTime() - new Date(b.start).getTime();
      });
    });

    return grouped;
  }, [slots]);

  const toggleDay = (day: string) => {
    setExpandedDays(prev => {
      const newSet = new Set(prev);
      if (newSet.has(day)) {
        newSet.delete(day);
      } else {
        newSet.add(day);
      }
      return newSet;
    });
  };

  useEffect(() => {
    fetchFriends();
  }, []);

  const fetchFriends = async () => {
    try {
      const response = await fetch("/api/friends");
      const data = await response.json();
      setFriends(data.friends || []);
    } catch (error) {
      console.error("Error fetching friends:", error);
    }
  };

  const toggleFriend = (friendId: string) => {
    setSelectedFriends((prev) =>
      prev.includes(friendId)
        ? prev.filter((id) => id !== friendId)
        : [...prev, friendId]
    );
  };

  const calculateDateRange = () => {
    const windowStart = startOfDay(new Date(customStart));
    const windowEnd = endOfDay(new Date(customEnd));
    return { windowStart, windowEnd };
  };

  const getWorkHours = () => {
    switch (timePreference) {
      case "morning":
        return { workHoursStart: "08:00", workHoursEnd: "12:00" };
      case "afternoon":
        return { workHoursStart: "12:00", workHoursEnd: "17:00" };
      case "evening":
        return { workHoursStart: "17:00", workHoursEnd: "21:00" };
      case "business":
        return { workHoursStart: "09:00", workHoursEnd: "17:00" };
      case "anytime":
      default:
        // Anytime: reasonable hours from 8 AM to 11 PM (avoids middle of night)
        return { workHoursStart: "08:00", workHoursEnd: "23:00" };
    }
  };

  const handleFindTime = async () => {
    setError("");
    setSlots([]);

    if (selectedFriends.length === 0) {
      setError("Please select at least one friend");
      return;
    }

    setIsLoading(true);

    try {
      const { windowStart, windowEnd } = calculateDateRange();
      const workHours = getWorkHours();

      const response = await fetch("/api/schedule/find-time", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          friendUserIds: selectedFriends,
          windowStart: windowStart.toISOString(),
          windowEnd: windowEnd.toISOString(),
          durationMin,
          preferences: {
            ...workHours,
            avoidWeekends,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to find time slots");
      }

      setSlots(data.slots || []);

      if (data.slots.length === 0) {
        setError(
          "No available time slots found. Try a different date range or preferences."
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to find times");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateEvent = async (slot: TimeSlot) => {
    if (!title.trim()) {
      setError("Please enter an event title first");
      // Scroll to top to show error
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    // Confirm before booking
    const startTime = new Date(slot.start).toLocaleString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

    if (
      !confirm(
        `Book "${title}" at ${startTime}?\n\nThis will create the event and invite all selected friends.`
      )
    ) {
      return;
    }

    setIsCreating(true);
    setError("");

    try {
      const attendees = selectedFriends
        .map((friendId) => {
          const friend = friends.find((f) => f.user._id === friendId);
          return friend?.user.email;
        })
        .filter(Boolean) as string[];

      console.log("Creating event:", {
        title,
        start: slot.start,
        end: slot.end,
        attendees,
      });

      const response = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          start: slot.start,
          end: slot.end,
          attendees,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create event");
      }

      console.log("Event created successfully:", data);

      // Success! Redirect to dashboard
      router.push("/dashboard?success=Event created and invites sent!");
      router.refresh();
    } catch (err) {
      console.error("Error creating event:", err);
      setError(
        err instanceof Error ? err.message : "Failed to create event"
      );
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg
                className="w-6 h-6 text-gray-600"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path d="M15 19l-7-7 7-7"></path>
              </svg>
            </Link>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Find Time with Friends
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Find the best meeting time when everyone is free
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Configuration Panel */}
          <div className="lg:col-span-1">
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200 p-6 space-y-6">
              <div>
                <h2 className="text-lg font-bold text-gray-900 mb-4">
                  Meeting Details
                </h2>

                {/* Event Title */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Event Title
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Team Meeting"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Duration */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Duration
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">
                        Hours
                      </label>
                      <select
                        value={durationHours}
                        onChange={(e) => setDurationHours(Number(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value={0}>0</option>
                        <option value={1}>1</option>
                        <option value={2}>2</option>
                        <option value={3}>3</option>
                        <option value={4}>4</option>
                        <option value={5}>5</option>
                        <option value={6}>6</option>
                        <option value={7}>7</option>
                        <option value={8}>8</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">
                        Minutes
                      </label>
                      <select
                        value={durationMinutes}
                        onChange={(e) => setDurationMinutes(Number(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value={0}>0</option>
                        <option value={15}>15</option>
                        <option value={30}>30</option>
                        <option value={45}>45</option>
                      </select>
                    </div>
                  </div>
                  {durationMin < 15 && (
                    <p className="text-xs text-red-600 mt-1">
                      Duration must be at least 15 minutes
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    Total: {durationHours}h {durationMinutes}m ({durationMin} minutes)
                  </p>
                </div>

                {/* Date Range */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date Range
                  </label>
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">
                        From
                      </label>
                      <input
                        type="date"
                        value={customStart}
                        onChange={(e) => setCustomStart(e.target.value)}
                        min={format(new Date(), "yyyy-MM-dd")}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">
                        To
                      </label>
                      <input
                        type="date"
                        value={customEnd}
                        onChange={(e) => setCustomEnd(e.target.value)}
                        min={customStart}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setCustomStart(format(addDays(new Date(), 1), "yyyy-MM-dd"));
                        setCustomEnd(format(addDays(new Date(), 8), "yyyy-MM-dd"));
                      }}
                      className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                    >
                      Next 7 days
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCustomStart(format(addDays(new Date(), 1), "yyyy-MM-dd"));
                        setCustomEnd(format(addDays(new Date(), 15), "yyyy-MM-dd"));
                      }}
                      className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                    >
                      Next 2 weeks
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCustomStart(format(addDays(new Date(), 1), "yyyy-MM-dd"));
                        setCustomEnd(format(addDays(new Date(), 31), "yyyy-MM-dd"));
                      }}
                      className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                    >
                      Next month
                    </button>
                  </div>
                </div>

                {/* Time Preference */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Time Preference
                  </label>
                  <select
                    value={timePreference}
                    onChange={(e) => setTimePreference(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="anytime">Anytime</option>
                    <option value="morning">Morning (8 AM - 12 PM)</option>
                    <option value="afternoon">Afternoon (12 PM - 5 PM)</option>
                    <option value="evening">Evening (5 PM - 9 PM)</option>
                    <option value="business">Business Hours (9 AM - 5 PM)</option>
                  </select>
                </div>

                {/* Avoid Weekends */}
                <div className="mb-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={avoidWeekends}
                      onChange={(e) => setAvoidWeekends(e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">
                      Avoid weekends
                    </span>
                  </label>
                </div>
              </div>

              {/* Friend Selection */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">
                  Select Friends ({selectedFriends.length})
                </h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {friends.length === 0 ? (
                    <p className="text-sm text-gray-500">
                      No friends yet.{" "}
                      <Link href="/friends" className="text-blue-600 hover:underline">
                        Add friends
                      </Link>
                    </p>
                  ) : (
                    friends.map((friend) => (
                      <label
                        key={friend.friendshipId}
                        className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedFriends.includes(friend.user._id)}
                          onChange={() => toggleFriend(friend.user._id)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-900">
                          {friend.user.displayName}
                        </span>
                      </label>
                    ))
                  )}
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded text-sm">
                  {error}
                </div>
              )}

              <button
                onClick={handleFindTime}
                disabled={isLoading || selectedFriends.length === 0}
                className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-medium px-4 py-2.5 rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? "Finding times..." : "Find Available Times"}
              </button>
            </div>
          </div>

          {/* Results Panel */}
          <div className="lg:col-span-2 space-y-6">
            {/* Calendar Grid */}
            {!isLoading && slots.length > 0 && (
              <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
                <div className="bg-gradient-to-r from-green-500 to-teal-600 px-6 py-4">
                  <h2 className="text-lg font-bold text-white">
                    Calendar View
                  </h2>
                </div>
                <div className="p-6">
                  <CalendarGrid slots={slots} onSelectSlot={handleCreateEvent} />
                </div>
              </div>
            )}

            {/* Time Slots List */}
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-purple-500 to-pink-600 px-6 py-4">
                <h2 className="text-lg font-bold text-white">
                  Available Time Slots
                </h2>
              </div>

              <div className="p-6">
                {!isLoading && slots.length === 0 && (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-3xl">🔍</span>
                    </div>
                    <p className="text-gray-500 text-lg">
                      Select friends and click "Find Available Times"
                    </p>
                  </div>
                )}

                {isLoading && (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="text-gray-500 mt-4">
                      Checking calendars...
                    </p>
                  </div>
                )}

                {!isLoading && slots.length > 0 && (
                  <div className="space-y-2">
                    {Object.entries(slotsByDay)
                      .sort(([dayA, slotsA], [dayB, slotsB]) => {
                        // Sort by the earliest slot's start time in each day
                        const dateA = new Date(slotsA[0].start);
                        const dateB = new Date(slotsB[0].start);
                        return dateA.getTime() - dateB.getTime();
                      })
                      .map(([day, daySlots]) => {
                      const isExpanded = expandedDays.has(day);
                      return (
                        <div
                          key={day}
                          className="border border-gray-200 rounded-xl overflow-hidden"
                        >
                          {/* Accordion Header */}
                          <button
                            onClick={() => toggleDay(day)}
                            className="w-full px-4 py-4 bg-gradient-to-r from-purple-50 to-pink-50 hover:from-purple-100 hover:to-pink-100 transition-all flex items-center justify-between"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                                {daySlots.length}
                              </div>
                              <div className="text-left">
                                <div className="font-semibold text-gray-900">
                                  {day}
                                </div>
                                <div className="text-xs text-gray-600">
                                  {daySlots.length} available slot{daySlots.length !== 1 ? 's' : ''}
                                </div>
                              </div>
                            </div>
                            <svg
                              className={`w-5 h-5 text-gray-500 transition-transform ${
                                isExpanded ? "rotate-180" : ""
                              }`}
                              fill="none"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path d="M19 9l-7 7-7-7"></path>
                            </svg>
                          </button>

                          {/* Accordion Content */}
                          {isExpanded && (
                            <div className="bg-white divide-y divide-gray-100">
                              {daySlots.map((slot, index) => {
                                const start = new Date(slot.start);
                                const end = new Date(slot.end);

                                return (
                                  <div
                                    key={index}
                                    className="px-4 py-3 hover:bg-gray-50 transition-colors"
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-3">
                                        <div className="w-16 text-sm font-medium text-gray-700">
                                          {start.toLocaleTimeString("en-US", {
                                            hour: "numeric",
                                            minute: "2-digit",
                                            hour12: true,
                                          })}
                                        </div>
                                        <div className="text-sm text-gray-500">-</div>
                                        <div className="w-16 text-sm text-gray-600">
                                          {end.toLocaleTimeString("en-US", {
                                            hour: "numeric",
                                            minute: "2-digit",
                                            hour12: true,
                                          })}
                                        </div>
                                      </div>
                                      <button
                                        onClick={() => handleCreateEvent(slot)}
                                        disabled={isCreating || !title.trim()}
                                        className="px-3 py-1.5 bg-green-500 text-white text-sm font-medium rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                      >
                                        Book
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
