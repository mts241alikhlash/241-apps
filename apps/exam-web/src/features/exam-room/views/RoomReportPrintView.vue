<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { BackButton } from '@mts241alikhlash/ui'
import { Button } from '@mts241alikhlash/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@mts241alikhlash/ui/card'
import { Printer } from '@lucide/vue'
import RoomReportDocument from '../components/RoomReportDocument.vue'
import { examRoomService } from '../services/examRoomService'
import type { RoomMonitorMeta, RoomReport } from '../types'

const route = useRoute()
const router = useRouter()

const roomId = computed(() => String(route.params.roomId ?? ''))
const slotId = computed(() => String(route.params.slotId ?? ''))

const report = ref<RoomReport | null>(null)
const meta = ref<RoomMonitorMeta | null>(null)
const error = ref<string | null>(null)
const loading = ref(false)

function goBack() {
  if (router.options.history.state.back) router.back()
  else void router.push('/exam/reports')
}

function print() {
  document.body.classList.add('printing-report')
  window.print()
  document.body.classList.remove('printing-report')
}

async function load() {
  loading.value = true
  error.value = null
  try {
    const [reportResult, rosterResult] = await Promise.all([
      examRoomService.loadReport(roomId.value, slotId.value),
      examRoomService.loadRoster(roomId.value, slotId.value),
    ])
    meta.value = rosterResult.meta
    if (reportResult.success) {
      report.value = reportResult.data
    } else {
      report.value = null
      error.value = reportResult.error
    }
  } catch {
    report.value = null
    error.value = 'Dokumen tidak dapat dimuat. Periksa koneksi lalu coba lagi.'
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="print-body flex min-h-0 flex-1 flex-col">
    <Card
      gap="none"
      class="flex min-h-0 flex-1 flex-col overflow-hidden"
    >
      <CardHeader standard>
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="flex items-center gap-3">
            <BackButton
              label="Kembali"
              @click="goBack"
            />
            <CardTitle class="font-semibold">Cetak Berita Acara</CardTitle>
          </div>
          <Button
            :disabled="loading || report === null"
            @click="print"
          >
            <Printer class="size-4" />
            Cetak A4
          </Button>
        </div>
      </CardHeader>

      <CardContent
        class="flex min-h-0 flex-1 flex-col overflow-auto p-4 sm: p-4 space-y-4"
      >
        <div
          v-if="error"
          class="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-control text-destructive"
          role="alert"
        >
          <p>{{ error }}</p>
          <Button
            class="mt-2"
            variant="outline"
            :disabled="loading"
            @click="load"
          >
            Coba lagi
          </Button>
        </div>

        <p
          v-else-if="loading"
          class="text-control text-muted-foreground"
        >
          Menyiapkan dokumen...
        </p>

        <RoomReportDocument
          v-else-if="report && meta"
          :report="report"
          :room="{
            name: meta.room.name,
            currentSupervisorName: meta.room.currentSupervisorName,
            technicianName: meta.room.technicianName,
          }"
        />
      </CardContent>
      <CardFooter plain />
    </Card>
  </div>
</template>
