<template>
  <view class="markdown-renderer" :class="{ 'markdown-renderer--dark': isDarkMode }">
    <view v-if="showPendingState" class="pending-block">
      <view class="pending-head">
        <view class="pending-title">
          <text>正在思考中</text>
          <view class="pending-dots" aria-hidden="true">
            <text class="pending-dot"></text>
            <text class="pending-dot"></text>
            <text class="pending-dot"></text>
          </view>
        </view>
      </view>
      <view class="pending-body">
        <text class="pending-desc">我正在整理思路并组织回答，马上回复你。</text>
      </view>
    </view>
    <template v-else>
      <template v-for="part in parsedParts" :key="part.key">
        <view
          v-if="part.type === 'markdown'"
          class="markdown-body"
          v-html="renderMarkdown(part.content)"
        ></view>
        <view v-else class="think-block">
          <view class="think-head">
            <text class="think-title">
              {{ part.isThinking ? '深度思考中' : '已深度思考' }}
              <text v-if="!hideThinkDuration && part.durationText">（{{ part.durationText }}秒）</text>
            </text>
          </view>
          <view class="markdown-body think-body" v-html="renderMarkdown(part.content)"></view>
        </view>
      </template>
    </template>
  </view>
</template>

<script>
import { computed, defineComponent, onBeforeUnmount, onMounted, ref } from 'vue'
import MarkdownIt from 'markdown-it'
import hljs from 'highlight.js'

const markdownIt = new MarkdownIt({
  html: true,
  breaks: true,
  linkify: true,
  highlight(code, lang) {
    if (lang && hljs.getLanguage(lang)) {
      return `<pre class="hljs"><code>${hljs.highlight(code, { language: lang }).value}</code></pre>`
    }

    return `<pre class="hljs"><code>${hljs.highlightAuto(code).value}</code></pre>`
  },
})

function splitContentByThink(content, now, hideThinkDuration) {
  const parts = []
  const source = String(content || '')
  const regex = /<think>([\s\S]*?)(<\/think>|$)/g
  let lastIndex = 0
  let match

  while ((match = regex.exec(source)) !== null) {
    if (match.index > lastIndex) {
      parts.push({
        type: 'markdown',
        key: `markdown-${match.index}`,
        content: source.slice(lastIndex, match.index),
      })
    }

    const rawBlock = match[0]
    const isClosed = rawBlock.endsWith('</think>')
    const startTime = now
    parts.push({
      type: 'think',
      key: `think-${match.index}`,
      content: match[1] || '',
      isThinking: !isClosed,
      durationText: hideThinkDuration ? '' : isClosed ? '已完成' : ((Date.now() - startTime) / 1000).toFixed(1),
    })

    lastIndex = match.index + rawBlock.length
  }

  if (lastIndex < source.length) {
    parts.push({
      type: 'markdown',
      key: `markdown-tail-${lastIndex}`,
      content: source.slice(lastIndex),
    })
  }

  if (!parts.length) {
    parts.push({
      type: 'markdown',
      key: 'markdown-empty',
      content: source,
    })
  }

  return parts
}

export default defineComponent({
  name: 'MarkdownRendererChat',
  props: {
    content: {
      type: String,
      default: '',
    },
    hideThinkDuration: {
      type: Boolean,
      default: false,
    },
    isDarkMode: {
      type: Boolean,
      default: false,
    },
  },
  setup(props) {
    const now = ref(Date.now())
    let timer = null

    const showPendingState = computed(() => {
      return String(props.content || '').trim().length === 0
    })

    const parsedParts = computed(() => {
      return splitContentByThink(props.content, now.value, props.hideThinkDuration)
    })

    const renderMarkdown = (content) => {
      return markdownIt.render(String(content || ''))
    }

    onMounted(() => {
      timer = setInterval(() => {
        now.value = Date.now()
      }, 300)
    })

    onBeforeUnmount(() => {
      if (timer) {
        clearInterval(timer)
        timer = null
      }
    })

    return {
      parsedParts,
      renderMarkdown,
      showPendingState,
    }
  },
})
</script>

<style scoped lang="scss">
.markdown-renderer {
  width: 100%;
  color: #1f2937;
}

.markdown-body {
  width: 100%;
  word-break: break-word;
  line-height: 1.7;
  color: inherit;
}

.pending-block,
.think-block {
  margin-top: 12rpx;
  overflow: hidden;
  border: 1px solid #e5e7eb;
  border-radius: 16rpx;
  background: #f8fafc;
}

.pending-head,
.think-head {
  padding: 14rpx 20rpx;
  border-bottom: 1px solid #e5e7eb;
  background: #f1f5f9;
}

.pending-title,
.think-title {
  font-size: 24rpx;
  color: #64748b;
}

.pending-title {
  display: inline-flex;
  align-items: center;
  gap: 8rpx;
}

.pending-dots {
  display: inline-flex;
  align-items: center;
  gap: 6rpx;
}

.pending-dot {
  width: 8rpx;
  height: 8rpx;
  border-radius: 50%;
  background: currentColor;
  opacity: 0.28;
  animation: pending-dot-bounce 1.2s ease-in-out infinite;
}

.pending-dot:nth-child(2) {
  animation-delay: 0.2s;
}

.pending-dot:nth-child(3) {
  animation-delay: 0.4s;
}

.pending-body {
  padding: 20rpx;
}

.pending-desc {
  font-size: 25rpx;
  line-height: 1.7;
  color: #475569;
}

.think-body {
  padding: 8rpx 0;
}

.markdown-renderer--dark {
  color: #e5e7eb;
}

.markdown-renderer--dark .think-block {
  border-color: rgba(148, 163, 184, 0.25);
  background: rgba(15, 23, 42, 0.75);
}

.markdown-renderer--dark .pending-block {
  border-color: rgba(148, 163, 184, 0.25);
  background: rgba(15, 23, 42, 0.75);
}

.markdown-renderer--dark .pending-head,
.markdown-renderer--dark .think-head {
  border-bottom-color: rgba(148, 163, 184, 0.25);
  background: rgba(30, 41, 59, 0.85);
}

.markdown-renderer--dark .pending-title,
.markdown-renderer--dark .pending-desc {
  color: #cbd5e1;
}

@keyframes pending-dot-bounce {
  0%,
  80%,
  100% {
    opacity: 0.28;
    transform: translateY(0) scale(0.9);
  }
  40% {
    opacity: 1;
    transform: translateY(-2rpx) scale(1);
  }
}

:deep(.markdown-body p) {
  margin: 10rpx 0;
}

:deep(.markdown-body h1),
:deep(.markdown-body h2),
:deep(.markdown-body h3) {
  margin: 18rpx 0 12rpx;
  font-weight: 700;
  line-height: 1.4;
}

:deep(.markdown-body ul),
:deep(.markdown-body ol) {
  padding-left: 34rpx;
  margin: 10rpx 0;
}

:deep(.markdown-body blockquote) {
  margin: 12rpx 0;
  padding: 14rpx 18rpx;
  border-left: 6rpx solid #2563eb;
  border-radius: 12rpx;
  background: #eff6ff;
  color: #334155;
}

:deep(.markdown-body pre) {
  overflow-x: auto;
  margin: 12rpx 0;
  padding: 18rpx;
  border-radius: 16rpx;
  background: #0f172a;
}

:deep(.markdown-body code) {
  font-size: 24rpx;
  font-family: Menlo, Monaco, Consolas, monospace;
}

:deep(.markdown-body a) {
  color: #2563eb;
  text-decoration: underline;
}
</style>
