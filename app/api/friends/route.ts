import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

// GET /api/friends - List all friends
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get("type"); // "accepted", "sent", "received"

    if (type === "sent") {
      const requests = await convex.query(api.friends.listSentRequests, {
        userId,
      });
      return NextResponse.json({ requests });
    }

    if (type === "received") {
      const requests = await convex.query(api.friends.listReceivedRequests, {
        userId,
      });
      return NextResponse.json({ requests });
    }

    // Default: list accepted friends
    const friends = await convex.query(api.friends.listFriends, { userId });
    return NextResponse.json({ friends });
  } catch (error) {
    console.error("Error fetching friends:", error);
    return NextResponse.json(
      { error: "Failed to fetch friends" },
      { status: 500 }
    );
  }
}

// POST /api/friends - Send friend request
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { friendEmail, permission } = body;

    if (!friendEmail || !permission) {
      return NextResponse.json(
        { error: "friendEmail and permission are required" },
        { status: 400 }
      );
    }

    if (permission !== "busy-only" && permission !== "full-details") {
      return NextResponse.json(
        { error: "permission must be 'busy-only' or 'full-details'" },
        { status: 400 }
      );
    }

    const requestId = await convex.mutation(api.friends.sendRequest, {
      userId,
      friendEmail,
      permission,
    });

    return NextResponse.json({ requestId, success: true });
  } catch (error) {
    console.error("Error sending friend request:", error);
    const message =
      error instanceof Error ? error.message : "Failed to send friend request";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
