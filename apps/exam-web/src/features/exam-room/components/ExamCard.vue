<script setup lang="ts">
import { computed } from 'vue'
import artwork from '../assets/exam-card.svg'

const props = defineProps<{
  name: string
  className: string | null
  nis: string | null
  participantNumber: string | null
  password: string | null
  roomCode: string
  eventTitle: string
  eventPeriod: string
  schoolName: string
}>()

const roomCode = computed(() => props.roomCode.trim().replace(/^[A-Za-z]+/, ''))

const shortName = computed(() => {
  const parts = props.name.trim().split(/\s+/)
  if (parts.length <= 2) return parts.join(' ')
  const [first, second, ...rest] = parts
  return `${first} ${second} ${rest
    .map((word) => `${word.charAt(0).toUpperCase()}.`)
    .join(' ')}`
})

const rows = computed(() => [
  { label: 'Nomor Peserta', value: props.participantNumber ?? '' },
  { label: 'Nama', value: shortName.value },
  {
    label: 'Kelas',
    value: (props.className ?? '').replace(/^Kelas\s+/i, ''),
  },
  { label: 'NIS', value: props.nis ?? '' },
  { label: 'Password', value: props.password ?? '' },
])
</script>

<template>
  <div
    class="exam-card"
    data-slot="exam-card"
  >
    <img
      :src="artwork"
      alt=""
      aria-hidden="true"
      class="absolute inset-0 size-full"
    />
    <p class="exam-card-heading">{{ eventTitle }}</p>
    <p class="exam-card-subheading">{{ eventPeriod }}</p>
    <p class="exam-card-school">{{ schoolName }}</p>
    <dl class="exam-card-rows">
      <template
        v-for="row in rows"
        :key="row.label"
      >
        <dt class="exam-card-label">{{ row.label }}</dt>
        <span
          class="exam-card-colon"
          aria-hidden="true"
          >:</span
        >
        <dd class="exam-card-value">{{ row.value }}</dd>
      </template>
    </dl>
    <span class="exam-card-room">{{ roomCode }}</span>
  </div>
</template>

<style scoped>
.exam-card {
  container-type: inline-size;
  position: relative;
  aspect-ratio: 658.02 / 415.59;
  overflow: hidden;
  color: #f7f0d6;
  font-family: 'Inter', ui-sans-serif, system-ui, sans-serif;
  line-height: 1;
}

.exam-card > * {
  --u: calc(100cqw / 658.02);
}

.exam-card-heading,
.exam-card-subheading,
.exam-card-school {
  position: absolute;
  left: calc(74.9 * var(--u));
  max-width: calc(268 * var(--u));
  margin: 0;
  overflow: hidden;
  font-family: 'Ruberoid', 'Inter', sans-serif;
  font-size: calc(12.6 * var(--u));
  font-weight: 800;
  line-height: 1.3;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.exam-card-heading {
  top: calc(144 * var(--u));
}

.exam-card-subheading {
  top: calc(162 * var(--u));
}

.exam-card-school {
  top: calc(180 * var(--u));
}

.exam-card-rows {
  position: absolute;
  top: calc(216 * var(--u));
  left: calc(74.9 * var(--u));
  right: calc(228 * var(--u));
  margin: 0;
  display: grid;
  grid-template-columns: max-content auto minmax(0, 1fr);
  align-items: baseline;
  column-gap: calc(6 * var(--u));
  font-size: calc(17 * var(--u));
}

.exam-card-label {
  color: inherit;
  line-height: calc(24.25 * var(--u));
}

.exam-card-colon {
  padding-inline: calc(1.2 * var(--u));
  text-align: center;
  line-height: calc(24.25 * var(--u));
}

.exam-card-value {
  margin: 0;
  min-width: 0;
  line-height: calc(24.25 * var(--u));
  overflow: hidden;
  font-weight: 500;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.exam-card-room {
  position: absolute;
  left: calc(547 * var(--u));
  top: calc(129.2 * var(--u));
  transform: translateX(-50%);
  white-space: nowrap;
  font-family: 'Tusker Grotesk', 'Inter', sans-serif;
  font-weight: 600;
  font-size: calc(244.3 * var(--u));
  line-height: 1;
}
</style>
