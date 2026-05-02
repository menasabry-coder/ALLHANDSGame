import { NextResponse } from "next/server";
import {
  getSession,
  listQuestions,
  getQuestionResults,
  getParticipantCount,
  getAnalysis,
} from "@/lib/store";

interface Params {
  params: Promise<{ sessionId: string }>;
}

/**
 * GET /api/sessions/[sessionId]/export?format=json|csv
 *
 * Exports session data in JSON or CSV format.
 */
export async function GET(request: Request, { params }: Params) {
  const { sessionId } = await params;

  const session = getSession(sessionId);
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const url = new URL(request.url);
  const format = url.searchParams.get("format") ?? "json";
  const sessionCode = sessionId.slice(0, 8);

  const questions = listQuestions(sessionId);
  const questionsWithResults = questions.map((q) => {
    const r = getQuestionResults(q.id);
    return r ?? q;
  });
  const participantCount = getParticipantCount(sessionId);
  const analysis = getAnalysis(sessionId);

  if (format === "csv") {
    const rows: string[] = [];
    rows.push("Question Order,Question Text,Question Type,Option/Answer,Vote Count,Percentage");

    for (const q of questionsWithResults) {
      if (q.type === "mcq" && "votes" in q && "totalVotes" in q) {
        const qr = q as import("@/lib/types").QuestionWithResults;
        for (let i = 0; i < qr.options.length; i++) {
          const count = qr.votes[i] ?? 0;
          const pct = participantCount > 0 ? ((count / participantCount) * 100).toFixed(1) : "0.0";
          rows.push(
            [qr.order, csvEscape(qr.text), "mcq", csvEscape(qr.options[i]), count, pct].join(",")
          );
        }
      } else if (q.type === "freetext" && "freeTextAnswers" in q) {
        const qr = q as import("@/lib/types").QuestionWithResults;
        for (const answer of qr.freeTextAnswers) {
          rows.push(
            [qr.order, csvEscape(qr.text), "freetext", csvEscape(answer), 1, ""].join(",")
          );
        }
      }
    }

    const csv = rows.join("\n");
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="ai-arena-session-${sessionCode}-responses.csv"`,
      },
    });
  }

  // Default: JSON export
  const payload = {
    session: {
      id: session.id,
      name: session.name,
      status: session.status,
      createdAt: session.createdAt,
      participantCount,
    },
    questions: questionsWithResults,
    analysis: analysis ?? null,
    exportedAt: new Date().toISOString(),
  };

  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="ai-arena-session-${sessionCode}-raw.json"`,
    },
  });
}

function csvEscape(value: string | undefined): string {
  if (!value) return '""';
  const escaped = value.replace(/"/g, '""');
  return `"${escaped}"`;
}
