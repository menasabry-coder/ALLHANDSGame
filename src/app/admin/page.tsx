import AppShell from "@/components/AppShell";
import Panel from "@/components/Panel";
import RoleBadge from "@/components/RoleBadge";
import PrimaryButton from "@/components/PrimaryButton";
import { ROUNDS } from "@/config/gameConfig";

export default function AdminPage() {
  return (
    <AppShell>
      <div className="p-6 max-w-4xl mx-auto w-full">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Admin Control</h1>
          <RoleBadge role="Admin" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Session management */}
          <Panel title="Session" subtitle="Create and manage a game session">
            <div className="space-y-3">
              <PrimaryButton disabled className="w-full">
                + Create Session
              </PrimaryButton>
              <PrimaryButton disabled variant="secondary" className="w-full">
                ▶ Start Game
              </PrimaryButton>
            </div>
          </Panel>

          {/* Round control */}
          <Panel title="Round Control" subtitle="Navigate between game rounds">
            <div className="space-y-3">
              {ROUNDS.map((round) => (
                <div
                  key={round.id}
                  className="flex items-center justify-between bg-gray-900/50 rounded-xl px-4 py-3"
                >
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">
                      Round {round.order}
                    </p>
                    <p className="text-sm font-medium text-gray-200">
                      {round.name}
                    </p>
                  </div>
                  <PrimaryButton disabled variant="secondary" size="sm">
                    Activate
                  </PrimaryButton>
                </div>
              ))}
            </div>
          </Panel>

          {/* Question controls */}
          <Panel
            title="Question Controls"
            subtitle="Lock answers and trigger AI analysis"
          >
            <div className="space-y-3">
              <PrimaryButton disabled variant="secondary" className="w-full">
                🔒 Lock Current Question
              </PrimaryButton>
              <PrimaryButton disabled className="w-full">
                🤖 Trigger AI Analysis
              </PrimaryButton>
            </div>
          </Panel>

          {/* Export */}
          <Panel title="Report & Export" subtitle="Generate final deliverables">
            <div className="space-y-3">
              <PrimaryButton disabled variant="secondary" className="w-full">
                📄 Generate Final Report
              </PrimaryButton>
              <PrimaryButton disabled variant="secondary" className="w-full">
                📥 Export CSV / JSON
              </PrimaryButton>
            </div>
          </Panel>
        </div>

        <p className="text-center text-xs text-gray-600 mt-10">
          Controls will be enabled in subsequent phases.
        </p>
      </div>
    </AppShell>
  );
}
