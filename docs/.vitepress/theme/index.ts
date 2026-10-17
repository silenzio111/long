import DefaultTheme from 'vitepress/theme'
import DualPdfReader from './components/DualPdfReader.vue'
import type { Theme } from 'vitepress'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('DualPdfReader', DualPdfReader)
  }
} satisfies Theme
