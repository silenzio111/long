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
            :class="['mode-btn', { active: viewMode === 'interleaved' }]" 
            @click="setMode('interleaved')"
            :title="t.interleavedTitle"
          >
            {{ t.interleavedMode }}
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

      <!-- 中英段落纵向交替排布视窗 -->
      <div v-show="viewMode === 'interleaved'" class="interleaved-wrapper">
        <div v-if="paragraphSegments.length === 0 && !loading" class="empty-segments">
          <span>当前页面未提取出独立文本段落，请切换至双栏或单语模式查看</span>
        </div>
        <div v-else class="interleaved-list">
          <div 
            v-for="(seg, idx) in paragraphSegments" 
            :key="idx" 
            class="para-pair-card"
          >
            <!-- 英文段落切块 -->
            <div class="para-unit unit-en">
              <div class="unit-meta">
                <span class="unit-badge badge-en">EN · {{ idx + 1 }}</span>
                <span class="unit-note">{{ t.paraEnBadge }}</span>
              </div>
              <div class="slice-canvas-wrapper">
                <canvas :ref="el => registerSliceCanvas(el, 'en', idx)"></canvas>
              </div>
            </div>

            <!-- 分割线 -->
            <div class="pair-divider"></div>

            <!-- 中文段落切块 -->
            <div class="para-unit unit-zh">
              <div class="unit-meta">
                <span class="unit-badge badge-zh">ZH · {{ idx + 1 }}</span>
                <span class="unit-note">{{ t.paraZhBadge }}</span>
              </div>
              <div class="slice-canvas-wrapper">
                <canvas :ref="el => registerSliceCanvas(el, 'zh', idx)"></canvas>
              </div>
            </div>
          </div>
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
    interleavedMode: '中英交替',
    interleavedTitle: '段落级纵向中英交替排布（一段英文一段中文）',
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
    paraEnBadge: '英文原版段落',
    paraZhBadge: '中文译文段落',
    loadingText: (p: number) => `正在加载第 ${p} 页...`,
    tipNav: '提示：支持键盘左右方向键 (← / →) 翻页，快捷按“中英交替”享受纵向一段中文一段英文的自然阅读体验',
    dlZh: '下载完整中文版',
    dlEn: '下载英文原版'
  },
  en: {
    defaultTitle: 'Online Bilingual Reader',
    dualMode: 'Dual Columns',
    dualTitle: 'Side-by-side bilingual view',
    interleavedMode: 'Interleaved',
    interleavedTitle: 'Vertical paragraph-by-paragraph alternating view',
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
    paraEnBadge: 'Original English Paragraph',
    paraZhBadge: 'Chinese Translation Paragraph',
    loadingText: (p: number) => `Loading page ${p}...`,
    tipNav: 'Tip: Use arrow keys (← / →) to turn pages. Click "Interleaved" for vertical paragraph-by-paragraph reading.',
    dlZh: 'Download Chinese PDF',
    dlEn: 'Download English PDF'
  }
}

const t = computed(() => i18n[currentLang.value])

const containerRef = ref<HTMLElement | null>(null)
const viewportRef = ref<HTMLElement | null>(null)
const enCanvasRef = ref<HTMLCanvasElement | null>(null)
const zhCanvasRef = ref<HTMLCanvasElement | null>(null)

interface ParagraphSegment {
  index: number
  startY: number
  zhEndY: number
  enEndY: number
}

const paragraphSegments = ref<ParagraphSegment[]>([])
const sliceCanvases = ref<{ [key: string]: HTMLCanvasElement | null }>({})
const registerSliceCanvas = (el: any, lang: 'en' | 'zh', index: number) => {
  if (el) {
    sliceCanvases.value[`${lang}_${index}`] = el as HTMLCanvasElement
  }
}

const viewMode = ref<'dual' | 'interleaved' | 'zh' | 'en'>('dual')
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
    // 两个栏位：减去外边距与中缝间隙 (约 36px)，除以 2，最大化水平可视面积
    const colWidth = (viewportWidth - 36) / 2
    return Math.max(0.65, Math.min(2.6, parseFloat((colWidth / basePageWidth).toFixed(2))))
  } else if (viewMode.value === 'interleaved') {
    // 中英交替纵向单列卡片：居中铺展，充分利用宽屏
    const targetWidth = Math.min(viewportWidth - 36, 1020)
    return Math.max(0.8, Math.min(2.5, parseFloat((targetWidth / basePageWidth).toFixed(2))))
  } else {
    // 单栏模式：充分铺满视口宽度，消除人为设定的 1150px 限制
    const targetWidth = Math.max(300, viewportWidth - 24)
    return Math.max(0.75, Math.min(3.0, parseFloat((targetWidth / basePageWidth).toFixed(2))))
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

const renderInterleavedPage = async () => {
  if (!enPdfDoc || !zhPdfDoc) return

  const [enPage, zhPage] = await Promise.all([
    enPdfDoc.getPage(currentPage.value),
    zhPdfDoc.getPage(currentPage.value)
  ])

  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const vpEn = enPage.getViewport({ scale: scale.value })
  const vpZh = zhPage.getViewport({ scale: scale.value })

  // 1. 离线渲染完整英文页与中文页到内存画布
  const offEn = document.createElement('canvas')
  offEn.width = Math.floor(vpEn.width * dpr)
  offEn.height = Math.floor(vpEn.height * dpr)
  const ctxEn = offEn.getContext('2d', { alpha: false })!
  ctxEn.imageSmoothingEnabled = true
  ctxEn.imageSmoothingQuality = 'high'
  ctxEn.setTransform(dpr, 0, 0, dpr, 0, 0)
  const taskEn = enPage.render({ canvasContext: ctxEn, viewport: vpEn })

  const offZh = document.createElement('canvas')
  offZh.width = Math.floor(vpZh.width * dpr)
  offZh.height = Math.floor(vpZh.height * dpr)
  const ctxZh = offZh.getContext('2d', { alpha: false })!
  ctxZh.imageSmoothingEnabled = true
  ctxZh.imageSmoothingQuality = 'high'
  ctxZh.setTransform(dpr, 0, 0, dpr, 0, 0)
  const taskZh = zhPage.render({ canvasContext: ctxZh, viewport: vpZh })

  currentRenderTasks.push(taskEn, taskZh)

  // 2. 提取文本内容以计算段落起止坐标（基准 scale=1.0）
  const [zhTc, enTc] = await Promise.all([
    zhPage.getTextContent(),
    enPage.getTextContent(),
    taskEn.promise,
    taskZh.promise
  ])

  const baseVpZh = zhPage.getViewport({ scale: 1.0 })
  const baseVpEn = enPage.getViewport({ scale: 1.0 })

  const mapItems = (tc: any, baseVp: any) => {
    return tc.items.map((it: any) => {
      const [vx, vy] = baseVp.convertToViewportPoint(it.transform[4], it.transform[5])
      const h = it.height || 10
      const w = it.width || 0
      return {
        str: it.str,
        x0: vx,
        x1: vx + w,
        topY: vy - h,
        bottomY: vy
      }
    }).filter((it: any) => it.str && it.str.trim() && it.topY > 40 && it.bottomY < baseVp.height - 30)
  }

  const zhItems = mapItems(zhTc, baseVpZh)
  const enItems = mapItems(enTc, baseVpEn)
  zhItems.sort((a: any, b: any) => a.topY - b.topY)
  enItems.sort((a: any, b: any) => a.topY - b.topY)

  let segments: ParagraphSegment[] = []

  if (zhItems.length === 0) {
    // 页面无文本（例如封面或纯插图页），整页作为单个切片呈现
    segments = [{
      index: 0,
      startY: 42,
      zhEndY: baseVpZh.height - 35,
      enEndY: baseVpEn.height - 35
    }]
  } else {
    // 按 Y 轴将中文 items 聚类为文本行
    const lines: { topY: number; bottomY: number; text: string }[] = []
    for (const it of zhItems) {
      const lastLine = lines[lines.length - 1]
      if (!lastLine || Math.abs(it.topY - lastLine.topY) > 3.5) {
        lines.push({ topY: it.topY, bottomY: it.bottomY, text: it.str })
      } else {
        lastLine.text += it.str
        if (it.bottomY > lastLine.bottomY) lastLine.bottomY = it.bottomY
      }
    }

    // 检测段落间隔（行间距突变处即为段落切分点）
    const avgLineHeight = lines.length > 1 
      ? (lines[lines.length - 1].topY - lines[0].topY) / (lines.length - 1) 
      : 14
    const breakThreshold = Math.max(14, avgLineHeight * 1.35)

    const rawParas: { startY: number; endY: number }[] = []
    let curP = { startY: lines[0].topY, endY: lines[0].bottomY }
    for (let i = 1; i < lines.length; i++) {
      const gap = lines[i].topY - lines[i - 1].bottomY
      if (gap > 6 || (lines[i].topY - lines[i - 1].topY) > breakThreshold) {
        rawParas.push(curP)
        curP = { startY: lines[i].topY, endY: lines[i].bottomY }
      } else {
        curP.endY = Math.max(curP.endY, lines[i].bottomY)
      }
    }
    rawParas.push(curP)

    // 中英段落起始严格对齐，结束位置分别按中英文各自实际范围裁切
    for (let i = 0; i < rawParas.length; i++) {
      const p = rawParas[i]
      const nextStart = i + 1 < rawParas.length ? rawParas[i + 1].startY : baseVpZh.height - 35

      const matchingEn = enItems.filter((it: any) => it.topY >= p.startY - 8 && it.topY < nextStart - 4)
      const enStartY = matchingEn.length > 0 ? Math.min(...matchingEn.map((it: any) => it.topY)) : p.startY
      const enEndY = matchingEn.length > 0 ? Math.max(...matchingEn.map((it: any) => it.bottomY)) : p.endY

      // 起始位置对齐
      const alignedStartY = Math.min(p.startY, enStartY)

      segments.push({
        index: i,
        startY: alignedStartY,
        zhEndY: p.endY,
        enEndY: enEndY
      })
    }
  }

  sliceCanvases.value = {}
  paragraphSegments.value = segments
  await nextTick()

  // 3. 将各段落裁剪并绘制到对应 slice canvas 上
  const padY = 5
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i]
    const enEl = sliceCanvases.value[`en_${i}`]
    const zhEl = sliceCanvases.value[`zh_${i}`]

    if (enEl) {
      const srcY = Math.max(0, seg.startY - padY) * scale.value * dpr
      const srcH = Math.max(20, (seg.enEndY - seg.startY + 2 * padY)) * scale.value * dpr
      const srcW = offEn.width
      enEl.width = Math.floor(srcW)
      enEl.height = Math.floor(srcH)
      enEl.style.width = '100%'
      enEl.style.height = `${Math.floor(srcH / dpr)}px`
      const ctx = enEl.getContext('2d')
      if (ctx) {
        ctx.drawImage(offEn, 0, Math.floor(srcY), Math.floor(srcW), Math.floor(srcH), 0, 0, Math.floor(srcW), Math.floor(srcH))
      }
    }

    if (zhEl) {
      const srcY = Math.max(0, seg.startY - padY) * scale.value * dpr
      const srcH = Math.max(20, (seg.zhEndY - seg.startY + 2 * padY)) * scale.value * dpr
      const srcW = offZh.width
      zhEl.width = Math.floor(srcW)
      zhEl.height = Math.floor(srcH)
      zhEl.style.width = '100%'
      zhEl.style.height = `${Math.floor(srcH / dpr)}px`
      const ctx = zhEl.getContext('2d')
      if (ctx) {
        ctx.drawImage(offZh, 0, Math.floor(srcY), Math.floor(srcW), Math.floor(srcH), 0, 0, Math.floor(srcW), Math.floor(srcH))
      }
    }
  }
}

const renderCurrentPage = async () => {
  if (typeof window === 'undefined') return
  cancelCurrentTasks()
  loading.value = true
  errorMessage.value = ''

  try {
    if (viewMode.value === 'interleaved') {
      await renderInterleavedPage()
    } else {
      const promises: Promise<any>[] = []
      if ((viewMode.value === 'dual' || viewMode.value === 'en') && enPdfDoc) {
        promises.push(renderSinglePage(enPdfDoc, currentPage.value, enCanvasRef.value))
      }
      if ((viewMode.value === 'dual' || viewMode.value === 'zh') && zhPdfDoc) {
        promises.push(renderSinglePage(zhPdfDoc, currentPage.value, zhCanvasRef.value))
      }
      await Promise.all(promises)
    }
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

const setMode = (mode: 'dual' | 'interleaved' | 'zh' | 'en') => {
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
  max-width: 380px;
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
  min-height: 740px;
  height: calc(90vh - 90px);
  padding: 0.8rem 0.3rem;
  gap: 0.8rem;
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

/* =========================================
   段落级纵向中英交替卡片排版样式
   ========================================= */
.interleaved-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  max-width: 920px;
  margin: 0 auto;
  gap: 1.2rem;
  padding: 0.5rem 0.2rem 2.5rem 0.2rem;
}

.interleaved-list {
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
  width: 100%;
}

.para-pair-card {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
  padding: 1.1rem 1.3rem;
  box-shadow: 0 4px 18px rgba(0, 0, 0, 0.04);
  transition: all 0.2s ease;
}

.para-pair-card:hover {
  border-color: var(--vp-c-brand-1);
  box-shadow: 0 6px 22px rgba(37, 99, 235, 0.08);
}

.para-unit {
  display: flex;
  flex-direction: column;
  width: 100%;
}

.unit-meta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.45rem;
}

.unit-badge {
  font-size: 0.72rem;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 4px;
  background: var(--vp-c-bg-mute);
  color: var(--vp-c-text-2);
}

.unit-badge.badge-zh {
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
  font-weight: 600;
}

.unit-note {
  font-size: 0.75rem;
  color: var(--vp-c-text-3);
}

.slice-canvas-wrapper {
  background: white;
  border-radius: 6px;
  overflow: hidden;
  display: flex;
  justify-content: flex-start;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  padding: 3px 0;
  width: 100%;
}

.slice-canvas-wrapper canvas {
  display: block;
  max-width: 100%;
  height: auto;
}

.pair-divider {
  height: 1px;
  border-top: 1px dashed var(--vp-c-divider);
  margin: 0.2rem 0;
  width: 100%;
}

.empty-segments {
  padding: 3rem 1rem;
  text-align: center;
  color: var(--vp-c-text-3);
  font-size: 0.9rem;
}
</style>
