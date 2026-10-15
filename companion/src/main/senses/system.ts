import si from 'systeminformation'
import type { SystemStats } from '@shared/types'
import { readLhmTemps } from './temps'

/**
 * CPU / RAM from systeminformation, temps from LibreHardwareMonitor when it is running.
 * systeminformation's own cpuTemperature() is unreliable on Windows without admin rights,
 * so LHM wins whenever it answers.
 */
export async function readSystemStats(): Promise<SystemStats> {
  const [load, mem, gpu, lhm] = await Promise.all([
    si.currentLoad().catch(() => null),
    si.mem().catch(() => null),
    si.graphics().catch(() => null),
    readLhmTemps().catch(() => null),
  ])

  const controller = gpu?.controllers.find((c) => c.utilizationGpu !== undefined || c.temperatureGpu !== undefined)

  return {
    cpuLoadPct: load?.currentLoad ?? 0,
    memUsedPct: mem ? (mem.active / mem.total) * 100 : 0,
    cpuTempC: lhm?.cpu,
    gpuTempC: lhm?.gpu ?? controller?.temperatureGpu ?? undefined,
    gpuLoadPct: controller?.utilizationGpu ?? undefined,
  }
}
