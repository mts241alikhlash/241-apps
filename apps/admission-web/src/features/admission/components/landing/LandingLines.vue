<script setup lang="ts">
import { Fragment, h } from 'vue'

const props = defineProps<{ lines: string[] }>()

const Lines = () =>
  h(
    Fragment,
    props.lines.flatMap((line, index) =>
      index < props.lines.length - 1 ? [line, h('br')] : [line],
    ),
  )
</script>

<template>
  <Lines />
</template>
