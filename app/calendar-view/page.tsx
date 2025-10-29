"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { format, startOfWeek, addWeeks, subWeeks } from "date-fns";
import { FriendsCalendarView } from "@/components/friends-calendar-view";

interface Friend {
  friendshipId: string;
  user: {
    _id: string;
    email: string;
    displayName: string;
  };
  permission: "busy-only" | "full-details";
}

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

export default function CalendarViewPage() {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [calendars, setCalendars] = useState<FriendCalendar[]>([]);
  const [currentWeekStart, setCurrentWeekStart] = useState(
    startOfWeek(new Date())
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchFriends();
  }, []);

  useEffect(() => {
    if (selectedFriends.length > 0 || calendars.some(c => c.userId)) {
      fetchCalendars();
    } else {
      // Always show own calendar
      fetchCalendars();
    }
  }, [selectedFriends, currentWeekStart]);

  const fetchFriends = async () => {
    try {
      const response = await fetch("/api/friends");
      const data = await response.json();
      setFriends(data.friends || []);
    } catch (err) {
      console.error("Error fetching friends:", err);
    }
  };

  const fetchCalendars = async () => {
    setIsLoading(true);
    setError("");

    try {
      const weekEnd = addWeeks(currentWeekStart, 1);

      const response = await fetch("/api/calendar/friends", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          friendUserIds: selectedFriends,
          timeMin: currentWeekStart.toISOString(),
          timeMax: weekEnd.toISOString(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch calendars");
      }

      setCalendars(data.calendars || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load calendars");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleFriend = (friendUserId: string) => {
    setSelectedFriends((prev) =>
      prev.includes(friendUserId)
        ? prev.filter((id) => id !== friendUserId)
        : [...prev, friendUserId]
    );
  };

  const goToPreviousWeek = () => {
    setCurrentWeekStart((prev) => subWeeks(prev, 1));
  };

  const goToNextWeek = () => {
    setCurrentWeekStart((prev) => addWeeks(prev, 1));
  };

  const goToToday = () => {
    setCurrentWeekStart(startOfWeek(new Date()));
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
                Friends Calendar View
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                View your calendar alongside your friends
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar - Friend Selector */}
          <div className="lg:col-span-1">
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200 p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">
                Select Friends
              </h2>

              {/* My Calendar - Always shown */}
              <div className="mb-4 pb-4 border-b border-gray-200">
                <div className="flex items-center gap-3 p-2 bg-blue-50 rounded-lg">
                  <div className="w-4 h-4 bg-blue-500 rounded"></div>
                  <div>
                    <div className="text-sm font-semibold text-gray-900">
                      My Calendar
                    </div>
                    <div className="text-xs text-gray-500">Always visible</div>
                  </div>
                </div>
              </div>

              {/* Friends List */}
              <div className="space-y-2">
                {friends.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-4">
                    No friends yet.{" "}
                    <Link
                      href="/friends"
                      className="text-blue-600 hover:underline"
                    >
                      Add friends
                    </Link>
                  </p>
                )}

                {friends.map((friend, index) => {
                  const isSelected = selectedFriends.includes(friend.user._id);
                  const color =
                    COLORS[(index + 1) % COLORS.length]; // +1 to skip first color (used for "Me")

                  return (
                    <label
                      key={friend.friendshipId}
                      className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleFriend(friend.user._id)}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                      <div className={`w-4 h-4 ${color} rounded`}></div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {friend.user.displayName}
                        </div>
                        <div className="text-xs text-gray-500 truncate">
                          {friend.permission === "busy-only"
                            ? "Busy only"
                            : "Full details"}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Main Calendar View */}
          <div className="lg:col-span-3 space-y-4">
            {/* Calendar Controls */}
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    onClick={goToPreviousWeek}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    disabled={isLoading}
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
                      <path d="M15 19l-7-7 7-7"></path>
                    </svg>
                  </button>
                  <button
                    onClick={goToToday}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium disabled:opacity-50"
                    disabled={isLoading}
                  >
                    Today
                  </button>
                  <button
                    onClick={goToNextWeek}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    disabled={isLoading}
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
                      <path d="M9 5l7 7-7 7"></path>
                    </svg>
                  </button>
                </div>

                <div className="text-lg font-bold text-gray-900">
                  {format(currentWeekStart, "MMMM d")} -{" "}
                  {format(addWeeks(currentWeekStart, 1), "MMMM d, yyyy")}
                </div>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded text-sm">
                {error}
              </div>
            )}

            {/* Loading State */}
            {isLoading && (
              <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200 p-12 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-gray-500 mt-4">Loading calendars...</p>
              </div>
            )}

            {/* Calendar Grid */}
            {!isLoading && (
              <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200 p-6">
                <FriendsCalendarView
                  calendars={calendars}
                  currentWeekStart={currentWeekStart}
                />
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

const COLORS = [
  "bg-blue-500",
  "bg-green-500",
  "bg-purple-500",
  "bg-pink-500",
  "bg-yellow-500",
  "bg-indigo-500",
  "bg-red-500",
  "bg-teal-500",
];
