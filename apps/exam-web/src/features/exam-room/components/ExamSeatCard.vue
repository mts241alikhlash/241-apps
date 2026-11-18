<script setup lang="ts">
import { computed } from 'vue'
import artwork from '../assets/exam-seat.svg'

const props = defineProps<{
  seatNumber: number
  participantNumber: string | null
  name: string
  className: string | null
  roomCode: string
  eventTitle: string
  eventPeriod: string
  schoolName: string
}>()

const roomCode = computed(() => props.roomCode.trim().replace(/^[A-Za-z]+/, ''))
const seatLabel = computed(() => String(props.seatNumber).padStart(2, '0'))

const rows = computed(() => [
  { label: 'Ruang', value: roomCode.value },
  { label: 'Nomor Peserta', value: props.participantNumber ?? '-' },
  { label: 'Nama', value: props.name },
  {
    label: 'Kelas',
    value: (props.className ?? '').replace(/^Kelas\s+/i, ''),
  },
])
</script>

<template>
  <div
    class="seat-card"
    data-slot="exam-seat-card"
  >
    <img
      :src="artwork"
      alt=""
      aria-hidden="true"
      class="absolute inset-0 size-full"
    />
    <p class="seat-card-title">MEJA PESERTA</p>
    <p class="seat-card-heading">{{ eventTitle }}</p>
    <p
      v-if="eventPeriod"
      class="seat-card-subheading"
    >
      {{ eventPeriod }}
    </p>
    <p class="seat-card-school">{{ schoolName }}</p>
    <dl class="seat-card-rows">
      <template
        v-for="row in rows"
        :key="row.label"
      >
        <dt class="seat-card-key">{{ row.label }}</dt>
        <span
          class="seat-card-colon"
          aria-hidden="true"
          >:</span
        >
        <dd class="seat-card-value">{{ row.value }}</dd>
      </template>
    </dl>
    <p class="seat-card-caption">NOMOR MEJA</p>
    <span class="seat-card-number">{{ seatLabel }}</span>
  </div>
</template>

<style scoped>
.seat-card {
  container-type: inline-size;
  position: relative;
  aspect-ratio: 658.02 / 415.59;
  overflow: hidden;
  color: #f7f0d6;
  font-family: 'Inter', ui-sans-serif, system-ui, sans-serif;
  line-height: 1;
}

.seat-card > * {
  --u: calc(100cqw / 658.02);
}

.seat-card-title {
  position: absolute;
  left: calc(74.9 * var(--u));
  top: calc(112 * var(--u));
  margin: 0;
  font-family: 'Ruberoid', 'Inter', sans-serif;
  font-size: calc(34.21 * var(--u));
  font-weight: 800;
  line-height: 1;
  color: #ffffff;
  white-space: nowrap;
}

.seat-card-heading,
.seat-card-subheading,
.seat-card-school {
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

.seat-card-heading {
  top: calc(144 * var(--u));
}

.seat-card-subheading {
  top: calc(162 * var(--u));
}

.seat-card-school {
  top: calc(180 * var(--u));
}

.seat-card-rows {
  position: absolute;
  left: calc(74.9 * var(--u));
  right: calc(228 * var(--u));
  top: calc(220 * var(--u));
  margin: 0;
  display: grid;
  grid-template-columns: max-content auto minmax(0, 1fr);
  column-gap: calc(6 * var(--u));
  align-items: baseline;
  font-size: calc(17 * var(--u));
}

.seat-card-key,
.seat-card-colon,
.seat-card-value {
  line-height: calc(24.25 * var(--u));
}

.seat-card-colon {
  padding-inline: calc(1.2 * var(--u));
  text-align: center;
}

.seat-card-value {
  margin: 0;
  min-width: 0;
  overflow: hidden;
  font-weight: 500;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.seat-card-caption {
  position: absolute;
  left: calc(547 * var(--u));
  top: calc(96.2 * var(--u));
  transform: translateX(-50%);
  margin: 0;
  font-family: 'Ruberoid', 'Inter', sans-serif;
  font-size: calc(21.13 * var(--u));
  font-weight: 800;
  line-height: 1;
  color: #ffffff;
  white-space: nowrap;
}

.seat-card-number {
  position: absolute;
  left: calc(547 * var(--u));
  top: calc(129.2 * var(--u));
  transform: translateX(-50%);
  font-family: 'Tusker Grotesk', 'Inter', sans-serif;
  font-weight: 600;
  font-size: calc(244.3 * var(--u));
  line-height: 1;
  white-space: nowrap;
}
</style>
