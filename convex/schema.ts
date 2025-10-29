import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    email: v.string(),
    displayName: v.string(),
    timezone: v.string(),
    googleCalendarId: v.string(), // primary calendar ID
    createdAt: v.number(),
  }).index("by_email", ["email"]),

  googleTokens: defineTable({
    userId: v.id("users"),
    accessToken: v.string(), // encrypted
    refreshToken: v.string(), // encrypted
    expiresAt: v.number(), // timestamp in ms
    scopes: v.array(v.string()),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),

  preferences: defineTable({
    userId: v.id("users"),
    workHoursStart: v.string(), // "09:00"
    workHoursEnd: v.string(), // "17:00"
    defaultDurationMin: v.number(), // 60
    bufferMin: v.number(), // 15
    avoidWeekends: v.boolean(),
    defaultCalendarId: v.optional(v.string()),
  }).index("by_user", ["userId"]),

  friends: defineTable({
    userId: v.id("users"),
    friendUserId: v.id("users"),
    permission: v.union(v.literal("busy-only"), v.literal("full-details")),
    status: v.union(v.literal("pending"), v.literal("accepted")),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_friend", ["friendUserId"])
    .index("by_user_status", ["userId", "status"]),

  contacts: defineTable({
    userId: v.id("users"),
    displayName: v.string(),
    email: v.string(),
    googleCalendarId: v.optional(v.string()),
  }).index("by_user_email", ["userId", "email"]),

  proposals: defineTable({
    userId: v.id("users"),
    title: v.string(),
    slots: v.array(
      v.object({
        start: v.string(), // ISO string
        end: v.string(), // ISO string
      })
    ),
    attendees: v.array(v.string()), // email addresses
    status: v.union(
      v.literal("pending"),
      v.literal("accepted"),
      v.literal("rejected"),
      v.literal("expired")
    ),
    selectedSlotIndex: v.optional(v.number()),
    createdAt: v.number(),
    expiresAt: v.number(),
  }).index("by_user_status", ["userId", "status"]),

  agent_threads: defineTable({
    userId: v.id("users"),
    title: v.string(), // auto-generated from first message
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),

  agent_messages: defineTable({
    threadId: v.id("agent_threads"),
    role: v.union(v.literal("user"), v.literal("assistant"), v.literal("system")),
    content: v.string(),
    toolCalls: v.optional(v.any()), // AI SDK tool calls
    createdAt: v.number(),
  }).index("by_thread", ["threadId"]),

  agent_memory: defineTable({
    threadId: v.id("agent_threads"),
    key: v.string(), // e.g., "preferred_meeting_duration", "typical_work_hours"
    value: v.string(), // JSON stringified data
    updatedAt: v.number(),
  })
    .index("by_thread", ["threadId"])
    .index("by_thread_key", ["threadId", "key"]),
});
