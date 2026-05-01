import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { GameSessionDto } from "@/types/game";

interface Params {
  params: Promise<{ sessionId: string }>;
}

function toDto(
  session: Awaited<ReturnType<typeof prisma.gameSession.findUnique>> & {
    _count?: { participants: number };
  }
): GameSessionDto {
  return {
    id: session!.id,
    code: session!.code,
    title: session!.title,
    status: session!.status as GameSessionDto["status"],
    activeRoundId: session!.activeRoundId,
    activeQuestionId: session!.activeQuestionId,
    participantCount: session!._count?.participants ?? 0,
    createdAt: session!.createdAt.toISOString(),
    updatedAt: session!.updatedAt.toISOString(),
  };
}

/** GET /api/sessions/[sessionId] — fetch a single session with participant count */
export async function GET(_req: Request, { params }: Params) {
  const { sessionId } = await params;

  const session = await prisma.gameSession.findUnique({
    where: { id: sessionId },
    include: { _count: { select: { participants: true } } },
  });

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  return NextResponse.json(toDto(session));
}
