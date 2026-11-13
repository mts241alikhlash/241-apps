<script setup lang="ts">
import { BackButton } from '@mts241alikhlash/ui'
import { computed, onMounted, ref, useId, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQueryClient } from '@tanstack/vue-query'
import { ArrowLeft } from '@lucide/vue'
import { Badge } from '@mts241alikhlash/ui/badge'
import { Button } from '@mts241alikhlash/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@mts241alikhlash/ui/card'
import { FloatingLabelField } from '@mts241alikhlash/ui/form'
import {
  Item,
  ItemActions,
  ItemContent,
  ItemGroup,
} from '@mts241alikhlash/ui/item'
import { ScrollArea } from '@mts241alikhlash/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@mts241alikhlash/ui/select'
import { Textarea } from '@mts241alikhlash/ui/textarea'
import { useBreadcrumbs } from '@mts241alikhlash/web-shared/composables/useBreadcrumbs'
import QuestionPreview from '@/features/exam-bank/components/QuestionPreview.vue'
import { useAuthSession } from '@mts241alikhlash/platform/auth'
import { typeCode, typeLabel } from '@/features/exam-bank/types'
import ReturnPackageDialog from '../components/ReturnPackageDialog.vue'
import { usePackageReview } from '../composables/usePackageReview'
import { examPackageService } from '../services/examPackageService'
import { markerLabel, markerVariant } from '../types'

const route = useRoute()
const router = useRouter()

const queryClient = useQueryClient()
const { user } = useAuthSession()

const packageId = computed(() => String(route.params.id ?? ''))
const review = usePackageReview(packageId)
const { pkg, questions, notes, canReview, canDecide, busy, error } = review

const activeIndex = ref(0)
const returnOpen = ref(false)
const fieldId = useId()

const items = computed(() => pkg.value?.items ?? [])
const activeItem = computed(() => items.value[activeIndex.value] ?? null)
const activeQuestion = computed(() =>
  activeItem.value ? questions.value[activeItem.value.questionId] : undefined,
)

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

function selectItem(index: number) {
  activeIndex.value = index
}

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
  <div class="flex min-h-0 flex-1 flex-col">
    <Card
      gap="none"
      class="flex min-h-0 flex-1 flex-col overflow-hidden"
    >
      <CardHeader
        variant="muted"
        class="px-2"
      >
        <div class="flex items-center gap-3">
          <BackButton
            label="Kembali ke Persetujuan Paket"
            @click="router.push('/exam/package-approvals')"
          />
          <CardTitle class="truncate font-semibold">{{
            pkg?.title ?? 'Tinjau Paket'
          }}</CardTitle>
        </div>
      </CardHeader>

      <CardContent class="flex min-h-0 flex-1 flex-col gap-2 overflow-auto p-2">
        <div
          v-if="review.loadFailed.value"
          class="flex flex-wrap items-center gap-3 rounded-md border p-4 text-[length:var(--text-control,0.75rem)]"
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

          <div class="grid gap-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <Card
              gap="none"
              class="hidden min-w-0 lg:flex"
            >
              <CardHeader
                variant="muted"
                class="px-2"
              >
                <CardTitle>Daftar soal</CardTitle>
              </CardHeader>
              <CardContent variant="flush">
                <ScrollArea
                  class="[&_[data-slot=scroll-area-scrollbar]]:w-1.5 [&_[data-slot=scroll-area-viewport]]:max-h-[60vh]"
                >
                  <ItemGroup class="gap-0">
                    <Item
                      v-for="(item, index) in items"
                      :key="item.questionId"
                      class="min-w-0 flex-nowrap gap-1 rounded-none border-0 px-2 py-1 hover:bg-muted"
                      :class="index === activeIndex ? 'bg-muted' : undefined"
                    >
                      <ItemContent class="min-w-0">
                        <button
                          type="button"
                          class="flex w-full min-w-0 items-center gap-2 text-left"
                          :aria-current="
                            index === activeIndex ? 'true' : undefined
                          "
                          @click="selectItem(index)"
                        >
                          <span
                            class="w-4 shrink-0 text-right text-[length:var(--text-control,0.75rem)] text-muted-foreground tabular-nums"
                          >
                            {{ item.position }}
                          </span>
                          <span
                            class="min-w-0 flex-1 truncate text-[length:var(--text-control,0.75rem)]"
                          >
                            {{ item.summary }}
                          </span>
                        </button>
                      </ItemContent>
                      <ItemActions class="shrink-0">
                        <Badge
                          variant="outline"
                          class="w-9 shrink-0 justify-center px-0"
                          :title="typeLabel(item.type)"
                        >
                          {{ typeCode(item.type) }}
                        </Badge>
                      </ItemActions>
                    </Item>
                  </ItemGroup>
                </ScrollArea>
              </CardContent>
            </Card>

            <div class="flex min-w-0 flex-col gap-2">
              <div class="flex flex-wrap items-center gap-2 lg:hidden">
                <Select
                  :model-value="String(activeIndex)"
                  @update:model-value="(value) => selectItem(Number(value))"
                >
                  <SelectTrigger
                    class="w-40"
                    aria-label="Pilih soal"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem
                      v-for="(item, index) in items"
                      :key="item.questionId"
                      :value="String(index)"
                    >
                      Soal {{ item.position }}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Card
                v-if="activeItem"
                gap="none"
                class="min-w-0"
              >
                <CardHeader
                  variant="muted"
                  class="px-2"
                >
                  <CardTitle>Soal {{ activeItem.position }}</CardTitle>
                  <Badge :variant="markerVariant(activeItem.marker)">
                    {{ markerLabel(activeItem.marker) }}
                  </Badge>
                </CardHeader>
                <CardContent class="flex flex-col gap-2 p-2">
                  <template v-if="activeQuestion">
                    <QuestionPreview
                      :type="activeQuestion.type"
                      :body-html="activeQuestion.current.bodyHtml"
                      :content="activeQuestion.current.content"
                      :points="activeQuestion.current.points"
                    />
                  </template>
                  <p
                    v-else
                    class="text-[length:var(--text-control,0.75rem)] text-destructive"
                    role="alert"
                  >
                    Soal ini tidak bisa dimuat.
                  </p>
                  <FloatingLabelField
                    v-if="canReview"
                    label="Catatan untuk soal ini"
                    :for="`${fieldId}-${activeItem.questionId}`"
                    floating
                  >
                    <Textarea
                      :id="`${fieldId}-${activeItem.questionId}`"
                      :model-value="notes[activeItem.questionId] ?? ''"
                      maxlength="500"
                      rows="2"
                      @update:model-value="
                        review.setNote(
                          activeItem.questionId,
                          String($event ?? ''),
                        )
                      "
                    />
                  </FloatingLabelField>
                </CardContent>
              </Card>
            </div>
          </div>
        </template>
      </CardContent>
    </Card>

    <div
      v-if="pkg && canReview"
      class="mt-2 flex min-h-[var(--control-h-lg,2rem)] shrink-0 flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-card/85 px-3 py-1 shadow-xs backdrop-blur-md"
    >
      <Button
        variant="ghost"
        @click="router.push('/exam/package-approvals')"
      >
        <ArrowLeft class="size-4" />
        Kembali
      </Button>
      <div class="flex flex-wrap items-center gap-2">
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
      </div>
    </div>

    <ReturnPackageDialog
      v-model:open="returnOpen"
      :note-count="noteCount"
      :busy="busy"
      :error="review.returnError.value"
      @confirm="giveBack"
    />
  </div>
</template>
