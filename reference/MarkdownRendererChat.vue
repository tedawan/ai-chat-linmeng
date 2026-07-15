<template>
  <view ref="markdownWrapper" class="markdown-wrapper" :class="{ 'markdown-wrapper--dark': isDarkMode }">
    <template v-for="(part, index) in parsedParts" :key="index">
      <ScoreCard
        v-if="part.type === 'score'"
        :ai-score="part.data.aiScore"
        :penalty="part.data.penalty"
        :word-count="part.data.wordCount"
        :score-range="part.data.scoreRange"
        :is-dark-mode="isDarkMode"
      />
      <view v-else-if="part.type === 'mermaid'" class="mermaid-wrapper">
        <view v-if="mermaidHtmlCache[part.key]" class="mermaid-rendered" v-html="mermaidHtmlCache[part.key]"></view>
        <view v-else class="mermaid-loading">图表生成中...</view>
      </view>
      <view v-else-if="part.type === 'think'" class="think-block">
        <details>
          <summary class="think-summary">
            <span class="think-dot"></span>
            <span v-if="part.isThinking && !hideThinkDuration">深度思考中({{ getElapsedTime(part.startTime) }}秒)</span>
            <span v-else-if="part.isThinking">深度思考（手动中止）</span>
            <span v-else-if="hideThinkDuration">已深度思考</span>
            <span v-else>已深度思考({{ part.duration }}秒)</span>
          </summary>
          <view
            class="think-content markdown-body shenlungo-markdown-form"
            @click="handleThinkContentClick"
            v-html="renderMarkdown(part.content)"
          ></view>
        </details>
      </view>
      <view
        v-else
        class="markdown-body shenlungo-markdown-form"
        v-html="renderMarkdown(part.content)"
      ></view>
    </template>
  </view>
</template>

<script>
import MarkdownIt from 'markdown-it'
import hljs from 'highlight.js'
import ScoreCard from '../markdown-ai/ScoreCard.vue'

const MERMAID_KEYWORDS = /^(flowchart|graph)\s+(TB|TD|BT|RL|LR)\b|^(sequenceDiagram|classDiagram|stateDiagram(?:-v2)?|erDiagram|journey|gantt|pie\b|mindmap\b|timeline\b|gitGraph\b|quadrantChart\b|requirementDiagram\b|C4Context\b)/i

function isMermaidFence(info, content) {
  const language = (info || '').trim().split(/\s+/)[0].toLowerCase()
  const source = (content || '').trim()
  return language === 'mermaid' || language === 'flowchart' || MERMAID_KEYWORDS.test(source)
}

function createContentKey(content) {
  let hash = 0
  for (let index = 0; index < content.length; index += 1) {
    hash = ((hash << 5) - hash + content.charCodeAt(index)) | 0
  }
  return `mermaid-${Math.abs(hash)}-${content.length}`
}

const markdownIt = MarkdownIt({
  html: true,
  breaks: true,
  linkify: true,
  highlight(str, lang) {
    if (isMermaidFence(lang, str)) {
      return `<pre class="mermaid">${markdownIt.utils.escapeHtml(str)}</pre>`
    }

    try {
      return `<pre class="hljs"><code>${hljs.highlightAuto(str).value}</code></pre>`
    } catch (error) {
      return `<pre class="hljs"><code>${markdownIt.utils.escapeHtml(str)}</code></pre>`
    }
  }
})

const FORM_STYLES = {
  hr: 'height:1px!important;margin:18px 0!important;border:0!important;background:#e5e7eb!important;',
  form: 'display:flex!important;flex-direction:column!important;gap:14px!important;width:100%!important;margin-top:18px!important;',
  label: 'display:block!important;margin:0!important;color:#111827!important;font-size:15px!important;font-weight:800!important;line-height:1.4!important;',
  input: 'display:block!important;width:100%!important;min-height:44px!important;padding:12px 14px!important;box-sizing:border-box!important;border:1px solid #e5e7eb!important;border-radius:10px!important;background:#ffffff!important;color:#111827!important;font-size:14px!important;line-height:1.6!important;outline:none!important;',
  textarea: 'display:block!important;width:100%!important;min-height:116px!important;padding:12px 14px!important;box-sizing:border-box!important;border:1px solid #e5e7eb!important;border-radius:10px!important;background:#ffffff!important;color:#111827!important;font-size:14px!important;line-height:1.6!important;outline:none!important;resize:vertical!important;',
  button: 'display:flex!important;align-items:center!important;justify-content:center!important;width:100%!important;height:46px!important;min-height:46px!important;padding:0 14px!important;border:0!important;border-radius:10px!important;background:#155aef!important;color:#ffffff!important;font-size:15px!important;font-weight:800!important;line-height:46px!important;cursor:pointer!important;box-shadow:0 8px 18px rgba(21,90,239,0.18)!important;'
}

function mergeInlineStyle(attrs = '', style) {
  if (/\sstyle\s*=/.test(attrs)) {
    return attrs.replace(/\sstyle\s*=\s*(["'])(.*?)\1/i, ` style="${style}$2"`)
  }
  return `${attrs} style="${style}"`
}

function applyFormInlineStyles(html) {
  return html
    .replace(/<hr\b([^>]*)>/gi, (_, attrs) => `<hr${mergeInlineStyle(attrs, FORM_STYLES.hr)}>`)
    .replace(/<form\b([^>]*)>/gi, (_, attrs) => {
      const nextAttrs = /\sonsubmit\s*=/.test(attrs)
        ? attrs
        : `${attrs} onsubmit="return false;"`
      return `<form${mergeInlineStyle(nextAttrs, FORM_STYLES.form)}>`
    })
    .replace(/<label\b([^>]*)>/gi, (_, attrs) => `<label${mergeInlineStyle(attrs, FORM_STYLES.label)}>`)
    .replace(/<input\b([^>]*)>/gi, (_, attrs) => `<input${mergeInlineStyle(attrs, FORM_STYLES.input)}>`)
    .replace(/<textarea\b([^>]*)>/gi, (_, attrs) => `<textarea${mergeInlineStyle(attrs, FORM_STYLES.textarea)}>`)
    .replace(/<button\b([^>]*)>/gi, (_, attrs) => {
      const nextAttrs = /\stype\s*=/.test(attrs)
        ? attrs
        : `${attrs} type="button"`
      return `<button${mergeInlineStyle(nextAttrs, FORM_STYLES.button)}>`
    })
}

export default {
  name: 'ShenlungoMarkdownRenderer',
  components: {
    ScoreCard
  },
  emits: ['form-submit'],
  props: {
    content: { type: String, default: '' },
    hideThinkDuration: { type: Boolean, default: false },
    isDarkMode: { type: Boolean, default: false }
  },
  data() {
    return {
      mermaidHtmlCache: {},
      mermaidRenderingKeys: {},
      htmlClickHandler: null,
      htmlSubmitHandler: null,
      now: Date.now(),
      timer: null,
      thinkTimings: {}
    }
  },
  watch: {
    content: {
      handler(newVal) {
        this.updateThinkTimings(newVal)
        this.renderMermaidParts()
      },
      immediate: true
    }
  },
  mounted() {
    this.timer = setInterval(() => {
      this.now = Date.now()
    }, 100)
    this.bindHtmlFormEvents()
    this.renderMermaidParts()
  },
  updated() {
    this.renderMermaidParts()
  },
  beforeDestroy() {
    this.cleanupRenderer()
  },
  beforeUnmount() {
    this.cleanupRenderer()
  },
  computed: {
    parsedParts() {
      const parts = []
      const content = this.content || ''
      let lastIndex = 0
      const thinkRegex = /<think>([\s\S]*?)<\/think>/g
      let match

      while ((match = thinkRegex.exec(content)) !== null) {
        if (match.index > lastIndex) {
          this.parseMarkdownSegment(content.slice(lastIndex, match.index), parts)
        }

        const startIdx = match.index
        const timing = this.thinkTimings[startIdx]
        let duration = null
        if (timing && timing.end) {
          duration = ((timing.end - timing.start) / 1000).toFixed(1)
        }

        parts.push({
          type: 'think',
          content: match[1],
          isThinking: false,
          duration,
          startIndex: startIdx
        })

        lastIndex = match.index + match[0].length
      }

      const incompleteThinkIdx = content.indexOf('<think>', lastIndex)
      if (incompleteThinkIdx !== -1) {
        if (incompleteThinkIdx > lastIndex) {
          this.parseMarkdownSegment(content.slice(lastIndex, incompleteThinkIdx), parts)
        }

        const thinkContent = content.slice(incompleteThinkIdx + '<think>'.length)
        const timing = this.thinkTimings[incompleteThinkIdx]

        parts.push({
          type: 'think',
          content: thinkContent,
          isThinking: true,
          startTime: timing ? timing.start : Date.now(),
          startIndex: incompleteThinkIdx
        })

        return parts.length ? parts : [{ type: 'markdown', content: '' }]
      }

      if (lastIndex < content.length) {
        this.parseMarkdownSegment(content.slice(lastIndex), parts)
      }

      return parts.length ? parts : [{ type: 'markdown', content: '' }]
    }
  },
  methods: {
    cleanupRenderer() {
      if (this.timer) {
        clearInterval(this.timer)
        this.timer = null
      }
      this.unbindHtmlFormEvents()
    },
    updateThinkTimings(content = '') {
      const starts = []
      const startRegex = /<think>/g
      let match
      while ((match = startRegex.exec(content)) !== null) {
        starts.push(match.index)
      }

      const ends = []
      const endRegex = /<\/think>/g
      while ((match = endRegex.exec(content)) !== null) {
        ends.push(match.index)
      }

      starts.forEach((startIdx) => {
        if (!this.thinkTimings[startIdx]) {
          const timing = { start: Date.now() }
          this.$set
            ? this.$set(this.thinkTimings, startIdx, timing)
            : (this.thinkTimings[startIdx] = timing)
        }
      })

      const matchedCount = Math.min(starts.length, ends.length)
      for (let index = 0; index < matchedCount; index += 1) {
        const startIdx = starts[index]
        if (this.thinkTimings[startIdx] && !this.thinkTimings[startIdx].end) {
          this.thinkTimings[startIdx].end = Date.now()
        }
      }

      const currentStarts = new Set(starts)
      Object.keys(this.thinkTimings).forEach((key) => {
        if (!currentStarts.has(Number(key))) {
          this.$delete
            ? this.$delete(this.thinkTimings, key)
            : delete this.thinkTimings[key]
        }
      })
    },
    parseMarkdownSegment(text, parts) {
      const fenceBlockRegex = /```([^\n]*)\n([\s\S]*?)```/g
      let lastIndex = 0
      let match

      while ((match = fenceBlockRegex.exec(text)) !== null) {
        const info = match[1] || ''
        const blockContent = match[2] || ''
        const language = info.trim().split(/\s+/)[0].toLowerCase()
        const isScoreBlock = language === 'score'
        const isMermaidBlock = isMermaidFence(info, blockContent)

        if (!isScoreBlock && !isMermaidBlock) continue

        if (match.index > lastIndex) {
          parts.push({
            type: 'markdown',
            content: text.slice(lastIndex, match.index)
          })
        }

        if (isScoreBlock) {
          parts.push({
            type: 'score',
            data: {
              aiScore: blockContent.match(/AI评分[：:]\s*([^\n]+)/)?.[1] || '-',
              penalty: blockContent.match(/字数惩罚扣分[：:]\s*([^\n]+)/)?.[1] || '-',
              wordCount: blockContent.match(/答案字数[：:]\s*([^\n]+)/)?.[1] || '-',
              scoreRange: blockContent.match(/参考得分区间[：:]\s*([^\n]+)/)?.[1] || '-'
            }
          })
        } else {
          parts.push({
            type: 'mermaid',
            key: createContentKey(blockContent),
            content: blockContent
          })
        }

        lastIndex = fenceBlockRegex.lastIndex
      }

      if (lastIndex < text.length) {
        parts.push({
          type: 'markdown',
          content: text.slice(lastIndex)
        })
      }
    },
    getElapsedTime(startTime) {
      return ((this.now - startTime) / 1000).toFixed(1)
    },
    handleThinkContentClick(event) {
      const target = event && event.target
      if (!target || !target.closest) return
      if (target.closest('a, button, input, textarea, select, label')) return

      const selection = typeof window !== 'undefined' && window.getSelection ? window.getSelection() : null
      if (selection && String(selection).trim()) return

      const details = target.closest('details')
      if (details && details.open) {
        details.open = false
      }
    },
    renderMarkdown(text) {
      if (!text) return ''
      return applyFormInlineStyles(markdownIt.render(text))
    },
    getWrapperElement() {
      const wrapper = this.$refs.markdownWrapper
      return (wrapper && wrapper.$el) || wrapper || this.$el
    },
    bindHtmlFormEvents() {
      // #ifdef H5
      this.$nextTick(() => {
        const wrapper = this.getWrapperElement()
        if (!wrapper || !wrapper.addEventListener || this.htmlClickHandler) return

        this.htmlClickHandler = (event) => this.handleHtmlClick(event)
        this.htmlSubmitHandler = (event) => this.handleHtmlSubmit(event)
        wrapper.addEventListener('click', this.htmlClickHandler, true)
        wrapper.addEventListener('submit', this.htmlSubmitHandler, true)
      })
      // #endif
    },
    unbindHtmlFormEvents() {
      // #ifdef H5
      const wrapper = this.getWrapperElement()
      if (wrapper && wrapper.removeEventListener) {
        if (this.htmlClickHandler) wrapper.removeEventListener('click', this.htmlClickHandler, true)
        if (this.htmlSubmitHandler) wrapper.removeEventListener('submit', this.htmlSubmitHandler, true)
      }
      this.htmlClickHandler = null
      this.htmlSubmitHandler = null
      // #endif
    },
    handleHtmlClick(event) {
      const target = event && event.target
      if (!target || !target.closest) return
      const submitButton = target.closest('button, input[type="submit"]')
      if (!submitButton) return
      const form = submitButton.closest('form')
      if (!form) return

      event.preventDefault()
      event.stopPropagation()
      this.$emit('form-submit', this.collectFormValues(form))
    },
    handleHtmlSubmit(event) {
      const form = event && event.target
      if (!form || !form.querySelectorAll) return
      event.preventDefault()
      event.stopPropagation()
      this.$emit('form-submit', this.collectFormValues(form))
    },
    collectFormValues(form) {
      const values = {}
      const fields = form.querySelectorAll('input[name], textarea[name], select[name]')
      fields.forEach((field) => {
        if (field.disabled) return
        const name = field.getAttribute('name')
        if (!name) return
        if (field.type === 'checkbox') {
          values[name] = field.checked
        } else if (field.type === 'radio') {
          if (field.checked) values[name] = field.value
        } else {
          values[name] = field.value || ''
        }
      })
      return values
    },
    renderMermaidParts() {
      // #ifdef H5
      this.$nextTick(async () => {
        const mermaidParts = this.parsedParts.filter((part) => part.type === 'mermaid')
        const pendingParts = mermaidParts.filter((part) => !this.mermaidHtmlCache[part.key] && !this.mermaidRenderingKeys[part.key])
        if (!pendingParts.length) return

        try {
          const mermaidModule = await import('mermaid')
          const mermaid = mermaidModule.default || mermaidModule
          mermaid.initialize({
            startOnLoad: false,
            securityLevel: 'loose',
            theme: 'default',
            flowchart: {
              useMaxWidth: true,
              htmlLabels: true
            }
          })

          for (const part of pendingParts) {
            this.mermaidRenderingKeys[part.key] = true
            try {
              const { svg } = await mermaid.render(`${part.key}-${Date.now()}`, part.content)
              this.$set
                ? this.$set(this.mermaidHtmlCache, part.key, svg)
                : (this.mermaidHtmlCache[part.key] = svg)
            } finally {
              this.$delete
                ? this.$delete(this.mermaidRenderingKeys, part.key)
                : delete this.mermaidRenderingKeys[part.key]
            }
          }
        } catch (error) {
          console.warn('Mermaid render failed:', error)
        }
      })
      // #endif
    }
  }
}
</script>

<style scoped>
.markdown-wrapper {
  display: flex;
  flex-direction: column;
  gap: 5px;
  width: 100%;
}

.markdown-body {
  width: 100%;
  color: #1f2937;
  word-break: break-word;
}

:deep(.markdown-body h1),
:deep(.markdown-body h2),
:deep(.markdown-body h3) {
  margin: 18px 0 10px;
  color: #111827;
  font-weight: 800;
  line-height: 1.35;
}

:deep(.markdown-body p) {
  margin: 8px 8px 8px 8px;
}

:deep(.markdown-body img[src="https://ai.shenlungo.com/qr-code.jpg"]) {
  max-width: 150px;
  height: auto;
}

:deep(.markdown-body ul),
:deep(.markdown-body ol) {
  padding-left: 22px;
  margin: 8px 0;
}

:deep(.markdown-body blockquote) {
  padding: 10px 14px;
  margin: 12px 0;
  border-left: 4px solid #155aef;
  border-radius: 8px;
  background: #f4f7ff;
  color: #344054;
}

:deep(.markdown-body table) {
  width: 100%;
  border-collapse: collapse;
  margin: 12px 0;
  overflow: hidden;
  border-radius: 10px;
}

:deep(.markdown-body th),
:deep(.markdown-body td) {
  padding: 10px;
  border: 1px solid #e5e7eb;
  text-align: left;
}

:deep(.markdown-body pre) {
  overflow-x: auto;
  padding: 14px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #f9fafb;
}

:deep(.markdown-body hr) {
  height: 1px !important;
  margin: 18px 0 !important;
  border: 0 !important;
  background: #e5e7eb !important;
}

:deep(.markdown-body form) {
  display: flex !important;
  flex-direction: column !important;
  gap: 14px !important;
  width: 100% !important;
  margin-top: 18px !important;
}

:deep(.markdown-body form label) {
  display: block !important;
  margin: 0 !important;
  color: #111827 !important;
  font-size: 15px !important;
  font-weight: 800 !important;
  line-height: 1.4 !important;
}

:deep(.markdown-body form input),
:deep(.markdown-body form textarea) {
  display: block !important;
  width: 100% !important;
  padding: 12px 14px !important;
  box-sizing: border-box !important;
  border: 1px solid #e5e7eb !important;
  border-radius: 10px !important;
  background: #f8f9fa !important;
  color: #111827 !important;
  font-size: 14px !important;
  line-height: 1.6 !important;
  outline: none !important;
}

:deep(.markdown-body form input) {
  min-height: 44px !important;
}

:deep(.markdown-body form textarea) {
  min-height: 116px !important;
  resize: vertical !important;
}

:deep(.markdown-body form input:focus),
:deep(.markdown-body form textarea:focus) {
  border-color: #155aef !important;
  box-shadow: 0 0 0 3px rgba(21, 90, 239, 0.08) !important;
}

:deep(.markdown-body form button),
:deep(.markdown-body form input[type="submit"]) {
  width: 100% !important;
  height: 46px !important;
  min-height: 46px !important;
  padding: 0 14px !important;
  border: 0 !important;
  border-radius: 10px !important;
  background: #155aef !important;
  color: #ffffff !important;
  font-size: 15px !important;
  font-weight: 800 !important;
  cursor: pointer !important;
  box-shadow: 0 8px 18px rgba(21, 90, 239, 0.18) !important;
}

.think-block {
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  overflow: hidden;
  background: #fafafa;
}

.think-block details[open] {
  background: #fafafa;
}

.think-summary {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.3rem 0.3rem;
  cursor: pointer;
  font-size: 13px;
  color: #6b7280;
  list-style: none;
  background: #f5f5f5;
  border-bottom: 1px solid transparent;
}

.think-block details[open] .think-summary {
  border-bottom-color: #e5e7eb;
}

.think-summary::-webkit-details-marker {
  display: none;
}

.think-summary::marker {
  display: none;
  content: '';
}

.think-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #f59e0b;
  flex-shrink: 0;
  animation: think-pulse 1.5s ease-in-out infinite;
}

.think-block details:not([open]) .think-dot {
  background: #9ca3af;
  animation: none;
}

@keyframes think-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

::deep(.think-content.markdown-body) {
  line-height: 1.6;
  color: #6b7280;
  cursor: pointer;
}

::deep(.think-content.markdown-body p),
::deep(.think-content.markdown-body ul),
::deep(.think-content.markdown-body ol),
::deep(.think-content.markdown-body li) {
  color: #6b7280 !important;
}

.mermaid-wrapper {
  width: 100%;
}

.mermaid-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 160px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #f9fafb;
  color: #98a2b3;
  font-size: 13px;
  font-weight: 700;
}

.mermaid-rendered {
  display: flex;
  justify-content: center;
  width: 100%;
  min-height: 120px;
  overflow-x: auto;
  padding: 16px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  box-sizing: border-box;
  background: #ffffff;
  color: #1f2937;
}

:deep(.mermaid-rendered svg) {
  max-width: 100%;
  height: auto;
}

:deep(.markdown-body .mermaid) {
  display: flex;
  justify-content: center;
  width: 100%;
  min-height: 120px;
  overflow-x: auto;
  padding: 16px;
  box-sizing: border-box;
  color: #1f2937;
}

:deep(.markdown-body .mermaid svg) {
  max-width: 100%;
  height: auto;
}

:deep(.markdown-body code) {
  padding: 2px 5px;
  border-radius: 5px;
  background: #f3f4f6;
  color: #155aef;
}

@media screen and (max-width: 640px) {
  .markdown-body {
    font-size: 14px;
    line-height: 1.85;
  }

  .think-summary {
    font-size: 12px;
  }

  ::deep(.think-content.markdown-body) {
    font-size: 12px;
  }

  ::deep(.think-content.markdown-body p),
  ::deep(.think-content.markdown-body ul),
  ::deep(.think-content.markdown-body ol),
  ::deep(.think-content.markdown-body li) {
    font-size: 12px !important;
  }

  .mermaid-loading {
    font-size: 13px;
    min-height: 160px;
  }

  .mermaid-rendered {
    padding: 16px;
  }

  :deep(.markdown-body code) {
    font-size: 14px;
  }
}

@media screen and (min-width: 641px) and (max-width: 1024px) {
  .markdown-body {
    font-size: 14px;
    line-height: 1.75;
  }

  .think-summary {
    font-size: 12px;
  }

  ::deep(.think-content.markdown-body) {
    font-size: 11px;
  }

  ::deep(.think-content.markdown-body p),
  ::deep(.think-content.markdown-body ul),
  ::deep(.think-content.markdown-body ol),
  ::deep(.think-content.markdown-body li) {
    font-size: 11px !important;
  }

  .mermaid-loading {
    font-size: 12px;
    min-height: 140px;
  }

  .mermaid-rendered {
    padding: 12px;
  }

  :deep(.markdown-body code) {
    font-size: 13px;
  }
}

@media screen and (min-width: 1025px) {
  .markdown-body {
    font-size: 16px;
    line-height: 1.75;
  }

  .think-summary {
    font-size: 14px;
    padding: 0.5rem 0.5rem;
  }

  ::deep(.think-content.markdown-body) {
    font-size: 11px;
    user-select: text;
    -webkit-user-select: text;
  }

  ::deep(.think-content.markdown-body p),
  ::deep(.think-content.markdown-body ul),
  ::deep(.think-content.markdown-body ol),
  ::deep(.think-content.markdown-body li) {
    font-size: 11px !important;
  }

  :deep(.markdown-body) {
  user-select: text;
  -webkit-user-select: text;
}
  .mermaid-loading {
    font-size: 12px;
    min-height: 140px;
  }

  .mermaid-rendered {
    padding: 14px;
  }

  :deep(.markdown-body code) {
    font-size: 12px;
  }
}

.markdown-wrapper--dark {
  color: #e5e5e5;
}

.markdown-wrapper--dark :deep(.think-block) {
  border-color: #3f3f46;
  background: #2a2a2c;
}

.markdown-wrapper--dark :deep(.think-block details[open]) {
  background: #2a2a2c;
}

.markdown-wrapper--dark :deep(.think-summary) {
  background: #1e1e20;
  color: #9ca3af;
}

.markdown-wrapper--dark :deep(.think-block details[open] .think-summary) {
  border-bottom-color: #3f3f46;
}

.markdown-wrapper--dark :deep(.think-block details:not([open]) .think-dot) {
  background: #6b7280;
}
</style>

<style>
.markdown-wrapper--dark .shenlungo-markdown-form {
  color: #e5e5e5;
}

.markdown-wrapper--dark .shenlungo-markdown-form h1,
.markdown-wrapper--dark .shenlungo-markdown-form h2,
.markdown-wrapper--dark .shenlungo-markdown-form h3,
.markdown-wrapper--dark .shenlungo-markdown-form h4,
.markdown-wrapper--dark .shenlungo-markdown-form h5,
.markdown-wrapper--dark .shenlungo-markdown-form h6 {
  color: #e5e5e5;
}

.markdown-wrapper--dark .shenlungo-markdown-form p,
.markdown-wrapper--dark .shenlungo-markdown-form ul,
.markdown-wrapper--dark .shenlungo-markdown-form ol,
.markdown-wrapper--dark .shenlungo-markdown-form li,
.markdown-wrapper--dark .shenlungo-markdown-form strong,
.markdown-wrapper--dark .shenlungo-markdown-form table,
.markdown-wrapper--dark .shenlungo-markdown-form th,
.markdown-wrapper--dark .shenlungo-markdown-form td {
  color: #e5e5e5;
}

.markdown-wrapper--dark .shenlungo-markdown-form blockquote {
  background: #1e293b;
  border-left-color: #155aef;
  color: #94a3b8;
}

.markdown-wrapper--dark .shenlungo-markdown-form pre {
  background: #1e1e20;
  color: #e5e5e5;
  border-color: #3f3f46;
}

.markdown-wrapper--dark .shenlungo-markdown-form th,
.markdown-wrapper--dark .shenlungo-markdown-form td {
  border-color: #3f3f46;
}

.markdown-wrapper--dark .shenlungo-markdown-form a {
  color: #60a5fa;
}

.markdown-wrapper--dark .shenlungo-markdown-form code {
  background: #3f3f46;
  color: #93c5fd;
}

.markdown-wrapper--dark .think-content.shenlungo-markdown-form {
  color: #9ca3af;
}

.shenlungo-markdown-form hr {
  height: 1px !important;
  margin: 18px 0 !important;
  border: 0 !important;
  background: #e5e7eb !important;
}

.shenlungo-markdown-form form {
  display: flex !important;
  flex-direction: column !important;
  gap: 14px !important;
  width: 100% !important;
  margin-top: 18px !important;
}

.shenlungo-markdown-form form label {
  display: block !important;
  margin: 0 !important;
  color: #111827 !important;
  font-size: 15px !important;
  font-weight: 800 !important;
  line-height: 1.4 !important;
}

.shenlungo-markdown-form form input,
.shenlungo-markdown-form form textarea {
  display: block !important;
  width: 100% !important;
  padding: 12px 14px !important;
  box-sizing: border-box !important;
  border: 1px solid #e5e7eb !important;
  border-radius: 10px !important;
  background: #f8f9fa !important;
  color: #111827 !important;
  font-size: 14px !important;
  line-height: 1.6 !important;
  outline: none !important;
}

.shenlungo-markdown-form form input {
  min-height: 44px !important;
}

.shenlungo-markdown-form form textarea {
  min-height: 116px !important;
  resize: vertical !important;
}

.shenlungo-markdown-form form input:focus,
.shenlungo-markdown-form form textarea:focus {
  border-color: #155aef !important;
  box-shadow: 0 0 0 3px rgba(21, 90, 239, 0.08) !important;
}

.shenlungo-markdown-form form button,
.shenlungo-markdown-form form input[type="submit"] {
  width: 100% !important;
  height: 46px !important;
  min-height: 46px !important;
  padding: 0 14px !important;
  border: 0 !important;
  border-radius: 10px !important;
  background: #155aef !important;
  color: #ffffff !important;
  font-size: 15px !important;
  font-weight: 800 !important;
  cursor: pointer !important;
  box-shadow: 0 8px 18px rgba(21, 90, 239, 0.18) !important;
}

@media screen and (max-width: 640px) {
  .shenlungo-markdown-form form label {
    font-size: 15px !important;
  }

  .shenlungo-markdown-form form input,
  .shenlungo-markdown-form form textarea {
    font-size: 14px !important;
    padding: 12px 14px !important;
  }

  .shenlungo-markdown-form form button,
  .shenlungo-markdown-form form input[type="submit"] {
    font-size: 15px !important;
    height: 46px !important;
    min-height: 46px !important;
  }
}

@media screen and (min-width: 641px) and (max-width: 1024px) {
  .shenlungo-markdown-form form label {
    font-size: 14px !important;
  }

  .shenlungo-markdown-form form input,
  .shenlungo-markdown-form form textarea {
    font-size: 13px !important;
    padding: 10px 12px !important;
  }

  .shenlungo-markdown-form form button,
  .shenlungo-markdown-form form input[type="submit"] {
    font-size: 14px !important;
    height: 42px !important;
    min-height: 42px !important;
  }
}

@media screen and (min-width: 1025px) {
  .shenlungo-markdown-form form label {
    font-size: 14px !important;
  }

  .shenlungo-markdown-form form input,
  .shenlungo-markdown-form form textarea {
    font-size: 13px !important;
    padding: 10px 12px !important;
  }

  .shenlungo-markdown-form form button,
  .shenlungo-markdown-form form input[type="submit"] {
    font-size: 14px !important;
    height: 42px !important;
    min-height: 42px !important;
  }
}

.markdown-wrapper--dark .shenlungo-markdown-form hr {
  background: #3f3f46 !important;
}

.markdown-wrapper--dark .shenlungo-markdown-form form label {
  color: #e5e5e5 !important;
}

.markdown-wrapper--dark .shenlungo-markdown-form form input,
.markdown-wrapper--dark .shenlungo-markdown-form form textarea {
  background: #2a2a2c !important;
  border-color: #3f3f46 !important;
  color: #e5e5e5 !important;
}

.markdown-wrapper--dark .shenlungo-markdown-form form input:focus,
.markdown-wrapper--dark .shenlungo-markdown-form form textarea:focus {
  border-color: #155aef !important;
  box-shadow: 0 0 0 3px rgba(21, 90, 239, 0.2) !important;
}

.markdown-wrapper--dark .shenlungo-markdown-form form button,
.markdown-wrapper--dark .shenlungo-markdown-form form input[type="submit"] {
  background: #155aef !important;
  color: #ffffff !important;
}
</style>
