<script setup lang="ts">
import { computed, onMounted, ref, useId, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQueryClient } from '@tanstack/vue-query'
import { BackButton } from '@mts241alikhlash/ui'
import { Badge } from '@mts241alikhlash/ui/badge'
import { Button } from '@mts241alikhlash/ui/button'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@mts241alikhlash/ui/card'
import { FloatingLabelField } from '@mts241alikhlash/ui/form'
import { Textarea } from '@mts241alikhlash/ui/textarea'
import { useBreadcrumbs } from '@mts241alikhlash/web-shared/composables/useBreadcrumbs'
import AnswerKey from '@/features/exam-bank/components/AnswerKey.vue'
import QuestionPreview from '@/features/exam-bank/components/QuestionPreview.vue'
import { useAuthSession } from '@/features/platform/auth'
import { typeLabel } from '@/features/exam-bank/types'
import ReturnPackageDialog from '../components/ReturnPackageDialog.vue'
import { usePackageReview } from '../composables/usePackageReview'
import { examPackageService } from '../services/examPackageService'
import { useExamPackageStore } from '../stores/examPackageStore'
import { markerLabel, markerVariant } from '../types'

const route = useRoute()
const router = useRouter()
const store = useExamPackageStore()
const queryClient = useQueryClient()
const { user } = useAuthSession()

const packageId = computed(() => String(route.params.id ?? ''))
const review = usePackageReview(packageId)
const { pkg, questions, notes, canReview, canDecide, busy, error } = review

const returnOpen = ref(false)
const fieldId = useId()

const noteCount = computed(
  () => Object.values(notes.value).filter((text) => text.trim() !== '').length,
)

useBreadcrumbs(() => [
  { title: 'Persetujuan Paket', href: '/exam/package-approvals' },
  { title: pkg.value?.title ?? 'Paket' },
])

const wroteIt = computed(
  () => pkg.value !== null && pkg.value.createdById === user.value?.id,
)

function refreshLists() {
  return queryClient.invalidateQueries({
    queryKey: ['exam-package', 'packages'],
  })
}

async function approve() {
  if (await review.approve()) {
    await refreshLists()
    await router.push('/exam/package-approvals')
  }
}

async function giveBack(note: string) {
  if (await review.returnPackage(note)) {
    returnOpen.value = false
    await refreshLists()
    await router.push('/exam/package-approvals')
  }
}

async function init() {
  await review.load()
  if (review.notFound.value) await router.replace('/exam/package-approvals')
}

watch(packageId, init)
onMounted(() => {
  void examPackageService.loadReferences()
  return init()
})
</script>

<template>
  <div class="px-4 pb-4 pt-1 sm:px-6 sm:pb-6 sm:pt-2">
    <Card gap="none">
      <CardHeader standard>
        <div class="flex flex-wrap items-center gap-3">
          <BackButton
            label="Kembali ke Persetujuan Paket"
            @click="router.push('/exam/package-approvals')"
          />
          <CardTitle size="lg">{{ pkg?.title ?? 'Tinjau Paket' }}</CardTitle>
          <template v-if="pkg">
            <Badge variant="outline">{{
              store.subjectName(pkg.subjectId)
            }}</Badge>
            <Badge variant="outline">{{ store.gradeName(pkg.gradeId) }}</Badge>
          </template>
        </div>
      </CardHeader>

      <CardContent
        variant="standard"
        class="space-y-6"
      >
        <div
          v-if="review.loadFailed.value"
          class="rounded-md border p-4 text-[length:var(--text-control,0.75rem)]"
          role="alert"
        >
          Paket tidak dapat dimuat.
          <Button
            variant="outline"
            @click="review.load()"
          >
            Coba lagi
          </Button>
        </div>

        <template v-else-if="pkg">
          <div
            v-if="!canReview"
            class="rounded-md border bg-muted/30 p-3 text-[length:var(--text-control,0.75rem)]"
            role="status"
          >
            Paket ini tidak sedang menunggu tinjauan.
          </div>
          <div
            v-if="wroteIt && canReview"
            class="rounded-md border bg-muted/30 p-3 text-[length:var(--text-control,0.75rem)]"
            role="status"
          >
            Anda menyusun paket ini, jadi penyetujuan harus dilakukan orang
            lain. Anda tetap bisa mengembalikannya.
          </div>
          <div
            v-if="error"
            class="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-[length:var(--text-control,0.75rem)]"
            role="alert"
          >
            {{ error }}
          </div>

          <div
            v-if="review.unreadable.value.size > 0"
            class="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-[length:var(--text-control,0.75rem)]"
            role="alert"
          >
            {{ review.unreadable.value.size }} soal tidak bisa dimuat. Muat
            ulang halaman sebelum menyetujui atau mengembalikan paket.
          </div>

          <section
            v-for="item in pkg.items"
            :key="item.questionId"
            class="space-y-3 rounded-md border p-4"
          >
            <div
              class="flex flex-wrap items-center gap-2 text-[length:var(--text-control,0.75rem)]"
            >
              <span class="font-medium">Soal {{ item.position }}</span>
              <Badge variant="outline">{{ typeLabel(item.type) }}</Badge>
              <Badge :variant="markerVariant(item.marker)">{{
                markerLabel(item.marker)
              }}</Badge>
            </div>
            <template v-if="questions[item.questionId]">
              <QuestionPreview
                :type="questions[item.questionId].type"
                :body-html="questions[item.questionId].current.bodyHtml"
                :content="questions[item.questionId].current.content"
                :points="questions[item.questionId].current.points"
              />
              <AnswerKey
                :type="questions[item.questionId].type"
                :content="questions[item.questionId].current.content"
              />
            </template>
            <FloatingLabelField
              v-if="canReview"
              label="Catatan untuk soal ini"
              :for="`${fieldId}-${item.questionId}`"
              floating
            >
              <Textarea
                :id="`${fieldId}-${item.questionId}`"
                :model-value="notes[item.questionId] ?? ''"
                maxlength="500"
                rows="2"
                @update:model-value="
                  review.setNote(item.questionId, String($event ?? ''))
                "
              />
            </FloatingLabelField>
          </section>
        </template>
      </CardContent>

      <CardFooter
        v-if="pkg && canReview"
        standard
        class="justify-between"
      >
        <Button
          type="button"
          variant="outline"
          :disabled="busy || !canDecide"
          @click="returnOpen = true"
        >
          Kembalikan
        </Button>
        <Button
          v-if="!wroteIt"
          type="button"
          :disabled="busy || !canDecide"
          @click="approve"
        >
          Setujui
        </Button>
      </CardFooter>
    </Card>

    <ReturnPackageDialog
      v-model:open="returnOpen"
      :note-count="noteCount"
      :busy="busy"
      :error="review.returnError.value"
      @confirm="giveBack"
    />
  </div>
</template>
