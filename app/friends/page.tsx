"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AddFriendForm } from "@/components/add-friend-form";
import Link from "next/link";

interface User {
  _id: string;
  email: string;
  displayName: string;
}

interface Friend {
  friendshipId: string;
  permission: "busy-only" | "full-details";
  createdAt: number;
  user: User;
}

interface Request {
  requestId: string;
  permission: "busy-only" | "full-details";
  createdAt: number;
  user: User;
}

export default function FriendsPage() {
  const router = useRouter();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [sentRequests, setSentRequests] = useState<Request[]>([]);
  const [receivedRequests, setReceivedRequests] = useState<Request[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"friends" | "sent" | "received">(
    "friends"
  );

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [friendsRes, sentRes, receivedRes] = await Promise.all([
        fetch("/api/friends"),
        fetch("/api/friends?type=sent"),
        fetch("/api/friends?type=received"),
      ]);

      const [friendsData, sentData, receivedData] = await Promise.all([
        friendsRes.json(),
        sentRes.json(),
        receivedRes.json(),
      ]);

      setFriends(friendsData.friends || []);
      setSentRequests(sentData.requests || []);
      setReceivedRequests(receivedData.requests || []);
    } catch (error) {
      console.error("Error fetching friends:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAccept = async (requestId: string, permission: string) => {
    try {
      const response = await fetch(`/api/friends/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "accept", permission }),
      });

      if (!response.ok) throw new Error("Failed to accept request");

      fetchData();
    } catch (error) {
      console.error("Error accepting request:", error);
      alert("Failed to accept friend request");
    }
  };

  const handleReject = async (requestId: string) => {
    try {
      const response = await fetch(`/api/friends/${requestId}?action=reject`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to reject request");

      fetchData();
    } catch (error) {
      console.error("Error rejecting request:", error);
      alert("Failed to reject friend request");
    }
  };

  const handleRemove = async (friendshipId: string) => {
    if (!confirm("Are you sure you want to remove this friend?")) return;

    try {
      const response = await fetch(`/api/friends/${friendshipId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to remove friend");

      fetchData();
    } catch (error) {
      console.error("Error removing friend:", error);
      alert("Failed to remove friend");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
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
                  Friends
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  Manage your calendar sharing
                </p>
              </div>
            </div>
            <Link
              href="/dashboard"
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Add Friend Form */}
          <div className="lg:col-span-1">
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-500 to-indigo-600 px-6 py-4">
                <h2 className="text-lg font-bold text-white">Add Friend</h2>
              </div>
              <div className="p-6">
                <AddFriendForm onSuccess={fetchData} />
              </div>
            </div>
          </div>

          {/* Friends List */}
          <div className="lg:col-span-2">
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
              {/* Tabs */}
              <div className="bg-gradient-to-r from-purple-500 to-pink-600 px-6 py-4">
                <div className="flex gap-4">
                  <button
                    onClick={() => setActiveTab("friends")}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      activeTab === "friends"
                        ? "bg-white text-purple-600"
                        : "text-white hover:bg-white/20"
                    }`}
                  >
                    Friends ({friends.length})
                  </button>
                  <button
                    onClick={() => setActiveTab("received")}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      activeTab === "received"
                        ? "bg-white text-purple-600"
                        : "text-white hover:bg-white/20"
                    }`}
                  >
                    Requests ({receivedRequests.length})
                  </button>
                  <button
                    onClick={() => setActiveTab("sent")}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      activeTab === "sent"
                        ? "bg-white text-purple-600"
                        : "text-white hover:bg-white/20"
                    }`}
                  >
                    Sent ({sentRequests.length})
                  </button>
                </div>
              </div>

              <div className="p-6">
                {isLoading ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="text-gray-500 mt-4">Loading...</p>
                  </div>
                ) : (
                  <>
                    {/* Friends List */}
                    {activeTab === "friends" && (
                      <div className="space-y-3">
                        {friends.length === 0 ? (
                          <div className="text-center py-12">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                              <span className="text-3xl">👥</span>
                            </div>
                            <p className="text-gray-500 text-lg">
                              No friends yet
                            </p>
                            <p className="text-gray-400 text-sm mt-1">
                              Add a friend to start scheduling together!
                            </p>
                          </div>
                        ) : (
                          friends.map((friend) => (
                            <div
                              key={friend.friendshipId}
                              className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-all"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold">
                                    {friend.user.displayName[0].toUpperCase()}
                                  </div>
                                  <div>
                                    <div className="font-semibold text-gray-900">
                                      {friend.user.displayName}
                                    </div>
                                    <div className="text-sm text-gray-600">
                                      {friend.user.email}
                                    </div>
                                    <div className="text-xs text-gray-500 mt-1">
                                      Permission:{" "}
                                      {friend.permission === "busy-only"
                                        ? "Busy/Free Only"
                                        : "Full Details"}
                                    </div>
                                  </div>
                                </div>
                                <button
                                  onClick={() =>
                                    handleRemove(friend.friendshipId)
                                  }
                                  className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                  Remove
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}

                    {/* Received Requests */}
                    {activeTab === "received" && (
                      <div className="space-y-3">
                        {receivedRequests.length === 0 ? (
                          <div className="text-center py-12">
                            <p className="text-gray-500">
                              No pending requests
                            </p>
                          </div>
                        ) : (
                          receivedRequests.map((request) => (
                            <div
                              key={request.requestId}
                              className="border border-gray-200 rounded-xl p-4 bg-blue-50"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold">
                                    {request.user.displayName[0].toUpperCase()}
                                  </div>
                                  <div>
                                    <div className="font-semibold text-gray-900">
                                      {request.user.displayName}
                                    </div>
                                    <div className="text-sm text-gray-600">
                                      {request.user.email}
                                    </div>
                                    <div className="text-xs text-gray-500 mt-1">
                                      Wants to connect with{" "}
                                      {request.permission === "busy-only"
                                        ? "busy/free access"
                                        : "full details"}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() =>
                                      handleAccept(
                                        request.requestId,
                                        request.permission
                                      )
                                    }
                                    className="px-3 py-1.5 text-sm bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                                  >
                                    Accept
                                  </button>
                                  <button
                                    onClick={() =>
                                      handleReject(request.requestId)
                                    }
                                    className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                  >
                                    Reject
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}

                    {/* Sent Requests */}
                    {activeTab === "sent" && (
                      <div className="space-y-3">
                        {sentRequests.length === 0 ? (
                          <div className="text-center py-12">
                            <p className="text-gray-500">No sent requests</p>
                          </div>
                        ) : (
                          sentRequests.map((request) => (
                            <div
                              key={request.requestId}
                              className="border border-gray-200 rounded-xl p-4 bg-yellow-50"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-full flex items-center justify-center text-white font-bold">
                                    {request.user.displayName[0].toUpperCase()}
                                  </div>
                                  <div>
                                    <div className="font-semibold text-gray-900">
                                      {request.user.displayName}
                                    </div>
                                    <div className="text-sm text-gray-600">
                                      {request.user.email}
                                    </div>
                                    <div className="text-xs text-gray-500 mt-1">
                                      Pending...
                                    </div>
                                  </div>
                                </div>
                                <button
                                  onClick={() =>
                                    handleReject(request.requestId)
                                  }
                                  className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
