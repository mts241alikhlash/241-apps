import { z } from 'zod'

const REQUIRED = 'Wajib diisi'

export const indonesianErrorMap: z.ZodErrorMap = (issue, ctx) => {
  switch (issue.code) {
    case z.ZodIssueCode.invalid_type:
      return {
        message:
          issue.received === 'undefined' || issue.received === 'null'
            ? REQUIRED
            : 'Isian tidak valid',
      }
    case z.ZodIssueCode.too_small:
      if (issue.type === 'string') {
        return {
          message:
            Number(issue.minimum) <= 1
              ? REQUIRED
              : `Minimal ${String(issue.minimum)} karakter`,
        }
      }
      if (issue.type === 'array' && Number(issue.minimum) <= 1) {
        return { message: REQUIRED }
      }
      return { message: `Minimal ${String(issue.minimum)}` }
    case z.ZodIssueCode.too_big:
      return issue.type === 'string'
        ? { message: `Maksimal ${String(issue.maximum)} karakter` }
        : { message: `Maksimal ${String(issue.maximum)}` }
    case z.ZodIssueCode.invalid_string:
      return issue.validation === 'email'
        ? { message: 'Format email tidak valid' }
        : { message: 'Isian tidak valid' }
    case z.ZodIssueCode.invalid_enum_value:
      return { message: 'Pilihan tidak valid' }
    default:
      return { message: ctx.defaultError }
  }
}
