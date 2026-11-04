<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, watchEffect } from 'vue'
import type { LabelUnit } from '../types'
import {
  CELL_PADDING_MM,
  DEFAULT_PAPER_ID,
  LABEL_HEIGHT_MM,
  LABEL_WIDTH_MM,
  NUMBER_FONT_MM,
  PAGE_MARGIN_MM,
  labelSheetLayout,
  nameFontMm,
  paginateLabels,
} from '../logic/labelSheetLayout'

const props = withDefaults(
  defineProps<{
    units: LabelUnit[]
    paperSize?: string
  }>(),
  { paperSize: DEFAULT_PAPER_ID },
)

const layout = computed(() => labelSheetLayout(props.paperSize))
const pages = computed(() =>
  paginateLabels(props.units, layout.value.labelsPerPage),
)

const sheetStyle = computed(() => ({
  '--label-cols': String(layout.value.columns),
  '--cell-w': `${layout.value.cellWidthMm}mm`,
  '--cell-h': `${layout.value.cellHeightMm}mm`,
  '--cell-pad': `${CELL_PADDING_MM}mm`,
  '--label-w': `${LABEL_WIDTH_MM}mm`,
  '--label-h': `${LABEL_HEIGHT_MM}mm`,
  '--font-number': `${NUMBER_FONT_MM}mm`,
}))

function nameStyle(name: string) {
  return { fontSize: `${nameFontMm(name)}mm` }
}

const PAGE_STYLE_ID = 'unit-label-page-size'

function applyPageSize() {
  const { paper } = layout.value
  let style = document.getElementById(PAGE_STYLE_ID) as HTMLStyleElement | null
  if (!style) {
    style = document.createElement('style')
    style.id = PAGE_STYLE_ID
    document.head.appendChild(style)
  }
  style.textContent =
    `@page { size: ${paper.widthMm}mm ${paper.heightMm}mm;` +
    ` margin: ${PAGE_MARGIN_MM}mm; }`
}

watchEffect(applyPageSize)

onBeforeUnmount(() => {
  document.getElementById(PAGE_STYLE_ID)?.remove()
})

async function print() {
  applyPageSize()
  await nextTick()
  window.print()
}

defineExpose({ print })
</script>

<template>
  <Teleport to="body">
    <div
      class="unit-label-print"
      :style="sheetStyle"
    >
      <section
        v-for="(page, index) in pages"
        :key="index"
        class="label-page"
      >
        <div class="label-grid">
          <div
            v-for="u in page"
            :key="u.id"
            class="label-cell"
          >
            <div class="label-card">
              <div class="label-logo-box">
                <img
                  src="/logo.webp"
                  alt=""
                  class="label-logo"
                />
              </div>
              <div class="label-text">
                <div class="label-row label-number">
                  <span class="label-value">{{ u.unitNumber }}</span>
                </div>
                <div class="label-row label-name">
                  <span
                    class="label-value"
                    :style="nameStyle(u.assetName)"
                  >
                    {{ u.assetName }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  </Teleport>
</template>

<style>
.unit-label-print {
  display: none;
}

@media print {
  body > *:not(.unit-label-print) {
    display: none !important;
  }
  .unit-label-print {
    display: block !important;
    background: #fff;
  }

  .unit-label-print .label-page {
    page-break-after: always;
    break-after: page;
  }

  .unit-label-print .label-page:last-child {
    page-break-after: auto;
    break-after: auto;
  }

  .unit-label-print .label-grid {
    display: grid;

    grid-template-columns: repeat(var(--label-cols, 3), var(--cell-w));
    justify-content: center;
    gap: 0;
    border-top: 0.15mm dashed #999;
    border-left: 0.15mm dashed #999;
  }
  .unit-label-print .label-cell {
    box-sizing: border-box;

    width: var(--cell-w);
    height: var(--cell-h);
    padding: var(--cell-pad);
    border-right: 0.15mm dashed #999;
    border-bottom: 0.15mm dashed #999;
    page-break-inside: avoid;
    break-inside: avoid;
  }

  .unit-label-print .label-card {
    display: flex;
    align-items: stretch;
    width: var(--label-w);
    height: var(--label-h);
    border: 0.3mm solid #000;
    overflow: hidden;
    font-family: 'DM Sans', ui-sans-serif, system-ui, sans-serif;
    color: #000;
  }

  .unit-label-print .label-logo-box {
    flex: 0 0 auto;
    height: 100%;
    aspect-ratio: 1 / 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.8mm;
    border-right: 0.3mm solid #000;
  }
  .unit-label-print .label-logo {
    display: block;
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
  }

  .unit-label-print .label-text {
    flex: 1 1 auto;
    min-width: 0;
    display: flex;
    flex-direction: column;
  }
  .unit-label-print .label-row {
    flex: 1 1 50%;
    min-height: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 0.4mm 1.2mm;
    line-height: 1.15;
    overflow: hidden;
  }

  .unit-label-print .label-value {
    max-width: 100%;
    overflow: hidden;
  }
  .unit-label-print .label-number {
    border-bottom: 0.3mm solid #000;
    font-size: var(--font-number);
    font-weight: 700;
  }

  .unit-label-print .label-number .label-value {
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  .unit-label-print .label-name .label-value {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    word-break: break-word;
  }
}
</style>
