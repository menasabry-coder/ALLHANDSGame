import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface Params {
  params: Promise<{ sessionId: string }>;
}

/**
 * GET /api/sessions/[sessionId]/results
 *
 * Returns aggregated response data for all questions in the session,
 * grouped by question.  Suitable for the presenter dashboard and report page.
 */
export async function GET(_req: Request, { params }: Params) {
  const { sessionId } = await params;

  const session = await prisma.gameSession.findUnique({
    where: { id: sessionId },
    include: {
      _count: { select: { participants: true } },
    },
  });

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  // Fetch all questions that belong to this session via responses, plus
  // all questions that have been seeded (they don't have a sessionId).
  // We join through responses to find which questions were answered in this session.
  const responses = await prisma.response.findMany({
    where: { sessionId },
    include: {
      question: {
        include: { options: { orderBy: { order: "asc" } } },
      },
    },
  });

  // Group responses by questionId
  const byQuestion = new Map<
    string,
    {
      question: (typeof responses)[0]["question"];
      responses: typeof responses;
    }
  >();

  for (const r of responses) {
    const entry = byQuestion.get(r.questionId) ?? {
      question: r.question,
      responses: [],
    };
    entry.responses.push(r);
    byQuestion.set(r.questionId, entry);
  }

  const questionResults = Array.from(byQuestion.values()).map(
    ({ question, responses: qResponses }) => {
      const tally: Record<string, number> = {};
      const freeTexts: string[] = [];

      for (const r of qResponses) {
        let payload: Record<string, unknown> = {};
        try {
          payload = JSON.parse(r.payload) as Record<string, unknown>;
        } catch {
          // malformed — skip
        }

        if (
          question.questionType === "single_choice" ||
          question.questionType === "multi_select"
        ) {
          const ids = (payload.selectedOptionIds as string[]) ?? [];
          for (const id of ids) {
            tally[id] = (tally[id] ?? 0) + 1;
          }
        } else if (question.questionType === "free_text") {
          if (typeof payload.freeText === "string" && payload.freeText) {
            freeTexts.push(payload.freeText);
          }
        }
      }

      return {
        question: {
          id: question.id,
          roundId: question.roundId,
          order: question.order,
          title: question.title,
          prompt: question.prompt,
          questionType: question.questionType,
          isLocked: question.isLocked,
          options: question.options,
        },
        responseCount: qResponses.length,
        tally,
        freeTexts,
      };
    }
  );

  // Also include the latest analysis results for this session
  const analyses = await prisma.analysisResult.findMany({
    where: { sessionId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    sessionId,
    participantCount: session._count.participants,
    questionResults,
    analyses: analyses.map((a) => ({
      id: a.id,
      questionId: a.questionId,
      analysisType: a.analysisType,
      payload: (() => {
        try {
          return JSON.parse(a.payload);
        } catch {
          return {};
        }
      })(),
      createdAt: a.createdAt.toISOString(),
    })),
  });
}
