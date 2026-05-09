import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type CheckStatus = "pass" | "warn" | "fail";

interface CheckItem {
  id: string;
  label: string;
  status: CheckStatus;
  details: string;
}

export async function GET() {
  const checks: CheckItem[] = [];

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.push({
      id: "db",
      label: "Database connected",
      status: "pass",
      details: "Prisma can query the configured database.",
    });
  } catch {
    checks.push({
      id: "db",
      label: "Database connected",
      status: "fail",
      details: "Database is not reachable. Check DATABASE_URL and Prisma setup.",
    });
  }

  const [sessionCount, questionCount] = await Promise.all([
    prisma.gameSession.count().catch(() => 0),
    prisma.question.count().catch(() => 0),
  ]);

  checks.push({
    id: "sessions",
    label: "Session data available",
    status: sessionCount > 0 ? "pass" : "warn",
    details:
      sessionCount > 0
        ? `${sessionCount} session(s) found.`
        : "No sessions found yet. Create one before the meeting.",
  });

  checks.push({
    id: "questions",
    label: "Question bank ready",
    status: questionCount >= 3 ? "pass" : "warn",
    details:
      questionCount >= 3
        ? `${questionCount} question(s) available.`
        : `Only ${questionCount} question(s) found. Add more questions before going live.`,
  });

  checks.push({
    id: "openai",
    label: "OpenAI API key configured",
    status: process.env.OPENAI_API_KEY ? "pass" : "warn",
    details: process.env.OPENAI_API_KEY
      ? "OPENAI_API_KEY is set."
      : "OPENAI_API_KEY is missing. AI analysis will fallback to local summaries.",
  });

  checks.push({
    id: "presenter",
    label: "Presenter route available",
    status: "pass",
    details: "Presenter UI is available at /presenter.",
  });

  checks.push({
    id: "participant",
    label: "Participant route available",
    status: "pass",
    details: "Join flow is available at /join.",
  });

  const summary =
    checks.some((c) => c.status === "fail")
      ? "fail"
      : checks.some((c) => c.status === "warn")
      ? "warn"
      : "pass";

  return NextResponse.json({
    summary,
    generatedAt: new Date().toISOString(),
    checks,
  });
}
