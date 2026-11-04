<script setup lang="ts">
import { computed, ref } from 'vue'
import { ArrowLeft, ArrowRight, Expand } from '@lucide/vue'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@mts241alikhlash/ui/dialog'
import { useInView } from '../../composables/useInView'

interface SlideItem {
  id: string
  src: string
  title: string
  alt: string
}

const slides: SlideItem[] = [
  {
    id: 'cover',
    src: '/slide/cover.webp',
    title: 'Informasi Penerimaan Santri Baru',
    alt: 'Brosur utama Penerimaan Santri Baru MTs Persis 241 Al-Ikhlash',
  },
  {
    id: 'slide-1',
    src: '/slide/1.webp',
    title: 'Ketentuan dan Persyaratan',
    alt: 'Poster ketentuan dan persyaratan pendaftaran santri baru',
  },
  {
    id: 'slide-2',
    src: '/slide/2.webp',
    title: 'Jalur dan Kuota Pendaftaran',
    alt: 'Poster jalur pendaftaran dan informasi kuota santri baru',
  },
  {
    id: 'slide-3',
    src: '/slide/3.webp',
    title: 'Alur dan Prosedur Seleksi',
    alt: 'Poster alur dan tahapan seleksi penerimaan santri baru',
  },
  {
    id: 'slide-4',
    src: '/slide/4.webp',
    title: 'Rincian Biaya Pendidikan',
    alt: 'Poster rincian biaya pendaftaran dan pembiayaan santri',
  },
  {
    id: 'slide-5',
    src: '/slide/5.webp',
    title: 'Kontak dan Layanan Informasi',
    alt: 'Poster kontak panitia dan narahubung informasi PPDB',
  },
]

const track = ref<HTMLElement | null>(null)
const currentIndex = ref(0)
const viewerIndex = ref<number | null>(null)

const total = slides.length
const open = computed({
  get: () => viewerIndex.value !== null,
  set: (value: boolean) => {
    if (!value) viewerIndex.value = null
  },
})
const activePoster = computed(() =>
  viewerIndex.value === null ? null : slides[viewerIndex.value],
)

function onScroll() {
  const el = track.value
  if (!el || el.clientWidth === 0) return
  const itemWidth = el.scrollWidth / total
  const next = Math.round(el.scrollLeft / itemWidth)
  currentIndex.value = Math.min(Math.max(next, 0), total - 1)
}

function scrollTo(index: number) {
  const el = track.value
  if (!el) return
  const cards = el.querySelectorAll<HTMLElement>('.showcase-card')
  const targetCard = cards[index]
  if (targetCard) {
    targetCard.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'center',
    })
  }
}

function scrollStep(direction: 1 | -1) {
  const next = Math.min(Math.max(currentIndex.value + direction, 0), total - 1)
  scrollTo(next)
}

function moveViewer(step: 1 | -1) {
  if (viewerIndex.value === null) return
  viewerIndex.value = (viewerIndex.value + step + total) % total
}

function onViewerKey(event: KeyboardEvent) {
  if (event.key === 'ArrowRight') moveViewer(1)
  else if (event.key === 'ArrowLeft') moveViewer(-1)
  else if (event.key === 'Escape') viewerIndex.value = null
}

const { target, visible } = useInView()
</script>

<template>
  <section
    id="informasi-ppdb"
    :ref="target"
    class="scroll-mt-14 bg-[#f5f2e9] py-14 text-[#162d53] sm:py-20 lg:py-24"
    aria-labelledby="ppdb-showcase-title"
  >
    <div class="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
      <div class="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p class="text-xs font-bold tracking-widest text-[#836d29] uppercase">
            Informasi Khusus PPDB
          </p>
          <h2
            id="ppdb-showcase-title"
            class="mt-2 font-[Georgia,serif] text-3xl font-normal tracking-tight text-[#203f73] sm:text-4xl lg:text-5xl"
          >
            Panduan & Poster Pendaftaran
          </h2>
          <p
            class="mt-3 max-w-xl text-sm leading-6 text-slate-600 sm:text-base"
          >
            Geser kartu untuk menyimak panduan lengkap PPDB. Ketuk poster untuk
            melihat dan membaca tulisan dengan ukuran penuh.
          </p>
        </div>

        <!-- Desktop navigation controls -->
        <div class="hidden items-center gap-2 md:flex">
          <button
            type="button"
            aria-label="Poster sebelumnya"
            :disabled="currentIndex === 0"
            class="grid size-11 place-items-center rounded-full border border-[#203f73]/30 text-[#203f73] transition hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent"
            @click="scrollStep(-1)"
          >
            <ArrowLeft
              class="size-5"
              aria-hidden="true"
            />
          </button>
          <button
            type="button"
            aria-label="Poster berikutnya"
            :disabled="currentIndex === total - 1"
            class="grid size-11 place-items-center rounded-full border border-[#203f73]/30 text-[#203f73] transition hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent"
            @click="scrollStep(1)"
          >
            <ArrowRight
              class="size-5"
              aria-hidden="true"
            />
          </button>
        </div>
      </div>

      <!-- Peeking Card Carousel -->
      <div class="relative mt-8 sm:mt-12">
        <div
          ref="track"
          class="showcase-track flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4 pt-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:gap-6"
          tabindex="0"
          role="region"
          aria-label="Koleksi poster informasi PPDB"
          @scroll.passive="onScroll"
        >
          <article
            v-for="(slide, index) in slides"
            :key="slide.id"
            class="showcase-card group relative w-[80vw] max-w-[20rem] shrink-0 snap-center sm:w-[18rem] md:w-[20rem] lg:w-[22rem] transition duration-500 ease-out motion-reduce:transition-none"
            :class="
              visible ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
            "
            :style="{ transitionDelay: `${Math.min(index, 5) * 80}ms` }"
          >
            <button
              type="button"
              class="showcase-poster-btn relative block aspect-[9/16] w-full overflow-hidden bg-transparent shadow-md ring-1 ring-black/5 transition duration-300 hover:shadow-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#203f73]"
              :aria-label="`Perbesar: ${slide.title}`"
              @click="viewerIndex = index"
            >
              <img
                :src="slide.src"
                :alt="slide.alt"
                width="1080"
                height="1920"
                loading="lazy"
                class="size-full object-cover transition duration-300 group-hover:scale-[1.02]"
              />

              <!-- Overlay Hint -->
              <div
                class="absolute inset-0 flex items-center justify-center bg-[#162d53]/30 opacity-0 backdrop-blur-[2px] transition duration-200 group-hover:opacity-100 group-focus-visible:opacity-100"
              >
                <span
                  class="inline-flex items-center gap-2 rounded-full bg-white/95 px-4 py-2 text-xs font-bold text-[#203f73] shadow"
                >
                  <Expand
                    class="size-3.5"
                    aria-hidden="true"
                  />
                  Lihat Ukuran Penuh
                </span>
              </div>
            </button>

            <!-- Card Label -->
            <div class="mt-3 flex items-center justify-between px-1">
              <span class="text-xs font-semibold text-[#836d29]">
                Bagian {{ index + 1 }} dari {{ total }}
              </span>
              <span class="text-xs text-slate-500 sm:hidden">
                Ketuk perbesar
              </span>
            </div>
            <h3
              class="mt-0.5 font-semibold text-sm text-[#203f73] px-1 line-clamp-1"
            >
              {{ slide.title }}
            </h3>
          </article>
        </div>

        <!-- Mobile Indicator dots -->
        <div class="mt-6 flex items-center justify-center gap-1.5 md:hidden">
          <button
            v-for="(_, index) in slides"
            :key="index"
            type="button"
            :aria-label="`Menuju poster ${index + 1}`"
            class="h-1.5 rounded-full transition-all duration-300"
            :class="
              currentIndex === index
                ? 'w-6 bg-[#203f73]'
                : 'w-1.5 bg-[#203f73]/25'
            "
            @click="scrollTo(index)"
          />
        </div>
      </div>
    </div>

    <!-- Lightbox Zoom Dialog -->
    <Dialog v-model:open="open">
      <DialogContent
        class="max-h-[95vh] max-w-2xl overflow-hidden bg-black/95 p-2 text-white border-none sm:p-4"
        @keydown="onViewerKey"
      >
        <DialogHeader class="sr-only">
          <DialogTitle>{{
            activePoster?.title ?? 'Penampil poster'
          }}</DialogTitle>
          <DialogDescription>
            Gunakan panah kiri dan kanan untuk beralih poster
          </DialogDescription>
        </DialogHeader>

        <div
          v-if="activePoster"
          class="relative flex flex-col items-center"
        >
          <div
            class="relative flex max-h-[82vh] w-full justify-center overflow-hidden bg-transparent"
          >
            <img
              :src="activePoster.src"
              :alt="activePoster.alt"
              class="showcase-poster-btn mx-auto max-h-[82vh] w-auto object-contain"
            />
          </div>

          <div
            class="mt-3 flex w-full items-center justify-between px-2 text-xs text-slate-300"
          >
            <span
              >{{ activePoster.title }} ({{ (viewerIndex ?? 0) + 1 }} dari
              {{ total }})</span
            >
            <div class="flex items-center gap-2">
              <button
                type="button"
                aria-label="Sebelumnya"
                class="grid size-9 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"
                @click="moveViewer(-1)"
              >
                <ArrowLeft
                  class="size-4"
                  aria-hidden="true"
                />
              </button>
              <button
                type="button"
                aria-label="Berikutnya"
                class="grid size-9 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"
                @click="moveViewer(1)"
              >
                <ArrowRight
                  class="size-4"
                  aria-hidden="true"
                />
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  </section>
</template>

<style scoped>
.showcase-track {
  scrollbar-width: none;
  overscroll-behavior-x: contain;
}
.showcase-track::-webkit-scrollbar {
  display: none;
}
.showcase-poster-btn {
  border-radius: 13% / 7.3%;
}
</style>
