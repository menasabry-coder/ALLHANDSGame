import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { emitGameEvent } from "@/lib/eventBus";

interface Params {
  params: Promise<{ sessionId: string }>;
}

/**
 * POST /api/sessions/[sessionId]/active-question
 *
 * Body: { questionId: string | null }
 *
 * Sets the active question for the session.
 * - Pass `questionId: null` to clear the active question.
 * - Only one question can be active per session at a time.
 * - Locked questions cannot be re-activated.
 * - Emits `question:activated` event.
 */
export async function POST(req: Request, { params }: Params) {
  const { sessionId } = await params;
  const body = await req.json();
  const questionId: string | null = body?.questionId ?? null;

  const session = await prisma.gameSession.findUnique({
    where: { id: sessionId },
  });

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  if (session.status !== "active") {
    return NextResponse.json(
      { error: "Session must be active to change the active question" },
      { status: 409 }
    );
  }

  // Deactivate the currently active question (if any)
  if (session.activeQuestionId) {
    await prisma.question.update({
      where: { id: session.activeQuestionId },
      data: { isActive: false },
    });
  }

  if (questionId) {
    const question = await prisma.question.findUnique({
      where: { id: questionId },
    });

    if (!question) {
      return NextResponse.json(
        { error: "Question not found" },
        { status: 404 }
      );
    }

    if (question.isLocked) {
      return NextResponse.json(
        { error: "Cannot activate a locked question" },
        { status: 409 }
      );
    }

    await prisma.question.update({
      where: { id: questionId },
      data: { isActive: true },
    });
  }

  const updated = await prisma.gameSession.update({
    where: { id: sessionId },
    data: { activeQuestionId: questionId },
  });

  emitGameEvent("question:activated", sessionId, { questionId });

  return NextResponse.json({
    sessionId: updated.id,
    activeQuestionId: updated.activeQuestionId,
  });
}
