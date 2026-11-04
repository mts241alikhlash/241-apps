import type { ClassValue } from 'clsx'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatEntityName(
  name: string | undefined | null,
  deletedAt?: string | Date | null,
): string {
  if (!name) return ''
  let cleanName: string = name
  const parts = name.split('_deleted_')
  if (parts.length > 1 && parts[0]) {
    cleanName = parts[0]
    return `${cleanName} (Terhapus)`
  }

  if (deletedAt) {
    return `${cleanName} (Terhapus)`
  }

  return cleanName
}
