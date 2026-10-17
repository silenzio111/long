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
  </div>
</template>

<script setup lang="ts">
import { watch, onMounted, onUnmounted } from 'vue'
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
</style>
