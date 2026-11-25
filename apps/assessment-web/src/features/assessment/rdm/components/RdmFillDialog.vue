<script setup lang="ts">
import { computed, watch } from 'vue'
import { ASSESSMENT_TYPE_LABELS } from '@/features/assessment/assessment-item/constants/category'
import { FileDropzone } from '@mts241alikhlash/ui'
import { Alert, AlertDescription, AlertTitle } from '@mts241alikhlash/ui/alert'
import { Button } from '@mts241alikhlash/ui/button'
import { Checkbox } from '@mts241alikhlash/ui/checkbox'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@mts241alikhlash/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@mts241alikhlash/ui/table'
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Info,
  Loader2,
} from '@lucide/vue'
import { RDM_MAX_SUMATIF_ITEMS, useRdmFill } from '../composables/useRdmFill'

const props = defineProps<{
  open: boolean
  teachingAssignmentId: string
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const open = computed({
  get: () => props.open,
  set: (value: boolean) => emit('update:open', value),
})

const fill = useRdmFill(() => props.teachingAssignmentId)

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      fill.reset()
      void fill.loadCandidates()
    }
  },
  { immediate: true },
)

const canSubmit = computed(() => {
  if (
    !fill.selectedFile.value ||
    fill.isSubmitting.value ||
    fill.loadingCandidates.value
  ) {
    return false
  }
  if (fill.templateKind.value === 'sas') {
    return fill.sasCandidates.value.length === 1
  }
  return fill.selectedIds.value.length > 0
})

function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement | null
  const file = input?.files?.[0] ?? null
  fill.setFile(file)
}

function handleResetFlow() {
  fill.reset()
  void fill.loadCandidates()
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent
      size="xl"
      @open-auto-focus.prevent
    >
      <DialogHeader standard>
        <DialogTitle>Isi Template RDM</DialogTitle>
        <DialogDescription>
          Unggah template Excel dari RDM untuk diisi dengan nilai penilaian pada
          kelas dan mata pelajaran ini.
        </DialogDescription>
      </DialogHeader>

      <DialogBody class="space-y-4">
        <template v-if="!fill.result.value">
          <FileDropzone
            accept=".xlsx"
            hint="File .xlsx yang diunduh dari RDM (maksimal 2 MB)"
            placeholder="Pilih atau tarik template RDM (.xlsx)"
            :file-name="fill.selectedFile.value?.name ?? null"
            :disabled="fill.isSubmitting.value"
            clearable
            aria-label="Pilih template RDM"
            @change="handleFileChange"
            @clear="fill.setFile(null)"
          />

          <div class="flex flex-wrap items-center justify-between gap-2">
            <span class="text-control font-medium text-foreground">
              Jenis Template
            </span>
            <div class="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                :variant="
                  fill.templateKind.value === 'sumatif' ? 'default' : 'outline'
                "
                @click="fill.setTemplateKind('sumatif')"
              >
                Sumatif
              </Button>
              <Button
                type="button"
                size="sm"
                :variant="
                  fill.templateKind.value === 'sas' ? 'default' : 'outline'
                "
                @click="fill.setTemplateKind('sas')"
              >
                SAS
              </Button>
            </div>
          </div>

          <div
            v-if="fill.loadingCandidates.value"
            class="flex items-center gap-2 text-control text-muted-foreground"
          >
            <Loader2 class="size-4 animate-spin" />
            Memuat daftar penilaian...
          </div>

          <template v-else-if="fill.templateKind.value === 'sumatif'">
            <div class="space-y-2">
              <div class="flex items-center justify-between gap-2">
                <span class="text-control font-medium">
                  Pilih Penilaian Sumatif
                </span>
                <div class="flex items-center gap-2">
                  <span class="text-control text-muted-foreground tabular-nums">
                    Dipilih: {{ fill.selectedIds.value.length }}/{{
                      RDM_MAX_SUMATIF_ITEMS
                    }}
                  </span>
                  <Button
                    v-if="fill.selectedIds.value.length > 0"
                    type="button"
                    variant="ghost"
                    size="sm"
                    @click="fill.clearSelection()"
                  >
                    Kosongkan
                  </Button>
                </div>
              </div>

              <div
                v-if="fill.sumatifCandidates.value.length === 0"
                class="rounded-md border bg-muted/30 p-3 text-control text-muted-foreground"
              >
                Belum ada penilaian sumatif untuk jadwal mengajar ini.
              </div>

              <div
                v-else
                class="max-h-56 space-y-1.5 overflow-y-auto rounded-md border p-2"
              >
                <label
                  v-for="item in fill.sumatifCandidates.value"
                  :key="item.id"
                  class="flex cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 text-control hover:bg-muted/30"
                >
                  <Checkbox
                    :model-value="fill.selectedIds.value.includes(item.id)"
                    @update:model-value="fill.toggleItem(item.id)"
                  />
                  <span class="min-w-0 flex-1 truncate font-medium">
                    {{ item.name }}
                  </span>
                  <span class="shrink-0 text-muted-foreground">
                    {{ ASSESSMENT_TYPE_LABELS[item.type] }}
                  </span>
                </label>
              </div>
            </div>
          </template>

          <template v-else>
            <div
              v-if="fill.sasCandidates.value.length === 1"
              class="rounded-md border bg-muted/30 px-3 py-2 text-control"
            >
              Penilaian SAS:
              <span class="font-medium">{{
                fill.sasCandidates.value[0].name
              }}</span>
            </div>
            <Alert
              v-else
              class="border-warning/30 bg-warning/10 text-warning"
            >
              <AlertTriangle class="size-4" />
              <AlertDescription class="text-warning">
                Template SAS membutuhkan tepat satu penilaian SAS (saat ini ada
                {{ fill.sasCandidates.value.length }}).
              </AlertDescription>
            </Alert>
          </template>

          <Alert
            v-if="fill.selectionError.value"
            variant="destructive"
          >
            <AlertCircle class="size-4" />
            <AlertDescription>{{ fill.selectionError.value }}</AlertDescription>
          </Alert>

          <Alert
            v-if="fill.error.value"
            variant="destructive"
          >
            <AlertCircle class="size-4" />
            <AlertDescription>{{ fill.error.value }}</AlertDescription>
          </Alert>
        </template>

        <template v-else>
          <Alert>
            <CheckCircle2 class="size-4 text-success" />
            <AlertTitle>File RDM berhasil diisi</AlertTitle>
            <AlertDescription>
              File tersimpan: {{ fill.result.value.fileName }}
            </AlertDescription>
          </Alert>

          <Alert
            v-if="fill.result.value.summary.classSubjectWarning"
            class="border-warning/30 bg-warning/10 text-warning"
          >
            <AlertTriangle class="size-4" />
            <AlertDescription class="text-warning">
              {{ fill.result.value.summary.classSubjectWarning }}
            </AlertDescription>
          </Alert>

          <div
            v-if="fill.result.value.summary.sheets.length > 0"
            class="rounded-md border overflow-hidden"
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sheet</TableHead>
                  <TableHead>Penilaian</TableHead>
                  <TableHead class="text-right">Nilai Terisi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow
                  v-for="sheet in fill.result.value.summary.sheets"
                  :key="sheet.sheetName"
                >
                  <TableCell class="font-medium">{{
                    sheet.sheetName
                  }}</TableCell>
                  <TableCell>{{ sheet.itemName }}</TableCell>
                  <TableCell class="text-right tabular-nums">{{
                    sheet.written
                  }}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          <div
            v-if="
              fill.result.value.summary.unmatchedRows.length > 0 ||
              fill.result.value.summary.ambiguousRows.length > 0 ||
              fill.result.value.summary.missingStudents.length > 0 ||
              fill.result.value.summary.itemsNotSent.length > 0
            "
            class="space-y-2 rounded-md border bg-muted/30 p-3 text-control"
          >
            <p v-if="fill.result.value.summary.unmatchedRows.length > 0">
              <span class="font-medium">Baris tidak cocok:</span>
              {{ fill.result.value.summary.unmatchedRows.join(', ') }}
            </p>
            <p v-if="fill.result.value.summary.ambiguousRows.length > 0">
              <span class="font-medium">Baris ganda/ambigu:</span>
              {{ fill.result.value.summary.ambiguousRows.join(', ') }}
            </p>
            <p v-if="fill.result.value.summary.missingStudents.length > 0">
              <span class="font-medium">Siswa tidak ada di file:</span>
              {{ fill.result.value.summary.missingStudents.join(', ') }}
            </p>
            <p v-if="fill.result.value.summary.itemsNotSent.length > 0">
              <span class="font-medium">Penilaian tidak dikirim:</span>
              {{
                fill.result.value.summary.itemsNotSent
                  .map((item) => item.name)
                  .join(', ')
              }}
            </p>
          </div>

          <Alert>
            <Info class="size-4" />
            <AlertTitle>Langkah Upload ke RDM</AlertTitle>
            <AlertDescription class="space-y-1">
              <p>
                Upload file ini di RDM: Nilai Sumatif Lingkup Materi (atau Nilai
                SAS) &gt; Upload. TP/LM Ke diatur di RDM bila diperlukan.
              </p>
              <p v-if="fill.result.value.summary.kind === 'sas'">
                Upload SAS ke RDM hanya berhasil sekali per kelas dan mapel.
                Pastikan nilai SAS sudah final sebelum upload; koreksi
                setelahnya diisi di halaman Nilai SAS di RDM.
              </p>
            </AlertDescription>
          </Alert>
        </template>
      </DialogBody>

      <DialogFooter
        standard
        class="justify-between"
      >
        <template v-if="!fill.result.value">
          <Button
            type="button"
            variant="outline"
            :disabled="fill.isSubmitting.value"
            @click="open = false"
          >
            Batal
          </Button>
          <Button
            type="button"
            :disabled="!canSubmit"
            @click="fill.submit()"
          >
            <Loader2
              v-if="fill.isSubmitting.value"
              class="size-4 animate-spin"
            />
            {{ fill.isSubmitting.value ? 'Memproses...' : 'Isi Template' }}
          </Button>
        </template>
        <template v-else>
          <Button
            type="button"
            variant="outline"
            @click="handleResetFlow"
          >
            Isi Template Lain
          </Button>
          <Button
            type="button"
            @click="open = false"
          >
            Tutup
          </Button>
        </template>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
