<script setup lang="ts">
import { computed, h, onMounted, ref, useId, watch } from 'vue'
import { useRouter } from 'vue-router'
import { refDebounced } from '@vueuse/core'
import { storeToRefs } from 'pinia'
import type { ColumnDef } from '@tanstack/vue-table'
import { ActionCell, DataTable, SearchInput } from '@mts241alikhlash/ui'
import { Button } from '@mts241alikhlash/ui/button'
import { Badge } from '@mts241alikhlash/ui/badge'
import { Card, CardContent, CardHeader } from '@mts241alikhlash/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@mts241alikhlash/ui/tabs'
import { FloatingLabelField } from '@mts241alikhlash/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@mts241alikhlash/ui/select'
import { applicationService } from '../services/applicationService'
import { documentReviewService } from '../services/documentReviewService'
import { useApplicationStore } from '../stores/applicationStore'
import type { AdmissionDocumentReviewRow, DocumentReviewTab } from '../types'
import { documentSummaryText } from '../utils'

const router = useRouter()
const { waves } = storeToRefs(useApplicationStore())

const tab = ref<DocumentReviewTab>('waiting')
const search = ref('')
const debouncedSearch = refDebounced(search, 300)
const waveFilter = ref('ALL')
const waveFilterId = useId()
const rows = ref<AdmissionDocumentReviewRow[]>([])
const total = ref(0)
const counts = ref({ waiting: 0, revision: 0, done: 0 })
const page = ref(1)
const pageSize = ref(10)
const loading = ref(false)
let latestRequest = 0
const listError = ref<string | null>(null)

const TABS: {
  value: DocumentReviewTab
  label: string
  count: () => number
  empty: string
}[] = [
  {
    value: 'waiting',
    label: 'Menunggu',
    count: () => counts.value.waiting,
    empty: 'Tidak ada pendaftar yang menunggu pemeriksaan berkas.',
  },
  {
    value: 'revision',
    label: 'Perlu perbaikan',
    count: () => counts.value.revision,
    empty: 'Tidak ada pendaftar yang sedang memperbaiki formulir.',
  },
  {
    value: 'done',
    label: 'Selesai',
    count: () => counts.value.done,
    empty: 'Belum ada pendaftar yang selesai diperiksa.',
  },
]

function emptyText() {
  return TABS.find((item) => item.value === tab.value)?.empty ?? ''
}

async function load(resetPage = true) {
  if (resetPage) page.value = 1
  const request = ++latestRequest
  loading.value = true
  const result = await documentReviewService.fetchQueue({
    tab: tab.value,
    search: debouncedSearch.value.trim() || undefined,
    waveId: waveFilter.value === 'ALL' ? undefined : waveFilter.value,
    page: page.value,
    limit: pageSize.value,
  })
  if (request !== latestRequest) return
  loading.value = false
  if ('error' in result) {
    listError.value = result.error
    rows.value = []
    return
  }
  listError.value = null
  total.value = result.total
  counts.value = result.counts
  const lastPage = Math.max(1, Math.ceil(result.total / pageSize.value))
  if (page.value > lastPage) {
    page.value = lastPage
    await load(false)
    return
  }
  rows.value = result.rows
}

function goToPage(next: number) {
  page.value = next
  void load(false)
}

function changePageSize(size: number) {
  pageSize.value = size
  void load()
}

watch([tab, debouncedSearch, waveFilter], () => load())

const columns = computed<ColumnDef<AdmissionDocumentReviewRow>[]>(() => [
  {
    accessorKey: 'registrationNumber',
    header: 'No. Pendaftaran',
    meta: { align: 'center' },
  },
  {
    accessorKey: 'applicantName',
    header: 'Nama Pendaftar',
    meta: { align: 'left', strong: true },
  },
  {
    accessorKey: 'waveName',
    header: 'Gelombang',
    meta: { align: 'center' },
  },
  {
    id: 'documents',
    header: () => (tab.value === 'revision' ? 'Catatan Perbaikan' : 'Berkas'),
    meta:
      tab.value === 'revision'
        ? { align: 'left', mobileLabel: 'Catatan' }
        : {
            align: 'center',
            mobileLabel: 'Berkas',
            mobileValue: (row: AdmissionDocumentReviewRow) =>
              documentSummaryText(row.summary),
          },
    cell: ({ row }) => {
      if (tab.value === 'revision') {
        const rejectedCount = row.original.summary.rejected
        return h('div', { class: 'space-y-0.5 min-w-0' }, [
          h(
            'p',
            { class: 'font-medium text-xs text-destructive' },
            `${rejectedCount} berkas ditolak`,
          ),
          row.original.revisionNote
            ? h(
                'p',
                {
                  class:
                    'text-xs text-muted-foreground line-clamp-2 max-w-md break-words',
                },
                row.original.revisionNote,
              )
            : null,
        ])
      }
      const summary = row.original.summary
      const uploaded = summary.total - summary.missing
      return `${uploaded}/${summary.total} Berkas`
    },
  },
  {
    id: 'actions',
    header: 'Aksi',
    meta: { align: 'center' },
    cell: ({ row }) =>
      h(ActionCell, {
        viewLabel: 'Periksa',
        hideEdit: true,
        hideDelete: true,
        onView: () =>
          router.push(`/admin/document-reviews/${row.original.applicationId}`),
      }),
    enableSorting: false,
  },
])

onMounted(async () => {
  await applicationService.fetchWaves()
  await load()
})
</script>

<template>
  <div class="px-4 pb-4 pt-1 sm:px-6 sm:pb-6 sm:pt-2">
    <Card
      gap="none"
      class="overflow-visible rounded-none border-0 bg-transparent shadow-none ring-0"
    >
      <div class="space-y-4 p-0 sm:px-0">
        <Tabs
          v-model="tab"
          variant="line"
          class="min-w-0 gap-0"
        >
          <Card gap="none">
            <CardHeader class="p-0 shrink-0">
              <TabsList class="w-full bg-muted/30 px-4 sm:px-6">
                <TabsTrigger
                  v-for="item in TABS"
                  :key="item.value"
                  :value="item.value"
                >
                  {{ item.label }}
                  <Badge
                    variant="secondary"
                    class="ml-1.5"
                  >
                    {{ item.count() }}
                  </Badge>
                </TabsTrigger>
              </TabsList>
            </CardHeader>

            <CardContent
              class="space-y-4 px-4 pt-3 pb-4 sm:px-6 sm:pt-3.5 sm:pb-6"
            >
              <div
                class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"
              >
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
                        v-for="wave in waves"
                        :key="wave.id"
                        :value="wave.id"
                      >
                        {{ wave.name }}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </FloatingLabelField>
                <SearchInput
                  v-model="search"
                  label="Cari nama atau no. pendaftaran"
                />
              </div>

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
                  @click="load()"
                >
                  Coba lagi
                </Button>
              </div>
              <template v-else>
                <p
                  v-if="loading && !rows.length"
                  class="text-center text-[length:var(--text-control,0.75rem)] text-muted-foreground"
                >
                  Memuat antrean berkas…
                </p>
                <p
                  v-else-if="!rows.length"
                  class="rounded-md border p-4 text-center text-[length:var(--text-control,0.75rem)] text-muted-foreground"
                >
                  {{ emptyText() }}
                </p>
                <template v-else>
                  <DataTable
                    mobile="cards"
                    :columns="columns"
                    :data="rows"
                    :page="page"
                    :page-size="pageSize"
                    :total-items="total"
                    :is-loading="loading"
                    item-label="pendaftar"
                    @update:page="goToPage"
                    @update:page-size="changePageSize"
                  />
                </template>
              </template>
            </CardContent>
          </Card>
        </Tabs>
      </div>
    </Card>
  </div>
</template>
