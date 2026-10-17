import { ref } from 'vue'

export interface TocItem {
  title: string
  page: number | null
  items?: TocItem[]
}

const outline = ref<TocItem[]>([])
const activeTab = ref<'toc' | 'books'>('toc')
const isSidebarCollapsed = ref(false)
const isNavbarVisible = ref(false)
const isToolbarVisible = ref(false)
const currentPage = ref(1)
const maxPages = ref(1)
const isReaderActive = ref(false)

let jumpCallback: ((p: number) => void) | null = null

export function useReaderState() {
  const setOutline = (newOutline: TocItem[]) => {
    outline.value = newOutline
  }

  const setJumpCallback = (cb: (p: number) => void) => {
    jumpCallback = cb
  }

  const jumpToPage = (p: number) => {
    if (jumpCallback) jumpCallback(p)
  }

  const toggleSidebar = () => {
    isSidebarCollapsed.value = !isSidebarCollapsed.value
  }

  const toggleNavbar = () => {
    isNavbarVisible.value = !isNavbarVisible.value
  }

  const toggleToolbar = () => {
    isToolbarVisible.value = !isToolbarVisible.value
  }

  const resetReader = () => {
    outline.value = []
    activeTab.value = 'toc'
    isSidebarCollapsed.value = false
    isNavbarVisible.value = false
    isToolbarVisible.value = false
    currentPage.value = 1
    maxPages.value = 1
    isReaderActive.value = false
  }

  return {
    outline,
    activeTab,
    isSidebarCollapsed,
    isNavbarVisible,
    isToolbarVisible,
    currentPage,
    maxPages,
    isReaderActive,
    setOutline,
    setJumpCallback,
    jumpToPage,
    toggleSidebar,
    toggleNavbar,
    toggleToolbar,
    resetReader
  }
}
