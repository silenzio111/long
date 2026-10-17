import { defineConfig } from 'vitepress'

export default defineConfig({
  base: "/long/",
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
              text: '📚 翻译文库总览',
              items: [
                { text: '文库总目录', link: '/books/' }
              ]
            },
            {
              text: '运筹学与数学优化',
              items: [
                { text: 'MIT 优化方法导论 (521P)', link: '/books/mit-optimization-methods' },
                { text: '无导数优化导论 (290P)', link: '/books/derivative-free-optimization' }
              ]
            },
            {
              text: '决策、因果与机器学习',
              items: [
                { text: '决策算法导论 (700P)', link: '/books/algorithms-for-decision-making' },
                { text: '因果推断基础 (289P)', link: '/books/elements-of-causal-inference' },
                { text: '统计学习导论 ISLP (613P)', link: '/books/islp' }
              ]
            },
            {
              text: '计算生物学与系统工程',
              items: [
                { text: 'MIT 计算生物学讲义 (547P)', link: '/books/mit-computational-biology' },
                { text: 'ITBook 工程实践合辑 (730P)', link: '/books/itbook-export' }
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
              text: '📚 Library Overview',
              items: [
                { text: 'Catalog Overview', link: '/en/books/' }
              ]
            },
            {
              text: 'Optimization & Operations Research',
              items: [
                { text: 'MIT Optimization (521P)', link: '/en/books/mit-optimization-methods' },
                { text: 'Derivative-Free Optimization (290P)', link: '/en/books/derivative-free-optimization' }
              ]
            },
            {
              text: 'Decision, Causality & Learning',
              items: [
                { text: 'Decision Making (700P)', link: '/en/books/algorithms-for-decision-making' },
                { text: 'Causal Inference (289P)', link: '/en/books/elements-of-causal-inference' },
                { text: 'Statistical Learning ISLP (613P)', link: '/en/books/islp' }
              ]
            },
            {
              text: 'Computational Biology & Systems',
              items: [
                { text: 'MIT Computational Biology (547P)', link: '/en/books/mit-computational-biology' },
                { text: 'ITBook Engineering (730P)', link: '/en/books/itbook-export' }
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
      { icon: 'github', link: 'https://github.com/silenzio111/long' }
    ]
  }
})
