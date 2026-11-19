export const REPORT_FILE_MAX_BYTES = 10 * 1024 * 1024

export const REPORT_FILE_ACCEPT = '.pdf,.jpg,.jpeg,.png'

export function reportFileProblem(file: File): string | null {
  if (!/\.(pdf|jpe?g|png)$/i.test(file.name)) {
    return 'Berkas harus PDF, JPG, atau PNG.'
  }
  if (file.size > REPORT_FILE_MAX_BYTES) {
    return 'Ukuran berkas maksimal 10 MB.'
  }
  return null
}
