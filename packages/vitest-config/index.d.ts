import type { UserConfig } from 'vitest/config'

export function vue(options?: { root?: string; alias?: boolean }): UserConfig
export function nest(options?: { root?: string }): UserConfig
