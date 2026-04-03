import { NextResponse } from "next/server";
import {
  getSession,
  publishAllQuestions,
  publishNextQuestion,
  publishQuestion,
  listQuestions,
  getQuestionResults,
} from "@/lib/store";

interface Params {
  params: Promise<{ sessionId: string }>;
}

/**
 * POST /api/sessions/[sessionId]/publish
 *
 * Body: { mode: "all" | "next" | "one", questionId?: string }
 */
export async function POST(request: Request, { params }: Params) {
  const { sessionId } = await params;

  const session = getSession(sessionId);
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const body = await request.json();
  const mode: string = body?.mode ?? "next";
  const questionId: string | undefined = body?.questionId;

  if (mode === "all") {
    publishAllQuestions(sessionId);
  } else if (mode === "one" && questionId) {
    const q = publishQuestion(questionId);
    if (!q) {
      return NextResponse.json(
        { error: "Question not found" },
        { status: 404 }
      );
    }
  } else {
    // default: publish next
    const q = publishNextQuestion(sessionId);
    if (!q) {
      return NextResponse.json(
        { error: "No unpublished questions remaining" },
        { status: 400 }
      );
    }
  }

  // Return updated question list
  const qs = listQuestions(sessionId);
  const results = qs.map((q) => getQuestionResults(q.id) ?? q);
  return NextResponse.json({ session, questions: results });
}
