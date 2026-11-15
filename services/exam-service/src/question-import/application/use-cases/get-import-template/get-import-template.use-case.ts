import { Injectable } from '@nestjs/common'
import { buildDocxTemplate } from '../../templates/docx-template.js'
import { buildXlsxTemplate } from '../../templates/xlsx-template.js'

export type TemplateFormat = 'xlsx' | 'docx'

export interface ImportTemplate {
  buffer: Buffer
  fileName: string
  contentType: string
}

@Injectable()
export class GetImportTemplateUseCase {
  async execute(format: TemplateFormat): Promise<ImportTemplate> {
    if (format === 'xlsx') {
      return {
        buffer: await buildXlsxTemplate(),
        fileName: 'template-soal.xlsx',
        contentType:
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }
    }
    return {
      buffer: await buildDocxTemplate(),
      fileName: 'template-soal.docx',
      contentType:
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    }
  }
}
