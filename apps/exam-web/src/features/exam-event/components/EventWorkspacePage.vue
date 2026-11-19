<script setup lang="ts">
import { BackButton } from '@mts241alikhlash/ui'
import { Badge } from '@mts241alikhlash/ui/badge'
import { Button } from '@mts241alikhlash/ui/button'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@mts241alikhlash/ui/card'
import { FloatingLabelField } from '@mts241alikhlash/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@mts241alikhlash/ui/select'
import { examTypeLabel } from '@/features/exam-schedule/types'
import { formatDateRange } from '@/features/exam-schedule/utils/formatDateRange'
import { eventStatusLabel, eventStatusVariant } from '../types'
import type { ExamEvent } from '../types'

defineProps<{
  title: string
  backLabel?: string
  hideEventMeta?: boolean
  events: ExamEvent[]
  event: ExamEvent | null
  loading: boolean
  loadFailed: boolean
}>()

defineEmits<{
  select: [id: string]
  retry: []
  back: []
}>()
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <Card
      gap="none"
      class="flex min-h-0 flex-1 flex-col overflow-hidden"
    >
      <CardHeader standard>
        <div class="flex min-w-0 items-center gap-2">
          <BackButton
            v-if="backLabel"
            :label="backLabel"
            @click="$emit('back')"
          />
          <CardTitle class="font-semibold">{{ title }}</CardTitle>
        </div>
        <slot name="actions" />
      </CardHeader>

      <CardContent
        class="flex min-h-0 flex-1 flex-col overflow-auto p-4 sm:p-4 space-y-4"
      >
        <div class="flex flex-wrap items-end gap-3">
          <FloatingLabelField
            v-if="!backLabel"
            label="Periode ujian"
            for="event-workspace-select"
            class="w-fit min-w-64"
            floating
          >
            <Select
              :model-value="event?.id ?? ''"
              @update:model-value="(value) => $emit('select', String(value))"
            >
              <SelectTrigger
                id="event-workspace-select"
                class="w-full"
              >
                <SelectValue placeholder="Pilih periode ujian" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="item in events"
                  :key="item.id"
                  :value="item.id"
                >
                  {{ item.name }}
                </SelectItem>
              </SelectContent>
            </Select>
          </FloatingLabelField>
          <template v-if="event && !hideEventMeta">
            <Badge :variant="eventStatusVariant(event.status)">
              {{ eventStatusLabel(event.status) }}
            </Badge>
            <Badge variant="outline">{{ examTypeLabel(event.type) }}</Badge>
            <span class="text-control text-muted-foreground">
              {{ formatDateRange(event.startsAt, event.endsAt) }}
            </span>
          </template>
        </div>

        <div
          v-if="loadFailed"
          class="space-y-3"
          role="alert"
        >
          <p class="text-control">Periode ujian tidak dapat dimuat.</p>
          <Button
            variant="outline"
            @click="$emit('retry')"
          >
            Coba lagi
          </Button>
        </div>
        <p
          v-else-if="!loading && !event"
          class="text-control text-muted-foreground"
        >
          Belum ada periode ujian.
        </p>
        <slot v-else-if="event" />
      </CardContent>
      <CardFooter plain />
    </Card>
  </div>
</template>
