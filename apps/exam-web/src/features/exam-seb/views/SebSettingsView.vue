<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { toast } from 'vue-sonner'
import { Plus, Trash2 } from '@lucide/vue'
import { Button } from '@mts241alikhlash/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@mts241alikhlash/ui/card'
import {
  Dialog,
  DialogBody,
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
import { Switch } from '@mts241alikhlash/ui/switch'
import { messageOf } from '@/features/exam-package/utils/messageOf'
import { isInSeb, readSebProof, SebOutdatedError } from '@/shared/seb'
import { examSebApi, type SebConfig } from '../api/examSebApi'

const OUTSIDE_SEB = 'Buka halaman ini dari Safe Exam Browser.'
const NO_MATCH = 'Tidak cocok dengan konfigurasi aktif mana pun.'
const OUTDATED = 'Perbarui Safe Exam Browser ke versi terbaru.'

const configs = ref<SebConfig[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

const addOpen = ref(false)
const saving = ref(false)
const formName = ref('')
const formKey = ref('')
const formFile = ref<File | null>(null)
const formError = ref<string | null>(null)

const deleteTarget = ref<SebConfig | null>(null)
const deleting = ref(false)

const testing = ref(false)
const testMessage = ref<string | null>(null)

async function load(): Promise<void> {
  loading.value = true
  error.value = null
  try {
    configs.value = await examSebApi.list()
  } catch (err: unknown) {
    error.value = messageOf(err, 'Gagal memuat konfigurasi Safe Exam Browser.')
  } finally {
    loading.value = false
  }
}

function openAdd(): void {
  formName.value = ''
  formKey.value = ''
  formFile.value = null
  formError.value = null
  addOpen.value = true
}

function onFileChange(event: Event): void {
  formFile.value = (event.target as HTMLInputElement).files?.[0] ?? null
}

async function submitAdd(): Promise<void> {
  if (saving.value) return
  if (!formName.value.trim() || !formKey.value.trim() || !formFile.value) {
    formError.value = 'Isi nama, kunci konfigurasi, dan berkas .seb.'
    return
  }
  saving.value = true
  formError.value = null
  try {
    const created = await examSebApi.create({
      name: formName.value.trim(),
      configKey: formKey.value.trim(),
      file: formFile.value,
    })
    configs.value = [...configs.value, created]
    addOpen.value = false
    toast.success(`Konfigurasi ${created.name} disimpan.`)
  } catch (err: unknown) {
    formError.value = messageOf(err, 'Konfigurasi gagal disimpan.')
  } finally {
    saving.value = false
  }
}

async function toggleActive(item: SebConfig, active: boolean): Promise<void> {
  try {
    const updated = await examSebApi.update(item.id, { active })
    configs.value = configs.value.map((row) =>
      row.id === item.id ? updated : row,
    )
  } catch (err: unknown) {
    toast.error(messageOf(err, 'Status konfigurasi gagal diubah.'))
  }
}

async function confirmDelete(): Promise<void> {
  const target = deleteTarget.value
  if (target === null || deleting.value) return
  deleting.value = true
  try {
    await examSebApi.remove(target.id)
    configs.value = configs.value.filter((row) => row.id !== target.id)
    deleteTarget.value = null
    toast.success(`Konfigurasi ${target.name} dihapus.`)
  } catch (err: unknown) {
    toast.error(messageOf(err, 'Konfigurasi gagal dihapus.'))
  } finally {
    deleting.value = false
  }
}

async function runTest(): Promise<void> {
  if (testing.value) return
  testing.value = true
  testMessage.value = null
  if (!isInSeb()) {
    testMessage.value = OUTSIDE_SEB
    testing.value = false
    return
  }
  try {
    const proof = await readSebProof()
    if (proof === null) {
      testMessage.value = OUTSIDE_SEB
      return
    }
    const result = await examSebApi.check({ seb: proof })
    testMessage.value = result.matched
      ? (result.configName ?? NO_MATCH)
      : NO_MATCH
  } catch (err: unknown) {
    testMessage.value =
      err instanceof SebOutdatedError
        ? OUTDATED
        : messageOf(err, 'Uji konfigurasi gagal.')
  } finally {
    testing.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <Card
      gap="none"
      class="flex min-h-0 flex-1 flex-col overflow-hidden"
    >
      <CardHeader
        variant="muted"
        class="flex min-h-12 flex-wrap items-center justify-between gap-2 px-4 py-2"
      >
        <CardTitle class="min-w-0 truncate text-sm font-semibold">
          Konfigurasi Safe Exam Browser
        </CardTitle>
        <Button
          size="sm"
          data-test="seb-add"
          @click="openAdd"
        >
          <Plus aria-hidden="true" />
          Tambah
        </Button>
      </CardHeader>
      <CardContent
        class="flex min-h-0 flex-1 flex-col gap-4 overflow-auto p-4 sm:p-6"
      >
        <p class="text-sm text-muted-foreground">
          Siswa hanya bisa memulai ujian web dari Safe Exam Browser yang memakai
          salah satu konfigurasi aktif.
        </p>

        <div
          v-if="error !== null"
          role="alert"
          class="space-y-3 rounded-md border p-4"
        >
          <p class="text-sm">{{ error }}</p>
          <Button
            variant="outline"
            @click="load"
          >
            Coba lagi
          </Button>
        </div>

        <p
          v-else-if="loading"
          class="text-sm text-muted-foreground"
        >
          Memuat konfigurasi…
        </p>

        <p
          v-else-if="configs.length === 0"
          class="text-sm text-muted-foreground"
        >
          Belum ada konfigurasi. Buat berkas .seb dengan SEB Config Tool, lalu
          tambahkan di sini.
        </p>

        <ul
          v-else
          class="divide-y rounded-md border"
        >
          <li
            v-for="item in configs"
            :key="item.id"
            class="flex flex-wrap items-center gap-3 p-3"
          >
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-medium">{{ item.name }}</p>
              <p class="font-mono text-xs text-muted-foreground tabular-nums">
                {{ item.configKey.slice(0, 8) }}…
              </p>
            </div>
            <Switch
              :model-value="item.active"
              :aria-label="`Aktifkan ${item.name}`"
              :data-test="`seb-active-${item.id}`"
              @update:model-value="
                (value: boolean) => toggleActive(item, value)
              "
            />
            <Button
              variant="ghost"
              size="icon"
              :aria-label="`Hapus ${item.name}`"
              :data-test="`seb-delete-${item.id}`"
              @click="deleteTarget = item"
            >
              <Trash2 aria-hidden="true" />
            </Button>
          </li>
        </ul>

        <div class="space-y-2 border-t pt-4">
          <Button
            variant="outline"
            :disabled="testing"
            data-test="seb-test"
            @click="runTest"
          >
            Uji konfigurasi
          </Button>
          <p
            v-if="testMessage !== null"
            role="status"
            class="text-sm"
          >
            {{ testMessage }}
          </p>
        </div>
      </CardContent>
    </Card>

    <Dialog
      :open="addOpen"
      @update:open="(value: boolean) => (addOpen = value)"
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tambah konfigurasi</DialogTitle>
          <DialogDescription>
            Kunci konfigurasi ada di SEB Config Tool pada bagian Config Key.
          </DialogDescription>
        </DialogHeader>
        <DialogBody class="space-y-4">
          <div class="space-y-1">
            <label
              for="seb-name"
              class="text-sm font-medium"
              >Nama konfigurasi</label
            >
            <input
              id="seb-name"
              v-model="formName"
              data-test="seb-name"
              type="text"
              class="w-full rounded-md border px-3 py-2 text-sm"
            />
          </div>
          <div class="space-y-1">
            <label
              for="seb-key"
              class="text-sm font-medium"
              >Kunci konfigurasi (Config Key)</label
            >
            <input
              id="seb-key"
              v-model="formKey"
              data-test="seb-key"
              type="text"
              autocomplete="off"
              class="w-full rounded-md border px-3 py-2 font-mono text-sm"
            />
          </div>
          <div class="space-y-1">
            <label
              for="seb-file"
              class="text-sm font-medium"
              >Berkas .seb</label
            >
            <input
              id="seb-file"
              data-test="seb-file"
              type="file"
              accept=".seb"
              class="w-full text-sm"
              @change="onFileChange"
            />
          </div>
          <p
            v-if="formError !== null"
            role="alert"
            class="text-sm"
          >
            {{ formError }}
          </p>
        </DialogBody>
        <DialogFooter>
          <Button
            variant="outline"
            @click="addOpen = false"
          >
            Batal
          </Button>
          <Button
            :disabled="saving"
            data-test="seb-submit"
            @click="submitAdd"
          >
            Simpan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <AlertDialog
      :open="deleteTarget !== null"
      @update:open="(value: boolean) => !value && (deleteTarget = null)"
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Hapus konfigurasi?</AlertDialogTitle>
          <AlertDialogDescription>
            Berkas .seb dan kuncinya dihapus. Siswa yang memakai konfigurasi ini
            tidak bisa lagi memulai ujian dari Safe Exam Browser tersebut.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Batal</AlertDialogCancel>
          <AlertDialogAction
            :disabled="deleting"
            data-test="seb-delete-confirm"
            @click="confirmDelete"
          >
            Hapus
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>
