import AppShell from "@/components/AppShell";
import Panel from "@/components/Panel";
import PlaceholderChart from "@/components/PlaceholderChart";
import PrimaryButton from "@/components/PrimaryButton";
import MetricCard from "@/components/MetricCard";
import { GAME_NAME, GAME_SUBTITLE, ROUNDS } from "@/config/gameConfig";

export default function ReportPage() {
  return (
    <AppShell>
      <div className="p-6 max-w-5xl mx-auto w-full">
        {/* Report header */}
        <div className="mb-8 border-b border-gray-700 pb-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-purple-400 mb-1">
            Final Report
          </p>
          <h1 className="text-4xl font-extrabold text-white">
            Department AI Pulse
          </h1>
          <p className="text-gray-400 mt-1">{GAME_NAME} — {GAME_SUBTITLE}</p>
        </div>

        {/* Summary metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <MetricCard label="Participants" value="—" icon="👥" accent="teal" />
          <MetricCard label="Rounds Played" value={ROUNDS.length} icon="🎯" accent="blue" />
          <MetricCard label="Questions" value="—" icon="❓" accent="purple" />
          <MetricCard label="AI Readiness" value="—" icon="🤖" accent="teal" />
        </div>

        {/* Round summaries */}
        <div className="space-y-6 mb-8">
          {ROUNDS.map((round) => (
            <Panel
              key={round.id}
              title={`Round ${round.order}: ${round.name}`}
              subtitle="Results and AI analysis will appear here after the game"
            >
              <PlaceholderChart
                label={`${round.name} data will be populated after game completion`}
                height={180}
              />
            </Panel>
          ))}
        </div>

        {/* Export actions */}
        <Panel title="Export" subtitle="Download the final report in your preferred format">
          <div className="flex flex-wrap gap-3">
            <PrimaryButton disabled variant="secondary">
              📥 Export CSV
            </PrimaryButton>
            <PrimaryButton disabled variant="secondary">
              📥 Export JSON
            </PrimaryButton>
            <PrimaryButton disabled variant="secondary">
              📄 Download PDF
            </PrimaryButton>
            <PrimaryButton disabled variant="secondary">
              📝 Download Markdown
            </PrimaryButton>
          </div>
        </Panel>

        <p className="text-center text-xs text-gray-600 mt-8">
          Export will be enabled in Phase 9.
        </p>
      </div>
    </AppShell>
  );
}
