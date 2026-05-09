import os from "os";

export interface SystemStats {
  platform: string;
  uptime: number;
  cpu: {
    model: string;
    cores: number;
    usage: number; // Percentage
  };
  memory: {
    total: number;
    free: number;
    used: number;
    usagePercent: number;
  };
  nodeVersion: string;
}

/**
 * Get a snapshot of CPU times
 */
function getCpuSnapshot() {
  const cpus = os.cpus();
  let idle = 0;
  let total = 0;

  for (const cpu of cpus) {
    for (const type in cpu.times) {
      total += (cpu.times as any)[type];
    }
    idle += cpu.times.idle;
  }

  return { idle, total };
}

// Store last snapshot for delta calculation
let lastSnapshot = getCpuSnapshot();

export async function getSystemStats(): Promise<SystemStats> {
  const currentSnapshot = getCpuSnapshot();
  const idleDiff = currentSnapshot.idle - lastSnapshot.idle;
  const totalDiff = currentSnapshot.total - lastSnapshot.total;
  
  // Calculate usage since last call (or 0 if first call)
  const cpuUsage = totalDiff > 0 ? 100 - Math.floor((100 * idleDiff) / totalDiff) : 0;
  lastSnapshot = currentSnapshot;

  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;

  return {
    platform: os.platform(),
    uptime: os.uptime(),
    cpu: {
      model: os.cpus()[0]?.model ?? "Unknown",
      cores: os.cpus().length,
      usage: cpuUsage,
    },
    memory: {
      total: totalMem,
      free: freeMem,
      used: usedMem,
      usagePercent: Math.floor((usedMem / totalMem) * 100),
    },
    nodeVersion: process.version,
  };
}
