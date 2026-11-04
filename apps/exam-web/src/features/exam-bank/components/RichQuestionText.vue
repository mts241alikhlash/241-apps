<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import { EditorContent, useEditor } from '@tiptap/vue-3'
import { toast } from 'vue-sonner'
import {
  Bold,
  ImagePlus,
  Italic,
  List,
  ListOrdered,
  Sigma,
  Subscript,
  Superscript,
  Underline,
} from '@lucide/vue'
import { Button } from '@mts241alikhlash/ui/button'
import { getIndonesianErrorMessage } from '@mts241alikhlash/web-shared/utils/error-handler'
import { examBankApi } from '../api/examBankApi'
import MathDialog from './MathDialog.vue'
import { buildExtensions } from './tiptap/extensions'
import type { MathEdit } from './tiptap/mathInline'

const MAX_IMAGE_BYTES = 2 * 1024 * 1024
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']

const props = withDefaults(
  defineProps<{
    label: string
    compact?: boolean
    allowImages?: boolean
  }>(),
  { compact: false, allowImages: true },
)
const model = defineModel<string>({ required: true })

const mathOpen = ref(false)
const mathInitial = ref('')
const editingAt = ref<number | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const uploading = ref(false)

function openMath(edit?: MathEdit) {
  mathInitial.value = edit?.latex ?? ''
  editingAt.value = edit?.pos ?? null
  mathOpen.value = true
}

const editor = useEditor({
  content: model.value,
  extensions: buildExtensions(openMath),
  editorProps: {
    attributes: {
      class: `${props.compact ? 'min-h-10' : 'min-h-28'} px-3 py-2 text-[length:var(--text-control,0.75rem)] focus:outline-none [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-1 [&_ul]:list-disc [&_ul]:pl-5`,
      'aria-label': props.label,
      dir: 'auto',
    },
  },
  onUpdate: ({ editor: instance }) => {
    model.value = instance.getHTML()
  },
})

watch(model, (value) => {
  if (editor.value && value !== editor.value.getHTML()) {
    editor.value.commands.setContent(value, { emitUpdate: false })
  }
})

onBeforeUnmount(() => editor.value?.destroy())

function insertMath(latex: string) {
  const chain = editor.value?.chain().focus()
  if (!chain) return
  if (editingAt.value !== null) {
    chain
      .setNodeSelection(editingAt.value)
      .updateAttributes('mathInline', { latex })
      .run()
  } else {
    chain.insertContent({ type: 'mathInline', attrs: { latex } }).run()
  }
  editingAt.value = null
}

async function uploadImage(file: File) {
  if (!IMAGE_TYPES.includes(file.type)) {
    toast.error('Gambar harus JPG, PNG, atau WebP.')
    return
  }
  if (file.size > MAX_IMAGE_BYTES) {
    toast.error('Ukuran gambar maksimal 2 MB.')
    return
  }
  uploading.value = true
  try {
    const response = await examBankApi.uploadImage(file)
    const id = response.data?.data?.id
    if (id) {
      editor.value
        ?.chain()
        .focus()
        .insertContent({ type: 'examImage', attrs: { fileId: id } })
        .run()
    }
  } catch (err: unknown) {
    toast.error(getIndonesianErrorMessage(err, 'Gagal mengunggah gambar.'))
  } finally {
    uploading.value = false
  }
}

function onFileChosen(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (file) void uploadImage(file)
}

defineExpose({ insertMath, uploadImage, openMath })
</script>

<template>
  <div class="rounded-md border">
    <div
      v-if="editor"
      class="flex flex-wrap items-center gap-1 border-b bg-muted/30 p-1"
    >
      <Button
        type="button"
        variant="ghost"
        size="icon"
        :class="{ 'bg-accent': editor.isActive('bold') }"
        title="Tebal"
        aria-label="Tebal"
        @click="editor.chain().focus().toggleBold().run()"
      >
        <Bold />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        :class="{ 'bg-accent': editor.isActive('italic') }"
        title="Miring"
        aria-label="Miring"
        @click="editor.chain().focus().toggleItalic().run()"
      >
        <Italic />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        :class="{ 'bg-accent': editor.isActive('underline') }"
        title="Garis bawah"
        aria-label="Garis bawah"
        @click="editor.chain().focus().toggleUnderline().run()"
      >
        <Underline />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        :class="{ 'bg-accent': editor.isActive('superscript') }"
        title="Pangkat (superskrip)"
        aria-label="Pangkat (superskrip)"
        @click="editor.chain().focus().toggleSuperscript().run()"
      >
        <Superscript />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        :class="{ 'bg-accent': editor.isActive('subscript') }"
        title="Indeks (subskrip)"
        aria-label="Indeks (subskrip)"
        @click="editor.chain().focus().toggleSubscript().run()"
      >
        <Subscript />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        :class="{ 'bg-accent': editor.isActive('bulletList') }"
        title="Daftar poin"
        aria-label="Daftar poin"
        @click="editor.chain().focus().toggleBulletList().run()"
      >
        <List />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        :class="{ 'bg-accent': editor.isActive('orderedList') }"
        title="Daftar bernomor"
        aria-label="Daftar bernomor"
        @click="editor.chain().focus().toggleOrderedList().run()"
      >
        <ListOrdered />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        title="Sisipkan rumus"
        aria-label="Sisipkan rumus"
        @click="openMath()"
      >
        <Sigma />
      </Button>
      <Button
        v-if="allowImages"
        type="button"
        variant="ghost"
        size="icon"
        title="Sisipkan gambar"
        aria-label="Sisipkan gambar"
        :disabled="uploading"
        @click="fileInput?.click()"
      >
        <ImagePlus />
      </Button>
      <input
        ref="fileInput"
        type="file"
        class="sr-only"
        accept="image/jpeg,image/png,image/webp"
        tabindex="-1"
        aria-hidden="true"
        @change="onFileChosen"
      />
    </div>
    <EditorContent :editor="editor" />
    <MathDialog
      v-model:open="mathOpen"
      :initial="mathInitial"
      :editing="editingAt !== null"
      @confirm="insertMath"
    />
  </div>
</template>
