<script setup lang="ts">
import { DataTable } from '@mts241alikhlash/ui'
import { Button } from '@mts241alikhlash/ui/button'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@mts241alikhlash/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@mts241alikhlash/ui/dialog'
import { Input } from '@mts241alikhlash/ui/input'
import { Label } from '@mts241alikhlash/ui/label'
import { AlertTriangle, Check, Copy, Plus } from '@lucide/vue'
import { computed, onMounted, ref } from 'vue'
import { toast } from 'vue-sonner'
import { createDeviceColumns } from '../components/deviceColumns'
import {
  deviceService,
  devices,
  lastIssued,
  loading,
} from '../services/deviceService'
import type { GateDevice } from '../types'

const showForm = ref(false)
const name = ref('')
const location = ref('')
const copied = ref(false)

async function submit() {
  if (!name.value.trim()) {
    toast.error('Nama gerbang wajib diisi.')
    return
  }
  const registered = await deviceService.register({
    name: name.value.trim(),
    location: location.value.trim() || undefined,
  })
  if (registered) {
    name.value = ''
    location.value = ''
    showForm.value = false
  }
}

async function copyToken() {
  if (!lastIssued.value) return
  await navigator.clipboard.writeText(lastIssued.value.token)
  copied.value = true
  toast.success('Token disalin ke clipboard.')
}

function clearIssuedToken() {
  deviceService.clearIssued()
  copied.value = false
}

async function handleRotateToken(device: GateDevice) {
  const confirmed = window.confirm(
    `Terbitkan token baru untuk gerbang "${device.name}"?`,
  )
  if (confirmed) {
    await deviceService.rotate(device.id)
  }
}

const tableColumns = computed(() =>
  createDeviceColumns((device) => void handleRotateToken(device)),
)

onMounted(() => void deviceService.fetch())
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
        <CardTitle size="lg"> Perangkat Gerbang </CardTitle>
        <Button @click="showForm = true">
          <Plus class="mr-2 h-4 w-4" />
          Daftarkan Gerbang
        </Button>
      </CardHeader>

      <CardContent class="space-y-6 p-0 sm:px-0">
        <div
          v-if="lastIssued"
          class="space-y-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200"
        >
          <div class="flex items-start gap-2 text-xs md:text-sm font-medium">
            <AlertTriangle class="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              Token untuk
              <strong class="font-semibold">{{
                lastIssued.device.name
              }}</strong>
              hanya ditampilkan sekali. Masukkan ke kiosk sekarang. Jika hilang,
              terbitkan token baru.
            </p>
          </div>
          <div class="flex gap-2">
            <Input
              :model-value="lastIssued.token"
              readonly
              class="font-mono"
            />
            <Button
              variant="outline"
              type="button"
              @click="copyToken"
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
            <Button
              variant="outline"
              @click="clearIssuedToken"
            >
              Selesai
            </Button>
          </div>
        </div>

        <DataTable
          :columns="tableColumns"
          :data="devices"
          :is-loading="loading"
          item-label="perangkat gerbang"
        />
      </CardContent>
    </Card>
  </div>

  <Dialog v-model:open="showForm">
    <DialogContent class="sm:max-w-md flex flex-col gap-0 p-0 overflow-hidden">
      <DialogHeader class="px-6 py-5 border-b shrink-0 bg-muted/20">
        <DialogTitle>Daftarkan Perangkat Gerbang</DialogTitle>
        <DialogDescription class="sr-only" />
      </DialogHeader>

      <div class="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
        <div class="space-y-1.5">
          <Label for="device-name">Nama Gerbang</Label>
          <Input
            id="device-name"
            v-model="name"
            placeholder="Contoh: Gerbang Utama"
          />
        </div>

        <div class="space-y-1.5">
          <Label for="device-location">Lokasi</Label>
          <Input
            id="device-location"
            v-model="location"
            placeholder="Contoh: Depan, dekat pos satpam"
          />
        </div>
      </div>

      <DialogFooter
        class="px-6 py-4 border-t bg-muted/20 flex flex-row items-center justify-end gap-2 shrink-0"
      >
        <Button
          variant="outline"
          @click="showForm = false"
        >
          Batal
        </Button>
        <Button
          :disabled="!name.trim()"
          @click="submit"
        >
          Simpan
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
