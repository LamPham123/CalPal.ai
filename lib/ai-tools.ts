import { GoogleCalendarClient } from "./google-calendar";
import { findBestSlots, SchedulingPreferences } from "./scheduling";
import { Id } from "@/convex/_generated/dataModel";
import { z } from "zod";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

/**
 * AI Tool: List friends
 */
export const listFriendsTool = {
  description:
    "List all the user's friends. Use this to get friend names and IDs when the user mentions scheduling with friends. Returns friend information including user IDs needed for other tools.",
  inputSchema: z.object({}),
  execute: async (_args: {}, userId: Id<"users">) => {
    const friends = await convex.query(api.friends.listFriends, { userId });

    return {
      success: true,
      friends: friends.map((friend) => ({
        userId: friend.user?._id,
        name: friend.user?.displayName,
        email: friend.user?.email,
      })),
    };
  },
};

/**
 * AI Tool: List events from user's calendar
 */
export const listEventsTool = {
  description:
    "List calendar events for the user within a specific time range. Use this to answer questions about their schedule.",
  inputSchema: z.object({
    timeMin: z.string().describe("Start time in ISO 8601 format"),
    timeMax: z.string().describe("End time in ISO 8601 format"),
  }),
  execute: async (
    args: { timeMin: string; timeMax: string },
    userId: Id<"users">
  ) => {
    const calendar = await GoogleCalendarClient.forUser(userId);
    const events = await calendar.listEvents(args.timeMin, args.timeMax);

    return {
      success: true,
      events: events.map((event) => ({
        id: event.id,
        title: event.summary,
        start: event.start?.dateTime || event.start?.date,
        end: event.end?.dateTime || event.end?.date,
        location: event.location,
        attendees: event.attendees?.map((a) => a.email),
      })),
    };
  },
};

/**
 * AI Tool: Check free/busy status for multiple calendars
 */
export const freeBusyTool = {
  description:
    "Check free/busy information for one or more friends' calendars. Returns busy time periods.",
  inputSchema: z.object({
    friendUserIds: z
      .array(z.string())
      .describe("Array of friend user IDs to check availability for"),
    startTime: z.string().describe("Start time in ISO 8601 format"),
    endTime: z.string().describe("End time in ISO 8601 format"),
  }),
  execute: async (
    args: { friendUserIds: string[]; startTime: string; endTime: string },
    userId: Id<"users">
  ) => {
    const busyPeriods: Record<string, any[]> = {};

    for (const friendUserId of args.friendUserIds) {
      const calendar = await GoogleCalendarClient.forUser(
        friendUserId as Id<"users">
      );
      const calendars = await calendar.getCalendarList();
      const calendarIds = calendars
        .filter((cal) => cal.primary || cal.accessRole === "owner")
        .map((cal) => cal.id!);

      const freeBusy = await calendar.getFreeBusy(
        calendarIds,
        args.startTime,
        args.endTime
      );

      const busy: any[] = [];
      if (freeBusy.calendars) {
        for (const calId in freeBusy.calendars) {
          const calData = freeBusy.calendars[calId];
          if (calData.busy) {
            busy.push(...calData.busy);
          }
        }
      }

      busyPeriods[friendUserId] = busy;
    }

    return {
      success: true,
      busyPeriods,
    };
  },
};

/**
 * AI Tool: Create a calendar event
 */
export const createEventTool = {
  description:
    "Create a new calendar event. Use this when the user wants to schedule something.",
  inputSchema: z.object({
    title: z.string().describe("Event title/summary"),
    startTime: z.string().describe("Start time in ISO 8601 format"),
    endTime: z.string().describe("End time in ISO 8601 format"),
    attendees: z
      .array(z.string())
      .optional()
      .describe("Array of attendee email addresses"),
    location: z.string().optional().describe("Event location"),
    description: z.string().optional().describe("Event description"),
  }),
  execute: async (
    args: {
      title: string;
      startTime: string;
      endTime: string;
      attendees?: string[];
      location?: string;
      description?: string;
    },
    userId: Id<"users">
  ) => {
    console.log("🔧 createEvent tool - Starting execution", {
      userId,
      title: args.title,
      startTime: args.startTime,
      endTime: args.endTime,
      hasAttendees: !!args.attendees,
      attendeesCount: args.attendees?.length,
    });

    try {
      const calendar = await GoogleCalendarClient.forUser(userId);
      console.log("✅ createEvent tool - Got calendar client");

      const event = await calendar.createEvent({
        title: args.title,
        start: args.startTime,
        end: args.endTime,
        attendees: args.attendees,
        location: args.location,
        description: args.description,
      });

      console.log("✅ createEvent tool - Event created successfully", {
        eventId: event.id,
        htmlLink: event.htmlLink,
      });

      return {
        success: true,
        event: {
          id: event.id,
          title: event.summary,
          start: event.start?.dateTime || event.start?.date,
          end: event.end?.dateTime || event.end?.date,
          htmlLink: event.htmlLink,
        },
      };
    } catch (error) {
      console.error("❌ createEvent tool - Error creating event", {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  },
};

/**
 * AI Tool: Update an existing event
 */
export const updateEventTool = {
  description: "Update an existing calendar event by ID",
  inputSchema: z.object({
    eventId: z.string().describe("The ID of the event to update"),
    title: z.string().optional().describe("New event title"),
    startTime: z.string().optional().describe("New start time in ISO 8601 format"),
    endTime: z.string().optional().describe("New end time in ISO 8601 format"),
    attendees: z
      .array(z.string())
      .optional()
      .describe("New array of attendee emails"),
    location: z.string().optional().describe("New location"),
    description: z.string().optional().describe("New description"),
  }),
  execute: async (
    args: {
      eventId: string;
      title?: string;
      startTime?: string;
      endTime?: string;
      attendees?: string[];
      location?: string;
      description?: string;
    },
    userId: Id<"users">
  ) => {
    const calendar = await GoogleCalendarClient.forUser(userId);
    const event = await calendar.updateEvent(args.eventId, {
      title: args.title,
      start: args.startTime,
      end: args.endTime,
      attendees: args.attendees,
      location: args.location,
      description: args.description,
    });

    return {
      success: true,
      event: {
        id: event.id,
        title: event.summary,
        start: event.start?.dateTime || event.start?.date,
        end: event.end?.dateTime || event.end?.date,
      },
    };
  },
};

/**
 * AI Tool: Delete an event
 */
export const deleteEventTool = {
  description: "Delete a calendar event by ID",
  inputSchema: z.object({
    eventId: z.string().describe("The ID of the event to delete"),
  }),
  execute: async (args: { eventId: string }, userId: Id<"users">) => {
    const calendar = await GoogleCalendarClient.forUser(userId);
    await calendar.deleteEvent(args.eventId);

    return {
      success: true,
      message: "Event deleted successfully",
    };
  },
};

/**
 * AI Tool: Suggest best meeting slots for group scheduling
 */
export const suggestSlotsTool = {
  description:
    "Find the best available time slots when scheduling with multiple people. Returns top available slots when everyone is free.",
  inputSchema: z.object({
    friendUserIds: z
      .array(z.string())
      .describe("Array of friend user IDs to schedule with"),
    windowStart: z
      .string()
      .describe("Start of time window to search (ISO 8601)"),
    windowEnd: z.string().describe("End of time window to search (ISO 8601)"),
    durationMin: z.number().describe("Meeting duration in minutes"),
    preferences: z
      .object({
        workHoursStart: z.string().optional().describe('Work hours start (e.g., "09:00")'),
        workHoursEnd: z.string().optional().describe('Work hours end (e.g., "17:00")'),
        avoidWeekends: z.boolean().optional().describe("Avoid weekend slots"),
      })
      .optional()
      .describe("Scheduling preferences"),
  }),
  execute: async (
    args: {
      friendUserIds: string[];
      windowStart: string;
      windowEnd: string;
      durationMin: number;
      preferences?: {
        workHoursStart?: string;
        workHoursEnd?: string;
        avoidWeekends?: boolean;
      };
    },
    userId: Id<"users">
  ) => {
    // Include the current user in the scheduling
    const allUserIds = [userId, ...args.friendUserIds.map((id) => id as Id<"users">)];

    // Create calendar clients for all users
    const calendars = await Promise.all(
      allUserIds.map((uid) => GoogleCalendarClient.forUser(uid))
    );

    const windowStart = new Date(args.windowStart);
    const windowEnd = new Date(args.windowEnd);

    const preferences: SchedulingPreferences = {
      workHoursStart: args.preferences?.workHoursStart,
      workHoursEnd: args.preferences?.workHoursEnd,
      avoidWeekends: args.preferences?.avoidWeekends,
    };

    const slots = await findBestSlots(
      allUserIds,
      calendars,
      windowStart,
      windowEnd,
      args.durationMin,
      preferences
    );

    // Return top 5 slots
    return {
      success: true,
      slots: slots.slice(0, 5).map((slot) => ({
        start: slot.start,
        end: slot.end,
      })),
      totalFound: slots.length,
    };
  },
};

/**
 * Export all tools as a map
 */
export const aiTools = {
  listFriends: listFriendsTool,
  listEvents: listEventsTool,
  freeBusy: freeBusyTool,
  createEvent: createEventTool,
  updateEvent: updateEventTool,
  deleteEvent: deleteEventTool,
  suggestSlots: suggestSlotsTool,
};
