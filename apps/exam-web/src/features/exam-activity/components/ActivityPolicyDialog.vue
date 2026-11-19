<script setup lang="ts">
import { ref, watch } from 'vue'
import { Button } from '@mts241alikhlash/ui/button'
import { Switch } from '@mts241alikhlash/ui/switch'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@mts241alikhlash/ui/dialog'
import { messageOf } from '@/features/exam-package/utils/messageOf'
import { examActivityApi } from '../api/examActivityApi'
import type { ActivityPolicyPayload, ExamPolicy } from '../types'

const props = defineProps<{
  open: boolean
  activityId: string
  policy: ExamPolicy
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  saved: [policy: ExamPolicy]
}>()

const violationLimit = ref(props.policy.violationLimit ?? 3)
const focusThresholdMs = ref(props.policy.focusThresholdMs ?? 15000)
const heartbeatIntervalMs = ref(props.policy.heartbeatIntervalMs ?? 30000)
const gapRecordedMs = ref(props.policy.gapRecordedMs ?? 60000)
const gapTokenMs = ref(props.policy.gapTokenMs ?? 300000)
const gapViolationFrom = ref(props.policy.gapViolationFrom ?? 2)
const tokenSlotSeconds = ref(props.policy.tokenSlotSeconds ?? 900)
const lateToleranceMinutes = ref(props.policy.lateToleranceMinutes ?? 15)
const minSubmitMinutes = ref(props.policy.minSubmitMinutes ?? 0)
const shuffleQuestions = ref(props.policy.shuffleQuestions ?? true)
const shuffleChoices = ref(props.policy.shuffleChoices ?? true)
const allowWeb = ref(props.policy.allowWeb ?? true)

const saving = ref(false)
const error = ref<string | null>(null)

watch(
  () => props.policy,
  (next) => {
    violationLimit.value = next.violationLimit ?? 3
    focusThresholdMs.value = next.focusThresholdMs ?? 15000
    heartbeatIntervalMs.value = next.heartbeatIntervalMs ?? 30000
    gapRecordedMs.value = next.gapRecordedMs ?? 60000
    gapTokenMs.value = next.gapTokenMs ?? 300000
    gapViolationFrom.value = next.gapViolationFrom ?? 2
    tokenSlotSeconds.value = next.tokenSlotSeconds ?? 900
    lateToleranceMinutes.value = next.lateToleranceMinutes ?? 15
    minSubmitMinutes.value = next.minSubmitMinutes ?? 0
    shuffleQuestions.value = next.shuffleQuestions ?? true
    shuffleChoices.value = next.shuffleChoices ?? true
    allowWeb.value = next.allowWeb ?? true
  },
)

async function submit(): Promise<void> {
  if (saving.value) return
  saving.value = true
  error.value = null
  const payload: ActivityPolicyPayload = {
    violationLimit: violationLimit.value,
    focusThresholdMs: focusThresholdMs.value,
    heartbeatIntervalMs: heartbeatIntervalMs.value,
    gapRecordedMs: gapRecordedMs.value,
    gapTokenMs: gapTokenMs.value,
    gapViolationFrom: gapViolationFrom.value,
    tokenSlotSeconds: tokenSlotSeconds.value,
    lateToleranceMinutes: lateToleranceMinutes.value,
    minSubmitMinutes: minSubmitMinutes.value,
    shuffleQuestions: shuffleQuestions.value,
    shuffleChoices: shuffleChoices.value,
    allowWeb: allowWeb.value,
  }
  try {
    const response = await examActivityApi.updatePolicy(
      props.activityId,
      payload,
    )
    emit('saved', response.policy)
    emit('update:open', false)
  } catch (err: unknown) {
    error.value = messageOf(err, 'Kebijakan kegiatan gagal disimpan.')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <Dialog
    :open="open"
    @update:open="emit('update:open', $event)"
  >
    <DialogContent size="xl">
      <DialogHeader standard>
        <DialogTitle>Ubah Kebijakan Kegiatan</DialogTitle>
        <DialogDescription>
          Sesuaikan angka pengawasan dan batas pelanggaran untuk kegiatan ini.
        </DialogDescription>
      </DialogHeader>
      <form
        class="space-y-4"
        @submit.prevent="submit"
      >
        <DialogBody class="space-y-4">
          <div
            v-if="error !== null"
            role="alert"
            class="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-control text-destructive"
          >
            {{ error }}
          </div>

          <div class="grid gap-4 sm:grid-cols-2">
            <label class="grid gap-1 text-control">
              <span>Batas pelanggaran (1–10)</span>
              <input
                v-model.number="violationLimit"
                type="number"
                min="1"
                max="10"
                class="rounded-md border px-3 py-2"
              />
            </label>
            <label class="grid gap-1 text-control">
              <span>Ambang hilang fokus (ms)</span>
              <input
                v-model.number="focusThresholdMs"
                type="number"
                min="3000"
                max="60000"
                class="rounded-md border px-3 py-2"
              />
            </label>
            <label class="grid gap-1 text-control">
              <span>Interval detak sesi (ms)</span>
              <input
                v-model.number="heartbeatIntervalMs"
                type="number"
                min="10000"
                max="120000"
                class="rounded-md border px-3 py-2"
              />
            </label>
            <label class="grid gap-1 text-control">
              <span>Jeda tercatat putus (ms)</span>
              <input
                v-model.number="gapRecordedMs"
                type="number"
                min="30000"
                max="600000"
                class="rounded-md border px-3 py-2"
              />
            </label>
            <label class="grid gap-1 text-control">
              <span>Jeda wajib token ulang (ms)</span>
              <input
                v-model.number="gapTokenMs"
                type="number"
                min="30000"
                max="3600000"
                class="rounded-md border px-3 py-2"
              />
            </label>
            <label class="grid gap-1 text-control">
              <span>Putus ke-berapa jadi pelanggaran</span>
              <input
                v-model.number="gapViolationFrom"
                type="number"
                min="1"
                max="5"
                class="rounded-md border px-3 py-2"
              />
            </label>
            <label class="grid gap-1 text-control">
              <span>Masa berlaku slot token (detik)</span>
              <input
                v-model.number="tokenSlotSeconds"
                type="number"
                min="300"
                max="3600"
                class="rounded-md border px-3 py-2"
              />
            </label>
            <label class="grid gap-1 text-control">
              <span>Toleransi terlambat (menit)</span>
              <input
                v-model.number="lateToleranceMinutes"
                type="number"
                min="0"
                max="120"
                class="rounded-md border px-3 py-2"
              />
            </label>
            <label class="grid gap-1 text-control">
              <span>Minimal sebelum kumpul (menit)</span>
              <input
                v-model.number="minSubmitMinutes"
                type="number"
                min="0"
                max="180"
                class="rounded-md border px-3 py-2"
              />
            </label>
            <label class="flex items-center gap-2 text-control">
              <Switch
                v-model="shuffleQuestions"
                aria-label="Acak urutan soal"
              />
              <span>Acak urutan soal</span>
            </label>
            <label class="flex items-center gap-2 text-control">
              <Switch
                v-model="shuffleChoices"
                aria-label="Acak urutan pilihan"
              />
              <span>Acak urutan pilihan</span>
            </label>
            <label class="flex items-center gap-2 text-control">
              <Switch
                v-model="allowWeb"
                aria-label="Izinkan lewat web (SEB)"
              />
              <span>Izinkan lewat web (SEB)</span>
            </label>
          </div>
        </DialogBody>
        <DialogFooter
          standard
          class="justify-between"
        >
          <Button
            type="button"
            variant="outline"
            @click="emit('update:open', false)"
          >
            Batal
          </Button>
          <Button
            type="submit"
            :disabled="saving"
          >
            {{ saving ? 'Menyimpan…' : 'Simpan kebijakan' }}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
