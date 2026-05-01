import { NextResponse } from "next/server";
import { getSession, registerParticipant } from "@/lib/store";

interface Params {
  params: Promise<{ sessionId: string }>;
}

/** POST /api/sessions/[sessionId]/join — register a participant */
export async function POST(request: Request, { params }: Params) {
  const { sessionId } = await params;

  const session = getSession(sessionId);
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const body = await request.json();
  const participantId: string | undefined = body?.participantId;

  if (!participantId || typeof participantId !== "string") {
    return NextResponse.json(
      { error: "Provide `participantId` (string)" },
      { status: 400 }
    );
  }

  const count = registerParticipant(sessionId, participantId);
  return NextResponse.json({ participantCount: count });
}
