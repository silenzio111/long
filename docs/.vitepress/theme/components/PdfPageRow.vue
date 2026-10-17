<template>
  <div class="continuous-page-row" :style="{ minHeight: `${computedHeight}px` }">
    <div class="page-canvases-group">
      <!-- 英文原版 -->
      <div 
        v-if="mode === 'dual' || mode === 'en'" 
        class="canvas-card"
        :class="{ 'is-inverted': isInverted }"
        :style="{ width: `${computedWidth}px`, height: `${computedHeight}px` }"
      >
        <canvas ref="enCanvasRef"></canvas>
      </div>

      <!-- 中文译本 -->
      <div 
        v-if="mode === 'dual' || mode === 'zh'" 
        class="canvas-card"
        :class="{ 'is-inverted': isInverted }"
        :style="{ width: `${computedWidth}px`, height: `${computedHeight}px` }"
      >
        <canvas ref="zhCanvasRef"></canvas>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useReaderState } from '../useReaderState'

const props = defineProps<{
  page: number
  enDoc: any
  zhDoc: any
  scale: number
  mode: 'dual' | 'zh' | 'en'
  baseWidth: number
  baseHeight: number
}>()

const { isInverted } = useReaderState()

const enCanvasRef = ref<HTMLCanvasElement | null>(null)
const zhCanvasRef = ref<HTMLCanvasElement | null>(null)

const computedWidth = computed(() => Math.floor(props.baseWidth * props.scale))
const computedHeight = computed(() => Math.floor(props.baseHeight * props.scale))

let enRenderTask: any = null
let zhRenderTask: any = null
let isMounted = false

const renderDoc = async (doc: any, canvas: HTMLCanvasElement | null, isZh: boolean) => {
  if (!doc || !canvas || props.page < 1 || props.page > doc.numPages) return

  if (isZh && zhRenderTask) {
    try { zhRenderTask.cancel() } catch (_) {}
    zhRenderTask = null
  }
  if (!isZh && enRenderTask) {
    try { enRenderTask.cancel() } catch (_) {}
    enRenderTask = null
  }

  try {
    const page = await doc.getPage(props.page)
    const viewport = page.getViewport({ scale: props.scale })
    const dpr = Math.min(window.devicePixelRatio || 1, 2)

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

    if (isZh) zhRenderTask = task
    else enRenderTask = task

    await task.promise
  } catch (err: any) {
    if (err?.name !== 'RenderingCancelledException') {
      // 忽略主动取消
    }
  }
}

const renderAll = () => {
  if (!isMounted) return
  if (props.mode === 'dual' || props.mode === 'en') {
    renderDoc(props.enDoc, enCanvasRef.value, false)
  }
  if (props.mode === 'dual' || props.mode === 'zh') {
    renderDoc(props.zhDoc, zhCanvasRef.value, true)
  }
}

onMounted(() => {
  isMounted = true
  nextTick(() => renderAll())
})

watch(() => [props.page, props.scale, props.mode, props.enDoc, props.zhDoc], () => {
  nextTick(() => renderAll())
})

onUnmounted(() => {
  isMounted = false
  if (enRenderTask) {
    try { enRenderTask.cancel() } catch (_) {}
    enRenderTask = null
  }
  if (zhRenderTask) {
    try { zhRenderTask.cancel() } catch (_) {}
    zhRenderTask = null
  }
})
</script>

<style scoped>
.continuous-page-row {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  margin-bottom: 24px;
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
  box-shadow: 0 4px 18px rgba(0, 0, 0, 0.12);
  border-radius: 4px;
  overflow: hidden;
  display: flex;
  justify-content: center;
  transition: background-color 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease;
}

/* 夜间反色暗黑模式 */
.canvas-card.is-inverted {
  background: #141416;
  box-shadow: 0 4px 22px rgba(0, 0, 0, 0.55);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.canvas-card.is-inverted canvas {
  filter: invert(0.92) hue-rotate(180deg) brightness(0.92) contrast(0.96);
  transition: filter 0.25s ease;
}

.canvas-card canvas {
  display: block;
}
</style>
