import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import { GoogleCalendarClient } from "@/lib/google-calendar";

// PATCH /api/events/[id] (update event)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: eventId } = await params;
    const body = await request.json();
    const { title, start, end, attendees, location, description } = body;

    // Validate that if both start and end are provided, end is after start
    if (start && end && new Date(end) <= new Date(start)) {
      return NextResponse.json(
        { error: "End time must be after start time" },
        { status: 400 }
      );
    }

    const calendar = await GoogleCalendarClient.forUser(userId);
    const event = await calendar.updateEvent(eventId, {
      title,
      start,
      end,
      attendees,
      location,
      description,
    });

    return NextResponse.json({ event });
  } catch (error) {
    console.error("Error updating event:", error);
    return NextResponse.json(
      { error: "Failed to update event" },
      { status: 500 }
    );
  }
}

// DELETE /api/events/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: eventId } = await params;

    const calendar = await GoogleCalendarClient.forUser(userId);
    await calendar.deleteEvent(eventId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting event:", error);
    return NextResponse.json(
      { error: "Failed to delete event" },
      { status: 500 }
    );
  }
}
