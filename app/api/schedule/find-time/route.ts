import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import { GoogleCalendarClient } from "@/lib/google-calendar";
import { findBestSlots } from "@/lib/scheduling";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

// POST /api/schedule/find-time
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      friendUserIds, // Array of friend user IDs
      windowStart, // ISO string
      windowEnd, // ISO string
      durationMin, // number
      preferences, // SchedulingPreferences object
    } = body;

    // Validate
    if (!friendUserIds || !Array.isArray(friendUserIds)) {
      return NextResponse.json(
        { error: "friendUserIds array is required" },
        { status: 400 }
      );
    }

    if (!windowStart || !windowEnd) {
      return NextResponse.json(
        { error: "windowStart and windowEnd are required" },
        { status: 400 }
      );
    }

    if (!durationMin || durationMin < 15 || durationMin > 480) {
      return NextResponse.json(
        { error: "durationMin must be between 15 and 480 minutes" },
        { status: 400 }
      );
    }

    // Get calendar clients for user and all friends
    const allUserIds = [userId, ...friendUserIds];
    const calendars: GoogleCalendarClient[] = [];

    for (const uid of allUserIds) {
      try {
        const calendar = await GoogleCalendarClient.forUser(uid as Id<"users">);
        calendars.push(calendar);
      } catch (error) {
        console.error(`Failed to get calendar for user ${uid}:`, error);
        return NextResponse.json(
          { error: `Failed to access calendar for one or more users` },
          { status: 500 }
        );
      }
    }

    // Find best slots
    const slots = await findBestSlots(
      allUserIds,
      calendars,
      new Date(windowStart),
      new Date(windowEnd),
      durationMin,
      preferences || {}
    );

    // Get user details for display
    const users = await Promise.all(
      allUserIds.map((uid) =>
        convex.query(api.users.getCurrentUser, { userId: uid as Id<"users"> })
      )
    );

    return NextResponse.json({
      slots,
      participants: users.filter((u) => u !== null),
      windowStart,
      windowEnd,
      durationMin,
    });
  } catch (error) {
    console.error("Error finding time slots:", error);
    return NextResponse.json(
      { error: "Failed to find available time slots" },
      { status: 500 }
    );
  }
}
