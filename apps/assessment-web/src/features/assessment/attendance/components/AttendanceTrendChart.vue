<script setup lang="ts">
import {
  ChartContainer,
  ChartCrosshair,
  ChartTooltip,
  ChartTooltipContent,
  componentToString,
  type ChartConfig,
} from '@mts241alikhlash/ui/chart'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@mts241alikhlash/ui/card'
import { VisArea, VisAxis, VisLine, VisXYContainer } from '@unovis/vue'
import type { AttendanceTrendPoint } from '../types'

const props = defineProps<{
  trendData: AttendanceTrendPoint[]
}>()

const chartConfig = {
  percentage: {
    label: 'Persentase Kehadiran',
    color: 'var(--chart-1)',
  },
} satisfies ChartConfig

const x = (_d: AttendanceTrendPoint, i: number) => i
const y = (d: AttendanceTrendPoint) => d.percentage

const tickFormat = (i: number) => props.trendData[i]?.monthLabel ?? ''
const yTickFormat = (tick: number) => `${tick}%`

const tooltipTemplate = componentToString(chartConfig, ChartTooltipContent, {
  labelFormatter: (i) => props.trendData[Number(i)]?.monthLabel ?? '',
})
</script>

<template>
  <Card
    gap="none"
    class="shadow-none"
  >
    <CardHeader standard>
      <CardTitle size="md">Tren Persentase Kehadiran</CardTitle>
    </CardHeader>
    <CardContent
      variant="standard"
      class="space-y-3"
    >
      <p class="text-control text-muted-foreground">
        Perkembangan rata-rata tingkat kehadiran siswa per bulan sepanjang
        semester aktif.
      </p>
      <div
        v-if="trendData && trendData.length > 0"
        class="h-64 w-full"
      >
        <ChartContainer
          :config="chartConfig"
          class="h-full w-full"
          cursor
        >
          <VisXYContainer
            :data="trendData"
            :margin="{ top: 20, right: 20, bottom: 30, left: 45 }"
            :y-domain="[0, 100]"
          >
            <VisArea
              :x="x"
              :y="y"
              color="var(--chart-1)"
              :opacity="0.15"
              curve-type="monotoneX"
            />
            <VisLine
              :x="x"
              :y="y"
              color="var(--chart-1)"
              :stroke-width="2"
              curve-type="monotoneX"
            />
            <VisAxis
              type="x"
              :x="x"
              :tick-format="tickFormat"
              :num-ticks="trendData.length"
              :grid-line="false"
              :tick-line="false"
            />
            <VisAxis
              type="y"
              :num-ticks="5"
              :tick-format="yTickFormat"
              :grid-line="true"
              :tick-line="false"
            />
            <ChartCrosshair
              v-if="tooltipTemplate"
              :template="tooltipTemplate"
              color="var(--chart-1)"
            />
            <ChartTooltip />
          </VisXYContainer>
        </ChartContainer>
      </div>
      <p
        v-else
        class="py-6 text-center text-control text-muted-foreground"
      >
        Belum ada data kehadiran pada semester ini untuk ditampilkan.
      </p>
    </CardContent>
  </Card>
</template>
