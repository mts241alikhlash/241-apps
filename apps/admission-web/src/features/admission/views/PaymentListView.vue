<script setup lang="ts">
import { computed, h, onMounted, ref, useId, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { refDebounced } from '@vueuse/core'
import { storeToRefs } from 'pinia'
import type { ColumnDef } from '@tanstack/vue-table'
import { ActionCell, DataTable, SearchInput } from '@mts241alikhlash/ui'
import { Button } from '@mts241alikhlash/ui/button'
import { Badge } from '@mts241alikhlash/ui/badge'
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
import { Plus } from '@lucide/vue'
import { useRoleGuard } from '@/features/platform/auth'
import FilePreviewDialog from '../components/FilePreviewDialog.vue'
import { useFilePreview } from '../composables/useFilePreview'
import { applicationService } from '../services/applicationService'
import { paymentQueueService } from '../services/paymentQueueService'
import { useApplicationStore } from '../stores/applicationStore'
import {
  PAYMENT_STATUS_LABELS,
  type AdmissionPaymentQueueRow,
  type PaymentQueueStatus,
} from '../types'
import { formatDate, formatIDR, PAYMENT_STATUS_BADGE_VARIANTS } from '../utils'

const route = useRoute()
const router = useRouter()
const { can } = useRoleGuard()
const preview = useFilePreview()
const canVerify = computed(() => can('admission-payments.verify'))
const canCreate = computed(() => can('admission-payments.create'))
const { waves } = storeToRefs(useApplicationStore())

const tab = ref<PaymentQueueStatus>('PENDING')
const search = ref('')
const debouncedSearch = refDebounced(search, 300)
const waveFilter = ref('ALL')
const waveFilterId = useId()
const rows = ref<AdmissionPaymentQueueRow[]>([])
const total = ref(0)
const counts = ref({ pending: 0, verified: 0, rejected: 0 })
const page = ref(1)
const pageSize = ref(10)
const loading = ref(false)
let latestRequest = 0
const listError = ref<string | null>(null)

const dialogId = useId()

const reasonKind = ref<'reject' | 'cancel' | null>(null)
const reasonRow = ref<AdmissionPaymentQueueRow | null>(null)
const reason = ref('')
const reasonError = ref('')
const acting = ref(false)

const TABS: {
  value: PaymentQueueStatus
  label: string
  count: () => number
}[] = [
  { value: 'PENDING', label: 'Menunggu', count: () => counts.value.pending },
  { value: 'REJECTED', label: 'Ditolak', count: () => counts.value.rejected },
  {
    value: 'VERIFIED',
    label: 'Terverifikasi',
    count: () => counts.value.verified,
  },
]

async function load(resetPage = true) {
  if (resetPage) page.value = 1
  const request = ++latestRequest
  loading.value = true
  const result = await paymentQueueService.fetchQueue({
    status: tab.value,
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

async function verify(row: AdmissionPaymentQueueRow) {
  acting.value = true
  const result = await paymentQueueService.verify(row.applicationId)
  acting.value = false
  if (result.success) await load(false)
}

function openReason(kind: 'reject' | 'cancel', row: AdmissionPaymentQueueRow) {
  reasonKind.value = kind
  reasonRow.value = row
  reason.value = ''
  reasonError.value = ''
}

async function submitReason() {
  const row = reasonRow.value
  if (!row || !reasonKind.value) return
  if (!reason.value.trim()) {
    reasonError.value = 'Alasan wajib diisi'
    return
  }
  acting.value = true
  const note = reason.value.trim()
  const result =
    reasonKind.value === 'reject'
      ? await paymentQueueService.reject(row.applicationId, note)
      : await paymentQueueService.cancel(row.applicationId, note)
  acting.value = false
  if (!result.success) return
  reasonKind.value = null
  await load(false)
}

function openAdd(applicationId: string | null) {
  void router.push({
    name: 'admin-payment-new',
    query: applicationId ? { applicationId } : undefined,
  })
}

watch([tab, debouncedSearch, waveFilter], () => load())

const columns = computed<ColumnDef<AdmissionPaymentQueueRow>[]>(() => [
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
    id: 'status',
    size: 110,
    header: 'Status',
    meta: {
      align: 'center',
      mobileValue: (row: AdmissionPaymentQueueRow) =>
        PAYMENT_STATUS_LABELS[row.status],
    },
    cell: ({ row }) =>
      h(
        Badge,
        { variant: PAYMENT_STATUS_BADGE_VARIANTS[row.original.status] },
        () => PAYMENT_STATUS_LABELS[row.original.status],
      ),
  },
  {
    id: 'amount',
    header: 'Jumlah',
    meta: { align: 'center' },
    cell: ({ row }) => formatIDR(row.original.amount),
  },
  {
    id: 'sender',
    header: 'Pengirim',
    meta: { align: 'left' },
    cell: ({ row }) => {
      const name = row.original.senderAccountName ?? '-'
      return row.original.bankName ? `${name} (${row.original.bankName})` : name
    },
  },
  {
    id: 'transferDate',
    header: 'Tanggal',
    meta: { align: 'center' },
    cell: ({ row }) =>
      row.original.transferDate ? formatDate(row.original.transferDate) : '-',
  },
  {
    id: 'actions',
    size: 60,
    header: 'Aksi',
    meta: { align: 'center' },
    cell: ({ row }) => {
      const isPending = row.original.status === 'PENDING'
      const isVerified = row.original.status === 'VERIFIED'
      return h(ActionCell, {
        viewLabel: row.original.proofFile ? 'Lihat bukti' : undefined,
        manageLabel: canVerify.value && isPending ? 'Verifikasi' : undefined,
        editLabel:
          canVerify.value && isPending
            ? 'Tolak'
            : canVerify.value && isVerified
              ? 'Batalkan verifikasi'
              : undefined,
        hideEdit: !(canVerify.value && (isPending || isVerified)),
        hideDelete: true,
        onView: () =>
          row.original.proofFile && preview.show(row.original.proofFile),
        onManage: () => verify(row.original),
        onEdit: () => {
          if (isPending) openReason('reject', row.original)
          else if (isVerified) openReason('cancel', row.original)
        },
      })
    },
    enableSorting: false,
  },
])

onMounted(async () => {
  await applicationService.fetchWaves()
  await load()
  const fromRoute = route.query.applicationId
  if (typeof fromRoute === 'string' && canCreate.value) openAdd(fromRoute)
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
        class="justify-end min-h-0 border-b-0 bg-transparent px-0 pt-0 pb-3 sm:px-0"
      >
        <Button
          v-if="canCreate"
          class="w-full sm:w-auto"
          @click="openAdd(null)"
        >
          <Plus class="mr-1.5 size-4" />
          Tambah
        </Button>
      </CardHeader>

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
                  Memuat pembayaran…
                </p>
                <p
                  v-else-if="!rows.length"
                  class="rounded-md border p-4 text-center text-[length:var(--text-control,0.75rem)] text-muted-foreground"
                >
                  Tidak ada pembayaran.
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
                    item-label="pembayaran"
                    :pinned-columns="{ right: ['status', 'actions'] }"
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

    <Dialog
      :open="reasonKind !== null"
      @update:open="(open) => !open && (reasonKind = null)"
    >
      <DialogContent size="md">
        <DialogHeader standard>
          <DialogTitle>
            {{
              reasonKind === 'cancel'
                ? 'Batalkan Verifikasi Pembayaran'
                : 'Tolak Bukti Pembayaran'
            }}
          </DialogTitle>
          <DialogDescription class="sr-only">
            {{
              reasonKind === 'cancel'
                ? 'Pembayaran kembali ke Menunggu dan pendaftar diberi tahu.'
                : 'Pendaftar diminta mengunggah ulang bukti yang sesuai.'
            }}
          </DialogDescription>
        </DialogHeader>
        <form
          data-test="reason-form"
          class="flex flex-1 flex-col justify-between"
          @submit.prevent="submitReason"
        >
          <div class="min-h-0 flex-1 overflow-y-auto space-y-4 dialog-body">
            <FloatingLabelField
              :label="
                reasonKind === 'cancel'
                  ? 'Alasan Pembatalan'
                  : 'Alasan Penolakan'
              "
              :for="`${dialogId}-reason`"
              :error="reasonError"
              floating
            >
              <Textarea
                :id="`${dialogId}-reason`"
                v-model="reason"
                rows="4"
                maxlength="500"
                aria-label="Alasan"
                placeholder=" "
              />
            </FloatingLabelField>
            <p
              v-if="reasonError"
              class="text-xs text-destructive"
            >
              {{ reasonError }}
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
              @click="reasonKind = null"
            >
              Batal
            </Button>
            <Button
              type="submit"
              variant="destructive"
              :disabled="acting"
            >
              {{
                acting
                  ? 'Memproses…'
                  : reasonKind === 'cancel'
                    ? 'Batalkan Verifikasi'
                    : 'Tolak'
              }}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <FilePreviewDialog
      v-model:open="preview.open.value"
      :file="preview.file.value"
    />
  </div>
</template>
