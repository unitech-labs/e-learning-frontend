import type { PDFDocumentProxy } from 'pdfjs-dist'

/**
 * Đọc PDF ngay trên trình duyệt (pdfjs) để chuyển trang đề thành ảnh và trích chữ.
 * pdfjs chỉ được tải khi cần (giáo viên mở hộp nhập đề), không vào bundle chung.
 */
let pdfjsPromise: Promise<typeof import('pdfjs-dist')> | null = null

function loadPdfjs() {
  if (!pdfjsPromise) {
    pdfjsPromise = Promise.all([
      import('pdfjs-dist'),
      import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
    ]).then(([pdfjs, worker]) => {
      pdfjs.GlobalWorkerOptions.workerSrc = worker.default
      return pdfjs
    })
  }
  return pdfjsPromise
}

export async function openPdf(file: File): Promise<PDFDocumentProxy> {
  const pdfjs = await loadPdfjs()
  const data = new Uint8Array(await file.arrayBuffer())
  return pdfjs.getDocument({ data }).promise
}

/** Vẽ một trang (đánh số từ 1) ra canvas rộng `width` px, nền trắng. */
export async function renderPdfPage(doc: PDFDocumentProxy, pageNumber: number, width: number): Promise<HTMLCanvasElement> {
  const page = await doc.getPage(pageNumber)
  try {
    const viewport = page.getViewport({ scale: width / page.getViewport({ scale: 1 }).width })
    const canvas = document.createElement('canvas')
    canvas.width = Math.floor(viewport.width)
    canvas.height = Math.floor(viewport.height)
    const ctx = canvas.getContext('2d')!
    // JPEG không có nền trong suốt — tô trắng trước để chỗ trống không thành đen.
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    // intent 'print': pdf.js không chờ requestAnimationFrame, nên vẫn vẽ được khi giáo viên chuyển sang tab khác.
    await page.render({ canvasContext: ctx, viewport, intent: 'print' }).promise
    return canvas
  }
  finally {
    page.cleanup()
  }
}

export function canvasToJpeg(canvas: HTMLCanvasElement, quality = 0.85): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => (blob ? resolve(blob) : reject(new Error('Không chuyển được trang thành ảnh'))), 'image/jpeg', quality)
  })
}

/** Chữ của một trang (PDF scan thì rỗng). */
export async function extractPdfPageText(doc: PDFDocumentProxy, pageNumber: number): Promise<string> {
  const page = await doc.getPage(pageNumber)
  try {
    const content = await page.getTextContent()
    return content.items
      .map(item => ('str' in item ? item.str + (item.hasEOL ? '\n' : ' ') : ''))
      .join('')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  }
  finally {
    page.cleanup()
  }
}
