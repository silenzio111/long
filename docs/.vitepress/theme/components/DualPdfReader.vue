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
        <button 
          type="button" 
          class="btn-info" 
          @click="showInfoModal = !showInfoModal" 
          :title="t.infoTitle"
        >
          ℹ️ {{ t.infoBtn }}
        </button>
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
          @click="scrollToPage(currentPage - 1)" 
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
          @click="scrollToPage(currentPage + 1)" 
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
        <button type="button" class="tool-btn" @click="zoomOut" :title="t.zoomOut" :disabled="scale <= 0.45">
          －
        </button>
        <span class="zoom-value">{{ Math.round(scale * 100) }}%</span>
        <button type="button" class="tool-btn" @click="zoomIn" :title="t.zoomIn" :disabled="scale >= 2.6">
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

    <!-- 连续垂直自然滚动阅读视窗 -->
    <div 
      ref="viewportRef" 
      class="reader-viewport" 
      :class="[`mode-${viewMode}`]"
      @scroll.passive="onViewportScroll"
    >
      <div class="continuous-pages-stream">
        <div 
          v-for="p in maxPages" 
          :key="p" 
          :id="`page-row-${p}`"
          :data-page="p"
          class="continuous-page-row"
          :style="{ minHeight: `${computedPageHeight + 36}px` }"
        >
          <!-- 悬浮页码指示 -->
          <div class="page-row-header">
            <span class="page-badge">第 {{ p }} 页 / 共 {{ maxPages }} 页</span>
          </div>

          <!-- 双栏或单栏页面画布组 -->
          <div class="page-canvases-group">
            <!-- 英文原版页 -->
            <div 
              v-show="viewMode === 'dual' || viewMode === 'en'" 
              class="canvas-card en-card"
              :style="{ width: `${computedPageWidth}px`, height: `${computedPageHeight}px` }"
            >
              <div v-if="viewMode === 'dual'" class="col-indicator">{{ t.enBadge }}</div>
              <canvas :ref="el => registerCanvas(el, 'en', p)"></canvas>
            </div>

            <!-- 中文译本页 -->
            <div 
              v-show="viewMode === 'dual' || viewMode === 'zh'" 
              class="canvas-card zh-card"
              :style="{ width: `${computedPageWidth}px`, height: `${computedPageHeight}px` }"
            >
              <div v-if="viewMode === 'dual'" class="col-indicator col-indicator-zh">{{ t.zhBadge }}</div>
              <canvas :ref="el => registerCanvas(el, 'zh', p)"></canvas>
            </div>
          </div>
        </div>
      </div>

      <!-- 首屏加载遮罩 -->
      <div v-if="loading && renderedKeys.size === 0" class="reader-loading">
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

    <!-- 本书导读与文献信息模态框 -->
    <div v-if="showInfoModal" class="info-modal-backdrop" @click.self="showInfoModal = false">
      <div class="info-modal-content">
        <div class="modal-header">
          <h3 class="modal-title">📖 {{ title || t.defaultTitle }}</h3>
          <button class="modal-close" @click="showInfoModal = false">✕</button>
        </div>
        <div class="modal-body">
          <div class="info-row">
            <span class="info-label">文献规模：</span>
            <span>共 {{ maxPages }} 页（中英双语 1:1 同步对照）</span>
          </div>
          <div class="info-row">
            <span class="info-label">阅读模式：</span>
            <span>中英双栏同步对照、仅中文译本专注、仅英文原版精读</span>
          </div>
          <div class="info-row">
            <span class="info-label">翻页交互：</span>
            <span>文档网页锁定不滚动，在阅读窗内上下滑动鼠标滚轮或触控板即可平滑自然翻页；亦可使用键盘方向键 (↑ / ↓) 或顶栏页码框快速跳转。</span>
          </div>
          <div class="info-row">
            <span class="info-label">流式加速：</span>
            <span>依托 HTTP 206 字节流切片与按需虚拟渲染，毫秒级即开即看。</span>
          </div>
          <div class="modal-downloads">
            <a v-if="zhSrc" :href="zhSrc" download class="modal-dl-btn" target="_blank">📥 {{ t.dlZh }}</a>
            <a v-if="enSrc" :href="enSrc" download class="modal-dl-btn" target="_blank">📥 {{ t.dlEn }}</a>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted, watch, computed, nextTick } from 'vue'
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
    defaultTitle: '在线双语学术教材阅读器',
    dualMode: '中英双栏',
    dualTitle: '双栏中英对照并排滚动',
    zhMode: '仅中文',
    zhTitle: '仅显示中文译本连续滚动',
    enMode: '仅英文',
    enTitle: '仅显示英文原版连续滚动',
    prev: '上一页',
    prevTitle: '滚动到上一页 (↑ 快捷键)',
    next: '下一页',
    nextTitle: '滚动到下一页 (↓ 快捷键)',
    fitWidth: '自动铺满宽度',
    fitWidthBtn: '铺满宽度',
    zoomIn: '放大',
    zoomOut: '缩小',
    enterZen: '沉浸宽屏阅读（隐去页面侧边栏）',
    enterZenBtn: '沉浸宽屏',
    exitZen: '退出沉浸宽屏',
    exitZenBtn: '退出宽屏',
    fullscreen: '系统全屏',
    exitFullscreen: '退出全屏',
    infoBtn: '关于本书',
    infoTitle: '查看文献信息与阅读说明',
    enBadge: '英文原版',
    zhBadge: '中文译本',
    loadingText: (p: number) => `正在加载第 ${p} 页...`,
    tipNav: '提示：在阅读窗内上下滑动滚轮或触控板可连续平滑翻页，外层网页不滚动',
    dlZh: '下载高清中文版 PDF',
    dlEn: '下载英文原版 PDF'
  },
  en: {
    defaultTitle: 'Online Bilingual Academic Reader',
    dualMode: 'Dual Columns',
    dualTitle: 'Side-by-side continuous bilingual scrolling',
    zhMode: 'Chinese Only',
    zhTitle: 'Chinese translation continuous scroll',
    enMode: 'English Only',
    enTitle: 'English original continuous scroll',
    prev: 'Prev',
    prevTitle: 'Scroll to previous page (↑ key)',
    next: 'Next',
    nextTitle: 'Scroll to next page (↓ key)',
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
    infoBtn: 'About Book',
    infoTitle: 'View book metadata and instructions',
    enBadge: 'Original English',
    zhBadge: 'Chinese Translation',
    loadingText: (p: number) => `Loading page ${p}...`,
    tipNav: 'Tip: Scroll inside the reader window to turn pages continuously. The outer webpage does not scroll.',
    dlZh: 'Download Chinese PDF',
    dlEn: 'Download English PDF'
  }
}

const t = computed(() => i18n[currentLang.value])

const containerRef = ref<HTMLElement | null>(null)
const viewportRef = ref<HTMLElement | null>(null)

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
const showInfoModal = ref(false)

const maxPages = computed(() => {
  if (viewMode.value === 'en') return totalEnPages.value || 1
  if (viewMode.value === 'zh') return totalZhPages.value || 1
  return Math.min(totalEnPages.value || 9999, totalZhPages.value || 9999) || totalEnPages.value || totalZhPages.value || 1
})

let pdfjsLib: any = null
let enPdfDoc: any = null
let zhPdfDoc: any = null
let basePageWidth = 595
let basePageHeight = 842

// 页面 Canvas 映射表与已渲染状态集合
const canvasMap: { [key: string]: HTMLCanvasElement } = {}
const renderedKeys = reactive(new Set<string>())
let activeRenderTasks: any[] = []

const registerCanvas = (el: any, lang: 'en' | 'zh', pageNum: number) => {
  const key = `${lang}_${pageNum}`
  if (el) {
    canvasMap[key] = el as HTMLCanvasElement
    // 若该页在当前视口可见缓冲区内且未渲染，则触发渲染
    if (Math.abs(pageNum - currentPage.value) <= 2) {
      renderPage(pageNum)
    }
  } else {
    delete canvasMap[key]
  }
}

const computedPageWidth = computed(() => {
  return Math.floor(basePageWidth * scale.value)
})

const computedPageHeight = computed(() => {
  return Math.floor(basePageHeight * scale.value)
})

const computeFitScale = () => {
  if (!viewportRef.value) return 1.0
  const viewportWidth = viewportRef.value.clientWidth || window.innerWidth
  if (viewMode.value === 'dual') {
    // 双栏对照：视口总宽减去边距 (约 48px)，除以 2，将横向利用率拉满
    const colWidth = (viewportWidth - 48) / 2
    return Math.max(0.55, Math.min(2.5, parseFloat((colWidth / basePageWidth).toFixed(2))))
  } else {
    // 单栏模式：减去页边距，居中铺展
    const targetWidth = Math.min(viewportWidth - 36, 1200)
    return Math.max(0.7, Math.min(3.0, parseFloat((targetWidth / basePageWidth).toFixed(2))))
  }
}

const autoFitWidth = () => {
  isAutoScaled.value = true
  scale.value = computeFitScale()
  renderedKeys.clear()
  renderBufferPages(currentPage.value)
  scrollToPage(currentPage.value, false)
}

const renderDocPage = async (doc: any, pageNum: number, canvas: HTMLCanvasElement, dpr: number) => {
  if (!doc || !canvas || pageNum < 1 || pageNum > doc.numPages) return
  const page = await doc.getPage(pageNum)
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

  const task = page.render({
    canvasContext: ctx,
    viewport: viewport
  })
  activeRenderTasks.push(task)
  await task.promise
}

const renderPage = async (p: number) => {
  if (p < 1 || p > maxPages.value) return
  const dpr = Math.min(window.devicePixelRatio || 1, 2)

  // 渲染英文页
  if (viewMode.value === 'dual' || viewMode.value === 'en') {
    const key = `en_${p}`
    const cacheKey = `${key}_${scale.value}`
    if (enPdfDoc && !renderedKeys.has(cacheKey)) {
      const canvas = canvasMap[key]
      if (canvas) {
        renderedKeys.add(cacheKey)
        renderDocPage(enPdfDoc, p, canvas, dpr).catch(() => {
          renderedKeys.delete(cacheKey)
        })
      }
    }
  }

  // 渲染中文页
  if (viewMode.value === 'dual' || viewMode.value === 'zh') {
    const key = `zh_${p}`
    const cacheKey = `${key}_${scale.value}`
    if (zhPdfDoc && !renderedKeys.has(cacheKey)) {
      const canvas = canvasMap[key]
      if (canvas) {
        renderedKeys.add(cacheKey)
        renderDocPage(zhPdfDoc, p, canvas, dpr).catch(() => {
          renderedKeys.delete(cacheKey)
        })
      }
    }
  }
}

// 释放超出可视视口缓冲区的 Canvas 显存，防止长文档内存溢出
const cleanDistantPages = (centerPage: number) => {
  for (let p = 1; p <= maxPages.value; p++) {
    if (Math.abs(p - centerPage) > 4) {
      const enCacheKey = `en_${p}_${scale.value}`
      if (renderedKeys.has(enCacheKey)) {
        renderedKeys.delete(enCacheKey)
        const c = canvasMap[`en_${p}`]
        if (c) {
          c.width = 0
          c.height = 0
        }
      }
      const zhCacheKey = `zh_${p}_${scale.value}`
      if (renderedKeys.has(zhCacheKey)) {
        renderedKeys.delete(zhCacheKey)
        const c = canvasMap[`zh_${p}`]
        if (c) {
          c.width = 0
          c.height = 0
        }
      }
    }
  }
}

const renderBufferPages = (centerPage: number) => {
  const start = Math.max(1, centerPage - 2)
  const end = Math.min(maxPages.value, centerPage + 2)
  for (let p = start; p <= end; p++) {
    renderPage(p)
  }
  cleanDistantPages(centerPage)
}

let scrollDebounceTimer: any = null
const onViewportScroll = () => {
  if (!viewportRef.value) return
  const scrollTop = viewportRef.value.scrollTop
  const rowHeight = computedPageHeight.value + 36
  const curPage = Math.min(maxPages.value, Math.max(1, Math.floor((scrollTop + 100) / rowHeight) + 1))
  
  if (currentPage.value !== curPage) {
    currentPage.value = curPage
    inputPage.value = curPage
  }

  clearTimeout(scrollDebounceTimer)
  scrollDebounceTimer = setTimeout(() => {
    renderBufferPages(currentPage.value)
  }, 40)
}

const scrollToPage = (p: number, smooth = true) => {
  if (!viewportRef.value) return
  p = Math.min(maxPages.value, Math.max(1, p))
  const rowHeight = computedPageHeight.value + 36
  const targetTop = (p - 1) * rowHeight

  viewportRef.value.scrollTo({
    top: targetTop,
    behavior: smooth ? 'smooth' : 'auto'
  })

  currentPage.value = p
  inputPage.value = p
  renderBufferPages(p)
}

const onPageInputChange = () => {
  let val = parseInt(String(inputPage.value), 10)
  if (isNaN(val)) val = 1
  if (val < 1) val = 1
  if (val > maxPages.value) val = maxPages.value
  scrollToPage(val)
}

const setMode = (mode: 'dual' | 'zh' | 'en') => {
  viewMode.value = mode
  scale.value = computeFitScale()
  renderedKeys.clear()
  nextTick(() => {
    renderBufferPages(currentPage.value)
    scrollToPage(currentPage.value, false)
  })
}

const zoomIn = () => {
  isAutoScaled.value = false
  if (scale.value < 2.6) {
    scale.value = parseFloat((scale.value + 0.15).toFixed(2))
    renderedKeys.clear()
    renderBufferPages(currentPage.value)
    scrollToPage(currentPage.value, false)
  }
}

const zoomOut = () => {
  isAutoScaled.value = false
  if (scale.value > 0.45) {
    scale.value = parseFloat((scale.value - 0.15).toFixed(2))
    renderedKeys.clear()
    renderBufferPages(currentPage.value)
    scrollToPage(currentPage.value, false)
  }
}

const toggleZenMode = () => {
  isZenMode.value = !isZenMode.value
  nextTick(() => {
    scale.value = computeFitScale()
    renderedKeys.clear()
    renderBufferPages(currentPage.value)
    scrollToPage(currentPage.value, false)
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

const onFullscreenChange = () => {
  isFullscreen.value = !!document.fullscreenElement
  scale.value = computeFitScale()
  renderedKeys.clear()
  renderBufferPages(currentPage.value)
  scrollToPage(currentPage.value, false)
}

const handleResize = () => {
  if (isAutoScaled.value) {
    scale.value = computeFitScale()
    renderedKeys.clear()
    renderBufferPages(currentPage.value)
  }
}

const handleKeydown = (e: KeyboardEvent) => {
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
  if (e.key === 'ArrowUp' || e.key === 'PageUp') {
    e.preventDefault()
    scrollToPage(currentPage.value - 1)
  } else if (e.key === 'ArrowDown' || e.key === 'PageDown') {
    e.preventDefault()
    scrollToPage(currentPage.value + 1)
  } else if (e.key === 'Home') {
    e.preventDefault()
    scrollToPage(1)
  } else if (e.key === 'End') {
    e.preventDefault()
    scrollToPage(maxPages.value)
  } else if (e.key === 'Escape') {
    if (showInfoModal.value) {
      showInfoModal.value = false
    } else if (isZenMode.value) {
      isZenMode.value = false
      nextTick(() => autoFitWidth())
    }
  }
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

    // 探测基准页面尺寸
    try {
      const probePage = await (zhDoc || enDoc).getPage(1)
      const vp = probePage.getViewport({ scale: 1.0 })
      basePageWidth = vp.width || 595
      basePageHeight = vp.height || 842
    } catch (_) {}

    await nextTick()
    scale.value = computeFitScale()
    renderBufferPages(currentPage.value)

    if (props.initialPage && props.initialPage > 1) {
      await nextTick()
      scrollToPage(props.initialPage, false)
    }
  } catch (err: any) {
    console.error('PDF 加载错误:', err)
    errorMessage.value = `PDF 文档加载失败: ${err?.message || '网络或格式异常'}`
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadPdfs()
  window.addEventListener('keydown', handleKeydown)
  window.addEventListener('resize', handleResize)
  document.addEventListener('fullscreenchange', onFullscreenChange)
})

onUnmounted(() => {
  activeRenderTasks.forEach(task => {
    try { if (task && task.cancel) task.cancel() } catch (_) {}
  })
  window.removeEventListener('keydown', handleKeydown)
  window.removeEventListener('resize', handleResize)
  document.removeEventListener('fullscreenchange', onFullscreenChange)
})

watch(() => [props.enSrc, props.zhSrc], () => {
  renderedKeys.clear()
  loadPdfs()
})
</script>

<style scoped>
.dual-pdf-reader {
  display: flex;
  flex-direction: column;
  background-color: var(--vp-c-bg);
  overflow: hidden;
  width: 100%;
  height: 100%;
  transition: all 0.25s ease;
  position: relative;
}

/* 沉浸宽屏模式 (Zen Mode) */
.dual-pdf-reader.is-zen-mode {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1000;
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
  height: 100vh;
}

/* 控制栏 */
.reader-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 0.8rem;
  background-color: var(--vp-c-bg-soft);
  border-bottom: 1px solid var(--vp-c-divider);
  gap: 0.6rem;
  user-select: none;
  flex-shrink: 0;
}

.toolbar-section {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.book-title {
  font-weight: 600;
  font-size: 0.92rem;
  color: var(--vp-c-text-1);
  max-width: 320px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.btn-info {
  background: var(--vp-c-bg-mute);
  color: var(--vp-c-brand-1);
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
  padding: 2px 7px;
  font-size: 0.78rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-info:hover {
  background: var(--vp-c-brand-soft);
  border-color: var(--vp-c-brand-1);
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
  padding: 3px 10px;
  font-size: 0.82rem;
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
  padding: 3px 9px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  border-radius: 5px;
  cursor: pointer;
  font-size: 0.82rem;
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
  gap: 3px;
}

.page-input {
  width: 48px;
  text-align: center;
  padding: 2px 4px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  font-size: 0.82rem;
}

.page-total {
  font-size: 0.82rem;
  color: var(--vp-c-text-2);
}

.zoom-value {
  font-size: 0.8rem;
  color: var(--vp-c-text-2);
  min-width: 38px;
  text-align: center;
}

/* 连续自然滚动视窗 */
.reader-viewport {
  position: relative;
  flex: 1 1 auto;
  overflow-y: auto !important;
  overflow-x: auto !important;
  background-color: var(--vp-c-bg-alt);
  padding: 1rem 0.5rem 2rem 0.5rem;
  scroll-behavior: smooth;
}

.continuous-pages-stream {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  gap: 1.5rem;
}

.continuous-page-row {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  position: relative;
}

.page-row-header {
  margin-bottom: 0.45rem;
}

.page-badge {
  font-size: 0.72rem;
  font-weight: 500;
  padding: 2px 8px;
  border-radius: 4px;
  background-color: var(--vp-c-bg-mute);
  color: var(--vp-c-text-2);
}

.page-canvases-group {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  gap: 1.2rem;
  width: 100%;
}

.canvas-card {
  background: white;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.12);
  border-radius: 4px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  position: relative;
}

.col-indicator {
  position: absolute;
  top: 6px;
  left: 6px;
  z-index: 2;
  font-size: 0.68rem;
  font-weight: 600;
  padding: 1px 6px;
  border-radius: 3px;
  background: rgba(15, 23, 42, 0.75);
  color: #fff;
  pointer-events: none;
}

.col-indicator-zh {
  background: rgba(37, 99, 235, 0.85);
}

.canvas-card canvas {
  display: block;
}

/* 加载与状态 */
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
  z-index: 10;
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
  z-index: 10;
}

/* 底部状态与操作 */
.reader-footer {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  padding: 0.45rem 1rem;
  background: var(--vp-c-bg-soft);
  border-top: 1px solid var(--vp-c-divider);
  font-size: 0.8rem;
  color: var(--vp-c-text-2);
  gap: 0.5rem;
  flex-shrink: 0;
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

/* 本书导读模态弹窗 */
.info-modal-backdrop {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(2px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 1rem;
}

.info-modal-content {
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  max-width: 580px;
  width: 100%;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.2);
  overflow: hidden;
  animation: fadeInModal 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes fadeInModal {
  from { opacity: 0; transform: scale(0.96); }
  to { opacity: 1; transform: scale(1); }
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.2rem;
  border-bottom: 1px solid var(--vp-c-divider);
}

.modal-title {
  font-size: 1.05rem;
  font-weight: 600;
  margin: 0;
  color: var(--vp-c-text-1);
}

.modal-close {
  border: none;
  background: transparent;
  font-size: 1.1rem;
  cursor: pointer;
  color: var(--vp-c-text-2);
  padding: 2px 6px;
  border-radius: 4px;
}

.modal-close:hover {
  background: var(--vp-c-bg-mute);
  color: var(--vp-c-text-1);
}

.modal-body {
  padding: 1.2rem;
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}

.info-row {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  font-size: 0.88rem;
  line-height: 1.6;
  color: var(--vp-c-text-2);
}

.info-label {
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.modal-downloads {
  display: flex;
  gap: 1rem;
  padding-top: 0.6rem;
  border-top: 1px solid var(--vp-c-divider);
}

.modal-dl-btn {
  display: inline-flex;
  align-items: center;
  padding: 6px 14px;
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 500;
  background: var(--vp-c-brand-1);
  color: #fff !important;
  text-decoration: none !important;
  transition: all 0.2s ease;
}

.modal-dl-btn:hover {
  background: var(--vp-c-brand-2);
  transform: translateY(-1px);
}
</style>
