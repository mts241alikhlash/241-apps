export function getFieldErrorDetail(
  aliases: string[],
  formattedError: string,
): string {
  if (!formattedError) return ''
  const lines = formattedError.split(';').map((l) => l.trim())
  const matches = lines.filter((line) =>
    aliases.some((alias) =>
      new RegExp(`\\b${escapeRegExp(alias)}\\b`, 'i').test(line),
    ),
  )
  return matches.length > 0 ? matches.join('; ') : ''
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
