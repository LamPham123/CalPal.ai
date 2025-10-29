import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Send a friend request
export const sendRequest = mutation({
  args: {
    userId: v.id("users"),
    friendEmail: v.string(),
    permission: v.union(v.literal("busy-only"), v.literal("full-details")),
  },
  handler: async (ctx, args) => {
    // Find friend by email
    const friend = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.friendEmail))
      .first();

    if (!friend) {
      throw new Error("User with this email not found. They need to sign up first.");
    }

    if (friend._id === args.userId) {
      throw new Error("You cannot add yourself as a friend");
    }

    // Check if friendship already exists
    const existing = await ctx.db
      .query("friends")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("friendUserId"), friend._id))
      .first();

    if (existing) {
      if (existing.status === "accepted") {
        throw new Error("You are already friends with this user");
      }
      throw new Error("Friend request already sent");
    }

    // Check for reverse friendship (they added us)
    const reverse = await ctx.db
      .query("friends")
      .withIndex("by_user", (q) => q.eq("userId", friend._id))
      .filter((q) => q.eq(q.field("friendUserId"), args.userId))
      .first();

    if (reverse) {
      if (reverse.status === "accepted") {
        throw new Error("You are already friends with this user");
      }
      // Auto-accept if they sent us a request
      await ctx.db.patch(reverse._id, { status: "accepted" });

      // Create our side as accepted too
      return await ctx.db.insert("friends", {
        userId: args.userId,
        friendUserId: friend._id,
        permission: args.permission,
        status: "accepted",
        createdAt: Date.now(),
      });
    }

    // Create new pending request
    return await ctx.db.insert("friends", {
      userId: args.userId,
      friendUserId: friend._id,
      permission: args.permission,
      status: "pending",
      createdAt: Date.now(),
    });
  },
});

// Accept a friend request
export const acceptRequest = mutation({
  args: {
    requestId: v.id("friends"),
    permission: v.union(v.literal("busy-only"), v.literal("full-details")),
  },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.requestId);

    if (!request) {
      throw new Error("Request not found");
    }

    if (request.status !== "pending") {
      throw new Error("Request is not pending");
    }

    // Update request to accepted
    await ctx.db.patch(args.requestId, {
      status: "accepted",
      permission: args.permission,
    });

    // Create reverse friendship
    const existing = await ctx.db
      .query("friends")
      .withIndex("by_user", (q) => q.eq("userId", request.friendUserId))
      .filter((q) => q.eq(q.field("friendUserId"), request.userId))
      .first();

    if (!existing) {
      await ctx.db.insert("friends", {
        userId: request.friendUserId,
        friendUserId: request.userId,
        permission: args.permission,
        status: "accepted",
        createdAt: Date.now(),
      });
    } else {
      await ctx.db.patch(existing._id, { status: "accepted" });
    }

    return true;
  },
});

// Reject a friend request
export const rejectRequest = mutation({
  args: {
    requestId: v.id("friends"),
  },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.requestId);

    if (!request) {
      throw new Error("Request not found");
    }

    await ctx.db.delete(args.requestId);
    return true;
  },
});

// Remove a friend
export const removeFriend = mutation({
  args: {
    friendshipId: v.id("friends"),
  },
  handler: async (ctx, args) => {
    const friendship = await ctx.db.get(args.friendshipId);

    if (!friendship) {
      throw new Error("Friendship not found");
    }

    // Delete this friendship
    await ctx.db.delete(args.friendshipId);

    // Delete reverse friendship
    const reverse = await ctx.db
      .query("friends")
      .withIndex("by_user", (q) => q.eq("userId", friendship.friendUserId))
      .filter((q) => q.eq(q.field("friendUserId"), friendship.userId))
      .first();

    if (reverse) {
      await ctx.db.delete(reverse._id);
    }

    return true;
  },
});

// Update friend permission
export const updatePermission = mutation({
  args: {
    friendshipId: v.id("friends"),
    permission: v.union(v.literal("busy-only"), v.literal("full-details")),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.friendshipId, {
      permission: args.permission,
    });
    return true;
  },
});

// List all friends (accepted only)
export const listFriends = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const friendships = await ctx.db
      .query("friends")
      .withIndex("by_user_status", (q) =>
        q.eq("userId", args.userId).eq("status", "accepted")
      )
      .collect();

    // Get friend user details
    const friends = await Promise.all(
      friendships.map(async (friendship) => {
        const friend = await ctx.db.get(friendship.friendUserId);
        return {
          friendshipId: friendship._id,
          permission: friendship.permission,
          createdAt: friendship.createdAt,
          user: friend,
        };
      })
    );

    return friends.filter((f) => f.user !== null);
  },
});

// List pending sent requests (requests I sent)
export const listSentRequests = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const requests = await ctx.db
      .query("friends")
      .withIndex("by_user_status", (q) =>
        q.eq("userId", args.userId).eq("status", "pending")
      )
      .collect();

    // Get friend user details
    const requestsWithUsers = await Promise.all(
      requests.map(async (request) => {
        const friend = await ctx.db.get(request.friendUserId);
        return {
          requestId: request._id,
          permission: request.permission,
          createdAt: request.createdAt,
          user: friend,
        };
      })
    );

    return requestsWithUsers.filter((r) => r.user !== null);
  },
});

// List pending received requests (requests sent to me)
export const listReceivedRequests = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const requests = await ctx.db
      .query("friends")
      .withIndex("by_friend", (q) => q.eq("friendUserId", args.userId))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .collect();

    // Get sender user details
    const requestsWithUsers = await Promise.all(
      requests.map(async (request) => {
        const sender = await ctx.db.get(request.userId);
        return {
          requestId: request._id,
          permission: request.permission,
          createdAt: request.createdAt,
          user: sender,
        };
      })
    );

    return requestsWithUsers.filter((r) => r.user !== null);
  },
});
