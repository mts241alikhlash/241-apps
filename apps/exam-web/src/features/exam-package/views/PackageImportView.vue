<script setup lang="ts">
import { computed, onMounted, reactive, ref, useId, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { FileSpreadsheet, FileUp } from '@lucide/vue'
import { BackButton, FileDropzone } from '@mts241alikhlash/ui'
import { Alert, AlertDescription } from '@mts241alikhlash/ui/alert'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@mts241alikhlash/ui/dialog'
import { Spinner } from '@mts241alikhlash/ui/spinner'
import { Button } from '@mts241alikhlash/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@mts241alikhlash/ui/card'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@mts241alikhlash/ui/dialog'
import { FloatingLabelField } from '@mts241alikhlash/ui/form'
import { Input } from '@mts241alikhlash/ui/input'
import { useBreadcrumbs } from '@mts241alikhlash/web-shared/composables/useBreadcrumbs'
import { examBankService } from '@/features/exam-bank/services/examBankService'
import type {
  ImportPreview,
  ImportResult,
  TemplateCounts,
} from '@/features/exam-bank/types'
import ApprovedEditNotice from '../components/ApprovedEditNotice.vue'
import ImportPreviewPanel from '../components/ImportPreviewPanel.vue'
import { usePackageBuilder } from '../composables/usePackageBuilder'

const MAX_BYTES = 10 * 1024 * 1024

const route = useRoute()
const router = useRouter()

const packageId = computed(() => String(route.params.id ?? ''))
const builder = usePackageBuilder(packageId)
const { pkg, canEdit } = builder

const file = ref<File | null>(null)
const preview = ref<ImportPreview | null>(null)
const confirmDuplicates = ref(false)
const previewOpen = ref(false)
const previewing = ref(false)
let picks = 0
const importing = ref(false)
const problem = ref<string | null>(null)
const fileProblem = ref(false)
const result = ref<ImportResult | null>(null)
const loading = ref(true)

const templateOpen = ref(false)
const templateFieldId = useId()
const templateForm = reactive({
  pg: '20',
  pgKompleks: '10',
  benarSalah: '10',
  isian: '0',
  uraian: '5',
})
const TEMPLATE_FIELDS: { key: keyof TemplateCounts; label: string }[] = [
  { key: 'pg', label: 'PG' },
  { key: 'pgKompleks', label: 'PG Kompleks' },
  { key: 'benarSalah', label: 'Benar/Salah' },
  { key: 'isian', label: 'Isian' },
  { key: 'uraian', label: 'Uraian' },
]
const isCount = (value: string) => /^\d+$/.test(value) && Number(value) <= 100
const templateValid = computed(() =>
  TEMPLATE_FIELDS.every(({ key }) => isCount(templateForm[key])),
)

function downloadVerticalTemplate() {
  const counts = {} as TemplateCounts
  for (const { key } of TEMPLATE_FIELDS) counts[key] = Number(templateForm[key])
  void examBankService.downloadTemplate('docx', { layout: 'vertical', counts })
  templateOpen.value = false
}

const canSubmit = computed(
  () =>
    preview.value !== null &&
    (preview.value.canSave ||
      (preview.value.errors.length === 0 && confirmDuplicates.value)),
)

useBreadcrumbs(() => [
  { title: 'Paket Soal', href: '/exam/packages' },
  {
    title: pkg.value?.title ?? 'Paket',
    href: `/exam/packages/${packageId.value}`,
  },
  { title: 'Impor Soal' },
])

async function pickFile(event: Event) {
  const chosen = (event.target as HTMLInputElement).files?.[0] ?? null
  const pick = ++picks
  problem.value = null
  result.value = null
  file.value = null
  preview.value = null
  previewing.value = false
  confirmDuplicates.value = false
  fileProblem.value = false
  if (!chosen) return
  if (!/\.(xlsx|docx)$/i.test(chosen.name)) {
    problem.value = 'Berkas harus .xlsx atau .docx.'
    fileProblem.value = true
    return
  }
  if (chosen.size > MAX_BYTES) {
    problem.value = 'Ukuran berkas maksimal 10 MB.'
    fileProblem.value = true
    return
  }
  file.value = chosen
  previewing.value = true
  const response = await examBankService.previewImport({
    file: chosen,
    packageId: packageId.value,
  })
  if (pick !== picks) return
  previewing.value = false
  if (response.success) {
    preview.value = response.data
    previewOpen.value = true
  } else {
    file.value = null
    problem.value = response.error
  }
}

function clearFile() {
  picks++
  fileProblem.value = false
  previewOpen.value = false
  previewing.value = false
  file.value = null
  preview.value = null
  confirmDuplicates.value = false
}

async function submit() {
  if (!file.value) {
    problem.value = 'Pilih berkas Excel atau Word dahulu.'
    return
  }
  importing.value = true
  problem.value = null
  result.value = null
  const response = await examBankService.importQuestions({
    file: file.value,
    packageId: packageId.value,
    confirmDuplicates: confirmDuplicates.value,
  })
  importing.value = false
  if (response.success) {
    result.value = response.data
    file.value = null
    preview.value = null
    confirmDuplicates.value = false
    previewOpen.value = false
  } else {
    problem.value = response.error
  }
}

async function init() {
  loading.value = true
  result.value = null
  await builder.load()
  if (builder.notFound.value) {
    await router.replace('/exam/packages')
    return
  }
  await examBankService.loadReferences()
  loading.value = false
}

watch(packageId, init)
onMounted(init)
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <Card
      gap="none"
      class="flex min-h-0 flex-1 flex-col overflow-hidden"
    >
      <CardHeader standard>
        <div class="flex items-center gap-3">
          <BackButton
            label="Kembali ke paket"
            @click="router.push(`/exam/packages/${packageId}`)"
          />
          <CardTitle class="font-semibold">Impor Soal</CardTitle>
        </div>
      </CardHeader>
      <CardContent
        v-if="!loading"
        class="flex min-h-0 flex-1 flex-col overflow-auto p-4 space-y-4"
      >
        <div
          v-if="!canEdit"
          class="rounded-md border bg-muted/30 px-4 py-2 text-control"
          role="status"
        >
          Paket ini tidak bisa diubah, jadi soal tidak bisa diimpor ke dalamnya.
        </div>
        <template v-else>
          <ApprovedEditNotice v-if="pkg?.status === 'APPROVED'" />

          <div class="space-y-3">
            <p class="text-control text-muted-foreground">
              Soal masuk ke paket {{ pkg?.title }}. Unduh template, isi soalnya,
              lalu unggah. Pratinjau terbuka sebelum soal disimpan.
            </p>
            <div class="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                @click="examBankService.downloadTemplate('xlsx')"
              >
                <FileSpreadsheet class="size-4" />
                Template Excel
              </Button>
              <Button
                type="button"
                variant="outline"
                @click="examBankService.downloadTemplate('docx')"
              >
                <FileUp class="size-4" />
                Template Word
              </Button>
              <Button
                type="button"
                variant="outline"
                @click="templateOpen = true"
              >
                <Download class="size-4" />
                Template Word (vertikal)
              </Button>
            </div>
            <Dialog v-model:open="templateOpen">
              <DialogContent size="md">
                <DialogHeader standard>
                  <DialogTitle>Template Word (vertikal)</DialogTitle>
                  <DialogDescription>
                    Isi jumlah soal per bagian. Jumlah standar sudah terisi,
                    angka 0 sampai 100.
                  </DialogDescription>
                </DialogHeader>
                <DialogBody class="space-y-3">
                  <FloatingLabelField
                    v-for="field in TEMPLATE_FIELDS"
                    :key="field.key"
                    :label="`Jumlah soal ${field.label}`"
                    :for="`${templateFieldId}-${field.key}`"
                    floating
                  >
                    <Input
                      :id="`${templateFieldId}-${field.key}`"
                      v-model="templateForm[field.key]"
                      type="number"
                      inputmode="numeric"
                      min="0"
                      max="100"
                    />
                  </FloatingLabelField>
                </DialogBody>
                <DialogFooter
                  standard
                  class="justify-between"
                >
                  <Button
                    type="button"
                    variant="outline"
                    @click="templateOpen = false"
                  >
                    Batal
                  </Button>
                  <Button
                    type="button"
                    :disabled="!templateValid"
                    @click="downloadVerticalTemplate"
                  >
                    Unduh
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <FileDropzone
            accept=".xlsx,.docx"
            :file-name="file?.name"
            clearable
            :invalid="fileProblem"
            aria-label="Pilih berkas soal"
            hint="Excel (.xlsx) atau Word (.docx), maks. 10 MB"
            @change="pickFile"
            @clear="clearFile"
          />

          <div
            v-if="previewing"
            class="flex items-center gap-2 text-control text-muted-foreground"
            role="status"
          >
            <Spinner />
            Membaca berkas…
          </div>

          <Alert
            v-if="problem"
            variant="destructive"
          >
            <AlertDescription>{{ problem }}</AlertDescription>
          </Alert>

          <div
            v-if="file && !previewing"
            class="flex flex-wrap gap-2"
          >
            <Button
              v-if="preview"
              type="button"
              variant="outline"
              @click="previewOpen = true"
            >
              Lihat pratinjau
            </Button>
          </div>

          <Alert
            v-if="result"
            :variant="result.errors.length > 0 ? 'destructive' : 'default'"
            data-testid="import-result"
          >
            <AlertDescription>
              <p class="font-medium text-foreground">
                {{ result.created }} soal ditambahkan ke paket
                <template v-if="result.errors.length > 0">
                  , {{ result.errors.length }} baris gagal
                </template>
              </p>
              <ul
                v-if="result.errors.length > 0"
                class="space-y-1"
              >
                <li
                  v-for="error in result.errors"
                  :key="`${error.row}-${error.reason}`"
                  data-testid="import-error"
                >
                  Baris {{ error.row }}: {{ error.reason }}
                </li>
              </ul>
              <Button
                v-if="result.created > 0"
                type="button"
                variant="outline"
                @click="router.push(`/exam/packages/${packageId}`)"
              >
                Kembali ke paket
              </Button>
            </AlertDescription>
          </Alert>

          <Dialog v-model:open="previewOpen">
            <DialogContent size="xl">
              <DialogHeader standard>
                <DialogTitle>Pratinjau impor</DialogTitle>
                <DialogDescription class="sr-only">
                  Pratinjau soal yang dibaca dari berkas, sebelum disimpan.
                </DialogDescription>
              </DialogHeader>
              <DialogBody>
                <ImportPreviewPanel
                  v-if="preview"
                  v-model:confirm-duplicates="confirmDuplicates"
                  :preview="preview"
                />
              </DialogBody>
              <DialogFooter
                standard
                class="justify-between"
              >
                <Button
                  type="button"
                  variant="outline"
                  @click="previewOpen = false"
                >
                  Batal
                </Button>
                <Button
                  type="button"
                  :disabled="importing || !canSubmit"
                  @click="submit"
                >
                  <Spinner v-if="importing" />
                  {{ importing ? 'Mengimpor…' : 'Impor' }}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </template>
      </CardContent>
    </Card>
  </div>
</template>
