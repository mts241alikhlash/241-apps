export function parseFrontendOrigins(value: string): string[] {
  return value
    .split(',')
    .map((u) => u.trim())
    .filter(Boolean)
}
