<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { Button } from '@mts241alikhlash/ui/button'
import type { ActiveWave } from '../../types'
import type { LandingHeroContent } from '../../types/landing'
import { landingDefaults } from '../../data/landingDefaults'
import { imageUrl } from '../../composables/useLandingContent'
import LandingLines from './LandingLines.vue'

const props = withDefaults(
  defineProps<{
    wave: ActiveWave | null
    loading: boolean
    error: boolean
    content?: LandingHeroContent
  }>(),
  { content: () => landingDefaults.hero },
)

const waveDetails = computed(() => {
  if (!props.wave) return null

  return {
    academicYear: props.wave.academicYear,
    name: props.wave.name,
  }
})
</script>

<template>
  <section class="landing-hero">
    <div class="hero-spread">
      <div class="hero-copy">
        <p class="hero-school">
          {{ content.eyebrow }}
        </p>
        <h1><LandingLines :lines="content.titleLines" /></h1>
        <p class="hero-description">
          {{ content.description }}
        </p>
        <div class="hero-actions">
          <Button
            as-child
            size="lg"
            class="hero-register"
          >
            <RouterLink to="/login">{{ content.registerLabel }}</RouterLink>
          </Button>
          <a
            href="#alur"
            class="hero-guide"
            >{{ content.guideLabel }}</a
          >
        </div>
        <a
          href="#kehidupan"
          class="hero-explore"
        >
          <span
            class="explore-line"
            aria-hidden="true"
          />
          {{ content.exploreLabel }}
        </a>
      </div>

      <div class="hero-photographs">
        <figure class="hero-school-photo">
          <img
            :src="imageUrl(content.schoolPhoto.image)"
            :alt="content.schoolPhoto.alt"
            width="1600"
            height="1066"
            fetchpriority="high"
          />
          <figcaption>
            {{ content.schoolPhoto.caption }}
          </figcaption>
        </figure>
        <figure class="hero-study-photo">
          <img
            :src="imageUrl(content.studyPhoto.image)"
            :alt="content.studyPhoto.alt"
            width="1600"
            height="1066"
          />
          <figcaption>
            {{ content.studyPhoto.title }}
            <span>{{ content.studyPhoto.tag }}</span>
          </figcaption>
        </figure>
        <p class="hero-photo-note">
          <LandingLines :lines="content.photoNoteLines" />
        </p>
      </div>
    </div>

    <div class="hero-admission-strip">
      <div class="hero-admission-inner">
        <div
          v-if="loading"
          role="status"
          class="text-sm"
        >
          Memuat informasi gelombang pendaftaran...
        </div>
        <template v-else-if="waveDetails">
          <div class="min-w-0">
            <p class="text-xs font-semibold text-[#475569]">
              Gelombang pendaftaran dibuka
            </p>
            <p class="mt-1 text-base font-semibold sm:text-lg">
              {{ waveDetails.name }} · Tahun Ajaran
              {{ waveDetails.academicYear }}
            </p>
          </div>
          <a
            href="#gelombang"
            class="inline-flex min-h-11 shrink-0 items-center self-start border-b border-[#203f73] text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#203f73]"
            >Lihat jadwal dan biaya</a
          >
        </template>
        <p
          v-else
          class="text-sm leading-6"
        >
          {{
            error
              ? 'Informasi gelombang belum dapat dimuat. Coba lagi melalui tombol di bawah.'
              : 'Belum ada gelombang yang dibuka. Periksa halaman ini kembali untuk jadwal berikutnya.'
          }}
        </p>
      </div>
    </div>
  </section>
</template>

<style scoped>
.landing-hero {
  display: flex;
  flex-direction: column;
  background: #203f73;
  color: #fff;
}
@media (min-width: 1024px) {
  .landing-hero {
    min-height: calc(100svh - 3.5rem);
  }
  .hero-spread {
    flex: 1;
    align-content: center;
    width: 100%;
    padding-block: 2rem;
  }
}
.hero-spread {
  max-width: 80rem;
  margin: auto;
  padding: 3rem 1.25rem 2.25rem;
  display: grid;
  gap: 2.5rem;
}
.hero-copy {
  min-width: 0;
}
.hero-school {
  max-width: 25rem;
  font-size: 0.8125rem;
  line-height: 1.8;
  color: #e5cc87;
}
h1 {
  margin-top: 1.5rem;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: clamp(2.6rem, 5.7vw, 5rem);
  font-weight: 400;
  letter-spacing: -0.055em;
  line-height: 1.06;
}
.hero-description {
  max-width: 24rem;
  margin-top: 1.5rem;
  font-size: 0.9375rem;
  line-height: 1.85;
  color: #e2e8f0;
}
.hero-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem 1.5rem;
  margin-top: 1.75rem;
}
.hero-register {
  min-height: 3rem;
  padding-inline: 1.5rem;
  background: #e5cc87;
  color: #162d53;
  font-weight: 700;
  border-radius: 0.375rem;
}
.hero-register:hover {
  background: #f0db9f;
}
.hero-guide {
  display: inline-flex;
  align-items: center;
  min-height: 2.75rem;
  font-size: 0.8125rem;
  border-bottom: 1px solid #b9c9df;
}
.hero-guide:focus-visible,
.hero-explore:focus-visible {
  outline: 2px solid #e5cc87;
  outline-offset: 5px;
}
.hero-explore {
  display: flex;
  width: fit-content;
  align-items: center;
  gap: 0.75rem;
  min-height: 2.75rem;
  margin-top: 1.75rem;
  font-size: 0.75rem;
  color: #e2e8f0;
}
.explore-line {
  width: 1.75rem;
  height: 1px;
  background: #e5cc87;
  transition: width 180ms ease;
}
.hero-explore:hover .explore-line {
  width: 2.5rem;
}
.hero-photographs {
  position: relative;
  min-width: 0;
  padding: 0 0 3.25rem 0.75rem;
  order: -1;
}
.hero-school-photo {
  position: relative;
  margin-right: 0.5rem;
}
.hero-school-photo img {
  width: 100%;
  aspect-ratio: 1.14;
  object-fit: cover;
  object-position: 43% center;
  border-radius: 45% 45% 0 0;
}
.hero-school-photo figcaption {
  padding-top: 0.75rem;
  padding-left: 43%;
  font-size: 0.625rem;
  color: #e2e8f0;
}
.hero-study-photo {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 41%;
  padding: 0.4rem;
  background: #f5f2e9;
  color: #162d53;
  transform: rotate(-5deg);
  box-shadow: 0 10px 25px #10274733;
}
.hero-study-photo img {
  aspect-ratio: 1.3;
  width: 100%;
  height: auto;
  object-fit: cover;
}
.hero-study-photo figcaption {
  padding: 0.5rem 0.25rem 0.15rem;
  font-size: 0.625rem;
  font-weight: 600;
}
.hero-study-photo figcaption span {
  display: block;
  margin-top: 0.2rem;
  font-size: 0.5625rem;
  font-weight: 400;
  color: #475569;
}
.hero-photo-note {
  position: absolute;
  right: 0;
  bottom: 0;
  font-family: Georgia, 'Times New Roman', serif;
  font-style: italic;
  font-size: 1.25rem;
  line-height: 1.3;
  color: #e5cc87;
}
.hero-admission-strip {
  background: #f5f2e9;
  color: #203f73;
}
.hero-admission-inner {
  max-width: 80rem;
  margin: auto;
  padding: 1.5rem 1.25rem;
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 1rem;
  align-items: center;
}
@media (min-width: 640px) {
  .hero-spread {
    padding: 3.5rem 2rem;
    grid-template-columns: 1.05fr 0.95fr;
    align-items: center;
    gap: 1.5rem;
  }
  .hero-photographs {
    order: 0;
  }
  h1 {
    font-size: clamp(2.9rem, 5.7vw, 5rem);
  }
  .hero-study-photo {
    width: 44%;
  }
  .hero-photo-note {
    font-size: 1.375rem;
  }
  .hero-admission-inner {
    padding: 1.5rem 2rem;
  }
}
@media (min-width: 1024px) {
  .hero-spread {
    padding-top: 2rem;
    padding-bottom: 2rem;
    grid-template-columns: 1fr 1fr;
    gap: 3rem;
  }
  .hero-school-photo {
    margin-left: 3.5rem;
    margin-right: 1rem;
  }
  .hero-school-photo img {
    aspect-ratio: 1.1;
  }
  .hero-school-photo figcaption {
    padding-left: 33%;
    font-size: 0.6875rem;
  }
  .hero-description {
    font-size: 1rem;
    margin-top: 1.25rem;
  }
  .hero-explore {
    margin-top: 1.5rem;
  }
  .hero-study-photo {
    left: 0.5rem;
    bottom: 0.5rem;
    width: 43%;
    padding: 0.625rem;
  }
  .hero-study-photo figcaption {
    font-size: 0.75rem;
  }
  .hero-study-photo figcaption span {
    font-size: 0.625rem;
  }
  .hero-photo-note {
    bottom: 0;
    right: 1rem;
    font-size: 1.625rem;
  }
}
@media (prefers-reduced-motion: no-preference) {
  .hero-copy {
    animation: hero-enter 650ms ease-out both;
  }
  .hero-school-photo {
    animation: photo-enter 850ms ease-out both;
  }
  .hero-study-photo {
    animation: study-enter 900ms ease-out both;
  }
}
@keyframes hero-enter {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
@keyframes photo-enter {
  from {
    opacity: 0;
    transform: translateY(22px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
@keyframes study-enter {
  from {
    opacity: 0;
    transform: translateY(20px) rotate(0);
  }
  to {
    opacity: 1;
    transform: translateY(0) rotate(-5deg);
  }
}
@media (prefers-reduced-motion: reduce) {
  .explore-line {
    transition: none;
  }
}
</style>
