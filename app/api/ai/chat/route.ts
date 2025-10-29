import { NextRequest } from "next/server";
import {
  createIdGenerator,
  convertToModelMessages,
  type UIMessage,
} from "ai";
import { getUserId } from "@/lib/auth";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  getOrCreateAgentThread,
  saveMessage,
} from "@/lib/agent-helpers";
import { runAgent } from "@/lib/run-agent";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(req: NextRequest) {
  try {
    // Get authenticated user
    const userId = await getUserId();
    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Get the full request body - AI SDK v5 sends a wrapped format
    const body = await req.json();

    // Log the actual request for debugging
    console.log(`💬 AI Chat API - Raw request body:`, {
      hasMessages: !!body.messages,
      hasId: !!body.id,
      bodyKeys: Object.keys(body),
      threadId: body.threadId,
      userId,
    });

    // Extract values from AI SDK format
    // AI SDK v5 sends: { id, messages, trigger, ...customBodyParams }
    const messages: UIMessage[] = body.messages || [];
    const threadId = body.threadId;

    // Validate required fields
    if (!messages || messages.length === 0) {
      console.error("No messages in request");
      return new Response(JSON.stringify({ error: "messages is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const lastMessage = messages[messages.length - 1];
    console.log(`💬 AI Chat API - Parsed request:`, {
      userId,
      threadId: threadId,
      messageCount: messages.length,
      lastMessageRole: lastMessage?.role,
      lastMessageParts: lastMessage?.parts?.length || 0,
    });

    // Get or create thread if not provided
    let actualThreadId = threadId as Id<"agent_threads"> | undefined;
    if (!actualThreadId) {
      const thread = await getOrCreateAgentThread({
        userId,
        title: `AI Calendar Chat - ${new Date().toLocaleDateString()}`,
      });
      actualThreadId = thread._id;
    }

    // Convert UI messages to model messages, then use the centralized agent service
    const result = await runAgent({
      messages: convertToModelMessages(messages),
      model: "gpt-4o", // Default model
      threadId: actualThreadId,
      userId,
    });

    // Create consistent server-side ID generator
    const messageIdGenerator = createIdGenerator({
      prefix: "msg",
      size: 16,
    });

    // Return the stream with server-side message persistence
    return result.toUIMessageStreamResponse({
      sendSources: true,
      sendReasoning: true,
      originalMessages: messages,
      generateMessageId: messageIdGenerator,
      onError: (error: any) => {
        console.error(`❌ AI Chat API - Stream error:`, {
          errorType: error?.constructor?.name,
          message: error instanceof Error ? error.message : String(error),
          userId,
          threadId: actualThreadId,
        });

        return "An error occurred while processing your message. Please try again.";
      },
      onFinish: async ({ messages: finalMessages }) => {
        console.log(
          `💾 AI Chat API - Saving messages to thread ${actualThreadId}:`,
          {
            messageCount: finalMessages.length,
            lastMessageId: finalMessages[finalMessages.length - 1]?.id,
            userId,
          }
        );

        if (!actualThreadId) {
          console.warn("⚠️ No threadId available, skipping message save");
          return;
        }

        // Save only new messages (not already in DB)
        // Note: messages includes the user's new message, but it hasn't been saved yet
        // We need to save from messages.length - 1 (the new user message) onwards
        const existingMessageCount = messages.length - 1;
        const newMessages = finalMessages.slice(existingMessageCount);

        for (const message of newMessages) {
          try {
            console.log(`💾 Attempting to save message ${message.id}:`, {
              role: message.role,
              hasParts: !!message.parts,
              partsLength: message.parts?.length,
              hasContent: 'content' in message,
              contentType: typeof message.content,
              fullMessage: message,
              userId,
            });

            // Extract text content from parts or content property
            let content = "";
            if (message.parts && message.parts.length > 0) {
              const textParts = message.parts
                .filter((p: any) => p.type === "text")
                .map((p: any) => p.text);
              content = textParts.join("\n");
              console.log(`📝 Extracted content from parts:`, content);
            } else if ('content' in message && message.content) {
              // User messages typically have content directly
              content = message.content as string;
              console.log(`📝 Using direct content:`, content);
            }

            if (!content) {
              console.warn(`⚠️ No content found for message ${message.id}, skipping save`);
              continue;
            }

            console.log(`💾 Saving message with content:`, {
              threadId: actualThreadId,
              role: message.role,
              contentLength: content.length,
            });

            // Save the message
            await saveMessage({
              threadId: actualThreadId,
              role: message.role as "user" | "assistant" | "system",
              content: content,
              toolCalls: message.parts?.filter((p: any) => p.type === "tool-call"),
            });

            console.log(`✅ Saved message ${message.id} to thread`);
          } catch (error) {
            console.error(`❌ Failed to save message ${message.id}:`, error);
          }
        }
      },
    });
  } catch (error) {
    console.error("Error in AI Chat API:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to process chat",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
