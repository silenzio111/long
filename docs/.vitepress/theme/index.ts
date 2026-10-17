import DefaultTheme from 'vitepress/theme'
import DualPdfReader from './components/DualPdfReader.vue'
import BookCatalogGrid from './components/BookCatalogGrid.vue'
import './custom.css'
import type { Theme } from 'vitepress'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('DualPdfReader', DualPdfReader)
    app.component('BookCatalogGrid', BookCatalogGrid)
  }
} satisfies Theme
