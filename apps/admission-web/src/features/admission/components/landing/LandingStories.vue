<script setup lang="ts">
import { ArrowLeft, ArrowRight } from '@lucide/vue'
import { useInView } from '../../composables/useInView'
import { useLoopCarousel } from '../../composables/useLoopCarousel'
import { imageUrl } from '../../composables/useLandingContent'
import { landingDefaults } from '../../data/landingDefaults'
import type { LandingStoriesContent } from '../../types/landing'

const props = withDefaults(defineProps<{ content?: LandingStoriesContent }>(), {
  content: () => landingDefaults.stories,
})

const stories = props.content.items.map((story, index) => ({
  id: `story-${index}`,
  kind: story.kind,
  quote: story.quote,
  name: story.name,
  position: story.position,
  tags: story.tags,
  photoUrl: story.photo ? imageUrl(story.photo) : null,
  placeholder: story.placeholder ?? false,
}))

const canScroll = stories.length > 1

const { bindTrack, current, middleCopy, onScroll, go, goTo, loop } =
  useLoopCarousel(stories.length)
const slides = loop(stories)

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

const { target, visible } = useInView()
</script>

<template>
  <section
    v-if="stories.length"
    id="cerita"
    :ref="target"
    class="school-stories scroll-mt-14"
    aria-labelledby="stories-title"
  >
    <div class="stories-inner">
      <div class="stories-heading">
        <div>
          <p class="stories-label">{{ content.label }}</p>
          <h2 id="stories-title">
            {{ content.title }}
          </h2>
        </div>
        <p class="stories-note">
          {{ content.description }}
        </p>
      </div>

      <div
        class="stories-stage"
        :class="{ 'stories-stage-in': visible }"
      >
        <div
          :ref="bindTrack"
          class="stories-track"
          role="region"
          aria-label="Cerita keluarga MTs Persis 241 Al-Ikhlash"
          :tabindex="canScroll ? 0 : undefined"
          @scroll.passive="onScroll"
        >
          <figure
            v-for="story in slides"
            :key="`${story.copy}-${story.id}`"
            class="story-slide"
            :aria-hidden="story.copy === middleCopy ? undefined : 'true'"
          >
            <div class="story-body">
              <p class="story-kind">
                {{ story.kind }}
                <span v-if="story.placeholder">Contoh</span>
              </p>
              <blockquote class="story-quote">{{ story.quote }}</blockquote>
              <div class="story-person">
                <span class="story-name">{{ story.name }}</span>
                <span
                  v-if="story.position"
                  class="story-position"
                  >{{ story.position }}</span
                >
                <span
                  v-if="story.tags?.length"
                  class="story-tags"
                >
                  <small
                    v-for="tag in story.tags"
                    :key="tag"
                    >{{ tag }}</small
                  >
                </span>
              </div>
            </div>

            <div class="story-aside">
              <div class="story-visual">
                <img
                  v-if="story.photoUrl"
                  :src="story.photoUrl"
                  :alt="story.copy === middleCopy ? story.name : ''"
                  loading="lazy"
                />
                <span
                  v-else
                  class="story-initials"
                  aria-hidden="true"
                  >{{ initials(story.name) }}</span
                >
              </div>
            </div>
          </figure>
        </div>

        <div
          v-if="canScroll"
          class="stories-controls"
        >
          <button
            type="button"
            aria-label="Cerita sebelumnya"
            @click="go(-1)"
          >
            <ArrowLeft
              class="size-6"
              aria-hidden="true"
            />
          </button>
          <ol class="stories-dots">
            <li
              v-for="(story, index) in stories"
              :key="story.id"
            >
              <button
                type="button"
                :aria-label="`Cerita ${index + 1}: ${story.name}`"
                :aria-current="index === current ? 'true' : undefined"
                :class="{ 'is-active': index === current }"
                @click="goTo(index)"
              />
            </li>
          </ol>
          <button
            type="button"
            aria-label="Cerita berikutnya"
            @click="go(1)"
          >
            <ArrowRight
              class="size-6"
              aria-hidden="true"
            />
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.school-stories {
  background: #f5f2e9;
  color: #162d53;
}
.stories-inner {
  max-width: 80rem;
  margin: auto;
  padding: 3.5rem 1.25rem;
}
.stories-label {
  font-size: 0.8125rem;
  font-weight: 600;
  color: #475569;
}
.stories-heading {
  display: grid;
  gap: 1rem;
}
h2 {
  margin-top: 0.75rem;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: clamp(2rem, 3.6vw, 2.75rem);
  font-weight: 400;
  line-height: 1.1;
  letter-spacing: -0.04em;
}
.stories-note {
  max-width: 28rem;
  font-size: 0.875rem;
  line-height: 1.8;
  color: #475569;
}
.stories-stage {
  position: relative;
  margin-top: 1.75rem;
  opacity: 0;
  transform: translateY(1rem);
  transition:
    opacity 600ms ease-out,
    transform 600ms ease-out;
}
.stories-stage-in {
  opacity: 1;
  transform: none;
}
.stories-track {
  display: flex;
  gap: 1rem;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  scrollbar-width: none;
  overscroll-behavior-x: contain;
}
.stories-track::-webkit-scrollbar {
  display: none;
}
.stories-track:focus-visible,
.stories-controls button:focus-visible {
  outline: 2px solid #203f73;
  outline-offset: 3px;
}
.story-slide {
  display: grid;
  flex: 0 0 100%;
  overflow: hidden;
  isolation: isolate;
  transform: translateZ(0);
  border-radius: 2rem;
  background: #fff;
  scroll-snap-align: start;
}
.story-aside {
  order: -1;
  display: flex;
  flex-direction: column;
}
.story-visual {
  flex: 1;
  min-height: 14rem;
  background: #e5cc87;
}
.story-visual img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.story-initials {
  display: grid;
  height: 100%;
  place-content: center;
  color: #162d53;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 5rem;
}
.story-body {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  gap: 1rem;
  min-height: 0;
  padding: 1.75rem 1.5rem 4.5rem;
}
.story-kind {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8125rem;
  font-weight: 600;
  color: #836d29;
}
.story-kind span {
  padding: 0.1rem 0.4rem;
  border: 1px solid currentColor;
  font-size: 0.625rem;
  font-weight: 400;
}
.story-quote {
  font-family: Georgia, 'Times New Roman', serif;
  font-size: clamp(1.1rem, 1.8vw, 1.5rem);
  line-height: 1.5;
  color: #162d53;
  overflow: hidden;
}
.story-person {
  display: grid;
  gap: 0.2rem;
  justify-self: end;
  color: #203f73;
  text-align: right;
}
.story-name {
  font-size: 1rem;
  font-weight: 700;
}
.story-position {
  font-size: 0.875rem;
  font-weight: 500;
  color: #836d29;
}
.story-tags {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 0.25rem;
}
.story-tags small {
  padding: 0.2rem 0.65rem;
  border-radius: 9999px;
  background: #203f7314;
  font-size: 0.75rem;
  font-weight: 500;
  color: #203f73;
}
.stories-controls {
  position: absolute;
  bottom: 1rem;
  left: 1rem;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  color: #203f73;
}
.stories-controls > button {
  display: grid;
  place-items: center;
  width: 2.5rem;
  height: 2.5rem;
  cursor: pointer;
  transition: transform 150ms ease;
}
.stories-controls > button:hover {
  transform: scale(1.15);
}
.stories-dots {
  display: flex;
  align-items: center;
}
.stories-dots button {
  display: grid;
  place-items: center;
  width: 1.25rem;
  height: 2.5rem;
  cursor: pointer;
}
.stories-dots button::before {
  content: '';
  width: 0.4rem;
  height: 0.4rem;
  border-radius: 9999px;
  background: #203f7340;
  transition:
    width 200ms ease,
    background-color 200ms ease;
}
.stories-dots button.is-active::before {
  width: 1.1rem;
  background: #203f73;
}
@media (min-width: 640px) {
  .stories-inner {
    padding: 4.5rem 2rem;
  }
  .story-body {
    padding: 2.25rem 2rem 4.5rem;
  }
  .stories-controls {
    bottom: 1.25rem;
    left: 2rem;
  }
}
@media (min-width: 1024px) {
  .school-stories {
    display: flex;
    align-items: center;
    min-height: calc(100svh - 3.5rem);
  }
  .stories-inner {
    width: 100%;
    padding-block: 2rem;
  }
  .stories-heading {
    grid-template-columns: 1.2fr 0.8fr;
    align-items: end;
    gap: 4rem;
  }
  .story-slide {
    grid-template-columns: 1.4fr 0.6fr;
    height: min(calc(100svh - 18.5rem), 34rem);
  }
  .story-aside {
    order: 0;
    min-height: 0;
  }
  .story-visual {
    min-height: 0;
  }
  .story-body {
    padding: 2.5rem 3rem 1.5rem;
  }
  .story-person {
    max-width: 60%;
  }
  .stories-controls {
    bottom: 1.5rem;
    left: 3rem;
  }
}
@media (prefers-reduced-motion: reduce) {
  .stories-stage {
    opacity: 1;
    transform: none;
    transition: none;
  }
}
</style>
