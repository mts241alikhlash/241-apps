export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024

export function isWithinUploadLimit(file: File): boolean {
  return file.size <= MAX_UPLOAD_BYTES
}
