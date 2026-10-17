<template>
  <div class="toc-node" :class="{ 'has-children': hasChildren, 'is-active': isActive }">
    <div 
      class="toc-row" 
      :style="{ paddingLeft: `${depth * 14 + 8}px` }"
      @click="handleClick"
    >
      <button 
        v-if="hasChildren" 
        type="button" 
        class="toggle-caret" 
        @click.stop="isExpanded = !isExpanded"
        :title="isExpanded ? '折叠' : '展开'"
      >
        {{ isExpanded ? '▾' : '▸' }}
      </button>
      <span v-else class="caret-placeholder"></span>

      <span class="toc-title" :title="item.title">{{ item.title }}</span>

      <span v-if="item.page" class="toc-page">p.{{ item.page }}</span>
    </div>

    <!-- 子目录递归渲染 -->
    <div v-if="hasChildren && isExpanded" class="toc-children">
      <ReaderTocNode
        v-for="(sub, idx) in item.items"
        :key="idx"
        :item="sub"
        :depth="depth + 1"
        :current-page="currentPage"
        @select="$emit('select', $event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { TocItem } from '../useReaderState'

const props = defineProps<{
  item: TocItem
  depth: number
  currentPage: number
}>()

const emit = defineEmits<{
  (e: 'select', page: number): void
}>()

const isExpanded = ref(true)
const hasChildren = computed(() => !!(props.item.items && props.item.items.length > 0))

const isActive = computed(() => {
  if (!props.item.page) return false
  return props.currentPage === props.item.page
})

const handleClick = () => {
  if (props.item.page) {
    emit('select', props.item.page)
  } else if (hasChildren.value) {
    isExpanded.value = !isExpanded.value
  }
}
</script>

<style scoped>
.toc-node {
  display: flex;
  flex-direction: column;
  width: 100%;
}

.toc-row {
  display: flex;
  align-items: center;
  padding-top: 5px;
  padding-bottom: 5px;
  padding-right: 8px;
  border-radius: 4px;
  cursor: pointer;
  user-select: none;
  font-size: 0.82rem;
  color: var(--vp-c-text-2);
  transition: all 0.15s ease;
  gap: 4px;
}

.toc-row:hover {
  background-color: var(--vp-c-bg-mute);
  color: var(--vp-c-brand-1);
}

.toc-node.is-active > .toc-row {
  color: var(--vp-c-brand-1);
  font-weight: 600;
  background-color: var(--vp-c-brand-soft);
}

.toggle-caret {
  border: none;
  background: transparent;
  cursor: pointer;
  color: var(--vp-c-text-3);
  font-size: 0.85rem;
  padding: 0;
  width: 14px;
  text-align: center;
  line-height: 1;
}

.toggle-caret:hover {
  color: var(--vp-c-brand-1);
}

.caret-placeholder {
  width: 14px;
  flex-shrink: 0;
}

.toc-title {
  flex: 1 1 auto;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1.35;
}

.toc-page {
  font-size: 0.72rem;
  color: var(--vp-c-text-3);
  margin-left: 4px;
  flex-shrink: 0;
}

.toc-children {
  display: flex;
  flex-direction: column;
}
</style>
