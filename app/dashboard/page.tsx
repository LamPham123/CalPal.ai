import { requireAuth } from "@/lib/auth";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { GoogleCalendarClient } from "@/lib/google-calendar";
import { startOfWeek, endOfWeek } from "date-fns";
import { DashboardClient } from "@/components/dashboard-client";
import Link from "next/link";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string }>;
}) {
  const userId = await requireAuth();
  const params = await searchParams;
  const successMessage = params.success;

  // Get user info from Convex
  const user = await convex.query(api.users.getCurrentUser, { userId });

  if (!user) {
    return <div>User not found</div>;
  }

  // Get this week's events
  let events = [];
  let error = null;

  try {
    const calendar = await GoogleCalendarClient.forUser(userId);
    const weekStart = startOfWeek(new Date()).toISOString();
    const weekEnd = endOfWeek(new Date()).toISOString();

    events = await calendar.listEvents(weekStart, weekEnd);
  } catch (err) {
    console.error("Error fetching events:", err);
    error = "Failed to load calendar events";
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                CalPal AI
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Welcome back, {user.displayName}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/ai-chat"
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-teal-600 text-white font-medium rounded-lg hover:from-green-600 hover:to-teal-700 transition-all shadow-md"
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
                  <path d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path>
                </svg>
                AI Chat
              </Link>
              <Link
                href="/friends"
                className="flex items-center gap-2 px-4 py-2 text-gray-700 font-medium rounded-lg hover:bg-gray-100 transition-all"
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
                  <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
                </svg>
                Friends
              </Link>
              <Link
                href="/calendar-view"
                className="flex items-center gap-2 px-4 py-2 text-gray-700 font-medium rounded-lg hover:bg-gray-100 transition-all"
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
                  <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                </svg>
                Calendar View
              </Link>
              <Link
                href="/find-time"
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-600 text-white font-medium rounded-lg hover:from-purple-600 hover:to-pink-700 transition-all shadow-md"
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
                  <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                </svg>
                Find Time
              </Link>
              <Link
                href="/dashboard/new"
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-medium rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all shadow-md"
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
                  <path d="M12 4v16m8-8H4"></path>
                </svg>
                New Event
              </Link>
              <a
                href="/api/auth/logout"
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Logout
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Success Banner */}
        {successMessage && (
          <div className="mb-6 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white font-bold">
                ✓
              </div>
              <div>
                <p className="font-semibold text-green-900">{successMessage}</p>
              </div>
            </div>
          </div>
        )}

        {/* Connection Banner */}
        {!successMessage && (
          <div className="mb-6 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white font-bold">
                ✓
              </div>
              <div>
                <p className="font-semibold text-green-900">
                  Calendar Connected!
                </p>
                <p className="text-sm text-green-700 mt-1">
                  Your Google Calendar is securely connected. Tokens are encrypted
                  and stored safely.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Events Card */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-500 to-indigo-600 px-6 py-5">
            <h2 className="text-2xl font-bold text-white">This Week's Events</h2>
            <p className="text-blue-100 text-sm mt-1">
              {events.length} event{events.length !== 1 ? "s" : ""} scheduled
            </p>
          </div>

          <div className="p-6">
            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded mb-4">
                <p className="font-medium">Error loading events</p>
                <p className="text-sm mt-1">{error}</p>
              </div>
            )}

            {events.length === 0 && !error && (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">📅</span>
                </div>
                <p className="text-gray-500 text-lg">No events scheduled this week</p>
                <p className="text-gray-400 text-sm mt-1">
                  Your calendar is clear!
                </p>
              </div>
            )}

            {events.length > 0 && (
              <DashboardClient events={events} userName={user.displayName} />
            )}
          </div>
        </div>

        {/* Account Info Card */}
        <div className="mt-6 bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-purple-500 to-pink-600 px-6 py-4">
            <h3 className="font-semibold text-white text-lg">
              Account Information
            </h3>
          </div>
          <div className="p-6">
            <dl className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Email
                </dt>
                <dd className="mt-1 text-sm font-semibold text-gray-900 truncate">
                  {user.email}
                </dd>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Timezone
                </dt>
                <dd className="mt-1 text-sm font-semibold text-gray-900">
                  {user.timezone}
                </dd>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Calendar
                </dt>
                <dd className="mt-1 text-sm font-semibold text-gray-900 truncate">
                  {user.googleCalendarId}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </main>
    </div>
  );
}
