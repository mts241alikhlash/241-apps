<script setup lang="ts">
import { ArrowLeft, ArrowRight } from '@lucide/vue'
import { useLoopCarousel } from '../../composables/useLoopCarousel'
import { imageUrl } from '../../composables/useLandingContent'
import { landingDefaults } from '../../data/landingDefaults'
import type { LandingLifeContent } from '../../types/landing'
import LandingLines from './LandingLines.vue'

const props = withDefaults(defineProps<{ content?: LandingLifeContent }>(), {
  content: () => landingDefaults.life,
})

const photos = props.content.photos.map((photo) => ({
  ...photo,
  src: imageUrl(photo.image),
}))

const { bindTrack, current, onScroll, go, loop } = useLoopCarousel(
  photos.length,
)
const loopedPhotos = loop(photos)
</script>

<template>
  <section
    id="kehidupan"
    class="school-life scroll-mt-14"
    aria-labelledby="school-life-title"
  >
    <div class="life-text">
      <div class="life-intro">
        <p class="life-label">{{ content.label }}</p>
        <h2 id="school-life-title">
          <LandingLines :lines="content.titleLines" />
        </h2>
        <p class="life-description">
          {{ content.description }}
        </p>
      </div>

      <div
        class="life-current"
        aria-live="polite"
      >
        <p class="life-photo-title">{{ photos[current].title }}</p>
        <p class="life-photo-caption">{{ photos[current].caption }}</p>
      </div>

      <div class="life-footnote">
        <p>{{ content.footnote }}</p>
        <a href="#gelombang">{{ content.linkLabel }}</a>
      </div>
    </div>

    <div class="life-stage">
      <div
        :ref="bindTrack"
        class="life-track"
        role="region"
        aria-label="Foto kegiatan MTs Persis 241 Al-Ikhlash"
        tabindex="0"
        @scroll.passive="onScroll"
      >
        <figure
          v-for="(photo, index) in loopedPhotos"
          :key="`${photo.copy}-${photo.src}`"
          class="life-card"
          :aria-hidden="photo.copy === 1 ? undefined : 'true'"
        >
          <img
            :src="photo.src"
            :alt="photo.copy === 1 ? photo.alt : ''"
            width="1600"
            height="1066"
            :loading="index === photos.length ? 'eager' : 'lazy'"
          />
        </figure>
      </div>
      <div class="life-controls">
        <button
          type="button"
          aria-label="Foto sebelumnya"
          @click="go(-1)"
        >
          <ArrowLeft
            class="size-6"
            aria-hidden="true"
          />
        </button>
        <button
          type="button"
          aria-label="Foto berikutnya"
          @click="go(1)"
        >
          <ArrowRight
            class="size-6"
            aria-hidden="true"
          />
        </button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.school-life {
  display: grid;
  gap: 2rem;
  max-width: 80rem;
  margin: auto;
  padding: 3.5rem 1.25rem;
  color: #162d53;
}
.life-text {
  display: contents;
}
.life-intro {
  order: 1;
  display: grid;
  gap: 1rem;
}
.life-label {
  font-size: 0.8125rem;
  font-weight: 600;
  color: #475569;
}
h2 {
  font-family: Georgia, 'Times New Roman', serif;
  font-size: clamp(2.2rem, 4.5vw, 3.25rem);
  font-weight: 400;
  line-height: 1.08;
  letter-spacing: -0.045em;
}
.life-description {
  max-width: 23rem;
  font-size: 0.9375rem;
  line-height: 1.8;
  color: #475569;
}
.life-current {
  order: 3;
  display: grid;
  align-content: start;
  min-height: 8.5rem;
  gap: 0.5rem;
  padding-top: 1.25rem;
  border-top: 1px solid #203f7326;
}
.life-photo-title {
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 1.5rem;
  line-height: 1.2;
}
.life-photo-caption {
  max-width: 23rem;
  font-size: 0.875rem;
  line-height: 1.7;
  color: #475569;
}
.life-stage {
  order: 2;
  position: relative;
  min-width: 0;
}
.life-controls {
  display: none;
}
.life-controls button:focus-visible,
.life-track:focus-visible {
  outline: 2px solid #203f73;
  outline-offset: 3px;
}
.life-footnote {
  order: 4;
  margin-top: auto;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem 1rem;
}
.life-footnote p {
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 1.125rem;
}
.life-footnote a {
  display: inline-flex;
  align-items: center;
  min-height: 2.75rem;
  border-bottom: 1px solid #203f73;
  font-size: 0.8125rem;
  font-weight: 600;
}
.life-footnote a:focus-visible {
  outline: 2px solid #203f73;
  outline-offset: 4px;
}
.life-track {
  display: flex;
  gap: 1rem;
  min-width: 0;
  height: 20rem;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  scrollbar-width: none;
  overscroll-behavior-x: contain;
}
.life-track::-webkit-scrollbar {
  display: none;
}
.life-card {
  flex: 0 0 85%;
  overflow: hidden;
  isolation: isolate;
  transform: translateZ(0);
  border-radius: 1rem;
  background: #e8e2d4;
  scroll-snap-align: start;
}
.life-card img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
@media (min-width: 640px) {
  .school-life {
    padding: 4.5rem 2rem;
  }
  .life-track {
    height: 26rem;
  }
  .life-card {
    flex-basis: 70%;
  }
}
@media (min-width: 1024px) {
  .school-life {
    grid-template-columns: 0.7fr 1.3fr;
    column-gap: 3rem;
    align-items: stretch;
    min-height: calc(100svh - 3.5rem);
    padding-block: 2rem;
  }
  .life-text {
    display: flex;
    flex-direction: column;
    gap: 1.75rem;
    min-width: 0;
  }
  .life-intro,
  .life-stage,
  .life-current,
  .life-footnote {
    order: initial;
  }
  .life-stage {
    align-self: center;
  }
  .life-track {
    height: min(calc(100svh - 7.5rem), 46rem);
  }
  .life-card {
    flex-basis: 78%;
  }
  .life-controls {
    display: flex;
    position: absolute;
    right: 1rem;
    bottom: 1rem;
    gap: 0.25rem;
  }
  .life-controls button {
    display: grid;
    place-items: center;
    width: 2rem;
    height: 2rem;
    color: #fff;
    cursor: pointer;
    filter: drop-shadow(0 1px 3px #0009);
    transition: transform 150ms ease;
  }
  .life-controls button:hover {
    transform: scale(1.15);
  }
}
</style>
