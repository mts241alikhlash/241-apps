<script setup lang="ts">
import { computed, ref, useId, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useRouteCategory } from '@/features/exam-shared/useRouteCategory'
import { BackButton, DataTable, DataTableEmpty } from '@mts241alikhlash/ui'
import { Button } from '@mts241alikhlash/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@mts241alikhlash/ui/card'
import { FloatingLabelField } from '@mts241alikhlash/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@mts241alikhlash/ui/select'
import { useBreadcrumbs } from '@mts241alikhlash/web-shared/composables/useBreadcrumbs'
import { sessionStatusLabel } from '@/features/exam-schedule/types'
import { buildGradingSessionColumns } from '../components/gradingColumns'
import { useSortedGradingSessions } from '../composables/useGradingLists'

const route = useRoute()
const router = useRouter()
const scheduleId = computed(() => String(route.params.scheduleId ?? ''))
const { sectionPrefix } = useRouteCategory()
const gradingBaseHref = computed(() => `${sectionPrefix.value}/grading`)
const backLabel = computed(() =>
  typeof route.query.periode === 'string' && route.query.periode !== ''
    ? 'Kembali ke daftar kelas'
    : 'Kembali ke Penilaian Ujian',
)
const backHref = computed(() => {
  const periode = route.query.periode
  const mapel = route.query.mapel
  if (typeof periode !== 'string' || periode === '')
    return gradingBaseHref.value
  const base = `${gradingBaseHref.value}/period/${periode}`
  return typeof mapel === 'string' && mapel !== '' ? `${base}/${mapel}` : base
})
const examTitle = computed(() =>
  typeof route.query.judul === 'string' && route.query.judul !== ''
    ? route.query.judul
    : 'Daftar Siswa',
)
const status = ref('ALL')
const page = ref(1)
const pageSize = ref(25)
const statusFieldId = useId()

useBreadcrumbs(() => [
  { title: 'Penilaian Ujian', href: gradingBaseHref.value },
  { title: examTitle.value },
])

const { sessions, totalItems, loading, listError, refresh } =
  useSortedGradingSessions(scheduleId, status, page, pageSize)

watch(status, () => (page.value = 1), { flush: 'sync' })

const openSession = (session: { sessionId: string }) =>
  void router.push({
    path: `${gradingBaseHref.value}/${scheduleId.value}/${session.sessionId}`,
    query: route.query,
  })

const columns = computed(() =>
  buildGradingSessionColumns({
    onOpen: openSession,
  }),
)

function changePageSize(size: number) {
  pageSize.value = size
  page.value = 1
}
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
            :label="backLabel"
            @click="router.push(backHref)"
          />
          <CardTitle class="font-semibold">{{ examTitle }}</CardTitle>
        </div>
      </CardHeader>
      <CardContent
        class="flex min-h-0 flex-1 flex-col overflow-auto pt-2 px-4 pb-4"
      >
        <div
          v-if="listError"
          class="space-y-3 rounded-md border p-4"
          role="alert"
        >
          <p class="text-control">
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
          :columns="columns"
          :data="sessions"
          :page="page"
          :page-size="pageSize"
          :total-items="totalItems"
          :is-loading="loading"
          item-label="siswa"
          @row-click="openSession"
          @update:page="page = $event"
          @update:page-size="changePageSize"
        >
          <template #filters>
            <FloatingLabelField
              label="Status"
              :for="statusFieldId"
              class="w-fit min-w-28"
              floating
            >
              <Select v-model="status">
                <SelectTrigger
                  :id="statusFieldId"
                  class="w-full"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Semua</SelectItem>
                  <SelectItem
                    v-for="option in [
                      'SUBMITTED',
                      'EXPIRED',
                      'GRADED',
                    ] as const"
                    :key="option"
                    :value="option"
                  >
                    {{ sessionStatusLabel(option) }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </FloatingLabelField>
          </template>
          <template #empty>
            <DataTableEmpty
              :message="
                status !== 'ALL'
                  ? 'Tidak ada siswa yang cocok dengan filter.'
                  : 'Belum ada siswa yang mengerjakan ujian ini.'
              "
            />
          </template>
        </DataTable>
      </CardContent>
      <CardFooter plain />
    </Card>
  </div>
</template>
