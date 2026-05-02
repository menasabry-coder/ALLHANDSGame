import { NextResponse } from "next/server";
import {
  getSession,
  getParticipantCount,
  getQuestion,
  getQuestionResults,
  getAnalysisStatus,
  getAnalysis,
} from "@/lib/store";

interface Params {
  params: Promise<{ sessionId: string }>;
}

/**
 * GET /api/sessions/[sessionId]/status
 *
 * Returns session status, participant count, active question response count,
 * and analysis status for the admin and presenter dashboards.
 */
export async function GET(_request: Request, { params }: Params) {
  const { sessionId } = await params;

  const session = getSession(sessionId);
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const participantCount = getParticipantCount(sessionId);
  const analysisStatus = getAnalysisStatus(sessionId);
  const analysis = getAnalysis(sessionId);

  // Get response count for active question
  let activeQuestionResponseCount = 0;
  let activeQuestionLocked = false;
  if (session.activeQuestionId) {
    const activeQuestion = getQuestion(session.activeQuestionId);
    const results = getQuestionResults(session.activeQuestionId);
    activeQuestionResponseCount = results?.totalVotes ?? 0;
    activeQuestionLocked = activeQuestion?.locked ?? false;
  }

  const responseRate =
    participantCount > 0
      ? Math.round((activeQuestionResponseCount / participantCount) * 100)
      : 0;

  return NextResponse.json({
    sessionStatus: session.status,
    activeQuestionId: session.activeQuestionId,
    activeQuestionLocked,
    participantCount,
    activeQuestionResponseCount,
    responseRate,
    analysisStatus,
    hasCachedAnalysis: analysis !== undefined,
  });
}
