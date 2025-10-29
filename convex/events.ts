import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Note: These are placeholder functions for reference
// Actual event operations happen via Google Calendar API
// We could cache events here if needed for performance

export const listEvents = query({
  args: {
    userId: v.id("users"),
    timeMin: v.string(),
    timeMax: v.string(),
  },
  handler: async (ctx, args) => {
    // This would fetch from cache if we implement caching
    // For now, events are fetched directly from Google Calendar API
    return [];
  },
});

// Helper to validate event data
export const validateEventData = mutation({
  args: {
    title: v.string(),
    start: v.string(),
    end: v.string(),
  },
  handler: async (ctx, args) => {
    // Validate that end is after start
    const startDate = new Date(args.start);
    const endDate = new Date(args.end);

    if (endDate <= startDate) {
      throw new Error("End time must be after start time");
    }

    if (!args.title.trim()) {
      throw new Error("Title is required");
    }

    return true;
  },
});
