<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useRouteCategory } from '@/features/exam-shared/useRouteCategory'
import { Plus } from '@lucide/vue'
import { useAuthSession } from '@mts241alikhlash/platform/auth'
import { Button } from '@mts241alikhlash/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@mts241alikhlash/ui/card'
import { examTypeLabel } from '@/features/exam-shared/examType'
import { examActivityApi } from '../api/examActivityApi'
import AttachPackageDialog from '../components/AttachPackageDialog.vue'
import { activityStatusLabel, type ExamActivityRecord } from '../types'

const router = useRouter()
const { hasPermission } = useAuthSession()

const { category, sectionPrefix } = useRouteCategory()
const canManage = computed(() => hasPermission('exam-schedules.manage'))
const heading = computed(() =>
  category.value === 'NON_EXAM' ? 'Kegiatan Non-ujian' : 'Kegiatan Ujian',
)

const activities = ref<ExamActivityRecord[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const attachTarget = ref<ExamActivityRecord | null>(null)

function formatWindow(item: ExamActivityRecord): string {
  const fmt = new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
  return `${fmt.format(new Date(item.startsAt))} – ${fmt.format(new Date(item.endsAt))}`
}

async function load(): Promise<void> {
  loading.value = true
  error.value = null
  try {
    const response = await examActivityApi.list(
      category.value ? { category: category.value } : undefined,
    )
    activities.value = response
  } catch {
    error.value = 'Gagal memuat daftar kegiatan.'
  } finally {
    loading.value = false
  }
}

watch(category, () => void load())
onMounted(load)
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <Card
      gap="none"
      class="flex min-h-0 flex-1 flex-col overflow-hidden"
    >
      <CardHeader standard>
        <CardTitle class="font-semibold">{{ heading }}</CardTitle>
        <Button
          v-if="hasPermission('exam-schedules.manage')"
          class="shrink-0"
          @click="router.push(`${sectionPrefix}/activities/new`)"
        >
          <Plus class="size-4" />
          Buat kegiatan
        </Button>
      </CardHeader>
      <CardContent
        class="flex min-h-0 flex-1 flex-col overflow-auto p-4 sm: p-4 space-y-4"
      >
        <div
          v-if="error !== null"
          role="alert"
          class="space-y-3 rounded-md border p-4"
        >
          <p class="text-control">{{ error }}</p>
          <Button
            variant="outline"
            @click="load"
          >
            Coba lagi
          </Button>
        </div>

        <p
          v-else-if="loading"
          class="text-control text-muted-foreground"
        >
          Memuat daftar kegiatan…
        </p>

        <p
          v-else-if="activities.length === 0"
          class="py-8 text-center text-control text-muted-foreground"
        >
          Belum ada kegiatan pada seksi ini.
        </p>

        <ul
          v-else
          class="divide-y rounded-md border"
        >
          <li
            v-for="item in activities"
            :key="item.id"
            class="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div class="min-w-0 space-y-1">
              <div class="flex flex-wrap items-center gap-2">
                <span class="font-medium">
                  {{ item.type ? examTypeLabel(item.type) : 'Kegiatan' }}
                </span>
                <span
                  class="rounded border px-2 py-0.5 text-xs text-muted-foreground"
                >
                  {{ activityStatusLabel(item.status) }}
                </span>
                <span
                  v-if="item.packageId === null"
                  class="text-xs text-warning"
                >
                  Menunggu paket
                </span>
              </div>
              <p
                v-if="item.subjectName"
                class="text-control font-medium"
              >
                {{ item.subjectName
                }}{{ item.gradeName ? ' · ' + item.gradeName : '' }}
              </p>
              <p class="text-control text-muted-foreground">
                {{ formatWindow(item) }} · {{ item.durationMinutes }} menit ·
                {{
                  item.tokenMode === 'ROTATING'
                    ? 'Token berputar'
                    : 'Token tetap'
                }}
              </p>
            </div>
            <div class="flex shrink-0 flex-wrap gap-2 self-start sm:self-auto">
              <Button
                v-if="item.packageId === null && canManage"
                variant="outline"
                @click="attachTarget = item"
              >
                Pasang paket
              </Button>
              <Button
                variant="outline"
                @click="router.push(`${sectionPrefix}/activities/${item.id}`)"
              >
                Detail
              </Button>
            </div>
          </li>
        </ul>
      </CardContent>
      <CardFooter plain />
    </Card>
    <AttachPackageDialog
      :open="attachTarget !== null"
      :activity="attachTarget"
      @update:open="(value: boolean) => value || (attachTarget = null)"
      @attached="load"
    />
  </div>
</template>
