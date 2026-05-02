"use client";

import { useState } from "react";
import AppShell from "@/components/AppShell";
import Panel from "@/components/Panel";
import PrimaryButton from "@/components/PrimaryButton";

const CHECKLIST_KEY = "ai-arena-admin-checklist";

const ITEMS = [
  { id: "db", label: "Database connected" },
  { id: "openai", label: "OpenAI API key configured" },
  { id: "realtime", label: "Realtime connection working" },
  { id: "presenter", label: "Presenter screen tested" },
  { id: "mobile", label: "Participant mobile tested" },
  { id: "qr", label: "QR code tested" },
  { id: "seed", label: "Demo session seeded" },
  { id: "sim400", label: "400-participant simulation tested" },
  { id: "export", label: "Export tested" },
  { id: "fallback", label: "Fallback summary tested if OpenAI fails" },
  { id: "internet", label: "Internet connection checked" },
  { id: "backup", label: "Backup local mode available" },
];

export default function ChecklistPage() {
  const [checked, setChecked] = useState<Record<string, boolean>>(() => {
    try {
      if (typeof window === "undefined") return {};
      const stored = localStorage.getItem(CHECKLIST_KEY);
      return stored ? (JSON.parse(stored) as Record<string, boolean>) : {};
    } catch {
      return {};
    }
  });

  function toggle(id: string) {
    setChecked((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try {
        localStorage.setItem(CHECKLIST_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }

  function resetAll() {
    setChecked({});
    try {
      localStorage.removeItem(CHECKLIST_KEY);
    } catch {
      // ignore
    }
  }

  const checkedCount = ITEMS.filter((i) => checked[i.id]).length;
  const total = ITEMS.length;
  const progressPct = Math.round((checkedCount / total) * 100);

  return (
    <AppShell>
      <div className="p-6 max-w-2xl mx-auto w-full">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Pre-Meeting Checklist</h1>
            <p className="text-gray-500 text-sm mt-1">
              Check off items before the all-hands session
            </p>
          </div>
          <a
            href="/admin"
            className="text-sm text-blue-400 hover:text-blue-300 underline"
          >
            ← Back to Admin
          </a>
        </div>

        <Panel
          title={`Progress: ${checkedCount}/${total}`}
          subtitle={`${progressPct}% complete`}
        >
          {/* Progress bar */}
          <div className="h-3 rounded-full bg-gray-800 overflow-hidden mb-6">
            <div
              className="h-full rounded-full bg-teal-500 transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>

          <div className="space-y-3">
            {ITEMS.map((item) => (
              <label
                key={item.id}
                className="flex items-center gap-3 cursor-pointer group"
              >
                <input
                  type="checkbox"
                  checked={!!checked[item.id]}
                  onChange={() => toggle(item.id)}
                  className="w-4 h-4 rounded accent-teal-500 cursor-pointer"
                />
                <span
                  className={[
                    "text-sm transition",
                    checked[item.id]
                      ? "text-teal-300 line-through"
                      : "text-gray-200 group-hover:text-white",
                  ].join(" ")}
                >
                  {item.label}
                </span>
              </label>
            ))}
          </div>

          <div className="mt-6 pt-4 border-t border-gray-700">
            <PrimaryButton variant="danger" size="sm" onClick={resetAll}>
              🔄 Reset All
            </PrimaryButton>
          </div>
        </Panel>

        {checkedCount === total && (
          <div className="mt-4 rounded-xl border border-teal-700 bg-teal-900/20 px-5 py-4 text-center">
            <p className="text-teal-300 font-semibold text-lg">
              ✅ All items checked — you&apos;re ready!
            </p>
          </div>
        )}
      </div>
    </AppShell>
  );
}
