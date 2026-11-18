export type ReportFileMime = 'application/pdf' | 'image/jpeg' | 'image/png'

export const REPORT_FILE_MAX_BYTES = 10 * 1024 * 1024

const PDF = [0x25, 0x50, 0x44, 0x46, 0x2d]
const JPEG = [0xff, 0xd8, 0xff]
const PNG = [0x89, 0x50, 0x4e, 0x47]

const EXTENSIONS: Record<ReportFileMime, string> = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
}

function startsWith(buffer: Buffer, bytes: number[]): boolean {
  return (
    buffer.length >= bytes.length &&
    bytes.every((byte, index) => buffer[index] === byte)
  )
}

export function detectReportFile(
  buffer: Buffer,
): { mimeType: ReportFileMime; extension: string } | null {
  const mimeType: ReportFileMime | null = startsWith(buffer, PDF)
    ? 'application/pdf'
    : startsWith(buffer, JPEG)
      ? 'image/jpeg'
      : startsWith(buffer, PNG)
        ? 'image/png'
        : null
  return mimeType === null
    ? null
    : { mimeType, extension: EXTENSIONS[mimeType] }
}

export function extensionOf(mimeType: string): string {
  return EXTENSIONS[mimeType as ReportFileMime] ?? 'bin'
}
