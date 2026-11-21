<script setup lang="ts">
import { computed } from 'vue'
import { Badge } from '@mts241alikhlash/ui/badge'
import { Button } from '@mts241alikhlash/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@mts241alikhlash/ui/card'
import { Progress } from '@mts241alikhlash/ui/progress'
import type { StalenessTone } from '../composables/useRoomMonitor'
import type { RoomMonitorToken } from '../types'

const props = defineProps<{
  token: RoomMonitorToken | null
  minutesLeft: number | null
  startsAt: string | null
  endsAt: string | null
  nowMs: number
  staleness: StalenessTone
  secondsSince: number
}>()

defineEmits<{ copy: [] }>()

const clock = new Intl.DateTimeFormat('id-ID', {
  hour: '2-digit',
  minute: '2-digit',
})

const range = computed(() =>
  props.startsAt === null || props.endsAt === null
    ? null
    : {
        start: Date.parse(props.startsAt),
        end: Date.parse(props.endsAt),
      },
)

const remaining = computed(() => {
  const r = range.value
  if (r === null) return '-'
  const left = Math.max(0, Math.floor((r.end - props.nowMs) / 1000))
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(Math.floor(left / 3600))}:${pad(Math.floor((left % 3600) / 60))}:${pad(left % 60)}`
})

const urgent = computed(() => {
  const r = range.value
  return r !== null && r.end - props.nowMs < 300_000
})

const percent = computed(() => {
  const r = range.value
  if (r === null) return 0
  return Math.min(
    100,
    Math.max(0, ((props.nowMs - r.start) / (r.end - r.start)) * 100),
  )
})

const connection = computed(() =>
  props.staleness === 'fresh'
    ? { variant: 'success' as const, text: 'Tersambung' }
    : {
        variant: 'destructive' as const,
        text: `Terputus ${props.secondsSince} dtk`,
      },
)
</script>

<template>
  <Card gap="none">
    <CardHeader standard>
      <CardTitle size="md">Token &amp; Waktu</CardTitle>
      <Button
        variant="outline"
        :disabled="!token"
        @click="$emit('copy')"
      >
        Salin Token
      </Button>
    </CardHeader>
    <CardContent
      variant="standard"
      class="grid gap-4 sm:grid-cols-2"
    >
      <div class="space-y-1">
        <p class="text-control text-muted-foreground">Token masuk</p>
        <p
          v-if="token"
          class="text-3xl font-semibold tracking-widest"
        >
          {{ token.accessCode }}
        </p>
        <p
          v-else
          class="text-control text-muted-foreground"
        >
          Token belum tersedia.
        </p>
        <p
          v-if="token"
          class="text-control text-muted-foreground"
        >
          Berlaku {{ minutesLeft }} menit lagi
        </p>
      </div>

      <div class="space-y-1">
        <p class="text-control text-muted-foreground">Sisa waktu</p>
        <p
          :class="[
            'text-3xl font-semibold tabular-nums',
            urgent && 'text-destructive',
          ]"
        >
          {{ remaining }}
        </p>
        <Progress :model-value="percent" />
        <div class="flex items-center justify-between text-control">
          <span class="text-muted-foreground">
            <template v-if="range">
              {{ clock.format(range.start) }} – {{ clock.format(range.end) }}
            </template>
            <template v-else>Tidak ada sesi aktif</template>
          </span>
          <Badge :variant="connection.variant">{{ connection.text }}</Badge>
        </div>
      </div>
    </CardContent>
  </Card>
</template>
