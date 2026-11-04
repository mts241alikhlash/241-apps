<script setup lang="ts">
import { computed, h, nextTick, onMounted, ref, useId, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { DataTable, ActionCell, SearchInput } from '@mts241alikhlash/ui'
import { Button } from '@mts241alikhlash/ui/button'
import { Badge } from '@mts241alikhlash/ui/badge'
import { Card } from '@mts241alikhlash/ui/card'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@mts241alikhlash/ui/dialog'
import { FloatingLabelField } from '@mts241alikhlash/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@mts241alikhlash/ui/select'
import type { ColumnDef } from '@tanstack/vue-table'
import { Filter, Plus } from '@lucide/vue'
import { useApplicationList } from '../composables/useApplicationList'
import { useAdminRegistration } from '../composables/useAdminRegistration'
import { usePublicAdmission } from '../composables/usePublicAdmission'
import { publicAdmissionService } from '../services/publicAdmissionService'
import { useApplicationStore } from '../stores/applicationStore'
import { useAuthSession } from '@/features/platform/auth'
import StatusBadge from '../components/StatusBadge.vue'
import RegisterApplicantDialog from '../components/RegisterApplicantDialog.vue'
import ApplicantCredentialsDialog from '../components/ApplicantCredentialsDialog.vue'
import type {
  ActiveWave,
  AdmissionGrade,
  AdmissionApplicationListItem,
  AdmissionStatus,
} from '../types'
import { PAYMENT_STATUS_LABELS, STATUS_LABELS } from '../types'
import { formatDateTime, PAYMENT_STATUS_BADGE_VARIANTS } from '../utils'

const router = useRouter()
const route = useRoute()
const { user } = useAuthSession()
const applicationStore = useApplicationStore()
if (applicationStore.listContext.ownerId !== user.value?.id)
  applicationStore.resetListContext()
const returning = applicationStore.listContext.returning
const savedContext = { ...applicationStore.listContext }
let restored = false
const requestedPage =
  typeof route.query.page === 'string' &&
  /^[1-9]\d*$/.test(route.query.page) &&
  Number.isSafeInteger(Number(route.query.page))
    ? Number(route.query.page)
    : 1

const searchQuery = ref(returning ? savedContext.search : '')
const statusFilter = ref<'ALL' | AdmissionStatus>(
  returning && savedContext.status in STATUS_LABELS
    ? (savedContext.status as AdmissionStatus)
    : typeof route.query.status === 'string' &&
        route.query.status in STATUS_LABELS
      ? (route.query.status as AdmissionStatus)
      : 'ALL',
)
const waveFilter = ref<string>(
  returning
    ? savedContext.waveId
    : typeof route.query.wave === 'string'
      ? route.query.wave
      : 'ALL',
)
const statusFilterId = useId()
const waveFilterId = useId()
const mobileStatusFilterId = useId()
const mobileWaveFilterId = useId()
const page = ref(returning ? savedContext.page : requestedPage)
const pageSize = ref(10)
const listStart = ref<HTMLElement | null>(null)
const filterOpen = ref(false)
const activeFiltersCount = computed(
  () =>
    Number(statusFilter.value !== 'ALL') + Number(waveFilter.value !== 'ALL'),
)

const {
  applications,
  waves,
  totalItems,
  loading,
  listError,
  filtersPending,
  refresh,
  fetchWaves,
} = useApplicationList(searchQuery, statusFilter, waveFilter, page, pageSize)

watch(
  [searchQuery, statusFilter, waveFilter],
  () => {
    page.value = 1
  },
  { flush: 'sync' },
)

watch([totalItems, loading, filtersPending], () => {
  if (loading.value || filtersPending.value) return
  const lastPage = Math.max(1, Math.ceil(totalItems.value / pageSize.value))
  if (page.value > lastPage) page.value = lastPage
})

async function goToPage(next: number) {
  page.value = next
  await nextTick()
  listStart.value?.scrollIntoView({ block: 'start', behavior: 'auto' })
}

function changePageSize(size: number) {
  pageSize.value = size
  page.value = 1
}

function resetFilters() {
  statusFilter.value = 'ALL'
  waveFilter.value = 'ALL'
}
function resetAllFilters() {
  resetFilters()
  searchQuery.value = ''
}
function saveListContext() {
  applicationStore.listContext = {
    ownerId: user.value?.id ?? null,
    search: searchQuery.value,
    status: statusFilter.value,
    waveId: waveFilter.value,
    page: page.value,
    scrollTop: listStart.value?.closest('[data-app-scroll]')?.scrollTop ?? 0,
    returning: true,
  }
}
watch(
  () => user.value?.id,
  (id) => {
    if (applicationStore.listContext.ownerId !== id)
      applicationStore.resetListContext()
  },
)

async function restoreListContext() {
  if (restored || loading.value || filtersPending.value) return
  restored = true
  if (!returning) return
  await nextTick()
  const container = listStart.value?.closest('[data-app-scroll]')
  if (container && typeof container.scrollTo === 'function') {
    container.scrollTo({ top: savedContext.scrollTop, behavior: 'auto' })
  }
  applicationStore.listContext.returning = false
}
const { fetchActiveWaves } = usePublicAdmission()

const registerOpen = ref(false)
const credentialsOpen = ref(false)
const isRegistering = ref(false)
const registerError = ref<string | null>(null)
const activeWaves = ref<ActiveWave[]>([])
const grades = ref<AdmissionGrade[]>([])

const {
  applicationId,
  credentials,
  registerApplicant,
  clearCredentials,
  reset,
} = useAdminRegistration()

const columns = computed<ColumnDef<AdmissionApplicationListItem>[]>(() => [
  {
    id: 'no',
    header: 'No',
    cell: ({ row }) => row.index + 1,
    enableSorting: false,
  },
  {
    accessorKey: 'registrationNumber',
    header: 'No. Pendaftaran',
    meta: { align: 'center' },
  },
  {
    accessorKey: 'fullName',
    header: 'Nama',
    meta: { align: 'left', strong: true },
  },
  {
    id: 'wave',
    header: 'Gelombang',
    meta: { align: 'center', mobile: 'hide' },
    cell: ({ row }) => row.original.wave?.code ?? '-',
  },
  {
    id: 'status',
    header: 'Status',
    meta: {
      align: 'center',
      mobileLabel: 'Pendaftaran',
      mobileValue: (row: AdmissionApplicationListItem) =>
        STATUS_LABELS[row.status],
    },
    cell: ({ row }) => h(StatusBadge, { status: row.original.status }),
  },
  {
    id: 'payment',
    header: 'Pembayaran',
    meta: {
      align: 'center',
      mobileValue: (row: AdmissionApplicationListItem) =>
        row.payment ? PAYMENT_STATUS_LABELS[row.payment.status] : '-',
    },
    cell: ({ row }) => {
      const status = row.original.payment?.status
      return status
        ? h(
            Badge,
            { variant: PAYMENT_STATUS_BADGE_VARIANTS[status] },
            () => PAYMENT_STATUS_LABELS[status],
          )
        : '-'
    },
  },
  {
    id: 'submittedAt',
    header: 'Dikirim',
    meta: { mobile: 'hide' },
    cell: ({ row }) => formatDateTime(row.original.submittedAt),
  },
  {
    id: 'actions',
    header: 'Aksi',
    cell: ({ row }) =>
      h(ActionCell, {
        viewLabel: 'Lihat detail',
        hideEdit: true,
        hideDelete: true,
        onView: () => {
          saveListContext()
          void router.push(`/admin/applicants/${row.original.id}`)
        },
      }),
    enableSorting: false,
  },
])

onMounted(() => {
  void fetchWaves()
})
watch(
  [loading, filtersPending],
  () => {
    void restoreListContext()
  },
  { immediate: true },
)

function openApplicant(item: AdmissionApplicationListItem) {
  saveListContext()
  void router.push(`/admin/applicants/${item.id}`)
}

async function openRegister() {
  registerError.value = null
  isRegistering.value = false
  reset()
  if (activeWaves.value.length === 0) {
    const data = await fetchActiveWaves()
    activeWaves.value = data?.waves ?? []
  }
  if (grades.value.length === 0) {
    grades.value = (await publicAdmissionService.fetchGrades()) ?? []
  }
  registerOpen.value = true
}

async function handleRegister(payload: {
  fullName: string
  email: string
  phone?: string
  password: string
  passwordConfirm: string
  waveId: string
  admissionType: 'NEW' | 'TRANSFER'
  targetGradeId: string
}) {
  isRegistering.value = true
  registerError.value = null
  const result = await registerApplicant(payload)
  isRegistering.value = false
  if (result.success) {
    registerOpen.value = false
    credentialsOpen.value = true
    void refresh()
  } else {
    registerError.value = result.error ?? 'Gagal mendaftarkan pendaftar.'
  }
}

function closeCredentials() {
  credentialsOpen.value = false
  clearCredentials()
  reset()
}

function fillForm() {
  const id = applicationId.value
  closeCredentials()
  if (id) void router.push({ name: 'admin-application-form', params: { id } })
}
</script>

<template>
  <div class="px-4 pb-4 pt-1 sm:px-6 sm:pb-6 sm:pt-2">
    <Card
      gap="none"
      class="overflow-visible rounded-none border-0 bg-transparent shadow-none ring-0"
    >
      <div
        ref="listStart"
        class="space-y-4 p-0 sm:px-0"
      >
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
            @click="refresh()"
          >
            Coba lagi
          </Button>
        </div>
        <template v-else>
          <DataTable
            mobile="cards"
            row-clickable
            :columns="columns"
            :data="filtersPending ? [] : applications"
            :page="page"
            :page-size="pageSize"
            :total-items="totalItems"
            :is-loading="loading || filtersPending"
            item-label="pendaftar"
            @update:page="goToPage"
            @update:page-size="changePageSize"
            @row-click="openApplicant"
          >
            <template #header-left>
              <Button
                class="shrink-0"
                @click="openRegister"
              >
                <Plus class="mr-1.5 size-4" />
                Tambah
              </Button>
            </template>
            <template #header-right>
              <div
                class="flex items-end sm:gap-0 sm:[&>*:not(:first-child)]:-ml-px sm:[&>*:not(:first-child)_:is(button,input)]:rounded-l-none sm:[&>*:not(:last-child)_:is(button,input)]:rounded-r-none sm:[&>*:focus-within]:z-10"
              >
                <div
                  class="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-0 sm:[&>*:not(:first-child)]:-ml-px sm:[&>*:not(:first-child)_:is(button,input)]:rounded-l-none sm:[&>*:not(:last-child)_:is(button,input)]:rounded-r-none sm:[&>*:focus-within]:z-10"
                >
                  <FloatingLabelField
                    label="Status"
                    :for="statusFilterId"
                    class="w-fit min-w-28"
                    floating
                  >
                    <Select v-model="statusFilter">
                      <SelectTrigger
                        :id="statusFilterId"
                        class="w-full"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">Semua</SelectItem>
                        <SelectItem
                          v-for="(label, status) in STATUS_LABELS"
                          :key="status"
                          :value="status"
                        >
                          {{ label }}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </FloatingLabelField>
                  <FloatingLabelField
                    label="Gelombang"
                    :for="waveFilterId"
                    class="w-fit min-w-28"
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
                </div>
                <SearchInput
                  v-model="searchQuery"
                  class="sm:w-40"
                  label="Cari pendaftar"
                />
              </div>
            </template>

            <template #mobile-toolbar>
              <SearchInput
                v-model="searchQuery"
                label="Cari pendaftar"
                class="w-full"
              />
            </template>
            <template #mobile-filter>
              <Button
                variant="outline"
                class="relative shrink-0"
                @click="filterOpen = true"
              >
                <Filter class="mr-1.5 size-4" />
                Filter
                <span
                  v-if="activeFiltersCount"
                  class="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground"
                >
                  {{ activeFiltersCount }}
                </span>
              </Button>
            </template>
            <template #mobile-chips>
              <div
                v-if="activeFiltersCount"
                class="flex flex-wrap gap-2 text-[length:var(--text-control,0.75rem)]"
              >
                <Button
                  v-if="statusFilter !== 'ALL'"
                  variant="outline"
                  @click="statusFilter = 'ALL'"
                >
                  Hapus filter status: {{ STATUS_LABELS[statusFilter] }}
                </Button>
                <Button
                  v-if="waveFilter !== 'ALL'"
                  variant="outline"
                  @click="waveFilter = 'ALL'"
                >
                  Hapus filter gelombang:
                  {{
                    waves.find((wave) => wave.id === waveFilter)?.name ??
                    waveFilter
                  }}
                </Button>
              </div>
            </template>
            <template #empty>
              <div class="space-y-3">
                <p>
                  {{
                    activeFiltersCount || searchQuery
                      ? 'Tidak ada pendaftar yang cocok dengan filter.'
                      : 'Tidak ada data.'
                  }}
                </p>
                <Button
                  v-if="activeFiltersCount || searchQuery"
                  variant="outline"
                  @click="resetAllFilters"
                  >Atur Ulang</Button
                >
              </div>
            </template>
          </DataTable>
        </template>
      </div>
    </Card>

    <Dialog v-model:open="filterOpen">
      <DialogContent size="md">
        <DialogHeader standard>
          <DialogTitle>Filter Pendaftar</DialogTitle>
          <DialogDescription class="sr-only">
            Pilih status dan gelombang pendaftaran.
          </DialogDescription>
        </DialogHeader>
        <DialogBody class="space-y-4">
          <FloatingLabelField
            label="Status"
            :for="mobileStatusFilterId"
            floating
          >
            <Select v-model="statusFilter">
              <SelectTrigger
                :id="mobileStatusFilterId"
                class="w-full"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Semua</SelectItem>
                <SelectItem
                  v-for="(label, status) in STATUS_LABELS"
                  :key="status"
                  :value="status"
                >
                  {{ label }}
                </SelectItem>
              </SelectContent>
            </Select>
          </FloatingLabelField>
          <FloatingLabelField
            label="Gelombang"
            :for="mobileWaveFilterId"
            floating
          >
            <Select v-model="waveFilter">
              <SelectTrigger
                :id="mobileWaveFilterId"
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
        </DialogBody>
        <DialogFooter
          standard
          class="justify-between"
        >
          <Button
            variant="outline"
            @click="resetFilters"
          >
            Atur Ulang
          </Button>
          <Button @click="filterOpen = false"> Tutup </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <RegisterApplicantDialog
      v-model:open="registerOpen"
      :waves="activeWaves"
      :grades="grades"
      :is-submitting="isRegistering"
      :error-message="registerError"
      @submit="handleRegister"
    />

    <ApplicantCredentialsDialog
      :open="credentialsOpen"
      :credentials="credentials"
      @update:open="(open) => !open && closeCredentials()"
      @fill="fillForm"
    />
  </div>
</template>
