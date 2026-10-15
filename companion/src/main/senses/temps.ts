import { config } from '../config'

/**
 * LibreHardwareMonitor exposes a JSON tree at <LHM_URL>/data.json when its remote web
 * server is enabled. Nodes look like { Text, Value: "45.0 °C", ImageURL, Children }.
 * We walk it and pick the CPU package and the first GPU temperature we find.
 */
interface LhmNode {
  Text?: string
  Value?: string
  ImageURL?: string
  Children?: LhmNode[]
}

export interface Temps {
  cpu?: number
  gpu?: number
}

export async function readLhmTemps(): Promise<Temps | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 1500)
  try {
    const res = await fetch(`${config.lhmUrl}/data.json`, { signal: controller.signal })
    if (!res.ok) return null
    const root = (await res.json()) as LhmNode
    const temps: Temps = {}
    walk(root, null, temps)
    return temps
  } catch {
    return null // LHM not running; that's fine
  } finally {
    clearTimeout(timer)
  }
}

type HardwareKind = 'cpu' | 'gpu' | null

function kindOf(node: LhmNode): HardwareKind {
  const img = node.ImageURL?.toLowerCase() ?? ''
  if (img.includes('cpu')) return 'cpu'
  if (img.includes('nvidia') || img.includes('amd') || img.includes('intel') && img.includes('gpu') || img.includes('gpu')) return 'gpu'
  return null
}

function walk(node: LhmNode, hardware: HardwareKind, temps: Temps): void {
  const kind = kindOf(node) ?? hardware
  const isTemp = node.Value?.includes('°C') ?? false

  if (isTemp && kind) {
    const value = parseFloat(node.Value!)
    const label = node.Text?.toLowerCase() ?? ''
    if (kind === 'cpu') {
      // Prefer the package / Tctl reading over per-core ones.
      const preferred = label.includes('package') || label.includes('tctl') || label.includes('tdie')
      if (temps.cpu === undefined || preferred) temps.cpu = value
    } else if (temps.gpu === undefined || label.includes('core')) {
      temps.gpu = value
    }
  }

  for (const child of node.Children ?? []) walk(child, kind, temps)
}
