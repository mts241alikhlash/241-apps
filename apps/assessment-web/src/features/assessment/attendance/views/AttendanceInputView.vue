<script setup lang="ts">
import type { FilterOption } from '@mts241alikhlash/web-shared/types/filter.types'
import { AcademicPeriodFilter } from '@/features/lookup/semester'
import AttendanceInputTable from '../components/AttendanceInputTable.vue'
import { useAttendance } from '../composables/useAttendance'
import { toDateInputValue } from '@mts241alikhlash/web-shared/utils/utils'
import { DatePicker } from '@mts241alikhlash/ui'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@mts241alikhlash/ui/card'
import { Button } from '@mts241alikhlash/ui/button'
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
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@mts241alikhlash/ui/empty'
import { FloatingLabelField } from '@mts241alikhlash/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@mts241alikhlash/ui/select'
import { Filter, Loader2, Save } from '@lucide/vue'
import { computed, onMounted, ref, useId, watch } from 'vue'
import { useRoleGuard } from '@mts241alikhlash/platform/auth'

const { can } = useRoleGuard()
const canRecordAttendance = computed(() => can('attendances.manage'))

const {
  loading,
  isSaving,
  classrooms,
  semesters,
  selectedClassroomId,
  selectedSemesterId,
  selectedDate,
  inputRows,
  fetchFilterOptions,
  loadAttendanceInput,
  bulkSaveAttendance,
} = useAttendance()

const filterId = useId()
const mobileFilterId = useId()
const filterOpen = ref(false)
const relatedLoading = ref(false)
const confirmOpen = ref(false)

const activeSemester = computed(
  () => semesters.value.find((s) => s.id === selectedSemesterId.value) ?? null,
)

const classroomFilterOptions = computed<FilterOption[]>(() =>
  classrooms.value
    .filter(
      (c) =>
        !activeSemester.value ||
        c.academicYearId === activeSemester.value.academicYearId,
    )
    .map((c) => ({
      value: c.id,
      label: c.code ?? '-',
    })),
)

const classroomModel = computed({
  get: () => selectedClassroomId.value ?? '',
  set: (value: string) => {
    selectedClassroomId.value = value
  },
})

const isFilterReady = computed(() =>
  Boolean(
    selectedClassroomId.value && selectedSemesterId.value && selectedDate.value,
  ),
)

const activeFiltersCount = computed(
  () =>
    Number(Boolean(selectedSemesterId.value)) +
    Number(Boolean(selectedClassroomId.value)) +
    Number(Boolean(selectedDate.value)),
)

const emptyMessage = computed(() => {
  if (relatedLoading.value) return 'Memuat data...'
  if (!selectedSemesterId.value) {
    return semesters.value.length === 0
      ? 'Belum ada semester aktif. Aktifkan satu lewat menu Periode Akademik.'
      : 'Pilih tahun ajaran dan semester terlebih dahulu.'
  }
  if (!selectedClassroomId.value) {
    return 'Pilih kelas untuk menampilkan daftar input kehadiran.'
  }
  return 'Belum ada data siswa pada kelas ini.'
})

watch(classroomFilterOptions, (options) => {
  if (
    selectedClassroomId.value &&
    !options.some((o) => o.value === selectedClassroomId.value)
  ) {
    selectedClassroomId.value = ''
  }
  if (!selectedClassroomId.value && options.length > 0) {
    selectedClassroomId.value = options[0]?.value ?? ''
  }
})

watch([selectedSemesterId, selectedClassroomId, selectedDate], () => {
  if (isFilterReady.value) {
    void loadAttendanceInput()
  } else {
    inputRows.value = []
  }
})

const undecidedCount = computed(
  () => inputRows.value.filter((row) => row.needsDecision).length,
)

function handleSaveClick() {
  if (undecidedCount.value > 0) {
    confirmOpen.value = true
    return
  }
  void bulkSaveAttendance()
}

async function confirmSave() {
  confirmOpen.value = false
  await bulkSaveAttendance()
}

function resetFilters() {
  if (classroomFilterOptions.value.length > 1) {
    selectedClassroomId.value = ''
  }
  selectedDate.value = toDateInputValue()
}

onMounted(async () => {
  relatedLoading.value = true
  try {
    await fetchFilterOptions()
    const defaultSemester =
      semesters.value.find((s) => s.isActive) ?? semesters.value[0]
    if (defaultSemester && !selectedSemesterId.value) {
      selectedSemesterId.value = defaultSemester.id
    }
    if (!selectedClassroomId.value && classroomFilterOptions.value.length > 0) {
      selectedClassroomId.value = classroomFilterOptions.value[0]?.value ?? ''
    }
    selectedDate.value ||= toDateInputValue()
  } finally {
    relatedLoading.value = false
  }
})
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <Card
      v-if="!canRecordAttendance"
      gap="none"
      class="flex min-h-0 flex-1 flex-col overflow-hidden"
    >
      <CardHeader standard>
        <CardTitle class="font-semibold">Input Kehadiran</CardTitle>
      </CardHeader>
      <CardContent
        class="flex min-h-0 flex-1 flex-col space-y-4 overflow-auto pt-2 px-4 pb-4"
      >
        <Empty>
          <EmptyHeader>
            <EmptyTitle>Akses ditolak</EmptyTitle>
            <EmptyDescription>
              Anda tidak memiliki izin untuk menginput kehadiran.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </CardContent>
      <CardFooter plain />
    </Card>

    <Card
      v-else
      gap="none"
      class="flex min-h-0 flex-1 flex-col overflow-hidden"
    >
      <CardHeader standard>
        <CardTitle class="font-semibold">Input Kehadiran</CardTitle>
      </CardHeader>

      <CardContent
        class="flex min-h-0 flex-1 flex-col space-y-4 overflow-auto pt-2 px-4 pb-4"
      >
        <AttendanceInputTable
          v-model:rows="inputRows"
          :loading="relatedLoading || loading"
          :empty-message="emptyMessage"
        >
          <template #filters>
            <AcademicPeriodFilter
              v-model:semester-id="selectedSemesterId"
              :semesters="semesters"
            />

            <FloatingLabelField
              label="Kelas"
              :for="`${filterId}-classroom`"
              class="w-fit min-w-28"
              floating
            >
              <Select v-model="classroomModel">
                <SelectTrigger
                  :id="`${filterId}-classroom`"
                  class="w-full"
                >
                  <SelectValue placeholder="Pilih kelas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem
                    v-for="c in classroomFilterOptions"
                    :key="c.value"
                    :value="c.value"
                  >
                    {{ c.label }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </FloatingLabelField>

            <FloatingLabelField
              label="Tanggal"
              :for="`${filterId}-date`"
              class="w-40"
              :floating="Boolean(selectedDate)"
            >
              <DatePicker
                :id="`${filterId}-date`"
                v-model="selectedDate"
              />
            </FloatingLabelField>
          </template>
          <template #mobile-filter>
            <Button
              variant="outline"
              class="relative shrink-0"
              @click="filterOpen = true"
            >
              <Filter class="size-4" />
              Filter
              <span
                v-if="activeFiltersCount"
                class="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground"
              >
                {{ activeFiltersCount }}
              </span>
            </Button>
          </template>
        </AttendanceInputTable>
      </CardContent>

      <CardFooter
        v-if="isFilterReady && inputRows.length > 0"
        class="justify-between"
      >
        <p
          v-if="undecidedCount > 0"
          class="text-control text-warning"
        >
          {{ undecidedCount }} siswa belum dipastikan kehadirannya
        </p>
        <span v-else />

        <Button
          :disabled="isSaving || loading || inputRows.length === 0"
          @click="handleSaveClick"
        >
          <Loader2
            v-if="isSaving"
            class="size-4 animate-spin"
          />
          <Save
            v-else
            class="size-4"
          />
          Simpan Kehadiran
        </Button>
      </CardFooter>
      <CardFooter
        v-else
        plain
      />
    </Card>

    <Dialog v-model:open="filterOpen">
      <DialogContent size="md">
        <DialogHeader standard>
          <DialogTitle>Filter Kehadiran</DialogTitle>
          <DialogDescription>
            Pilih periode, kelas, dan tanggal untuk mengisi kehadiran siswa.
          </DialogDescription>
        </DialogHeader>
        <DialogBody class="space-y-4">
          <AcademicPeriodFilter
            v-model:semester-id="selectedSemesterId"
            :semesters="semesters"
            full-width
          />

          <FloatingLabelField
            label="Kelas"
            :for="`${mobileFilterId}-classroom`"
            floating
          >
            <Select v-model="classroomModel">
              <SelectTrigger
                :id="`${mobileFilterId}-classroom`"
                class="w-full"
              >
                <SelectValue placeholder="Pilih kelas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="c in classroomFilterOptions"
                  :key="c.value"
                  :value="c.value"
                >
                  {{ c.label }}
                </SelectItem>
              </SelectContent>
            </Select>
          </FloatingLabelField>

          <FloatingLabelField
            label="Tanggal"
            :for="`${mobileFilterId}-date`"
            :floating="Boolean(selectedDate)"
          >
            <DatePicker
              :id="`${mobileFilterId}-date`"
              v-model="selectedDate"
            />
          </FloatingLabelField>
        </DialogBody>
        <DialogFooter
          standard
          class="justify-between"
        >
          <Button
            variant="outline"
            :disabled="activeFiltersCount === 0"
            @click="resetFilters"
          >
            Atur Ulang
          </Button>
          <Button @click="filterOpen = false"> Tutup </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <AlertDialog :open="confirmOpen">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Simpan kehadiran?</AlertDialogTitle>
          <AlertDialogDescription>
            {{ undecidedCount }} siswa tidak terdeteksi di gerbang dan belum
            Anda tandai. Mereka akan tersimpan sebagai
            <strong class="text-foreground">Hadir</strong>. Pastikan dulu
            sebelum melanjutkan.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel @click="confirmOpen = false">
            Periksa Lagi
          </AlertDialogCancel>
          <AlertDialogAction @click="confirmSave">
            Simpan Sekarang
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>
