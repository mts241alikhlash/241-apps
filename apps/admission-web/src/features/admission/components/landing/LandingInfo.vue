<script setup lang="ts">
import { computed, ref } from 'vue'
import { ArrowLeft, ArrowRight, X } from '@lucide/vue'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@mts241alikhlash/ui/dialog'
import { imageUrl } from '../../composables/useLandingContent'
import type { LandingInfoContent } from '../../types/landing'

const props = defineProps<{ content: LandingInfoContent }>()

const track = ref<HTMLElement | null>(null)
const viewerIndex = ref<number | null>(null)

const posters = computed(() =>
  props.content.posters.map((poster) => ({
    ...poster,
    src: imageUrl(poster.image),
  })),
)
const total = computed(() => posters.value.length)
const open = computed({
  get: () => viewerIndex.value !== null,
  set: (value: boolean) => {
    if (!value) viewerIndex.value = null
  },
})
const active = computed(() =>
  viewerIndex.value === null ? null : posters.value[viewerIndex.value],
)

function scrollTrack(direction: 1 | -1) {
  const el = track.value
  if (!el) return
  el.scrollBy({ left: direction * el.clientWidth * 0.8, behavior: 'smooth' })
}

function move(step: 1 | -1) {
  if (viewerIndex.value === null) return
  viewerIndex.value = (viewerIndex.value + step + total.value) % total.value
}

function onViewerKey(event: KeyboardEvent) {
  if (event.key === 'ArrowRight') move(1)
  else if (event.key === 'ArrowLeft') move(-1)
  else if (event.key === 'Escape') viewerIndex.value = null
}
</script>

<template>
  <section
    v-if="total"
    id="informasi"
    aria-labelledby="informasi-title"
    class="scroll-mt-14 bg-white py-14 sm:py-20"
  >
    <div class="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
      <div class="grid gap-4 lg:grid-cols-[1.2fr_0.8fr] lg:items-end lg:gap-16">
        <h2
          id="informasi-title"
          class="font-[Georgia,serif] text-4xl font-normal leading-[1.1] tracking-tight text-[#203f73] sm:text-5xl"
        >
          {{ content.title }}
        </h2>
        <p class="max-w-md text-sm leading-7 text-slate-700">
          {{ content.description }}
        </p>
      </div>

      <div class="relative mt-10">
        <ul
          ref="track"
          class="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4 [scrollbar-width:thin]"
          aria-label="Poster informasi PPDB"
          tabindex="0"
        >
          <li
            v-for="(poster, index) in posters"
            :key="`${index}-${poster.src}`"
            data-test="poster-card"
            class="w-[min(72vw,18rem)] shrink-0 snap-start"
          >
            <button
              type="button"
              :aria-label="`Perbesar poster: ${poster.alt}`"
              class="block aspect-[9/16] w-full overflow-hidden rounded-2xl bg-[#f5f2e9] ring-1 ring-black/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#203f73]"
              @click="viewerIndex = index"
            >
              <img
                :src="poster.src"
                :alt="poster.alt"
                width="1080"
                height="1920"
                loading="lazy"
                class="size-full object-contain"
              />
            </button>
            <p
              v-if="poster.caption"
              class="mt-2 text-sm leading-6 text-slate-700"
            >
              {{ poster.caption }}
            </p>
          </li>
        </ul>
        <div
          v-if="total > 1"
          class="mt-2 flex gap-2"
        >
          <button
            type="button"
            aria-label="Gulir poster ke kiri"
            class="inline-flex size-11 items-center justify-center rounded-full border border-[#203f73]/30 text-[#203f73] hover:bg-[#f5f2e9] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#203f73]"
            @click="scrollTrack(-1)"
          >
            <ArrowLeft
              class="size-5"
              aria-hidden="true"
            />
          </button>
          <button
            type="button"
            aria-label="Gulir poster ke kanan"
            class="inline-flex size-11 items-center justify-center rounded-full border border-[#203f73]/30 text-[#203f73] hover:bg-[#f5f2e9] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#203f73]"
            @click="scrollTrack(1)"
          >
            <ArrowRight
              class="size-5"
              aria-hidden="true"
            />
          </button>
        </div>
      </div>
    </div>

    <Dialog v-model:open="open">
      <DialogContent
        class="max-w-[min(96vw,34rem)] gap-3 p-4"
        :show-close-button="false"
      >
        <div
          v-if="active"
          data-test="poster-viewer"
          class="space-y-3"
          @keydown="onViewerKey"
        >
          <DialogHeader
            class="flex-row items-start justify-between gap-3 text-left"
          >
            <div class="min-w-0">
              <DialogTitle class="break-words text-base">
                {{ active.alt }}
              </DialogTitle>
              <DialogDescription class="text-xs">
                {{ (viewerIndex ?? 0) + 1 }} / {{ total }}
              </DialogDescription>
            </div>
            <button
              type="button"
              aria-label="Tutup"
              class="inline-flex size-11 shrink-0 items-center justify-center rounded-full hover:bg-muted"
              @click="viewerIndex = null"
            >
              <X
                class="size-5"
                aria-hidden="true"
              />
            </button>
          </DialogHeader>
          <img
            :src="active.src"
            :alt="active.alt"
            class="mx-auto max-h-[70dvh] w-auto max-w-full rounded-lg object-contain"
          />
          <p
            v-if="active.caption"
            class="text-sm leading-6 text-slate-700"
          >
            {{ active.caption }}
          </p>
          <div
            v-if="total > 1"
            class="flex justify-between"
          >
            <button
              type="button"
              aria-label="Poster sebelumnya"
              class="inline-flex size-11 items-center justify-center rounded-full border hover:bg-muted"
              @click="move(-1)"
            >
              <ArrowLeft
                class="size-5"
                aria-hidden="true"
              />
            </button>
            <button
              type="button"
              aria-label="Poster berikutnya"
              class="inline-flex size-11 items-center justify-center rounded-full border hover:bg-muted"
              @click="move(1)"
            >
              <ArrowRight
                class="size-5"
                aria-hidden="true"
              />
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  </section>
</template>
