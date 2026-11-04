<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { Button } from '@mts241alikhlash/ui/button'
import { addressApi } from '../api/addressApi'
import type { RegionCodes, RegionNames, RegionNode } from '../types'
import RegionLevelSelect from './RegionLevelSelect.vue'

const props = defineProps<{
  modelValue: RegionCodes
  disabled?: boolean
  errors?: Partial<Record<keyof RegionCodes, string>>
}>()

const emit = defineEmits<{
  'update:modelValue': [value: RegionCodes]
  'update:names': [value: RegionNames]
}>()

const LEVELS = [
  { key: 'provinceCode', label: 'Provinsi' },
  { key: 'regencyCode', label: 'Kabupaten/Kota' },
  { key: 'districtCode', label: 'Kecamatan' },
  { key: 'villageCode', label: 'Desa/Kelurahan' },
] as const

const options = ref<RegionNode[][]>([[], [], [], []])
const loading = ref([false, false, false, false])
const failed = ref<{ level: number; parent: string | null }[]>([])
const latest = [0, 0, 0, 0]
const initialized = ref(false)
let hydrating = false
let emittedChain: string | null = null

async function load(level: number, parent: string | null) {
  const request = ++latest[level]
  loading.value[level] = true
  failed.value = failed.value.filter((item) => item.level !== level)
  try {
    const response =
      parent === null
        ? await addressApi.getProvinces()
        : await addressApi.getRegionChildren(parent)
    if (request !== latest[level]) return
    options.value[level] = response.data.data
  } catch {
    if (request !== latest[level]) return
    options.value[level] = []
    failed.value.push({ level, parent })
  } finally {
    if (request === latest[level]) loading.value[level] = false
  }
}

function namesOf(codes: RegionCodes): RegionNames {
  const name = (level: number) =>
    options.value[level].find((node) => node.code === codes[LEVELS[level].key])
      ?.name ?? ''
  return {
    province: name(0),
    city: name(1),
    district: name(2),
    village: name(3),
  }
}

function choose(level: number, code: string) {
  const next = { ...props.modelValue }
  LEVELS.forEach(({ key }, index) => {
    if (index === level) next[key] = code
    else if (index > level) next[key] = ''
  })
  for (let deeper = level + 1; deeper < LEVELS.length; deeper++) {
    latest[deeper]++
    options.value[deeper] = []
    loading.value[deeper] = false
  }
  failed.value = failed.value.filter((item) => item.level <= level)
  emittedChain = LEVELS.map(({ key }) => next[key]).join('|')
  emit('update:modelValue', next)
  emit('update:names', namesOf(next))
  if (code && level < LEVELS.length - 1) void load(level + 1, code)
}

function retry() {
  void initialize()
}

function isDisabled(level: number) {
  if (props.disabled) return true
  return (
    level > 0 &&
    (!props.modelValue[LEVELS[level - 1].key] || loading.value[level])
  )
}

function asOptions(level: number) {
  return options.value[level].map((node) => ({
    id: node.code,
    name: node.name,
  }))
}

onMounted(() => {
  void initialize()
})

watch(
  () => LEVELS.map(({ key }) => props.modelValue[key]).join('|'),
  (chain) => {
    if (chain === emittedChain) {
      emittedChain = null
      return
    }
    if (initialized.value && !hydrating) void initialize()
  },
)

async function initialize() {
  if (hydrating) return
  hydrating = true
  const codes = { ...props.modelValue }
  try {
    for (let level = 0; level < LEVELS.length; level++) {
      const parent = level === 0 ? null : codes[LEVELS[level - 1].key]
      if (level > 0 && !parent) break
      await load(level, parent)
      const code = codes[LEVELS[level].key]
      if (code && !options.value[level].some((node) => node.code === code)) {
        const cleared = { ...codes }
        LEVELS.slice(level).forEach(({ key }) => (cleared[key] = ''))
        emit('update:modelValue', cleared)
        emit('update:names', namesOf(cleared))
        break
      }
    }
  } finally {
    hydrating = false
    initialized.value = true
  }
}
</script>

<template>
  <div class="space-y-3">
    <div class="grid gap-5 sm:grid-cols-2">
      <div
        v-for="(level, index) in LEVELS"
        :key="level.key"
        class="space-y-1"
      >
        <p class="text-sm font-medium">
          {{ level.label }} <span class="text-destructive">*</span>
        </p>
        <RegionLevelSelect
          :label="level.label"
          :model-value="modelValue[level.key]"
          :options="asOptions(index)"
          :disabled="isDisabled(index)"
          :loading="loading[index]"
          :invalid="!!errors?.[level.key]"
          @update:model-value="choose(index, $event)"
        />
        <p
          v-if="errors?.[level.key]"
          class="text-sm text-destructive"
        >
          {{ errors[level.key] }}
        </p>
      </div>
    </div>
    <div
      v-if="failed.length"
      role="alert"
      class="flex flex-wrap items-center gap-3 rounded-md border border-destructive/40 p-3 text-sm"
    >
      <span>Gagal memuat wilayah.</span>
      <Button
        type="button"
        variant="outline"
        size="sm"
        @click="retry"
      >
        Coba lagi
      </Button>
    </div>
  </div>
</template>
