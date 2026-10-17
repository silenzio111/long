<template>
  <div 
    ref="containerRef" 
    class="dual-pdf-reader" 
    :class="{ 
      'is-zen-mode': isZenMode, 
      'is-fullscreen': isFullscreen 
    }"
  >
    <!-- 顶部控制工具栏 -->
    <div class="reader-toolbar">
      <div class="toolbar-section title-section">
        <span class="book-title" :title="title">{{ title || t.defaultTitle }}</span>
      </div>

      <!-- 视图模式切换 -->
      <div class="toolbar-section mode-section">
        <div class="mode-btn-group">
          <button 
            type="button"
            :class="['mode-btn', { active: viewMode === 'dual' }]" 
            @click="setMode('dual')"
            :title="t.dualTitle"
          >
            {{ t.dualMode }}
          </button>
          <button 
            type="button"
            :class="['mode-btn', { active: viewMode === 'zh' }]" 
            @click="setMode('zh')"
            :title="t.zhTitle"
          >
            {{ t.zhMode }}
          </button>
          <button 
            type="button"
            :class="['mode-btn', { active: viewMode === 'en' }]" 
            @click="setMode('en')"
            :title="t.enTitle"
          >
            {{ t.enMode }}
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
          :title="t.prevTitle"
        >
          {{ t.prev }}
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
          :title="t.nextTitle"
        >
          {{ t.next }}
        </button>
      </div>

      <!-- 缩放与全屏工具 -->
      <div class="toolbar-section tool-section">
        <button type="button" class="tool-btn" @click="autoFitWidth" :title="t.fitWidth">
          {{ t.fitWidthBtn }}
        </button>
        <button type="button" class="tool-btn" @click="zoomOut" :title="t.zoomOut" :disabled="scale <= 0.5">
          －
        </button>
        <span class="zoom-value">{{ Math.round(scale * 100) }}%</span>
        <button type="button" class="tool-btn" @click="zoomIn" :title="t.zoomIn" :disabled="scale >= 2.5">
          ＋
        </button>
        <button 
          type="button" 
          class="tool-btn btn-zen" 
          :class="{ active: isZenMode }"
          @click="toggleZenMode" 
          :title="isZenMode ? t.exitZen : t.enterZen"
        >
          {{ isZenMode ? t.exitZenBtn : t.enterZenBtn }}
        </button>
        <button type="button" class="tool-btn" @click="toggleFullscreen" :title="isFullscreen ? t.exitFullscreen : t.fullscreen">
          {{ isFullscreen ? t.exitFullscreen : t.fullscreen }}
        </button>
      </div>
    </div>

    <!-- 主展示视窗 -->
    <div ref="viewportRef" class="reader-viewport" :class="[`mode-${viewMode}`]">
      <!-- 英文栏 -->
      <div v-show="viewMode === 'dual' || viewMode === 'en'" class="canvas-wrapper en-wrapper">
        <div class="column-badge">{{ t.enBadge }} (Page {{ currentPage }})</div>
        <div class="canvas-box">
          <canvas ref="enCanvasRef"></canvas>
        </div>
      </div>

      <!-- 中文栏 -->
      <div v-show="viewMode === 'dual' || viewMode === 'zh'" class="canvas-wrapper zh-wrapper">
        <div class="column-badge badge-zh">{{ t.zhBadge }} (Page {{ currentPage }})</div>
        <div class="canvas-box">
          <canvas ref="zhCanvasRef"></canvas>
        </div>
      </div>

      <!-- 加载遮罩 -->
      <div v-if="loading" class="reader-loading">
        <div class="spinner"></div>
        <span>{{ t.loadingText(currentPage) }}</span>
      </div>

      <!-- 错误提示 -->
      <div v-if="errorMessage" class="reader-error">
        <span>{{ errorMessage }}</span>
      </div>
    </div>

    <!-- 底部状态与下载栏 -->
    <div class="reader-footer">
      <div class="tip-text">{{ t.tipNav }}</div>
      <div class="download-links">
        <a v-if="zhSrc" :href="zhSrc" download class="dl-link" target="_blank">{{ t.dlZh }}</a>
        <a v-if="enSrc" :href="enSrc" download class="dl-link" target="_blank">{{ t.dlEn }}</a>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed, nextTick } from 'vue'
import { useRoute } from 'vitepress'

const props = defineProps<{
  title?: string
  enSrc: string
  zhSrc: string
  initialPage?: number
  lang?: 'zh' | 'en'
}>()

const route = useRoute()
const currentLang = computed<'zh' | 'en'>(() => {
  if (props.lang) return props.lang
  if (route.path.startsWith('/en/') || route.path === '/en') return 'en'
  return 'zh'
})

const i18n = {
  zh: {
    defaultTitle: '在线双语阅读器',
    dualMode: '中英双栏',
    dualTitle: '双栏中英对照',
    zhMode: '仅中文',
    zhTitle: '仅显示中文译本',
    enMode: '仅英文',
    enTitle: '仅显示英文原版',
    prev: '上一页',
    prevTitle: '上一页 (← 快捷键)',
    next: '下一页',
    nextTitle: '下一页 (→ 快捷键)',
    fitWidth: '自动充满宽度',
    fitWidthBtn: '铺满宽度',
    zoomIn: '放大',
    zoomOut: '缩小',
    enterZen: '沉浸宽屏阅读（隐去页面侧边栏）',
    enterZenBtn: '沉浸宽屏',
    exitZen: '退出沉浸宽屏',
    exitZenBtn: '退出宽屏',
    fullscreen: '系统全屏',
    exitFullscreen: '退出全屏',
    enBadge: '英文原版',
    zhBadge: '中文译本',
    loadingText: (p: number) => `正在加载第 ${p} 页...`,
    tipNav: '提示：支持键盘左右方向键 (← / →) 翻页，快捷按“铺满宽度”或“沉浸宽屏”最大化阅读视野',
    dlZh: '下载完整中文版',
    dlEn: '下载英文原版'
  },
  en: {
    defaultTitle: 'Online Bilingual Reader',
    dualMode: 'Dual Columns',
    dualTitle: 'Side-by-side bilingual view',
    zhMode: 'Chinese Only',
    zhTitle: 'View Chinese translation only',
    enMode: 'English Only',
    enTitle: 'View original English only',
    prev: 'Prev',
    prevTitle: 'Previous page (← key)',
    next: 'Next',
    nextTitle: 'Next page (→ key)',
    fitWidth: 'Fit page to available width',
    fitWidthBtn: 'Fit Width',
    zoomIn: 'Zoom in',
    zoomOut: 'Zoom out',
    enterZen: 'Zen wide view (hide navigation bars)',
    enterZenBtn: 'Zen Wide',
    exitZen: 'Exit Zen View',
    exitZenBtn: 'Exit Zen',
    fullscreen: 'Fullscreen',
    exitFullscreen: 'Exit Fullscreen',
    enBadge: 'Original English',
    zhBadge: 'Chinese Translation',
    loadingText: (p: number) => `Loading page ${p}...`,
    tipNav: 'Tip: Use arrow keys (← / →) to turn pages. Click "Fit Width" or "Zen Wide" to maximize space.',
    dlZh: 'Download Chinese PDF',
    dlEn: 'Download English PDF'
  }
}

const t = computed(() => i18n[currentLang.value])

const containerRef = ref<HTMLElement | null>(null)
const viewportRef = ref<HTMLElement | null>(null)
const enCanvasRef = ref<HTMLCanvasElement | null>(null)
const zhCanvasRef = ref<HTMLCanvasElement | null>(null)

const viewMode = ref<'dual' | 'zh' | 'en'>('dual')
const currentPage = ref(props.initialPage || 1)
const inputPage = ref(props.initialPage || 1)
const totalEnPages = ref(0)
const totalZhPages = ref(0)
const scale = ref(1.0)
const isAutoScaled = ref(true)
const loading = ref(false)
const errorMessage = ref('')
const isFullscreen = ref(false)
const isZenMode = ref(false)

const maxPages = computed(() => {
  if (viewMode.value === 'en') return totalEnPages.value
  if (viewMode.value === 'zh') return totalZhPages.value
  return Math.min(totalEnPages.value || 9999, totalZhPages.value || 9999) || totalEnPages.value || totalZhPages.value
})

let pdfjsLib: any = null
let enPdfDoc: any = null
let zhPdfDoc: any = null
let basePageWidth = 595
let currentRenderTasks: any[] = []

const cancelCurrentTasks = () => {
  currentRenderTasks.forEach(task => {
    try {
      if (task && task.cancel) task.cancel()
    } catch (_) {}
  })
  currentRenderTasks = []
}

const computeFitScale = () => {
  if (!viewportRef.value) return 1.0
  const viewportWidth = viewportRef.value.clientWidth || window.innerWidth
  if (viewMode.value === 'dual') {
    // 两个栏位，减去 padding 和间隙
    const colWidth = (viewportWidth - 72) / 2
    return Math.max(0.65, Math.min(2.2, parseFloat((colWidth / basePageWidth).toFixed(2))))
  } else {
    // 单栏模式，居中铺展
    const targetWidth = Math.min(viewportWidth - 64, 1150)
    return Math.max(0.75, Math.min(2.4, parseFloat((targetWidth / basePageWidth).toFixed(2))))
  }
}

const autoFitWidth = () => {
  isAutoScaled.value = true
  scale.value = computeFitScale()
  renderCurrentPage()
}

const loadPdfs = async () => {
  if (typeof window === 'undefined') return
  try {
    loading.value = true
    errorMessage.value = ''

    if (!pdfjsLib) {
      pdfjsLib = await import('pdfjs-dist')
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`
    }

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

    // 探测基准页面尺寸以计算最佳自适应比例
    try {
      const probePage = await (zhDoc || enDoc).getPage(1)
      const vp = probePage.getViewport({ scale: 1.0 })
      basePageWidth = vp.width || 595
    } catch (_) {}

    await nextTick()
    scale.value = computeFitScale()
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
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const viewport = page.getViewport({ scale: scale.value })

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
  scale.value = computeFitScale()
  renderCurrentPage()
}

const zoomIn = () => {
  isAutoScaled.value = false
  if (scale.value < 2.5) {
    scale.value = parseFloat((scale.value + 0.15).toFixed(2))
    renderCurrentPage()
  }
}

const zoomOut = () => {
  isAutoScaled.value = false
  if (scale.value > 0.5) {
    scale.value = parseFloat((scale.value - 0.15).toFixed(2))
    renderCurrentPage()
  }
}

const toggleZenMode = () => {
  isZenMode.value = !isZenMode.value
  nextTick(() => {
    scale.value = computeFitScale()
    renderCurrentPage()
  })
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
  } else if (e.key === 'Escape' && isZenMode.value) {
    isZenMode.value = false
    scale.value = computeFitScale()
    renderCurrentPage()
  }
}

const onFullscreenChange = () => {
  isFullscreen.value = !!document.fullscreenElement
  scale.value = computeFitScale()
  renderCurrentPage()
}

const handleResize = () => {
  if (isAutoScaled.value) {
    scale.value = computeFitScale()
    renderCurrentPage()
  }
}

onMounted(() => {
  loadPdfs()
  window.addEventListener('keydown', handleKeydown)
  window.addEventListener('resize', handleResize)
  document.addEventListener('fullscreenchange', onFullscreenChange)
})

onUnmounted(() => {
  cancelCurrentTasks()
  window.removeEventListener('keydown', handleKeydown)
  window.removeEventListener('resize', handleResize)
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
  border-radius: 12px;
  overflow: hidden;
  margin: 1.5rem 0 2rem 0;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.08);
  width: 100%;
  transition: all 0.25s ease;
}

/* 沉浸宽屏模式 (Zen Mode): 覆盖整个浏览器可视窗口，隐藏多余框架 */
.dual-pdf-reader.is-zen-mode {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1000;
  border-radius: 0;
  margin: 0;
  border: none;
  height: 100vh;
}

/* 系统全屏 */
.dual-pdf-reader.is-fullscreen {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9999;
  border-radius: 0;
  margin: 0;
  height: 100vh;
}

/* 控制栏 */
.reader-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  padding: 0.7rem 1.2rem;
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
  max-width: 260px;
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
  padding: 4px 12px;
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
  padding: 4px 11px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.84rem;
  transition: all 0.15s ease;
}

.ctrl-btn:hover:not(:disabled), .tool-btn:hover:not(:disabled) {
  background: var(--vp-c-bg-mute);
  border-color: var(--vp-c-brand-1);
}

.ctrl-btn:disabled, .tool-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.tool-btn.btn-zen.active {
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
  border-color: var(--vp-c-brand-1);
}

.page-indicator {
  display: flex;
  align-items: center;
  gap: 4px;
}

.page-input {
  width: 52px;
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
  min-width: 42px;
  text-align: center;
}

/* 视窗区域：高度与宽度合理化拉伸 */
.reader-viewport {
  position: relative;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  background-color: var(--vp-c-bg-alt);
  min-height: 720px;
  height: calc(88vh - 120px);
  padding: 1.5rem 1rem;
  gap: 1.5rem;
  overflow: auto;
}

.is-zen-mode .reader-viewport,
.is-fullscreen .reader-viewport {
  height: calc(100vh - 110px);
}

.canvas-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  max-width: 100%;
}

.column-badge {
  font-size: 0.76rem;
  padding: 3px 10px;
  border-radius: 4px;
  margin-bottom: 0.6rem;
  background-color: var(--vp-c-bg-mute);
  color: var(--vp-c-text-2);
  font-weight: 500;
}

.column-badge.badge-zh {
  color: var(--vp-c-brand-1);
  font-weight: 600;
}

.canvas-box {
  background: white;
  box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.16);
  border-radius: 6px;
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
  background: rgba(var(--vp-c-bg-rgb, 255, 255, 255), 0.78);
  backdrop-filter: blur(3px);
  gap: 0.8rem;
  color: var(--vp-c-text-1);
  font-size: 0.95rem;
}

.spinner {
  width: 32px;
  height: 32px;
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
  border-radius: 6px;
  font-size: 0.85rem;
}

/* 底部状态与操作 */
.reader-footer {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  padding: 0.6rem 1.2rem;
  background: var(--vp-c-bg-soft);
  border-top: 1px solid var(--vp-c-divider);
  font-size: 0.82rem;
  color: var(--vp-c-text-2);
  gap: 0.6rem;
}

.download-links {
  display: flex;
  gap: 1.2rem;
}

.dl-link {
  color: var(--vp-c-brand-1);
  text-decoration: underline;
  font-weight: 500;
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
