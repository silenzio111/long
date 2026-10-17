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
const isInverted = ref(false)
const currentPage = ref(1)
const maxPages = ref(1)
const isReaderActive = ref(false)

// 客户端自动恢复历史反色偏好
if (typeof window !== 'undefined') {
  try {
    const saved = localStorage.getItem('reader_pdf_inverted')
    if (saved === 'true') {
      isInverted.value = true
    }
  } catch (_) {}
}

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

  const toggleInvert = () => {
    isInverted.value = !isInverted.value
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('reader_pdf_inverted', String(isInverted.value))
      } catch (_) {}
    }
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
    isInverted,
    currentPage,
    maxPages,
    isReaderActive,
    setOutline,
    setJumpCallback,
    jumpToPage,
    toggleSidebar,
    toggleNavbar,
    toggleToolbar,
    toggleInvert,
    resetReader
  }
}
