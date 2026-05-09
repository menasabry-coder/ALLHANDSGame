import { NextResponse } from "next/server";
import { openai } from "@/lib/openai";
import { prisma } from "@/lib/prisma";

interface Params {
  params: Promise<{ sessionId: string }>;
}

/**
 * POST /api/sessions/[sessionId]/prompt
 *
 * Send a custom prompt to OpenAI with the session context.
 * Body: { prompt: string }
 */
export async function POST(request: Request, { params }: Params) {
  const { sessionId } = await params;

  if (!openai) {
    return NextResponse.json(
      {
        error:
          "OpenAI is not configured. Set the OPENAI_API_KEY environment variable.",
      },
      { status: 503 }
    );
  }

  // Fetch session and participant count from Prisma
  const session = await prisma.gameSession.findUnique({
    where: { id: sessionId },
    include: { _count: { select: { participants: true } } },
  });
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const body = await request.json();
  const prompt: string | undefined = body?.prompt;

  if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
    return NextResponse.json(
      { error: "Provide a `prompt` (string)" },
      { status: 400 }
    );
  }

  const participantCount = session._count.participants;

  // Fetch all responses with question + option data
  const responses = await prisma.response.findMany({
    where: { sessionId },
    include: {
      question: {
        include: { options: { orderBy: { order: "asc" } } },
      },
    },
  });

  // Aggregate by question
  const questionMap = new Map<
    string,
    {
      question: (typeof responses)[0]["question"];
      tally: Record<string, number>;
      freeTexts: string[];
      totalVotes: number;
    }
  >();

  for (const r of responses) {
    if (!questionMap.has(r.questionId)) {
      questionMap.set(r.questionId, {
        question: r.question,
        tally: {},
        freeTexts: [],
        totalVotes: 0,
      });
    }
    const entry = questionMap.get(r.questionId)!;
    let payload: Record<string, unknown> = {};
    try {
      payload = JSON.parse(r.payload) as Record<string, unknown>;
    } catch {
      // malformed — skip
    }

    if (
      r.question.questionType === "single_choice" ||
      r.question.questionType === "multi_select"
    ) {
      const ids = (payload.selectedOptionIds as string[]) ?? [];
      for (const id of ids) {
        entry.tally[id] = (entry.tally[id] ?? 0) + 1;
      }
    } else if (r.question.questionType === "free_text") {
      if (typeof payload.freeText === "string" && payload.freeText) {
        entry.freeTexts.push(payload.freeText);
      }
    }
    entry.totalVotes += 1;
  }

  const questionsWithResults = Array.from(questionMap.values())
    .sort((a, b) => a.question.order - b.question.order)
    .map(({ question: q, tally, freeTexts, totalVotes }) => {
      const labelById = Object.fromEntries(q.options.map((o) => [o.id, o.label]));
      return {
        order: q.order,
        text: q.title,
        type: q.questionType,
        options: q.options.map((o) => o.label),
        tally,
        labelById,
        freeTexts,
        totalVotes,
      };
    });

  const contextBlock = `Session: "${session.title}"
Total participants: ${participantCount}

${questionsWithResults.map((q) => {
  if (q.type === "free_text") {
    return `Question ${q.order} (Free Text): "${q.text}"
Answers (${q.freeTexts.length}):
${q.freeTexts.map((a) => `  - "${a}"`).join("\n") || "  (no answers yet)"}`;
  }
  return `Question ${q.order} (${q.type}): "${q.text}"
Options & Votes:
${q.options.map((opt) => {
  const optId = Object.entries(q.labelById).find(([, l]) => l === opt)?.[0] ?? "";
  const votes = q.tally[optId] ?? 0;
  const pct = participantCount > 0 ? Math.round((votes / participantCount) * 100) : 0;
  return `  - ${opt}: ${votes} votes (${pct}% of participants)`;
}).join("\n")}
Total votes: ${q.totalVotes}`;
}).join("\n\n")}`;

  try {
    const chatRes = await openai.chat.completions.create({
      model: process.env.OPENAI_ANALYSIS_MODEL ?? "gpt-4.1",
      messages: [
        {
          role: "system",
          content: `You are an expert analyst for a live polling session at an engineering all-hands meeting. You have access to the full session data below. Respond helpfully to the user's query based on this context.\n\n${contextBlock}`,
        },
        { role: "user", content: prompt.trim() },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });

    const response = chatRes.choices[0]?.message?.content?.trim() ?? "";
    return NextResponse.json({ response });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "OpenAI request failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
