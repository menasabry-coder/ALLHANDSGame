"use client";

import { QuestionWithResults } from "@/lib/types";

interface Props {
  question: QuestionWithResults;
}

const BAR_COLORS = [
  "bg-blue-500",
  "bg-green-500",
  "bg-yellow-500",
  "bg-purple-500",
  "bg-pink-500",
  "bg-orange-500",
  "bg-teal-500",
  "bg-red-500",
];

export default function ResultsChart({ question }: Props) {
  const maxVotes = Math.max(...Object.values(question.votes), 1);

  return (
    <div className="space-y-3">
      {question.options.map((option, idx) => {
        const count = question.votes[idx] ?? 0;
        const pct = question.totalVotes
          ? Math.round((count / question.totalVotes) * 100)
          : 0;
        const barWidth = (count / maxVotes) * 100;

        return (
          <div key={idx}>
            <div className="flex justify-between text-sm mb-1">
              <span className="font-medium">{option}</span>
              <span className="text-gray-400">
                {count} vote{count !== 1 && "s"} ({pct}%)
              </span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-6 overflow-hidden">
              <div
                className={`${BAR_COLORS[idx % BAR_COLORS.length]} h-6 rounded-full transition-all duration-700 ease-out`}
                style={{ width: `${barWidth}%` }}
              />
            </div>
          </div>
        );
      })}
      <p className="text-center text-gray-400 text-xs pt-1">
        Total votes: {question.totalVotes}
      </p>
    </div>
  );
}
