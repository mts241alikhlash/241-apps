<script setup lang="ts">
import { computed, watch } from 'vue'
import { FileDropzone } from '@mts241alikhlash/ui'
import { Alert, AlertDescription, AlertTitle } from '@mts241alikhlash/ui/alert'
import { Badge } from '@mts241alikhlash/ui/badge'
import { Button } from '@mts241alikhlash/ui/button'
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
import { AlertCircle, AlertTriangle, CheckCircle2, Loader2 } from '@lucide/vue'
import { toast } from 'vue-sonner'
import { useRdmImport } from '../composables/useRdmImport'
import type { RdmImportResponse } from '../types'

const props = defineProps<{
  open: boolean
  teachingAssignmentId: string
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'import-success': [result: RdmImportResponse]
}>()

const open = computed({
  get: () => props.open,
  set: (value: boolean) => emit('update:open', value),
})

const importer = useRdmImport(() => props.teachingAssignmentId)

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      importer.reset()
    }
  },
  { immediate: true },
)

const canConfirm = computed(
  () =>
    Boolean(importer.selectedFile.value) &&
    Boolean(importer.preview.value) &&
    (importer.preview.value?.sheets.length ?? 0) > 0 &&
    !importer.isPreviewing.value &&
    !importer.isImporting.value,
)

function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement | null
  const file = input?.files?.[0] ?? null
  void importer.setFile(file)
}

async function handleConfirm() {
  const result = await importer.confirm()
  if (!result) return
  toast.success(
    `Impor selesai: ${result.itemsCreated} penilaian dibuat, ${result.itemsUpdated} diperbarui, ${result.scoresWritten} nilai ditulis.`,
  )
  emit('import-success', result)
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent
      size="xl"
      @open-auto-focus.prevent
    >
      <DialogHeader standard>
        <DialogTitle>Impor Nilai RDM</DialogTitle>
        <DialogDescription>
          Pilih file Excel berformat RDM untuk mempratinjau dan mengimpor nilai.
        </DialogDescription>
      </DialogHeader>

      <DialogBody class="space-y-4">
        <template v-if="!importer.importResult.value">
          <FileDropzone
            accept=".xlsx"
            hint="File .xlsx template offline atau template RDM (maksimal 2 MB)"
            placeholder="Pilih atau tarik file Excel (.xlsx)"
            :file-name="importer.selectedFile.value?.name ?? null"
            :disabled="
              importer.isPreviewing.value || importer.isImporting.value
            "
            clearable
            aria-label="Pilih file impor RDM"
            @change="handleFileChange"
            @clear="importer.setFile(null)"
          />

          <div
            v-if="importer.isPreviewing.value"
            class="flex items-center gap-2 text-control text-muted-foreground"
          >
            <Loader2 class="size-4 animate-spin" />
            Memeriksa isi file...
          </div>

          <Alert
            v-if="importer.error.value"
            variant="destructive"
          >
            <AlertCircle class="size-4" />
            <AlertDescription>{{ importer.error.value }}</AlertDescription>
          </Alert>

          <template v-if="importer.preview.value">
            <Alert
              v-if="importer.preview.value.classSubjectWarning"
              class="border-warning/30 bg-warning/10 text-warning"
            >
              <AlertTriangle class="size-4" />
              <AlertDescription class="text-warning">
                {{ importer.preview.value.classSubjectWarning }}
              </AlertDescription>
            </Alert>

            <div
              v-if="importer.preview.value.sheets.length === 0"
              class="rounded-md border bg-muted/30 p-3 text-control text-muted-foreground"
            >
              Tidak ada sheet berisi nilai yang dapat diimpor.
            </div>

            <div
              v-else
              class="rounded-md border overflow-hidden"
            >
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sheet</TableHead>
                    <TableHead>Nama Penilaian</TableHead>
                    <TableHead>Aksi</TableHead>
                    <TableHead class="text-right">Nilai Ditulis</TableHead>
                    <TableHead class="text-right">Tidak Berubah</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow
                    v-for="sheet in importer.preview.value.sheets"
                    :key="sheet.sheetName"
                  >
                    <TableCell class="font-medium">{{
                      sheet.sheetName
                    }}</TableCell>
                    <TableCell>{{ sheet.name }}</TableCell>
                    <TableCell>
                      <Badge
                        :variant="
                          sheet.action === 'create' ? 'info' : 'secondary'
                        "
                      >
                        {{
                          sheet.action === 'create' ? 'Buat baru' : 'Perbarui'
                        }}
                      </Badge>
                    </TableCell>
                    <TableCell class="text-right tabular-nums">{{
                      sheet.scoresToWrite
                    }}</TableCell>
                    <TableCell class="text-right tabular-nums">{{
                      sheet.unchanged
                    }}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            <Alert
              v-if="importer.preview.value.unmatchedRows.length > 0"
              class="border-warning/30 bg-warning/10 text-warning"
            >
              <AlertTriangle class="size-4" />
              <AlertTitle>Baris siswa tidak ditemukan</AlertTitle>
              <AlertDescription class="text-warning">
                {{
                  importer.preview.value.unmatchedRows
                    .map((issue) => `${issue.sheetName} baris ${issue.row}`)
                    .join(', ')
                }}
              </AlertDescription>
            </Alert>

            <Alert
              v-if="importer.preview.value.invalidValues.length > 0"
              variant="destructive"
            >
              <AlertCircle class="size-4" />
              <AlertTitle>Nilai tidak valid (dilewati)</AlertTitle>
              <AlertDescription>
                {{
                  importer.preview.value.invalidValues
                    .map((issue) => `${issue.sheetName} baris ${issue.row}`)
                    .join(', ')
                }}
              </AlertDescription>
            </Alert>
          </template>
        </template>

        <template v-else>
          <Alert>
            <CheckCircle2 class="size-4 text-success" />
            <AlertTitle>Impor Nilai Selesai</AlertTitle>
            <AlertDescription>
              {{ importer.importResult.value.itemsCreated }} penilaian dibuat,
              {{ importer.importResult.value.itemsUpdated }} diperbarui,
              {{ importer.importResult.value.scoresWritten }} nilai ditulis.
            </AlertDescription>
          </Alert>
        </template>
      </DialogBody>

      <DialogFooter
        v-if="!importer.importResult.value"
        standard
        class="justify-between"
      >
        <Button
          type="button"
          variant="outline"
          :disabled="importer.isImporting.value"
          @click="open = false"
        >
          Batal
        </Button>
        <Button
          type="button"
          :disabled="!canConfirm"
          @click="handleConfirm"
        >
          <Loader2
            v-if="importer.isImporting.value"
            class="size-4 animate-spin"
          />
          {{ importer.isImporting.value ? 'Menyimpan...' : 'Simpan' }}
        </Button>
      </DialogFooter>

      <DialogFooter
        v-else
        standard
      >
        <Button
          type="button"
          @click="open = false"
        >
          Tutup
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
