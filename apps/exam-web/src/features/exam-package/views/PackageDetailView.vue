<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { BackButton, DataTable } from '@mts241alikhlash/ui'
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
import { Badge } from '@mts241alikhlash/ui/badge'
import { Button } from '@mts241alikhlash/ui/button'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@mts241alikhlash/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@mts241alikhlash/ui/dropdown-menu'
import { ChevronDown, Plus } from '@lucide/vue'
import { useBreadcrumbs } from '@mts241alikhlash/web-shared/composables/useBreadcrumbs'
import ScheduleFormDialog from '@/features/exam-schedule/components/ScheduleFormDialog.vue'
import { useAuthSession } from '@mts241alikhlash/platform/auth'
import { buildBuilderColumns } from '../components/builderColumns'
import AdjustKeyDialog from '../components/AdjustKeyDialog.vue'
import RenamePackageDialog from '../components/RenamePackageDialog.vue'
import ApprovedEditNotice from '../components/ApprovedEditNotice.vue'
import ReturnedNotes from '../components/ReturnedNotes.vue'
import TakeQuestionsDialog from '../components/TakeQuestionsDialog.vue'
import { usePackageBuilder } from '../composables/usePackageBuilder'
import { examPackageService } from '../services/examPackageService'
import { categoryOf, sectionPrefixOf } from '@/features/exam-shared/examType'
import { useExamPackageStore } from '../stores/examPackageStore'
import {
  packageStatusLabel,
  statusVariant,
  type ExamPackageItemView,
  type ExamPackageStatus,
} from '../types'

const DELETABLE: ExamPackageStatus[] = ['DRAFT', 'RETURNED', 'APPROVED']
const SCHEDULABLE: ExamPackageStatus[] = ['APPROVED', 'LOCKED']

const route = useRoute()
const router = useRouter()
const { hasPermission } = useAuthSession()
const store = useExamPackageStore()

const id = computed(() => String(route.params.id ?? ''))
const builder = usePackageBuilder(id)
const { pkg, loading, loadFailed, error, canEdit, canSubmit, owns } = builder

const deleteOpen = ref(false)
const deleting = ref(false)
const copying = ref(false)
const scheduleOpen = ref(false)
const renameOpen = ref(false)
const takeOpen = ref(false)
const adjustTarget = ref<ExamPackageItemView | null>(null)

const status = computed(() => pkg.value?.status ?? null)
const totalPoints = computed(() =>
  (pkg.value?.items ?? []).reduce((sum, item) => sum + item.points, 0),
)
const canDelete = computed(
  () =>
    owns.value &&
    hasPermission('exam-packages.delete') &&
    status.value !== null &&
    DELETABLE.includes(status.value),
)
const canSchedule = computed(
  () =>
    hasPermission('exam-schedules.create') &&
    status.value !== null &&
    SCHEDULABLE.includes(status.value),
)
const canCopy = computed(
  () =>
    hasPermission('exam-packages.create') &&
    status.value !== null &&
    SCHEDULABLE.includes(status.value),
)

const canAdjustKey = computed(
  () => hasPermission('exam-packages.adjust-key') && status.value === 'LOCKED',
)

const columns = computed(() =>
  buildBuilderColumns({
    canEdit: canEdit.value,
    canAdjustKey: canAdjustKey.value,
    onAdjustKey: (item: ExamPackageItemView) => {
      adjustTarget.value = item
    },
    total: pkg.value?.items.length ?? 0,
    noteOf: builder.noteOf,
    onOpen: (item: ExamPackageItemView) =>
      void router.push(
        `/exam/packages/${id.value}/questions/${item.questionId}`,
      ),
    onMove: (item, direction) => void builder.move(item.questionId, direction),
    onRemove: async (item, { closeAlert, setLoading }) => {
      setLoading(true)
      const removed = await builder.remove(item.questionId)
      setLoading(false)
      if (removed) closeAlert()
    },
  }),
)

useBreadcrumbs(() => [
  { title: 'Paket Soal', href: '/exam/packages' },
  { title: pkg.value?.title ?? 'Paket' },
])

async function copy() {
  if (copying.value) return
  copying.value = true
  const copied = await examPackageService.copyPackage(id.value)
  copying.value = false
  if (copied) await router.push(`/exam/packages/${copied.id}`)
}

async function confirmDelete() {
  deleting.value = true
  const done = await examPackageService.deletePackage(id.value)
  deleting.value = false
  if (done) {
    deleteOpen.value = false
    await router.push('/exam/packages')
  }
}

async function reload() {
  deleteOpen.value = false
  scheduleOpen.value = false
  renameOpen.value = false
  takeOpen.value = false
  await builder.load()
}

watch(id, reload)

onMounted(async () => {
  await examPackageService.loadReferences()
  await builder.load()
})
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <Card
      gap="none"
      class="flex min-h-0 flex-1 flex-col overflow-hidden"
    >
      <CardHeader variant="muted">
        <div class="flex items-center gap-3">
          <BackButton
            label="Kembali ke Paket Soal"
            @click="router.push('/exam/packages')"
          />
          <CardTitle class="font-semibold">{{
            pkg?.title ?? 'Paket Soal'
          }}</CardTitle>
        </div>
        <div
          v-if="pkg"
          class="flex flex-wrap items-center gap-2"
        >
          <Button
            v-if="canEdit"
            variant="outline"
            @click="renameOpen = true"
          >
            Ganti judul
          </Button>
          <Button
            v-if="canCopy"
            variant="outline"
            @click="copy"
          >
            Salin
          </Button>
          <Button
            v-if="canDelete"
            variant="outline"
            @click="deleteOpen = true"
          >
            Hapus
          </Button>
          <DropdownMenu v-if="canEdit">
            <DropdownMenuTrigger as-child>
              <Button class="shrink-0">
                <Plus class="mr-1.5 size-4" />
                Tambah soal
                <ChevronDown class="ml-1.5 size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                @select="router.push(`/exam/packages/${id}/questions/new`)"
              >
                Buat baru
              </DropdownMenuItem>
              <DropdownMenuItem @select="takeOpen = true">
                Ambil dari paket lain
              </DropdownMenuItem>
              <DropdownMenuItem
                v-if="hasPermission('exam-questions.create')"
                @select="router.push(`/exam/packages/${id}/import`)"
              >
                Impor Excel/Word
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            v-if="canSchedule"
            @click="scheduleOpen = true"
          >
            Jadwalkan
          </Button>
          <Button
            v-if="canSubmit"
            :disabled="builder.busy.value"
            @click="builder.submit()"
          >
            Ajukan
          </Button>
        </div>
      </CardHeader>

      <CardContent
        class="flex min-h-0 flex-1 flex-col overflow-auto p-4 sm:p-6 space-y-4"
      >
        <div
          v-if="loadFailed"
          class="space-y-3"
          role="alert"
        >
          <p class="text-[length:var(--text-control,0.75rem)]">
            Paket tidak dapat dimuat.
          </p>
          <Button
            variant="outline"
            @click="builder.load()"
          >
            Coba lagi
          </Button>
        </div>
        <p
          v-else-if="!loading && !pkg"
          class="text-[length:var(--text-control,0.75rem)]"
          role="status"
        >
          Paket tidak ditemukan.
        </p>
        <template v-if="pkg">
          <div
            v-if="error"
            class="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-[length:var(--text-control,0.75rem)]"
            role="alert"
          >
            {{ error }}
          </div>
          <ApprovedEditNotice v-if="status === 'APPROVED' && canEdit" />
          <ReturnedNotes :review="builder.lastReturn.value" />
          <div
            class="flex flex-wrap items-center gap-2 text-[length:var(--text-control,0.75rem)]"
          >
            <Badge variant="outline">{{
              store.subjectName(pkg.subjectId)
            }}</Badge>
            <Badge variant="outline">{{ store.gradeName(pkg.gradeId) }}</Badge>
            <Badge :variant="statusVariant(pkg.status)">
              {{ packageStatusLabel(pkg.status) }}
            </Badge>
            <span class="text-muted-foreground">
              {{ pkg.items.length }} soal · Total {{ totalPoints }} poin
            </span>
          </div>
          <DataTable
            mobile="cards"
            hide-pagination
            :columns="columns"
            :data="pkg.items"
            :page="1"
            :page-size="Math.max(pkg.items.length, 1)"
            :total-items="pkg.items.length"
            item-label="soal"
          >
            <template #empty>
              <p>Paket ini belum berisi soal.</p>
            </template>
          </DataTable>
          <details
            v-if="pkg.reviews.length > 0"
            class="text-[length:var(--text-control,0.75rem)]"
          >
            <summary class="cursor-pointer">Riwayat tinjauan</summary>
            <ul class="mt-2 space-y-1">
              <li
                v-for="review in pkg.reviews"
                :key="review.id"
              >
                {{
                  review.action === 'SUBMIT'
                    ? 'Diajukan'
                    : review.action === 'APPROVE'
                      ? 'Disetujui'
                      : 'Dikembalikan'
                }}
                · {{ new Date(review.createdAt).toLocaleString('id-ID') }}
                <span v-if="review.note"> · {{ review.note }}</span>
              </li>
            </ul>
          </details>
        </template>
      </CardContent>
      <CardFooter variant="thin" />
    </Card>

    <ScheduleFormDialog
      v-if="scheduleOpen && pkg"
      v-model:open="scheduleOpen"
      :package-id="pkg.id"
      :package-grade-id="pkg.gradeId"
      :package-title="pkg.title"
      @saved="
        (type) => router.push(`${sectionPrefixOf(categoryOf(type))}/schedules`)
      "
    />

    <TakeQuestionsDialog
      v-if="takeOpen && pkg"
      v-model:open="takeOpen"
      :package-id="pkg.id"
      :subject-id="pkg.subjectId"
      :grade-id="pkg.gradeId"
      @taken="builder.load()"
    />

    <AdjustKeyDialog
      v-if="adjustTarget && pkg"
      :open="true"
      :package-id="pkg.id"
      :item="adjustTarget"
      @update:open="(value: boolean) => !value && (adjustTarget = null)"
      @adjusted="builder.load()"
    />

    <RenamePackageDialog
      v-if="renameOpen && pkg"
      v-model:open="renameOpen"
      :package-id="pkg.id"
      :title="pkg.title"
      @renamed="builder.load()"
    />

    <AlertDialog v-model:open="deleteOpen">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Hapus paket?</AlertDialogTitle>
          <AlertDialogDescription>
            Paket {{ pkg?.title }} dihapus dan tidak muncul lagi.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Batal</AlertDialogCancel>
          <AlertDialogAction
            :disabled="deleting"
            @click="confirmDelete"
          >
            Ya, hapus
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>
