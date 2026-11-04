<script setup lang="ts">
import { computed, h, onMounted, ref, useId, watch } from 'vue'
import { useRouter } from 'vue-router'
import { refDebounced } from '@vueuse/core'
import { storeToRefs } from 'pinia'
import type { ColumnDef } from '@tanstack/vue-table'
import { ActionCell, DataTable, SearchInput } from '@mts241alikhlash/ui'
import { Button } from '@mts241alikhlash/ui/button'
import { Badge } from '@mts241alikhlash/ui/badge'
import { Checkbox } from '@mts241alikhlash/ui/checkbox'
import { Card, CardContent, CardHeader } from '@mts241alikhlash/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@mts241alikhlash/ui/tabs'
import { Textarea } from '@mts241alikhlash/ui/textarea'
import { FloatingLabelField } from '@mts241alikhlash/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@mts241alikhlash/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@mts241alikhlash/ui/dialog'
import { useRoleGuard } from '@/features/platform/auth'
import { applicationService } from '../services/applicationService'
import { decisionService } from '../services/decisionService'
import { useApplicationStore } from '../stores/applicationStore'
import type { AdmissionDecisionRow, DecisionTab } from '../types'
import { formatDate } from '../utils'

type ActionKind =
  'accept' | 'reject' | 'accept-many' | 'cancel-acceptance' | 'cancel-rejection'

const router = useRouter()
const { can } = useRoleGuard()
const canDecide = computed(() => can('admission-decisions.decide'))
const { waves } = storeToRefs(useApplicationStore())

const tab = ref<DecisionTab>('waiting')
const search = ref('')
const debouncedSearch = refDebounced(search, 300)
const waveFilter = ref('ALL')
const waveFilterId = useId()
const rows = ref<AdmissionDecisionRow[]>([])
const total = ref(0)
const counts = ref({ waiting: 0, accepted: 0, rejected: 0 })
const page = ref(1)
const pageSize = ref(10)
const loading = ref(false)
let latestRequest = 0
const listError = ref<string | null>(null)

const selected = ref<string[]>([])
const actionKind = ref<ActionKind | null>(null)
const actionRow = ref<AdmissionDecisionRow | null>(null)
const note = ref('')
const noteError = ref('')
const dialogId = useId()
const acting = ref(false)
const manyResult = ref<{
  accepted: number
  skipped: { name: string; reason: string }[]
} | null>(null)

const TABS: {
  value: DecisionTab
  label: string
  count: () => number
  empty: string
}[] = [
  {
    value: 'waiting',
    label: 'Menunggu',
    count: () => counts.value.waiting,
    empty: 'Tidak ada pendaftar yang menunggu keputusan.',
  },
  {
    value: 'rejected',
    label: 'Ditolak',
    count: () => counts.value.rejected,
    empty: 'Belum ada pendaftar yang ditolak.',
  },
  {
    value: 'accepted',
    label: 'Diterima',
    count: () => counts.value.accepted,
    empty: 'Belum ada pendaftar yang diterima.',
  },
]

const emptyText = computed(
  () => TABS.find((item) => item.value === tab.value)?.empty ?? '',
)
const allSelected = computed(
  () =>
    rows.value.length > 0 &&
    rows.value.every((row) => selected.value.includes(row.applicationId)),
)
const reasonRequired = computed(
  () =>
    actionKind.value === 'reject' ||
    actionKind.value === 'cancel-acceptance' ||
    actionKind.value === 'cancel-rejection',
)
const DIALOG_TITLES: Record<ActionKind, string> = {
  accept: 'Terima pendaftar',
  reject: 'Tolak pendaftar',
  'accept-many': 'Terima pendaftar terpilih',
  'cancel-acceptance': 'Batalkan penerimaan',
  'cancel-rejection': 'Batalkan penolakan',
}

async function load(resetPage = true) {
  if (resetPage) page.value = 1
  const request = ++latestRequest
  loading.value = true
  const result = await decisionService.fetchQueue({
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
  const visible = new Set(rows.value.map((row) => row.applicationId))
  selected.value = selected.value.filter((id) => visible.has(id))
}

function goToPage(next: number) {
  page.value = next
  void load(false)
}

function changePageSize(size: number) {
  pageSize.value = size
  void load()
}

function toggle(applicationId: string, checked: boolean | 'indeterminate') {
  selected.value =
    checked === true
      ? [...new Set([...selected.value, applicationId])]
      : selected.value.filter((id) => id !== applicationId)
}

function toggleAll(checked: boolean | 'indeterminate') {
  selected.value =
    checked === true ? rows.value.map((row) => row.applicationId) : []
}

function open(kind: ActionKind, row: AdmissionDecisionRow | null = null) {
  actionKind.value = kind
  actionRow.value = row
  note.value = ''
  noteError.value = ''
}

function close() {
  actionKind.value = null
  actionRow.value = null
}

async function submit() {
  const kind = actionKind.value
  if (!kind) return
  const text = note.value.trim()
  if (reasonRequired.value && !text) {
    noteError.value = 'Alasan wajib diisi'
    return
  }
  acting.value = true
  const id = actionRow.value?.applicationId ?? ''
  let success = false
  if (kind === 'accept') {
    success = (await decisionService.accept(id, text)).success
  } else if (kind === 'reject') {
    success = (await decisionService.reject(id, text)).success
  } else if (kind === 'cancel-acceptance') {
    success = (await decisionService.cancelAcceptance(id, text)).success
  } else if (kind === 'cancel-rejection') {
    success = (await decisionService.cancelRejection(id, text)).success
  } else {
    const names = new Map(
      rows.value.map((row) => [row.applicationId, row.applicantName]),
    )
    const result = await decisionService.acceptMany(selected.value, text)
    if (result.success) {
      success = true
      selected.value = []
      manyResult.value = {
        accepted: result.accepted,
        skipped: result.skipped.map((item) => ({
          name: names.get(item.applicationId) ?? item.applicationId,
          reason: item.reason,
        })),
      }
    }
  }
  acting.value = false
  if (!success) return
  close()
  if (kind !== 'accept-many') manyResult.value = null
  await load(false)
}

watch([tab, debouncedSearch, waveFilter], () => {
  selected.value = []
  manyResult.value = null
  void load()
})

const columns = computed<ColumnDef<AdmissionDecisionRow>[]>(() => {
  const isWaiting = tab.value === 'waiting'

  const selectCol: ColumnDef<AdmissionDecisionRow>[] =
    canDecide.value && isWaiting
      ? [
          {
            id: 'select',
            header: () =>
              h(Checkbox, {
                modelValue: allSelected.value,
                'aria-label': 'Pilih semua',
                'onUpdate:modelValue': toggleAll,
              }),
            cell: ({ row }: { row: { original: AdmissionDecisionRow } }) =>
              h(Checkbox, {
                modelValue: selected.value.includes(row.original.applicationId),
                'aria-label': `Pilih ${row.original.applicantName}`,
                'onUpdate:modelValue': (checked: boolean | 'indeterminate') =>
                  toggle(row.original.applicationId, checked === true),
              }),
            meta: { align: 'left' },
            enableSorting: false,
          },
        ]
      : []

  const baseCols: ColumnDef<AdmissionDecisionRow>[] = [
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
  ]

  const middleCols: ColumnDef<AdmissionDecisionRow>[] = isWaiting
    ? [
        {
          id: 'verifiedAt',
          header: 'Tgl Verifikasi',
          meta: { align: 'center' },
          cell: ({ row }) =>
            row.original.verifiedAt ? formatDate(row.original.verifiedAt) : '-',
        },
      ]
    : [
        {
          id: 'decisionNote',
          header: 'Catatan Keputusan',
          meta: { align: 'left' },
          cell: ({ row }) => row.original.decisionNote || '-',
        },
        {
          id: 'decidedAt',
          header: 'Diputuskan',
          meta: { align: 'center' },
          cell: ({ row }) =>
            row.original.decidedAt ? formatDate(row.original.decidedAt) : '-',
        },
      ]

  const actionCol: ColumnDef<AdmissionDecisionRow> = {
    id: 'actions',
    header: 'Aksi',
    meta: { align: 'center' },
    cell: ({ row }) =>
      h(ActionCell, {
        viewLabel: 'Lihat detail',
        manageLabel: canDecide.value && isWaiting ? 'Terima' : undefined,
        editLabel:
          canDecide.value && isWaiting
            ? 'Tolak'
            : canDecide.value && row.original.status === 'ACCEPTED'
              ? 'Batalkan penerimaan'
              : canDecide.value && row.original.status === 'REJECTED'
                ? 'Batalkan penolakan'
                : undefined,
        hideEdit: !(
          canDecide.value &&
          (isWaiting ||
            row.original.status === 'ACCEPTED' ||
            row.original.status === 'REJECTED')
        ),
        hideDelete: true,
        onView: () =>
          router.push(`/admin/applicants/${row.original.applicationId}`),
        onManage: () => open('accept', row.original),
        onEdit: () => {
          if (isWaiting) open('reject', row.original)
          else if (row.original.status === 'ACCEPTED')
            open('cancel-acceptance', row.original)
          else if (row.original.status === 'REJECTED')
            open('cancel-rejection', row.original)
        },
      }),
    enableSorting: false,
  }

  return [...selectCol, ...baseCols, ...middleCols, actionCol]
})

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
                v-if="manyResult"
                data-test="many-result"
                class="space-y-1 rounded-md border p-3 text-[length:var(--text-control,0.75rem)]"
              >
                <p class="font-medium">
                  {{ manyResult.accepted }} diterima,
                  {{ manyResult.skipped.length }}
                  dilewati.
                </p>
                <ul
                  v-if="manyResult.skipped.length"
                  class="list-disc pl-5"
                >
                  <li
                    v-for="item in manyResult.skipped"
                    :key="item.name"
                  >
                    {{ item.name }}: {{ item.reason }}
                  </li>
                </ul>
              </div>

              <div
                v-if="canDecide && tab === 'waiting' && rows.length"
                class="flex flex-wrap items-center justify-between gap-2 md:hidden"
              >
                <label
                  data-test="select-all"
                  class="flex min-h-11 items-center gap-2 text-[length:var(--text-control,0.75rem)] sm:min-h-0"
                >
                  <Checkbox
                    :model-value="allSelected"
                    aria-label="Pilih semua"
                    @update:model-value="toggleAll"
                  />
                  Pilih semua di halaman ini
                </label>
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
                  Memuat antrean keputusan…
                </p>
                <p
                  v-else-if="!rows.length"
                  class="rounded-md border p-4 text-center text-[length:var(--text-control,0.75rem)] text-muted-foreground"
                >
                  {{ emptyText }}
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

                  <div
                    v-if="canDecide && tab === 'waiting' && selected.length"
                    data-test="selection-bar"
                    class="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/20 p-3 sm:px-4"
                  >
                    <span
                      class="text-[length:var(--text-control,0.75rem)] font-medium"
                      >{{ selected.length }} dipilih</span
                    >
                    <Button
                      :disabled="acting"
                      @click="open('accept-many')"
                    >
                      Terima terpilih
                    </Button>
                  </div>
                </template>
              </template>
            </CardContent>
          </Card>
        </Tabs>
      </div>
    </Card>

    <Dialog
      :open="actionKind !== null"
      @update:open="(isOpen) => !isOpen && close()"
    >
      <DialogContent size="md">
        <DialogHeader standard>
          <DialogTitle>{{
            actionKind ? DIALOG_TITLES[actionKind] : ''
          }}</DialogTitle>
          <DialogDescription class="sr-only">
            {{ actionKind ? DIALOG_TITLES[actionKind] : '' }}
          </DialogDescription>
        </DialogHeader>
        <form
          data-test="action-form"
          class="flex flex-1 flex-col justify-between"
          @submit.prevent="submit"
        >
          <div class="min-h-0 flex-1 overflow-y-auto space-y-4 dialog-body">
            <FloatingLabelField
              :label="reasonRequired ? 'Alasan' : 'Catatan (opsional)'"
              :for="`${dialogId}-note`"
              :error="noteError"
              floating
            >
              <Textarea
                :id="`${dialogId}-note`"
                v-model="note"
                rows="3"
                maxlength="1000"
                :aria-label="reasonRequired ? 'Alasan' : 'Catatan (opsional)'"
                placeholder=" "
              />
            </FloatingLabelField>
            <p
              v-if="noteError"
              class="text-xs text-destructive"
            >
              {{ noteError }}
            </p>
          </div>
          <DialogFooter
            standard
            class="justify-between"
          >
            <Button
              type="button"
              variant="outline"
              :disabled="acting"
              @click="close"
            >
              Batal
            </Button>
            <Button
              type="submit"
              :disabled="acting"
            >
              {{ acting ? 'Menyimpan…' : 'Simpan' }}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  </div>
</template>
