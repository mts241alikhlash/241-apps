<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Download } from '@lucide/vue'
import { BackButton, FileDropzone } from '@mts241alikhlash/ui'
import { Button } from '@mts241alikhlash/ui/button'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@mts241alikhlash/ui/card'
import { useBreadcrumbs } from '@mts241alikhlash/web-shared/composables/useBreadcrumbs'
import { examBankService } from '@/features/exam-bank/services/examBankService'
import type { ImportPreview, ImportResult } from '@/features/exam-bank/types'
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
const previewing = ref(false)
let picks = 0
const importing = ref(false)
const problem = ref<string | null>(null)
const result = ref<ImportResult | null>(null)
const loading = ref(true)

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
  if (!chosen) return
  if (!/\.(xlsx|docx)$/i.test(chosen.name)) {
    problem.value = 'Berkas harus .xlsx atau .docx.'
    return
  }
  if (chosen.size > MAX_BYTES) {
    problem.value = 'Ukuran berkas maksimal 10 MB.'
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
  } else {
    file.value = null
    problem.value = response.error
  }
}

function clearFile() {
  picks++
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
        class="flex min-h-0 flex-1 flex-col overflow-auto p-4 sm: p-4 space-y-6"
      >
        <div
          v-if="!canEdit"
          class="rounded-md border bg-muted/30 p-3 text-control"
          role="status"
        >
          Paket ini tidak bisa diubah, jadi soal tidak bisa diimpor ke dalamnya.
        </div>
        <template v-else>
          <ApprovedEditNotice v-if="pkg?.status === 'APPROVED'" />

          <div class="space-y-2">
            <p class="text-control text-muted-foreground">
              Soal masuk ke paket {{ pkg?.title }}. Unduh template, isi soalnya,
              lalu unggah.
            </p>
            <div class="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                @click="examBankService.downloadTemplate('xlsx')"
              >
                <Download class="size-4" />
                Template Excel
              </Button>
              <Button
                type="button"
                variant="outline"
                @click="examBankService.downloadTemplate('docx')"
              >
                <Download class="size-4" />
                Template Word
              </Button>
            </div>
          </div>

          <FileDropzone
            accept=".xlsx,.docx"
            :file-name="file?.name"
            clearable
            :invalid="problem !== null"
            aria-label="Pilih berkas soal"
            hint="Excel (.xlsx) atau Word (.docx), maks. 10 MB"
            @change="pickFile"
            @clear="clearFile"
          />
          <p
            v-if="problem"
            class="text-control text-destructive"
            role="alert"
          >
            {{ problem }}
          </p>

          <ImportPreviewPanel
            v-if="preview"
            v-model:confirm-duplicates="confirmDuplicates"
            :preview="preview"
          />

          <div
            v-if="result"
            class="space-y-3 rounded-md border p-4"
            role="status"
            data-testid="import-result"
          >
            <p class="font-medium">
              {{ result.created }} soal ditambahkan ke paket
              <template v-if="result.errors.length > 0">
                , {{ result.errors.length }} baris gagal
              </template>
            </p>
            <ul
              v-if="result.errors.length > 0"
              class="space-y-1 text-control"
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
          </div>
        </template>
      </CardContent>
      <CardFooter
        v-if="!loading && canEdit"
        standard
        class="justify-end"
      >
        <Button
          type="button"
          :disabled="importing || previewing || !canSubmit"
          @click="submit"
        >
          {{ importing ? 'Mengimpor…' : 'Impor' }}
        </Button>
      </CardFooter>
    </Card>
  </div>
</template>
