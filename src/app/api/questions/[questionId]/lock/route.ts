import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { emitGameEvent } from "@/lib/eventBus";
import {
  buildCurrentQuestionAnalysis,
  buildCumulativePulseAnalysis,
} from "@/lib/localAnalysis";

interface Params {
  params: Promise<{ questionId: string }>;
}

/**
 * POST /api/questions/[questionId]/lock
 *
 * Locks a question — no further responses are accepted once locked.
 * Computes CurrentQuestionAnalysis (local aggregate) and CumulativePulseAnalysis
 * and stores both in AnalysisResult.
 * Emits `question:locked`, `analysis:current-question-ready`, and
 * `analysis:cumulative-pulse-ready` events.
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

  // Resolve the session via responses or active question on session
  const firstResponse = await prisma.response.findFirst({
    where: { questionId },
    select: { sessionId: true },
  });
  // Fallback: find session that had this as active question
  const sessionRecord = firstResponse
    ? null
    : await prisma.gameSession.findFirst({
        where: { activeQuestionId: questionId },
        select: { id: true },
      });

  const sessionId =
    firstResponse?.sessionId ?? sessionRecord?.id ?? "unknown";

  if (sessionId !== "unknown") {
    // Clear session.activeQuestionId if this question was the active one.
    // This keeps the session and question states consistent so that unlock
    // followed by re-activation works cleanly.
    await prisma.gameSession.updateMany({
      where: { id: sessionId, activeQuestionId: questionId },
      data: { activeQuestionId: null },
    });

    // Emit locked event immediately so participants see lock state
    emitGameEvent("question:locked", sessionId, { questionId });

    // Compute local analyses (non-blocking — errors don't fail the lock)
    try {
      const [currentAnalysis, pulseAnalysis] = await Promise.all([
        buildCurrentQuestionAnalysis(sessionId, questionId),
        buildCumulativePulseAnalysis(sessionId),
      ]);

      const [cqRecord, cpRecord] = await Promise.all([
        prisma.analysisResult.create({
          data: {
            sessionId,
            questionId,
            analysisType: "current_question",
            payload: JSON.stringify(currentAnalysis),
          },
        }),
        prisma.analysisResult.create({
          data: {
            sessionId,
            questionId: null,
            analysisType: "cumulative_pulse",
            payload: JSON.stringify(pulseAnalysis),
          },
        }),
      ]);

      emitGameEvent("analysis:current-question-ready", sessionId, {
        questionId,
        analysisId: cqRecord.id,
        status: "complete",
        source: "local",
      });
      emitGameEvent("analysis:cumulative-pulse-ready", sessionId, {
        analysisId: cpRecord.id,
        status: "complete",
        source: "local",
      });
    } catch (err) {
      console.error("Local analysis failed (non-blocking):", err);
      // Create a minimal pending record so the presenter knows analysis was attempted
      const fallback = await prisma.analysisResult.create({
        data: {
          sessionId,
          questionId,
          analysisType: "current_question",
          payload: JSON.stringify({
            analysisType: "current_question",
            source: "local",
            status: "failed",
            responseCount: question._count.responses,
          }),
        },
      });
      emitGameEvent("analysis:current-question-ready", sessionId, {
        questionId,
        analysisId: fallback.id,
        status: "failed",
      });
    }
  }

  return NextResponse.json({
    id: updated.id,
    isLocked: updated.isLocked,
    isActive: updated.isActive,
  });
}
