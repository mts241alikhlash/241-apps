const KEY = 'cbt:device-id'

export function deviceId(): string {
  try {
    const existing = window.localStorage.getItem(KEY)
    if (existing) return existing
    const created = crypto.randomUUID()
    window.localStorage.setItem(KEY, created)
    return created
  } catch {
    return `ephemeral-${crypto.randomUUID()}`
  }
}
