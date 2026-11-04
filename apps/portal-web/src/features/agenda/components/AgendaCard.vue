<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { CalendarDays, MapPin } from '@lucide/vue'
import { Card, CardContent } from '@mts241alikhlash/ui/card'
import type { PublicAgendaEntry } from '../types'

const props = defineProps<{ entry: PublicAgendaEntry }>()

const WIB = 'Asia/Jakarta'

const when = computed(() => {
  const start = new Date(props.entry.startTime)
  const end = new Date(props.entry.endTime)

  const date = (value: Date) =>
    new Intl.DateTimeFormat('id-ID', {
      dateStyle: 'long',
      timeZone: WIB,
    }).format(value)
  const time = (value: Date) =>
    new Intl.DateTimeFormat('id-ID', {
      timeStyle: 'short',
      timeZone: WIB,
    }).format(value)

  return date(start) === date(end)
    ? `${date(start)}, ${time(start)}–${time(end)} WIB`
    : `${date(start)} – ${date(end)}`
})
</script>

<template>
  <RouterLink
    :to="`/agenda/${entry.slug}`"
    class="group block"
  >
    <Card class="overflow-hidden transition-colors hover:border-primary/50">
      <div
        v-if="entry.coverImageUrl"
        class="aspect-[16/9] overflow-hidden bg-muted"
      >
        <img
          :src="entry.coverImageUrl"
          :alt="entry.title"
          loading="lazy"
          class="h-full w-full object-cover transition-transform group-hover:scale-105"
        />
      </div>

      <CardContent class="flex flex-col gap-2 p-4">
        <h3 class="font-semibold leading-snug group-hover:text-primary">
          {{ entry.title }}
        </h3>

        <p class="flex items-center gap-1.5 text-xs text-muted-foreground">
          <CalendarDays class="size-3.5 shrink-0" />
          {{ when }}
        </p>
        <p class="flex items-center gap-1.5 text-xs text-muted-foreground">
          <MapPin class="size-3.5 shrink-0" />
          {{ entry.location }}
        </p>
      </CardContent>
    </Card>
  </RouterLink>
</template>
