import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Create a new agent thread
export const createThread = mutation({
  args: {
    userId: v.id("users"),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    const threadId = await ctx.db.insert("agent_threads", {
      userId: args.userId,
      title: args.title,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    return threadId;
  },
});

// Get all threads for a user
export const listThreads = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const threads = await ctx.db
      .query("agent_threads")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();
    return threads;
  },
});

// Get a single thread
export const getThread = query({
  args: { threadId: v.id("agent_threads") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.threadId);
  },
});

// Update thread title
export const updateThread = mutation({
  args: {
    threadId: v.id("agent_threads"),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.threadId, {
      title: args.title,
      updatedAt: Date.now(),
    });
  },
});

// Delete a thread and all its messages
export const deleteThread = mutation({
  args: { threadId: v.id("agent_threads") },
  handler: async (ctx, args) => {
    // Delete all messages in thread
    const messages = await ctx.db
      .query("agent_messages")
      .withIndex("by_thread", (q) => q.eq("threadId", args.threadId))
      .collect();

    for (const message of messages) {
      await ctx.db.delete(message._id);
    }

    // Delete all memory in thread
    const memories = await ctx.db
      .query("agent_memory")
      .withIndex("by_thread", (q) => q.eq("threadId", args.threadId))
      .collect();

    for (const memory of memories) {
      await ctx.db.delete(memory._id);
    }

    // Delete the thread
    await ctx.db.delete(args.threadId);
  },
});
