import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  lang: 'zh-CN',
  title: "Silenzio's VitePress Site",
  base: "/A-Vitepress-Site/",
  description: "学习笔记、学术资料与翻译书籍库",
  markdown: {
    math: true
  },
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: '首页', link: '/' },
      { text: 'Pandas 学习', link: '/pandas/desc' },
      { text: '中级计量经济学', link: '/中级计量经济学/desc' },
      { text: '个人博客主站', link: 'https://silenzio111.github.io/' }
    ],
    sidebar: [
      {
        text: 'Pandas learning & practise',
        items: [
          { text: '简介与说明', link: '/pandas/desc' },
          { text: '创建、读取和写入', link: '/pandas/创建、读取和写入讲义' },
          { text: 'Practise01', link: '/pandas/创建、读取和写入练习' },
          { text: '索引、选择和赋值', link: '/pandas/索引、选择和赋值讲义' },
          { text: 'Practise02', link: '/pandas/索引、选择和赋值练习' }
        ]
      },
      {
        text: '基于 Python 的中级计量经济学',
        items: [
          { text: '课程导引', link: '/中级计量经济学/desc' }
        ]
      }
    ],
    search: {
      provider: 'local'
    },
    socialLinks: [
      { icon: 'github', link: 'https://github.com/silenzio111/A-Vitepress-Site' }
    ]
  }
})
