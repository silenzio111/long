import { defineConfig } from 'vitepress'

export default defineConfig({
  base: "/A-Vitepress-Site/",
  markdown: {
    math: true
  },
  locales: {
    root: {
      label: '简体中文',
      lang: 'zh-CN',
      title: "Silenzio 的双语学术文库",
      description: "学术专著、经典教材与前沿文献的双语翻译阅读平台",
      themeConfig: {
        nav: [
          { text: '首页', link: '/' },
          { text: '📚 翻译书籍库', link: '/books/' },
          { text: '个人博客主站', link: 'https://silenzio111.github.io/' }
        ],
        sidebar: {
          '/books/': [
            {
              text: '📚 翻译书籍与文献库',
              items: [
                { text: '文库总览与目录', link: '/books/' },
                { text: '运筹学前沿论文 (17P)', link: '/books/operational-research' }
              ]
            }
          ]
        },
        outline: {
          label: '本页导览'
        },
        docFooter: {
          prev: '上一篇',
          next: '下一篇'
        },
        returnToTopLabel: '返回顶部',
        sidebarMenuLabel: '目录菜单',
        darkModeSwitchLabel: '外观切换'
      }
    },
    en: {
      label: 'English',
      lang: 'en-US',
      link: '/en/',
      title: "Silenzio's Academic Library",
      description: "Bilingual platform for translated academic books, textbooks, and scientific papers",
      themeConfig: {
        nav: [
          { text: 'Home', link: '/en/' },
          { text: '📚 Book Library', link: '/en/books/' },
          { text: 'Personal Blog', link: 'https://silenzio111.github.io/' }
        ],
        sidebar: {
          '/en/books/': [
            {
              text: '📚 Translated Books & Papers',
              items: [
                { text: 'Catalog Overview', link: '/en/books/' },
                { text: 'Operational Research (17P)', link: '/en/books/operational-research' }
              ]
            }
          ]
        },
        outline: {
          label: 'On this page'
        },
        docFooter: {
          prev: 'Previous',
          next: 'Next'
        },
        returnToTopLabel: 'Return to top',
        sidebarMenuLabel: 'Menu',
        darkModeSwitchLabel: 'Appearance'
      }
    }
  },
  themeConfig: {
    search: {
      provider: 'local',
      options: {
        locales: {
          root: {
            translations: {
              button: {
                buttonText: '搜索文档',
                buttonAriaLabel: '搜索文档'
              },
              modal: {
                noResultsText: '无法找到相关结果',
                resetButtonTitle: '清除查询条件',
                footer: {
                  selectText: '选择',
                  navigateText: '切换',
                  closeText: '关闭'
                }
              }
            }
          },
          en: {
            translations: {
              button: {
                buttonText: 'Search books',
                buttonAriaLabel: 'Search books'
              },
              modal: {
                noResultsText: 'No results found',
                resetButtonTitle: 'Clear query',
                footer: {
                  selectText: 'to select',
                  navigateText: 'to navigate',
                  closeText: 'to close'
                }
              }
            }
          }
        }
      }
    },
    socialLinks: [
      { icon: 'github', link: 'https://github.com/silenzio111/A-Vitepress-Site' }
    ]
  }
})
