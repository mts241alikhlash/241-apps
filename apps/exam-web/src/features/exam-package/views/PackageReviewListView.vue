<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthSession } from '@mts241alikhlash/platform/auth'
import { DataTable, SearchInput } from '@mts241alikhlash/ui'
import { Button } from '@mts241alikhlash/ui/button'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@mts241alikhlash/ui/dialog'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@mts241alikhlash/ui/card'
import ReturnPackageDialog from '../components/ReturnPackageDialog.vue'
import { buildReviewColumns } from '../components/reviewPackageColumns'
import { usePackageList } from '../composables/usePackageList'
import { examPackageService } from '../services/examPackageService'
import { useExamPackageStore } from '../stores/examPackageStore'
import type { ExamPackageSummary } from '../types'

const router = useRouter()
const { hasPermission } = useAuthSession()
const store = useExamPackageStore()

const search = ref('')
const subjectId = ref('ALL')
const gradeId = ref('ALL')
const status = ref('SUBMITTED')
const page = ref(1)
const approveTarget = ref<ExamPackageSummary | null>(null)
const approveBusy = ref(false)
const approveError = ref<string | null>(null)
const returnTarget = ref<ExamPackageSummary | null>(null)
const returnBusy = ref(false)
const returnError = ref<string | null>(null)
const pageSize = ref(10)

const { packages, totalItems, loading, listError, filtersPending, refresh } =
  usePackageList({ search, subjectId, gradeId, status }, page, pageSize)

watch(search, () => (page.value = 1), { flush: 'sync' })

function changePageSize(size: number) {
  pageSize.value = size
  page.value = 1
}

async function confirmApprove() {
  const target = approveTarget.value
  if (target === null || approveBusy.value) return
  approveBusy.value = true
  const result = await examPackageService.approve(target.id)
  approveBusy.value = false
  if (result.success) {
    approveTarget.value = null
    await refresh()
    return
  }
  approveError.value = result.error
}

async function confirmReturn(note: string) {
  const target = returnTarget.value
  if (target === null || returnBusy.value) return
  returnBusy.value = true
  const result = await examPackageService.returnPackage(target.id, {
    note,
    questionNotes: [],
  })
  returnBusy.value = false
  if (result.success) {
    returnTarget.value = null
    await refresh()
  } else {
    returnError.value = result.error
  }
}

function openPackage(pkg: ExamPackageSummary) {
  void router.push(`/exam/package-approvals/${pkg.id}`)
}

const columns = computed(() =>
  buildReviewColumns({
    subjectName: store.subjectName,
    gradeName: store.gradeName,
    onOpen: openPackage,
    canApprove: () => hasPermission('exam-questions.approve'),
    onApprove: (pkg) => {
      approveError.value = null
      approveTarget.value = pkg
    },
    onReturn: (pkg) => {
      returnError.value = null
      returnTarget.value = pkg
    },
  }),
)

onMounted(() => examPackageService.loadReferences())
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <Card
      gap="none"
      class="flex min-h-0 flex-1 flex-col overflow-hidden"
    >
      <CardHeader variant="muted">
        <CardTitle class="font-semibold">Persetujuan Paket Soal</CardTitle>
      </CardHeader>
      <CardContent
        class="flex min-h-0 flex-1 flex-col overflow-auto pt-2 px-4 pb-4"
      >
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
            @click="refresh()"
          >
            Coba lagi
          </Button>
        </div>
        <DataTable
          v-else
          mobile="cards"
          row-clickable
          :columns="columns"
          :data="filtersPending ? [] : packages"
          :page="page"
          :page-size="pageSize"
          :total-items="totalItems"
          :is-loading="loading || filtersPending"
          item-label="paket"
          @update:page="page = $event"
          @update:page-size="changePageSize"
          @row-click="openPackage"
        >
          <template #header-right>
            <SearchInput
              v-model="search"
              class="sm:w-40"
              label="Cari paket"
            />
          </template>
          <template #mobile-toolbar>
            <SearchInput
              v-model="search"
              label="Cari paket"
              class="w-full"
            />
          </template>
          <template #empty>
            <p>
              {{
                search
                  ? 'Tidak ada paket yang cocok.'
                  : 'Tidak ada paket yang menunggu tinjauan.'
              }}
            </p>
          </template>
        </DataTable>
      </CardContent>
      <CardFooter variant="thin" />
    </Card>
    <Dialog
      :open="approveTarget !== null"
      @update:open="(value: boolean) => !value && (approveTarget = null)"
    >
      <DialogContent size="md">
        <DialogHeader standard>
          <DialogTitle>Setujui paket?</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <p class="text-[length:var(--text-control,0.75rem)]">
            <strong>{{ approveTarget?.title }}</strong> akan disetujui dan siap
            dijadwalkan.
          </p>
          <p
            v-if="approveError"
            class="mt-2 text-[length:var(--text-control,0.75rem)] text-destructive"
            role="alert"
          >
            {{ approveError }}
          </p>
        </DialogBody>
        <DialogFooter
          class="flex-row items-center justify-end gap-2 border-t border-border px-4 py-3"
        >
          <Button
            variant="outline"
            @click="approveTarget = null"
          >
            Batal
          </Button>
          <Button
            :disabled="approveBusy"
            @click="confirmApprove"
          >
            {{ approveBusy ? 'Menyetujui…' : 'Setujui' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    <ReturnPackageDialog
      v-if="returnTarget"
      :open="true"
      :note-count="0"
      :busy="returnBusy"
      :error="returnError"
      @update:open="
        (value: boolean) => {
          if (!value) returnTarget = null
        }
      "
      @confirm="confirmReturn"
    />
  </div>
</template>
