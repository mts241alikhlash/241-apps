<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import { EditorContent, useEditor } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import { Button } from '@mts241alikhlash/ui/button'
import { Separator } from '@mts241alikhlash/ui/separator'
import {
  Bold,
  Heading2,
  Heading3,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Quote,
  Redo2,
  Undo2,
} from '@lucide/vue'
import { MediaLibraryDialog, type MediaSelection } from '@/features/media'

const model = defineModel<string>({ required: true })

const editor = useEditor({
  content: model.value,
  extensions: [
    StarterKit.configure({ heading: { levels: [2, 3, 4] } }),
    Image.configure({ inline: false }),
    Link.configure({ openOnClick: false, autolink: true }),
  ],
  editorProps: {
    attributes: {
      class:
        'prose prose-sm max-w-none min-h-64 px-4 py-3 focus:outline-none dark:prose-invert',
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

function promptForLink() {
  const previous = editor.value?.getAttributes('link').href as
    string | undefined
  const url = window.prompt('Alamat tautan (https://…)', previous ?? '')
  if (url === null) return

  if (url.trim() === '') {
    editor.value?.chain().focus().extendMarkRange('link').unsetLink().run()
    return
  }
  editor.value
    ?.chain()
    .focus()
    .extendMarkRange('link')
    .setLink({ href: url.trim() })
    .run()
}

defineExpose({ insertImage })

function insertImage(src: string, alt: string) {
  editor.value?.chain().focus().setImage({ src, alt }).run()
}

const libraryOpen = ref(false)

function onSelectImage(selection: MediaSelection) {
  insertImage(selection.publicUrl, selection.altText)
}
</script>

<template>
  <div class="rounded-md border">
    <div
      v-if="editor"
      class="flex flex-wrap items-center gap-1 border-b bg-muted/40 p-1"
    >
      <Button
        type="button"
        variant="ghost"
        size="icon"
        class="h-8 w-8"
        :class="{ 'bg-accent': editor.isActive('bold') }"
        title="Tebal"
        @click="editor.chain().focus().toggleBold().run()"
      >
        <Bold class="size-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        class="h-8 w-8"
        :class="{ 'bg-accent': editor.isActive('italic') }"
        title="Miring"
        @click="editor.chain().focus().toggleItalic().run()"
      >
        <Italic class="size-4" />
      </Button>

      <Separator
        orientation="vertical"
        class="mx-1 h-6"
      />

      <Button
        type="button"
        variant="ghost"
        size="icon"
        class="h-8 w-8"
        :class="{ 'bg-accent': editor.isActive('heading', { level: 2 }) }"
        title="Judul bagian"
        @click="editor.chain().focus().toggleHeading({ level: 2 }).run()"
      >
        <Heading2 class="size-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        class="h-8 w-8"
        :class="{ 'bg-accent': editor.isActive('heading', { level: 3 }) }"
        title="Sub-judul"
        @click="editor.chain().focus().toggleHeading({ level: 3 }).run()"
      >
        <Heading3 class="size-4" />
      </Button>

      <Separator
        orientation="vertical"
        class="mx-1 h-6"
      />

      <Button
        type="button"
        variant="ghost"
        size="icon"
        class="h-8 w-8"
        :class="{ 'bg-accent': editor.isActive('bulletList') }"
        title="Daftar butir"
        @click="editor.chain().focus().toggleBulletList().run()"
      >
        <List class="size-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        class="h-8 w-8"
        :class="{ 'bg-accent': editor.isActive('orderedList') }"
        title="Daftar bernomor"
        @click="editor.chain().focus().toggleOrderedList().run()"
      >
        <ListOrdered class="size-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        class="h-8 w-8"
        :class="{ 'bg-accent': editor.isActive('blockquote') }"
        title="Kutipan"
        @click="editor.chain().focus().toggleBlockquote().run()"
      >
        <Quote class="size-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        class="h-8 w-8"
        :class="{ 'bg-accent': editor.isActive('link') }"
        title="Tautan"
        @click="promptForLink"
      >
        <Link2 class="size-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        class="h-8 w-8"
        title="Sisipkan gambar"
        @click="libraryOpen = true"
      >
        <ImagePlus class="size-4" />
      </Button>

      <Separator
        orientation="vertical"
        class="mx-1 h-6"
      />

      <Button
        type="button"
        variant="ghost"
        size="icon"
        class="h-8 w-8"
        title="Batalkan"
        @click="editor.chain().focus().undo().run()"
      >
        <Undo2 class="size-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        class="h-8 w-8"
        title="Ulangi"
        @click="editor.chain().focus().redo().run()"
      >
        <Redo2 class="size-4" />
      </Button>

      <slot name="toolbar-extra" />
    </div>

    <EditorContent :editor="editor" />

    <MediaLibraryDialog
      v-model:open="libraryOpen"
      @select="onSelectImage"
    />
  </div>
</template>
