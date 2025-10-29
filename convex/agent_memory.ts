import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Store or update a memory value
export const setMemory = mutation({
  args: {
    threadId: v.id("agent_threads"),
    key: v.string(),
    value: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if memory already exists
    const existing = await ctx.db
      .query("agent_memory")
      .withIndex("by_thread_key", (q) =>
        q.eq("threadId", args.threadId).eq("key", args.key)
      )
      .first();

    if (existing) {
      // Update existing memory
      await ctx.db.patch(existing._id, {
        value: args.value,
        updatedAt: Date.now(),
      });
      return existing._id;
    } else {
      // Create new memory
      return await ctx.db.insert("agent_memory", {
        threadId: args.threadId,
        key: args.key,
        value: args.value,
        updatedAt: Date.now(),
      });
    }
  },
});

// Get a specific memory value
export const getMemory = query({
  args: {
    threadId: v.id("agent_threads"),
    key: v.string(),
  },
  handler: async (ctx, args) => {
    const memory = await ctx.db
      .query("agent_memory")
      .withIndex("by_thread_key", (q) =>
        q.eq("threadId", args.threadId).eq("key", args.key)
      )
      .first();

    return memory?.value;
  },
});

// Get all memory for a thread
export const getAllMemory = query({
  args: { threadId: v.id("agent_threads") },
  handler: async (ctx, args) => {
    const memories = await ctx.db
      .query("agent_memory")
      .withIndex("by_thread", (q) => q.eq("threadId", args.threadId))
      .collect();

    // Return as a key-value object
    const memoryMap: Record<string, string> = {};
    memories.forEach((memory) => {
      memoryMap[memory.key] = memory.value;
    });

    return memoryMap;
  },
});

// Get memories as an array (for AI context)
export const getMemories = query({
  args: { threadId: v.id("agent_threads") },
  handler: async (ctx, args) => {
    const memories = await ctx.db
      .query("agent_memory")
      .withIndex("by_thread", (q) => q.eq("threadId", args.threadId))
      .collect();

    return memories;
  },
});

// Delete a memory
export const deleteMemory = mutation({
  args: {
    threadId: v.id("agent_threads"),
    key: v.string(),
  },
  handler: async (ctx, args) => {
    const memory = await ctx.db
      .query("agent_memory")
      .withIndex("by_thread_key", (q) =>
        q.eq("threadId", args.threadId).eq("key", args.key)
      )
      .first();

    if (memory) {
      await ctx.db.delete(memory._id);
    }
  },
});
