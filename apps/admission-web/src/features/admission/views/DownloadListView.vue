<script setup lang="ts">
import { computed, h, nextTick, onMounted, ref, useId } from 'vue'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { DataTable, ActionCell } from '@mts241alikhlash/ui'
import { Button } from '@mts241alikhlash/ui/button'
import { Card, CardHeader } from '@mts241alikhlash/ui/card'
import { Badge } from '@mts241alikhlash/ui/badge'
import { Input } from '@mts241alikhlash/ui/input'
import { FormControl } from '@mts241alikhlash/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@mts241alikhlash/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@mts241alikhlash/ui/dialog'
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
import { ChevronDown, ChevronUp, Plus } from '@lucide/vue'
import type { ColumnDef } from '@tanstack/vue-table'
import { useRoleGuard } from '@/features/platform/auth'
import FloatingField from '../components/AdmissionField.vue'
import { downloadSchema } from '../schemas/applicationFormSchemas'
import { downloadService } from '../services/downloadService'
import type { AdmissionDownloadAdmin, DownloadSavePayload } from '../types'
import { formatFileSize, pdfFileError } from '../utils'

const deleteTitle = 'Hapus berkas?'
const deleteDescription =
  'Berkas ini akan dihapus permanen dan tidak bisa diunduh lagi dari halaman depan.'

const { can } = useRoleGuard()
const canCreate = computed(() => can('admission-downloads.create'))
const canUpdate = computed(() => can('admission-downloads.update'))
const canDelete = computed(() => can('admission-downloads.delete'))

const downloads = ref<AdmissionDownloadAdmin[]>([])
const loading = ref(false)
const listError = ref<string | null>(null)
const isSaving = ref(false)
const isFormOpen = ref(false)
const editing = ref<AdmissionDownloadAdmin | null>(null)
const pendingDelete = ref<AdmissionDownloadAdmin | null>(null)
const pickedFile = ref<File | null>(null)
const fileError = ref<string | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const fileInputId = useId()
const fileHintId = useId()

const { handleSubmit, resetForm } = useForm<Omit<DownloadSavePayload, 'file'>>({
  validationSchema: toTypedSchema(downloadSchema),
})

function moveButtons(download: AdmissionDownloadAdmin, index: number) {
  return [
    {
      label: `Naikkan ${download.title}`,
      icon: ChevronUp,
      disabled: index === 0,
      step: -1,
    },
    {
      label: `Turunkan ${download.title}`,
      icon: ChevronDown,
      disabled: index === downloads.value.length - 1,
      step: 1,
    },
  ]
}

const columns = computed<ColumnDef<AdmissionDownloadAdmin>[]>(() => [
  ...(canUpdate.value
    ? [
        {
          id: 'order',
          header: 'Urutan',
          enableSorting: false,
          cell: ({ row }) =>
            h(
              'div',
              { class: 'flex gap-1' },
              moveButtons(row.original, row.index).map((button) =>
                h(
                  Button,
                  {
                    variant: 'outline',
                    size: 'icon',
                    disabled: button.disabled,
                    'aria-label': button.label,
                    onClick: () => move(row.index, button.step),
                  },
                  () => h(button.icon),
                ),
              ),
            ),
        } satisfies ColumnDef<AdmissionDownloadAdmin>,
      ]
    : []),
  {
    accessorKey: 'title',
    header: 'Judul',
    meta: { strong: true },
    cell: ({ row }) =>
      h('div', { class: 'space-y-0.5' }, [
        h('p', {}, row.original.title),
        row.original.description
          ? h(
              'p',
              { class: 'text-xs text-muted-foreground' },
              row.original.description,
            )
          : null,
      ]),
  },
  {
    id: 'file',
    header: 'Berkas',
    cell: ({ row }) =>
      h(
        'span',
        { class: 'text-muted-foreground' },
        `${row.original.fileName} · ${formatFileSize(row.original.sizeBytes)}`,
      ),
  },
  {
    id: 'isActive',
    header: 'Status',
    meta: {
      align: 'center',
      mobileValue: (row: AdmissionDownloadAdmin) =>
        row.isActive ? 'Aktif' : 'Nonaktif',
    },
    cell: ({ row }) =>
      h(
        Badge,
        { variant: row.original.isActive ? 'default' : 'secondary' },
        () => (row.original.isActive ? 'Aktif' : 'Nonaktif'),
      ),
  },
  ...(canUpdate.value || canDelete.value
    ? [
        {
          id: 'actions',
          header: 'Aksi',
          cell: ({ row }) =>
            h(ActionCell, {
              hideEdit: !canUpdate.value,
              hideDelete: !canDelete.value,
              deleteTitle,
              deleteDescription,
              onEdit: () => openForm(row.original),
              onDelete: async ({
                closeAlert,
                setLoading,
              }: {
                closeAlert: () => void
                setLoading: (state: boolean) => void
              }) => {
                setLoading(true)
                await remove(row.original)
                setLoading(false)
                closeAlert()
              },
            }),
          enableSorting: false,
        } satisfies ColumnDef<AdmissionDownloadAdmin>,
      ]
    : []),
])

async function load() {
  loading.value = true
  const result = await downloadService.fetchAll()
  listError.value = 'error' in result ? result.error : null
  downloads.value = 'downloads' in result ? result.downloads : []
  loading.value = false
}

async function move(index: number, step: number) {
  const ids = downloads.value.map((download) => download.id)
  const target = index + step
  if (target < 0 || target >= ids.length) return
  ;[ids[index], ids[target]] = [ids[target], ids[index]]
  const result = await downloadService.reorder(ids)
  if (result.success) await load()
}

async function remove(download: AdmissionDownloadAdmin) {
  const result = await downloadService.remove(download.id)
  if (result.success) await load()
}

async function confirmDelete() {
  if (!pendingDelete.value) return
  const download = pendingDelete.value
  pendingDelete.value = null
  await remove(download)
}

function openForm(download: AdmissionDownloadAdmin | null) {
  editing.value = download
  pickedFile.value = null
  fileError.value = null
  resetForm({
    values: {
      title: download?.title ?? '',
      description: download?.description ?? '',
      isActive: download?.isActive ?? true,
    },
  })
  isFormOpen.value = true
  void nextTick(() => {
    if (fileInput.value) fileInput.value.value = ''
  })
}

function onFileChange(event: Event) {
  const picked = (event.target as HTMLInputElement).files?.[0] ?? null
  const problem = picked ? pdfFileError(picked) : null
  fileError.value = problem
  pickedFile.value = problem ? null : picked
}

const save = handleSubmit(async (payload) => {
  if (fileError.value) return
  if (!editing.value && !pickedFile.value) {
    fileError.value = 'Pilih berkas PDF.'
    return
  }
  isSaving.value = true
  const result = await downloadService.save(editing.value?.id ?? null, {
    ...payload,
    file: pickedFile.value,
  })
  isSaving.value = false
  if (!result.success) return
  isFormOpen.value = false
  await load()
})

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
        <p
          class="text-[length:var(--text-control,0.75rem)] text-muted-foreground"
        >
          Berkas PDF yang bisa diunduh calon pendaftar dari halaman depan,
          misalnya brosur dan formulir kosong. Hanya berkas yang aktif yang
          tampil.
        </p>
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
          <DataTable
            mobile="cards"
            :columns="columns"
            :data="downloads"
            :total-items="downloads.length"
            :is-loading="loading"
            item-label="berkas"
            hide-per-page
            hide-pagination
          />
        </template>
      </div>
    </Card>

    <Dialog v-model:open="isFormOpen">
      <DialogContent size="md">
        <DialogHeader standard>
          <DialogTitle>
            {{ editing ? 'Ubah Berkas' : 'Tambah Berkas' }}
          </DialogTitle>
          <DialogDescription class="sr-only">
            Berkas PDF yang bisa diunduh dari halaman depan pendaftaran.
          </DialogDescription>
        </DialogHeader>
        <div class="min-h-0 flex-1 overflow-y-auto">
          <form
            id="download-form"
            class="space-y-4 dialog-body"
            @submit.prevent="save"
          >
            <FloatingField
              v-slot="{ componentField }"
              name="title"
              label="Judul"
              required
            >
              <FormControl>
                <Input
                  v-bind="componentField"
                  maxlength="100"
                />
              </FormControl>
            </FloatingField>
            <FloatingField
              v-slot="{ componentField }"
              name="description"
              label="Keterangan (opsional)"
            >
              <FormControl>
                <Input
                  v-bind="componentField"
                  maxlength="255"
                />
              </FormControl>
            </FloatingField>
            <div class="space-y-1.5">
              <label
                :for="fileInputId"
                class="text-[length:var(--text-control,0.75rem)] font-medium"
                >Berkas PDF<span
                  v-if="!editing"
                  class="text-destructive"
                >
                  *</span
                ></label
              >
              <input
                :id="fileInputId"
                ref="fileInput"
                type="file"
                accept="application/pdf,.pdf"
                :aria-describedby="fileHintId"
                class="block min-h-11 w-full cursor-pointer rounded-md border bg-background px-3 py-2 text-[length:var(--text-control,0.75rem)] file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1 file:text-[length:var(--text-control,0.75rem)] file:font-medium"
                @change="onFileChange"
              />
              <p
                :id="fileHintId"
                class="text-xs text-muted-foreground"
              >
                PDF, maksimal 5 MB.
                <template v-if="editing">
                  Kosongkan bila berkas tidak diganti. Saat ini:
                  {{ editing.fileName }} ({{
                    formatFileSize(editing.sizeBytes)
                  }}).
                </template>
              </p>
              <p
                v-if="fileError"
                role="alert"
                class="text-xs text-destructive"
              >
                {{ fileError }}
              </p>
            </div>
            <FloatingField
              v-slot="{ value, handleChange }"
              name="isActive"
              label="Status"
              required
            >
              <Select
                :model-value="String(value)"
                :disabled="isSaving"
                @update:model-value="handleChange($event === 'true')"
              >
                <FormControl>
                  <SelectTrigger class="w-full">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="true"> Aktif </SelectItem>
                  <SelectItem value="false"> Nonaktif </SelectItem>
                </SelectContent>
              </Select>
            </FloatingField>
          </form>
        </div>
        <DialogFooter
          standard
          class="justify-between"
        >
          <Button
            type="button"
            variant="outline"
            :disabled="isSaving"
            @click="isFormOpen = false"
          >
            Batal
          </Button>
          <Button
            type="submit"
            form="download-form"
            :disabled="isSaving"
          >
            {{ isSaving ? 'Menyimpan…' : 'Simpan' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

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
          <AlertDialogCancel>Batal</AlertDialogCancel>
          <AlertDialogAction @click="confirmDelete">Hapus</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>
