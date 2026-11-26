<script setup lang="ts">
import { ref, watch } from 'vue'
import { Badge } from '@mts241alikhlash/ui/badge'
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
import { Loader2 } from '@lucide/vue'
import { useRapor } from '../composables/useRapor'
import type { RaporData, RaporDetailData, RaporScoreRow } from '../types'

const props = withDefaults(
  defineProps<{
    open: boolean
    rapor: RaporData | null
    scope?: 'own' | 'any'
  }>(),
  { scope: 'any' },
)

const emit = defineEmits<{ 'update:open': [value: boolean] }>()

const detailData = ref<RaporDetailData | null>(null)
const scores = ref<RaporScoreRow[]>([])
const loadingDetail = ref(false)

const { fetchRaporDetail, fetchScoresForRapor } = useRapor()

watch(
  () => props.open,
  async (isOpen) => {
    if (isOpen && props.rapor) {
      loadingDetail.value = true
      try {
        const [detail, scoreRows] = await Promise.all([
          fetchRaporDetail(props.rapor.id, props.scope),
          fetchScoresForRapor(props.rapor.enrollmentId, props.scope),
        ])

        detailData.value = detail
        scores.value = scoreRows
      } finally {
        loadingDetail.value = false
      }
    } else {
      detailData.value = null
      scores.value = []
    }
  },
)

function formatScore(val: number | null): string {
  if (val === null || val === undefined) return '-'
  return Number(val).toFixed(1)
}

function formatType(type: string): string {
  const map: Record<string, string> = {
    DAILY: 'Harian',
    MIDTERM: 'UTS',
    FINAL: 'UAS',
    ASSIGNMENT: 'Tugas',
    PRACTICAL: 'Praktik',
  }
  return map[type] ?? type
}
</script>

<template>
  <Dialog
    :open="open"
    @update:open="(val) => emit('update:open', val)"
  >
    <DialogContent size="xl">
      <DialogHeader standard>
        <DialogTitle>
          {{
            rapor?.enrollment?.student?.user?.profile?.name || 'Detail Rapor'
          }}
        </DialogTitle>
        <DialogDescription>
          Detail rapor {{ rapor?.enrollment?.classroom?.displayName || '' }}.
        </DialogDescription>
      </DialogHeader>

      <DialogBody class="space-y-4">
        <div
          v-if="loadingDetail"
          class="flex items-center justify-center py-6"
        >
          <Loader2 class="size-5 animate-spin text-muted-foreground" />
        </div>

        <template v-else-if="detailData">
          <dl
            class="flex flex-wrap items-start justify-between gap-x-6 gap-y-2 rounded-md border bg-muted/30 px-4 py-2"
          >
            <div class="flex flex-col gap-0.5">
              <dt class="text-control text-muted-foreground">Rata-rata</dt>
              <dd class="font-medium tabular-nums">
                {{
                  detailData.totalAverage !== null
                    ? Number(detailData.totalAverage).toFixed(2)
                    : '-'
                }}
              </dd>
            </div>
            <div class="flex flex-col gap-0.5">
              <dt class="text-control text-muted-foreground">Peringkat</dt>
              <dd class="font-medium tabular-nums">
                {{ detailData.rank ?? '-' }}
              </dd>
            </div>
            <div class="flex flex-col gap-0.5">
              <dt class="text-control text-muted-foreground">Status</dt>
              <dd class="font-medium">
                <Badge
                  :variant="detailData.isPublished ? 'success' : 'warning'"
                >
                  {{ detailData.isPublished ? 'Published' : 'Draft' }}
                </Badge>
              </dd>
            </div>
            <div class="flex flex-col gap-0.5">
              <dt class="text-control text-muted-foreground">Catatan</dt>
              <dd class="font-medium">{{ detailData.employeeNote || '-' }}</dd>
            </div>
          </dl>

          <div class="space-y-2">
            <h4 class="text-control font-semibold">Kehadiran</h4>
            <dl
              class="flex flex-wrap items-start justify-between gap-x-6 gap-y-2 rounded-md border bg-muted/30 px-4 py-2"
            >
              <div class="flex flex-col gap-0.5">
                <dt class="text-control text-muted-foreground">Alpha</dt>
                <dd class="font-medium tabular-nums text-destructive">
                  {{ detailData.attendance?.ABSENT || 0 }}
                </dd>
              </div>
              <div class="flex flex-col gap-0.5">
                <dt class="text-control text-muted-foreground">Sakit</dt>
                <dd class="font-medium tabular-nums text-warning">
                  {{ detailData.attendance?.SICK || 0 }}
                </dd>
              </div>
              <div class="flex flex-col gap-0.5">
                <dt class="text-control text-muted-foreground">Izin</dt>
                <dd class="font-medium tabular-nums text-info">
                  {{ detailData.attendance?.EXCUSED || 0 }}
                </dd>
              </div>
            </dl>
          </div>

          <div class="space-y-2">
            <h4 class="text-control font-semibold">
              Nilai Akhir per Mata Pelajaran
            </h4>
            <p class="text-control text-muted-foreground">
              Angka yang tercetak di rapor. Dibekukan saat rapor dibuat, jadi
              tidak berubah walau KKM atau bobot diubah kemudian.
            </p>

            <p
              v-if="!detailData.subjects?.length"
              class="text-control text-muted-foreground py-4 text-center"
            >
              Belum ada mata pelajaran yang dinilai.
            </p>

            <div
              v-else
              class="rounded-md border bg-card overflow-x-auto"
            >
              <table class="w-full text-control">
                <thead class="bg-table-header text-left">
                  <tr>
                    <th class="px-3 py-1.5 font-medium">Mata Pelajaran</th>
                    <th class="px-3 py-1.5 font-medium text-right">KKM</th>
                    <th class="px-3 py-1.5 font-medium text-right">Nilai</th>
                    <th class="px-3 py-1.5 font-medium text-center">
                      Predikat
                    </th>
                    <th class="px-3 py-1.5 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody class="divide-y">
                  <tr
                    v-for="(subject, idx) in detailData.subjects"
                    :key="subject.subjectId"
                    :class="idx % 2 === 0 ? 'bg-card' : 'bg-table-stripe'"
                  >
                    <td class="px-3 py-1.5 font-medium">
                      {{ subject.subjectName }}
                    </td>
                    <td
                      class="px-3 py-1.5 text-right text-muted-foreground tabular-nums"
                    >
                      {{ subject.passingScore }}
                    </td>
                    <td
                      class="px-3 py-1.5 text-right font-semibold tabular-nums"
                    >
                      {{ Number(subject.score).toFixed(2) }}
                    </td>
                    <td class="px-3 py-1.5 text-center">
                      <span class="font-semibold">{{ subject.predicate }}</span>
                      <span class="ml-1 text-muted-foreground">
                        {{ subject.description }}
                      </span>
                    </td>
                    <td class="px-3 py-1.5">
                      <Badge
                        :variant="
                          subject.isComplete ? 'success' : 'destructive'
                        "
                      >
                        {{ subject.isComplete ? 'Tuntas' : 'Belum Tuntas' }}
                      </Badge>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div class="space-y-2">
            <h4 class="text-control font-semibold">Rincian Nilai</h4>

            <p
              v-if="scores.length === 0"
              class="text-control text-muted-foreground py-4 text-center"
            >
              Belum ada data nilai.
            </p>

            <div
              v-else
              class="rounded-md border bg-card overflow-x-auto"
            >
              <table class="w-full text-control">
                <thead class="bg-table-header text-left">
                  <tr>
                    <th class="px-3 py-1.5 font-medium">Komponen</th>
                    <th class="px-3 py-1.5 font-medium">Jenis</th>
                    <th class="px-3 py-1.5 font-medium text-right">Bobot</th>
                    <th class="px-3 py-1.5 font-medium text-right">Nilai</th>
                  </tr>
                </thead>
                <tbody class="divide-y">
                  <tr
                    v-for="(score, idx) in scores"
                    :key="idx"
                    :class="idx % 2 === 0 ? 'bg-card' : 'bg-table-stripe'"
                  >
                    <td class="px-3 py-1.5 font-medium">{{ score.subject }}</td>
                    <td class="px-3 py-1.5">{{ formatType(score.type) }}</td>
                    <td class="px-3 py-1.5 text-right tabular-nums">
                      {{ score.weight }}
                    </td>
                    <td class="px-3 py-1.5 text-right tabular-nums">
                      {{ formatScore(score.score) }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </template>
      </DialogBody>

      <DialogFooter standard>
        <Button
          variant="outline"
          @click="emit('update:open', false)"
        >
          Tutup
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
