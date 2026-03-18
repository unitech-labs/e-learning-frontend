<script setup lang="ts">
export interface FilePreviewInput {
  file_url: string
  file_name?: string
  file_type?: string
}

const props = withDefaults(
  defineProps<{
    open: boolean
    file: FilePreviewInput | null
  }>(),
  {},
)

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

// @ts-expect-error - Dynamic import for @vue-office/pptx
const VueOfficePptx = defineAsyncComponent(() => import('@vue-office/pptx').then(m => m.default))

const { t } = useI18n()

const visible = computed({
  get: () => props.open,
  set: (val: boolean) => emit('update:open', val),
})

const docxContainerRef = ref<HTMLElement | null>(null)
const docxLoading = ref(false)
const docxError = ref<string | null>(null)
const pdfLoading = ref(true)
const pdfError = ref<string | null>(null)
const pptxLoading = ref(true)
const pptxError = ref<string | null>(null)

function getExtFromFileName(fileName: string): string {
  return fileName.split('.').pop()?.toLowerCase() || ''
}

function getPreviewType(): 'pdf' | 'docx' | 'pptx' | 'image' | 'other' {
  if (!props.file)
    return 'other'
  const fileName = props.file.file_name || ''
  const ext = getExtFromFileName(fileName)
  const type = (props.file.file_type || ext).toLowerCase()
  if (type === 'pdf' || ext === 'pdf')
    return 'pdf'
  if (['doc', 'docx'].includes(type) || ['doc', 'docx'].includes(ext))
    return 'docx'
  if (['ppt', 'pptx'].includes(type) || ['ppt', 'pptx'].includes(ext))
    return 'pptx'
  if (type === 'image' || /^(?:png|jpg|jpeg|gif|webp)$/.test(ext))
    return 'image'
  return 'other'
}

const previewType = computed(() => getPreviewType())

const modalWidth = computed(() => {
  if (!props.file)
    return 700
  return ['pdf', 'docx', 'pptx'].includes(previewType.value) ? 960 : 700
})

function preventDownload(event: Event) {
  event.preventDefault()
  event.stopPropagation()
}

async function loadDocxPreview() {
  if (!props.file || previewType.value !== 'docx' || !import.meta.client)
    return
  try {
    docxLoading.value = true
    docxError.value = null
    const { renderAsync } = await import('docx-preview')
    const response = await fetch(props.file.file_url)
    if (!response.ok)
      throw new Error('Failed to fetch document')
    const arrayBuffer = await response.arrayBuffer()
    await nextTick()
    const container = docxContainerRef.value
    if (container) {
      container.innerHTML = ''
      await renderAsync(arrayBuffer, container as HTMLElement, undefined, {})
    }
  }
  catch (err: any) {
    docxError.value = err?.message || 'Failed to load document'
  }
  finally {
    docxLoading.value = false
  }
}

watch([visible, () => props.file, docxContainerRef], () => {
  if (visible.value && props.file && previewType.value === 'docx') {
    loadDocxPreview()
  }
}, { immediate: true })
</script>

<template>
  <a-modal
    v-model:open="visible"
    :title="file?.file_name || t('homeworks.detail.previewTitle')"
    :footer="null"
    :width="modalWidth"
    :body-style="{ padding: 0 }"
    :destroy-on-close="true"
    centered
  >
    <div v-if="file" class="preview-content" @contextmenu.prevent="preventDownload">
      <!-- PDF -->
      <div
        v-if="previewType === 'pdf'"
        class="preview-doc-container h-[75vh] overflow-auto bg-gray-100"
      >
        <div v-if="pdfLoading" class="flex items-center justify-center py-20">
          <a-spin size="large" />
          <span class="ml-3 text-gray-600">Loading PDF...</span>
        </div>
        <a-alert v-if="pdfError" type="error" :message="pdfError" show-icon class="m-4" />
        <ClientOnly v-if="!pdfError">
          <LearningPdfViewer
            :url="file.file_url"
            :scale="1.2"
            @loaded="pdfLoading = false; pdfError = null"
            @error="(msg: string) => { pdfLoading = false; pdfError = msg || 'Failed to load PDF' }"
          />
        </ClientOnly>
      </div>
      <!-- DOCX -->
      <div
        v-else-if="previewType === 'docx'"
        class="preview-doc-container docx-viewer h-[75vh] overflow-auto bg-white relative"
      >
        <div v-if="docxLoading" class="flex items-center justify-center py-20 absolute inset-0 bg-white z-10">
          <a-spin size="large" />
          <span class="ml-3 text-gray-600">Loading DOCX...</span>
        </div>
        <a-alert v-if="docxError" type="error" :message="docxError" show-icon class="m-4" />
        <div
          ref="docxContainerRef"
          class="docx-container overflow-auto p-4 min-h-[400px]"
        />
      </div>
      <!-- PPTX -->
      <div
        v-else-if="previewType === 'pptx'"
        class="preview-doc-container pptx-viewer h-[75vh] overflow-auto bg-gray-100"
      >
        <div v-if="pptxLoading" class="flex items-center justify-center py-20">
          <a-spin size="large" />
          <span class="ml-3 text-gray-600">Loading PowerPoint...</span>
        </div>
        <a-alert v-if="pptxError" type="error" :message="pptxError" show-icon class="m-4" />
        <ClientOnly v-if="!pptxError">
          <VueOfficePptx
            :src="file.file_url"
            style="width: 100%; min-height: 600px; height: 100%;"
            @rendered="pptxLoading = false; pptxError = null"
          />
        </ClientOnly>
      </div>
      <!-- Image -->
      <div
        v-else-if="previewType === 'image'"
        class="flex items-center justify-center bg-gray-100 p-4 max-h-[75vh] overflow-auto"
      >
        <img
          :src="file.file_url"
          :alt="file.file_name"
          class="max-w-full max-h-[70vh] object-contain"
        >
      </div>
      <!-- Other: open in new tab only -->
      <div
        v-else
        class="flex flex-col items-center justify-center gap-4 py-12 px-6"
      >
        <Icon name="solar:file-bold" size="64" class="text-gray-300" />
        <p class="text-sm text-gray-500 text-center">
          {{ t('homeworks.detail.previewUnsupported') }}
        </p>
        <a-button type="primary" :href="file.file_url" target="_blank" rel="noopener noreferrer" class="!flex !items-center">
          <Icon name="solar:link-bold" size="16" class="mr-1" />
          {{ t('homeworks.detail.openInNewTab') }}
        </a-button>
      </div>
    </div>
  </a-modal>
</template>

<style scoped>
.preview-doc-container {
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
}

.preview-doc-container * {
  -webkit-touch-callout: none;
  -webkit-user-select: none;
  -khtml-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
}

:deep(.docx-wrapper) {
  background: #fff;
  padding: 2rem;
  max-width: 100%;
  margin: 0 auto;
}

:deep(.docx-wrapper > section) {
  background: #fff;
  padding: 40px;
  margin: 0 auto 20px;
  max-width: 816px;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
}

:deep(.pptx-viewer .pptx-preview-wrapper) {
  height: 100% !important;
}
</style>
