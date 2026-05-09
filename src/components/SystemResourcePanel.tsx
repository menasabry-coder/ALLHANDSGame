"use client";

import { useEffect, useState } from "react";
import Panel from "./Panel";
import type { SystemStats } from "@/lib/systemStats";

export default function SystemResourcePanel() {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch("/api/admin/system-stats");
        if (res.ok) {
          const data = await res.json();
          setStats(data);
          setError(null);
        } else {
          setError("Failed to load stats");
        }
      } catch {
        setError("Network error");
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 5000); // Update every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const getUsageColor = (percent: number) => {
    if (percent < 60) return "bg-green-500";
    if (percent < 85) return "bg-yellow-500";
    return "bg-red-500";
  };

  const formatUptime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hrs}h ${mins}m`;
  };

  const formatBytes = (bytes: number) => {
    const gb = bytes / (1024 * 1024 * 1024);
    return `${gb.toFixed(1)} GB`;
  };

  return (
    <Panel title="System Resources" subtitle="Server health & performance">
      {error && <p className="text-red-400 text-xs mb-2">{error}</p>}
      {!stats && !error && <p className="text-gray-500 text-xs italic">Loading resources…</p>}
      
      {stats && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-[10px] text-gray-500 uppercase font-bold tracking-widest">
            <span>OS: {stats.platform}</span>
            <span>Uptime: {formatUptime(stats.uptime)}</span>
          </div>

          {/* CPU */}
          <div>
            <div className="flex justify-between items-end mb-1.5">
              <span className="text-xs font-semibold text-gray-300">CPU Load</span>
              <span className="text-xs font-mono text-gray-400">{stats.cpu.usage}%</span>
            </div>
            <div className="h-1.5 w-full bg-gray-800 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-1000 ${getUsageColor(stats.cpu.usage)}`}
                style={{ width: `${stats.cpu.usage}%` }}
              />
            </div>
            <p className="text-[9px] text-gray-600 mt-1 truncate">{stats.cpu.model} ({stats.cpu.cores} Cores)</p>
          </div>

          {/* Memory */}
          <div>
            <div className="flex justify-between items-end mb-1.5">
              <span className="text-xs font-semibold text-gray-300">Memory usage</span>
              <span className="text-xs font-mono text-gray-400">{stats.memory.usagePercent}%</span>
            </div>
            <div className="h-1.5 w-full bg-gray-800 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-1000 ${getUsageColor(stats.memory.usagePercent)}`}
                style={{ width: `${stats.memory.usagePercent}%` }}
              />
            </div>
            <div className="flex justify-between text-[9px] text-gray-600 mt-1">
              <span>{formatBytes(stats.memory.used)} used</span>
              <span>{formatBytes(stats.memory.total)} total</span>
            </div>
          </div>

          <div className="pt-2 border-t border-gray-800/50 flex justify-between items-center">
            <span className="text-[10px] text-gray-600">Node Version</span>
            <span className="text-[10px] font-mono text-gray-400">{stats.nodeVersion}</span>
          </div>
        </div>
      )}
    </Panel>
  );
}
