import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextRequest } from "next/server";
import { Id } from "@/convex/_generated/dataModel";

export async function getUserId(): Promise<Id<"users"> | null> {
  const cookieStore = await cookies();
  const userId = cookieStore.get("user_id")?.value;
  return userId as Id<"users"> | null;
}

export function getUserIdFromRequest(req: NextRequest): Id<"users"> | null {
  const userId = req.cookies.get("user_id")?.value;
  return userId as Id<"users"> | null;
}

export async function requireAuth(): Promise<Id<"users">> {
  const userId = await getUserId();

  if (!userId) {
    redirect("/?error=unauthorized");
  }

  return userId;
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete("user_id");
}
