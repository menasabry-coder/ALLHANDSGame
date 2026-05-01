import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { emitGameEvent } from "@/lib/eventBus";

interface Params {
  params: Promise<{ questionId: string }>;
}

/**
 * POST /api/questions/[questionId]/lock
 *
 * Locks a question — no further responses are accepted once locked.
 * Creates a placeholder AnalysisResult record for the current-question analysis.
 * Emits `question:locked` and `analysis:current-question-ready` events.
 */
export async function POST(_req: Request, { params }: Params) {
  const { questionId } = await params;

  const question = await prisma.question.findUnique({
    where: { id: questionId },
    include: { _count: { select: { responses: true } } },
  });

  if (!question) {
    return NextResponse.json({ error: "Question not found" }, { status: 404 });
  }

  if (question.isLocked) {
    return NextResponse.json(
      { error: "Question is already locked" },
      { status: 409 }
    );
  }

  // Lock the question and deactivate it simultaneously
  const updated = await prisma.question.update({
    where: { id: questionId },
    data: { isLocked: true, isActive: false },
  });

  // Find the session this question belongs to (via responses, if any)
  const firstResponse = await prisma.response.findFirst({
    where: { questionId },
    select: { sessionId: true },
  });

  const sessionId = firstResponse?.sessionId ?? "unknown";

  // Create a placeholder AnalysisResult — will be populated by OpenAI in Phase 8
  if (sessionId !== "unknown") {
    const analysis = await prisma.analysisResult.create({
      data: {
        sessionId,
        questionId,
        analysisType: "current_question",
        payload: JSON.stringify({
          status: "pending",
          responseCount: question._count.responses,
        }),
      },
    });

    emitGameEvent("question:locked", sessionId, { questionId });
    emitGameEvent("analysis:current-question-ready", sessionId, {
      questionId,
      analysisId: analysis.id,
      status: "pending",
    });
  }

  return NextResponse.json({
    id: updated.id,
    isLocked: updated.isLocked,
    isActive: updated.isActive,
  });
}
