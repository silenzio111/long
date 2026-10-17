<template>
  <div class="book-cards-grid">
    <div v-for="book in books" :key="book.id" class="book-card">
      <div>
        <div class="book-card-header">
          <div class="book-card-badges">
            <span class="badge-tag tag-primary">{{ isEn ? book.fieldEn : book.fieldZh }}</span>
            <span v-if="book.available" class="badge-tag tag-success">{{ isEn ? 'Available' : '已上线' }}</span>
            <span v-else class="badge-tag">{{ isEn ? 'In Prep' : '准备中' }}</span>
          </div>
          <span class="book-pages-count">{{ book.pages }} {{ isEn ? 'Pages' : '页' }}</span>
        </div>

        <h3 class="book-card-title">{{ isEn ? book.titleEn : book.titleZh }}</h3>
        <div class="book-card-original">{{ isEn ? book.titleZh : book.titleEn }}</div>
        <p class="book-card-desc">{{ isEn ? book.descEn : book.descZh }}</p>
      </div>

      <div class="book-card-footer">
        <a 
          v-if="book.available" 
          :href="isEn ? `/long/en/books/${book.id}` : `/long/books/${book.id}`" 
          class="btn-read"
        >
          <span>{{ isEn ? 'Read Online' : '在线阅读' }}</span>
          <span>→</span>
        </a>
        <span v-else class="btn-disabled">
          {{ isEn ? 'Queued' : '排队转制中' }}
        </span>

        <span class="badge-tag">{{ isEn ? 'Bilingual Dual-Pane' : '中英双栏' }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vitepress'

const props = defineProps<{
  lang?: 'zh' | 'en'
}>()

const route = useRoute()
const isEn = computed(() => {
  if (props.lang) return props.lang === 'en'
  return route.path.startsWith('/en/') || route.path === '/en'
})

const books = [
  {
    id: 'operational-research',
    titleZh: 'European Journal of Operational Research 运筹学前沿论文',
    titleEn: 'A Robust Optimization Model for Combinatorial Problems',
    fieldZh: '运筹学 / 组合优化',
    fieldEn: 'Operations Research',
    pages: 17,
    available: true,
    descZh: '发表于运筹学顶刊 EJOR 的前沿学术成果，讨论不确定性环境下的鲁棒优化与离散决策模型。',
    descEn: 'Frontier research paper from EJOR investigating robust optimization models and discrete decisions under uncertainty.'
  },
  {
    id: 'algorithms-for-decision-making',
    titleZh: '决策算法导论 (Algorithms for Decision Making)',
    titleEn: 'Algorithms for Decision Making (MIT Press)',
    fieldZh: '决策算法 / 强化学习',
    fieldEn: 'Decision Making & RL',
    pages: 700,
    available: false,
    descZh: '斯坦福大学计算决策权威教材，全面覆盖贝叶斯网络、序贯决策、马尔可夫决策过程与多智能体系统。',
    descEn: 'Authoritative MIT Press textbook from Stanford covering Bayesian networks, MDPs, and multi-agent systems.'
  },
  {
    id: 'elements-of-causal-inference',
    titleZh: '因果推断基础 (Elements of Causal Inference)',
    titleEn: 'Elements of Causal Inference: Foundations & Algorithms',
    fieldZh: '因果科学 / 统计学习',
    fieldEn: 'Causal Inference',
    pages: 289,
    available: false,
    descZh: '阐明因果图模型、结构因果方程（SCM）与干预分布，连接现代机器学习与统计因果推断的核心理论。',
    descEn: 'Foundational text bridging structural causal models (SCMs), graph models, and modern machine learning.'
  },
  {
    id: 'islp',
    titleZh: '统计学习导论：基于 Python 实战 (ISLP)',
    titleEn: 'An Introduction to Statistical Learning with Applications in Python',
    fieldZh: '机器学习 / 数据科学',
    fieldEn: 'Machine Learning & Python',
    pages: 613,
    available: false,
    descZh: '数据科学领域的经典巨著 Python 官方新版，涵盖高维回归、树模型、SVM 与深度学习实战。',
    descEn: 'The gold standard statistical learning textbook adapted for Python, covering regression, trees, SVMs, and deep learning.'
  },
  {
    id: 'mit-computational-biology',
    titleZh: 'MIT 6.047: 计算生物学与基因组学讲义',
    titleEn: 'MIT 6.047/6.878 Computational Biology: Genomes, Networks, Evolution',
    fieldZh: '计算生物学 / 生物信息',
    fieldEn: 'Computational Biology',
    pages: 547,
    available: false,
    descZh: '麻省理工学院全套系统性讲义，深入探讨序列比对算法、隐马尔可夫模型、基因调控网络与进化分析。',
    descEn: 'Comprehensive MIT course text on sequence alignment, HMMs, regulatory networks, and genome evolution.'
  },
  {
    id: 'mit-optimization-methods',
    titleZh: 'MIT 优化方法 (Optimization Methods)',
    titleEn: 'Optimization Methods: Theory and Algorithms',
    fieldZh: '凸优化 / 数学规划',
    fieldEn: 'Optimization Methods',
    pages: 521,
    available: false,
    descZh: '系统讲述线性规划对偶理论、非线性凸优化、内点法与大规模分布式优化算法。',
    descEn: 'Rigorous treatise on duality, convex optimization, interior point methods, and large-scale optimization.'
  },
  {
    id: 'itbook-export',
    titleZh: 'ITBook 计算机工程与体系结构合辑',
    titleEn: 'ITBook Computer Engineering & Systems Collection',
    fieldZh: '计算机系统 / 软件工程',
    fieldEn: 'Computer Systems',
    pages: 730,
    available: false,
    descZh: '汇聚计算机体系结构、分布式系统与工程落地的综合性英文技术书籍。',
    descEn: 'Comprehensive technical volume covering computer systems architecture and modern software engineering.'
  },
  {
    id: 'derivative-free-optimization',
    titleZh: '无导数优化方法 (Introduction to Derivative-Free Optimization)',
    titleEn: 'Introduction to Derivative-Free Optimization (SIAM)',
    fieldZh: '数值优化 / 应用数学',
    fieldEn: 'Numerical Optimization',
    pages: 290,
    available: false,
    descZh: '针对目标函数解析梯度缺失或黑箱仿真系统下的前沿求解算法与直接搜索方法。',
    descEn: 'SIAM monograph on modern algorithms for black-box problems and optimization without derivative information.'
  }
]
</script>
