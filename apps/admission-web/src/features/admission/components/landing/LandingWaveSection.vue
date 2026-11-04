<script setup lang="ts">
import { computed } from 'vue'
import { CalendarDays } from '@lucide/vue'
import type { ActiveWave } from '../../types'
import { useInView } from '../../composables/useInView'
import { formatDateRange, formatIDR } from '../../utils'

const props = defineProps<{
  waves: ActiveWave[]
  loading: boolean
}>()

const DAY = 24 * 60 * 60 * 1000

function clamp(value: number) {
  return Math.min(Math.max(value, 0), 100)
}

const waveCards = computed(() => {
  const now = Date.now()
  return props.waves.map((wave) => {
    const start = new Date(wave.startDate).getTime()
    const end = new Date(wave.endDate).getTime()
    const daysLeft = Math.ceil((end - now) / DAY)
    return {
      ...wave,
      dateRange: formatDateRange(wave.startDate, wave.endDate),
      registrationFeeLabel: formatIDR(wave.registrationFee),
      periodProgress:
        end > start ? clamp(((now - start) / (end - start)) * 100) : 100,
      daysLeftLabel:
        daysLeft > 1 ? `Tersisa ${daysLeft} hari` : 'Hari terakhir pendaftaran',
      quotaPercent:
        wave.quota > 0 ? clamp((wave.remainingQuota / wave.quota) * 100) : 0,
    }
  })
})

const { target, visible } = useInView()
</script>

<template>
  <section
    :ref="target"
    class="scroll-mt-14 bg-white py-14 sm:py-20 lg:flex lg:min-h-[calc(100svh-3.5rem)] lg:items-center lg:py-8"
  >
    <div class="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
      <div class="grid gap-4 lg:grid-cols-[1.2fr_0.8fr] lg:items-end lg:gap-16">
        <h2
          class="max-w-xl font-[Georgia,serif] text-4xl font-normal leading-[1.1] tracking-tight text-[#203f73] sm:text-5xl"
        >
          Jadwal dan biaya pendaftaran
        </h2>
        <p class="max-w-md text-sm leading-7 text-slate-700">
          Lihat kapan pendaftaran dibuka, berapa kursi yang tersedia, dan
          biayanya. Kursi baru menjadi milikmu setelah pembayaran kami
          konfirmasi, jadi selesaikan pembayaran lebih awal.
        </p>
      </div>

      <div
        v-if="loading"
        role="status"
        class="mt-10 space-y-4 border-t border-[#203f73]/25 pt-6"
      >
        <p class="text-sm text-slate-600">Memuat gelombang pendaftaran...</p>
        <div
          v-for="skeleton in 2"
          :key="skeleton"
          class="h-14 animate-pulse bg-slate-100"
        />
      </div>

      <div
        v-else-if="waveCards.length === 0"
        class="mt-10 border-t border-[#203f73]/25 py-10"
      >
        <CalendarDays
          class="size-7 text-[#203f73]"
          aria-hidden="true"
        />
        <h3 class="mt-4 text-lg font-bold text-[#203f73]">
          Belum ada gelombang yang dibuka
        </h3>
        <p class="mt-2 max-w-md text-sm leading-6 text-slate-700">
          Jadwal gelombang berikutnya akan ditampilkan di halaman ini setelah
          tersedia.
        </p>
      </div>

      <div
        v-else
        class="mt-10 grid gap-6"
      >
        <article
          v-for="(wave, index) in waveCards"
          :key="wave.id"
          class="rounded-2xl bg-[#f5f2e9] p-6 transition duration-700 ease-out motion-reduce:transition-none lg:p-10"
          :class="
            visible ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
          "
          :style="{ transitionDelay: `${index * 120}ms` }"
        >
          <div class="flex flex-wrap items-start justify-between gap-6">
            <div>
              <p
                class="flex items-center gap-2 text-xs font-bold text-[#203f73]"
              >
                <span class="relative flex size-2.5">
                  <span
                    class="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-60 motion-reduce:animate-none"
                  />
                  <span
                    class="relative inline-flex size-2.5 rounded-full bg-emerald-600"
                  />
                </span>
                Pendaftaran dibuka
              </p>
              <h3
                class="mt-3 font-[Georgia,serif] text-3xl font-normal tracking-tight text-[#203f73] lg:text-4xl"
              >
                {{ wave.name }}
              </h3>
              <p class="mt-1 text-sm text-slate-600">
                Tahun Ajaran {{ wave.academicYear }}
              </p>
              <p
                v-if="wave.description"
                class="mt-4 max-w-md text-sm leading-6 text-slate-600"
              >
                {{ wave.description }}
              </p>
            </div>
          </div>

          <dl
            class="mt-8 grid gap-8 border-t border-[#203f73]/20 pt-8 lg:grid-cols-3"
          >
            <div>
              <dt class="text-sm text-slate-600">Periode pendaftaran</dt>
              <dd
                class="mt-2 font-[Georgia,serif] text-2xl text-[#203f73] lg:whitespace-nowrap"
              >
                {{ wave.dateRange }}
              </dd>
              <div
                class="mt-4 h-2 overflow-hidden rounded-full bg-[#203f73]/10"
                aria-hidden="true"
              >
                <div
                  class="h-full rounded-full bg-[#836d29] transition-[width] duration-1000 ease-out motion-reduce:transition-none"
                  :style="{ width: visible ? `${wave.periodProgress}%` : '0%' }"
                />
              </div>
              <p class="mt-2 text-xs text-slate-600">
                {{ wave.daysLeftLabel }}
              </p>
            </div>
            <div>
              <dt class="text-sm text-slate-600">Kuota</dt>
              <dd class="mt-2 font-[Georgia,serif] text-2xl text-[#203f73]">
                <template v-if="wave.remainingQuota <= 0">Penuh</template>
                <template v-else-if="wave.remainingQuota === wave.quota">
                  {{ wave.quota }} kursi
                </template>
                <template v-else>
                  Sisa {{ wave.remainingQuota }}
                  <span class="font-sans text-sm text-slate-600">
                    dari {{ wave.quota }} kursi
                  </span>
                </template>
              </dd>
              <div
                class="mt-4 h-2 overflow-hidden rounded-full bg-[#203f73]/10"
                aria-hidden="true"
              >
                <div
                  class="h-full rounded-full bg-[#203f73] transition-[width] duration-1000 ease-out motion-reduce:transition-none"
                  :style="{ width: visible ? `${wave.quotaPercent}%` : '0%' }"
                />
              </div>
              <p class="mt-2 text-xs text-slate-600">Kursi masih tersedia</p>
            </div>
            <div>
              <dt class="text-sm text-slate-600">Biaya pendaftaran</dt>
              <dd class="mt-2 font-[Georgia,serif] text-2xl text-[#203f73]">
                {{ wave.registrationFeeLabel }}
              </dd>
            </div>
          </dl>
        </article>
      </div>
    </div>
  </section>
</template>
