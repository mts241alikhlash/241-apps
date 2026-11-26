<script setup lang="ts">
import { BackButton } from '@mts241alikhlash/ui'
import StudentScoreInputTable from '../components/StudentScoreInputTable.vue'
import { useStudentScore } from '../composables/useStudentScore'
import { useBreadcrumbs } from '@mts241alikhlash/web-shared/composables/useBreadcrumbs'
import { Alert, AlertDescription } from '@mts241alikhlash/ui/alert'
import { Button } from '@mts241alikhlash/ui/button'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@mts241alikhlash/ui/card'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@mts241alikhlash/ui/dialog'
import { useRoleGuard } from '@mts241alikhlash/platform/auth'
import { AlertCircle, Loader2, Save } from '@lucide/vue'
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { toast } from 'vue-sonner'

const route = useRoute()
const router = useRouter()
const { can } = useRoleGuard()
const canManage = computed(() => can('student-scores.manage'))

const assessmentItemId = computed(() => String(route.params.assessmentItemId))
const confirmOpen = ref(false)

const {
  assessmentItem,
  roster,
  loading,
  isSaving,
  formError,
  fetchRoster,
  saveRoster,
} = useStudentScore()

const isExam = computed(
  () =>
    route.query.category === 'exam' ||
    assessmentItem.value?.type === 'MIDTERM' ||
    assessmentItem.value?.type === 'FINAL',
)
const backPath = computed(() =>
  isExam.value ? '/assessment/exam-items' : '/assessment/items',
)
const backQuery = computed(() => {
  const query: Record<string, string> = {}
  if (typeof route.query.tipe === 'string' && route.query.tipe) {
    query.tipe = route.query.tipe
  }
  if (typeof route.query.mapel === 'string' && route.query.mapel) {
    query.mapel = route.query.mapel
  }
  return query
})
const backLocation = computed(() => ({
  path: backPath.value,
  query: backQuery.value,
}))
const backLabel = computed(() =>
  isExam.value ? 'Kembali ke Butir Ujian' : 'Kembali ke Butir Penilaian',
)

useBreadcrumbs(() => [
  { title: 'Penilaian', href: '#' },
  { title: isExam.value ? 'Ujian' : 'Harian & Tugas', href: '#' },
  {
    title: isExam.value ? 'Butir Ujian' : 'Butir Penilaian',
    href: backPath.value,
  },
  { title: assessmentItem.value?.name ?? 'Nilai', href: route.path },
])

const scoredCount = computed(
  () => roster.value.filter((row) => row.score !== null).length,
)
const unscoredCount = computed(() => roster.value.length - scoredCount.value)
const notedCount = computed(
  () => roster.value.filter((row) => Boolean(row.note?.trim())).length,
)

async function handleSave() {
  const result = await saveRoster(assessmentItemId.value, roster.value)
  if (result.success) {
    toast.success('Nilai siswa berhasil disimpan.')
  } else if ('empty' in result && result.empty) {
    toast.info('Belum ada nilai atau catatan untuk disimpan.')
  }
}

async function confirmSave() {
  confirmOpen.value = false
  await handleSave()
}

onMounted(() => {
  void fetchRoster(assessmentItemId.value)
})
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <Card
      gap="none"
      class="flex min-h-0 flex-1 flex-col overflow-hidden"
    >
      <CardHeader standard>
        <div class="flex min-w-0 items-center gap-3">
          <BackButton
            :label="backLabel"
            @click="router.push(backLocation)"
          />
          <CardTitle class="font-semibold">
            {{ assessmentItem?.name ?? 'Nilai Siswa' }}
          </CardTitle>
        </div>
      </CardHeader>

      <CardContent
        class="flex min-h-0 flex-1 flex-col space-y-4 overflow-auto pt-2 px-4 pb-4"
      >
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
          :max-score="assessmentItem?.maxScore ?? 100"
        />
      </CardContent>

      <CardFooter
        v-if="roster.length > 0 && canManage"
        class="justify-between"
      >
        <p class="text-control text-muted-foreground">
          <span class="font-medium text-foreground">{{ scoredCount }}</span>
          dari
          <span class="font-medium text-foreground">{{ roster.length }}</span>
          siswa sudah dinilai
        </p>

        <Button
          :disabled="isSaving || loading"
          @click="confirmOpen = true"
        >
          <Loader2
            v-if="isSaving"
            class="size-4 animate-spin"
          />
          <Save
            v-else
            class="size-4"
          />
          {{ isSaving ? 'Menyimpan...' : 'Simpan' }}
        </Button>
      </CardFooter>
      <CardFooter
        v-else
        plain
      />
    </Card>

    <Dialog v-model:open="confirmOpen">
      <DialogContent size="md">
        <DialogHeader standard>
          <DialogTitle>Konfirmasi Simpan Nilai</DialogTitle>
          <DialogDescription>
            Ringkasan jumlah siswa yang sudah dan belum dinilai sebelum
            disimpan.
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          <dl class="grid grid-cols-2 gap-3">
            <div
              class="flex flex-col gap-0.5 rounded-md border bg-muted/30 px-4 py-2"
            >
              <dt class="text-control text-muted-foreground">Total Siswa</dt>
              <dd class="text-xl font-semibold">{{ roster.length }}</dd>
            </div>
            <div
              class="flex flex-col gap-0.5 rounded-md border bg-muted/30 px-4 py-2"
            >
              <dt class="text-control text-muted-foreground">Sudah Dinilai</dt>
              <dd class="text-xl font-semibold text-success">
                {{ scoredCount }}
              </dd>
            </div>
            <div
              class="flex flex-col gap-0.5 rounded-md border bg-muted/30 px-4 py-2"
            >
              <dt class="text-control text-muted-foreground">Belum Dinilai</dt>
              <dd
                class="text-xl font-semibold"
                :class="unscoredCount > 0 ? 'text-warning' : ''"
              >
                {{ unscoredCount }}
              </dd>
            </div>
            <div
              class="flex flex-col gap-0.5 rounded-md border bg-muted/30 px-4 py-2"
            >
              <dt class="text-control text-muted-foreground">Catatan</dt>
              <dd class="text-xl font-semibold">{{ notedCount }}</dd>
            </div>
          </dl>
        </DialogBody>
        <DialogFooter
          standard
          class="justify-between"
        >
          <Button
            type="button"
            variant="outline"
            :disabled="isSaving"
            @click="confirmOpen = false"
          >
            Batal
          </Button>
          <Button
            :disabled="isSaving"
            @click="confirmSave"
          >
            {{ isSaving ? 'Menyimpan...' : 'Simpan' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
