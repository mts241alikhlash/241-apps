<script setup lang="ts">
import type {
  PromotionPayload,
  PromotionResult,
  PromotionStudentDecision,
  PromotionStudentPayload,
} from '../types'
import { PromotionResultDialog, PromotionStudentTable } from '../components'
import { RouterLink, useRouter } from 'vue-router'
import {
  Dialog,
  DialogContent,
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
import { Button } from '@mts241alikhlash/ui/button'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@mts241alikhlash/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@mts241alikhlash/ui/select'
import {
  AlertCircle,
  ArrowRight,
  Check,
  GraduationCap,
  Loader2,
  Pencil,
} from '@lucide/vue'
import { computed, onMounted, ref, watch } from 'vue'
import { useAcademicSetting } from '@/features/academic/academic-setting'
import { useSemesterList } from '../composables/useSemesterList'
import { useSemesterPromotion } from '../composables/useSemesterPromotion'
import { derivePromotionYears } from '../logic/derivePromotionYears'
import { selectableTargetYears } from '../logic/selectableTargetYears'
import { classroomApi } from '@/features/academic/classroom'
import { classroomService } from '@/features/academic/classroom'
import type { Classroom } from '@/features/academic/classroom'
import { notifyIfOutage } from '@mts241alikhlash/web-shared/utils/notify-outage'

const router = useRouter()

const { academicYears, fetchAcademicYears } = useSemesterList()
const {
  isPromoting,
  isPreviewing,
  promotionPreview,
  isLoadingRecommendations,
  promotionRecommendations,
  excludedGraduatingCount,
  fetchPromotionRecommendation,
  previewPromotion,
  executePromotion,
} = useSemesterPromotion()

const sourceAcademicYearId = ref('')
const targetAcademicYearId = ref('')

const derived = computed(() => derivePromotionYears(academicYears.value))

const isChoosingYears = ref(false)
const isCopyingClassrooms = ref(false)

const studentsWithoutTarget = computed(() =>
  promotionRecommendations.value.filter((rec) => !rec.targetClassroomId),
)

const targetClassrooms = ref<Classroom[]>([])

async function loadTargetClassrooms(academicYearId: string) {
  try {
    const res = await classroomApi.getClassrooms({
      academicYearId,
      limit: 200,
    })
    targetClassrooms.value = res.data.data ?? []
  } catch (err) {
    notifyIfOutage(err)
    targetClassrooms.value = []
  }
}

const decisionsForSelectedClass = computed(() => {
  if (!selectedClass.value) return []
  const inClass = new Set(
    promotionRecommendations.value
      .filter((rec) => rec.sourceClassroomName === selectedClass.value)
      .map((rec) => rec.studentId),
  )
  return studentDecisions.value.filter((d) => inClass.has(d.studentId))
})

async function copyClassroomsForward() {
  const source = sourceAcademicYearId.value
  const target = targetAcademicYearId.value
  if (!source || !target) return

  isCopyingClassrooms.value = true
  try {
    const outcome = await classroomService.copyClassroomsToAcademicYear(
      source,
      target,
    )
    if (outcome.success) {
      await Promise.all([
        fetchPromotionRecommendation({
          sourceAcademicYearId: source,
          targetAcademicYearId: target,
        }),
        loadTargetClassrooms(target),
      ])
    }
  } finally {
    isCopyingClassrooms.value = false
  }
}
const studentDecisions = ref<PromotionStudentDecision[]>([])

const selectedClass = ref('')
const showConfirmDialog = ref(false)
const showResultDialog = ref(false)
const promotionResult = ref<PromotionResult | null>(null)

const availableTargetYears = computed(() =>
  selectableTargetYears(academicYears.value, sourceAcademicYearId.value),
)

const canExecute = computed(() => {
  if (!sourceAcademicYearId.value || !targetAcademicYearId.value) return false
  if (isLoadingRecommendations.value || isPromoting.value) return false
  if (!selectedClass.value) return false
  if (decisionsForSelectedClass.value.length === 0) return false

  return decisionsForSelectedClass.value.every((d) => {
    if (!d.approved && !d.declineReason) return false
    if (!d.targetClassroomId) return false
    return true
  })
})

const summaryStats = computed(() => {
  let approved = 0
  let declined = 0
  for (const d of decisionsForSelectedClass.value) {
    if (d.approved) approved++
    else declined++
  }
  return {
    approved,
    declined,
    total: decisionsForSelectedClass.value.length,
  }
})

const previewRows = computed(() => {
  return decisionsForSelectedClass.value.map((d) => {
    const rec = promotionRecommendations.value.find(
      (r) => r.studentId === d.studentId,
    )
    const targetName =
      targetClassrooms.value.find((c) => c.id === d.targetClassroomId)?.code ??
      rec?.targetClassroomName ??
      '-'
    return {
      studentId: d.studentId,
      studentName: rec?.studentName ?? '-',
      nis: rec?.nis ?? '-',
      sourceClass: rec?.sourceClassroomName ?? '-',
      targetClass:
        targetName !== '-' ? targetName : (rec?.sourceClassroomName ?? '-'),
      approved: d.approved,
      declineReason: d.declineReason,
    }
  })
})

function buildPayload(): PromotionPayload {
  const students: PromotionStudentPayload[] = decisionsForSelectedClass.value
    .filter(
      (d): d is typeof d & { targetClassroomId: string } =>
        d.targetClassroomId !== undefined,
    )
    .map((d) => ({
      studentId: d.studentId,
      sourceClassroomId: d.sourceClassroomId,
      targetClassroomId: d.targetClassroomId,
      action: d.approved ? d.action : ('REPEAT' as const),
      declineReason: d.approved ? undefined : d.declineReason,
    }))

  return {
    sourceAcademicYearId: sourceAcademicYearId.value,
    targetAcademicYearId: targetAcademicYearId.value,
    students,
  }
}

function openConfirmDialog() {
  showConfirmDialog.value = true
  void previewPromotion(buildPayload())
}

async function handleExecute() {
  showConfirmDialog.value = false
  const result = await executePromotion(buildPayload())
  if (result.success) {
    promotionResult.value = result.result ?? null
    showResultDialog.value = true
  }
}

function handleDone() {
  showResultDialog.value = false
  void router.push('/academic/semester')
}

function onDecisionsUpdate(decisions: PromotionStudentDecision[]) {
  studentDecisions.value = decisions
}

watch(sourceAcademicYearId, () => {
  const stillOffered = availableTargetYears.value.some(
    (year) => year.id === targetAcademicYearId.value,
  )
  if (!stillOffered) {
    targetAcademicYearId.value = ''
  }
})

watch(
  [sourceAcademicYearId, targetAcademicYearId],
  async ([source, target]) => {
    if (source && target) {
      await Promise.all([
        fetchPromotionRecommendation({
          sourceAcademicYearId: source,
          targetAcademicYearId: target,
        }),
        loadTargetClassrooms(target),
      ])
    }
  },
)

const { defaultPassingScore, fetch: fetchAcademicSetting } =
  useAcademicSetting()

onMounted(async () => {
  await Promise.all([
    fetchAcademicYears(),
    fetchAcademicSetting().catch(() => undefined),
  ])

  if (!sourceAcademicYearId.value && derived.value.source) {
    sourceAcademicYearId.value = derived.value.source.id
  }
  if (!targetAcademicYearId.value && derived.value.target) {
    targetAcademicYearId.value = derived.value.target.id
  }
})
</script>

<template>
  <div class="space-y-6 p-4 sm:p-6">
    <Card
      gap="none"
      class="overflow-hidden"
    >
      <CardHeader standard>
        <CardTitle size="lg"> Kenaikan Kelas </CardTitle>
      </CardHeader>

      <CardContent
        variant="standard"
        class="space-y-4"
      >
        <div
          v-if="!isChoosingYears"
          class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border bg-muted/20 px-4 py-3"
        >
          <div
            class="flex flex-wrap items-center justify-center sm:justify-start gap-2 text-xs"
          >
            <span class="text-muted-foreground font-medium"
              >Siklus Kenaikan:</span
            >
            <span class="font-semibold text-foreground">
              {{ derived.source?.name ?? 'Tahun Aktif' }}
            </span>
            <ArrowRight class="size-3.5 text-muted-foreground shrink-0" />
            <span
              v-if="derived.target"
              class="font-semibold text-foreground"
            >
              {{ derived.target.name }}
            </span>
            <span
              v-else
              class="font-medium text-destructive"
            >
              Tahun ajaran target belum dibuat
            </span>
          </div>

          <Button
            variant="outline"
            size="sm"
            class="h-8 text-xs font-medium shrink-0 self-center sm:self-auto"
            @click="isChoosingYears = true"
          >
            <Pencil class="size-3.5 mr-1.5 text-muted-foreground" />
            Ubah Tahun
          </Button>
        </div>

        <div
          v-else
          class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border bg-muted/20 px-4 py-3 sm:py-2.5"
        >
          <div
            class="flex flex-col sm:flex-row sm:items-center items-center gap-2 sm:gap-2.5"
          >
            <span class="text-xs font-medium text-muted-foreground shrink-0"
              >Siklus Kenaikan:</span
            >
            <div class="flex items-center gap-2 sm:gap-2.5">
              <Select v-model="sourceAcademicYearId">
                <SelectTrigger class="h-8 w-36 sm:w-40 text-xs bg-background">
                  <SelectValue placeholder="Tahun Asal" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem
                    v-for="y in academicYears"
                    :key="y.id"
                    :value="y.id"
                    class="text-xs"
                  >
                    {{ y.name }}
                  </SelectItem>
                </SelectContent>
              </Select>

              <ArrowRight class="size-3.5 text-muted-foreground shrink-0" />

              <Select
                v-model="targetAcademicYearId"
                :disabled="!sourceAcademicYearId"
              >
                <SelectTrigger class="h-8 w-36 sm:w-40 text-xs bg-background">
                  <SelectValue placeholder="Tahun Tujuan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem
                    v-for="y in availableTargetYears"
                    :key="y.id"
                    :value="y.id"
                    class="text-xs"
                  >
                    {{ y.name }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            variant="secondary"
            size="sm"
            class="h-8 text-xs font-medium px-3 shrink-0 self-center sm:self-auto"
            @click="isChoosingYears = false"
          >
            <Check class="size-3.5 mr-1" />
            Selesai
          </Button>
        </div>

        <div
          v-if="!isLoadingRecommendations && studentsWithoutTarget.length > 0"
          class="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50/70 p-3.5 text-xs dark:border-amber-900/60 dark:bg-amber-950/20"
        >
          <div class="flex items-start gap-3">
            <AlertCircle
              class="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400"
            />
            <p class="leading-relaxed">
              <strong>{{ studentsWithoutTarget.length }} siswa</strong> belum
              punya kelas tujuan,
              {{ derived.target?.name ?? 'tahun ajaran tujuan' }} belum punya
              kelas di tingkat yang mereka tuju. Salin kelas dari
              {{ derived.source?.name ?? 'tahun ini' }} untuk mengisinya.
            </p>
          </div>

          <Button
            size="sm"
            variant="outline"
            :disabled="isCopyingClassrooms"
            @click="copyClassroomsForward"
          >
            <Loader2
              v-if="isCopyingClassrooms"
              class="size-4 mr-2 animate-spin"
            />
            Salin Kelas
          </Button>
        </div>

        <div
          v-if="!isLoadingRecommendations && excludedGraduatingCount > 0"
          class="rounded-lg border border-blue-200 bg-blue-50/70 dark:border-blue-900/60 dark:bg-blue-950/20 p-3.5 flex items-start gap-3 text-xs"
        >
          <GraduationCap
            class="size-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5"
          />
          <div>
            <span class="font-semibold text-blue-900 dark:text-blue-200">
              {{ excludedGraduatingCount }} siswa tingkat akhir tidak termasuk
              dalam kenaikan kelas ini.
            </span>
            <span class="text-blue-800/80 dark:text-blue-300/80 ml-1">
              Kelulusan mereka dicatat terpisah lewat menu
              <RouterLink
                to="/academic/graduation"
                class="font-semibold underline underline-offset-2 hover:text-blue-950 dark:hover:text-blue-100"
              >
                Kelulusan</RouterLink
              >.
            </span>
          </div>
        </div>

        <PromotionStudentTable
          :recommendations="promotionRecommendations"
          :is-loading="isLoadingRecommendations"
          :target-classrooms="targetClassrooms"
          :passing-score="defaultPassingScore"
          @update:decisions="onDecisionsUpdate"
          @update:filter-class="selectedClass = $event"
        />

        <div
          v-if="
            promotionRecommendations.length > 0 && !isLoadingRecommendations
          "
          class="-mx-6 -mb-6 mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 border-t px-6 py-4"
        >
          <div class="flex items-center gap-4 text-xs">
            <div class="flex items-center gap-1.5">
              <div class="size-2.5 rounded-full bg-green-500" />
              <span class="text-muted-foreground">
                Naik Kelas:
                <strong class="text-foreground">{{
                  summaryStats.approved
                }}</strong>
              </span>
            </div>
            <div class="flex items-center gap-1.5">
              <div class="size-2.5 rounded-full bg-amber-500" />
              <span class="text-muted-foreground">
                Tinggal Kelas:
                <strong class="text-foreground">{{
                  summaryStats.declined
                }}</strong>
              </span>
            </div>
            <div class="text-muted-foreground">
              Total:
              <strong class="text-foreground">{{ summaryStats.total }}</strong>
              Siswa
            </div>
          </div>

          <Button
            size="default"
            class="w-full sm:w-auto font-semibold px-6"
            :disabled="!canExecute"
            @click="openConfirmDialog"
          >
            <Loader2
              v-if="isPromoting"
              class="size-4 mr-2 animate-spin"
            />
            Proses Kenaikan
          </Button>
        </div>
      </CardContent>
    </Card>
  </div>

  <Dialog v-model:open="showConfirmDialog">
    <DialogContent
      class="sm:max-w-3xl flex flex-col gap-0 p-0 overflow-hidden max-h-[90svh]"
    >
      <DialogHeader class="px-6 py-4 border-b shrink-0">
        <DialogTitle>Konfirmasi Kenaikan Kelas</DialogTitle>
      </DialogHeader>

      <div class="overflow-y-auto px-6 py-4 space-y-4">
        <div
          v-if="isPreviewing"
          class="flex items-center gap-2 text-sm text-muted-foreground"
        >
          <Loader2 class="size-4 animate-spin" />
          Memeriksa data yang akan diproses...
        </div>

        <template v-else>
          <div
            class="overflow-x-auto rounded-xl border bg-background shadow-xs"
          >
            <Table class="min-w-[600px]">
              <TableHeader class="bg-muted/50">
                <TableRow>
                  <TableHead class="text-center text-xs font-semibold w-[100px]"
                    >NIS</TableHead
                  >
                  <TableHead class="text-xs font-semibold"
                    >Nama Siswa</TableHead
                  >
                  <TableHead class="text-center text-xs font-semibold w-[90px]"
                    >Kelas Asal</TableHead
                  >
                  <TableHead class="text-center text-xs font-semibold w-[170px]"
                    >Kelas Tujuan</TableHead
                  >
                  <TableHead class="text-center text-xs font-semibold w-[110px]"
                    >Status</TableHead
                  >
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow
                  v-for="row in previewRows"
                  :key="row.studentId"
                  :class="{ 'bg-destructive/5': !row.approved }"
                  class="transition-colors"
                >
                  <TableCell class="text-center py-2 text-xs text-foreground">
                    {{ row.nis }}
                  </TableCell>
                  <TableCell class="py-2">
                    <div class="font-medium text-xs text-foreground">
                      {{ row.studentName }}
                    </div>
                    <div
                      v-if="row.declineReason"
                      class="text-[11px] text-destructive italic mt-0.5"
                    >
                      Alasan: {{ row.declineReason }}
                    </div>
                  </TableCell>
                  <TableCell class="text-center py-2 text-xs text-foreground">
                    {{ row.sourceClass }}
                  </TableCell>
                  <TableCell
                    class="text-center py-2 text-xs"
                    :class="
                      row.approved
                        ? 'text-foreground'
                        : 'text-destructive font-medium'
                    "
                  >
                    {{ row.targetClass }}
                  </TableCell>
                  <TableCell
                    class="text-center py-2 text-xs font-medium"
                    :class="
                      row.approved
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-destructive'
                    "
                  >
                    {{ row.approved ? 'Naik Kelas' : 'Tinggal Kelas' }}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </template>
      </div>

      <DialogFooter
        class="px-6 py-3.5 border-t shrink-0 flex flex-col sm:flex-row sm:items-center justify-between sm:justify-between gap-3 w-full"
      >
        <div class="flex flex-wrap items-center gap-3 text-xs mr-auto">
          <div
            v-if="
              (promotionPreview?.promotedCount ?? summaryStats.approved) > 0
            "
            class="flex items-center gap-1.5 font-medium text-green-600 dark:text-green-400"
          >
            <div class="size-2 rounded-full bg-green-500" />
            {{ promotionPreview?.promotedCount ?? summaryStats.approved }} Naik
            Kelas
          </div>
          <div
            v-if="
              (promotionPreview?.repeatedCount ?? summaryStats.declined) > 0
            "
            class="flex items-center gap-1.5 font-medium text-amber-600 dark:text-amber-400"
          >
            <div class="size-2 rounded-full bg-amber-500" />
            {{ promotionPreview?.repeatedCount ?? summaryStats.declined }}
            Tinggal Kelas
          </div>
          <div class="text-muted-foreground">
            Total:
            <strong class="text-foreground">{{
              promotionPreview?.totalStudents ?? summaryStats.total
            }}</strong>
            Siswa
          </div>
        </div>

        <div class="flex items-center justify-end gap-2 shrink-0">
          <Button
            variant="outline"
            :disabled="isPromoting"
            @click="showConfirmDialog = false"
          >
            Batal
          </Button>
          <Button
            :disabled="isPromoting || isPreviewing"
            @click="handleExecute"
          >
            <Loader2
              v-if="isPromoting"
              class="size-4 mr-2 animate-spin"
            />
            Ya, Proses Sekarang
          </Button>
        </div>
      </DialogFooter>
    </DialogContent>
  </Dialog>

  <PromotionResultDialog
    v-model:open="showResultDialog"
    :result="promotionResult"
    @done="handleDone"
  />
</template>
