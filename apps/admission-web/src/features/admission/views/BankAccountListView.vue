<script setup lang="ts">
import { computed, h, onMounted, ref, useId } from 'vue'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { DataTable, ActionCell, SearchInput } from '@mts241alikhlash/ui'
import { Button } from '@mts241alikhlash/ui/button'
import { Card } from '@mts241alikhlash/ui/card'
import { Badge } from '@mts241alikhlash/ui/badge'
import { Input } from '@mts241alikhlash/ui/input'
import { FloatingLabelField, FormControl } from '@mts241alikhlash/ui/form'
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
import { Plus } from '@lucide/vue'
import type { ColumnDef } from '@tanstack/vue-table'
import FloatingField from '../components/AdmissionField.vue'
import { bankAccountSchema } from '../schemas/applicationFormSchemas'
import { bankAccountService } from '../services/bankAccountService'
import type { AdmissionBankAccount, BankAccountSavePayload } from '../types'
import { vDigits } from '../vDigits'

const accounts = ref<AdmissionBankAccount[]>([])
const loading = ref(false)
const listError = ref<string | null>(null)
const isSaving = ref(false)
const isFormOpen = ref(false)
const editing = ref<AdmissionBankAccount | null>(null)
const pendingDelete = ref<AdmissionBankAccount | null>(null)
const search = ref('')
const statusFilter = ref('ALL')
const statusFilterId = useId()
const filteredAccounts = computed(() => {
  const keyword = search.value.trim().toLocaleLowerCase('id')
  return accounts.value.filter(
    (account) =>
      (statusFilter.value === 'ALL' ||
        String(account.isActive) === statusFilter.value) &&
      [account.bankName, account.accountNumber, account.accountHolder].some(
        (value) => value.toLocaleLowerCase('id').includes(keyword),
      ),
  )
})

const { handleSubmit, resetForm } = useForm<BankAccountSavePayload>({
  validationSchema: toTypedSchema(bankAccountSchema),
})

const columns = computed<ColumnDef<AdmissionBankAccount>[]>(() => [
  {
    id: 'no',
    header: 'No',
    cell: ({ row }) => row.index + 1,
    enableSorting: false,
  },
  { accessorKey: 'bankName', header: 'Bank', meta: { strong: true } },
  { accessorKey: 'accountNumber', header: 'No. Rekening' },
  { accessorKey: 'accountHolder', header: 'Atas Nama' },
  {
    id: 'isActive',
    header: 'Status',
    meta: {
      align: 'center',
      mobileValue: (row: AdmissionBankAccount) =>
        row.isActive ? 'Aktif' : 'Nonaktif',
    },
    cell: ({ row }) =>
      h(
        Badge,
        { variant: row.original.isActive ? 'default' : 'secondary' },
        () => (row.original.isActive ? 'Aktif' : 'Nonaktif'),
      ),
  },
  {
    id: 'actions',
    header: 'Aksi',
    cell: ({ row }) =>
      h(ActionCell, {
        onEdit: () => openForm(row.original),
        onDelete: () => {
          pendingDelete.value = row.original
        },
      }),
    enableSorting: false,
  },
])

async function load() {
  loading.value = true
  const result = await bankAccountService.fetchAll()
  listError.value = 'error' in result ? result.error : null
  accounts.value = 'accounts' in result ? result.accounts : []
  loading.value = false
}

function openForm(account: AdmissionBankAccount | null) {
  editing.value = account
  resetForm({
    values: {
      bankName: account?.bankName ?? '',
      accountNumber: account?.accountNumber ?? '',
      accountHolder: account?.accountHolder ?? '',
      isActive: account?.isActive ?? true,
    },
  })
  isFormOpen.value = true
}

const save = handleSubmit(async (payload) => {
  isSaving.value = true
  const result = await bankAccountService.save(
    editing.value?.id ?? null,
    payload,
  )
  isSaving.value = false
  if (!result.success) return
  isFormOpen.value = false
  await load()
})

async function confirmDelete() {
  if (!pendingDelete.value) return
  const result = await bankAccountService.remove(pendingDelete.value.id)
  pendingDelete.value = null
  if (result.success) await load()
}

onMounted(load)
</script>

<template>
  <div class="px-4 pb-4 pt-1 sm:px-6 sm:pb-6 sm:pt-2">
    <Card
      gap="none"
      class="overflow-visible rounded-none border-0 bg-transparent shadow-none ring-0"
    >
      <div class="space-y-4 p-0 sm:px-0">
        <div
          class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"
        >
          <FloatingLabelField
            label="Status"
            :for="statusFilterId"
            class="w-full sm:w-48"
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
                <SelectItem value="true">Aktif</SelectItem>
                <SelectItem value="false">Nonaktif</SelectItem>
              </SelectContent>
            </Select>
          </FloatingLabelField>
          <SearchInput
            v-model="search"
            class="md:hidden"
            label="Cari rekening"
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
          <DataTable
            mobile="cards"
            :columns="columns"
            :data="filteredAccounts"
            :total-items="filteredAccounts.length"
            :is-loading="loading"
            item-label="rekening"
            hide-per-page
            hide-pagination
          >
            <template #header-left>
              <Button
                class="shrink-0"
                @click="openForm(null)"
              >
                <Plus class="mr-1.5 size-4" />
                Tambah
              </Button>
            </template>
            <template #header-right>
              <SearchInput
                v-model="search"
                class="sm:w-40"
                label="Cari rekening"
              />
            </template>
          </DataTable>
        </template>
      </div>
    </Card>

    <Dialog v-model:open="isFormOpen">
      <DialogContent size="md">
        <DialogHeader standard>
          <DialogTitle>
            {{ editing ? 'Ubah Rekening' : 'Tambah Rekening' }}
          </DialogTitle>
          <DialogDescription class="sr-only">
            Pendaftar mentransfer biaya pendaftaran ke rekening ini.
          </DialogDescription>
        </DialogHeader>
        <div class="min-h-0 flex-1 overflow-y-auto">
          <form
            id="bank-account-form"
            class="space-y-4 dialog-body"
            @submit.prevent="save"
          >
            <FloatingField
              v-slot="{ componentField }"
              name="bankName"
              label="Nama Bank"
              required
            >
              <FormControl>
                <Input
                  v-bind="componentField"
                  maxlength="100"
                />
              </FormControl>
            </FloatingField>
            <FloatingField
              v-slot="{ componentField }"
              name="accountNumber"
              label="Nomor Rekening"
              required
            >
              <FormControl>
                <Input
                  v-digits
                  v-bind="componentField"
                  inputmode="numeric"
                  maxlength="30"
                />
              </FormControl>
            </FloatingField>
            <FloatingField
              v-slot="{ componentField }"
              name="accountHolder"
              label="Atas Nama"
              required
            >
              <FormControl>
                <Input
                  v-bind="componentField"
                  maxlength="100"
                />
              </FormControl>
            </FloatingField>
            <FloatingField
              v-slot="{ value, handleChange }"
              name="isActive"
              label="Status Rekening"
              required
            >
              <Select
                :model-value="String(value)"
                :disabled="isSaving"
                @update:model-value="handleChange($event === 'true')"
              >
                <FormControl>
                  <SelectTrigger class="w-full">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="true"> Aktif </SelectItem>
                  <SelectItem value="false"> Nonaktif </SelectItem>
                </SelectContent>
              </Select>
            </FloatingField>
          </form>
        </div>
        <DialogFooter
          standard
          class="justify-between"
        >
          <Button
            type="button"
            variant="outline"
            :disabled="isSaving"
            @click="isFormOpen = false"
          >
            Batal
          </Button>
          <Button
            type="submit"
            form="bank-account-form"
            :disabled="isSaving"
          >
            {{ isSaving ? 'Menyimpan…' : 'Simpan' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <AlertDialog
      :open="pendingDelete !== null"
      @update:open="
        (open) => {
          if (!open) pendingDelete = null
        }
      "
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Hapus rekening?</AlertDialogTitle>
          <AlertDialogDescription>
            Rekening tidak lagi tampil untuk pendaftar. Pembayaran yang sudah
            memilihnya tetap mencatatnya.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Batal</AlertDialogCancel>
          <AlertDialogAction @click="confirmDelete">Hapus</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>
