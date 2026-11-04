<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { ReferenceDataListView } from '@/reference-data'
import { useReferenceListConfig } from '../config'
import { REFERENCE_LISTS } from '../lists'

const route = useRoute()
const list = computed(() =>
  REFERENCE_LISTS.find((l) => l.path === route.meta.referenceList)!,
)
const config = computed(() => useReferenceListConfig(list.value))
</script>

<template>
  <div class="space-y-6 p-4 sm:p-6">
    <ReferenceDataListView
      :key="list.path"
      :config="config"
    />
  </div>
</template>
