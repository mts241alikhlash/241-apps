import { BadRequestException } from '@nestjs/common'
import type { ExamType } from '../../../exam-schedule/domain/entities/exam-schedule.entity'

export interface ExamPolicy {
  violationLimit: number
  focusThresholdMs: number
  snapshotIntervalMs: number
  heartbeatIntervalMs: number
  gapRecordedMs: number
  gapTokenMs: number
  gapViolationFrom: number
  tokenSlotSeconds: number
}

export type ExamPresetName = ExamType

const BOUNDS = {
  violationLimit: [1, 10],
  focusThresholdMs: [3_000, 60_000],
  snapshotIntervalMs: [10_000, 300_000],
  heartbeatIntervalMs: [10_000, 120_000],
  gapRecordedMs: [30_000, 600_000],
  gapTokenMs: [30_000, 3_600_000],
  gapViolationFrom: [1, 5],
  tokenSlotSeconds: [300, 3_600],
} as const satisfies Record<keyof ExamPolicy, readonly [number, number]>

export const POLICY_KEYS = Object.keys(BOUNDS) as (keyof ExamPolicy)[]

export const DEFAULT_POLICIES: Record<ExamType, ExamPolicy> = {
  DAILY: {
    violationLimit: 3,
    focusThresholdMs: 10_000,
    snapshotIntervalMs: 15_000,
    heartbeatIntervalMs: 15_000,
    gapRecordedMs: 60_000,
    gapTokenMs: 300_000,
    gapViolationFrom: 2,
    tokenSlotSeconds: 600,
  },
  ASSIGNMENT: {
    violationLimit: 3,
    focusThresholdMs: 10_000,
    snapshotIntervalMs: 30_000,
    heartbeatIntervalMs: 15_000,
    gapRecordedMs: 300_000,
    gapTokenMs: 1_800_000,
    gapViolationFrom: 3,
    tokenSlotSeconds: 600,
  },
  MIDTERM: {
    violationLimit: 3,
    focusThresholdMs: 10_000,
    snapshotIntervalMs: 15_000,
    heartbeatIntervalMs: 15_000,
    gapRecordedMs: 60_000,
    gapTokenMs: 300_000,
    gapViolationFrom: 2,
    tokenSlotSeconds: 600,
  },
  FINAL: {
    violationLimit: 3,
    focusThresholdMs: 10_000,
    snapshotIntervalMs: 15_000,
    heartbeatIntervalMs: 15_000,
    gapRecordedMs: 60_000,
    gapTokenMs: 300_000,
    gapViolationFrom: 2,
    tokenSlotSeconds: 600,
  },
}

export function policyOfPreset(name: ExamPresetName): ExamPolicy {
  return { ...DEFAULT_POLICIES[name] }
}

function readNumber(
  value: unknown,
  key: keyof ExamPolicy,
  fallback: number,
): number {
  if (value === undefined || value === null) return fallback
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    throw new BadRequestException(`${key} harus bilangan bulat`)
  }
  const [min, max] = BOUNDS[key]
  if (value < min || value > max) {
    throw new BadRequestException(`${key} harus ${min} sampai ${max}`)
  }
  return value
}

export function parsePolicy(
  value: unknown,
  base: ExamPolicy = DEFAULT_POLICIES.MIDTERM,
): ExamPolicy {
  const source =
    value !== null && typeof value === 'object'
      ? (value as Record<string, unknown>)
      : {}
  const policy = {} as ExamPolicy
  for (const key of POLICY_KEYS) {
    policy[key] = readNumber(source[key], key, base[key])
  }
  if (policy.gapTokenMs < policy.gapRecordedMs) {
    throw new BadRequestException(
      'gapTokenMs tidak boleh lebih kecil dari gapRecordedMs',
    )
  }
  return policy
}

export function tryParsePolicy(
  value: unknown,
  base: ExamPolicy = DEFAULT_POLICIES.MIDTERM,
): ExamPolicy | null {
  try {
    return parsePolicy(value, base)
  } catch {
    return null
  }
}
