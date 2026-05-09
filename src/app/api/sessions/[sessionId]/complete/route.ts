import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { emitGameEvent } from "@/lib/eventBus";

interface Params {
  params: Promise<{ sessionId: string }>;
}

/**
 * POST /api/sessions/[sessionId]/complete
 *
 * Marks a session as completed, clears the active question, and emits
 * the `game:completed` event so all connected clients can show the
 * completion screen.
 */
export async function POST(_req: Request, { params }: Params) {
  const { sessionId } = await params;

  const session = await prisma.gameSession.findUnique({
    where: { id: sessionId },
    include: { _count: { select: { participants: true } } },
  });

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  if (session.status === "completed") {
    return NextResponse.json({ error: "Session is already completed" }, { status: 409 });
  }

  const updated = await prisma.gameSession.update({
    where: { id: sessionId },
    data: { status: "completed", activeQuestionId: null },
    include: { _count: { select: { participants: true } } },
  });

  emitGameEvent("game:completed", sessionId, { sessionId, status: "completed" });
  emitGameEvent("session:updated", sessionId, { status: "completed" });

  return NextResponse.json({
    id: updated.id,
    code: updated.code,
    title: updated.title,
    status: updated.status,
    activeRoundId: updated.activeRoundId,
    activeQuestionId: updated.activeQuestionId,
    participantCount: updated._count.participants,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
  });
}
