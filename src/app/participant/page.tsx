import AppShell from "@/components/AppShell";
import RoleBadge from "@/components/RoleBadge";
import Panel from "@/components/Panel";
import RoundStatusCard from "@/components/RoundStatusCard";
import { ROUNDS } from "@/config/gameConfig";

export default function ParticipantPage() {
  return (
    <AppShell>
      <div className="flex flex-col items-center p-6 gap-6 max-w-lg mx-auto w-full">
        <div className="text-center mt-4">
          <RoleBadge role="Participant" />
          <p className="text-gray-400 text-sm mt-3">
            Your session status will appear here once the admin starts the game.
          </p>
        </div>

        {/* Session status */}
        <Panel title="Session Status" className="w-full">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 animate-pulse" />
            <span className="text-sm text-yellow-300 font-medium">
              Waiting for admin to start the game.
            </span>
          </div>
        </Panel>

        {/* Current round */}
        <Panel title="Current Round" className="w-full">
          <div className="space-y-2">
            {ROUNDS.map((round) => (
              <RoundStatusCard key={round.id} round={round} status="pending" />
            ))}
          </div>
        </Panel>
      </div>
    </AppShell>
  );
}
