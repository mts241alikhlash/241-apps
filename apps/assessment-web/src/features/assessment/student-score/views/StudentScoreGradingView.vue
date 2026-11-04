<script setup lang="ts">
import { BackButton } from '@mts241alikhlash/ui'
import StudentScoreInputTable from '../components/StudentScoreInputTable.vue'
import { useStudentScore } from '../composables/useStudentScore'
import { useBreadcrumbs } from '@mts241alikhlash/web-shared/composables/useBreadcrumbs'
import { Alert, AlertDescription } from '@mts241alikhlash/ui/alert'
import { Card, CardHeader, CardTitle } from '@mts241alikhlash/ui/card'
import { useRoleGuard } from '@/features/platform/auth'
import { AlertCircle } from '@lucide/vue'
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { toast } from 'vue-sonner'

const TYPE_LABELS: Record<string, string> = {
  DAILY: 'Harian',
  ASSIGNMENT: 'Tugas',
  PRACTICAL: 'Praktikum',
  MIDTERM: 'UTS',
  FINAL: 'UAS',
}

const route = useRoute()
const router = useRouter()
const { can } = useRoleGuard()
const canManage = computed(() => can('student-scores.manage'))

const assessmentItemId = computed(() => String(route.params.assessmentItemId))

const {
  assessmentItem,
  roster,
  loading,
  isSaving,
  formError,
  fetchRoster,
  saveRoster,
} = useStudentScore()

useBreadcrumbs(() => [
  { title: 'Penilaian', href: '#' },
  { title: 'Penilaian', href: '/assessment/items' },
  { title: assessmentItem.value?.name ?? 'Nilai', href: route.path },
])

async function handleSave() {
  const result = await saveRoster(assessmentItemId.value, roster.value)
  if (result.success) {
    toast.success('Nilai siswa berhasil disimpan.')
  }
}

onMounted(() => {
  void fetchRoster(assessmentItemId.value)
})
</script>

<template>
  <div class="space-y-6 p-4 sm:p-6">
    <Card
      gap="none"
      class="overflow-hidden"
    >
      <CardHeader standard>
        <div>
          <div class="flex items-center gap-2">
            <BackButton
              label="Kembali ke daftar penilaian"
              @click="router.push('/assessment/items')"
            />
            <CardTitle size="lg">
              {{ assessmentItem?.name ?? 'Nilai Siswa' }}
            </CardTitle>
          </div>
        </div>
      </CardHeader>

      <div class="space-y-4 p-6">
        <div
          v-if="assessmentItem"
          class="flex flex-wrap items-center justify-center sm:justify-start gap-2"
        >
          <div
            class="flex items-center gap-1.5 rounded-md border bg-muted/30 px-2.5 h-8 text-xs"
          >
            <span class="text-muted-foreground">Tipe</span>
            <span class="font-semibold">
              {{ TYPE_LABELS[assessmentItem.type] ?? assessmentItem.type }}
            </span>
          </div>
          <div
            class="flex items-center gap-1.5 rounded-md border bg-muted/30 px-2.5 h-8 text-xs"
          >
            <span class="text-muted-foreground">Bobot</span>
            <span class="font-semibold">{{ assessmentItem.weight }}%</span>
          </div>
          <div
            class="flex items-center gap-1.5 rounded-md border bg-muted/30 px-2.5 h-8 text-xs"
          >
            <span class="text-muted-foreground">Skor maks</span>
            <span class="font-semibold tabular-nums">
              {{ assessmentItem.maxScore }}
            </span>
          </div>
        </div>

        <Alert
          v-if="formError"
          variant="destructive"
        >
          <AlertCircle class="size-4" />
          <AlertDescription>{{ formError }}</AlertDescription>
        </Alert>

        <StudentScoreInputTable
          v-model:rows="roster"
          :loading="loading"
          :is-saving="isSaving"
          :max-score="assessmentItem?.maxScore ?? 100"
          :can-save="canManage"
          @save="handleSave"
        />
      </div>
    </Card>
  </div>
</template>
