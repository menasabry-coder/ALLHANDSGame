import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { emitGameEvent } from "@/lib/eventBus";
import type { ResponsePayload } from "@/types/game";

/**
 * POST /api/responses
 *
 * Submit a participant response to a question.
 *
 * Body:
 * ```json
 * {
 *   "sessionId": "...",
 *   "participantId": "...",
 *   "questionId": "...",
 *   "payload": { ... }   // ResponsePayload shape
 * }
 * ```
 *
 * Rules:
 * - Locked questions do not accept responses (409).
 * - A participant can only submit one response per question.
 *   Re-submission updates the existing response (upsert).
 * - Emits `response:submitted` event.
 */
export async function POST(req: Request) {
  const body = await req.json();
  const sessionId: string | undefined = body?.sessionId;
  const participantId: string | undefined = body?.participantId;
  const questionId: string | undefined = body?.questionId;
  const payload: ResponsePayload | undefined = body?.payload;

  if (!sessionId || !participantId || !questionId || payload === undefined) {
    return NextResponse.json(
      {
        error:
          "Provide sessionId, participantId, questionId, and payload",
      },
      { status: 400 }
    );
  }

  // Validate session exists
  const session = await prisma.gameSession.findUnique({
    where: { id: sessionId },
  });
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  // Validate question exists and is not locked
  const question = await prisma.question.findUnique({
    where: { id: questionId },
  });
  if (!question) {
    return NextResponse.json({ error: "Question not found" }, { status: 404 });
  }
  if (question.isLocked) {
    return NextResponse.json(
      { error: "Question is locked — responses are no longer accepted" },
      { status: 409 }
    );
  }

  // Validate participant belongs to session
  const participant = await prisma.participant.findFirst({
    where: { id: participantId, sessionId },
  });
  if (!participant) {
    return NextResponse.json(
      { error: "Participant not found in this session" },
      { status: 404 }
    );
  }

  // Upsert — safe re-submission updates the answer
  const response = await prisma.response.upsert({
    where: {
      participantId_questionId: { participantId, questionId },
    },
    create: {
      sessionId,
      participantId,
      questionId,
      payload: JSON.stringify(payload),
    },
    update: {
      payload: JSON.stringify(payload),
    },
  });

  emitGameEvent("response:submitted", sessionId, {
    questionId,
    participantId,
    responseId: response.id,
  });

  return NextResponse.json(
    {
      id: response.id,
      sessionId: response.sessionId,
      participantId: response.participantId,
      questionId: response.questionId,
      createdAt: response.createdAt.toISOString(),
    },
    { status: 201 }
  );
}
