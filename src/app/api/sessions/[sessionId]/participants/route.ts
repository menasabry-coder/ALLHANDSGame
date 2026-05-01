import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface Params {
  params: Promise<{ sessionId: string }>;
}

/**
 * GET /api/sessions/[sessionId]/participants
 *
 * Returns participant count and distribution breakdowns for the session.
 * Used by the presenter dashboard for the live audience profile view.
 */
export async function GET(_req: Request, { params }: Params) {
  const { sessionId } = await params;

  const session = await prisma.gameSession.findUnique({
    where: { id: sessionId },
  });

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const participants = await prisma.participant.findMany({
    where: { sessionId },
    select: {
      engineeringArea: true,
      experienceLevel: true,
      aiUsageLevel: true,
      aiAttitude: true,
    },
  });

  const byArea: Record<string, number> = {};
  const byExperience: Record<string, number> = {};
  const byUsage: Record<string, number> = {};
  const byAttitude: Record<string, number> = {};

  for (const p of participants) {
    if (p.engineeringArea) {
      byArea[p.engineeringArea] = (byArea[p.engineeringArea] ?? 0) + 1;
    }
    if (p.experienceLevel) {
      byExperience[p.experienceLevel] = (byExperience[p.experienceLevel] ?? 0) + 1;
    }
    if (p.aiUsageLevel) {
      byUsage[p.aiUsageLevel] = (byUsage[p.aiUsageLevel] ?? 0) + 1;
    }
    if (p.aiAttitude) {
      byAttitude[p.aiAttitude] = (byAttitude[p.aiAttitude] ?? 0) + 1;
    }
  }

  return NextResponse.json({
    count: participants.length,
    byArea,
    byExperience,
    byUsage,
    byAttitude,
  });
}
