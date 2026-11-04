<script setup lang="ts">
import { ClipboardCheck, FileCheck2, ShieldCheck } from '@lucide/vue'

const features = [
  {
    title: 'Proses terarah',
    description: 'Setiap tahap pendaftaran tersusun rapi agar mudah diikuti.',
    icon: ClipboardCheck,
  },
  {
    title: 'Berkas terorganisasi',
    description: 'Persyaratan dan unggahan dokumen dikelola dari satu tempat.',
    icon: FileCheck2,
  },
  {
    title: 'Status transparan',
    description: 'Pantau perkembangan verifikasi melalui akun pendaftaran.',
    icon: ShieldCheck,
  },
]
</script>

<template>
  <section class="relative z-10 mx-auto -mt-9 max-w-7xl px-4 sm:px-6 lg:px-8">
    <div
      class="grid overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-950/5 md:grid-cols-3"
    >
      <div
        v-for="feature in features"
        :key="feature.title"
        class="flex gap-4 border-b border-slate-100 p-6 last:border-b-0 md:border-b-0 md:border-r md:last:border-r-0"
      >
        <div
          class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"
        >
          <component
            :is="feature.icon"
            class="size-5"
            aria-hidden="true"
          />
        </div>
        <div>
          <h2 class="font-bold text-slate-900">{{ feature.title }}</h2>
          <p class="mt-1 text-sm leading-6 text-slate-600">
            {{ feature.description }}
          </p>
        </div>
      </div>
    </div>
  </section>
</template>
