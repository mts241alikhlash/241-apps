export type ActivityTokenMode = 'ROTATING' | 'STATIC'

export interface CodeScopeSource {
  id: string
  tokenRotation: number
  activityId?: string | null
  activityTokenRotation?: number | null
  activityTokenMode?: ActivityTokenMode | null
}

export const STATIC_SLOT_ORIGIN = new Date(0)

export interface CodeScope {
  scope: string
  rotation: number
  at: Date
  allowPreviousSlotGrace: boolean
}

export function codeScopeOf(
  source: CodeScopeSource,
  now: Date = new Date(),
): CodeScope {
  if (source.activityId !== null && source.activityId !== undefined) {
    const staticCode = source.activityTokenMode === 'STATIC'
    return {
      scope: `activity:${source.activityId}`,
      rotation: source.activityTokenRotation ?? 0,
      at: staticCode ? STATIC_SLOT_ORIGIN : now,
      allowPreviousSlotGrace: !staticCode,
    }
  }
  return {
    scope: source.id,
    rotation: source.tokenRotation,
    at: now,
    allowPreviousSlotGrace: true,
  }
}
