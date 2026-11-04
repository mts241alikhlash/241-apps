import type { AdmissionDocumentType } from '../types'

export interface LateDocumentReminder {
  name: string
  dueDate: string | null
  note: string | null
}

export function lateDocumentReminders(
  documentTypes: AdmissionDocumentType[],
  documents: { documentTypeId: string; status: string; note?: string | null }[],
): LateDocumentReminder[] {
  return documentTypes
    .filter((type) => type.requirement === 'LATER')
    .flatMap((type) => {
      const document = documents.find((item) => item.documentTypeId === type.id)
      if (document && document.status !== 'REJECTED') return []
      return [
        {
          name: type.name,
          dueDate: type.dueDate ?? null,
          note: document?.note ?? null,
        },
      ]
    })
}
