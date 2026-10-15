import type { Style } from '@shared/types'
import { config } from '../config'

/**
 * ElevenLabs text-to-speech. Returns a data: URL the renderer can hand straight to the
 * Live2D lip-sync player, or undefined when voice is not configured or the call failed.
 *
 * Eleven v3 understands inline audio tags, which is how we get whispers for free.
 */
export async function synthesize(line: string, style: Style): Promise<string | undefined> {
  if (!config.elevenLabsKey || !config.elevenLabsVoice) return undefined

  const text = `${TAGS[style]}${line}`
  try {
    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${config.elevenLabsVoice}?output_format=mp3_44100_128`,
      {
        method: 'POST',
        headers: { 'xi-api-key': config.elevenLabsKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          model_id: 'eleven_v3',
          voice_settings: { stability: 0.4, similarity_boost: 0.8 },
        }),
      },
    )
    if (!res.ok) {
      console.warn('[tts] elevenlabs', res.status, await res.text().catch(() => ''))
      return undefined
    }
    const audio = Buffer.from(await res.arrayBuffer())
    return `data:audio/mpeg;base64,${audio.toString('base64')}`
  } catch (err) {
    console.warn('[tts] failed', err)
    return undefined
  }
}

const TAGS: Record<Style, string> = {
  normal: '',
  whisper: '[whispers] ',
  tease: '[playfully] ',
  excited: '[excited] ',
  sleepy: '[sleepy] [yawning] ',
}
