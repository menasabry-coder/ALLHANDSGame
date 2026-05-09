import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { emitGameEvent } from "@/lib/eventBus";
import { ROUNDS } from "@/config/gameConfig";

interface Params {
  params: Promise<{ sessionId: string }>;
}

/**
 * POST /api/sessions/[sessionId]/start
 *
 * Transitions a session from "draft" → "active" and sets the first round as
 * the active round.  Emits `session:updated` and `round:started` events.
 */
export async function POST(_req: Request, { params }: Params) {
  const { sessionId } = await params;

  const session = await prisma.gameSession.findUnique({
    where: { id: sessionId },
  });

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  if (session.status === "completed") {
    return NextResponse.json(
      { error: "Session has already completed" },
      { status: 409 }
    );
  }

  const firstRound = ROUNDS.find((r) => r.order === 1);

  const updated = await prisma.gameSession.update({
    where: { id: sessionId },
    data: {
      status: "active",
      activeRoundId: session.activeRoundId ?? firstRound?.id ?? null,
    },
    include: { _count: { select: { participants: true } } },
  });

  emitGameEvent("session:updated", sessionId, { status: updated.status });
  if (updated.activeRoundId) {
    emitGameEvent("round:started", sessionId, {
      roundId: updated.activeRoundId,
    });
  }

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
