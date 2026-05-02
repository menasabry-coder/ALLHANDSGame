"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import AppShell from "@/components/AppShell";
import Panel from "@/components/Panel";
import MetricCard from "@/components/MetricCard";
import { GAME_NAME, GAME_SUBTITLE } from "@/config/gameConfig";
import type { GameSessionDto } from "@/types/game";
import type { CumulativePulseAnalysis } from "@/types/analysis";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface QuestionResult {
  question: {
    id: string;
    roundId: string;
    title: string;
    prompt: string;
    questionType: string;
  };
  responseCount: number;
  tally: Record<string, number>;
  freeTexts: string[];
}

// ---------------------------------------------------------------------------
// 30/60/90-day action plan helper
// ---------------------------------------------------------------------------

function buildActionPlan(pulse: CumulativePulseAnalysis | null): {
  thirtyDays: string[];
  sixtyDays: string[];
  ninetyDays: string[];
} {
  if (!pulse) {
    return {
      thirtyDays: [
        "Run a pilot AI project in the lowest-risk area identified.",
        "Set up AI governance working group.",
        "Identify and train 3 AI champions.",
      ],
      sixtyDays: [
        "Deploy first AI tool with human-review guardrails.",
        "Collect feedback and measure adoption.",
        "Document lessons learned.",
      ],
      ninetyDays: [
        "Scale successful pilots to team level.",
        "Publish AI usage guidelines.",
        "Plan next phase of AI adoption.",
      ],
    };
  }

  const thirtyDayPilots = pulse.recommendedPilots
    .filter((p) => p.timeHorizon === "30_days")
    .map((p) => `${p.title}: ${p.firstStep}`);

  const sixtyDayPilots = pulse.recommendedPilots
    .filter((p) => p.timeHorizon === "60_days")
    .map((p) => `${p.title}: ${p.firstStep}`);

  const ninetyDayPilots = pulse.recommendedPilots
    .filter((p) => p.timeHorizon === "90_days")
    .map((p) => `${p.title}: ${p.firstStep}`);

  // Add risk-based actions
  if (pulse.riskIndex > 60) {
    thirtyDayPilots.push("Establish AI safety review process for high-risk applications.");
  }
  if (pulse.governanceReadinessScore < 40) {
    sixtyDayPilots.push("Create AI governance policy document.");
  }
  if (pulse.aiConfidenceScore > 70) {
    ninetyDayPilots.push("Expand AI tooling to additional engineering teams.");
  }

  return {
    thirtyDays: thirtyDayPilots.length
      ? thirtyDayPilots
      : ["Start with one low-risk AI tool in your highest-readiness team."],
    sixtyDays: sixtyDayPilots.length
      ? sixtyDayPilots
      : ["Evaluate pilot results and refine guardrails."],
    ninetyDays: ninetyDayPilots.length
      ? ninetyDayPilots
      : ["Scale proven AI use cases and document best practices."],
  };
}

// ---------------------------------------------------------------------------
// Report content
// ---------------------------------------------------------------------------

function ReportContent({ sessionId }: { sessionId: string }) {
  const [session, setSession] = useState<GameSessionDto | null>(null);
  const [questionResults, setQuestionResults] = useState<QuestionResult[]>([]);
  const [pulse, setPulse] = useState<CumulativePulseAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [sRes, rRes, aRes] = await Promise.all([
        fetch(`/api/sessions/${sessionId}`),
        fetch(`/api/sessions/${sessionId}/results`),
        fetch(`/api/sessions/${sessionId}/analyze?type=cumulative_pulse`),
      ]);

      if (sRes.ok) {
        setSession(await sRes.json());
      } else {
        setError("Session not found.");
        return;
      }

      if (rRes.ok) {
        const data = await rRes.json();
        setQuestionResults(data.questionResults ?? []);
      }

      if (aRes.ok) {
        const data = await aRes.json() as { results: Array<{ payload: CumulativePulseAnalysis }> };
        if (data.results[0]?.payload) {
          setPulse(data.results[0].payload);
        }
      }
    } catch {
      setError("Could not load report data.");
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <p className="text-gray-500 text-sm animate-pulse">Loading report…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-64 gap-4">
        <p className="text-red-400">{error}</p>
        <a href="/admin" className="text-blue-400 underline text-sm">
          ← Go to Admin
        </a>
      </div>
    );
  }

  const totalResponseCount = questionResults.reduce((s, q) => s + q.responseCount, 0);
  const actionPlan = buildActionPlan(pulse);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b border-gray-700 pb-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-purple-400 mb-1">
          Final Report
        </p>
        <h1 className="text-4xl font-extrabold text-white">
          {session?.title ?? "Department AI Pulse"}
        </h1>
        <p className="text-gray-400 mt-1">
          {GAME_NAME} — {GAME_SUBTITLE} · Code:{" "}
          <span className="font-mono font-bold text-gray-300">{session?.code}</span>
        </p>
      </div>

      {/* Summary metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          label="Participants"
          value={session?.participantCount ?? "—"}
          icon="👥"
          accent="teal"
        />
        <MetricCard
          label="AI Confidence"
          value={pulse ? `${pulse.aiConfidenceScore}/100` : "—"}
          icon="🤖"
          accent="blue"
        />
        <MetricCard
          label="Opportunity Index"
          value={pulse ? `${pulse.opportunityIndex}/100` : "—"}
          icon="🚀"
          accent="teal"
        />
        <MetricCard
          label="Risk Index"
          value={pulse ? `${pulse.riskIndex}/100` : "—"}
          icon="⚠️"
          accent="red"
        />
      </div>

      {/* Executive summary */}
      <Panel title="Executive Summary" subtitle="AI readiness pulse of your engineering team">
        {pulse?.executiveSummary ? (
          <p className="text-sm text-gray-300 leading-relaxed">{pulse.executiveSummary}</p>
        ) : (
          <p className="text-sm text-gray-500 italic">
            No cumulative analysis available yet. Trigger analysis from the Admin panel.
          </p>
        )}
      </Panel>

      {/* Participation summary */}
      <Panel
        title="Participation Summary"
        subtitle={`${session?.participantCount ?? 0} participants · ${questionResults.length} questions answered · ${totalResponseCount} total responses`}
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-gray-900/60 rounded-xl p-3 border border-gray-800 text-center">
            <p className="text-2xl font-extrabold text-teal-300">{session?.participantCount ?? 0}</p>
            <p className="text-xs text-gray-500 mt-0.5">Participants</p>
          </div>
          <div className="bg-gray-900/60 rounded-xl p-3 border border-gray-800 text-center">
            <p className="text-2xl font-extrabold text-blue-300">{questionResults.length}</p>
            <p className="text-xs text-gray-500 mt-0.5">Questions</p>
          </div>
          <div className="bg-gray-900/60 rounded-xl p-3 border border-gray-800 text-center">
            <p className="text-2xl font-extrabold text-purple-300">{totalResponseCount}</p>
            <p className="text-xs text-gray-500 mt-0.5">Responses</p>
          </div>
          <div className="bg-gray-900/60 rounded-xl p-3 border border-gray-800 text-center">
            <p className="text-2xl font-extrabold text-green-300">
              {pulse ? `${pulse.gameProgressPercent}%` : "—"}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">Game Progress</p>
          </div>
        </div>
      </Panel>

      {/* Governance readiness */}
      {pulse && (
        <Panel title="AI Governance Readiness" subtitle="How prepared your team is for responsible AI adoption">
          <div className="flex items-center gap-4">
            <div className="text-5xl font-extrabold text-blue-300">{pulse.governanceReadinessScore}</div>
            <div>
              <p className="text-gray-400 text-sm">out of 100</p>
              <div className="h-3 rounded-full bg-gray-800 overflow-hidden mt-2 w-48">
                <div
                  className="h-full rounded-full bg-blue-500 transition-all duration-700"
                  style={{ width: `${pulse.governanceReadinessScore}%` }}
                />
              </div>
            </div>
          </div>
        </Panel>
      )}

      {/* Top Opportunities */}
      {pulse?.topOpportunities?.length ? (
        <Panel title="Top AI Opportunities" subtitle="Where your team sees the most AI value">
          <div className="space-y-3">
            {pulse.topOpportunities.map((o, i) => (
              <div key={i} className="rounded-xl bg-green-900/15 border border-green-800/40 px-4 py-3">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-semibold text-green-300">{o.name}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-green-500 font-mono">{o.score}/100</span>
                    {o.recommendedPilot && (
                      <span className="text-xs bg-green-700/40 text-green-300 px-2 py-0.5 rounded-full">
                        ✅ Pilot recommended
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-xs text-gray-400">{o.whyItMatters}</p>
                <div className="h-1.5 rounded-full bg-gray-800 mt-2 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-green-500"
                    style={{ width: `${o.score}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Panel>
      ) : null}

      {/* Top Risks */}
      {pulse?.topRisks?.length ? (
        <Panel title="Top AI Risks" subtitle="Concerns your team raised most strongly">
          <div className="space-y-3">
            {pulse.topRisks.map((r, i) => (
              <div key={i} className="rounded-xl bg-red-900/15 border border-red-800/40 px-4 py-3">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-semibold text-red-300">{r.name}</p>
                  <span className="text-xs text-red-500 font-mono">{r.score}/100</span>
                </div>
                <p className="text-xs text-gray-400">{r.whyItMatters}</p>
                <p className="text-xs text-amber-400 mt-1">
                  <span className="font-semibold">Control:</span> {r.recommendedControl}
                </p>
                <div className="h-1.5 rounded-full bg-gray-800 mt-2 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-red-500"
                    style={{ width: `${r.score}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Panel>
      ) : null}

      {/* Recommended Pilots */}
      {pulse?.recommendedPilots?.length ? (
        <Panel title="Recommended Pilots" subtitle="Concrete next steps for AI adoption">
          <div className="space-y-3">
            {pulse.recommendedPilots.map((p, i) => (
              <div key={i} className="rounded-xl bg-blue-900/10 border border-blue-800/30 px-4 py-3">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <p className="text-sm font-semibold text-blue-300">{p.title}</p>
                  <span className="text-xs bg-blue-800/40 text-blue-400 px-2 py-0.5 rounded-full">
                    {p.timeHorizon.replace("_", " ")}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    p.riskLevel === "low" ? "bg-green-800/30 text-green-400" :
                    p.riskLevel === "medium" ? "bg-amber-800/30 text-amber-400" :
                    "bg-red-800/30 text-red-400"
                  }`}>
                    {p.riskLevel} risk
                  </span>
                </div>
                <p className="text-xs text-gray-400">{p.reason}</p>
                <p className="text-xs text-blue-400 mt-1">
                  <span className="font-semibold">First step:</span> {p.firstStep}
                </p>
              </div>
            ))}
          </div>
        </Panel>
      ) : null}

      {/* Guardrails */}
      {pulse?.recommendedGuardrails?.length ? (
        <Panel title="Recommended Guardrails" subtitle="Safety measures your team should adopt">
          <ul className="space-y-2">
            {pulse.recommendedGuardrails.map((g, i) => (
              <li key={i} className="flex gap-3 text-sm text-gray-300">
                <span className="text-amber-500 shrink-0 mt-0.5">🛡️</span>
                <span>{g}</span>
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}

      {/* 30/60/90-day action plan */}
      <Panel title="30 / 60 / 90-Day Action Plan" subtitle="Recommended roadmap based on your team's pulse">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-xl bg-teal-900/10 border border-teal-800/30 p-4">
            <p className="text-xs font-bold text-teal-400 uppercase tracking-wider mb-3">
              🗓️ 30 Days
            </p>
            <ul className="space-y-2">
              {actionPlan.thirtyDays.map((a, i) => (
                <li key={i} className="text-xs text-gray-300 flex gap-2">
                  <span className="text-teal-500 shrink-0">•</span>
                  <span>{a}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl bg-blue-900/10 border border-blue-800/30 p-4">
            <p className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-3">
              🗓️ 60 Days
            </p>
            <ul className="space-y-2">
              {actionPlan.sixtyDays.map((a, i) => (
                <li key={i} className="text-xs text-gray-300 flex gap-2">
                  <span className="text-blue-500 shrink-0">•</span>
                  <span>{a}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl bg-purple-900/10 border border-purple-800/30 p-4">
            <p className="text-xs font-bold text-purple-400 uppercase tracking-wider mb-3">
              🗓️ 90 Days
            </p>
            <ul className="space-y-2">
              {actionPlan.ninetyDays.map((a, i) => (
                <li key={i} className="text-xs text-gray-300 flex gap-2">
                  <span className="text-purple-500 shrink-0">•</span>
                  <span>{a}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Panel>

      {/* Export actions */}
      <Panel title="Export Report" subtitle="Download the final report in your preferred format">
        <div className="flex flex-wrap gap-3">
          <a
            href={`/api/sessions/${sessionId}/export?format=json`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block rounded-xl font-semibold py-2.5 px-4 text-sm transition bg-gray-700 hover:bg-gray-600 text-gray-200"
          >
            📥 Export JSON
          </a>
          <a
            href={`/api/sessions/${sessionId}/export?format=csv`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block rounded-xl font-semibold py-2.5 px-4 text-sm transition bg-gray-700 hover:bg-gray-600 text-gray-200"
          >
            📊 Export CSV
          </a>
          <a
            href={`/api/sessions/${sessionId}/export?format=markdown`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block rounded-xl font-semibold py-2.5 px-4 text-sm transition bg-gray-700 hover:bg-gray-600 text-gray-200"
          >
            📝 Export Markdown
          </a>
        </div>
      </Panel>

      {pulse?.presenterClosingLine && (
        <div className="rounded-xl border border-purple-700/40 bg-purple-900/10 px-6 py-5 text-center">
          <p className="text-purple-300 font-medium italic text-sm">
            &ldquo;{pulse.presenterClosingLine}&rdquo;
          </p>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

function ReportPageInner() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("sessionId");

  if (!sessionId) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center min-h-64 gap-4 p-8">
          <h1 className="text-2xl font-bold text-gray-300">Select a session</h1>
          <p className="text-gray-500 text-sm">
            Go to{" "}
            <a href="/admin" className="text-blue-400 underline">
              Admin
            </a>{" "}
            to select a session, then click &ldquo;View Report&rdquo;.
          </p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="p-6 max-w-5xl mx-auto w-full">
        <ReportContent sessionId={sessionId} />
        <p className="text-center text-xs text-gray-700 mt-10">
          {GAME_NAME} — {GAME_SUBTITLE}
        </p>
      </div>
    </AppShell>
  );
}

export default function ReportPage() {
  return (
    <Suspense fallback={
      <AppShell>
        <div className="flex items-center justify-center min-h-64">
          <p className="text-gray-500 text-sm animate-pulse">Loading…</p>
        </div>
      </AppShell>
    }>
      <ReportPageInner />
    </Suspense>
  );
}

