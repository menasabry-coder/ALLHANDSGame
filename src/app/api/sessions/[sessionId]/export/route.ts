import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { CumulativePulseAnalysis } from "@/types/analysis";

interface Params {
  params: Promise<{ sessionId: string }>;
}

function csvEscape(val: unknown): string {
  const s = val === null || val === undefined ? "" : String(val);
  if (s.includes(",") || s.includes('"') || s.includes("\n") || s.includes("\r")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function buildCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => csvEscape(r[h])).join(",")),
  ];
  return lines.join("\n");
}

/**
 * GET /api/sessions/[sessionId]/export
 *
 * Query params:
 *   ?format=json       — full session JSON export
 *   ?format=csv        — participant CSV
 *   ?format=markdown   — Markdown final report
 */
export async function GET(request: Request, { params }: Params) {
  const { sessionId } = await params;
  const url = new URL(request.url);
  const format = url.searchParams.get("format") ?? "json";

  const session = await prisma.gameSession.findUnique({
    where: { id: sessionId },
    include: { _count: { select: { participants: true } } },
  });

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const code = session.code;
  const baseFilename = `ai-arena-session-${code}`;

  // ------------------------------------------------------------------ JSON --
  if (format === "json") {
    const [participants, responses, analyses] = await Promise.all([
      prisma.participant.findMany({ where: { sessionId } }),
      prisma.response.findMany({
        where: { sessionId },
        include: { question: { include: { options: { orderBy: { order: "asc" } } } } },
      }),
      prisma.analysisResult.findMany({
        where: { sessionId },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const payload = {
      session: {
        id: session.id,
        code: session.code,
        title: session.title,
        status: session.status,
        participantCount: session._count.participants,
        createdAt: session.createdAt.toISOString(),
        updatedAt: session.updatedAt.toISOString(),
      },
      participantsSummary: {
        total: participants.length,
        byArea: tally(participants.map((p) => p.engineeringArea)),
        byExperience: tally(participants.map((p) => p.experienceLevel)),
        byUsage: tally(participants.map((p) => p.aiUsageLevel)),
        byAttitude: tally(participants.map((p) => p.aiAttitude)),
      },
      responses: responses.map((r) => ({
        id: r.id,
        participantId: r.participantId,
        questionId: r.questionId,
        questionTitle: r.question.title,
        questionType: r.question.questionType,
        roundId: r.question.roundId,
        payload: safeJson(r.payload),
        createdAt: r.createdAt.toISOString(),
      })),
      analyses: analyses.map((a) => ({
        id: a.id,
        analysisType: a.analysisType,
        questionId: a.questionId,
        payload: safeJson(a.payload),
        createdAt: a.createdAt.toISOString(),
      })),
    };

    return new NextResponse(JSON.stringify(payload, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${baseFilename}-export.json"`,
      },
    });
  }

  // ------------------------------------------------------------------ CSV ---
  if (format === "csv") {
    const participants = await prisma.participant.findMany({
      where: { sessionId },
      orderBy: { createdAt: "asc" },
    });

    const rows = participants.map((p) => ({
      participantId: p.id,
      engineeringArea: p.engineeringArea,
      experienceLevel: p.experienceLevel,
      aiUsageLevel: p.aiUsageLevel,
      aiAttitude: p.aiAttitude,
      persona: p.persona ?? "",
    }));

    const csv = buildCsv(rows);

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="${baseFilename}-participants.csv"`,
      },
    });
  }

  // --------------------------------------------------------------- Markdown --
  if (format === "markdown") {
    const [participants, analysisResults] = await Promise.all([
      prisma.participant.findMany({ where: { sessionId } }),
      prisma.analysisResult.findMany({
        where: { sessionId, analysisType: "cumulative_pulse" },
        orderBy: { createdAt: "desc" },
        take: 1,
      }),
    ]);

    let pulse: CumulativePulseAnalysis | null = null;
    if (analysisResults[0]) {
      try {
        pulse = JSON.parse(analysisResults[0].payload) as CumulativePulseAnalysis;
      } catch {
        // fallback to null
      }
    }

    const totalPart = participants.length;
    const byArea = tally(participants.map((p) => p.engineeringArea));

    const md = buildMarkdownReport({
      sessionCode: code,
      sessionTitle: session.title,
      generatedAt: new Date().toISOString(),
      totalParticipants: totalPart,
      byArea,
      pulse,
    });

    return new NextResponse(md, {
      headers: {
        "Content-Type": "text/markdown",
        "Content-Disposition": `attachment; filename="${baseFilename}-report.md"`,
      },
    });
  }

  return NextResponse.json({ error: "Invalid format. Use json, csv, or markdown." }, { status: 400 });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function tally(values: string[]): Record<string, number> {
  const result: Record<string, number> = {};
  for (const v of values) {
    result[v] = (result[v] ?? 0) + 1;
  }
  return result;
}

function safeJson(payload: string): unknown {
  try {
    return JSON.parse(payload);
  } catch {
    return {};
  }
}

interface MarkdownReportOptions {
  sessionCode: string;
  sessionTitle: string;
  generatedAt: string;
  totalParticipants: number;
  byArea: Record<string, number>;
  pulse: CumulativePulseAnalysis | null;
}

function buildMarkdownReport({
  sessionCode,
  sessionTitle,
  generatedAt,
  totalParticipants,
  byArea,
  pulse,
}: MarkdownReportOptions): string {
  const date = new Date(generatedAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const areaRows = Object.entries(byArea)
    .sort((a, b) => b[1] - a[1])
    .map(([area, count]) => {
      const pct = totalParticipants > 0 ? Math.round((count / totalParticipants) * 100) : 0;
      return `| ${area} | ${count} | ${pct}% |`;
    })
    .join("\n");

  const opportunitiesSection = pulse?.topOpportunities?.length
    ? pulse.topOpportunities
        .slice(0, 5)
        .map(
          (o, i) =>
            `### ${i + 1}. ${o.name} (Score: ${o.score}/100)\n${o.whyItMatters}${o.recommendedPilot ? "\n\n> ✅ Recommended for pilot" : ""}`
        )
        .join("\n\n")
    : "_No opportunities data available yet._";

  const risksSection = pulse?.topRisks?.length
    ? pulse.topRisks
        .slice(0, 5)
        .map(
          (r, i) =>
            `### ${i + 1}. ${r.name} (Score: ${r.score}/100)\n${r.whyItMatters}\n\n**Recommended control:** ${r.recommendedControl}`
        )
        .join("\n\n")
    : "_No risks data available yet._";

  const pilotsSection = pulse?.recommendedPilots?.length
    ? pulse.recommendedPilots
        .map(
          (p) =>
            `- **${p.title}** (${p.timeHorizon.replace("_", " ")}, Risk: ${p.riskLevel})\n  ${p.reason}\n  *First step: ${p.firstStep}*`
        )
        .join("\n")
    : "_No pilots recommended yet._";

  const guardrailsSection = pulse?.recommendedGuardrails?.length
    ? pulse.recommendedGuardrails.map((g) => `- ${g}`).join("\n")
    : "_No guardrails data available yet._";

  const aiScores = pulse
    ? `
| Metric | Score |
|--------|-------|
| AI Confidence Score | ${pulse.aiConfidenceScore}/100 |
| Opportunity Index | ${pulse.opportunityIndex}/100 |
| Risk Index | ${pulse.riskIndex}/100 |
| Governance Readiness | ${pulse.governanceReadinessScore}/100 |
`
    : "_Scores not yet computed._";

  return `# AI Arena Final Report
## ${sessionTitle}

**Session Code:** ${sessionCode}  
**Generated:** ${date}  
**Participants:** ${totalParticipants}

---

## 1. Executive Summary

${pulse?.executiveSummary ?? "This report summarises the AI readiness pulse from your engineering all-hands. Detailed scores will appear after cumulative analysis is triggered from the admin panel."}

---

## 2. Participation Summary

**Total participants:** ${totalParticipants}

| Engineering Area | Count | % |
|-----------------|-------|---|
${areaRows || "| — | — | — |"}

---

## 3. AI Opportunity Index

${aiScores}

---

## 4. AI Risk Index

${pulse?.riskIndex !== undefined ? `**Risk Index: ${pulse.riskIndex}/100**\n\n${pulse.changedSinceLastQuestion ?? ""}` : "_Risk data not yet computed._"}

---

## 5. Top AI Opportunities

${opportunitiesSection}

---

## 6. Top AI Risks

${risksSection}

---

## 7. Recommended Pilots

${pilotsSection}

---

## 8. Guardrails

${guardrailsSection}

---

## 9. Closing

${pulse?.presenterClosingLine ?? "Thank you for participating in AI Arena. Use this report to guide your AI adoption strategy."}

---

*Report generated by AI Arena — The Engineering Trust Game.*
`;
}
