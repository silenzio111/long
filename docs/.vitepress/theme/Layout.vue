<template>
  <DefaultTheme.Layout>
    <template #sidebar-nav-before>
      <ReaderSidebar v-if="isReaderPage" />
    </template>
  </DefaultTheme.Layout>
</template>

<script setup lang="ts">
import DefaultTheme from 'vitepress/theme'
import { useData } from 'vitepress'
import { computed } from 'vue'
import ReaderSidebar from './components/ReaderSidebar.vue'

const { frontmatter } = useData()
const isReaderPage = computed(() => frontmatter.value.pageClass === 'reader-full-page')
</script>
