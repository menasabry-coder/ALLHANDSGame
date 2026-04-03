import { NextResponse } from "next/server";
import {
  addQuestion,
  listQuestions,
  listPublishedQuestions,
  getSession,
  getQuestionResults,
} from "@/lib/store";
import type { QuestionType } from "@/lib/types";

interface Params {
  params: Promise<{ sessionId: string }>;
}

/** GET /api/sessions/[sessionId]/questions — list questions & results */
export async function GET(request: Request, { params }: Params) {
  const { sessionId } = await params;
  const session = getSession(sessionId);
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  // Check if the caller wants all questions (admin) or only published (player/dashboard)
  const url = new URL(request.url);
  const includeUnpublished = url.searchParams.get("all") === "true";

  const qs = includeUnpublished
    ? listQuestions(sessionId)
    : listPublishedQuestions(sessionId);
  const results = qs.map((q) => getQuestionResults(q.id) ?? q);
  return NextResponse.json({ session, questions: results });
}

/** POST /api/sessions/[sessionId]/questions — add a question */
export async function POST(request: Request, { params }: Params) {
  const { sessionId } = await params;
  const body = await request.json();
  const text: string | undefined = body?.text;
  const type: QuestionType = body?.type === "freetext" ? "freetext" : "mcq";
  const options: string[] | undefined = body?.options;

  if (!text || typeof text !== "string") {
    return NextResponse.json(
      { error: "Provide `text` (string)" },
      { status: 400 }
    );
  }

  // MCQ requires at least 2 options; freetext needs none
  if (type === "mcq" && (!Array.isArray(options) || options.length < 2)) {
    return NextResponse.json(
      {
        error:
          "For MCQ questions, provide `options` (array of ≥ 2 strings)",
      },
      { status: 400 }
    );
  }

  const question = addQuestion(
    sessionId,
    text.trim(),
    type,
    type === "mcq" ? (options ?? []) : []
  );
  if (!question) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }
  return NextResponse.json(question, { status: 201 });
}
