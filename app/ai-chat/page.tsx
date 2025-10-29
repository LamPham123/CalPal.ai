"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useConvex } from "convex/react";
import { api } from "@/convex/_generated/api";
import { AIChatInterface } from "@/components/ai-chat-interface";
import { Id } from "@/convex/_generated/dataModel";

export default function AIChatPage() {
  const convex = useConvex();
  const [userId, setUserId] = useState<Id<"users"> | null>(null);
  const [threads, setThreads] = useState<any[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string | undefined>();
  const [messages, setMessages] = useState<any[]>([]);
  const [isLoadingThreads, setIsLoadingThreads] = useState(true);

  // Get user ID from cookie
  useEffect(() => {
    const getUserIdFromCookie = () => {
      const cookies = document.cookie.split(";");
      const userIdCookie = cookies.find((c) => c.trim().startsWith("user_id="));
      if (userIdCookie) {
        const id = userIdCookie.split("=")[1];
        return id as Id<"users">;
      }
      return null;
    };

    const id = getUserIdFromCookie();
    setUserId(id);
  }, []);

  // Load threads
  useEffect(() => {
    if (!userId) return;

    const loadThreads = async () => {
      try {
        setIsLoadingThreads(true);
        const threadList = await convex.query(api.agent_threads.listThreads, {
          userId,
        });
        setThreads(threadList);
      } catch (error) {
        console.error("Error loading threads:", error);
      } finally {
        setIsLoadingThreads(false);
      }
    };

    loadThreads();
  }, [userId, convex]);

  // Load messages for selected thread
  useEffect(() => {
    if (!selectedThreadId) {
      setMessages([]);
      return;
    }

    const loadMessages = async () => {
      try {
        const threadMessages = await convex.query(
          api.agent_messages.getMessages,
          {
            threadId: selectedThreadId as Id<"agent_threads">,
          }
        );
        setMessages(threadMessages);
      } catch (error) {
        console.error("Error loading messages:", error);
      }
    };

    loadMessages();
  }, [selectedThreadId, convex]);

  const handleNewChat = () => {
    setSelectedThreadId(undefined);
    setMessages([]);
  };

  const handleThreadCreated = async (newThreadId: string) => {
    setSelectedThreadId(newThreadId);
    // Reload threads list
    if (userId) {
      const threadList = await convex.query(api.agent_threads.listThreads, {
        userId,
      });
      setThreads(threadList);
    }
  };

  const handleDeleteThread = async (threadId: string) => {
    if (!confirm("Delete this conversation?")) return;

    try {
      await convex.mutation(api.agent_threads.deleteThread, {
        threadId: threadId as Id<"agent_threads">,
      });

      // Reload threads
      if (userId) {
        const threadList = await convex.query(api.agent_threads.listThreads, {
          userId,
        });
        setThreads(threadList);
      }

      // Clear selection if deleted thread was selected
      if (selectedThreadId === threadId) {
        handleNewChat();
      }
    } catch (error) {
      console.error("Error deleting thread:", error);
      alert("Failed to delete conversation");
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/dashboard"
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg
                  className="w-6 h-6 text-gray-600"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path d="M15 19l-7-7 7-7"></path>
                </svg>
              </Link>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  AI Calendar Companion
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  Your intelligent scheduling assistant
                </p>
              </div>
            </div>
            <button
              onClick={handleNewChat}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-medium rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all shadow-md"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path d="M12 4v16m8-8H4"></path>
              </svg>
              New Chat
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Thread List */}
        <div className="w-80 bg-white/90 backdrop-blur-sm border-r border-gray-200 overflow-y-auto">
          <div className="p-4">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
              Conversations
            </h2>

            {isLoadingThreads && (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              </div>
            )}

            {!isLoadingThreads && threads.length === 0 && (
              <div className="text-center py-8">
                <p className="text-sm text-gray-500">No conversations yet</p>
                <p className="text-xs text-gray-400 mt-1">
                  Start a new chat to begin
                </p>
              </div>
            )}

            <div className="space-y-2">
              {threads.map((thread) => (
                <div
                  key={thread._id}
                  className={`group relative p-3 rounded-lg cursor-pointer transition-all ${
                    selectedThreadId === thread._id
                      ? "bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200"
                      : "hover:bg-gray-50 border border-transparent"
                  }`}
                  onClick={() => setSelectedThreadId(thread._id)}
                >
                  <div className="pr-8">
                    <h3 className="text-sm font-medium text-gray-900 truncate">
                      {thread.title}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(thread.updatedAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteThread(thread._id);
                    }}
                    className="absolute top-2 right-2 p-1 text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Delete conversation"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col bg-white/50 backdrop-blur-sm">
          <AIChatInterface
            threadId={selectedThreadId}
            initialMessages={messages}
            onThreadCreated={handleThreadCreated}
          />
        </div>
      </div>
    </div>
  );
}
