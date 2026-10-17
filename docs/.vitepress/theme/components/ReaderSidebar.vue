<template>
  <div class="reader-sidebar-ctrl">
    <!-- 顶部模式切换与折叠控制栏 -->
    <div class="sidebar-header">
      <div class="tab-btn-group">
        <button 
          type="button" 
          :class="['tab-btn', { active: activeTab === 'toc' }]"
          @click="setTab('toc')"
          title="切换至当前书籍目录"
        >
          📑 本书目录
        </button>
        <button 
          type="button" 
          :class="['tab-btn', { active: activeTab === 'books' }]"
          @click="setTab('books')"
          title="切换至文库书籍列表"
        >
          📚 书籍列表
        </button>
      </div>

      <button 
        type="button" 
        class="btn-collapse" 
        @click="collapseSidebar" 
        title="收起左侧栏，最大化阅读空间"
      >
        ◀
      </button>
    </div>

    <!-- 目录模式下的专属内容展示区 -->
    <div v-show="activeTab === 'toc'" class="toc-view-container">
      <div v-if="outline && outline.length > 0" class="toc-tree">
        <ReaderTocNode
          v-for="(item, idx) in outline"
          :key="idx"
          :item="item"
          :depth="0"
          :current-page="currentPage"
          @select="onSelectPage"
        />
      </div>
      <div v-else class="toc-empty">
        <span class="toc-empty-hint">正在读取文献章节结构...</span>
      </div>
    </div>
    <!-- 侧边栏边缘拖拽调宽把手 -->
    <div 
      class="sidebar-resizer" 
      :class="{ 'is-active': isResizing }"
      @mousedown="onResizerMouseDown"
      @dblclick="resetSidebarWidth"
      title="按住左键拖拽调节目录栏宽度，双击恢复默认宽度 (280px)"
    ></div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { useReaderState } from '../useReaderState'
import ReaderTocNode from './ReaderTocNode.vue'

const {
  outline,
  activeTab,
  isSidebarCollapsed,
  currentPage,
  jumpToPage,
  toggleSidebar
} = useReaderState()

const isResizing = ref(false)
const DEFAULT_SIDEBAR_WIDTH = 280
const MIN_SIDEBAR_WIDTH = 220
const MAX_SIDEBAR_WIDTH = 550

const applySidebarWidth = (width: number) => {
  if (typeof document !== 'undefined') {
    document.documentElement.style.setProperty('--vp-sidebar-width', `${width}px`)
  }
}

const onResizerMouseDown = (e: MouseEvent) => {
  e.preventDefault()
  isResizing.value = true
  if (typeof document !== 'undefined') {
    document.body.classList.add('resizing-sidebar')
  }

  const onMouseMove = (moveEvent: MouseEvent) => {
    if (!isResizing.value) return
    const newWidth = Math.max(MIN_SIDEBAR_WIDTH, Math.min(MAX_SIDEBAR_WIDTH, moveEvent.clientX))
    applySidebarWidth(newWidth)
  }

  const onMouseUp = (upEvent: MouseEvent) => {
    isResizing.value = false
    if (typeof document !== 'undefined') {
      document.body.classList.remove('resizing-sidebar')
      const finalWidth = Math.max(MIN_SIDEBAR_WIDTH, Math.min(MAX_SIDEBAR_WIDTH, upEvent.clientX))
      try {
        localStorage.setItem('reader_sidebar_width', String(finalWidth))
      } catch (_) {}
    }
    window.removeEventListener('mousemove', onMouseMove)
    window.removeEventListener('mouseup', onMouseUp)
  }

  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseup', onMouseUp)
}

const resetSidebarWidth = () => {
  applySidebarWidth(DEFAULT_SIDEBAR_WIDTH)
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem('reader_sidebar_width', String(DEFAULT_SIDEBAR_WIDTH))
    } catch (_) {}
  }
}

const setTab = (tab: 'toc' | 'books') => {
  activeTab.value = tab
  if (typeof document !== 'undefined') {
    if (tab === 'toc') {
      document.body.classList.add('sidebar-show-toc')
    } else {
      document.body.classList.remove('sidebar-show-toc')
    }
  }
}

const collapseSidebar = () => {
  toggleSidebar()
  if (typeof document !== 'undefined') {
    document.body.classList.toggle('reader-sidebar-collapsed', isSidebarCollapsed.value)
  }
}

const onSelectPage = (page: number) => {
  jumpToPage(page)
}

onMounted(() => {
  if (typeof document !== 'undefined') {
    document.body.classList.add('sidebar-show-toc')
    document.body.classList.toggle('reader-sidebar-collapsed', isSidebarCollapsed.value)

    try {
      const savedWidth = localStorage.getItem('reader_sidebar_width')
      const width = savedWidth ? parseInt(savedWidth, 10) : DEFAULT_SIDEBAR_WIDTH
      if (!isNaN(width) && width >= MIN_SIDEBAR_WIDTH && width <= MAX_SIDEBAR_WIDTH) {
        applySidebarWidth(width)
      } else {
        applySidebarWidth(DEFAULT_SIDEBAR_WIDTH)
      }
    } catch (_) {
      applySidebarWidth(DEFAULT_SIDEBAR_WIDTH)
    }
  }
})

watch(() => isSidebarCollapsed.value, (collapsed) => {
  if (typeof document !== 'undefined') {
    document.body.classList.toggle('reader-sidebar-collapsed', collapsed)
  }
})

onUnmounted(() => {
  if (typeof document !== 'undefined') {
    document.body.classList.remove('sidebar-show-toc')
    document.body.classList.remove('reader-sidebar-collapsed')
    document.body.classList.remove('resizing-sidebar')
    document.documentElement.style.removeProperty('--vp-sidebar-width')
  }
})
</script>

<style scoped>
.reader-sidebar-ctrl {
  display: flex;
  flex-direction: column;
  width: 100%;
  margin-bottom: 0.8rem;
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 0.2rem;
  border-bottom: 1px solid var(--vp-c-divider);
  gap: 0.4rem;
}

.tab-btn-group {
  display: flex;
  background: var(--vp-c-bg-mute);
  border-radius: 6px;
  padding: 2px;
  flex: 1 1 auto;
}

.tab-btn {
  flex: 1 1 50%;
  border: none;
  background: transparent;
  padding: 4px 6px;
  font-size: 0.78rem;
  border-radius: 4px;
  cursor: pointer;
  color: var(--vp-c-text-2);
  transition: all 0.2s ease;
  white-space: nowrap;
  text-align: center;
}

.tab-btn.active {
  background: var(--vp-c-bg);
  color: var(--vp-c-brand-1);
  font-weight: 600;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
}

.btn-collapse {
  padding: 4px 8px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  color: var(--vp-c-text-2);
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.78rem;
  transition: all 0.15s ease;
  flex-shrink: 0;
}

.btn-collapse:hover {
  background: var(--vp-c-bg-mute);
  color: var(--vp-c-brand-1);
  border-color: var(--vp-c-brand-1);
}

.toc-view-container {
  display: flex;
  flex-direction: column;
  width: 100%;
  padding-top: 0.5rem;
}

.toc-tree {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.toc-empty {
  padding: 1.5rem 0.5rem;
  text-align: center;
}

.toc-empty-hint {
  font-size: 0.8rem;
  color: var(--vp-c-text-3);
}

/* 侧边栏边缘拖拽调宽把手 */
.sidebar-resizer {
  position: fixed;
  top: 0;
  bottom: 0;
  left: calc(var(--vp-sidebar-width) - 3px);
  width: 6px;
  cursor: col-resize;
  z-index: 100;
  background: transparent;
  transition: background-color 0.2s ease;
}

.sidebar-resizer:hover,
.sidebar-resizer.is-active {
  background-color: var(--vp-c-brand-1);
}

@media (max-width: 959px) {
  .sidebar-resizer {
    display: none !important;
  }
}
</style>
