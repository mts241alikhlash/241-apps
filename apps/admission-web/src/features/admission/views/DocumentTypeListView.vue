<script setup lang="ts">
import { computed, h, onMounted, ref } from 'vue'
import { DataTable, ActionCell } from '@mts241alikhlash/ui'
import { Button } from '@mts241alikhlash/ui/button'
import { Card, CardHeader } from '@mts241alikhlash/ui/card'
import { Badge } from '@mts241alikhlash/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@mts241alikhlash/ui/alert-dialog'
import { Plus } from '@lucide/vue'
import type { ColumnDef } from '@tanstack/vue-table'
import { useRoleGuard } from '@/features/platform/auth'
import DocumentTypeFormDialog from '../components/DocumentTypeFormDialog.vue'
import { documentTypeService } from '../services/documentTypeService'
import type {
  AdmissionDocumentTypeAdmin,
  DocumentTypeSavePayload,
} from '../types'

const deleteTitle = 'Hapus jenis berkas?'
const deleteDescription =
  'Jenis berkas ini belum pernah diunggah dan akan dihapus permanen.'

const { can } = useRoleGuard()
const canCreate = computed(() => can('admission-document-types.create'))
const canUpdate = computed(() => can('admission-document-types.update'))
const canDelete = computed(() => can('admission-document-types.delete'))

const types = ref<AdmissionDocumentTypeAdmin[]>([])
const loading = ref(false)
const listError = ref<string | null>(null)
const isSaving = ref(false)
const isFormOpen = ref(false)
const editing = ref<AdmissionDocumentTypeAdmin | null>(null)
const pendingDelete = ref<AdmissionDocumentTypeAdmin | null>(null)

function requirementVariant(
  requirement: AdmissionDocumentTypeAdmin['requirement'],
) {
  return requirement === 'OPTIONAL' ? 'secondary' : 'default'
}

function requirementLabel(type: AdmissionDocumentTypeAdmin) {
  if (type.requirement === 'LATER') {
    return type.lateDueMonths
      ? `Susulan · ${type.lateDueMonths} bln`
      : 'Susulan'
  }
  return type.requirement === 'REQUIRED' ? 'Wajib' : 'Opsional'
}

const columns = computed<ColumnDef<AdmissionDocumentTypeAdmin>[]>(() => [
  { accessorKey: 'name', header: 'Nama', meta: { strong: true } },
  {
    accessorKey: 'code',
    header: 'Kode',
    meta: { mobile: 'hide' },
    cell: ({ row }) =>
      h('span', { class: 'text-muted-foreground' }, row.original.code),
  },
  {
    id: 'requirement',
    header: 'Kewajiban',
    meta: {
      mobileValue: (row: AdmissionDocumentTypeAdmin) => requirementLabel(row),
    },
    cell: ({ row }) =>
      h(Badge, { variant: requirementVariant(row.original.requirement) }, () =>
        requirementLabel(row.original),
      ),
  },
  {
    id: 'isActive',
    header: 'Status',
    meta: {
      align: 'center',
      mobileValue: (row: AdmissionDocumentTypeAdmin) =>
        row.isActive ? 'Aktif' : 'Nonaktif',
    },
    cell: ({ row }) =>
      h(
        Badge,
        { variant: row.original.isActive ? 'default' : 'secondary' },
        () => (row.original.isActive ? 'Aktif' : 'Nonaktif'),
      ),
  },
  {
    id: 'actions',
    header: 'Aksi',
    cell: ({ row }) =>
      h(ActionCell, {
        hideEdit: !canUpdate.value,
        hideDelete: !canDelete.value || row.original.documentCount > 0,
        deleteTitle,
        deleteDescription,
        onEdit: () => openForm(row.original),
        onDelete: () => {
          pendingDelete.value = row.original
        },
      }),
    enableSorting: false,
  },
])

async function load() {
  loading.value = true
  const result = await documentTypeService.fetchAll()
  listError.value = 'error' in result ? result.error : null
  types.value = 'types' in result ? result.types : []
  loading.value = false
}

function openForm(type: AdmissionDocumentTypeAdmin | null) {
  editing.value = type
  isFormOpen.value = true
}

async function handleSave(payload: DocumentTypeSavePayload) {
  isSaving.value = true
  const result = await documentTypeService.save(
    editing.value?.id ?? null,
    payload,
  )
  isSaving.value = false
  if (!result.success) return
  isFormOpen.value = false
  await load()
}

async function remove(type: AdmissionDocumentTypeAdmin) {
  isSaving.value = true
  const result = await documentTypeService.remove(type.id)
  isSaving.value = false
  if (result.success) await load()
}

async function confirmDelete() {
  if (!pendingDelete.value) return
  const type = pendingDelete.value
  pendingDelete.value = null
  await remove(type)
}

onMounted(load)
</script>

<template>
  <div class="px-4 pb-4 pt-1 sm:px-6 sm:pb-6 sm:pt-2">
    <Card
      gap="none"
      class="overflow-visible rounded-none border-0 bg-transparent shadow-none ring-0"
    >
      <CardHeader
        standard
        class="justify-end min-h-0 border-b-0 bg-transparent px-0 pt-0 pb-3 sm:px-0"
      >
        <Button
          v-if="canCreate"
          class="w-full sm:w-auto"
          @click="openForm(null)"
        >
          <Plus class="mr-1.5 size-4" />
          Tambah
        </Button>
      </CardHeader>

      <div class="space-y-4 p-0 sm:px-0">
        <div
          v-if="listError"
          class="space-y-3 rounded-md border p-4"
          role="alert"
        >
          <p class="text-[length:var(--text-control,0.75rem)]">
            {{ listError }}
          </p>
          <Button
            variant="outline"
            @click="load()"
          >
            Coba lagi
          </Button>
        </div>
        <template v-else>
          <p
            v-if="loading && !types.length"
            class="text-center text-[length:var(--text-control,0.75rem)] text-muted-foreground"
          >
            Memuat jenis berkas…
          </p>
          <p
            v-else-if="!types.length"
            class="rounded-md border p-4 text-center text-[length:var(--text-control,0.75rem)] text-muted-foreground"
          >
            Belum ada jenis berkas.
          </p>
          <template v-else>
            <DataTable
              :columns="columns"
              :data="types"
              item-label="jenis berkas"
              hide-per-page
              hide-pagination
              :page-size="Math.max(1, types.length)"
              mobile="cards"
            />
          </template>
        </template>
      </div>
    </Card>

    <DocumentTypeFormDialog
      :open="isFormOpen"
      :document-type="editing"
      :is-saving="isSaving"
      @update:open="isFormOpen = $event"
      @save="handleSave"
    />

    <AlertDialog
      :open="pendingDelete !== null"
      @update:open="
        (open) => {
          if (!open) pendingDelete = null
        }
      "
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{{ deleteTitle }}</AlertDialogTitle>
          <AlertDialogDescription>
            {{ deleteDescription }}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel :disabled="isSaving">Batal</AlertDialogCancel>
          <AlertDialogAction
            :disabled="isSaving"
            @click="confirmDelete"
          >
            Hapus
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>
