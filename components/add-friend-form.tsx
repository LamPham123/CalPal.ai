"use client";

import { useState } from "react";

interface AddFriendFormProps {
  onSuccess?: () => void;
}

export function AddFriendForm({ onSuccess }: AddFriendFormProps) {
  const [email, setEmail] = useState("");
  const [permission, setPermission] = useState<"busy-only" | "full-details">(
    "busy-only"
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/friends", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          friendEmail: email,
          permission,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send friend request");
      }

      setSuccess(`Friend request sent to ${email}!`);
      setEmail("");
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send request");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded">
          <p className="text-sm">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border-l-4 border-green-500 text-green-700 px-4 py-3 rounded">
          <p className="text-sm">{success}</p>
        </div>
      )}

      <div>
        <label
          htmlFor="email"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Friend's Email *
        </label>
        <input
          type="email"
          id="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="friend@example.com"
          required
        />
        <p className="text-xs text-gray-500 mt-1">
          They must have a CalPal AI account
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Calendar Permission *
        </label>
        <div className="space-y-2">
          <label className="flex items-start gap-3 p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
            <input
              type="radio"
              name="permission"
              value="busy-only"
              checked={permission === "busy-only"}
              onChange={(e) =>
                setPermission(e.target.value as "busy-only" | "full-details")
              }
              className="mt-1"
            />
            <div>
              <div className="font-medium text-gray-900">Busy/Free Only</div>
              <div className="text-sm text-gray-600">
                They can only see when you're busy or free (recommended)
              </div>
            </div>
          </label>

          <label className="flex items-start gap-3 p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
            <input
              type="radio"
              name="permission"
              value="full-details"
              checked={permission === "full-details"}
              onChange={(e) =>
                setPermission(e.target.value as "busy-only" | "full-details")
              }
              className="mt-1"
            />
            <div>
              <div className="font-medium text-gray-900">Full Details</div>
              <div className="text-sm text-gray-600">
                They can see event titles, locations, and descriptions
              </div>
            </div>
          </label>
        </div>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-medium px-4 py-2.5 rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? "Sending..." : "Send Friend Request"}
      </button>
    </form>
  );
}
