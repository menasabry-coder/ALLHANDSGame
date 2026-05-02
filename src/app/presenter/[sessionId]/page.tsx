"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import ResultsChart from "@/components/ResultsChart";
import type {
  Session,
  QuestionWithResults,
  AIAnalysis,
  GamePulse,
  AnalysisStatus,
} from "@/lib/types";

// ---------------------------------------------------------------------------
// Tone helpers
// ---------------------------------------------------------------------------
const TONE_COLORS = {
  opportunity: {
    bg: "bg-emerald-900/30",
    border: "border-emerald-600",
    badge: "bg-emerald-800 text-emerald-200",
    text: "text-emerald-300",
    dot: "bg-emerald-400",
  },
  risk: {
    bg: "bg-red-900/30",
    border: "border-red-600",
    badge: "bg-red-800 text-red-200",
    text: "text-red-300",
    dot: "bg-red-400",
  },
  warning: {
    bg: "bg-amber-900/30",
    border: "border-amber-600",
    badge: "bg-amber-800 text-amber-200",
    text: "text-amber-300",
    dot: "bg-amber-400",
  },
  neutral: {
    bg: "bg-slate-800/40",
    border: "border-slate-600",
    badge: "bg-slate-700 text-slate-200",
    text: "text-slate-300",
    dot: "bg-slate-400",
  },
};

function toneStyle(tone?: string) {
  return TONE_COLORS[tone as keyof typeof TONE_COLORS] ?? TONE_COLORS.neutral;
}

// ---------------------------------------------------------------------------
// Score bar component
// ---------------------------------------------------------------------------
function ScoreBar({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-gray-300">{label}</span>
        <span className="font-bold text-white">{value}</span>
      </div>
      <div className="w-full bg-gray-700 rounded-full h-3">
        <div
          className={`${color} h-3 rounded-full transition-all duration-700`}
          style={{ width: `${Math.min(value, 100)}%` }}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Question Analysis Panel
// ---------------------------------------------------------------------------
function QuestionAnalysisPanel({
  analysis,
  activeQuestionId,
}: {
  analysis: AIAnalysis | null;
  activeQuestionId: string | null;
}) {
  if (!analysis) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 text-lg">
        <span className="animate-pulse">Analysis pending...</span>
      </div>
    );
  }

  // Show insight for active question if available, otherwise last insight
  const insight = activeQuestionId
    ? (analysis.questionInsights.find((qi) => qi.questionId === activeQuestionId) ??
      analysis.questionInsights[analysis.questionInsights.length - 1])
    : analysis.questionInsights[analysis.questionInsights.length - 1];

  if (!insight) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 text-lg">
        No insight available yet
      </div>
    );
  }

  const style = toneStyle(insight.tone);

  return (
    <div className={`rounded-2xl p-5 border h-full ${style.bg} ${style.border} overflow-y-auto`}>
      <div className="flex items-center gap-2 mb-3">
        <span className={`text-xs px-2 py-1 rounded-full font-semibold uppercase ${style.badge}`}>
          {insight.tone ?? "neutral"}
        </span>
        {insight.controversyScore !== undefined && insight.controversyScore > 60 && (
          <span className="text-xs px-2 py-1 rounded-full bg-orange-800 text-orange-200 font-semibold uppercase">
            🔥 Controversial
          </span>
        )}
      </div>

      {insight.headline && (
        <h3 className="text-2xl font-extrabold text-white mb-2 leading-tight">
          {insight.headline}
        </h3>
      )}

      <p className={`text-base mb-4 ${style.text}`}>{insight.insight}</p>

      {insight.winningPattern && (
        <div className="mb-3">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Winning Pattern</p>
          <p className="text-white text-sm font-medium">{insight.winningPattern}</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 mb-4">
        {insight.agreementLevel !== undefined && (
          <div className="bg-gray-900/50 rounded-lg p-3">
            <p className="text-xs text-gray-400 mb-1">Agreement</p>
            <div className="flex items-end gap-1">
              <span className="text-2xl font-bold text-white">{insight.agreementLevel}</span>
              <span className="text-gray-400 text-sm mb-1">/100</span>
            </div>
          </div>
        )}
        {insight.controversyScore !== undefined && (
          <div className="bg-gray-900/50 rounded-lg p-3">
            <p className="text-xs text-gray-400 mb-1">Controversy</p>
            <div className="flex items-end gap-1">
              <span className="text-2xl font-bold text-white">{insight.controversyScore}</span>
              <span className="text-gray-400 text-sm mb-1">/100</span>
            </div>
          </div>
        )}
      </div>

      {insight.keyInsights && insight.keyInsights.length > 0 && (
        <div className="mb-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Key Insights</p>
          <ul className="space-y-1">
            {insight.keyInsights.map((ki, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                <span className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${style.dot}`} />
                {ki}
              </li>
            ))}
          </ul>
        </div>
      )}

      {insight.automotiveInterpretation && (
        <div className="mb-4 bg-blue-900/20 border border-blue-700/40 rounded-lg p-3">
          <p className="text-xs text-blue-400 uppercase tracking-wide mb-1">🚗 Automotive Context</p>
          <p className="text-sm text-blue-100">{insight.automotiveInterpretation}</p>
        </div>
      )}

      {insight.presenterTalkingPoint && (
        <div className="mb-3 bg-purple-900/20 border border-purple-700/40 rounded-lg p-3">
          <p className="text-xs text-purple-400 uppercase tracking-wide mb-1">💬 Talking Point</p>
          <p className="text-sm text-white font-medium">{insight.presenterTalkingPoint}</p>
        </div>
      )}

      {insight.suggestedFollowUp && (
        <div className="bg-gray-800/50 border border-gray-600 rounded-lg p-3">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">❓ Suggested Follow-up</p>
          <p className="text-sm text-gray-200 italic">&ldquo;{insight.suggestedFollowUp}&rdquo;</p>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Cumulative Pulse Panel
// ---------------------------------------------------------------------------
function GamePulsePanel({ pulse }: { pulse: GamePulse | null | undefined }) {
  if (!pulse) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 text-lg">
        <span className="animate-pulse">Pulse data pending...</span>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto space-y-4">
      {/* Score bars */}
      <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700 space-y-3">
        <ScoreBar label="AI Confidence Score" value={pulse.aiConfidenceScore} color="bg-blue-500" />
        <ScoreBar label="Opportunity Index" value={pulse.opportunityIndex} color="bg-emerald-500" />
        <ScoreBar label="Risk Index" value={pulse.riskIndex} color="bg-red-500" />
        <ScoreBar
          label="Governance Readiness"
          value={pulse.governanceReadinessScore}
          color="bg-purple-500"
        />
      </div>

      <div className="grid grid-cols-1 gap-3">
        {/* Opportunities */}
        {pulse.topOpportunities.length > 0 && (
          <div className="bg-emerald-900/20 border border-emerald-700/40 rounded-xl p-4">
            <p className="text-xs text-emerald-400 uppercase tracking-wide font-semibold mb-2">
              🚀 Top Opportunities
            </p>
            <ul className="space-y-1">
              {pulse.topOpportunities.map((o, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-emerald-100">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
                  {o}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Risks */}
        {pulse.topRisks.length > 0 && (
          <div className="bg-red-900/20 border border-red-700/40 rounded-xl p-4">
            <p className="text-xs text-red-400 uppercase tracking-wide font-semibold mb-2">
              ⚠️ Top Risks
            </p>
            <ul className="space-y-1">
              {pulse.topRisks.map((r, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-red-100">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
                  {r}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Pilots */}
        {pulse.recommendedPilots.length > 0 && (
          <div className="bg-blue-900/20 border border-blue-700/40 rounded-xl p-4">
            <p className="text-xs text-blue-400 uppercase tracking-wide font-semibold mb-2">
              🧪 Recommended Pilots
            </p>
            <ul className="space-y-1">
              {pulse.recommendedPilots.map((p, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-blue-100">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />
                  {p}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Guardrails */}
        {pulse.recommendedGuardrails.length > 0 && (
          <div className="bg-amber-900/20 border border-amber-700/40 rounded-xl p-4">
            <p className="text-xs text-amber-400 uppercase tracking-wide font-semibold mb-2">
              🛡 Recommended Guardrails
            </p>
            <ul className="space-y-1">
              {pulse.recommendedGuardrails.map((g, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-amber-100">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                  {g}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {pulse.changedSinceLastQuestion && (
        <div className="bg-gray-800/50 border border-gray-600 rounded-xl p-3 text-center">
          <p className="text-xs text-gray-400 mb-1">Latest shift</p>
          <p className="text-sm text-gray-200 italic">{pulse.changedSinceLastQuestion}</p>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Analysis status badge
// ---------------------------------------------------------------------------
function AnalysisStatusBadge({ status }: { status: AnalysisStatus }) {
  const map: Record<AnalysisStatus, { label: string; cls: string }> = {
    not_started: { label: "Not analyzed", cls: "bg-gray-700 text-gray-400" },
    running: { label: "⟳ Analyzing…", cls: "bg-blue-800 text-blue-200 animate-pulse" },
    complete: { label: "✓ Analysis ready", cls: "bg-emerald-800 text-emerald-200" },
    failed: { label: "✗ Analysis failed", cls: "bg-red-800 text-red-200" },
  };
  const { label, cls } = map[status];
  return (
    <span className={`text-xs px-2 py-1 rounded-full font-semibold ${cls}`}>{label}</span>
  );
}

// ---------------------------------------------------------------------------
// Main presenter page
// ---------------------------------------------------------------------------
export default function PresenterPage() {
  const { sessionId } = useParams<{ sessionId: string }>();

  const [session, setSession] = useState<Session | null>(null);
  const [questions, setQuestions] = useState<QuestionWithResults[]>([]);
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [analysisStatus, setAnalysisStatus] = useState<AnalysisStatus>("not_started");
  const [activePanel, setActivePanel] = useState<"question" | "pulse">("question");
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [qRes, statusRes] = await Promise.all([
        fetch(`/api/sessions/${sessionId}/questions`),
        fetch(`/api/sessions/${sessionId}/analyze`),
      ]);
      if (!qRes.ok) {
        setError("Session not found");
        return;
      }
      const qData = await qRes.json();
      setSession(qData.session);
      setQuestions(qData.questions);

      if (statusRes.ok) {
        const statusData = await statusRes.json();
        if (statusData.analysis) setAnalysis(statusData.analysis);
        if (statusData.status) setAnalysisStatus(statusData.status);
      }
    } catch {
      setError("Could not connect to server");
    }
  }, [sessionId]);

  useEffect(() => {
    let cancelled = false;
    const load = () => { if (!cancelled) fetchData(); };
    const iv = setInterval(load, 3000);
    const t = setTimeout(load, 0);
    return () => { cancelled = true; clearInterval(iv); clearTimeout(t); };
  }, [fetchData]);

  if (error) {
    return (
      <main className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <p className="text-2xl text-red-400">{error}</p>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <p className="text-gray-400 text-2xl animate-pulse">Loading presenter view…</p>
      </main>
    );
  }

  const activeQuestion = questions.find((q) => q.id === session.activeQuestionId);
  const totalVotesActive = activeQuestion?.totalVotes ?? 0;
  const responseRate =
    session.participantCount > 0
      ? Math.round((totalVotesActive / session.participantCount) * 100)
      : 0;

  return (
    <main className="min-h-screen bg-gray-950 text-white flex flex-col">
      {/* ── HEADER BAR ── */}
      <header className="flex items-center justify-between px-8 py-4 border-b border-gray-800 bg-gray-900/80 backdrop-blur shrink-0">
        <div className="flex items-center gap-4">
          <span className="text-3xl font-extrabold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            AI Arena
          </span>
          <span
            className={`text-sm px-3 py-1 rounded-full font-semibold ${
              session.status === "active"
                ? "bg-green-900 text-green-300"
                : session.status === "finished"
                  ? "bg-gray-700 text-gray-400"
                  : "bg-yellow-900 text-yellow-300"
            }`}
          >
            {session.status.toUpperCase()}
          </span>
        </div>

        <div className="text-center hidden md:block">
          <h1 className="text-xl font-bold text-white">{session.name}</h1>
        </div>

        <div className="flex items-center gap-6">
          {/* Participant count */}
          <div className="text-center">
            <p className="text-3xl font-extrabold text-white leading-none">
              {session.participantCount}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">participants</p>
          </div>
          {/* Response rate */}
          <div className="text-center">
            <p
              className={`text-3xl font-extrabold leading-none ${
                responseRate >= 80
                  ? "text-emerald-400"
                  : responseRate >= 50
                    ? "text-yellow-400"
                    : "text-red-400"
              }`}
            >
              {responseRate}%
            </p>
            <p className="text-xs text-gray-400 mt-0.5">response rate</p>
          </div>
          {/* Analysis status */}
          <AnalysisStatusBadge status={analysisStatus} />
        </div>
      </header>

      {/* ── MAIN CONTENT ── */}
      <div className="flex-1 grid grid-cols-1 xl:grid-cols-2 gap-0 overflow-hidden">

        {/* ── LEFT: Active Question + Chart ── */}
        <div className="flex flex-col border-r border-gray-800 overflow-hidden">
          {/* Active Question */}
          <div className="p-6 border-b border-gray-800">
            {activeQuestion ? (
              <>
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-green-400 text-sm font-semibold uppercase tracking-wide">
                    Live Now
                  </span>
                  {activeQuestion.locked && (
                    <span className="text-xs px-2 py-0.5 bg-red-800 text-red-200 rounded-full font-semibold ml-2">
                      🔒 Locked
                    </span>
                  )}
                </div>
                <h2 className="text-3xl font-extrabold text-white leading-tight">
                  Q{activeQuestion.order}: {activeQuestion.text}
                </h2>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <span className="w-3 h-3 rounded-full bg-gray-500" />
                <p className="text-gray-400 text-xl">
                  {session.status === "waiting"
                    ? "Waiting for game to start…"
                    : session.status === "finished"
                      ? "Session complete"
                      : "No active question"}
                </p>
              </div>
            )}
          </div>

          {/* Live Results Chart */}
          <div className="flex-1 p-6 overflow-y-auto">
            {activeQuestion ? (
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-4">
                  Live Results — {totalVotesActive} response{totalVotesActive !== 1 && "s"}
                </p>
                <ResultsChart question={activeQuestion} />
              </div>
            ) : (
              <div className="flex items-center justify-center h-32 text-gray-600 text-lg">
                No results to display
              </div>
            )}

            {/* Previous questions summary */}
            {questions.filter((q) => q.id !== session.activeQuestionId && q.totalVotes > 0).length > 0 && (
              <div className="mt-8">
                <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-3">
                  Previous Questions
                </p>
                <div className="space-y-4">
                  {questions
                    .filter((q) => q.id !== session.activeQuestionId && q.totalVotes > 0)
                    .map((q) => (
                      <div key={q.id} className="bg-gray-800/40 rounded-xl p-4 border border-gray-700">
                        <p className="text-sm font-semibold text-gray-300 mb-3">
                          Q{q.order}: {q.text}
                        </p>
                        <ResultsChart question={q} />
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT: Analysis Panel ── */}
        <div className="flex flex-col overflow-hidden">
          {/* Panel toggle */}
          <div className="flex border-b border-gray-800 shrink-0">
            <button
              onClick={() => setActivePanel("question")}
              className={`flex-1 py-3 text-sm font-semibold transition ${
                activePanel === "question"
                  ? "bg-gray-800 text-white border-b-2 border-blue-500"
                  : "text-gray-500 hover:text-white"
              }`}
            >
              📊 Current Question Analysis
            </button>
            <button
              onClick={() => setActivePanel("pulse")}
              className={`flex-1 py-3 text-sm font-semibold transition ${
                activePanel === "pulse"
                  ? "bg-gray-800 text-white border-b-2 border-purple-500"
                  : "text-gray-500 hover:text-white"
              }`}
            >
              🌐 Full Game Pulse
            </button>
          </div>

          <div className="flex-1 p-5 overflow-y-auto">
            {activePanel === "question" ? (
              <QuestionAnalysisPanel
                analysis={analysis}
                activeQuestionId={session.activeQuestionId}
              />
            ) : (
              <GamePulsePanel pulse={analysis?.pulse} />
            )}
          </div>
        </div>
      </div>

      {/* ── FOOTER: Talking point / Follow-up ── */}
      {analysis && activePanel === "question" && (() => {
        const insight = session.activeQuestionId
          ? analysis.questionInsights.find((qi) => qi.questionId === session.activeQuestionId)
          : analysis.questionInsights[analysis.questionInsights.length - 1];
        if (!insight?.presenterTalkingPoint) return null;
        return (
          <footer className="bg-gray-900 border-t border-gray-800 px-8 py-3 shrink-0">
            <div className="flex items-center gap-3">
              <span className="text-purple-400 text-lg shrink-0">💬</span>
              <p className="text-white text-sm font-medium">
                {insight.presenterTalkingPoint}
              </p>
            </div>
          </footer>
        );
      })()}
    </main>
  );
}
