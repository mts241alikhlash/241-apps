<script setup lang="ts">
import { ref } from 'vue'
import { ArrowLeft, ArrowRight } from '@lucide/vue'

const slides = [
  {
    src: '/hero/baiat.webp',
    title: "Bai'at Santri",
    caption:
      'Upacara rutin tempat santri berikrar dan menumbuhkan kedisiplinan.',
  },
  {
    src: '/hero/tahfidz.webp',
    title: "Tahfidz Al-Qur'an",
    caption:
      "Program unggulan madrasah untuk mencetak generasi penghafal Al-Qur'an.",
  },
  {
    src: '/hero/mabit-rg.webp',
    title: 'Mabit Rijaalul Ghad',
    caption:
      'Program pembentukan iman, takwa, dan karakter santri melalui bina malam.',
  },
  {
    src: '/hero/mabit-ug.webp',
    title: 'Mabit Ummahatul Ghad',
    caption:
      'Program pembentukan iman, takwa, dan karakter santri melalui bina malam.',
  },
  {
    src: '/hero/rapat-orangtua.webp',
    title: 'Rapat Orang Tua',
    caption: 'Madrasah dan orang tua berjalan bersama.',
  },
  {
    src: '/hero/inhouse-training.webp',
    title: 'In-House Training Guru',
    caption: 'Guru terus belajar demi mutu pendidikan yang lebih baik.',
  },
  {
    src: '/hero/rapat-evaluasi.webp',
    title: 'Rapat Evaluasi',
    caption: 'Evaluasi bersama agar pembelajaran terus membaik.',
  },
]

const current = ref(0)

function go(step: number) {
  current.value = (current.value + step + slides.length) % slides.length
}
</script>

<template>
  <div class="hero relative hidden p-4 lg:block">
    <div class="relative h-full overflow-hidden rounded-4xl">
      <img
        v-for="(slide, index) in slides"
        :key="slide.src"
        :src="slide.src"
        alt=""
        class="absolute inset-0 h-full w-full object-cover transition-opacity duration-700"
        :class="index === current ? 'opacity-100' : 'opacity-0'"
      />
      <div
        class="absolute inset-0 bg-linear-to-t from-black/20 via-transparent to-transparent"
      />

      <div
        class="absolute bottom-4 left-4 w-max max-w-[calc(100%-6rem)] rounded-2xl border border-(--hero-bg)/10 bg-(--hero-bg)/5 p-3 text-white backdrop-blur-sm"
        aria-live="polite"
      >
        <p class="text-xs font-medium text-white/80">
          {{ slides[current].title }}
        </p>
        <p class="mt-0.5 text-[11px] text-white/60">
          {{ slides[current].caption }}
        </p>
      </div>
    </div>

    <div class="hero-notch hero-notch-top">
      <button
        type="button"
        aria-label="Foto sebelumnya"
        class="relative z-10 flex size-10 items-center justify-center rounded-full bg-card text-foreground transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        @click="go(-1)"
      >
        <ArrowLeft class="size-4" />
      </button>
    </div>

    <div class="hero-notch hero-notch-bottom">
      <button
        type="button"
        aria-label="Foto berikutnya"
        class="relative z-10 flex size-10 items-center justify-center rounded-full bg-card text-foreground transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        @click="go(1)"
      >
        <ArrowRight class="size-4" />
      </button>
    </div>
  </div>
</template>

<style scoped>
.hero {
  --hero-bg: color-mix(in oklab, var(--muted) 50%, var(--background));
  background: var(--hero-bg);
}

.hero-notch {
  position: absolute;
  box-sizing: border-box;
  width: 56px;
  height: 56px;
  padding: 8px;
  border-radius: 50%;
  background: var(--hero-bg);
}

.hero-notch::before,
.hero-notch::after {
  content: '';
  position: absolute;
}

.hero-notch::before {
  width: 48px;
  height: 20px;
}

.hero-notch::after {
  width: 20px;
  height: 48px;
}

.hero-notch-top {
  top: calc(1rem - 8px);
  left: calc(1rem - 8px);
}

.hero-notch-top::before {
  top: 8px;
  left: 28px;
  background: radial-gradient(
    circle 20px at 100% 20px,
    transparent 19.5px,
    var(--hero-bg) 20px
  );
}

.hero-notch-top::after {
  top: 28px;
  left: 8px;
  background: radial-gradient(
    circle 20px at 20px 100%,
    transparent 19.5px,
    var(--hero-bg) 20px
  );
}

.hero-notch-bottom {
  right: calc(1rem - 8px);
  bottom: calc(1rem - 8px);
}

.hero-notch-bottom::before {
  right: 28px;
  bottom: 8px;
  background: radial-gradient(
    circle 20px at 0 calc(100% - 20px),
    transparent 19.5px,
    var(--hero-bg) 20px
  );
}

.hero-notch-bottom::after {
  right: 8px;
  bottom: 28px;
  background: radial-gradient(
    circle 20px at calc(100% - 20px) 0,
    transparent 19.5px,
    var(--hero-bg) 20px
  );
}
</style>
