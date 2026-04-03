import { NextResponse } from "next/server";
import {
  addQuestion,
  listQuestions,
  getSession,
  getQuestionResults,
} from "@/lib/store";

interface Params {
  params: Promise<{ sessionId: string }>;
}

/** GET /api/sessions/[sessionId]/questions — list questions & results */
export async function GET(_request: Request, { params }: Params) {
  const { sessionId } = await params;
  const session = getSession(sessionId);
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }
  const qs = listQuestions(sessionId);
  const results = qs.map((q) => getQuestionResults(q.id) ?? q);
  return NextResponse.json({ session, questions: results });
}

/** POST /api/sessions/[sessionId]/questions — add a question */
export async function POST(request: Request, { params }: Params) {
  const { sessionId } = await params;
  const body = await request.json();
  const text: string | undefined = body?.text;
  const options: string[] | undefined = body?.options;

  if (
    !text ||
    typeof text !== "string" ||
    !Array.isArray(options) ||
    options.length < 2
  ) {
    return NextResponse.json(
      { error: "Provide `text` (string) and `options` (array of ≥ 2 strings)" },
      { status: 400 }
    );
  }

  const question = addQuestion(sessionId, text.trim(), options);
  if (!question) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }
  return NextResponse.json(question, { status: 201 });
}
