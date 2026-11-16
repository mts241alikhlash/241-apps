import { BadRequestException, Injectable } from '@nestjs/common'
import type { QuestionType } from '../../../../question/domain/value-objects/question-content.js'
import { STANDARD_COUNTS } from '../../../domain/import-standard.js'
import { buildDocxTemplate } from '../../templates/docx-template.js'
import { buildVerticalDocxTemplate } from '../../templates/vertical-docx-template.js'
import { buildXlsxTemplate } from '../../templates/xlsx-template.js'

export type TemplateFormat = 'xlsx' | 'docx'

export interface ImportTemplate {
  buffer: Buffer
  fileName: string
  contentType: string
}

export interface TemplateOptions {
  layout?: 'table' | 'vertical'
  counts?: Record<QuestionType, number>
}

const DOCX_TYPE =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

@Injectable()
export class GetImportTemplateUseCase {
  async execute(
    format: TemplateFormat,
    options: TemplateOptions = {},
  ): Promise<ImportTemplate> {
    if (options.layout === 'vertical') {
      if (format !== 'docx') {
        throw new BadRequestException('Susunan vertikal hanya untuk Word')
      }
      return {
        buffer: await buildVerticalDocxTemplate(
          options.counts ?? STANDARD_COUNTS,
        ),
        fileName: 'template-soal-vertikal.docx',
        contentType: DOCX_TYPE,
      }
    }
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
      contentType: DOCX_TYPE,
    }
  }
}
