export function findCardOverrides(
  source: string,
): { tag: string; className: string }[]

export function findOffScaleSpacing(source: string): { value: string }[]

export function findRawPalette(
  source: string,
  options?: { exempt?: boolean },
): { value: string }[]
