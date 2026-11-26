<script setup lang="ts">
import { computed } from 'vue'
import { Badge } from '@mts241alikhlash/ui/badge'
import {
  DELIVERY_MODE_LABELS,
  OFFLINE_KIND_LABELS,
  type DeliveryMode,
  type OfflineKind,
} from '../types'

const props = defineProps<{
  deliveryMode: DeliveryMode
  offlineKind: OfflineKind | null
}>()

const label = computed(() =>
  props.deliveryMode === 'OFFLINE' && props.offlineKind !== null
    ? `${DELIVERY_MODE_LABELS.OFFLINE} · ${OFFLINE_KIND_LABELS[props.offlineKind]}`
    : DELIVERY_MODE_LABELS[props.deliveryMode],
)
</script>

<template>
  <Badge :variant="deliveryMode === 'OFFLINE' ? 'secondary' : 'outline'">
    {{ label }}
  </Badge>
</template>
