import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { GoogleCalendarClient } from "@/lib/google-calendar";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(request: Request) {
  try {
    const userId = await requireAuth();
    const { friendUserIds, timeMin, timeMax } = await request.json();

    if (!friendUserIds || !Array.isArray(friendUserIds)) {
      return NextResponse.json(
        { error: "friendUserIds array is required" },
        { status: 400 }
      );
    }

    if (!timeMin || !timeMax) {
      return NextResponse.json(
        { error: "timeMin and timeMax are required" },
        { status: 400 }
      );
    }

    // Get friendship info to check permissions
    const friendships = await convex.query(api.friends.listFriends, { userId });

    const results = [];

    // Add current user's calendar (from ALL calendars)
    try {
      const myCalendar = await GoogleCalendarClient.forUser(userId);
      const myUser = await convex.query(api.users.getCurrentUser, { userId });

      // Get all calendars for current user
      const myCalendarList = await myCalendar.getCalendarList();
      const allMyEvents = [];

      // Fetch events from each calendar
      for (const cal of myCalendarList) {
        if (!cal.id) continue;

        // Debug: log all calendar properties to understand the structure
        console.log(`📋 Calendar: ${cal.summary}`, {
          id: cal.id,
          primary: cal.primary,
          accessRole: cal.accessRole,
          selected: cal.selected,
          backgroundColor: cal.backgroundColor,
        });

        // Include calendars where you are the OWNER
        // Exclude calendars where accessRole is "reader" or "freeBusyReader" (shared WITH you)
        const isOwner = cal.accessRole === "owner";
        const isPrimary = cal.primary === true;

        // If you're the owner, it's YOUR calendar (including School, Work, Personal sub-calendars)
        // If accessRole is "reader" or "freeBusyReader", it's shared WITH you
        if (isOwner || isPrimary) {
          try {
            console.log(`✅ Fetching own calendar: ${cal.id} (${cal.summary})`);
            const calEvents = await myCalendar.listEvents(timeMin, timeMax, cal.id);
            allMyEvents.push(...calEvents);
          } catch (err) {
            console.error(`Error fetching calendar ${cal.id}:`, err);
          }
        } else {
          console.log(`❌ Skipping calendar: ${cal.id} (${cal.summary}) - accessRole: ${cal.accessRole} (not owner)`);
        }
      }

      results.push({
        userId: userId,
        displayName: myUser?.displayName || "Me",
        email: myUser?.email || "",
        permission: "full-details",
        events: allMyEvents.map((event) => ({
          id: event.id,
          title: event.summary || "Untitled",
          start: event.start?.dateTime || event.start?.date,
          end: event.end?.dateTime || event.end?.date,
          location: event.location,
          description: event.description,
          attendees: event.attendees?.map((a) => a.email),
        })),
      });
    } catch (err) {
      console.error("Error fetching own calendar:", err);
    }

    // Fetch events for each friend
    for (const friendUserId of friendUserIds) {
      try {
        // Find friendship to get permission level
        const friendship = friendships.find(
          (f) => f.user._id === friendUserId
        );

        if (!friendship) {
          console.log(`No friendship found for user ${friendUserId}`);
          continue;
        }

        const friendCalendar = await GoogleCalendarClient.forUser(friendUserId);

        // Get all calendars for this friend
        const friendCalendarList = await friendCalendar.getCalendarList();
        const allFriendEvents = [];

        // Fetch events from each calendar
        for (const cal of friendCalendarList) {
          if (!cal.id) continue;

          // Include calendars where they are the OWNER
          // Exclude calendars where accessRole is "reader" or "freeBusyReader" (shared WITH them)
          const isOwner = cal.accessRole === "owner";
          const isPrimary = cal.primary === true;

          // If they're the owner, it's THEIR calendar (including School, Work, Personal sub-calendars)
          // If accessRole is "reader" or "freeBusyReader", it's shared WITH them (exclude)
          if (isOwner || isPrimary) {
            try {
              console.log(`✅ Fetching friend calendar: ${cal.id} (${cal.summary}) for ${friendship.user.displayName}`);
              const calEvents = await friendCalendar.listEvents(timeMin, timeMax, cal.id);
              allFriendEvents.push(...calEvents);
            } catch (err) {
              console.error(`Error fetching calendar ${cal.id} for friend ${friendUserId}:`, err);
            }
          } else {
            console.log(`❌ Skipping friend calendar: ${cal.id} (${cal.summary}) - accessRole: ${cal.accessRole} (not owner)`);
          }
        }

        // Respect permission level
        if (friendship.permission === "busy-only") {
          // Only show busy/free, no details
          results.push({
            userId: friendUserId,
            displayName: friendship.user.displayName,
            email: friendship.user.email,
            permission: "busy-only",
            events: allFriendEvents.map((event) => ({
              id: event.id,
              title: "Busy",
              start: event.start?.dateTime || event.start?.date,
              end: event.end?.dateTime || event.end?.date,
              location: null,
              description: null,
              attendees: null,
            })),
          });
        } else {
          // Full details
          results.push({
            userId: friendUserId,
            displayName: friendship.user.displayName,
            email: friendship.user.email,
            permission: "full-details",
            events: allFriendEvents.map((event) => ({
              id: event.id,
              title: event.summary || "Untitled",
              start: event.start?.dateTime || event.start?.date,
              end: event.end?.dateTime || event.end?.date,
              location: event.location,
              description: event.description,
              attendees: event.attendees?.map((a) => a.email),
            })),
          });
        }
      } catch (err) {
        console.error(`Error fetching calendar for friend ${friendUserId}:`, err);
        // Continue to next friend
      }
    }

    return NextResponse.json({ calendars: results });
  } catch (error) {
    console.error("Error in friends calendar API:", error);
    return NextResponse.json(
      { error: "Failed to fetch friend calendars" },
      { status: 500 }
    );
  }
}
