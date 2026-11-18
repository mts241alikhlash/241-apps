import type { RouteRecordRaw } from 'vue-router'
import { PRINT_DOCUMENTS } from './documents'
import { PRINT_DOCUMENT_KEYS } from './types'

const crumbs = (title: string, href: string) => [
  { title: 'Ujian', href: '#' },
  { title: 'Cetak Dokumen', href: '#' },
  { title, href },
]

export const examPrintRoutes: RouteRecordRaw[] = PRINT_DOCUMENT_KEYS.map(
  (doc) => {
    const { title } = PRINT_DOCUMENTS[doc]
    const path = `/exam/print/${doc}`
    return {
      path,
      name: `ExamPrint-${doc}`,
      component: () => import('./views/PrintDocumentView.vue'),
      props: { doc },
      meta: {
        title,
        requiresAuth: true,
        requiredAnyPermission: ['exam-events.manage'],
        breadcrumbs: crumbs(title, path),
      },
    }
  },
)
