<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
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

const semesterId = defineModel<string>('semesterId', { default: '' })

const { hasPermission } = useAuthSession()
const semesters = ref<Semester[]>([])
const yearId = ref('')

const years = computed(() => {
  const seen = new Map<string, string>()
  for (const item of semesters.value) {
    seen.set(item.academicYearId, item.academicYear?.name ?? '-')
  }
  return [...seen].map(([id, name]) => ({ id, name }))
})

const yearSemesters = computed(() =>
  semesters.value.filter((item) => item.academicYearId === yearId.value),
)

const semesterLabel = (item: Semester) => item.type?.name ?? '-'

watch(yearId, (next) => {
  const inYear = semesters.value.filter((item) => item.academicYearId === next)
  if (inYear.some((item) => item.id === semesterId.value)) return
  semesterId.value =
    (inYear.find((item) => item.isActive) ?? inYear[0])?.id ?? ''
})

onMounted(async () => {
  if (!hasPermission('semesters.read')) return
  try {
    const response = await semesterApi.getSemesters({ limit: 100 })
    semesters.value = response.data
  } catch {
    semesters.value = []
    return
  }
  const chosen =
    semesters.value.find((item) => item.id === semesterId.value) ??
    semesters.value.find((item) => item.isActive) ??
    semesters.value[0]
  if (!chosen) return
  yearId.value = chosen.academicYearId
  semesterId.value = chosen.id
})
</script>

<template>
  <FloatingLabelField
    label="Tahun ajaran"
    for="period-year"
    class="w-fit min-w-40"
    floating
  >
    <Select v-model="yearId">
      <SelectTrigger
        id="period-year"
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
    for="period-semester"
    class="w-fit min-w-40"
    floating
  >
    <Select v-model="semesterId">
      <SelectTrigger
        id="period-semester"
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
