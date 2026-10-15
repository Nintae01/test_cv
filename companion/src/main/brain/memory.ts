import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

interface Entry {
  at: string
  line: string
}

/** Short-term memory of what she already said, so she does not repeat herself. Persisted as JSON. */
export class Memory {
  private readonly file: string
  private entries: Entry[] = []

  constructor(dir: string, private readonly cap = 60) {
    this.file = join(dir, 'memory.json')
    try {
      if (existsSync(this.file)) this.entries = JSON.parse(readFileSync(this.file, 'utf8')) as Entry[]
    } catch {
      this.entries = []
    }
  }

  remember(line: string): void {
    this.entries.push({ at: new Date().toISOString(), line })
    if (this.entries.length > this.cap) this.entries = this.entries.slice(-this.cap)
    try {
      mkdirSync(dirname(this.file), { recursive: true })
      writeFileSync(this.file, JSON.stringify(this.entries, null, 2))
    } catch (err) {
      console.warn('[memory] could not persist', err)
    }
  }

  recent(n = 12): string[] {
    return this.entries.slice(-n).map((e) => e.line)
  }
}
