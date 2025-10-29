import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.delete("user_id");

  return NextResponse.json({ success: true });
}

export async function GET() {
  const cookieStore = await cookies();
  cookieStore.delete("user_id");

  return NextResponse.redirect(new URL("/", process.env.NEXTAUTH_URL!));
}
