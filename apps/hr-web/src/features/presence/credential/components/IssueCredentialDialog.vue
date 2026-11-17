<script setup lang="ts">
import { lookupService } from '@/features/lookup'
import { getIndonesianErrorMessage } from '@mts241alikhlash/web-shared/utils/error-handler'
import { AppCombobox } from '@mts241alikhlash/ui'
import type { ComboboxOption } from '@mts241alikhlash/ui'
import { Button } from '@mts241alikhlash/ui/button'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@mts241alikhlash/ui/dialog'
import { Input } from '@mts241alikhlash/ui/input'
import { Label } from '@mts241alikhlash/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@mts241alikhlash/ui/select'
import { AlertTriangle, Check, Copy } from '@lucide/vue'
import { computed, ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import { credentialService } from '../services/credentialService'
import { useCredentialStore } from '../stores/credentialStore'
import type { PersonOption, PresenceSubjectType } from '../types'

const open = defineModel<boolean>('open', { required: true })

const store = useCredentialStore()
const userId = ref('')
const subjectType = ref<PresenceSubjectType>('STUDENT')
const copied = ref(false)
const personOptions = ref<PersonOption[]>([])
const loadingPersons = ref(false)

const comboboxOptions = computed<ComboboxOption[]>(() =>
  personOptions.value.map((person) => ({
    value: person.userId,
    label: person.name,
  })),
)

async function loadPersons() {
  loadingPersons.value = true
  personOptions.value = []
  try {
    personOptions.value =
      subjectType.value === 'STUDENT'
        ? await lookupService.listStudents()
        : await lookupService.listEmployees()
  } catch (error: unknown) {
    toast.error(getIndonesianErrorMessage(error, 'Gagal memuat data pengguna.'))
  } finally {
    loadingPersons.value = false
  }
}

watch(subjectType, () => {
  userId.value = ''
  if (open.value) {
    void loadPersons()
  }
})

watch(open, (isOpen) => {
  if (isOpen) {
    void loadPersons()
  } else {
    userId.value = ''
    subjectType.value = 'STUDENT'
    copied.value = false
    store.clearIssued()
  }
})

async function submit() {
  if (!userId.value) {
    toast.error('Pilih orang yang akan diberi kartu.')
    return
  }
  await credentialService.issue({
    userId: userId.value,
    subjectType: subjectType.value,
  })
}

async function copyCode() {
  if (!store.lastIssued) return
  await navigator.clipboard.writeText(store.lastIssued.code)
  copied.value = true
  toast.success('Kode disalin.')
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="sm:max-w-md flex flex-col gap-0 p-0 overflow-hidden">
      <DialogHeader standard>
        <DialogTitle>Terbitkan Kartu Presensi</DialogTitle>
        <DialogDescription />
      </DialogHeader>

      <DialogBody class="space-y-4">
        <div
          v-if="store.lastIssued"
          class="space-y-3"
        >
          <div
            class="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 p-3 text-xs text-warning"
          >
            <AlertTriangle class="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              Kode ini hanya ditampilkan sekali. Salin atau langsung cetak
              kartunya, setelah dialog ditutup, kode tidak bisa dilihat lagi.
            </p>
          </div>

          <div class="space-y-1.5">
            <Label>Kode Kartu Presensi</Label>
            <div class="flex gap-2">
              <Input
                :model-value="store.lastIssued.code"
                readonly
                class="tabular-nums"
              />
              <Button
                type="button"
                variant="outline"
                @click="copyCode"
              >
                <Check
                  v-if="copied"
                  class="h-4 w-4"
                />
                <Copy
                  v-else
                  class="h-4 w-4"
                />
              </Button>
            </div>
          </div>
        </div>

        <div
          v-else
          class="space-y-4"
        >
          <div class="space-y-1.5">
            <Label>Jenis Pemegang Kartu</Label>
            <Select v-model="subjectType">
              <SelectTrigger class="w-full">
                <SelectValue placeholder="Pilih jenis" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="STUDENT">Siswa</SelectItem>
                <SelectItem value="EMPLOYEE">Pegawai</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div class="space-y-1.5">
            <Label>Pemegang Kartu</Label>
            <AppCombobox
              v-model="userId"
              :options="comboboxOptions"
              :placeholder="
                loadingPersons
                  ? 'Memuat data...'
                  : subjectType === 'STUDENT'
                    ? 'Pilih siswa'
                    : 'Pilih pegawai'
              "
              :search-placeholder="
                subjectType === 'STUDENT'
                  ? 'Cari nama siswa...'
                  : 'Cari nama pegawai...'
              "
              empty-text="Data tidak ditemukan."
              :disabled="loadingPersons"
            />
          </div>
        </div>
      </DialogBody>

      <DialogFooter standard>
        <Button
          variant="outline"
          @click="open = false"
        >
          {{ store.lastIssued ? 'Selesai' : 'Batal' }}
        </Button>
        <Button
          v-if="!store.lastIssued"
          :disabled="store.isSaving || !userId || loadingPersons"
          @click="submit"
        >
          Terbitkan
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
