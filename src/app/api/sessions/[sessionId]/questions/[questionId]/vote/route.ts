import { NextResponse } from "next/server";
import { castVote, getSession, getQuestion } from "@/lib/store";

interface Params {
  params: Promise<{ sessionId: string; questionId: string }>;
}

/** POST /api/sessions/[sessionId]/questions/[questionId]/vote */
export async function POST(request: Request, { params }: Params) {
  const { sessionId, questionId } = await params;

  const session = getSession(sessionId);
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const question = getQuestion(questionId);
  if (!question || question.sessionId !== sessionId) {
    return NextResponse.json({ error: "Question not found" }, { status: 404 });
  }

  const body = await request.json();
  const optionIndex: number | undefined = body?.optionIndex;
  const participantId: string | undefined = body?.participantId;
  const freeTextAnswer: string | undefined = body?.freeTextAnswer;

  if (!participantId) {
    return NextResponse.json(
      { error: "Provide `participantId` (string)" },
      { status: 400 }
    );
  }

  if (question.type === "mcq" && typeof optionIndex !== "number") {
    return NextResponse.json(
      { error: "Provide `optionIndex` (number) for MCQ questions" },
      { status: 400 }
    );
  }

  if (question.type === "freetext" && !freeTextAnswer) {
    return NextResponse.json(
      { error: "Provide `freeTextAnswer` (string) for free-text questions" },
      { status: 400 }
    );
  }

  const vote = castVote(
    questionId,
    sessionId,
    participantId,
    optionIndex ?? -1,
    freeTextAnswer ?? null
  );
  if (!vote) {
    return NextResponse.json(
      { error: "Vote rejected — already voted or invalid option" },
      { status: 409 }
    );
  }
  return NextResponse.json(vote, { status: 201 });
}
