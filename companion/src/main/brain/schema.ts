import { z } from 'zod'

export const STYLES = ['normal', 'whisper', 'tease', 'excited', 'sleepy'] as const
export const EXPRESSIONS = ['neutral', 'happy', 'smug', 'surprised', 'sleepy', 'annoyed'] as const
export const ACTION_TYPES = ['none', 'nudge_window', 'minimize_window', 'peek_at_window'] as const

// Flat on purpose: structured outputs are happiest with plain objects and enums.
export const ActionSchema = z.object({
  type: z.enum(ACTION_TYPES),
  windowId: z.string().describe('The id of a window from the snapshot, or "" when not needed.'),
  dx: z.number().describe('Horizontal shove in pixels for nudge_window, else 0.'),
  dy: z.number().describe('Vertical shove in pixels for nudge_window, else 0.'),
})

export const ReplySchema = z.object({
  speak: z.boolean().describe('false = nothing worth saying right now. Prefer false when unsure.'),
  line: z.string().describe('What she says out loud. One or two short sentences. "" when speak is false.'),
  style: z.enum(STYLES),
  expression: z.enum(EXPRESSIONS),
  actions: z.array(ActionSchema).describe('Zero to two playful actions. Use [] most of the time.'),
})

export type Action = z.infer<typeof ActionSchema>
export type Reply = z.infer<typeof ReplySchema>
