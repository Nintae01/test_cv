import type { Character } from './character-types'

export type { Character } from './character-types'

/** Picks the renderer from the model file name. Each renderer is loaded only when used. */
export async function createCharacter(canvas: HTMLCanvasElement, modelUrl: string): Promise<Character> {
  if (/\.vrm(\?|#|$)/i.test(modelUrl)) {
    const { VrmCharacter } = await import('./character-vrm')
    return new VrmCharacter(canvas)
  }
  const { Live2DCharacter } = await import('./character-live2d')
  return new Live2DCharacter(canvas)
}
