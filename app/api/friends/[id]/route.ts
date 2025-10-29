import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

// PATCH /api/friends/[id] - Accept request or update permission
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { action, permission } = body;

    if (action === "accept") {
      if (!permission || (permission !== "busy-only" && permission !== "full-details")) {
        return NextResponse.json(
          { error: "Valid permission is required to accept" },
          { status: 400 }
        );
      }

      await convex.mutation(api.friends.acceptRequest, {
        requestId: id as Id<"friends">,
        permission,
      });

      return NextResponse.json({ success: true });
    }

    if (action === "update-permission") {
      if (!permission || (permission !== "busy-only" && permission !== "full-details")) {
        return NextResponse.json(
          { error: "Valid permission is required" },
          { status: 400 }
        );
      }

      await convex.mutation(api.friends.updatePermission, {
        friendshipId: id as Id<"friends">,
        permission,
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Error updating friend:", error);
    return NextResponse.json(
      { error: "Failed to update friend" },
      { status: 500 }
    );
  }
}

// DELETE /api/friends/[id] - Remove friend or reject request
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get("action"); // "reject" or "remove"

    if (action === "reject") {
      await convex.mutation(api.friends.rejectRequest, {
        requestId: id as Id<"friends">,
      });
    } else {
      await convex.mutation(api.friends.removeFriend, {
        friendshipId: id as Id<"friends">,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting friend:", error);
    return NextResponse.json(
      { error: "Failed to delete friend" },
      { status: 500 }
    );
  }
}
