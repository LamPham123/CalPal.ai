import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const getOrCreateUser = mutation({
  args: {
    email: v.string(),
    displayName: v.string(),
    googleCalendarId: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if user already exists
    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (existing) {
      return existing._id;
    }

    // Create new user
    const userId = await ctx.db.insert("users", {
      email: args.email,
      displayName: args.displayName,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "America/New_York",
      googleCalendarId: args.googleCalendarId,
      createdAt: Date.now(),
    });

    // Create default preferences
    await ctx.db.insert("preferences", {
      userId,
      workHoursStart: "09:00",
      workHoursEnd: "17:00",
      defaultDurationMin: 60,
      bufferMin: 15,
      avoidWeekends: false,
    });

    return userId;
  },
});

export const getUserByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
  },
});

export const getCurrentUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});

export const updateTimezone = mutation({
  args: {
    userId: v.id("users"),
    timezone: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, {
      timezone: args.timezone,
    });
    return { success: true };
  },
});
