<script setup lang="ts">
import { notification } from 'ant-design-vue'
import { getFileExtension } from '~/utils/fileExtension'

definePageMeta({
  layout: 'default',
})

const route = useRoute()
const router = useRouter()

const courseId = computed(() => route.params.id as string)
const fileUrlQuery = computed(() => route.query.file_url as string | undefined)

// State
const loading = ref(false)
const error = ref<string | null>(null)
const document = ref<any>(null)

// PDF viewer state
const pdfError = ref<string | null>(null)
const pdfLoading = ref(true)
const pdfWidth = ref<number | null>(null) // null = 100% (default), range: 200-2000
const baseWidth = ref<number | null>(null) // Store initial width for percentage calculation
const minWidth = 200
const maxWidth = 2000
const widthStep = 100
const pdfWrapperRef = ref<HTMLElement | null>(null)

// Load document from query parameters
function loadDocumentFromQuery() {
  try {
    if (!fileUrlQuery.value) {
      error.value = 'File URL not found in query parameters'
      return
    }

    // Decode file_url from query
    const decodedFileUrl = decodeURIComponent(fileUrlQuery.value)

    // Build document object from query parameters
    document.value = {
      file_url: decodedFileUrl,
      title: route.query.title as string || 'Document',
      description: route.query.description as string || '',
      file_size: route.query.file_size ? Number(route.query.file_size) : undefined,
      asset_type: route.query.asset_type as string || 'other',
    }
  }
  catch (err: any) {
    console.error('Error loading document from query:', err)
    error.value = 'Failed to load document'
    notification.error({
      message: 'Error',
      description: 'Failed to load document from query parameters',
    })
  }
}

// Check if document is PDF
const isPdf = computed(() => {
  if (!document.value)
    return false
  const extension = getFileExtension(document.value)
  const extLower = extension.toLowerCase()
  return extLower === 'pdf'
})

// Get document URL
const documentUrl = computed(() => {
  if (!document.value)
    return null
  return document.value.file_url || null
})

// PDF viewer handlers
function handlePdfLoaded() {
  pdfLoading.value = false
  pdfError.value = null
}

function handlePdfError(message: string) {
  pdfLoading.value = false
  pdfError.value = message || 'Failed to load PDF'
  console.error('PDF loading error:', message)
}

// Get initial element width (only used once to get base width)
function getInitialWidth(): number {
  if (pdfWrapperRef.value) {
    return pdfWrapperRef.value.offsetWidth || pdfWrapperRef.value.clientWidth
  }
  // Fallback: if no ref, return default
  return 800
}

// Zoom functions using width
function zoomIn() {
  // If first time (null), get initial width from element
  if (pdfWidth.value === null || pdfWidth.value === undefined) {
    const initialWidth = getInitialWidth()
    baseWidth.value = initialWidth
    pdfWidth.value = initialWidth + widthStep
  }
  else {
    // Use current pdfWidth value
    const newWidth = pdfWidth.value + widthStep
    if (newWidth <= maxWidth) {
      pdfWidth.value = newWidth
    }
    else {
      pdfWidth.value = maxWidth
    }
  }
}

function zoomOut() {
  // If first time (null), get initial width from element
  if (pdfWidth.value === null || pdfWidth.value === undefined) {
    const initialWidth = getInitialWidth()
    baseWidth.value = initialWidth
    pdfWidth.value = initialWidth - widthStep
  }
  else {
    // Use current pdfWidth value
    const newWidth = pdfWidth.value - widthStep
    if (newWidth >= minWidth) {
      pdfWidth.value = newWidth
    }
    else {
      pdfWidth.value = minWidth
    }
  }
}

function resetZoom() {
  pdfWidth.value = null // Reset to 100% (null)
  baseWidth.value = null // Reset base width
}

// Calculate zoom percentage (null = 100%)
const zoomPercentage = computed(() => {
  if (pdfWidth.value === null || pdfWidth.value === undefined) {
    return 100 // Always 100% when null
  }
  // Use stored base width for calculation
  const base = baseWidth.value || getInitialWidth()
  return Math.round((pdfWidth.value / base) * 100)
})

// PDF render scale (cho PdfViewer lazy load) - scale 1.2 = 100%, dpr nhân thêm trong component (clamp max 3)
const pdfScale = computed(() => 1.2 * (zoomPercentage.value / 100))

// Prevent download and save
function preventDownload(event: Event) {
  event.preventDefault()
  event.stopPropagation()
}

function _preventContextMenu(event: Event) {
  event.preventDefault()
}

function _preventKeydown(event: KeyboardEvent) {
  // Disable common save shortcuts
  if ((event.ctrlKey || event.metaKey) && (event.key === 's' || event.key === 'S')) {
    event.preventDefault()
    notification.warning({
      message: 'Download Disabled',
      description: 'Saving this document is not allowed',
    })
  }
  // Disable print shortcut
  if ((event.ctrlKey || event.metaKey) && event.key === 'p') {
    event.preventDefault()
    notification.warning({
      message: 'Print Disabled',
      description: 'Printing this document is not allowed',
    })
  }
}

// Handle back
function handleBack() {
  router.push(`/learning/${courseId.value}`)
}

// Initialize
onMounted(() => {
  loadDocumentFromQuery()
})

onBeforeUnmount(() => {
  // if (process.client) {
  //   document.value?.removeEventListener('contextmenu', preventContextMenu)
  //   document.value?.removeEventListener('keydown', preventKeydown)
  // }
})

// SEO
useHead({
  title: () => {
    if (document.value)
      return `${document.value.title} - Document Viewer`
    return 'Document Viewer'
  },
})
</script>

<template>
  <div class="bg-gray-50">
    <!-- Header -->
    <div class="bg-white border-b border-gray-200 sticky top-0 z-10">
      <div class="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-2">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <a-button
              type="text"
              size="small"
              class="!flex !items-center !justify-center !p-1"
              @click="handleBack"
            >
              <Icon name="solar:alt-arrow-left-outline" size="18" />
            </a-button>
            <div class="min-w-0 flex-1">
              <h1 class="text-base font-medium text-gray-900 truncate">
                {{ document?.title || 'Document Viewer' }}
              </h1>
              <p v-if="document" class="text-xs text-gray-500 truncate">
                {{ document.title }}
              </p>
            </div>
          </div>
          <div v-if="isPdf" class="flex items-center gap-1 flex-shrink-0">
            <!-- Zoom Controls -->
            <div class="flex items-center gap-1">
              <a-button
                :disabled="pdfWidth !== null && pdfWidth !== undefined && pdfWidth <= minWidth"
                size="small"
                class="!p-1 !h-7 !w-7"
                title="Zoom Out"
                @click="zoomOut"
              >
                <Icon name="solar:magnifer-zoom-out-linear" size="14" />
              </a-button>
              <span class="text-xs text-gray-600 px-1.5 min-w-[50px] text-center">
                {{ zoomPercentage }}%
              </span>
              <a-button
                :disabled="pdfWidth !== null && pdfWidth !== undefined && pdfWidth >= maxWidth"
                size="small"
                class="!p-1 !h-7 !w-7"
                title="Zoom In"
                @click="zoomIn"
              >
                <Icon name="solar:magnifer-zoom-in-linear" size="14" />
              </a-button>
              <a-button
                size="small"
                class="!p-1 !h-7 !w-7"
                title="Reset Zoom"
                @click="resetZoom"
              >
                <Icon name="solar:restart-bold" size="14" />
              </a-button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center min-h-[60vh]">
      <a-spin size="large" />
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <a-alert
        type="error"
        :message="error"
        show-icon
        closable
        @close="error = null"
      />
    </div>

    <!-- Document Viewer -->
    <div v-else-if="document && documentUrl" class="mx-auto">
      <!-- PDF Viewer -->
        <div
        v-if="isPdf" 
          class="pdf-viewer-container"
          @contextmenu.prevent="preventDownload"
          @click.prevent="preventDownload"
        >
          <div v-if="pdfLoading" class="flex items-center justify-center py-20">
            <a-spin size="large" />
            <span class="ml-3 text-gray-600">Loading PDF...</span>
          </div>

          <a-alert
            v-if="pdfError"
            type="error"
            :message="pdfError"
            show-icon
            class="m-4"
          />

          <!-- PDF Viewer: lazy load với pdfjs-dist + IntersectionObserver -->
              <LearningPdfViewer
              v-if="!pdfError && documentUrl"
                :url="documentUrl"
                :scale="pdfScale"
                @loaded="handlePdfLoaded"
                @error="handlePdfError"
              />
        </div>

      <!-- Document Info -->
      <div v-if="document.description" class="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 class="text-lg font-semibold text-gray-900 mb-2">
          Description
        </h3>
        <p class="text-gray-600 whitespace-pre-wrap">
          {{ document.description }}
        </p>
      </div>
    </div>

    <!-- No Document State -->
    <div v-else class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div class="text-center">
        <Icon name="solar:file-text-bold" size="64" class="text-gray-400 mx-auto mb-4" />
        <h3 class="text-lg font-semibold text-gray-900 mb-2">
          Document not found
        </h3>
        <p class="text-gray-500 mb-4">
          The requested document could not be found.
        </p>
        <a-button type="primary" @click="handleBack">
          Back to Lesson
        </a-button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pdf-viewer-container {
  position: relative;
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
}

/* Prevent text selection */
.pdf-viewer-container * {
  -webkit-touch-callout: none;
  -webkit-user-select: none;
  -khtml-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
}

/* Hide download buttons in PDF viewer */
:deep(.pdf-viewer-container a),
:deep(.pdf-viewer-container button[download]) {
  display: none !important;
}
</style>
