import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { emitGameEvent } from "@/lib/eventBus";

interface Params {
  params: Promise<{ sessionId: string }>;
}

/**
 * POST /api/sessions/[sessionId]/join
 *
 * Register a participant in a session with their profile data.
 *
 * Body:
 * ```json
 * {
 *   "engineeringArea": "...",
 *   "experienceLevel": "...",
 *   "aiUsageLevel": "...",
 *   "aiAttitude": "...",
 *   "teamAlias": "...",          // optional
 *   "existingParticipantId": "..." // optional — return existing record to prevent duplicates
 * }
 * ```
 *
 * Emits `participant:joined` event.
 */
export async function POST(request: Request, { params }: Params) {
  const { sessionId } = await params;

  const session = await prisma.gameSession.findUnique({
    where: { id: sessionId },
  });
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const body = await request.json();

  // Idempotency: if the caller provides an existing participant ID (from localStorage),
  // return that record if it still belongs to this session.
  const existingParticipantId: string | undefined =
    body?.existingParticipantId || undefined;
  if (existingParticipantId) {
    const existing = await prisma.participant.findFirst({
      where: { id: existingParticipantId, sessionId },
    });
    if (existing) {
      return NextResponse.json({
        id: existing.id,
        sessionId: existing.sessionId,
        engineeringArea: existing.engineeringArea,
        experienceLevel: existing.experienceLevel,
        aiUsageLevel: existing.aiUsageLevel,
        aiAttitude: existing.aiAttitude,
        teamAlias: existing.teamAlias,
        persona: existing.persona,
        createdAt: existing.createdAt.toISOString(),
      });
    }
  }

  const engineeringArea: string = (body?.engineeringArea ?? "").trim();
  const experienceLevel: string = (body?.experienceLevel ?? "").trim();
  const aiUsageLevel: string = (body?.aiUsageLevel ?? "").trim();
  const aiAttitude: string = (body?.aiAttitude ?? "").trim();
  const teamAlias: string | null = body?.teamAlias?.trim() || null;

  if (!engineeringArea || !experienceLevel || !aiUsageLevel || !aiAttitude) {
    return NextResponse.json(
      {
        error:
          "Provide engineeringArea, experienceLevel, aiUsageLevel, and aiAttitude",
      },
      { status: 400 }
    );
  }

  const participant = await prisma.participant.create({
    data: {
      sessionId,
      engineeringArea,
      experienceLevel,
      aiUsageLevel,
      aiAttitude,
      teamAlias,
    },
  });

  emitGameEvent("participant:joined", sessionId, {
    participantId: participant.id,
    engineeringArea: participant.engineeringArea,
    aiAttitude: participant.aiAttitude,
    aiUsageLevel: participant.aiUsageLevel,
  });

  return NextResponse.json(
    {
      id: participant.id,
      sessionId: participant.sessionId,
      engineeringArea: participant.engineeringArea,
      experienceLevel: participant.experienceLevel,
      aiUsageLevel: participant.aiUsageLevel,
      aiAttitude: participant.aiAttitude,
      teamAlias: participant.teamAlias,
      persona: participant.persona,
      createdAt: participant.createdAt.toISOString(),
    },
    { status: 201 }
  );
}
