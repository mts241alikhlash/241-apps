const XLSX_MIME =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

export function isValidExcelFile(file: File): boolean {
  return file.type === XLSX_MIME || file.name.endsWith('.xlsx')
}
