<template>
  <div 
    ref="containerRef" 
    class="dual-pdf-reader" 
    :class="{ 
      'is-zen-mode': isZenMode, 
      'is-fullscreen': isFullscreen,
      'is-sidebar-collapsed': isSidebarCollapsed
    }"
  >
    <!-- 悬浮快捷控制触发器：默认纯粹极简，点击或悬停呼出对应面板 -->
    <div class="floating-reader-triggers">
      <!-- 重新呼出侧边栏目录按钮（仅在侧边栏折叠时显示） -->
      <button 
        v-if="isSidebarCollapsed" 
        type="button" 
        class="float-trigger-btn btn-float-sidebar" 
        @click="toggleSidebar" 
        title="展开左侧章节目录栏"
      >
        📑 目录
      </button>

      <!-- 呼出控制工具栏按钮 -->
      <button 
        type="button" 
        class="float-trigger-btn btn-float-toolbar" 
        :class="{ active: isToolbarVisible }"
        @click="toggleToolbar" 
        title="切换控制工具栏（中英模式/翻页/缩放）"
      >
        🛠️ 控制栏
      </button>

      <!-- 夜间反色护眼切换按钮 -->
      <button 
        type="button" 
        class="float-trigger-btn btn-float-invert" 
        :class="{ active: isInverted }"
        @click="toggleInvert" 
        :title="isInverted ? '切换为日间白底明亮模式' : '开启夜间反色暗黑模式'"
      >
        {{ isInverted ? '☀️ 明亮' : '🌙 反色' }}
      </button>
    </div>

    <!-- 顶部控制工具栏：默认完全隐藏，通过悬浮按钮呼出 -->
    <transition name="toolbar-slide">
      <div v-show="isToolbarVisible" class="reader-toolbar">
        <!-- 视图模式切换 -->
        <div class="toolbar-section mode-section">
          <div class="mode-btn-group">
            <button 
              type="button"
              :class="['mode-btn', { active: viewMode === 'dual' }]" 
              @click="setMode('dual')"
              title="双栏中英对照并排滚动"
            >
              中英双栏
            </button>
            <button 
              type="button"
              :class="['mode-btn', { active: viewMode === 'zh' }]" 
              @click="setMode('zh')"
              title="仅显示中文译本连续滚动"
            >
              仅中文
            </button>
            <button 
              type="button"
              :class="['mode-btn', { active: viewMode === 'en' }]" 
              @click="setMode('en')"
              title="仅显示英文原版连续滚动"
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
            @click="scrollToPage(currentPage - 1)" 
            title="滚动到上一页"
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
            @click="scrollToPage(currentPage + 1)" 
            title="滚动到下一页"
          >
            下一页
          </button>
        </div>

        <!-- 缩放与视图工具 -->
        <div class="toolbar-section tool-section">
          <button type="button" class="tool-btn" @click="autoFitWidth" title="铺满可用宽度">
            适应宽度
          </button>
          <button type="button" class="tool-btn" @click="zoomOut" title="缩小" :disabled="scale <= 0.45">
            －
          </button>
          <span class="zoom-value">{{ Math.round(scale * 100) }}%</span>
          <button type="button" class="tool-btn" @click="zoomIn" title="放大" :disabled="scale >= 2.6">
            ＋
          </button>
          <button 
            type="button" 
            class="tool-btn btn-zen" 
            :class="{ active: isZenMode }"
            @click="toggleZenMode" 
            :title="isZenMode ? '退出沉浸宽屏' : '沉浸宽屏阅读'"
          >
            {{ isZenMode ? '退出宽屏' : '沉浸宽屏' }}
          </button>
          <button type="button" class="tool-btn" @click="toggleFullscreen" :title="isFullscreen ? '退出全屏' : '系统全屏'">
            {{ isFullscreen ? '退出全屏' : '全屏' }}
          </button>

          <!-- 夜间反色护眼模式 -->
          <button 
            type="button" 
            class="tool-btn btn-invert" 
            :class="{ active: isInverted }"
            @click="toggleInvert" 
            :title="isInverted ? '切换为日间白底明亮模式' : '开启夜间反色暗黑模式'"
          >
            {{ isInverted ? '☀️ 明亮' : '🌙 反色' }}
          </button>

          <!-- 离线下载便捷入口 -->
          <a v-if="zhSrc" :href="zhSrc" download class="tool-btn btn-dl" target="_blank" title="下载高清中文 PDF">
            📥 中文
          </a>
          <a v-if="enSrc" :href="enSrc" download class="tool-btn btn-dl" target="_blank" title="下载英文原版 PDF">
            📥 英文
          </a>

          <!-- 收起工具栏按钮 -->
          <button type="button" class="tool-btn btn-close-toolbar" @click="toggleToolbar" title="隐藏工具栏，回归极简阅读">
            ✕ 收起
          </button>
        </div>
      </div>
    </transition>

    <!-- 连续垂直自然滚动阅读视窗 -->
    <div 
      ref="viewportRef" 
      class="reader-viewport" 
      :class="[`mode-${viewMode}`, { 'is-inverted': isInverted }]"
      @scroll.passive="onViewportScroll"
    >
      <div class="continuous-pages-stream" :style="{ minHeight: `${totalScrollHeight}px` }">
        <!-- 顶部占位垫片：精准撑开上方滚过的页面高度 -->
        <div class="scroll-spacer" :style="{ height: `${topSpacerHeight}px` }"></div>

        <!-- 仅渲染视口当前可见窗口的 2~3 页，零卡顿零内存泄漏 -->
        <PdfPageRow
          v-for="p in visiblePages"
          :key="p"
          :page="p"
          :en-doc="enPdfDoc"
          :zh-doc="zhPdfDoc"
          :scale="scale"
          :mode="viewMode"
          :base-width="basePageWidth"
          :base-height="basePageHeight"
        />

        <!-- 底部占位垫片：精准撑开下方未到达的页面高度 -->
        <div class="scroll-spacer" :style="{ height: `${bottomSpacerHeight}px` }"></div>
      </div>

      <!-- 首屏加载遮罩 -->
      <div v-if="loading && (!enPdfDoc || !zhPdfDoc)" class="reader-loading">
        <div class="spinner"></div>
      </div>

      <!-- 错误提示 -->
      <div v-if="errorMessage" class="reader-error">
        <span>{{ errorMessage }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, shallowRef, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import PdfPageRow from './PdfPageRow.vue'
import { useReaderState } from '../useReaderState'

const props = defineProps<{
  title?: string
  enSrc: string
  zhSrc: string
  initialPage?: number
  lang?: 'zh' | 'en'
}>()

const {
  isSidebarCollapsed,
  isToolbarVisible,
  isInverted,
  currentPage: stateCurrentPage,
  maxPages: stateMaxPages,
  setOutline,
  setJumpCallback,
  toggleSidebar,
  toggleToolbar,
  toggleInvert,
  resetReader
} = useReaderState()

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

const maxPages = computed(() => {
  const en = totalEnPages.value
  const zh = totalZhPages.value
  if (viewMode.value === 'en') return en || 1
  if (viewMode.value === 'zh') return zh || 1
  if (en && zh) return Math.min(en, zh)
  return en || zh || 1
})

let pdfjsLib: any = null
const enPdfDoc = shallowRef<any>(null)
const zhPdfDoc = shallowRef<any>(null)
const basePageWidth = ref(595)
const basePageHeight = ref(842)

const computedPageWidth = computed(() => Math.floor(basePageWidth.value * scale.value))
const computedPageHeight = computed(() => Math.floor(basePageHeight.value * scale.value))
const rowHeight = computed(() => computedPageHeight.value + 24)

// 视口动态虚拟窗口：只实例化当前页及相邻的前后 1 页（共 2~3 页）
const startPage = computed(() => Math.max(1, currentPage.value - 1))
const endPage = computed(() => Math.min(maxPages.value, currentPage.value + 1))
const visiblePages = computed(() => {
  if (!enPdfDoc.value && !zhPdfDoc.value) return []
  const list: number[] = []
  for (let p = startPage.value; p <= endPage.value; p++) {
    list.push(p)
  }
  return list
})

const topSpacerHeight = computed(() => (startPage.value - 1) * rowHeight.value)
const bottomSpacerHeight = computed(() => (maxPages.value - endPage.value) * rowHeight.value)
const totalScrollHeight = computed(() => maxPages.value * rowHeight.value)

const computeFitScale = () => {
  if (!viewportRef.value) return 1.0
  const viewportWidth = viewportRef.value.clientWidth || (typeof window !== 'undefined' ? window.innerWidth - 220 : 1200)
  if (viewMode.value === 'dual') {
    const colWidth = (viewportWidth - 36) / 2
    return Math.max(0.45, Math.min(2.5, parseFloat((colWidth / basePageWidth.value).toFixed(2))))
  } else {
    const targetWidth = Math.max(Math.min(viewportWidth - 32, 1400), 400)
    return Math.max(0.6, Math.min(3.0, parseFloat((targetWidth / basePageWidth.value).toFixed(2))))
  }
}

const autoFitWidth = () => {
  isAutoScaled.value = true
  scale.value = computeFitScale()
}

let isProgrammaticScrolling = false

const onViewportScroll = () => {
  if (!viewportRef.value || isProgrammaticScrolling) return
  const scrollTop = viewportRef.value.scrollTop
  const rh = rowHeight.value
  if (rh <= 0) return

  const cur = Math.min(maxPages.value, Math.max(1, Math.round(scrollTop / rh) + 1))
  if (cur !== currentPage.value) {
    currentPage.value = cur
    inputPage.value = cur
    stateCurrentPage.value = cur
  }
}

const scrollToPage = (p: number, smooth = true) => {
  if (!viewportRef.value) return
  p = Math.min(maxPages.value, Math.max(1, p))
  const targetTop = (p - 1) * rowHeight.value

  isProgrammaticScrolling = true
  currentPage.value = p
  inputPage.value = p
  stateCurrentPage.value = p

  viewportRef.value.scrollTo({
    top: targetTop,
    behavior: smooth ? 'smooth' : 'auto'
  })

  setTimeout(() => {
    isProgrammaticScrolling = false
  }, smooth ? 350 : 50)
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
}

const zoomIn = () => {
  isAutoScaled.value = false
  if (scale.value < 2.6) {
    scale.value = parseFloat((scale.value + 0.15).toFixed(2))
  }
}

const zoomOut = () => {
  isAutoScaled.value = false
  if (scale.value > 0.45) {
    scale.value = parseFloat((scale.value - 0.15).toFixed(2))
  }
}

const toggleZenMode = () => {
  isZenMode.value = !isZenMode.value
  nextTick(() => {
    scale.value = computeFitScale()
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
}

const handleResize = () => {
  if (isAutoScaled.value) {
    scale.value = computeFitScale()
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
    if (isZenMode.value) {
      isZenMode.value = false
      nextTick(() => autoFitWidth())
    }
  }
}

// 递归解析 PDF 章节目录树
const extractOutline = async (doc: any) => {
  try {
    const rawOutline = await doc.getOutline()
    if (!rawOutline || !rawOutline.length) {
      setOutline([])
      return
    }

    const resolveItem = async (item: any): Promise<any> => {
      let pageNum: number | null = null
      try {
        let dest = item.dest
        if (typeof dest === 'string') {
          dest = await doc.getDestination(dest)
        }
        if (Array.isArray(dest)) {
          const pageIndex = await doc.getPageIndex(dest[0])
          pageNum = pageIndex + 1
        }
      } catch (_) {}

      let subItems: any[] = []
      if (item.items && item.items.length) {
        subItems = await Promise.all(item.items.map((sub: any) => resolveItem(sub)))
      }

      return {
        title: item.title,
        page: pageNum,
        items: subItems
      }
    }

    const resolved = await Promise.all(rawOutline.map((item: any) => resolveItem(item)))
    setOutline(resolved)
  } catch (err) {
    console.warn('PDF 章节目录解析失败:', err)
    setOutline([])
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
    enPdfDoc.value = enDoc
    zhPdfDoc.value = zhDoc
    totalEnPages.value = enDoc.numPages
    totalZhPages.value = zhDoc.numPages
    stateMaxPages.value = maxPages.value

    try {
      const probePage = await (zhDoc || enDoc).getPage(1)
      const vp = probePage.getViewport({ scale: 1.0 })
      basePageWidth.value = vp.width || 595
      basePageHeight.value = vp.height || 842
    } catch (_) {}

    await nextTick()
    scale.value = computeFitScale()

    // 异步提取目录大纲
    extractOutline(zhDoc || enDoc)

    if (props.initialPage && props.initialPage > 1) {
      await nextTick()
      scrollToPage(props.initialPage, false)
    }

    setTimeout(() => {
      if (isAutoScaled.value && viewportRef.value) {
        const newScale = computeFitScale()
        if (Math.abs(newScale - scale.value) > 0.02) {
          scale.value = newScale
        }
      }
    }, 120)
  } catch (err: any) {
    console.error('PDF 加载错误:', err)
    errorMessage.value = `PDF 文档加载失败: ${err?.message || '网络或格式异常'}`
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  if (typeof document !== 'undefined') {
    document.documentElement.classList.add('lock-page-scroll')
    document.body.classList.add('lock-page-scroll')
  }
  setJumpCallback((p) => scrollToPage(p))
  stateCurrentPage.value = currentPage.value
  loadPdfs()
  window.addEventListener('keydown', handleKeydown)
  window.addEventListener('resize', handleResize)
  document.addEventListener('fullscreenchange', onFullscreenChange)
})

onUnmounted(() => {
  if (typeof document !== 'undefined') {
    document.documentElement.classList.remove('lock-page-scroll')
    document.body.classList.remove('lock-page-scroll')
  }
  resetReader()
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
  overflow: hidden;
  width: 100%;
  height: 100%;
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

/* 悬浮快捷控制触发器 */
.floating-reader-triggers {
  position: absolute;
  top: 10px;
  right: 14px;
  z-index: 40;
  display: flex;
  align-items: center;
  gap: 8px;
  pointer-events: none;
}

.float-trigger-btn {
  pointer-events: auto;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
  border: 1px solid var(--vp-c-divider);
  border-radius: 20px;
  font-size: 0.78rem;
  font-weight: 500;
  cursor: pointer;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(8px);
  opacity: 0.85;
  transition: all 0.2s ease;
}

.float-trigger-btn:hover {
  opacity: 1;
  background: var(--vp-c-bg);
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
  transform: translateY(-1px);
}

.float-trigger-btn.btn-float-invert.active {
  background: #1e293b;
  color: #fbbf24;
  border-color: #f59e0b;
  opacity: 1;
}

.btn-float-sidebar {
  position: fixed;
  top: 10px;
  left: 12px;
  z-index: 100;
}

/* 控制栏：由悬浮按键呼出 */
.reader-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.4rem 0.8rem;
  background-color: var(--vp-c-bg-soft);
  border-bottom: 1px solid var(--vp-c-divider);
  gap: 0.8rem;
  user-select: none;
  flex-shrink: 0;
  z-index: 30;
}

.toolbar-slide-enter-active,
.toolbar-slide-leave-active {
  transition: all 0.22s ease;
}

.toolbar-slide-enter-from,
.toolbar-slide-leave-to {
  transform: translateY(-100%);
  opacity: 0;
}

.toolbar-section {
  display: flex;
  align-items: center;
  gap: 0.45rem;
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
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.82rem;
  transition: all 0.15s ease;
  display: inline-flex;
  align-items: center;
  text-decoration: none;
}

.ctrl-btn:hover:not(:disabled), .tool-btn:hover:not(:disabled) {
  background: var(--vp-c-bg-mute);
  border-color: var(--vp-c-brand-1);
}

.ctrl-btn:disabled, .tool-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.tool-btn.btn-zen.active,
.tool-btn.btn-invert.active {
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
  border-color: var(--vp-c-brand-1);
}

.tool-btn.btn-close-toolbar {
  background: transparent;
  border-color: transparent;
  color: var(--vp-c-text-3);
}

.tool-btn.btn-close-toolbar:hover {
  background: var(--vp-c-bg-mute);
  color: var(--vp-c-text-1);
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
  padding: 0.8rem 0.3rem 1.5rem 0.3rem;
  scroll-behavior: smooth;
  transition: background-color 0.25s ease;
}

.reader-viewport.is-inverted {
  background-color: #0b0f17 !important;
}

.continuous-pages-stream {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
}

.scroll-spacer {
  width: 100%;
  pointer-events: none;
  flex-shrink: 0;
}

/* 加载遮罩 */
.reader-loading {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(var(--vp-c-bg-rgb, 255, 255, 255), 0.7);
  backdrop-filter: blur(2px);
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
  padding: 0.5rem 1rem;
  border-radius: 4px;
  font-size: 0.85rem;
  z-index: 10;
}
</style>
