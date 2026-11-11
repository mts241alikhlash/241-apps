<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { toast } from 'vue-sonner'
import { Button } from '@mts241alikhlash/ui/button'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@mts241alikhlash/ui/card'
import { messageOf } from '@/features/exam-package/utils/messageOf'
import {
  examCategoryLabel,
  examTypeLabel,
  type ExamType,
} from '@/features/exam-shared/examType'
import { examPresetApi, type ExamPolicyPreset } from '../api/examPresetApi'

const presets = ref<ExamPolicyPreset[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const savingType = ref<ExamType | null>(null)

async function load(): Promise<void> {
  loading.value = true
  error.value = null
  try {
    const response = await examPresetApi.list()
    presets.value = response.data.data
  } catch (err: unknown) {
    error.value = messageOf(err, 'Gagal memuat daftar preset kebijakan.')
  } finally {
    loading.value = false
  }
}

async function savePreset(preset: ExamPolicyPreset): Promise<void> {
  if (savingType.value !== null) return
  savingType.value = preset.type
  try {
    const response = await examPresetApi.update(preset.type, {
      ...preset.policy,
    })
    presets.value = presets.value.map((item) =>
      item.type === preset.type ? response.data.data : item,
    )
    toast.success(`Preset ${examTypeLabel(preset.type)} disimpan.`)
  } catch (err: unknown) {
    toast.error(messageOf(err, 'Gagal menyimpan preset kebijakan.'))
  } finally {
    savingType.value = null
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
      <CardHeader variant="muted">
        <CardTitle class="font-semibold">Preset Kebijakan Ujian</CardTitle>
      </CardHeader>
      <CardContent
        class="flex min-h-0 flex-1 flex-col overflow-auto p-4 sm:p-6 space-y-4"
      >
        <p
          class="text-[length:var(--text-control,0.75rem)] text-muted-foreground"
        >
          Berlaku untuk kegiatan baru. Kegiatan yang sudah berjalan tetap
          memakai salinan kebijakannya sendiri.
        </p>

        <div
          v-if="error !== null"
          role="alert"
          class="space-y-3 rounded-md border p-4"
        >
          <p class="text-[length:var(--text-control,0.75rem)]">{{ error }}</p>
          <Button
            variant="outline"
            @click="load"
          >
            Coba lagi
          </Button>
        </div>

        <p
          v-else-if="loading"
          class="text-[length:var(--text-control,0.75rem)] text-muted-foreground"
        >
          Memuat preset kebijakan…
        </p>

        <div
          v-else
          class="overflow-x-auto rounded-md border"
        >
          <table class="w-full text-left text-xs">
            <thead class="border-b bg-muted/50">
              <tr>
                <th class="p-3 font-semibold">Jenis</th>
                <th class="p-3 font-semibold">Kategori</th>
                <th class="p-3 font-semibold">Batas Pelanggaran</th>
                <th class="p-3 font-semibold">Hilang Fokus (ms)</th>
                <th class="p-3 font-semibold">Interval Foto (ms)</th>
                <th class="p-3 font-semibold">Detak Sesi (ms)</th>
                <th class="p-3 font-semibold">Jeda Putus (ms)</th>
                <th class="p-3 font-semibold">Jeda Token (ms)</th>
                <th class="p-3 font-semibold">Putus Jadi Pelanggaran</th>
                <th class="p-3 font-semibold">Slot Token (detik)</th>
                <th class="p-3 font-semibold">Aksi</th>
              </tr>
            </thead>
            <tbody class="divide-y">
              <tr
                v-for="item in presets"
                :key="item.type"
              >
                <td class="p-3 font-medium">
                  {{ examTypeLabel(item.type) }}
                </td>
                <td class="p-3 text-muted-foreground">
                  {{ examCategoryLabel(item.category) }}
                </td>
                <td class="p-3">
                  <input
                    v-model.number="item.policy.violationLimit"
                    type="number"
                    min="1"
                    max="10"
                    :aria-label="`Batas pelanggaran ${examTypeLabel(item.type)}`"
                    class="w-20 rounded border px-2 py-1"
                  />
                </td>
                <td class="p-3">
                  <input
                    v-model.number="item.policy.focusThresholdMs"
                    type="number"
                    min="3000"
                    max="60000"
                    :aria-label="`Hilang fokus ${examTypeLabel(item.type)}`"
                    class="w-24 rounded border px-2 py-1"
                  />
                </td>
                <td class="p-3">
                  <input
                    v-model.number="item.policy.snapshotIntervalMs"
                    type="number"
                    min="10000"
                    max="300000"
                    :aria-label="`Interval foto ${examTypeLabel(item.type)}`"
                    class="w-24 rounded border px-2 py-1"
                  />
                </td>
                <td class="p-3">
                  <input
                    v-model.number="item.policy.heartbeatIntervalMs"
                    type="number"
                    min="10000"
                    max="120000"
                    :aria-label="`Detak sesi ${examTypeLabel(item.type)}`"
                    class="w-24 rounded border px-2 py-1"
                  />
                </td>
                <td class="p-3">
                  <input
                    v-model.number="item.policy.gapRecordedMs"
                    type="number"
                    min="30000"
                    max="600000"
                    :aria-label="`Jeda putus ${examTypeLabel(item.type)}`"
                    class="w-24 rounded border px-2 py-1"
                  />
                </td>
                <td class="p-3">
                  <input
                    v-model.number="item.policy.gapTokenMs"
                    type="number"
                    min="30000"
                    max="3600000"
                    :aria-label="`Jeda token ${examTypeLabel(item.type)}`"
                    class="w-28 rounded border px-2 py-1"
                  />
                </td>
                <td class="p-3">
                  <input
                    v-model.number="item.policy.gapViolationFrom"
                    type="number"
                    min="1"
                    max="5"
                    :aria-label="`Putus jadi pelanggaran ${examTypeLabel(item.type)}`"
                    class="w-20 rounded border px-2 py-1"
                  />
                </td>
                <td class="p-3">
                  <input
                    v-model.number="item.policy.tokenSlotSeconds"
                    type="number"
                    min="300"
                    max="3600"
                    :aria-label="`Slot token ${examTypeLabel(item.type)}`"
                    class="w-20 rounded border px-2 py-1"
                  />
                </td>
                <td class="p-3">
                  <Button
                    :data-test="`save-preset-${item.type}`"
                    :disabled="savingType === item.type"
                    @click="savePreset(item)"
                  >
                    {{ savingType === item.type ? 'Menyimpan…' : 'Simpan' }}
                  </Button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </CardContent>
      <CardFooter variant="thin" />
    </Card>
  </div>
</template>
