import type { Style } from '@shared/types'

/** Speech bubble above the character. One at a time; a new line replaces the old one. */
export class Bubble {
  private timer: number | undefined

  constructor(private readonly el: HTMLElement) {}

  show(text: string, style: Style): void {
    window.clearTimeout(this.timer)
    this.el.textContent = text
    this.el.className = `bubble ${style}`
    // Reading time: ~60ms per character, between 2.5s and 9s.
    const ms = Math.min(9_000, Math.max(2_500, text.length * 60))
    this.timer = window.setTimeout(() => this.hide(), ms)
  }

  hide(): void {
    this.el.classList.add('hidden')
  }
}
