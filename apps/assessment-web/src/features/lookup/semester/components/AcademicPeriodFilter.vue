<script setup lang="ts">
import { computed, onMounted, ref, useId, watch } from 'vue'
import { FloatingLabelField } from '@mts241alikhlash/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@mts241alikhlash/ui/select'
import { useAuthSession } from '@mts241alikhlash/platform/auth'
import { semesterApi } from '../api/semesterApi'
import type { Semester } from '../types'

const props = withDefaults(
  defineProps<{
    semesters?: Semester[]
    fullWidth?: boolean
  }>(),
  {
    fullWidth: false,
  },
)

const semesterId = defineModel<string>('semesterId', { default: '' })

const id = useId()
const { hasPermission } = useAuthSession()
const loadedSemesters = ref<Semester[]>([])
const yearId = ref('')

const availableSemesters = computed(
  () => props.semesters ?? loadedSemesters.value,
)

const years = computed(() => {
  const seen = new Map<
    string,
    { id: string; name: string; startYear: number }
  >()
  for (const item of availableSemesters.value) {
    if (!seen.has(item.academicYearId)) {
      seen.set(item.academicYearId, {
        id: item.academicYearId,
        name: item.academicYear?.name ?? '-',
        startYear: item.academicYear?.startYear ?? 0,
      })
    }
  }
  return [...seen.values()].sort((a, b) => b.startYear - a.startYear)
})

const yearSemesters = computed(() =>
  availableSemesters.value
    .filter((item) => item.academicYearId === yearId.value)
    .sort((a, b) => (a.type?.name ?? '').localeCompare(b.type?.name ?? '')),
)

function semesterLabel(item: Semester) {
  const name = item.type?.name
  if (name === 'ODD') return 'Ganjil'
  if (name === 'EVEN') return 'Genap'
  return name ?? '-'
}

function syncFromSemesters(list: Semester[]) {
  if (list.length === 0) return
  const chosen =
    list.find((item) => item.id === semesterId.value) ??
    list.find((item) => item.isActive) ??
    list[0]
  if (!chosen) return
  if (yearId.value !== chosen.academicYearId) {
    yearId.value = chosen.academicYearId
  }
  if (semesterId.value !== chosen.id) {
    semesterId.value = chosen.id
  }
}

watch(
  availableSemesters,
  (list) => {
    syncFromSemesters(list)
  },
  { immediate: true },
)

watch(semesterId, (next) => {
  const match = availableSemesters.value.find((item) => item.id === next)
  if (match && match.academicYearId !== yearId.value) {
    yearId.value = match.academicYearId
  }
})

watch(yearId, (next) => {
  if (!next) return
  const inYear = availableSemesters.value.filter(
    (item) => item.academicYearId === next,
  )
  if (inYear.length === 0) return
  if (inYear.some((item) => item.id === semesterId.value)) return
  semesterId.value =
    (inYear.find((item) => item.isActive) ?? inYear[0])?.id ?? ''
})

onMounted(async () => {
  if (props.semesters !== undefined) return
  if (!hasPermission('semesters.read')) return
  try {
    const response = await semesterApi.getSemesters({ limit: 100 })
    loadedSemesters.value = response.data?.data ?? []
  } catch {
    loadedSemesters.value = []
  }
})
</script>

<template>
  <FloatingLabelField
    label="Tahun Ajaran"
    :for="`${id}-year`"
    :class="fullWidth ? 'w-full' : 'w-fit min-w-36'"
    :floating="Boolean(yearId)"
  >
    <Select v-model="yearId">
      <SelectTrigger
        :id="`${id}-year`"
        class="w-full"
      >
        <SelectValue placeholder="Pilih tahun ajaran" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem
          v-for="year in years"
          :key="year.id"
          :value="year.id"
        >
          {{ year.name }}
        </SelectItem>
      </SelectContent>
    </Select>
  </FloatingLabelField>
  <FloatingLabelField
    label="Semester"
    :for="`${id}-semester`"
    :class="fullWidth ? 'w-full' : 'w-fit min-w-28'"
    :floating="Boolean(semesterId)"
  >
    <Select v-model="semesterId">
      <SelectTrigger
        :id="`${id}-semester`"
        class="w-full"
      >
        <SelectValue placeholder="Pilih semester" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem
          v-for="item in yearSemesters"
          :key="item.id"
          :value="item.id"
        >
          {{ semesterLabel(item) }}
        </SelectItem>
      </SelectContent>
    </Select>
  </FloatingLabelField>
</template>
