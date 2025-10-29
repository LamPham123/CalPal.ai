import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Add a message to a thread
export const addMessage = mutation({
  args: {
    threadId: v.id("agent_threads"),
    role: v.union(v.literal("user"), v.literal("assistant"), v.literal("system")),
    content: v.string(),
    toolCalls: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const messageId = await ctx.db.insert("agent_messages", {
      threadId: args.threadId,
      role: args.role,
      content: args.content,
      toolCalls: args.toolCalls,
      createdAt: Date.now(),
    });

    // Update thread's updatedAt timestamp
    await ctx.db.patch(args.threadId, {
      updatedAt: Date.now(),
    });

    return messageId;
  },
});

// Get messages for a thread
export const getMessages = query({
  args: {
    threadId: v.id("agent_threads"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const query = ctx.db
      .query("agent_messages")
      .withIndex("by_thread", (q) => q.eq("threadId", args.threadId))
      .order("asc");

    const messages = args.limit
      ? await query.take(args.limit)
      : await query.collect();

    return messages;
  },
});

// Get recent messages for context (last N messages)
export const getRecentMessages = query({
  args: {
    threadId: v.id("agent_threads"),
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    // Get all messages ordered by creation time
    const allMessages = await ctx.db
      .query("agent_messages")
      .withIndex("by_thread", (q) => q.eq("threadId", args.threadId))
      .order("asc")
      .collect();

    // Return last N messages
    return allMessages.slice(-args.limit);
  },
});

// Delete a message
export const deleteMessage = mutation({
  args: { messageId: v.id("agent_messages") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.messageId);
  },
});
