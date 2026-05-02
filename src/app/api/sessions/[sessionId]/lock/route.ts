import { NextResponse } from "next/server";
import { getSession, getQuestion, lockQuestion, unlockQuestion } from "@/lib/store";

interface Params {
  params: Promise<{ sessionId: string }>;
}

/**
 * POST /api/sessions/[sessionId]/lock
 *
 * Body: { questionId: string, locked: boolean }
 * Locks or unlocks the specified question.
 */
export async function POST(request: Request, { params }: Params) {
  const { sessionId } = await params;

  const session = getSession(sessionId);
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const body = await request.json();
  const questionId: string | undefined = body?.questionId;
  const locked: boolean = body?.locked ?? true; // default to locking

  if (!questionId) {
    return NextResponse.json(
      { error: "Provide `questionId` (string)" },
      { status: 400 }
    );
  }

  const question = getQuestion(questionId);
  if (!question || question.sessionId !== sessionId) {
    return NextResponse.json({ error: "Question not found" }, { status: 404 });
  }

  const updated = locked ? lockQuestion(questionId) : unlockQuestion(questionId);
  return NextResponse.json(updated);
}
