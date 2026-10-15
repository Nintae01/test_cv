import Anthropic from '@anthropic-ai/sdk'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import type { Snapshot } from '@shared/types'
import { config } from '../config'
import { ReplySchema, type Reply } from './schema'

// Reads ANTHROPIC_API_KEY from the environment (loaded by config.ts via dotenv).
const client = new Anthropic()

/**
 * One tick = one request. The persona is the stable prefix (cached), the snapshot is the
 * volatile tail. Returns null when the model declined or the output did not parse.
 */
export async function think(persona: string, snapshot: Snapshot, recentLines: string[]): Promise<Reply | null> {
  const response = await client.messages.parse({
    model: config.model,
    max_tokens: 2048, // the reply is a few sentences of JSON; this is deliberately small
    system: [{ type: 'text', text: persona, cache_control: { type: 'ephemeral' } }],
    output_config: {
      effort: 'low', // quips, not proofs
      format: zodOutputFormat(ReplySchema),
    },
    messages: [{ role: 'user', content: renderSnapshot(snapshot, recentLines) }],
  })

  if (response.stop_reason === 'refusal') {
    console.warn('[brain] declined:', response.stop_details?.category ?? 'unknown')
    return null
  }
  return response.parsed_output ?? null
}

function renderSnapshot(s: Snapshot, recent: string[]): string {
  const fmt = (n: number | undefined, unit: string) => (n === undefined ? 'n/a' : `${Math.round(n)}${unit}`)
  const windows = s.windows
    .slice(0, 15)
    .map((w) => `- [${w.id}] ${w.process}${w.foreground ? ' (foreground)' : ''}: "${w.title}" at ${w.x},${w.y} ${w.width}x${w.height}`)
    .join('\n')

  return [
    `Time: ${s.at}`,
    `Events since last look: ${s.events.length ? s.events.join('; ') : 'nothing new'}`,
    `CPU ${fmt(s.stats.cpuLoadPct, '%')} load, ${fmt(s.stats.cpuTempC, '°C')} | RAM ${fmt(s.stats.memUsedPct, '%')} | GPU ${fmt(s.stats.gpuLoadPct, '%')} load, ${fmt(s.stats.gpuTempC, '°C')}`,
    `Open windows (${s.windows.length}):`,
    windows || '- none visible',
    `Recent lines you already said (do not repeat):`,
    recent.length ? recent.map((l) => `- ${l}`).join('\n') : '- (nothing yet)',
  ].join('\n')
}

export { Anthropic }
