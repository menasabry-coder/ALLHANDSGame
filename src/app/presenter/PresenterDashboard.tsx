"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import MetricCard from "@/components/MetricCard";
import Panel from "@/components/Panel";
import QRCode from "@/components/QRCode";
import AIInsights from "@/components/AIInsights";
import { GAME_NAME, GAME_SUBTITLE, ROUNDS } from "@/config/gameConfig";
import type { GameEvent, GameSessionDto } from "@/types/game";
import type { CumulativePulseAnalysis, CurrentQuestionAnalysis } from "@/types/analysis";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ParticipantStats {
  count: number;
  byArea: Record<string, number>;
  byAttitude: Record<string, number>;
  byUsage: Record<string, number>;
}

interface LiveQuestion {
  id: string;
  title: string;
  prompt: string;
  questionType: string;
  roundId: string;
  responseCount: number;
  tally: Record<string, number>;
  allocationTotals: Record<string, number>;
  freeTexts: string[];
  marketScore?: number;
  riskScores?: Record<string, number>;
  options: Array<{ id: string; label: string; category: string | null; description?: string | null }>;
}

// ---------------------------------------------------------------------------
// Simple horizontal bar chart — no external library
// ---------------------------------------------------------------------------

function DistributionBars({
  data,
  colorClass = "bg-blue-500",
  showValue = true,
}: {
  data: Record<string, number>;
  colorClass?: string;
  showValue?: boolean;
}) {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
  const max = Math.max(1, ...entries.map(([, v]) => v));

  if (entries.length === 0) {
    return <p className="text-xs text-gray-600 italic">No data yet.</p>;
  }

  return (
    <div className="space-y-2">
      {entries.map(([label, count]) => (
        <div key={label}>
          <div className="flex justify-between text-xs mb-0.5">
            <span className="text-gray-300 truncate max-w-[70%]">{label}</span>
            {showValue && <span className="text-gray-500">{count}</span>}
          </div>
          <div className="h-2 rounded-full bg-gray-800 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${colorClass}`}
              style={{ width: `${(count / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Live question results panel
// ---------------------------------------------------------------------------

/** Myth reality reveal card — shown in presenter view after question is locked */
function MythRealityCard({
  question,
}: {
  question: LiveQuestion;
}) {
  const metaOpts = question.options.filter((o) => o.category === "myth_meta");
  const recommendedAnswer = metaOpts.find((o) => o.label === "recommended_answer")?.description ?? null;
  const reality = metaOpts.find((o) => o.label === "reality")?.description ?? null;

  if (!recommendedAnswer && !reality) return null;

  return (
    <div className="rounded-xl border border-amber-800 bg-amber-900/20 p-4 space-y-2">
      <p className="text-xs font-bold text-amber-400 uppercase tracking-wider">
        💡 Engineering Reality
      </p>
      {recommendedAnswer && (
        <p className="text-sm text-amber-300">
          <span className="font-semibold">Recommended answer:</span>{" "}
          <span className="italic">{recommendedAnswer}</span>
        </p>
      )}
      {reality && (
        <p className="text-sm text-gray-300 leading-relaxed">{reality}</p>
      )}
    </div>
  );
}

function LiveQuestionResults({ question, showReveal }: { question: LiveQuestion; showReveal?: boolean }) {
  const roundLabel =
    question.roundId === "stock_market"
      ? "🏦 Stock Market"
      : question.roundId === "risk_casino"
      ? "🎰 Risk Casino"
      : question.roundId === "mythbusters"
      ? "💡 MythBusters"
      : question.roundId;

  const isMythVote =
    question.roundId === "mythbusters" &&
    question.questionType === "multi_select" &&
    question.options.some((o) => o.category === "vote");

  const rows = question.options.filter(
    (o) => o.category !== "column" && o.category !== "myth_meta"
  );
  const optionById = Object.fromEntries(question.options.map((o) => [o.id, o]));

  return (
    <Panel
      title={question.title}
      subtitle={`${roundLabel} · ${question.responseCount} response${question.responseCount !== 1 ? "s" : ""} · ${question.questionType}`}
    >
      {/* Myth vote: two separate bar charts — vote group + confidence group */}
      {isMythVote && (
        <div className="space-y-4">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Verdict
            </p>
            <DistributionBars
              data={Object.fromEntries(
                question.options
                  .filter((o) => o.category === "vote")
                  .map((o) => [o.label, question.tally[o.id] ?? 0])
              )}
              colorClass="bg-blue-500"
            />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Confidence
            </p>
            <DistributionBars
              data={Object.fromEntries(
                question.options
                  .filter((o) => o.category === "confidence")
                  .map((o) => [o.label, question.tally[o.id] ?? 0])
              )}
              colorClass="bg-purple-500"
            />
          </div>
          {/* Reality reveal shown after lock */}
          {showReveal && <MythRealityCard question={question} />}
        </div>
      )}

      {/* Regular single_choice / multi_select (non-myth) */}
      {!isMythVote &&
        (question.questionType === "single_choice" ||
          question.questionType === "multi_select") && (
          <DistributionBars
            data={Object.fromEntries(
              Object.entries(question.tally)
                .filter(([id]) => optionById[id]?.category !== "myth_meta")
                .map(([id, n]) => [optionById[id]?.label ?? id, n])
            )}
            colorClass="bg-blue-500"
          />
        )}

      {question.questionType === "allocation" && (
        <div className="space-y-2">
          {rows
            .map((opt) => ({
              label: opt.label,
              total: question.allocationTotals[opt.id] ?? 0,
              score: question.riskScores?.[opt.id],
            }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 10)
            .map(({ label, total, score }) => {
              const max = Math.max(
                1,
                ...rows.map((o) => question.allocationTotals[o.id] ?? 0)
              );
              return (
                <div key={label}>
                  <div className="flex justify-between text-xs mb-0.5">
                    <span className="text-gray-300 truncate max-w-[65%]">{label}</span>
                    <span className="text-gray-400">
                      {total} coins{score !== undefined ? ` · score ${score.toFixed(0)}` : ""}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-teal-500 transition-all duration-500"
                      style={{ width: `${(total / max) * 100}%` }}
                    />
                  </div>
                </div>
              );
            })}
          {question.marketScore !== undefined && (
            <p className="text-xs text-teal-400 font-semibold mt-2">
              💰 Total coins invested: {question.marketScore}
            </p>
          )}
        </div>
      )}

      {question.questionType === "free_text" && (
        <div className="space-y-2 max-h-40 overflow-y-auto">
          {question.freeTexts.length === 0 ? (
            <p className="text-xs text-gray-600 italic">No responses yet.</p>
          ) : (
            question.freeTexts.map((t, i) => (
              <div
                key={i}
                className="text-xs text-gray-300 bg-gray-900/60 rounded-lg px-3 py-2 italic"
              >
                &ldquo;{t}&rdquo;
              </div>
            ))
          )}
        </div>
      )}

      {question.questionType === "matrix" && (
        <p className="text-xs text-gray-500 italic">
          Matrix responses collected. Full heatmap available in Phase 8 analysis.
        </p>
      )}
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// Local analysis panel
// ---------------------------------------------------------------------------

interface AnalysisCardData {
  title: string;
  value: string;
  subtitle: string;
  tone: string;
}

interface LocalAnalysis {
  headline?: string;
  oneSentenceSummary?: string;
  presenterTalkingPoint?: string;
  controversyScore?: number;
  agreementLevel?: string;
  dashboardCards?: AnalysisCardData[];
  confidence?: string;
  source?: string;
  winningPattern?: CurrentQuestionAnalysis["winningPattern"];
  automotiveInterpretation?: string;
  suggestedFollowUpQuestion?: string;
  keyInsights?: CurrentQuestionAnalysis["keyInsights"];
}

function AnalysisPanel({ analysis }: { analysis: LocalAnalysis }) {
  const toneClass = (tone: string) => {
    if (tone === "positive") return "text-green-400";
    if (tone === "risk") return "text-red-400";
    if (tone === "warning") return "text-amber-400";
    return "text-gray-300";
  };

  const insightBadgeClass = (severity: string) => {
    if (severity === "opportunity") return "bg-green-900/40 text-green-300 border-green-700";
    if (severity === "risk") return "bg-red-900/40 text-red-300 border-red-700";
    if (severity === "warning") return "bg-amber-900/40 text-amber-300 border-amber-700";
    return "bg-blue-900/40 text-blue-300 border-blue-700";
  };

  return (
    <div className="rounded-xl border border-blue-900 bg-blue-950/30 p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-bold text-blue-400 uppercase tracking-wider">
          📊 Question Analysis {analysis.source === "local" ? "(Local)" : "(AI)"}
        </p>
        {analysis.confidence && (
          <span className={`text-xs px-2 py-0.5 rounded-full border ${
            analysis.confidence === "high"
              ? "border-green-700 text-green-400"
              : analysis.confidence === "medium"
              ? "border-amber-700 text-amber-400"
              : "border-gray-700 text-gray-500"
          }`}>
            {analysis.confidence} confidence
          </span>
        )}
      </div>
      {analysis.headline && (
        <p className="text-base font-semibold text-white">{analysis.headline}</p>
      )}
      {analysis.oneSentenceSummary && (
        <p className="text-xs text-gray-400">{analysis.oneSentenceSummary}</p>
      )}
      {analysis.winningPattern?.explanation && (
        <div className="rounded-lg bg-gray-900/60 border border-gray-800 px-3 py-2">
          <p className="text-xs font-semibold text-gray-400 mb-1">🏆 Winning pattern</p>
          <p className="text-xs text-gray-300">{analysis.winningPattern.explanation}</p>
        </div>
      )}
      {analysis.automotiveInterpretation && (
        <div className="rounded-lg bg-gray-900/60 border border-gray-800 px-3 py-2">
          <p className="text-xs font-semibold text-gray-400 mb-1">🚗 Automotive context</p>
          <p className="text-xs text-gray-300">{analysis.automotiveInterpretation}</p>
        </div>
      )}
      {analysis.keyInsights && analysis.keyInsights.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-400 mb-2">💡 Key Insights</p>
          <div className="flex flex-wrap gap-2">
            {analysis.keyInsights.map((insight, i) => (
              <div
                key={i}
                className={`rounded-lg border px-3 py-2 text-xs max-w-sm ${insightBadgeClass(insight.severity)}`}
              >
                <p className="font-semibold">{insight.title}</p>
                <p className="opacity-80 mt-0.5">{insight.explanation}</p>
              </div>
            ))}
          </div>
        </div>
      )}
      {analysis.dashboardCards && analysis.dashboardCards.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {analysis.dashboardCards.map((card, i) => (
            <div key={i} className="bg-gray-900/60 rounded-lg p-2 border border-gray-800">
              <p className="text-xs text-gray-500">{card.title}</p>
              <p className={`text-sm font-bold ${toneClass(card.tone)}`}>{card.value}</p>
              <p className="text-xs text-gray-600">{card.subtitle}</p>
            </div>
          ))}
        </div>
      )}
      {analysis.presenterTalkingPoint && (
        <div className="rounded-lg bg-gray-900/60 border border-gray-800 px-3 py-2">
          <p className="text-xs font-semibold text-gray-400 mb-1">🎤 Talking point</p>
          <p className="text-xs text-gray-300 italic">{analysis.presenterTalkingPoint}</p>
        </div>
      )}
      {analysis.suggestedFollowUpQuestion && (
        <div className="rounded-lg bg-gray-900/60 border border-gray-800 px-3 py-2">
          <p className="text-xs font-semibold text-gray-400 mb-1">❓ Suggested follow-up</p>
          <p className="text-xs text-gray-300 italic">{analysis.suggestedFollowUpQuestion}</p>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Cumulative Pulse Panel
// ---------------------------------------------------------------------------

function CumulativePulsePanel({ pulse }: { pulse: CumulativePulseAnalysis }) {
  return (
    <div className="rounded-xl border border-purple-800 bg-purple-950/20 p-5 space-y-5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-bold text-purple-400 uppercase tracking-wider mb-1">
            🔮 Cumulative AI Pulse
          </p>
          <p className="text-lg font-semibold text-white">{pulse.headline}</p>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full border ${
          pulse.confidence === "high"
            ? "border-green-700 text-green-400"
            : pulse.confidence === "medium"
            ? "border-amber-700 text-amber-400"
            : "border-gray-700 text-gray-500"
        }`}>
          {pulse.confidence} confidence
        </span>
      </div>

      {pulse.executiveSummary && (
        <p className="text-sm text-gray-300 leading-relaxed">{pulse.executiveSummary}</p>
      )}

      {/* Score metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-gray-900/60 rounded-xl p-3 border border-gray-800 text-center">
          <p className="text-2xl font-extrabold text-teal-300">{pulse.aiConfidenceScore}</p>
          <p className="text-xs text-gray-500 mt-0.5">AI Confidence</p>
        </div>
        <div className="bg-gray-900/60 rounded-xl p-3 border border-gray-800 text-center">
          <p className="text-2xl font-extrabold text-green-300">{pulse.opportunityIndex}</p>
          <p className="text-xs text-gray-500 mt-0.5">Opportunity Index</p>
        </div>
        <div className="bg-gray-900/60 rounded-xl p-3 border border-gray-800 text-center">
          <p className="text-2xl font-extrabold text-red-300">{pulse.riskIndex}</p>
          <p className="text-xs text-gray-500 mt-0.5">Risk Index</p>
        </div>
        <div className="bg-gray-900/60 rounded-xl p-3 border border-gray-800 text-center">
          <p className="text-2xl font-extrabold text-blue-300">{pulse.governanceReadinessScore}</p>
          <p className="text-xs text-gray-500 mt-0.5">Governance</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Top Opportunities */}
        {pulse.topOpportunities?.length > 0 && (
          <div>
            <p className="text-xs font-bold text-green-400 uppercase tracking-wider mb-2">
              🚀 Top Opportunities
            </p>
            <div className="space-y-2">
              {pulse.topOpportunities.slice(0, 3).map((o, i) => (
                <div key={i} className="rounded-lg bg-green-900/20 border border-green-800/40 px-3 py-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-green-300">{o.name}</p>
                    <span className="text-xs text-green-500">{o.score}/100</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5 leading-snug">{o.whyItMatters}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Top Risks */}
        {pulse.topRisks?.length > 0 && (
          <div>
            <p className="text-xs font-bold text-red-400 uppercase tracking-wider mb-2">
              ⚠️ Top Risks
            </p>
            <div className="space-y-2">
              {pulse.topRisks.slice(0, 3).map((r, i) => (
                <div key={i} className="rounded-lg bg-red-900/20 border border-red-800/40 px-3 py-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-red-300">{r.name}</p>
                    <span className="text-xs text-red-500">{r.score}/100</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5 leading-snug">{r.whyItMatters}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Pilots */}
      {pulse.recommendedPilots?.length > 0 && (
        <div>
          <p className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-2">
            🧪 Recommended Pilots
          </p>
          <div className="space-y-2">
            {pulse.recommendedPilots.slice(0, 3).map((p, i) => (
              <div key={i} className="rounded-lg bg-blue-900/10 border border-blue-800/30 px-3 py-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-xs font-semibold text-blue-300">{p.title}</p>
                  <span className="text-xs text-blue-500">{p.timeHorizon.replace("_", " ")}</span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">{p.firstStep}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Guardrails */}
      {pulse.recommendedGuardrails?.length > 0 && (
        <div>
          <p className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-2">
            🛡️ Guardrails
          </p>
          <ul className="space-y-1">
            {pulse.recommendedGuardrails.slice(0, 5).map((g, i) => (
              <li key={i} className="text-xs text-gray-300 flex gap-2">
                <span className="text-amber-500 shrink-0">•</span>
                <span>{g}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {pulse.changedSinceLastQuestion && (
        <p className="text-xs text-purple-400 italic border-t border-gray-800 pt-3">
          📈 {pulse.changedSinceLastQuestion}
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// AI Chat panel
// ---------------------------------------------------------------------------

function AIChatPanel({ sessionId }: { sessionId: string }) {
  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = async () => {
    const q = prompt.trim();
    if (!q) return;
    setLoading(true);
    setError(null);
    setResponse(null);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/prompt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: q }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Request failed");
      } else {
        setResponse(data.response ?? "");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not connect");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-800/70 rounded-2xl p-6 border border-cyan-700/50">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-2xl">💬</span>
        <h2 className="text-xl font-bold">Ask AI About This Session</h2>
      </div>
      <p className="text-gray-400 text-sm mb-4">
        Ask anything about the team&apos;s responses, patterns, or insights from this session.
      </p>
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !loading && send()}
          placeholder="e.g. What are the biggest AI adoption concerns?"
          className="flex-1 rounded-xl bg-gray-900 border border-gray-700 px-4 py-2.5 text-sm focus:outline-none focus:border-cyan-500 text-white placeholder-gray-600"
          disabled={loading}
        />
        <button
          onClick={send}
          disabled={loading || !prompt.trim()}
          className="bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl px-5 py-2.5 text-sm font-semibold transition"
        >
          {loading ? "…" : "Ask"}
        </button>
      </div>
      {error && (
        <div className="bg-red-900/30 border border-red-700 rounded-lg p-3 mb-3">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}
      {loading && (
        <div className="flex items-center gap-3 py-4">
          <div className="w-5 h-5 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin shrink-0" />
          <p className="text-gray-400 text-sm">Thinking…</p>
        </div>
      )}
      {response && (
        <div className="bg-gray-900/60 rounded-xl p-4 border border-gray-700">
          <p className="text-xs font-semibold text-cyan-400 uppercase tracking-wide mb-2">AI Response</p>
          <p className="text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">{response}</p>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main dashboard
// ---------------------------------------------------------------------------

export default function PresenterDashboard({
  sessionId,
}: {
  sessionId: string;
}) {
  const [session, setSession] = useState<GameSessionDto | null>(null);
  const [stats, setStats] = useState<ParticipantStats>({
    count: 0,
    byArea: {},
    byAttitude: {},
    byUsage: {},
  });
  const [joinUrl, setJoinUrl] = useState("");
  const [loadError, setLoadError] = useState("");
  const [activeRoundTab, setActiveRoundTab] = useState("stock_market");
  const [liveQuestion, setLiveQuestion] = useState<LiveQuestion | null>(null);
  const [lockedQuestion, setLockedQuestion] = useState<LiveQuestion | null>(null);
  const [currentAnalysis, setCurrentAnalysis] = useState<LocalAnalysis | null>(null);
  const [cumulativePulse, setCumulativePulse] = useState<CumulativePulseAnalysis | null>(null);
  const esRef = useRef<EventSource | null>(null);

  // Compute join URL once we have the session code
  useEffect(() => {
    if (typeof window !== "undefined" && session?.code) {
      setJoinUrl(`${window.location.origin}/join?code=${session.code}`);
    }
  }, [session?.code]);

  // Fetch session and stats
  const fetchStats = useCallback(async () => {
    if (!sessionId) return;
    try {
      const [sRes, pRes] = await Promise.all([
        fetch(`/api/sessions/${sessionId}`),
        fetch(`/api/sessions/${sessionId}/participants`),
      ]);
      if (sRes.ok) {
        const s = await sRes.json();
        setSession(s);
      } else {
        setLoadError("Session not found.");
      }
      if (pRes.ok) {
        const p = await pRes.json();
        setStats(p);
      }
    } catch {
      setLoadError("Could not load session data.");
    }
  }, [sessionId]);

  // Fetch live results for active question
  const fetchLiveQuestion = useCallback(
    async (questionId: string | null | undefined) => {
      if (!questionId || !sessionId) {
        setLiveQuestion(null);
        return;
      }
      try {
        const res = await fetch(
          `/api/sessions/${sessionId}/round-questions`
        );
        if (res.ok) {
          const data = await res.json();
          const found = (data.questions as LiveQuestion[]).find(
            (q) => q.id === questionId
          );
          setLiveQuestion(found ?? null);
        }
      } catch {
        // ignore
      }
    },
    [sessionId]
  );

  // Fetch latest analysis for a question after it locks
  const fetchAnalysis = useCallback(
    async (questionId: string) => {
      if (!sessionId) return;
      try {
        const res = await fetch(
          `/api/sessions/${sessionId}/analyze?type=current_question&questionId=${questionId}`
        );
        if (res.ok) {
          const data = await res.json() as { results: Array<{ payload: LocalAnalysis }> };
          if (data.results[0]?.payload) {
            setCurrentAnalysis(data.results[0].payload);
          }
        }
      } catch {
        // ignore
      }
    },
    [sessionId]
  );

  // Fetch latest cumulative pulse analysis
  const fetchCumulativePulse = useCallback(async () => {
    if (!sessionId) return;
    try {
      const res = await fetch(
        `/api/sessions/${sessionId}/analyze?type=cumulative_pulse`
      );
      if (res.ok) {
        const data = await res.json() as { results: Array<{ payload: CumulativePulseAnalysis }> };
        if (data.results[0]?.payload) {
          setCumulativePulse(data.results[0].payload);
        }
      }
    } catch {
      // ignore
    }
  }, [sessionId]);

  useEffect(() => {
    fetchStats();
    fetchCumulativePulse();
  }, [fetchStats, fetchCumulativePulse]);

  // SSE subscription
  useEffect(() => {
    if (!sessionId) return;

    const es = new EventSource(`/api/events?sessionId=${sessionId}`);
    esRef.current = es;

    es.onmessage = (e) => {
      try {
        const event: GameEvent = JSON.parse(e.data as string);

        if (
          event.type === "participant:joined" ||
          event.type === "session:updated"
        ) {
          fetchStats();
        }

        if (event.type === "session:updated") {
          const p = event.payload as { status?: string };
          if (p.status) {
            setSession((prev) =>
              prev
                ? { ...prev, status: p.status as GameSessionDto["status"] }
                : prev
            );
          }
        }

        if (event.type === "question:activated") {
          const p = event.payload as { questionId: string | null };
          setSession((prev) =>
            prev ? { ...prev, activeQuestionId: p.questionId } : prev
          );
          setLockedQuestion(null);
          setCurrentAnalysis(null);
          fetchLiveQuestion(p.questionId);
        }

        if (event.type === "response:submitted") {
          // Refresh live results when a new response comes in
          setSession((prev) => {
            if (prev?.activeQuestionId) {
              fetchLiveQuestion(prev.activeQuestionId);
            }
            return prev;
          });
        }

        if (event.type === "question:locked") {
          // Move active question to locked state and refresh
          const p = event.payload as { questionId: string };
          setSession((prev) => {
            if (prev?.activeQuestionId) {
              fetchLiveQuestion(prev.activeQuestionId);
            }
            return prev ? { ...prev, activeQuestionId: null } : prev;
          });
          // Fetch question data for locked reveal
          setTimeout(async () => {
            try {
              const res = await fetch(
                `/api/sessions/${sessionId}/round-questions`
              );
              if (res.ok) {
                const data = await res.json();
                const found = (data.questions as LiveQuestion[]).find(
                  (q) => q.id === p.questionId
                );
                if (found) setLockedQuestion(found);
              }
            } catch { /* ignore */ }
            fetchAnalysis(p.questionId);
          }, 500);
        }

        if (event.type === "analysis:current-question-ready") {
          const p = event.payload as { questionId: string; status: string };
          if (p.status === "complete") {
            fetchAnalysis(p.questionId);
          }
        }

        if (event.type === "analysis:cumulative-pulse-ready") {
          fetchCumulativePulse();
        }
      } catch {
        // ignore
      }
    };

    return () => {
      es.close();
    };
  }, [sessionId, fetchStats, fetchLiveQuestion, fetchAnalysis, fetchCumulativePulse]);

  // When session loads, load live question if one is active
  useEffect(() => {
    if (session?.activeQuestionId) {
      fetchLiveQuestion(session.activeQuestionId);
    } else {
      setLiveQuestion(null);
    }
  }, [session?.activeQuestionId, fetchLiveQuestion]);

  // ---------------------------------------------------------------------------
  // Render: no session selected
  // ---------------------------------------------------------------------------

  if (!sessionId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-8">
        <h1 className="text-3xl font-bold text-gray-300">
          No session selected.
        </h1>
        <p className="text-gray-500 text-sm">
          Go to{" "}
          <a href="/admin" className="text-blue-400 underline">
            Admin
          </a>{" "}
          to create or start a session, then open the presenter view from there.
        </p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex items-center justify-center min-h-screen p-8">
        <p className="text-red-400">{loadError}</p>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render: full dashboard
  // ---------------------------------------------------------------------------

  const currentRound = ROUNDS.find((r) => r.id === activeRoundTab);

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 p-8 gap-8">
      {/* Header */}
      <header className="flex items-start justify-between gap-6">
        <div>
          <h1 className="text-5xl font-extrabold tracking-tight bg-gradient-to-r from-teal-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
            {GAME_NAME}
          </h1>
          <p className="text-gray-400 text-lg mt-1">{GAME_SUBTITLE}</p>
          {session && (
            <p className="text-gray-500 text-sm mt-2 font-mono">
              {session.title} &middot;{" "}
              <span className="font-bold text-gray-300 tracking-widest">
                {session.code}
              </span>
            </p>
          )}
        </div>

        {/* QR Code */}
        {joinUrl && (
          <div className="flex flex-col items-center gap-2 shrink-0">
            <QRCode value={joinUrl} size={140} />
            <p className="text-xs text-gray-500">Scan to join</p>
            <p className="text-xs font-mono font-bold text-gray-300 tracking-widest">
              {session?.code}
            </p>
          </div>
        )}
      </header>

      {/* Metrics row */}
      <div className="grid grid-cols-3 gap-4">
        <MetricCard
          label="Participants"
          value={stats.count}
          description="Joined this session"
          icon="👥"
          accent="teal"
        />
        <MetricCard
          label="Active Round"
          value={currentRound?.name ?? session?.activeRoundId ?? "—"}
          description="Current game round"
          icon="🎯"
          accent="blue"
        />
        <MetricCard
          label="Session Status"
          value={session?.status ?? "—"}
          description="Game state"
          icon="📡"
          accent="purple"
        />
      </div>

      {/* Round tabs */}
      <div className="flex gap-2 flex-wrap">
        {ROUNDS.map((r) => (
          <button
            key={r.id}
            onClick={() => setActiveRoundTab(r.id)}
            className={[
              "px-4 py-1.5 rounded-lg text-xs font-semibold border transition",
              activeRoundTab === r.id
                ? "border-blue-500 bg-blue-600/20 text-white"
                : "border-gray-700 bg-gray-900 text-gray-400 hover:border-gray-600 hover:text-white",
            ].join(" ")}
          >
            {r.name}
          </button>
        ))}
      </div>

      {/* Live question results — shown when a question is active */}
      {liveQuestion && (
        <LiveQuestionResults question={liveQuestion} />
      )}

      {/* Locked question results + reality reveal + analysis */}
      {!liveQuestion && lockedQuestion && (
        <div className="space-y-4">
          <LiveQuestionResults question={lockedQuestion} showReveal />
          {currentAnalysis && <AnalysisPanel analysis={currentAnalysis} />}
        </div>
      )}

      {!liveQuestion && !lockedQuestion && (
        <div className="rounded-xl border border-gray-800 bg-gray-900/20 px-6 py-4 text-center">
          <p className="text-gray-600 text-sm italic">
            No active question. Activate a question from the{" "}
            <a href="/admin" className="text-blue-400 underline">
              Admin panel
            </a>{" "}
            to see live results here.
          </p>
        </div>
      )}

      {/* Participant distribution panels */}
      <div className="grid grid-cols-3 gap-6">
        <Panel title="Engineering Area" subtitle="Distribution of participants">
          <DistributionBars data={stats.byArea} colorClass="bg-teal-500" />
        </Panel>

        <Panel title="AI Attitude" subtitle="How participants feel about AI">
          <DistributionBars data={stats.byAttitude} colorClass="bg-blue-500" />
        </Panel>

        <Panel title="AI Usage" subtitle="Current adoption level">
          <DistributionBars data={stats.byUsage} colorClass="bg-purple-500" />
        </Panel>
      </div>

      {/* Cumulative pulse analysis */}
      {cumulativePulse && <CumulativePulsePanel pulse={cumulativePulse} />}

      {/* AI infographic analysis */}
      <AIInsights sessionId={sessionId} />

      {/* AI chat window */}
      <AIChatPanel sessionId={sessionId} />

      {/* Footer hint */}
      <p className="text-center text-xs text-gray-700 mt-auto">
        Presenter view — participants see the waiting screen. Share the QR code
        or code above.
      </p>
    </div>
  );
}
