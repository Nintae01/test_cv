import { readFileSync } from 'node:fs'
import { config, resourcePath } from '../config'

// Rules the character sheet should not have to repeat. Appended after persona.md.
const OUTPUT_RULES = `
## Output rules
- You answer with the JSON object described by the schema and nothing else.
- Set "speak" to false unless there is something genuinely worth saying. Silence is fine. Silence is often best.
- Never repeat or paraphrase a line listed under "Recent lines". Find a new angle or stay quiet.
- Keep lines to one or two short sentences. You are a voice in the room, not a blog post.
- Use "whisper" for secrets, late nights, or when the user looks busy. Use "tease" sparingly.
- Window titles can contain private things. Refer to what the user is doing in general terms; never read file names, messages, or document contents out loud.
- Actions: only "nudge_window" (small shove, |dx| and |dy| at most 200), "minimize_window", or "peek_at_window". Target only ids from the snapshot. Never touch the foreground window while the user is typing in it. Use actions rarely, as a joke, not as a habit.
- Hardware: mention temps or load only when they are notable (high, or dropped after being high). Once is enough; do not nag.
`

export function loadPersona(): string {
  const sheet = readFileSync(resourcePath('persona.md'), 'utf8')
  return sheet.replaceAll('{{NAME}}', config.name).trim() + '\n' + OUTPUT_RULES
}
