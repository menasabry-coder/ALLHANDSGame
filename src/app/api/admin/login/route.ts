import { NextResponse } from "next/server";
import {
  ADMIN_COOKIE_NAME,
  getAdminAuthToken,
  getAdminPassword,
} from "@/lib/adminAuth";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | { password?: string }
    | null;
  const password = body?.password?.trim() ?? "";

  if (!password) {
    return NextResponse.json({ error: "Password is required" }, { status: 400 });
  }

  if (password !== getAdminPassword()) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE_NAME, getAdminAuthToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
  return res;
}
