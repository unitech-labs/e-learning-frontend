<script setup lang="ts">
import * as pdfjsLib from 'pdfjs-dist'
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

const props = withDefaults(defineProps<{ url: string; scale?: number }>(), {
  scale: 1,
})

const emit = defineEmits<{
  loaded: []
  error: [message: string]
}>()

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker

const container = ref<HTMLElement | null>(null)
const numPages = ref(0)
const estimatedPageHeight = ref(1000)
const isDocLoading = ref(true)

// Non-reactive maps to avoid triggering Vue re-renders on canvas mutations
const canvasMap = new Map<number, HTMLCanvasElement>()
const renderedPages = new Set<number>()
const renderingPages = new Set<number>()

let pdfDoc: any = null
let rafId = 0
let currentScale = props.scale

function setCanvasRef(page: number, el: any) {
  if (el instanceof HTMLCanvasElement) {
    canvasMap.set(page, el)
  }
}

async function renderPage(pageNumber: number) {
  if (!pdfDoc || renderedPages.has(pageNumber) || renderingPages.has(pageNumber)) return

  const canvas = canvasMap.get(pageNumber)
  if (!canvas) return

  renderingPages.add(pageNumber)

  try {
    const page = await pdfDoc.getPage(pageNumber)
    const dpr = window.devicePixelRatio || 1

    // Use props.scale as CSS-level scale, render at higher res for sharpness
    const viewport = page.getViewport({ scale: props.scale })

    canvas.width = Math.floor(viewport.width * dpr)
    canvas.height = Math.floor(viewport.height * dpr)
    canvas.style.width = `${Math.floor(viewport.width)}px`
    canvas.style.height = `${Math.floor(viewport.height)}px`

    const ctx = canvas.getContext('2d')
    if (!ctx) {
      page.cleanup()
      return
    }

    const transform: [number, number, number, number, number, number] = [dpr, 0, 0, dpr, 0, 0]
    await page.render({ canvasContext: ctx, transform, viewport }).promise
    page.cleanup()

    renderedPages.add(pageNumber)
  }
  catch (err) {
    console.warn(`Failed to render page ${pageNumber}:`, err)
  }
  finally {
    renderingPages.delete(pageNumber)
  }
}

function destroyPage(pageNumber: number) {
  if (!renderedPages.has(pageNumber)) return

  const canvas = canvasMap.get(pageNumber)
  if (canvas) {
    const ctx = canvas.getContext('2d')
    ctx?.clearRect(0, 0, canvas.width, canvas.height)
    canvas.width = 0
    canvas.height = 0
  }
  renderedPages.delete(pageNumber)
}

function getCurrentPage(): number {
  const el = container.value
  if (!el) return 1

  const scrollTop = el.scrollTop
  const viewportMid = scrollTop + el.clientHeight / 2
  const pageH = estimatedPageHeight.value + 16 // 16 = margin-bottom

  return Math.max(1, Math.min(numPages.value, Math.ceil(viewportMid / pageH)))
}

function updateVisiblePages() {
  if (!pdfDoc || !container.value) return

  const currentPage = getCurrentPage()
  const start = Math.max(1, currentPage - 2)
  const end = Math.min(numPages.value, currentPage + 2)

  for (let i = start; i <= end; i++) {
    renderPage(i)
  }

  // Destroy pages far outside viewport to save memory
  for (const pageNum of [...renderedPages]) {
    if (pageNum < start - 3 || pageNum > end + 3) {
      destroyPage(pageNum)
    }
  }
}

function onScroll() {
  cancelAnimationFrame(rafId)
  rafId = requestAnimationFrame(updateVisiblePages)
}

// Watch scale changes for zoom
watch(() => props.scale, async (newScale) => {
  if (!pdfDoc || newScale === currentScale) return
  currentScale = newScale

  // Update estimated page height for new scale
  const firstPage = await pdfDoc.getPage(1)
  const vp = firstPage.getViewport({ scale: newScale })
  estimatedPageHeight.value = Math.floor(vp.height)
  firstPage.cleanup()

  // Clear all rendered pages so they re-render with new scale
  for (const pageNum of [...renderedPages]) {
    destroyPage(pageNum)
  }

  await nextTick()
  updateVisiblePages()
})

onMounted(async () => {
  try {
    const loadingTask = pdfjsLib.getDocument({
      url: props.url,
      rangeChunkSize: 65536,
    })

    pdfDoc = await loadingTask.promise
    numPages.value = pdfDoc.numPages

    // Measure first page to estimate page heights
    const firstPage = await pdfDoc.getPage(1)
    const vp = firstPage.getViewport({ scale: props.scale })
    estimatedPageHeight.value = Math.floor(vp.height)
    currentScale = props.scale
    firstPage.cleanup()

    isDocLoading.value = false
    emit('loaded')

    await nextTick()

    container.value?.addEventListener('scroll', onScroll, { passive: true })
    updateVisiblePages()
  }
  catch (err: any) {
    console.error('Failed to load PDF:', err)
    isDocLoading.value = false
    emit('error', err?.message || 'Failed to load PDF')
  }
})

onBeforeUnmount(() => {
  cancelAnimationFrame(rafId)
  container.value?.removeEventListener('scroll', onScroll)
  renderedPages.clear()
  renderingPages.clear()
  canvasMap.clear()
  pdfDoc?.destroy?.()
  pdfDoc = null
})
</script>

<template>
  <div ref="container" class="pdf-container">
    <div v-if="isDocLoading" class="pdf-loading">
      <a-spin size="large" />
    </div>
    <template v-else>
      <div
        v-for="page in numPages"
        :key="page"
        class="pdf-page-wrapper"
        :style="{ minHeight: `${estimatedPageHeight}px` }"
      >
        <canvas :ref="(el) => setCanvasRef(page, el as HTMLCanvasElement)" />
      </div>
    </template>
  </div>
</template>

<style scoped>
.pdf-container {
  overflow-y: auto;
  height: calc(100vh - 137px);
  background: #f5f5f5;
}

.pdf-page-wrapper {
  display: flex;
  justify-content: center;
  margin-bottom: 16px;
}

.pdf-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}
</style>
