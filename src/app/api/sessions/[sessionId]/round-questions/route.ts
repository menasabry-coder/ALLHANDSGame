import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface Params {
  params: Promise<{ sessionId: string }>;
}

/**
 * GET /api/sessions/[sessionId]/round-questions?roundId=stock_market
 *
 * Returns all questions for a given round with:
 *  - Full option lists (including matrix rows/columns)
 *  - Live response tally for this session
 *  - isActive / isLocked state
 *
 * Used by the admin question-control panel, the presenter live results view,
 * and the participant play screen (active question fetch).
 */
export async function GET(request: Request, { params }: Params) {
  const { sessionId } = await params;
  const url = new URL(request.url);
  const roundId = url.searchParams.get("roundId");

  const session = await prisma.gameSession.findUnique({
    where: { id: sessionId },
  });

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  // Fetch questions for the round (all rounds if no roundId specified)
  const questions = await prisma.question.findMany({
    where: roundId ? { roundId } : undefined,
    orderBy: [{ roundId: "asc" }, { order: "asc" }],
    include: {
      options: { orderBy: { order: "asc" } },
      _count: { select: { responses: true } },
    },
  });

  // Fetch all responses for this session (to build tallies)
  const responses = await prisma.response.findMany({
    where: {
      sessionId,
      questionId: { in: questions.map((q) => q.id) },
    },
  });

  // Group responses by questionId
  const responsesByQuestion = new Map<string, typeof responses>();
  for (const r of responses) {
    const arr = responsesByQuestion.get(r.questionId) ?? [];
    arr.push(r);
    responsesByQuestion.set(r.questionId, arr);
  }

  const result = questions.map((q) => {
    const qResponses = responsesByQuestion.get(q.id) ?? [];

    // Build tally / allocation totals
    const tally: Record<string, number> = {};
    const allocationTotals: Record<string, number> = {};
    const allocationCounts: Record<string, number> = {};
    const matrixTally: Record<string, Record<string, number>> = {};
    const freeTexts: string[] = [];

    for (const r of qResponses) {
      let payload: Record<string, unknown> = {};
      try {
        payload = JSON.parse(r.payload) as Record<string, unknown>;
      } catch {
        // malformed
      }

      if (
        q.questionType === "single_choice" ||
        q.questionType === "multi_select"
      ) {
        const ids = (payload.selectedOptionIds as string[]) ?? [];
        for (const id of ids) {
          tally[id] = (tally[id] ?? 0) + 1;
        }
      } else if (q.questionType === "allocation") {
        const alloc = (payload.allocation as Record<string, number>) ?? {};
        for (const [optId, coins] of Object.entries(alloc)) {
          allocationTotals[optId] = (allocationTotals[optId] ?? 0) + coins;
          allocationCounts[optId] = (allocationCounts[optId] ?? 0) + 1;
        }
      } else if (q.questionType === "matrix") {
        const sel =
          (payload.matrixSelections as Record<string, string>) ?? {};
        for (const [rowId, colId] of Object.entries(sel)) {
          if (!matrixTally[rowId]) matrixTally[rowId] = {};
          matrixTally[rowId][colId] =
            (matrixTally[rowId][colId] ?? 0) + 1;
        }
      } else if (q.questionType === "free_text") {
        if (typeof payload.freeText === "string" && payload.freeText) {
          freeTexts.push(payload.freeText);
        }
      }
    }

    // Market score for stock_market allocation questions
    // Score = Total coins invested (start/danger flags reserved for Phase 7)
    const marketScore =
      q.questionType === "allocation" && q.roundId === "stock_market"
        ? Object.values(allocationTotals).reduce((s, n) => s + n, 0)
        : undefined;

    // Risk priority for risk_casino allocation (RC1)
    // AI Risk Priority = Total Chips × Severity Multiplier (× 1.0 lack-of-control default)
    const severityMultiplier: Record<string, number> = {
      low: 1.0,
      medium: 1.3,
      "medium-high": 1.5,
      high: 1.7,
      critical: 2.0,
    };
    const riskScores: Record<string, number> | undefined =
      q.questionType === "allocation" && q.roundId === "risk_casino"
        ? Object.fromEntries(
            q.options.map((o) => {
              const chips = allocationTotals[o.id] ?? 0;
              const sm =
                severityMultiplier[o.severity?.toLowerCase() ?? ""] ?? 1.0;
              return [o.id, chips * sm];
            })
          )
        : undefined;

    return {
      id: q.id,
      roundId: q.roundId,
      order: q.order,
      title: q.title,
      prompt: q.prompt,
      questionType: q.questionType,
      isActive: q.isActive,
      isLocked: q.isLocked,
      options: q.options,
      responseCount: qResponses.length,
      tally,
      allocationTotals,
      allocationCounts,
      matrixTally,
      freeTexts,
      marketScore,
      riskScores,
    };
  });

  return NextResponse.json({
    sessionId,
    roundId: roundId ?? null,
    questions: result,
  });
}
