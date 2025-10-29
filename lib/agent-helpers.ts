import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

/**
 * Get or create an agent thread for a user
 * For CalPal, we use one thread per user (not multiple threads)
 * Returns the active thread or creates a new one
 */
export async function getOrCreateAgentThread(params: {
  userId: Id<"users">;
  title?: string;
}) {
  const { userId, title } = params;

  // Try to find ANY existing thread for this user
  // Order by most recently updated
  const existingThreads = await convex.query(api.agent_threads.listThreads, {
    userId,
  });

  if (existingThreads && existingThreads.length > 0) {
    const thread = existingThreads[0]; // Most recent thread
    console.log(`♻️ Using existing thread: ${thread._id}`);
    return thread;
  }

  // Create a new thread for this user
  const threadId = await convex.mutation(api.agent_threads.createThread, {
    userId,
    title: title || "AI Calendar Conversation",
  });

  console.log(`✨ Created new thread: ${threadId}`);

  // Fetch the created thread to return full object
  const threads = await convex.query(api.agent_threads.listThreads, {
    userId,
  });
  const newThread = threads.find((t) => t._id === threadId);

  return newThread || { _id: threadId, userId, title, createdAt: Date.now(), updatedAt: Date.now() };
}

/**
 * Get agent memory for a thread
 * Returns stored context/todos for the conversation
 */
export async function getAgentMemory(threadId: Id<"agent_threads">) {
  try {
    const memories = await convex.query(api.agent_memory.getMemories, {
      threadId,
    });

    if (memories && memories.length > 0) {
      console.log(`📝 Found ${memories.length} memory items for thread ${threadId}`);
      return memories;
    }

    return null;
  } catch (error) {
    console.error("Failed to get agent memory:", error);
    return null;
  }
}

/**
 * Save a message to a thread
 */
export async function saveMessage(params: {
  threadId: Id<"agent_threads">;
  role: "user" | "assistant" | "system";
  content: string;
  toolCalls?: any;
}) {
  const { threadId, role, content, toolCalls } = params;

  try {
    const messageId = await convex.mutation(api.agent_messages.addMessage, {
      threadId,
      role,
      content,
      toolCalls,
    });

    console.log(`💾 Saved ${role} message to thread ${threadId}`);
    return messageId;
  } catch (error) {
    console.error("Failed to save message:", error);
    throw error;
  }
}
