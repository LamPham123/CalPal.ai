import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import { GoogleCalendarClient } from "@/lib/google-calendar";

// GET /api/events?timeMin=...&timeMax=...
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const timeMin = searchParams.get("timeMin");
    const timeMax = searchParams.get("timeMax");

    if (!timeMin || !timeMax) {
      return NextResponse.json(
        { error: "timeMin and timeMax are required" },
        { status: 400 }
      );
    }

    const calendar = await GoogleCalendarClient.forUser(userId);
    const events = await calendar.listEvents(timeMin, timeMax);

    return NextResponse.json({ events });
  } catch (error) {
    console.error("Error fetching events:", error);
    return NextResponse.json(
      { error: "Failed to fetch events" },
      { status: 500 }
    );
  }
}

// POST /api/events (create new event)
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { title, start, end, attendees, location, description } = body;

    // Validate required fields
    if (!title || !start || !end) {
      return NextResponse.json(
        { error: "title, start, and end are required" },
        { status: 400 }
      );
    }

    // Validate that end is after start
    if (new Date(end) <= new Date(start)) {
      return NextResponse.json(
        { error: "End time must be after start time" },
        { status: 400 }
      );
    }

    const calendar = await GoogleCalendarClient.forUser(userId);
    const event = await calendar.createEvent({
      title,
      start,
      end,
      attendees: attendees || [],
      location: location || undefined,
      description: description || undefined,
    });

    return NextResponse.json({ event });
  } catch (error) {
    console.error("Error creating event:", error);
    return NextResponse.json(
      { error: "Failed to create event" },
      { status: 500 }
    );
  }
}
