"use client";

import { useState, useRef, useEffect } from "react";
import { useChat } from "@ai-sdk/react";
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls,
} from "ai";
import { ToolCard } from "./tool-card";

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt?: number;
}

interface AIChatInterfaceProps {
  threadId?: string;
  initialMessages?: Message[];
  onThreadCreated?: (threadId: string) => void;
}

export function AIChatInterface({
  threadId,
  initialMessages = [],
  onThreadCreated,
}: AIChatInterfaceProps) {
  const [currentThreadId, setCurrentThreadId] = useState(threadId);
  const [inputValue, setInputValue] = useState("");
  const [hasStreamError, setHasStreamError] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Update currentThreadId when threadId prop changes
  useEffect(() => {
    setCurrentThreadId(threadId);
  }, [threadId]);

  const { messages, sendMessage, status, error, stop, regenerate, setMessages } = useChat({
    id: currentThreadId || "new-chat",
    initialMessages: initialMessages,
    transport: new DefaultChatTransport({
      api: "/api/ai/chat",
      body: () => ({
        threadId: currentThreadId,
      }),
    }),
    // Automatically submit when all tool results are available
    sendAutomaticallyWhen: hasStreamError
      ? undefined
      : lastAssistantMessageIsCompleteWithToolCalls,
    onError: (error: Error) => {
      console.error("Chat error:", error);
      setHasStreamError(true);
    },
  });

  // Update messages when initialMessages or threadId changes
  useEffect(() => {
    if (initialMessages.length > 0) {
      console.log("Setting initial messages:", initialMessages);
      setMessages(initialMessages);
    } else {
      console.log("Clearing messages for new thread");
      setMessages([]);
    }
  }, [threadId, initialMessages, setMessages]);

  const isLoading = status === "streaming" || status === "submitted";

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim() && !isLoading) {
      // Clear error state when sending a new message
      setHasStreamError(false);
      sendMessage({ text: inputValue.trim() });
      setInputValue("");
    }
  };

  const handleRetry = () => {
    // Clear error state and regenerate
    setHasStreamError(false);
    regenerate();
  };

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex flex-col h-full">
      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">🤖</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              AI Calendar Companion
            </h3>
            <p className="text-gray-600 text-sm max-w-md mx-auto">
              Ask me to schedule events, check your calendar, or find the best time
              to meet with friends!
            </p>
            <div className="mt-6 space-y-2">
              <p className="text-xs text-gray-500">Try asking:</p>
              <div className="flex flex-wrap gap-2 justify-center">
                <button
                  onClick={() => setInputValue("What's on my schedule this week?")}
                  className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs hover:bg-blue-100 transition-colors"
                >
                  What's on my schedule?
                </button>
                <button
                  onClick={() => setInputValue("Schedule lunch tomorrow at noon")}
                  className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs hover:bg-blue-100 transition-colors"
                >
                  Schedule lunch tomorrow
                </button>
              </div>
            </div>
          </div>
        )}

        {messages.map((message: any, index: number) => {
          // Group consecutive tool calls for assistant messages
          const toolParts: any[] = [];
          const otherParts: any[] = [];
          const messageParts = message.parts;

          // Debug log message structure
          console.log(`Message ${index} (${message.role}):`, {
            hasParts: !!messageParts,
            partsCount: messageParts?.length,
            parts: messageParts?.map((p: any) => ({
              type: p.type,
              hasToolName: !!p.toolName,
              toolName: p.toolName,
              fullPart: p, // Log the entire part to see all properties
            })),
          });

          if (message.role === "assistant" && messageParts) {
            messageParts.forEach((part: any) => {
              if (part.type?.startsWith("tool-")) {
                console.log("Found tool part:", part);
                toolParts.push(part);
              } else {
                // If we have accumulated tools, render them first
                if (toolParts.length > 0) {
                  otherParts.push({
                    type: "tool-group",
                    tools: [...toolParts],
                  });
                  toolParts.length = 0;
                }
                otherParts.push(part);
              }
            });
            // Don't forget remaining tools at the end
            if (toolParts.length > 0) {
              otherParts.push({
                type: "tool-group",
                tools: [...toolParts],
              });
            }
          }

          const partsToRender =
            message.role === "assistant" && otherParts.length > 0
              ? otherParts
              : messageParts;

          return (
          <div
            key={message.id}
            className={`flex ${
              message.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                message.role === "user"
                  ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white"
                  : "bg-white border border-gray-200 text-gray-900"
              }`}
            >
              {message.role === "assistant" && (
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center">
                    <span className="text-xs">🤖</span>
                  </div>
                  <span className="text-xs font-medium text-gray-500">
                    AI Assistant
                  </span>
                </div>
              )}

              {/* Render message parts */}
              {partsToRender?.map((part: any, partIndex: number) => {
                switch (part.type) {
                  case "text":
                    return (
                      <div key={partIndex} className="text-sm whitespace-pre-wrap">
                        {part.text}
                      </div>
                    );

                  case "reasoning":
                    // Show reasoning while streaming or if not the last message
                    const showReasoning =
                      status === "streaming" || index !== messages.length - 1;
                    if (!showReasoning) return null;

                    return (
                      <details
                        key={partIndex}
                        className="mb-2 p-2 bg-blue-50 dark:bg-blue-950/20 rounded border border-blue-200 dark:border-blue-800"
                      >
                        <summary className="text-xs font-medium text-blue-700 dark:text-blue-300 cursor-pointer">
                          💭 Thinking... {status === "streaming" && <span className="animate-pulse">●</span>}
                        </summary>
                        <div className="mt-2 text-xs text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                          {part.text}
                        </div>
                      </details>
                    );

                  case "tool-call":
                  case "tool-result":
                    // Individual tool calls/results - shouldn't happen with grouping but handle as fallback
                    return (
                      <ToolCard
                        key={partIndex}
                        tools={[
                          {
                            type: part.type,
                            state: part.state,
                            name: part.toolType || part.toolName || part.type,
                            toolName: part.toolType || part.toolName || part.type,
                            args: part.input || part.args,
                            result: part.output || part.result,
                            errorText: part.errorText,
                          },
                        ]}
                      />
                    );

                  case "tool-group":
                    // Render grouped tools using ToolCard
                    return (
                      <ToolCard
                        key={partIndex}
                        tools={part.tools.map((tool: any) => {
                          // The tool name is in the 'type' property (e.g., 'tool-listEvents')
                          // Extract it from there if toolType is not available
                          const toolName =
                            tool.toolType ||
                            tool.toolName ||
                            tool.name ||
                            tool.type ||
                            "unknown";
                          console.log("Tool in group:", {
                            toolName,
                            toolType: tool.toolType,
                            type: tool.type,
                            state: tool.state,
                            allProps: Object.keys(tool),
                          });
                          return {
                            type: tool.type,
                            state: tool.state,
                            name: toolName,
                            toolName: toolName,
                            args: tool.input || tool.args,
                            result: tool.output || tool.result,
                            errorText: tool.errorText,
                          };
                        })}
                      />
                    );

                  default:
                    return null;
                }
              }) || (
                // Fallback for messages without parts
                <div className="text-sm whitespace-pre-wrap">
                  {message.content || ""}
                </div>
              )}
            </div>
          </div>
        )})}

        {isLoading && (
          <div className="flex justify-start">
            <div className="max-w-[80%] rounded-2xl px-4 py-3 bg-white border border-gray-200">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                <div
                  className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
                  style={{ animationDelay: "0.2s" }}
                ></div>
                <div
                  className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
                  style={{ animationDelay: "0.4s" }}
                ></div>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="flex justify-center">
            <div className="max-w-[80%] rounded-2xl px-4 py-3 bg-red-50 border border-red-200 text-red-700">
              <p className="text-sm font-medium">Error</p>
              <p className="text-xs mt-1">{error.message}</p>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <div className="border-t border-gray-200 p-4 bg-white">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            placeholder="Type a message..."
            disabled={isLoading}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
          <button
            type="submit"
            disabled={isLoading || !inputValue.trim()}
            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-medium rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <svg
                className="animate-spin h-5 w-5"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
            ) : (
              <svg
                className="w-5 h-5"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path d="M14 5l7 7m0 0l-7 7m7-7H3"></path>
              </svg>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
