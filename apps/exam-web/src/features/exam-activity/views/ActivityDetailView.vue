<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useRouteCategory } from '@/features/exam-shared/useRouteCategory'
import { toast } from 'vue-sonner'
import { useAuthSession } from '@mts241alikhlash/platform/auth'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@mts241alikhlash/ui/alert-dialog'
import { Button } from '@mts241alikhlash/ui/button'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@mts241alikhlash/ui/card'
import { messageOf } from '@/features/exam-package/utils/messageOf'
import { examTypeLabel } from '@/features/exam-shared/examType'
import ActivityPolicyDialog from '../components/ActivityPolicyDialog.vue'
import { examActivityApi } from '../api/examActivityApi'
import {
  activityStatusLabel,
  type ExamActivityDetail,
  type ExamPolicy,
} from '../types'

const route = useRoute()
const router = useRouter()
const { hasPermission } = useAuthSession()

const activityId = computed(() => String(route.params.id ?? ''))
const { sectionPrefix } = useRouteCategory()
const canManageAll = computed(() => hasPermission('exam-schedules.manage-all'))

const detail = ref<ExamActivityDetail | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)
const policyOpen = ref(false)
const confirmRotateOpen = ref(false)
const rotating = ref(false)

function formatWindow(startsAt: string, endsAt: string): string {
  const fmt = new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
  return `${fmt.format(new Date(startsAt))} – ${fmt.format(new Date(endsAt))}`
}

async function load(): Promise<void> {
  if (!activityId.value) return
  loading.value = true
  error.value = null
  try {
    const response = await examActivityApi.get(activityId.value)
    detail.value = response.data.data
  } catch (err: unknown) {
    error.value = messageOf(err, 'Gagal memuat detail kegiatan.')
  } finally {
    loading.value = false
  }
}

async function confirmRotateToken(): Promise<void> {
  if (!detail.value || rotating.value) return
  rotating.value = true
  try {
    const response = await examActivityApi.rotateToken(detail.value.id)
    detail.value = {
      ...detail.value,
      tokenRotation: response.data.data.tokenRotation,
    }
    confirmRotateOpen.value = false
    toast.success('Token kegiatan berhasil diganti.')
  } catch (err: unknown) {
    toast.error(messageOf(err, 'Gagal mengganti token kegiatan.'))
  } finally {
    rotating.value = false
  }
}

function onPolicySaved(nextPolicy: ExamPolicy | Record<string, number>): void {
  if (!detail.value) return
  detail.value = {
    ...detail.value,
    policy: nextPolicy,
  }
  toast.success('Kebijakan kegiatan disimpan.')
}

watch(activityId, () => void load())
onMounted(load)
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <Card
      gap="none"
      class="flex min-h-0 flex-1 flex-col overflow-hidden"
    >
      <CardHeader variant="muted">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <CardTitle class="font-semibold">
            Detail Kegiatan
            <template v-if="detail?.type">
              · {{ examTypeLabel(detail.type) }}
            </template>
          </CardTitle>
          <div class="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              @click="router.push(`${sectionPrefix}/activities`)"
            >
              Kembali ke Daftar
            </Button>
            <template v-if="canManageAll && detail">
              <Button
                variant="outline"
                @click="policyOpen = true"
              >
                Ubah kebijakan
              </Button>
              <Button
                variant="outline"
                @click="confirmRotateOpen = true"
              >
                Ganti token
              </Button>
            </template>
          </div>
        </div>
      </CardHeader>

      <CardContent
        class="flex min-h-0 flex-1 flex-col overflow-auto p-4 sm:p-6 space-y-6"
      >
        <div
          v-if="error !== null"
          role="alert"
          class="space-y-3 rounded-md border p-4"
        >
          <p class="text-[length:var(--text-control,0.75rem)]">{{ error }}</p>
          <Button
            variant="outline"
            @click="load"
          >
            Coba lagi
          </Button>
        </div>

        <p
          v-else-if="loading"
          class="text-[length:var(--text-control,0.75rem)] text-muted-foreground"
        >
          Memuat detail kegiatan…
        </p>

        <template v-else-if="detail">
          <div class="grid gap-4 rounded-md border p-4 sm:grid-cols-3">
            <div>
              <p class="text-xs text-muted-foreground">Jenis & Preset</p>
              <p class="font-medium">
                {{ detail.type ? examTypeLabel(detail.type) : '-' }}
              </p>
            </div>
            <div>
              <p class="text-xs text-muted-foreground">Status</p>
              <p class="font-medium">
                {{ activityStatusLabel(detail.status) }}
              </p>
            </div>
            <div>
              <p class="text-xs text-muted-foreground">Mode token</p>
              <p class="font-medium">
                {{
                  detail.tokenMode === 'ROTATING'
                    ? 'Token berputar'
                    : 'Token tetap'
                }}
                (rotasi #{{ detail.tokenRotation }})
              </p>
            </div>
            <div class="sm:col-span-2">
              <p class="text-xs text-muted-foreground">Jendela waktu</p>
              <p class="font-medium">
                {{ formatWindow(detail.startsAt, detail.endsAt) }}
              </p>
            </div>
            <div>
              <p class="text-xs text-muted-foreground">Durasi</p>
              <p class="font-medium">{{ detail.durationMinutes }} menit</p>
            </div>
          </div>

          <section class="space-y-2">
            <h2 class="text-sm font-semibold">Kebijakan Pengawasan</h2>
            <dl class="grid gap-3 rounded-md border p-4 sm:grid-cols-4">
              <div>
                <dt class="text-xs text-muted-foreground">Batas pelanggaran</dt>
                <dd class="font-medium">{{ detail.policy.violationLimit }}</dd>
              </div>
              <div>
                <dt class="text-xs text-muted-foreground">
                  Ambang hilang fokus
                </dt>
                <dd class="font-medium">
                  {{ detail.policy.focusThresholdMs }} ms
                </dd>
              </div>
              <div>
                <dt class="text-xs text-muted-foreground">Interval foto</dt>
                <dd class="font-medium">
                  {{ detail.policy.snapshotIntervalMs }} ms
                </dd>
              </div>
              <div>
                <dt class="text-xs text-muted-foreground">
                  Slot token berputar
                </dt>
                <dd class="font-medium">
                  {{ detail.policy.tokenSlotSeconds }} detik
                </dd>
              </div>
            </dl>
          </section>

          <section class="space-y-2">
            <h2 class="text-sm font-semibold">Jadwal per Kelas</h2>
            <p
              v-if="detail.schedules.length === 0"
              class="text-[length:var(--text-control,0.75rem)] text-muted-foreground"
            >
              Belum ada jadwal kelas pada kegiatan ini.
            </p>
            <ul
              v-else
              class="divide-y rounded-md border"
            >
              <li
                v-for="item in detail.schedules"
                :key="item.scheduleId"
                class="flex flex-col gap-1 p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <span class="font-medium">
                  {{ item.classroomName ?? item.classroomId }}
                </span>
                <span
                  class="text-[length:var(--text-control,0.75rem)] text-muted-foreground"
                >
                  {{ formatWindow(item.startsAt, item.endsAt) }}
                </span>
              </li>
            </ul>
          </section>
        </template>
      </CardContent>
      <CardFooter variant="thin" />
    </Card>

    <ActivityPolicyDialog
      v-if="detail && policyOpen"
      v-model:open="policyOpen"
      :activity-id="detail.id"
      :policy="detail.policy"
      @saved="onPolicySaved"
    />

    <AlertDialog
      :open="confirmRotateOpen"
      @update:open="(value: boolean) => !value && (confirmRotateOpen = false)"
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Ganti token kegiatan?</AlertDialogTitle>
          <AlertDialogDescription>
            Token lama tidak berlaku lagi dan siswa yang baru masuk harus
            memakai token baru.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Batal</AlertDialogCancel>
          <AlertDialogAction
            :disabled="rotating"
            @click="confirmRotateToken"
          >
            Ya, ganti token
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>
