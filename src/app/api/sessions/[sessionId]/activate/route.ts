import { NextResponse } from "next/server";
import { activateQuestion, getSession, getQuestion, finishSession } from "@/lib/store";

interface Params {
  params: Promise<{ sessionId: string }>;
}

/** POST /api/sessions/[sessionId]/activate — activate a question or finish */
export async function POST(request: Request, { params }: Params) {
  const { sessionId } = await params;

  const session = getSession(sessionId);
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const body = await request.json();
  const questionId: string | undefined = body?.questionId;

  // If questionId is null, finish the session
  if (questionId === null || questionId === undefined) {
    const updated = finishSession(sessionId);
    return NextResponse.json(updated);
  }

  const question = getQuestion(questionId);
  if (!question || question.sessionId !== sessionId) {
    return NextResponse.json({ error: "Question not found" }, { status: 404 });
  }

  const updated = activateQuestion(sessionId, questionId);
  return NextResponse.json(updated);
}
