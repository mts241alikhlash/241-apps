const clean = (value: string) =>
  value.replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim()

export function formatAttachmentName(
  document: string,
  fullName: string,
  extension: string,
): string {
  const ext = extension.replace(/^\.+/, '').trim().toLowerCase()
  const base = `${clean(document)} - ${clean(fullName)}`
  return ext ? `${base}.${ext}` : base
}
