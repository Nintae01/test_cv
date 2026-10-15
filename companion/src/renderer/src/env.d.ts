import type { CompanionApi } from '@shared/types'

declare global {
  interface Window {
    companion: CompanionApi
    /** Present once live2dcubismcore.min.js has loaded. */
    Live2DCubismCore?: unknown
  }
}

export {}
