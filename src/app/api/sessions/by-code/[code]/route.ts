import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface Params {
  params: Promise<{ code: string }>;
}

/**
 * GET /api/sessions/by-code/[code]
 *
 * Look up a GameSession by its human-readable meeting code (case-insensitive).
 * Used by the join flow to validate the code before showing registration.
 */
export async function GET(_req: Request, { params }: Params) {
  const { code } = await params;

  const session = await prisma.gameSession.findUnique({
    where: { code: code.trim().toUpperCase() },
    include: { _count: { select: { participants: true } } },
  });

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: session.id,
    code: session.code,
    title: session.title,
    status: session.status,
    activeRoundId: session.activeRoundId,
    activeQuestionId: session.activeQuestionId,
    participantCount: session._count.participants,
    createdAt: session.createdAt.toISOString(),
    updatedAt: session.updatedAt.toISOString(),
  });
}
