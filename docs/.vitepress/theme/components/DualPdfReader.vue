<template>
  <div ref="containerRef" class="dual-pdf-reader" :class="{ 'is-fullscreen': isFullscreen }">
    <!-- 顶部控制工具栏 -->
    <div class="reader-toolbar">
      <div class="toolbar-section title-section">
        <span class="book-title" :title="title">{{ title || '在线双语阅读器' }}</span>
      </div>

      <!-- 视图模式切换 -->
      <div class="toolbar-section mode-section">
        <div class="mode-btn-group">
          <button 
            type="button"
            :class="['mode-btn', { active: viewMode === 'dual' }]" 
            @click="setMode('dual')"
            title="双栏中英对照"
          >
            中英双栏
          </button>
          <button 
            type="button"
            :class="['mode-btn', { active: viewMode === 'zh' }]" 
            @click="setMode('zh')"
            title="仅显示中文译本"
          >
            仅中文
          </button>
          <button 
            type="button"
            :class="['mode-btn', { active: viewMode === 'en' }]" 
            @click="setMode('en')"
            title="仅显示英文原版"
          >
            仅英文
          </button>
        </div>
      </div>

      <!-- 翻页控制 -->
      <div class="toolbar-section page-section">
        <button 
          type="button" 
          class="ctrl-btn" 
          :disabled="currentPage <= 1 || loading" 
          @click="prevPage" 
          title="上一页 (← 快捷键)"
        >
          上一页
        </button>

        <div class="page-indicator">
          <input 
            type="number" 
            class="page-input" 
            v-model.lazy="inputPage"
            @change="onPageInputChange"
            :min="1" 
            :max="maxPages"
          />
          <span class="page-total">/ {{ maxPages || '-' }}</span>
        </div>

        <button 
          type="button" 
          class="ctrl-btn" 
          :disabled="currentPage >= maxPages || loading" 
          @click="nextPage" 
          title="下一页 (→ 快捷键)"
        >
          下一页
        </button>
      </div>

      <!-- 缩放与全屏工具 -->
      <div class="toolbar-section tool-section">
        <button type="button" class="tool-btn" @click="zoomOut" title="缩小" :disabled="scale <= 0.6">
          －
        </button>
        <span class="zoom-value">{{ Math.round(scale * 100) }}%</span>
        <button type="button" class="tool-btn" @click="zoomIn" title="放大" :disabled="scale >= 2.0">
          ＋
        </button>
        <button type="button" class="tool-btn" @click="resetZoom" title="重置缩放">
          100%
        </button>
        <button type="button" class="tool-btn" @click="toggleFullscreen" :title="isFullscreen ? '退出全屏' : '全屏阅读'">
          {{ isFullscreen ? '退出全屏' : '全屏' }}
        </button>
      </div>
    </div>

    <!-- 主展示区 -->
    <div class="reader-viewport" :class="[`mode-${viewMode}`]">
      <!-- 英文栏 -->
      <div v-show="viewMode === 'dual' || viewMode === 'en'" class="canvas-wrapper en-wrapper">
        <div class="column-badge">英文原版 (Page {{ currentPage }})</div>
        <div class="canvas-box">
          <canvas ref="enCanvasRef"></canvas>
        </div>
      </div>

      <!-- 中文栏 -->
      <div v-show="viewMode === 'dual' || viewMode === 'zh'" class="canvas-wrapper zh-wrapper">
        <div class="column-badge badge-zh">中文译本 (Page {{ currentPage }})</div>
        <div class="canvas-box">
          <canvas ref="zhCanvasRef"></canvas>
        </div>
      </div>

      <!-- 加载遮罩 -->
      <div v-if="loading" class="reader-loading">
        <div class="spinner"></div>
        <span>正在加载第 {{ currentPage }} 页...</span>
      </div>

      <!-- 错误提示 -->
      <div v-if="errorMessage" class="reader-error">
        <span>{{ errorMessage }}</span>
      </div>
    </div>

    <!-- 底部状态与下载栏 -->
    <div class="reader-footer">
      <div class="tip-text">提示：支持使用键盘左右方向键 (← / →) 快速翻页</div>
      <div class="download-links">
        <a v-if="zhSrc" :href="zhSrc" download class="dl-link" target="_blank">下载完整中文版</a>
        <a v-if="enSrc" :href="enSrc" download class="dl-link" target="_blank">下载英文原版</a>
        <a v-if="downloadDual" :href="downloadDual" download class="dl-link" target="_blank">下载中英交替版</a>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'

const props = defineProps<{
  title?: string
  enSrc: string
  zhSrc: string
  downloadDual?: string
  initialPage?: number
}>()

const containerRef = ref<HTMLElement | null>(null)
const enCanvasRef = ref<HTMLCanvasElement | null>(null)
const zhCanvasRef = ref<HTMLCanvasElement | null>(null)

const viewMode = ref<'dual' | 'zh' | 'en'>('dual')
const currentPage = ref(props.initialPage || 1)
const inputPage = ref(props.initialPage || 1)
const totalEnPages = ref(0)
const totalZhPages = ref(0)
const scale = ref(1.0)
const loading = ref(false)
const errorMessage = ref('')
const isFullscreen = ref(false)

const maxPages = computed(() => {
  if (viewMode.value === 'en') return totalEnPages.value
  if (viewMode.value === 'zh') return totalZhPages.value
  return Math.min(totalEnPages.value || 9999, totalZhPages.value || 9999) || totalEnPages.value || totalZhPages.value
})

let pdfjsLib: any = null
let enPdfDoc: any = null
let zhPdfDoc: any = null
let currentRenderTasks: any[] = []

const cancelCurrentTasks = () => {
  currentRenderTasks.forEach(task => {
    try {
      if (task && task.cancel) task.cancel()
    } catch (_) {}
  })
  currentRenderTasks = []
}

const loadPdfs = async () => {
  if (typeof window === 'undefined') return
  try {
    loading.value = true
    errorMessage.value = ''

    if (!pdfjsLib) {
      pdfjsLib = await import('pdfjs-dist')
      // 设置 worker
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`
    }

    // 并行拉取文档元数据（range 范围请求，不会拉取全部页面）
    const loadEn = pdfjsLib.getDocument({
      url: props.enSrc,
      disableAutoFetch: true,
      rangeChunkSize: 65536
    }).promise

    const loadZh = pdfjsLib.getDocument({
      url: props.zhSrc,
      disableAutoFetch: true,
      rangeChunkSize: 65536
    }).promise

    const [enDoc, zhDoc] = await Promise.all([loadEn, loadZh])
    enPdfDoc = enDoc
    zhPdfDoc = zhDoc
    totalEnPages.value = enDoc.numPages
    totalZhPages.value = zhDoc.numPages

    await renderCurrentPage()
  } catch (err: any) {
    console.error('PDF 加载错误:', err)
    errorMessage.value = `PDF 文档加载失败: ${err?.message || '网络或格式异常'}`
  } finally {
    loading.value = false
  }
}

const renderSinglePage = async (doc: any, pageNum: number, canvas: HTMLCanvasElement | null) => {
  if (!doc || !canvas) return
  if (pageNum < 1 || pageNum > doc.numPages) return

  const page = await doc.getPage(pageNum)
  const dpr = window.devicePixelRatio || 1
  const viewport = page.getViewport({ scale: scale.value * 1.5 })

  canvas.width = Math.floor(viewport.width * dpr)
  canvas.height = Math.floor(viewport.height * dpr)
  canvas.style.width = `${Math.floor(viewport.width)}px`
  canvas.style.height = `${Math.floor(viewport.height)}px`

  const ctx = canvas.getContext('2d', { alpha: false })
  if (!ctx) return
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

  const renderTask = page.render({
    canvasContext: ctx,
    viewport: viewport
  })
  currentRenderTasks.push(renderTask)
  await renderTask.promise
}

const renderCurrentPage = async () => {
  if (typeof window === 'undefined') return
  cancelCurrentTasks()
  loading.value = true
  errorMessage.value = ''

  try {
    const promises: Promise<any>[] = []
    if ((viewMode.value === 'dual' || viewMode.value === 'en') && enPdfDoc) {
      promises.push(renderSinglePage(enPdfDoc, currentPage.value, enCanvasRef.value))
    }
    if ((viewMode.value === 'dual' || viewMode.value === 'zh') && zhPdfDoc) {
      promises.push(renderSinglePage(zhPdfDoc, currentPage.value, zhCanvasRef.value))
    }
    await Promise.all(promises)
  } catch (err: any) {
    if (err?.name !== 'RenderingCancelledException') {
      console.error('页面渲染错误:', err)
      errorMessage.value = `页面渲染错误: ${err?.message || '未知错误'}`
    }
  } finally {
    loading.value = false
  }
}

const prevPage = () => {
  if (currentPage.value > 1) {
    currentPage.value--
    inputPage.value = currentPage.value
    renderCurrentPage()
  }
}

const nextPage = () => {
  if (currentPage.value < maxPages.value) {
    currentPage.value++
    inputPage.value = currentPage.value
    renderCurrentPage()
  }
}

const onPageInputChange = () => {
  let val = parseInt(String(inputPage.value), 10)
  if (isNaN(val)) val = 1
  if (val < 1) val = 1
  if (val > maxPages.value) val = maxPages.value
  currentPage.value = val
  inputPage.value = val
  renderCurrentPage()
}

const setMode = (mode: 'dual' | 'zh' | 'en') => {
  viewMode.value = mode
  renderCurrentPage()
}

const zoomIn = () => {
  if (scale.value < 2.0) {
    scale.value = parseFloat((scale.value + 0.15).toFixed(2))
    renderCurrentPage()
  }
}

const zoomOut = () => {
  if (scale.value > 0.6) {
    scale.value = parseFloat((scale.value - 0.15).toFixed(2))
    renderCurrentPage()
  }
}

const resetZoom = () => {
  scale.value = 1.0
  renderCurrentPage()
}

const toggleFullscreen = () => {
  if (!containerRef.value) return
  if (!document.fullscreenElement) {
    containerRef.value.requestFullscreen().catch(() => {})
  } else {
    document.exitFullscreen().catch(() => {})
  }
}

const handleKeydown = (e: KeyboardEvent) => {
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
  if (e.key === 'ArrowLeft') {
    prevPage()
  } else if (e.key === 'ArrowRight') {
    nextPage()
  }
}

const onFullscreenChange = () => {
  isFullscreen.value = !!document.fullscreenElement
}

onMounted(() => {
  loadPdfs()
  window.addEventListener('keydown', handleKeydown)
  document.addEventListener('fullscreenchange', onFullscreenChange)
})

onUnmounted(() => {
  cancelCurrentTasks()
  window.removeEventListener('keydown', handleKeydown)
  document.removeEventListener('fullscreenchange', onFullscreenChange)
})

watch(() => [props.enSrc, props.zhSrc], () => {
  loadPdfs()
})
</script>

<style scoped>
.dual-pdf-reader {
  display: flex;
  flex-direction: column;
  background-color: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  overflow: hidden;
  margin: 1.5rem 0;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
}

.dual-pdf-reader.is-fullscreen {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9999;
  border-radius: 0;
  margin: 0;
}

/* 控制栏 */
.reader-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  padding: 0.6rem 1rem;
  background-color: var(--vp-c-bg-soft);
  border-bottom: 1px solid var(--vp-c-divider);
  gap: 0.8rem;
  user-select: none;
}

.toolbar-section {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.book-title {
  font-weight: 600;
  font-size: 0.95rem;
  color: var(--vp-c-text-1);
  max-width: 240px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 模式切换按钮组 */
.mode-btn-group {
  display: flex;
  background: var(--vp-c-bg-mute);
  border-radius: 6px;
  padding: 2px;
}

.mode-btn {
  border: none;
  background: transparent;
  padding: 4px 10px;
  font-size: 0.85rem;
  border-radius: 4px;
  cursor: pointer;
  color: var(--vp-c-text-2);
  transition: all 0.2s ease;
}

.mode-btn.active {
  background: var(--vp-c-bg);
  color: var(--vp-c-brand-1);
  font-weight: 600;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

/* 翻页控制 */
.ctrl-btn, .tool-btn {
  padding: 4px 10px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.85rem;
  transition: background 0.15s ease;
}

.ctrl-btn:hover:not(:disabled), .tool-btn:hover:not(:disabled) {
  background: var(--vp-c-bg-mute);
  border-color: var(--vp-c-brand-1);
}

.ctrl-btn:disabled, .tool-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.page-indicator {
  display: flex;
  align-items: center;
  gap: 4px;
}

.page-input {
  width: 50px;
  text-align: center;
  padding: 3px 6px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  font-size: 0.85rem;
}

.page-total {
  font-size: 0.85rem;
  color: var(--vp-c-text-2);
}

.zoom-value {
  font-size: 0.82rem;
  color: var(--vp-c-text-2);
  min-width: 40px;
  text-align: center;
}

/* 视窗区域 */
.reader-viewport {
  position: relative;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  background-color: var(--vp-c-bg-alt);
  min-height: 600px;
  padding: 1.5rem 1rem;
  gap: 1.5rem;
  overflow: auto;
}

.canvas-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  max-width: 100%;
}

.column-badge {
  font-size: 0.78rem;
  padding: 2px 8px;
  border-radius: 4px;
  margin-bottom: 0.5rem;
  background-color: var(--vp-c-bg-mute);
  color: var(--vp-c-text-2);
  font-weight: 500;
}

.column-badge.badge-zh {
  color: var(--vp-c-brand-1);
}

.canvas-box {
  background: white;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.12);
  border-radius: 4px;
  overflow: hidden;
  display: flex;
  justify-content: center;
}

.canvas-box canvas {
  display: block;
}

/* 遮罩与状态 */
.reader-loading {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(var(--vp-c-bg-rgb, 255, 255, 255), 0.75);
  backdrop-filter: blur(2px);
  gap: 0.8rem;
  color: var(--vp-c-text-1);
  font-size: 0.9rem;
}

.spinner {
  width: 28px;
  height: 28px;
  border: 3px solid var(--vp-c-divider);
  border-top-color: var(--vp-c-brand-1);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.reader-error {
  position: absolute;
  top: 1rem;
  background: #fee2e2;
  color: #b91c1c;
  padding: 0.6rem 1rem;
  border-radius: 4px;
  font-size: 0.85rem;
}

/* 底部状态 */
.reader-footer {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  padding: 0.6rem 1rem;
  background: var(--vp-c-bg-soft);
  border-top: 1px solid var(--vp-c-divider);
  font-size: 0.82rem;
  color: var(--vp-c-text-2);
  gap: 0.6rem;
}

.download-links {
  display: flex;
  gap: 1rem;
}

.dl-link {
  color: var(--vp-c-brand-1);
  text-decoration: underline;
}

.dl-link:hover {
  color: var(--vp-c-brand-2);
}

@media (max-width: 960px) {
  .reader-viewport.mode-dual {
    flex-direction: column;
    align-items: center;
  }
}
</style>
