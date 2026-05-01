import AppShell from "@/components/AppShell";
import RoleBadge from "@/components/RoleBadge";
import MetricCard from "@/components/MetricCard";
import Panel from "@/components/Panel";
import RoundStatusCard from "@/components/RoundStatusCard";
import PlaceholderChart from "@/components/PlaceholderChart";
import { GAME_NAME, GAME_SUBTITLE, ROUNDS } from "@/config/gameConfig";

export default function PresenterPage() {
  return (
    <AppShell hideNav>
      <div className="flex flex-col min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 p-8 gap-8">
        {/* Header */}
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-5xl font-extrabold tracking-tight bg-gradient-to-r from-teal-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
              {GAME_NAME}
            </h1>
            <p className="text-gray-400 text-lg mt-1">{GAME_SUBTITLE}</p>
          </div>
          <RoleBadge role="Presenter" className="text-sm px-4 py-2" />
        </header>

        {/* Metrics row */}
        <div className="grid grid-cols-3 gap-4">
          <MetricCard
            label="Participants"
            value="—"
            description="Joined this session"
            icon="👥"
            accent="teal"
          />
          <MetricCard
            label="Active Round"
            value="—"
            description="Current game round"
            icon="🎯"
            accent="blue"
          />
          <MetricCard
            label="Questions Answered"
            value="—"
            description="Across all rounds"
            icon="✅"
            accent="purple"
          />
        </div>

        {/* Round status */}
        <div className="grid grid-cols-3 gap-4">
          {ROUNDS.map((round) => (
            <RoundStatusCard key={round.id} round={round} status="pending" />
          ))}
        </div>

        {/* Analysis panels */}
        <div className="grid grid-cols-2 gap-6 flex-1">
          <Panel
            title="Current Question Analysis"
            subtitle="AI-generated insight for the active sub-question"
            className="flex flex-col"
          >
            <PlaceholderChart
              label="Analysis will appear here after the question is locked"
              height={260}
              className="flex-1"
            />
          </Panel>

          <Panel
            title="Cumulative Game Pulse"
            subtitle="Full-game sentiment and trend analysis"
            className="flex flex-col"
          >
            <PlaceholderChart
              label="Cumulative pulse will appear here as the game progresses"
              height={260}
              className="flex-1"
            />
          </Panel>
        </div>
      </div>
    </AppShell>
  );
}
