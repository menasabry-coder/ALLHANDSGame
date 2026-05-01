"use client";

import { useState } from "react";
import type { AIAnalysis, InfographicCard } from "@/lib/types";

interface Props {
  sessionId: string;
}

const COLOR_MAP: Record<InfographicCard["color"], string> = {
  blue: "from-blue-900/60 to-blue-800/30 border-blue-700/50",
  green: "from-green-900/60 to-green-800/30 border-green-700/50",
  purple: "from-purple-900/60 to-purple-800/30 border-purple-700/50",
  yellow: "from-yellow-900/60 to-yellow-800/30 border-yellow-700/50",
  red: "from-red-900/60 to-red-800/30 border-red-700/50",
  pink: "from-pink-900/60 to-pink-800/30 border-pink-700/50",
};

export default function AIInsights({ sessionId }: Props) {
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runAnalysis = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/analyze`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Analysis failed");
        return;
      }
      const data: AIAnalysis = await res.json();
      setAnalysis(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? `Could not connect to analysis service: ${err.message}`
          : "Could not connect to analysis service"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="max-w-2xl mx-auto mt-10">
      <div className="bg-gray-800/70 rounded-2xl p-6 border border-purple-700/50">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl">🤖</span>
          <h2 className="text-xl font-bold">AI Analysis</h2>
        </div>

        {!analysis && !loading && (
          <div className="text-center py-4">
            <p className="text-gray-400 mb-4 text-sm">
              Use OpenAI to analyze the questions, voting patterns, and generate
              insights &amp; infographics about this session.
            </p>
            <button
              onClick={runAnalysis}
              className="bg-purple-600 hover:bg-purple-500 rounded-lg px-6 py-3 font-semibold transition text-sm"
            >
              ✨ Generate AI Insights
            </button>
          </div>
        )}

        {loading && (
          <div className="text-center py-8">
            <div className="inline-block w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-gray-400 text-sm">
              Analyzing questions and answers with OpenAI...
            </p>
          </div>
        )}

        {error && (
          <div className="bg-red-900/30 border border-red-700 rounded-lg p-4">
            <p className="text-red-400 text-sm">{error}</p>
            <button
              onClick={runAnalysis}
              className="mt-2 text-xs text-red-300 hover:text-red-200 underline"
            >
              Try again
            </button>
          </div>
        )}

        {analysis && (
          <div className="space-y-6">
            {/* Infographic Cards */}
            {analysis.infographics && analysis.infographics.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-purple-400 uppercase tracking-wide mb-3">
                  📊 Infographic Dashboard
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {analysis.infographics.map((card, i) => (
                    <div
                      key={i}
                      className={`bg-gradient-to-br ${COLOR_MAP[card.color] ?? COLOR_MAP.blue} rounded-xl p-4 border`}
                    >
                      <div className="text-2xl mb-1">{card.icon}</div>
                      <p className="text-2xl font-bold text-white">
                        {card.value}
                      </p>
                      <p className="text-sm font-semibold text-gray-200 mt-1">
                        {card.title}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {card.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Summary */}
            <div>
              <h3 className="text-sm font-semibold text-purple-400 uppercase tracking-wide mb-2">
                Summary
              </h3>
              <p className="text-gray-300 leading-relaxed text-sm">
                {analysis.summary}
              </p>
            </div>

            {/* Sentiment */}
            <div>
              <h3 className="text-sm font-semibold text-purple-400 uppercase tracking-wide mb-2">
                Overall Sentiment
              </h3>
              <p className="text-gray-300 text-sm">{analysis.sentiment}</p>
            </div>

            {/* Themes */}
            {analysis.overallThemes.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-purple-400 uppercase tracking-wide mb-2">
                  Key Themes
                </h3>
                <div className="flex flex-wrap gap-2">
                  {analysis.overallThemes.map((theme, i) => (
                    <span
                      key={i}
                      className="bg-purple-900/50 text-purple-300 text-xs px-3 py-1 rounded-full border border-purple-700/50"
                    >
                      {theme}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Per-question insights */}
            {analysis.questionInsights.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-purple-400 uppercase tracking-wide mb-3">
                  Question Insights
                </h3>
                <div className="space-y-3">
                  {analysis.questionInsights.map((qi, i) => (
                    <div
                      key={i}
                      className="bg-gray-900/50 rounded-lg p-4 border border-gray-700"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs text-gray-500 font-mono">
                          {qi.recommendedVisualization.toUpperCase()}
                        </span>
                        <span className="text-xs text-gray-600">•</span>
                        <p className="text-sm font-medium text-gray-200">
                          {qi.questionText}
                        </p>
                      </div>
                      <p className="text-sm text-gray-400">{qi.insight}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Re-run */}
            <div className="text-center pt-2">
              <button
                onClick={runAnalysis}
                className="text-xs text-purple-400 hover:text-purple-300 underline"
              >
                Re-run analysis
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
