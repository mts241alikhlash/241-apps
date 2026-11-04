<script setup lang="ts">
import { computed, onMounted, ref, useId, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { ArrowRight, Filter } from '@lucide/vue'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@mts241alikhlash/ui/dialog'
import { Button } from '@mts241alikhlash/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@mts241alikhlash/ui/card'
import { Skeleton } from '@mts241alikhlash/ui/skeleton'
import { FloatingLabelField } from '@mts241alikhlash/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@mts241alikhlash/ui/select'
import { useAdmissionStats } from '../composables/useAdmissionStats'
import { STATUS_LABELS } from '../types'
import type { AdmissionStatus } from '../types'

const {
  stats,
  loading,
  error,
  waves,
  academicYears,
  fetchStats,
  fetchWaves,
  fetchAcademicYears,
} = useAdmissionStats()

const yearFilter = ref('ALL')
const waveFilter = ref('ALL')
const yearFilterId = useId()
const waveFilterId = useId()
const mobileYearFilterId = useId()
const mobileWaveFilterId = useId()
const filterOpen = ref(false)

const yearOptions = computed(() =>
  [...academicYears.value].sort((a, b) => b.name.localeCompare(a.name)),
)
const waveOptions = computed(() =>
  yearFilter.value === 'ALL'
    ? waves.value
    : waves.value.filter((wave) => wave.academicYearId === yearFilter.value),
)
const statsFilter = computed(() => ({
  academicYearId: yearFilter.value === 'ALL' ? undefined : yearFilter.value,
  waveId: waveOptions.value.some((wave) => wave.id === waveFilter.value)
    ? waveFilter.value
    : undefined,
}))
const scopeLabel = computed(() => {
  const wave = waves.value.find((item) => item.id === statsFilter.value.waveId)
  if (wave) return wave.name
  const year = academicYears.value.find((item) => item.id === yearFilter.value)
  return year ? `Tahun Ajaran ${year.name}` : 'Semua tahun ajaran'
})

function loadStats() {
  void fetchStats(statsFilter.value)
}

watch(yearFilter, () => {
  if (!waveOptions.value.some((wave) => wave.id === waveFilter.value)) {
    waveFilter.value = 'ALL'
  }
})
watch(() => JSON.stringify(statsFilter.value), loadStats)

const STATUS_ORDER: AdmissionStatus[] = [
  'DRAFT',
  'SUBMITTED',
  'REVISION_NEEDED',
  'VERIFIED',
  'ACCEPTED',
  'ENROLLING',
  'REJECTED',
  'ENROLLED',
]

const ATTENTION: AdmissionStatus[] = ['SUBMITTED', 'VERIFIED', 'ACCEPTED']

const counts = computed(() =>
  STATUS_ORDER.map((status) => stats.value?.byStatus[status] ?? 0),
)

const maxCount = computed(() => Math.max(...counts.value, 1))

const needsAction = computed(() =>
  ATTENTION.reduce(
    (sum, status) => sum + (stats.value?.byStatus[status] ?? 0),
    0,
  ),
)

const hasWaves = computed(() => (stats.value?.waves.length ?? 0) > 0)

function countOf(status: AdmissionStatus) {
  return stats.value?.byStatus[status] ?? 0
}

function barWidth(status: AdmissionStatus) {
  return `${Math.round((countOf(status) / maxCount.value) * 100)}%`
}

function isAttention(status: AdmissionStatus) {
  return ATTENTION.includes(status)
}

function wavePercent(fillRate: number) {
  return Math.round(fillRate * 100)
}

onMounted(async () => {
  void fetchWaves()
  await fetchAcademicYears()
  const activeYear = academicYears.value.find((year) => year.isActive)
  if (activeYear) yearFilter.value = activeYear.id
  else loadStats()
})
</script>

<template>
  <div class="px-4 pb-4 pt-1 sm:px-6 sm:pb-6 sm:pt-2">
    <Card
      gap="none"
      class="overflow-visible rounded-none border-0 bg-transparent shadow-none ring-0"
    >
      <CardHeader
        standard
        class="min-h-0 border-b-0 bg-transparent px-0 pt-0 pb-3 sm:px-0"
      >
        <CardTitle size="lg"> Penerimaan Santri Baru </CardTitle>
      </CardHeader>

      <CardContent class="space-y-4 p-0 sm:px-0">
        <div class="hidden flex-col gap-3 md:flex md:flex-row md:items-end">
          <FloatingLabelField
            label="Tahun Ajaran"
            :for="yearFilterId"
            class="w-full sm:w-48"
            floating
          >
            <Select v-model="yearFilter">
              <SelectTrigger
                :id="yearFilterId"
                class="w-full"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Semua</SelectItem>
                <SelectItem
                  v-for="year in yearOptions"
                  :key="year.id"
                  :value="year.id"
                >
                  {{ year.name }}
                </SelectItem>
              </SelectContent>
            </Select>
          </FloatingLabelField>
          <FloatingLabelField
            label="Gelombang"
            :for="waveFilterId"
            class="w-full sm:w-48"
            floating
          >
            <Select v-model="waveFilter">
              <SelectTrigger
                :id="waveFilterId"
                class="w-full"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Semua</SelectItem>
                <SelectItem
                  v-for="wave in waveOptions"
                  :key="wave.id"
                  :value="wave.id"
                >
                  {{ wave.name }}
                </SelectItem>
              </SelectContent>
            </Select>
          </FloatingLabelField>
        </div>
        <div class="flex items-center justify-between gap-3 md:hidden">
          <p
            class="min-w-0 truncate text-[length:var(--text-control,0.75rem)] text-muted-foreground"
          >
            {{ scopeLabel }}
          </p>
          <Button
            variant="outline"
            class="shrink-0"
            @click="filterOpen = true"
            ><Filter class="mr-1.5 size-4" />Filter</Button
          >
        </div>

        <template v-if="loading">
          <div class="grid gap-4 lg:grid-cols-3">
            <Skeleton class="h-44 rounded-xl lg:col-span-2" />
            <Skeleton class="h-44 rounded-xl" />
          </div>
          <Skeleton class="h-40 rounded-xl" />
          <Skeleton class="h-44 rounded-xl" />
        </template>

        <div
          v-else-if="error"
          class="space-y-3 rounded-md border p-4"
          role="alert"
        >
          <p class="text-[length:var(--text-control,0.75rem)]">{{ error }}</p>
          <Button
            variant="outline"
            @click="loadStats()"
          >
            Coba lagi
          </Button>
        </div>

        <template v-else-if="stats">
          <div class="grid gap-4 lg:grid-cols-3">
            <Card
              gap="none"
              class="border-primary bg-primary p-6 text-primary-foreground lg:col-span-2"
            >
              <p
                class="text-[length:var(--text-control,0.75rem)] font-medium text-primary-foreground"
              >
                Total pendaftar
              </p>
              <p
                class="mt-2 text-5xl font-medium tabular-nums tracking-tight sm:text-6xl"
              >
                {{ stats.total }}
              </p>
              <p
                class="mt-2 text-[length:var(--text-control,0.75rem)] text-primary-foreground"
              >
                {{ scopeLabel }}
              </p>
            </Card>

            <Card
              gap="none"
              class="p-6"
            >
              <p
                class="text-[length:var(--text-control,0.75rem)] font-medium text-muted-foreground"
              >
                Perlu tindakan
              </p>
              <p
                class="mt-2 text-5xl font-medium tabular-nums tracking-tight"
                :class="needsAction > 0 ? 'text-amber-700' : ''"
              >
                {{ needsAction }}
              </p>
              <p
                class="mt-2 text-[length:var(--text-control,0.75rem)]"
                :class="
                  needsAction > 0 ? 'text-amber-700' : 'text-muted-foreground'
                "
              >
                {{
                  needsAction > 0
                    ? 'Menunggu tindakan admin'
                    : 'Tidak ada yang menunggu'
                }}
              </p>
            </Card>
          </div>

          <Card gap="none">
            <CardHeader standard>
              <div class="flex items-center gap-3">
                <CardTitle size="md">Status pendaftar</CardTitle>
              </div>
            </CardHeader>
            <CardContent class="pb-6">
              <div
                class="grid grid-cols-2 gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-3 xl:grid-cols-4"
              >
                <div
                  v-for="status in STATUS_ORDER"
                  :key="status"
                  class="bg-card p-4"
                >
                  <p class="text-xs font-medium text-muted-foreground">
                    {{ STATUS_LABELS[status] }}
                  </p>
                  <p
                    class="mt-1 text-2xl font-medium tabular-nums tracking-tight"
                  >
                    {{ countOf(status) }}
                  </p>
                  <div class="mt-3 h-1 overflow-hidden rounded-full bg-muted">
                    <div
                      class="h-full rounded-full transition-all"
                      :class="
                        isAttention(status) ? 'bg-amber-700' : 'bg-primary'
                      "
                      :style="{ width: barWidth(status) }"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card gap="none">
            <CardHeader standard>
              <CardTitle size="md">Keterisian kuota</CardTitle>
              <RouterLink
                v-if="hasWaves"
                :to="{ name: 'admin-applications' }"
                class="inline-flex items-center gap-1 text-[length:var(--text-control,0.75rem)] font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Lihat semua pendaftar
                <ArrowRight class="size-3.5" />
              </RouterLink>
            </CardHeader>
            <CardContent class="pb-6">
              <p
                v-if="!hasWaves"
                class="rounded-md border p-4 text-center text-[length:var(--text-control,0.75rem)] text-muted-foreground"
              >
                Tidak ada data.
              </p>
              <ul
                v-else
                class="divide-y"
              >
                <li
                  v-for="wave in stats.waves"
                  :key="wave.id"
                >
                  <RouterLink
                    :to="{
                      name: 'admin-applications',
                      query: { wave: wave.id },
                    }"
                    class="block py-4 transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <div class="flex items-end justify-between gap-4">
                      <div class="min-w-0">
                        <p class="truncate font-medium">{{ wave.name }}</p>
                        <p class="text-xs text-muted-foreground">
                          {{ wave.code }}
                        </p>
                      </div>
                      <div class="shrink-0 text-right">
                        <p
                          class="text-2xl font-medium tabular-nums leading-none"
                        >
                          {{ wave.filled }}
                          <span
                            class="text-[length:var(--text-control,0.75rem)] font-normal text-muted-foreground"
                            >/ {{ wave.quota }} terisi</span
                          >
                        </p>
                        <p
                          class="pt-1 text-xs font-medium"
                          :class="
                            wavePercent(wave.quotaFillRate) >= 100
                              ? 'text-amber-700'
                              : 'text-muted-foreground'
                          "
                        >
                          {{ wavePercent(wave.quotaFillRate) }}%
                          <template
                            v-if="wavePercent(wave.quotaFillRate) >= 100"
                          >
                            kuota penuh
                          </template>
                        </p>
                      </div>
                    </div>
                    <div
                      class="mt-3 h-1.5 overflow-hidden rounded-full bg-muted"
                    >
                      <div
                        class="h-full rounded-full transition-all"
                        :class="
                          wavePercent(wave.quotaFillRate) >= 100
                            ? 'bg-amber-700'
                            : 'bg-primary'
                        "
                        :style="{
                          width: `${Math.min(wavePercent(wave.quotaFillRate), 100)}%`,
                        }"
                      />
                    </div>
                  </RouterLink>
                </li>
              </ul>
            </CardContent>
          </Card>
        </template>
      </CardContent>
    </Card>

    <Dialog v-model:open="filterOpen">
      <DialogContent size="md">
        <DialogHeader standard
          ><DialogTitle>Filter Statistik</DialogTitle
          ><DialogDescription class="sr-only"
            >Pilih tahun ajaran dan gelombang.</DialogDescription
          ></DialogHeader
        >
        <div
          data-test="mobile-stats-filter"
          class="min-h-0 flex-1 space-y-4 overflow-y-auto dialog-body"
        >
          <FloatingLabelField
            label="Tahun Ajaran"
            :for="mobileYearFilterId"
            floating
          >
            <Select v-model="yearFilter"
              ><SelectTrigger
                :id="mobileYearFilterId"
                class="w-full"
                ><SelectValue /></SelectTrigger
              ><SelectContent
                ><SelectItem value="ALL">Semua</SelectItem
                ><SelectItem
                  v-for="year in yearOptions"
                  :key="year.id"
                  :value="year.id"
                  >{{ year.name }}</SelectItem
                ></SelectContent
              ></Select
            >
          </FloatingLabelField>
          <FloatingLabelField
            label="Gelombang"
            :for="mobileWaveFilterId"
            floating
          >
            <Select v-model="waveFilter"
              ><SelectTrigger
                :id="mobileWaveFilterId"
                class="w-full"
                ><SelectValue /></SelectTrigger
              ><SelectContent
                ><SelectItem value="ALL">Semua</SelectItem
                ><SelectItem
                  v-for="wave in waveOptions"
                  :key="wave.id"
                  :value="wave.id"
                  >{{ wave.name }}</SelectItem
                ></SelectContent
              ></Select
            >
          </FloatingLabelField>
        </div>
        <DialogFooter standard>
          <Button @click="filterOpen = false">Tutup</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
