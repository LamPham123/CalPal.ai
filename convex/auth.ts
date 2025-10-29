import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Store Google OAuth tokens (should be encrypted before passing to this function)
export const storeTokens = mutation({
  args: {
    userId: v.id("users"),
    accessToken: v.string(),
    refreshToken: v.string(),
    expiresAt: v.number(),
    scopes: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if tokens already exist for this user
    const existing = await ctx.db
      .query("googleTokens")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (existing) {
      // Update existing tokens
      await ctx.db.patch(existing._id, {
        accessToken: args.accessToken,
        refreshToken: args.refreshToken,
        expiresAt: args.expiresAt,
        scopes: args.scopes,
        updatedAt: Date.now(),
      });
      return existing._id;
    }

    // Create new token record
    return await ctx.db.insert("googleTokens", {
      userId: args.userId,
      accessToken: args.accessToken,
      refreshToken: args.refreshToken,
      expiresAt: args.expiresAt,
      scopes: args.scopes,
      updatedAt: Date.now(),
    });
  },
});

export const getTokens = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("googleTokens")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();
  },
});

export const updateAccessToken = mutation({
  args: {
    userId: v.id("users"),
    accessToken: v.string(),
    expiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    const tokens = await ctx.db
      .query("googleTokens")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (!tokens) {
      throw new Error("No tokens found for user");
    }

    await ctx.db.patch(tokens._id, {
      accessToken: args.accessToken,
      expiresAt: args.expiresAt,
      updatedAt: Date.now(),
    });
  },
});
