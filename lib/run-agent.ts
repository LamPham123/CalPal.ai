import { streamText, stepCountIs, tool } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { aiTools } from "./ai-tools";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

// Create OpenAI provider with explicit API key
const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

interface AgentOptions {
  messages: any[];
  model?: string;
  threadId?: string;
  userId: Id<"users">;
  userName?: string;
  userEmail?: string;
  userTimezone?: string;
}

/**
 * Get agent tools bound to a specific user
 */
function getAgentTools(userId: Id<"users">) {
  return {
    listFriends: tool({
      description: aiTools.listFriends.description,
      inputSchema: aiTools.listFriends.inputSchema,
      execute: async (args: any) => {
        return await aiTools.listFriends.execute(args, userId);
      },
    }),
    listEvents: tool({
      description: aiTools.listEvents.description,
      inputSchema: aiTools.listEvents.inputSchema,
      execute: async (args: any) => {
        return await aiTools.listEvents.execute(args, userId);
      },
    }),
    createEvent: tool({
      description: aiTools.createEvent.description,
      inputSchema: aiTools.createEvent.inputSchema,
      execute: async (args: any) => {
        return await aiTools.createEvent.execute(args, userId);
      },
    }),
    updateEvent: tool({
      description: aiTools.updateEvent.description,
      inputSchema: aiTools.updateEvent.inputSchema,
      execute: async (args: any) => {
        return await aiTools.updateEvent.execute(args, userId);
      },
    }),
    deleteEvent: tool({
      description: aiTools.deleteEvent.description,
      inputSchema: aiTools.deleteEvent.inputSchema,
      execute: async (args: any) => {
        return await aiTools.deleteEvent.execute(args, userId);
      },
    }),
    suggestSlots: tool({
      description: aiTools.suggestSlots.description,
      inputSchema: aiTools.suggestSlots.inputSchema,
      execute: async (args: any) => {
        return await aiTools.suggestSlots.execute(args, userId);
      },
    }),
    freeBusy: tool({
      description: aiTools.freeBusy.description,
      inputSchema: aiTools.freeBusy.inputSchema,
      execute: async (args: any) => {
        return await aiTools.freeBusy.execute(args, userId);
      },
    }),
  };
}

/**
 * Get the system prompt for the calendar agent
 */
async function getSystemPrompt(
  userId: Id<"users">,
  threadId?: string
): Promise<string> {
  // Get user info for context
  const user = await convex.query(api.users.getCurrentUser, { userId });

  if (!user) {
    throw new Error("User not found");
  }

  // Get current date/time in user's timezone
  const now = new Date();
  const currentDate = now.toLocaleDateString("en-US", {
    timeZone: user.timezone,
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const currentTime = now.toLocaleTimeString("en-US", {
    timeZone: user.timezone,
    hour: "2-digit",
    minute: "2-digit",
  });

  let systemPrompt = `You are a calendar scheduling assistant for CalPal AI.

**Current Date & Time:**
- Today is: ${currentDate}
- Current time: ${currentTime}

**User Context:**
- Name: ${user.displayName}
- Email: ${user.email}
- Timezone: ${user.timezone}

**Core Capabilities:**
- Manage Google Calendar events (create, update, delete, list)
- Find optimal meeting times for groups
- Check availability across friends' calendars
- Understand natural language date/time references

**Guidelines:**
- Be concise, friendly, and helpful
- Always confirm before creating or deleting events
- When finding group times, suggest the top 3-5 best options
- IMPORTANT: All times are in ${user.timezone} timezone - never mention UTC in your responses
- When telling the user about event times, always say the time in ${user.timezone}
- Default meeting duration: 60 minutes unless specified
- For scheduling with friends, use the suggestSlots tool

**Available Tools:**
- listFriends: Get list of user's friends with their names and user IDs (use this FIRST when user mentions friends)
- listEvents: View calendar events in a time range
- createEvent: Create a new calendar event
- updateEvent: Update an existing event
- deleteEvent: Delete an event
- suggestSlots: Find best meeting times for groups (requires friend user IDs from listFriends)
- freeBusy: Check free/busy status for friends (requires friend user IDs from listFriends)

**Important Workflow for Scheduling with Friends:**
1. When user mentions friend names, FIRST call listFriends to get their user IDs
2. Then use those user IDs in suggestSlots or freeBusy tools
3. Always format dates/times clearly in your responses
4. Provide human-readable summaries of tool results`;

  // Inject thread ID and agent memory if threadId is provided
  if (threadId) {
    systemPrompt += `\n\n<current-context>\nCurrent agent_thread_id: ${threadId}\nUser ID: ${userId}\n</current-context>`;

    // Inject agent memory (all todos) as pure data
    try {
      const memories = await convex.query(api.agent_memory.getMemories, {
        threadId: threadId as Id<"agent_threads">,
      });

      if (memories && memories.length > 0) {
        // Just inject the memory data, no instructions here
        systemPrompt += `\n\n<agent-memory>${JSON.stringify(memories, null, 2)}</agent-memory>`;
      }
    } catch (error) {
      console.error(
        "Failed to fetch agent memory for prompt injection:",
        error
      );
      // Continue without memory if fetch fails
    }
  }

  return systemPrompt;
}

/**
 * Core function for running AI agents with streaming
 * Returns a stream that can be used directly for streaming to UI
 */
export async function runAgent({
  messages,
  model = "gpt-4o",
  threadId,
  userId,
}: AgentOptions) {
  // Validate required parameters
  if (!userId) {
    throw new Error("userId is required for runAgent");
  }

  console.log(
    `🤖 Agent Service - Starting calendar agent for user ${userId} with model ${model}`
  );

  // Get the system prompt with user context and memory
  const systemPrompt = await getSystemPrompt(userId, threadId);

  // Get user-scoped tools
  const tools = getAgentTools(userId);

  // Check API key
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not set in environment variables");
  }

  // Log what we're sending
  console.log("📨 Sending to OpenAI:", {
    model,
    messageCount: messages.length,
    hasSystemPrompt: !!systemPrompt,
    toolCount: Object.keys(tools).length,
    apiKeyPresent: !!process.env.OPENAI_API_KEY,
    apiKeyPrefix: process.env.OPENAI_API_KEY.substring(0, 10) + "...",
  });

  // Stream the response
  try {
    console.log("🔄 Calling streamText...");

    // Test with a simple prompt first to verify API key works
    console.log("🧪 Testing OpenAI API key with simple call...");

    const result = streamText({
      model: openai(model),
      messages: messages.length > 0 ? messages : [{ role: 'user', content: 'Hello' }],
      system: systemPrompt,
      tools,
      stopWhen: stepCountIs(100), // Allow up to 100 steps for tool execution
      onStepFinish: async ({ toolCalls, toolResults, text }) => {
        console.log("🔧 Agent Service - Step finished:", {
          toolCalls,
          toolResults,
          hasText: !!text,
        });
      },
      onChunk: async ({ chunk }) => {

      // Log tool calls for debugging
      if (chunk.type === "tool-call") {
        console.log("🔧 Agent Service - Tool call:", {
          name: chunk.toolName,
          userId,
          threadId,
        });
      }
    },
    onFinish: async ({ text, usage, toolCalls, toolResults, finishReason }) => {
      // Log the final response
      console.log(`💬 Agent Service - Final Response:`, {
        userId,
        threadId,
        textLength: text?.length || 0,
        toolCallsCount: toolCalls?.length || 0,
        toolResultsCount: toolResults?.length || 0,
        finishReason,
        tokens: usage,
      });
    },
  });

    console.log("✅ streamText returned successfully");
    return result;
  } catch (error) {
    console.error("❌ streamText error in runAgent:", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      userId,
      threadId,
      model,
    });
    throw error;
  }
}

// Re-export getSystemPrompt for external use
export { getSystemPrompt };
