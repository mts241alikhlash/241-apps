<script setup lang="ts">
import { onBeforeUnmount, onMounted, useTemplateRef, watch } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const props = withDefaults(
  defineProps<{
    latitude: number
    longitude: number
    interactive?: boolean
    zoom?: number
    title?: string
  }>(),
  { interactive: true, zoom: 16, title: '' },
)

const containerRef = useTemplateRef<HTMLDivElement>('container')

let map: L.Map | null = null
let marker: L.Marker | null = null

function createPin() {
  return L.divIcon({
    className: 'school-pin',
    html: '<span class="school-pin__dot"></span>',
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  })
}

function createMap() {
  if (!containerRef.value) return

  map = L.map(containerRef.value, {
    center: [props.latitude, props.longitude],
    zoom: props.zoom,
    dragging: props.interactive,
    scrollWheelZoom: false,
    doubleClickZoom: props.interactive,
    touchZoom: props.interactive,
    boxZoom: props.interactive,
    keyboard: props.interactive,
    zoomControl: props.interactive,
    attributionControl: true,
  })

  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(map)

  marker = L.marker([props.latitude, props.longitude], {
    icon: createPin(),
    keyboard: false,
    interactive: props.interactive,
  }).addTo(map)

  if (props.title) marker.bindTooltip(props.title, { direction: 'top' })

  requestAnimationFrame(() => map?.invalidateSize())
}

onMounted(createMap)

onBeforeUnmount(() => {
  map?.remove()
  map = null
  marker = null
})

watch(
  () => [props.latitude, props.longitude] as const,
  ([lat, lng]) => {
    if (!map || !marker) return
    const next = L.latLng(lat, lng)
    marker.setLatLng(next)
    map.setView(next, map.getZoom())
  },
)
</script>

<template>
  <div
    ref="container"
    class="school-map h-full w-full overflow-hidden isolate"
    role="img"
    :aria-label="
      title
        ? `Peta lokasi ${title}`
        : `Peta lokasi pada ${latitude}, ${longitude}`
    "
  />
</template>

<style>
.school-pin__dot {
  display: block;
  width: 18px;
  height: 18px;
  border-radius: 9999px;
  background: var(--primary);
  border: 3px solid var(--background);
  box-shadow: 0 1px 6px rgb(0 0 0 / 0.35);
}

.school-map .leaflet-container {
  background: var(--muted);
  font-family: inherit;
}

.school-map .leaflet-control-attribution {
  background: color-mix(in oklab, var(--background) 82%, transparent);
  color: var(--muted-foreground);
  font-size: 10px;
}

.school-map .leaflet-control-attribution a {
  color: var(--primary);
}
</style>
