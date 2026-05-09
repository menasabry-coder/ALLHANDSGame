import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { emitGameEvent } from "@/lib/eventBus";

interface Params {
  params: Promise<{ sessionId: string }>;
}

/**
 * POST /api/sessions/[sessionId]/reset
 *
 * Resets a session to draft state:
 *   - Deletes all responses and analysis results.
 *   - Deletes all participants.
 *   - Resets all questions to isActive=false, isLocked=false.
 *   - Sets session status back to "draft" with no active round/question.
 *
 * Emits `session:updated` event.
 */
export async function POST(_req: Request, { params }: Params) {
  const { sessionId } = await params;

  const session = await prisma.gameSession.findUnique({
    where: { id: sessionId },
  });

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  // Delete child data (Prisma cascade handles participant→response)
  await prisma.analysisResult.deleteMany({ where: { sessionId } });
  await prisma.response.deleteMany({ where: { sessionId } });
  await prisma.participant.deleteMany({ where: { sessionId } });

  // Reset question state (questions are global, not session-scoped)
  await prisma.question.updateMany({
    data: { isActive: false, isLocked: false },
  });

  const updated = await prisma.gameSession.update({
    where: { id: sessionId },
    data: { status: "draft", activeRoundId: null, activeQuestionId: null },
  });

  emitGameEvent("session:updated", sessionId, {
    status: "draft",
    reset: true,
  });

  return NextResponse.json({
    id: updated.id,
    code: updated.code,
    title: updated.title,
    status: updated.status,
    message: "Session reset to draft",
  });
}
