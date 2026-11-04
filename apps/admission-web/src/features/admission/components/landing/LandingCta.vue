<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { Button } from '@mts241alikhlash/ui/button'
import { landingDefaults } from '../../data/landingDefaults'
import { imageUrl } from '../../composables/useLandingContent'
import type { LandingClosingContent } from '../../types/landing'

withDefaults(defineProps<{ content?: LandingClosingContent }>(), {
  content: () => landingDefaults.closing,
})
</script>

<template>
  <section
    class="closing-admission"
    aria-labelledby="closing-title"
  >
    <div class="closing-photo landing-photo-reveal">
      <img
        :src="imageUrl(content.photo.image)"
        :alt="content.photo.alt"
        width="1600"
        height="1066"
        loading="lazy"
      />
    </div>
    <div class="closing-copy">
      <h2 id="closing-title">{{ content.title }}</h2>
      <p class="closing-description">
        {{ content.description }}
      </p>
      <Button
        as-child
        size="lg"
        class="closing-button"
      >
        <RouterLink to="/login">{{ content.registerLabel }}</RouterLink>
      </Button>
      <a
        href="#persyaratan"
        class="closing-requirements"
        >{{ content.requirementsLabel }}</a
      >
    </div>
  </section>
</template>

<style scoped>
.closing-admission {
  display: grid;
  background: #203f73;
  color: white;
}
.closing-photo {
  min-width: 0;
}
.closing-photo img {
  width: 100%;
  height: 100%;
  aspect-ratio: 1.9;
  object-fit: cover;
}
.closing-copy {
  padding: 2.5rem 1.25rem 3rem;
}
h2 {
  font-family: Georgia, 'Times New Roman', serif;
  font-size: clamp(2.1rem, 3.8vw, 3.25rem);
  font-weight: 400;
  line-height: 1.08;
  letter-spacing: -0.045em;
}
.closing-description {
  max-width: 23rem;
  margin-top: 1.5rem;
  color: #e2e8f0;
  font-size: 0.9375rem;
  line-height: 1.85;
}
.closing-button {
  margin-top: 1.75rem;
  min-height: 3rem;
  padding-inline: 1.5rem;
  background: #e5cc87;
  color: #162d53;
  font-weight: 700;
}
.closing-button:hover {
  background: #f0db9f;
}
.closing-requirements {
  display: flex;
  align-items: center;
  width: fit-content;
  min-height: 2.75rem;
  margin-top: 0.75rem;
  font-size: 0.75rem;
  text-decoration: underline;
  text-underline-offset: 4px;
}
.closing-requirements:focus-visible {
  outline: 2px solid #e5cc87;
  outline-offset: 4px;
}
@media (min-width: 640px) {
  .closing-admission {
    grid-template-columns: 0.85fr 1.15fr;
  }
  .closing-photo img {
    aspect-ratio: auto;
    object-position: 35% center;
  }
  .closing-copy {
    padding: 3.5rem 2rem;
  }
}
@media (min-width: 1024px) {
  .closing-admission {
    grid-template-columns: 1fr 1fr;
    min-height: calc(100svh - 3.5rem);
  }
  .closing-copy {
    align-self: center;
    padding: 2rem max(3rem, calc((100vw - 76rem) / 2)) 2rem 4rem;
  }
}
</style>
