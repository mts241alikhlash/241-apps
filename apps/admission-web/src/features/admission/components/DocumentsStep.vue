<script setup lang="ts">
import { computed, h, ref } from 'vue'
import type { ColumnDef } from '@tanstack/vue-table'
import { ActionCell, DataTable, FileDropzone } from '@mts241alikhlash/ui'
import { Badge } from '@mts241alikhlash/ui/badge'
import { Button } from '@mts241alikhlash/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@mts241alikhlash/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@mts241alikhlash/ui/dialog'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@mts241alikhlash/ui/tooltip'
import { DOCUMENT_STATUS_LABELS } from '../types'
import { DOCUMENT_STATUS_BADGE_VARIANTS, formatJakartaDate } from '../utils'
import type { AdmissionDocument, AdmissionDocumentType } from '../types'

const props = defineProps<{
  documentTypes: AdmissionDocumentType[]
  documents: AdmissionDocument[]
  documentFiles: Record<string, File | null>
  uploadingDoc: string | null
  editable: boolean
  onFileChange: (typeCode: string, event: Event) => void
  onClearFile: (typeCode: string) => void
  onUpload: (typeCode: string) => Promise<boolean>
}>()

const activeDocType = ref<AdmissionDocumentType | null>(null)
const selectedFile = computed(() =>
  activeDocType.value ? props.documentFiles[activeDocType.value.code] : null,
)

const REQUIREMENT_ORDER = { REQUIRED: 0, LATER: 1, OPTIONAL: 2 } as const

const sortedTypes = computed(() =>
  [...props.documentTypes].sort(
    (a, b) =>
      REQUIREMENT_ORDER[a.requirement] - REQUIREMENT_ORDER[b.requirement],
  ),
)

function laterNote(type: AdmissionDocumentType) {
  if (type.requirement !== 'LATER') return null
  return type.dueDate
    ? `Boleh dikirim belakangan. Serahkan ke TU paling lambat ${formatJakartaDate(type.dueDate)}.`
    : 'Boleh dikirim belakangan. Serahkan ke TU sesuai pemberitahuan sekolah.'
}

function uploadLabel(type: AdmissionDocumentType) {
  return type.requirement === 'LATER'
    ? 'Unggah kalau sudah ada'
    : 'Unggah Berkas'
}

function documentFor(typeId: string) {
  return props.documents.find((d) => d.documentTypeId === typeId)
}

const columns = computed<ColumnDef<AdmissionDocumentType>[]>(() => [
  {
    accessorKey: 'name',
    header: 'Jenis Dokumen',
    meta: { strong: true },
    cell: ({ row }) => {
      const note = laterNote(row.original)
      return h('div', { class: 'min-w-0 space-y-1' }, [
        h('span', [
          row.original.name,
          row.original.requirement === 'REQUIRED'
            ? h(
                'span',
                { class: 'text-destructive', 'aria-label': 'wajib' },
                ' *',
              )
            : null,
        ]),
        note
          ? h(
              'p',
              { class: 'text-xs text-amber-700 dark:text-amber-400' },
              note,
            )
          : null,
      ])
    },
  },
  {
    id: 'file',
    header: 'Berkas',
    meta: { mobileLabel: 'Berkas' },
    cell: ({ row }) => {
      const document = documentFor(row.original.id)
      return h(
        'span',
        { class: 'break-all' },
        document?.file?.originalName ?? '-',
      )
    },
  },
  {
    id: 'status',
    header: 'Status',
    meta: {
      align: 'center',
      mobileValue: (row: AdmissionDocumentType) => {
        const document = documentFor(row.id)
        const label = document?.file
          ? DOCUMENT_STATUS_LABELS[document.status]
          : 'Belum diunggah'
        return document?.note ? `${label}. ${document.note}` : label
      },
    },
    cell: ({ row }) => {
      const document = documentFor(row.original.id)
      const variant = document?.file
        ? DOCUMENT_STATUS_BADGE_VARIANTS[document.status]
        : 'outline'
      const label = document?.file
        ? DOCUMENT_STATUS_LABELS[document.status]
        : 'Belum diunggah'
      if (!document?.note) return h(Badge, { variant }, () => label)
      return h(Tooltip, null, () => [
        h(TooltipTrigger, { asChild: true }, () =>
          h(
            Badge,
            {
              variant,
              tabindex: 0,
              class:
                'cursor-help focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-2',
            },
            () => label,
          ),
        ),
        h(TooltipContent, null, () => document.note),
      ])
    },
  },
  ...(props.editable
    ? [
        {
          id: 'actions',
          header: 'Aksi',
          enableSorting: false,
          cell: ({ row }: { row: { original: AdmissionDocumentType } }) =>
            h(ActionCell, {
              hideDelete: true,
              editLabel: documentFor(row.original.id)?.file
                ? 'Ganti Berkas'
                : uploadLabel(row.original),
              onEdit: () => {
                activeDocType.value = row.original
              },
            }),
        } satisfies ColumnDef<AdmissionDocumentType>,
      ]
    : []),
])

function selectFile(typeCode: string, event: Event) {
  const input = event.target as HTMLInputElement
  props.onFileChange(typeCode, event)
  input.value = ''
}

function closeDialog() {
  if (props.uploadingDoc || !activeDocType.value) return
  props.onClearFile(activeDocType.value.code)
  activeDocType.value = null
}

async function upload() {
  const code = activeDocType.value?.code
  if (code && (await props.onUpload(code))) activeDocType.value = null
}
</script>

<template>
  <div>
    <Card
      gap="none"
      class="overflow-hidden"
    >
      <CardHeader standard>
        <div class="flex items-center gap-3">
          <CardTitle size="md">Dokumen Persyaratan</CardTitle>
        </div>
      </CardHeader>
      <CardContent class="px-4 pt-4 pb-4">
        <p
          v-if="!documentTypes.length"
          class="text-[length:var(--text-control,0.75rem)] text-muted-foreground"
        >
          Belum ada jenis berkas yang tersedia.
        </p>
        <template v-else>
          <DataTable
            mobile="cards"
            :columns="columns"
            :data="sortedTypes"
            item-label="dokumen"
            hide-per-page
            hide-pagination
            :page-size="Math.max(1, sortedTypes.length)"
          />
        </template>
      </CardContent>
    </Card>

    <Dialog
      :open="!!activeDocType"
      @update:open="!$event && closeDialog()"
    >
      <DialogContent size="md">
        <DialogHeader standard>
          <DialogTitle>Unggah {{ activeDocType?.name }}</DialogTitle>
          <DialogDescription class="sr-only"
            >Pilih berkas dokumen pendaftaran.</DialogDescription
          >
        </DialogHeader>
        <div class="min-h-0 flex-1 overflow-y-auto dialog-body">
          <FileDropzone
            :file-name="selectedFile?.name"
            :disabled="!!uploadingDoc"
            clearable
            :aria-label="`Pilih berkas ${activeDocType?.name}`"
            hint="JPG, PNG, atau PDF, maks. 5 MB"
            @change="activeDocType && selectFile(activeDocType.code, $event)"
            @clear="activeDocType && onClearFile(activeDocType.code)"
          />
        </div>
        <DialogFooter
          standard
          class="justify-between"
        >
          <Button
            variant="outline"
            :disabled="!!uploadingDoc"
            @click="closeDialog"
            >Batal</Button
          >
          <Button
            :disabled="!!uploadingDoc || !selectedFile"
            @click="upload"
          >
            {{ uploadingDoc ? 'Mengunggah…' : 'Unggah' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
