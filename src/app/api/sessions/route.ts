import { NextResponse } from "next/server";
import { createSession, listSessions } from "@/lib/store";

/** GET /api/sessions — list all sessions */
export async function GET() {
  return NextResponse.json(listSessions());
}

/** POST /api/sessions — create a new session */
export async function POST(request: Request) {
  const body = await request.json();
  const name: string | undefined = body?.name;
  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json(
      { error: "A session name is required" },
      { status: 400 }
    );
  }
  const session = createSession(name.trim());
  return NextResponse.json(session, { status: 201 });
}
