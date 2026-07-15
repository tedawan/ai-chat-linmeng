<template>
  <view class="improve-page" :class="{ 'dark-mode': isDarkMode }">
    <header class="mobile-chat-header">
      <view class="mobile-header-left">
        <button class="mobile-icon-btn" @click="showMobileConversationDrawer = true">
          <Menu :size="18" />
        </button>
        <view class="mobile-brand">
          <view class="mobile-brand-avatar">
            <image class="avatar-image" :src="teacherAvatarUrl" mode="aspectFill"></image>
          </view>
          <text class="mobile-brand-name">{{ teacherName }}</text>
        </view>
      </view>
      <view class="mobile-header-actions">
        <button v-if="hasStartedChat" class="mobile-icon-btn" @click="resetChat">
          <RotateCcw :size="16" />
        </button>
      </view>
    </header>

    <view
      v-if="showMobileConversationDrawer"
      class="mobile-conversation-mask"
      @click="showMobileConversationDrawer = false"
    ></view>

    <view class="improve-layout">
      <aside class="conversation-panel" :class="{ open: showMobileConversationDrawer }">
        <view class="teacher-head">
          <view class="avatar teacher-avatar">
            <image class="avatar-image" :src="teacherAvatarUrl" mode="aspectFill"></image>
          </view>
          <view>
            <text class="teacher-name">{{ teacherName }}</text>
            <text class="teacher-desc"></text>
          </view>
          <button class="mobile-drawer-close" @click="showMobileConversationDrawer = false">
            <PanelLeftClose :size="20" />
          </button>
        </view>

        <button class="new-chat" :disabled="isGenerating" @click="resetMobileChat">
          <span class="icon-square-pen"></span>
          <span>开启新对话</span>
        </button>

        <view v-if="activeConversationMenuId" class="conversation-menu-mask" @click="activeConversationMenuId = ''"></view>
        <scroll-view scroll-y class="conversation-list" @scrolltolower="loadMoreConversations">
          <view
            v-for="item in conversations"
            :key="item.id"
            class="conversation-item"
            :class="{ active: item.id === conversationId, 'menu-open': activeConversationMenuId === item.id, disabled: isGenerating }"
            @click="selectConversation(item)"
          >
            <view class="conversation-text">
              <view class="conversation-title-row">
                <text class="conversation-title">{{ item.name || '未命名对话' }}</text>
              </view>
            </view>
            <view class="conversation-action">
              <button
                class="menu-trigger"
                :class="{ visible: item.id === conversationId || activeConversationMenuId === item.id }"
                :disabled="isGenerating"
                @click.stop="toggleConversationMenu(item.id)"
              >
                <span></span>
                <span></span>
                <span></span>
              </button>

              <view v-if="activeConversationMenuId === item.id" class="conversation-menu" @click.stop>
                <button class="menu-item" @click.stop="renameConversationItem(item)">
                  <span class="menu-icon edit"></span>
                  <span>重命名</span>
                </button>
                <button class="menu-item danger" @click.stop="removeConversation(item)">
                  <span class="menu-icon trash"></span>
                  <span>删除</span>
                </button>
              </view>
            </view>
          </view>
          <view v-if="!conversations.length" class="empty-list">暂无历史会话</view>
          <view v-if="conversationLoading" class="loading-indicator">加载中...</view>
          <view class="conversation-bottom-spacer"></view>
        </scroll-view>
      </aside>

      <main class="chat-panel">
        <view v-if="!hasStartedChat" class="start-card">
          <view class="start-icon">
            <image v-if="teacherAvatarUrl" :src="teacherAvatarUrl" mode="aspectFit" class="start-icon-img" />
            <text v-else>AI</text>
          </view>
          <text class="start-title">{{ appConfig.title}}</text>
          <text class="start-desc">{{ appConfig.description}}</text>

          <view class="config-card">
            <view class="mode-tabs">
              <view class="mode" :class="{ active: mode === 'guangdong' }" @click="changeMode('guangdong')">广东省考</view>
              <view class="mode" :class="{ active: mode === 'national' }" @click="changeMode('national')">国家公务员</view>
            </view>

            <view class="field">
              <view class="field-head">
                <view class="field-head-left">
                  <text>真题套卷</text>
                </view>
              </view>
              <view class="exam-select-trigger" :class="{ 'selected-text-underline': !!selectedExamName }" @click="openExamSelector">
                <view class="exam-select-trigger-copy">
                  <text class="exam-select-trigger-text">{{ selectedExamName || '请选择真题年份' }}</text>
                </view>
                <span class="exam-select-trigger-arrow"></span>
              </view>
            </view>

            <view class="field">
              <view class="field-head">
                <view class="field-head-left">
                  <text>作答题型</text>
                </view>
              </view>
              <view v-if="isDesktop" class="native-select-wrap">
                <select class="native-select" :class="{ 'selected-text-underline': !!selectedQuestionName }" :value="selectedQuestionIndex" @change="onQuestionChange">
                  <option v-for="(name, index) in questionNames" :key="name" :value="index">{{ name }}</option>
                </select>
                <span class="native-select-arrow"></span>
              </view>
              <picker v-else :range="questionNames" :value="selectedQuestionIndex" @change="onQuestionChange">
                <view class="select-box" :class="{ 'selected-text-underline': !!selectedQuestionName }">{{ selectedQuestionName || '请选择问题类型' }}</view>
              </picker>
            </view>

            <view class="field">
              <view class="field-head">
                <text>对话模型</text>
                <text class="tag orange">消耗 {{ selectedModelPoint }} 积分</text>
              </view>
              <view v-if="isDesktop" class="native-select-wrap">
                <select class="native-select" :value="selectedModelIndex" @change="onModelChange">
                  <option v-for="(name, index) in modelOptions" :key="name" :value="index">{{ name }}</option>
                </select>
                <span class="native-select-arrow"></span>
              </view>
              <picker v-else :range="modelOptions" :value="selectedModelIndex" @change="onModelChange">
                <view class="select-box">{{ selectedModel }}</view>
              </picker>
            </view>

            <view class="field">
              <view class="field-head">
                <text>历史任务</text>
                <text class="hint">选填，可对历史评分直接询问</text>
              </view>
              <view class="history-row">
                <view class="history-selected">
                  <view v-if="selectedHistoryTask" class="selected-history-content">
                    <text class="history-task-code selected-history-code">{{ getHistoryTaskCode(selectedHistoryTask) }}</text>
                    <text class="selected-history-title">{{ getHistoryTaskTitle(selectedHistoryTask) }}</text>
                    <text v-if="hasHistoryTaskParent(selectedHistoryTask)" class="history-tag selected-history-tag">套批</text>
                  </view>
                  <text v-else class="placeholder">未选择历史任务</text>
                </view>
                <button class="small-btn" @click="openHistoryModal">选择历史</button>
                <button v-if="selectedHistoryTask" class="small-btn ghost" @click="selectedHistoryTask = null">清除</button>
              </view>
            </view>

            <button class="start-btn" :disabled="!canStart" @click="startChat">开始针对性提分</button>
          </view>
        </view>

        <view v-else class="chat-shell">
          <scroll-view scroll-y class="messages" :scroll-top="scrollTop" @scrolltoupper="loadMoreMessages" @scroll="handleMessagesScroll" @wheel="handleMessagesWheel">
            <view v-if="messageLoadingMore" class="loading-indicator">加载中...</view>
            <view
              v-for="(message, index) in messages"
              :key="index"
              class="message-row"
              :class="{ user: message.role === 'user' }"
            >
              <view class="message-avatar" :class="{ assistant: message.role === 'assistant' }">
                <image
                  v-if="message.role === 'assistant'"
                  class="avatar-image"
                  :src="teacherAvatarUrl"
                  mode="aspectFill"
                ></image>
                <image
                  v-else
                  class="avatar-image"
                  :src="userAvatarUrl"
                  mode="aspectFill"
                  @error="userAvatarLoadFailed = true"
                ></image>
              </view>
              <view class="message-bubble">
                <MarkdownRendererChat
                  :content="message.content"
                  :hide-think-duration="message.isHistory || !message.isStreaming"
                  :is-dark-mode="isDarkMode"
                  @form-submit="sendFormPayload"
                />
                <view v-if="message.isStreaming" class="streaming-dot"></view>
                <view v-if="message.buttons && message.buttons.length" class="quick-replies">
                  <button
                    v-for="question in message.buttons"
                    :key="question"
                    class="quick-btn"
                    :disabled="isGenerating"
                    @click="sendQuickReply(question)"
                  >
                    {{ question }}
                  </button>
                </view>
                <view v-if="message.role === 'assistant' && message.createdAt && !message.isOpening" class="message-time">
                  {{ formatMessageTime(message.createdAt) }}
                </view>
              </view>
            </view>
            <view class="messages-bottom-spacer" :class="{ generating: isGenerating }"></view>
          </scroll-view>

          <div class="composer">
            <div v-if="isGenerating" class="stop-floating">
              <button class="stop-pill" @click="stopGenerating">
                <span class="icon-stop-mini"></span>
                <span>停止响应</span>
              </button>
            </div>
            <div class="composer-inner">
              <div class="composer-input-wrap">
                <div
                  ref="composerInput"
                  class="composer-input native-composer-input"
                  :class="{ disabled: isGenerating }"
                  :contenteditable="!isGenerating"
                  @input="onComposerInput"
                  @keydown="handleComposerKeydown"
                  @paste="handleComposerPaste"
                ></div>
                <span v-if="!inputText.trim()" class="composer-placeholder">和 {{ teacherName }} 对话提分 (按回车发送)</span>
              </div>
              <button
                class="send-btn"
                :class="{ 'is-loading': isGenerating }"
                :disabled="!inputText.trim() || isGenerating"
                @click="sendMessage"
              >
                <Loader2 v-if="isGenerating" :size="16" class="send-icon icon-spin" />
                <Send v-else :size="20" class="send-icon send-icon-arrow" />
              </button>
            </div>
          </div>
        </view>
      </main>
    </view>

    <view class="bottom-text">
      <text class="bottom-desc">© 2026 梦马科技 版权所有 · AI 内容仅供参考，不构成任何专业建议 <text class="beian-link" @click="openBeianSite">备案号：粤ICP备19027961号-5</text></text>
    </view>

    <view v-if="showHistory" class="modal-mask" @click="showHistory = false">
      <view class="history-modal" @click.stop>
        <view class="modal-head">
          <text>选择历史任务</text>
          <view class="modal-close-btn" @click="showHistory = false"></view>
        </view>
        <view class="history-select-tip">
          <text v-if="workflowTasks.length" class="history-select-tip-text">点击任意历史任务卡片，即可载入对应内容并开始提分对话</text>
        </view>
        <scroll-view scroll-y class="history-list">
          <view
            v-for="task in workflowTasks"
            :key="task.id"
            class="history-item"
            @click="selectHistoryTask(task)"
          >
            <view class="history-item-top">
              <text class="history-task-code">{{ getHistoryTaskCode(task) }}</text>
              <text class="history-task-time">{{ getHistoryTaskTime(task) }}</text>
            </view>
            <text class="history-title">{{ getHistoryTaskTitle(task) }}</text>
            <view class="history-item-bottom">
              <view class="history-tags">
                <text
                  v-for="tag in getHistoryTaskTags(task)"
                  :key="tag"
                  class="history-tag"
                >
                  {{ tag }}
                </text>
              </view>
              <text class="history-score">{{ getHistoryTaskScore(task) }}</text>
            </view>
          </view>
          <view v-if="!workflowTasks.length" class="empty-list">当前真题年份暂无可选历史任务</view>
        </scroll-view>
        <view class="history-pagination">
          <text class="history-total">共 {{ historyTotal }} 条记录</text>
          <view class="history-page-controls">
            <button class="page-btn" :disabled="historyLoading || historyPage <= 1" @click="changeHistoryPage(historyPage - 1)">
              上一页
            </button>
            <text class="page-info">
              {{ historyLoading ? '加载中...' : `${historyPage} / ${historyPageCount}` }}
            </text>
            <button class="page-btn" :disabled="historyLoading || historyPage >= historyPageCount" @click="changeHistoryPage(historyPage + 1)">
              下一页
            </button>
          </view>
        </view>
      </view>
    </view>

    <view v-if="showRenameModal" class="modal-mask" @click="closeRenameModal">
      <view class="rename-modal" @click.stop>
        <view class="rename-head">
          <view class="rename-icon">
            <span class="rename-pencil"></span>
          </view>
          <view>
            <text class="rename-title">重命名对话</text>
            <text class="rename-subtitle">请输入新的对话名称，便于后续快速定位。</text>
          </view>
        </view>

        <input
          v-model="renameName"
          class="rename-input"
          maxlength="40"
          focus
          placeholder="请输入新的对话名称"
          @confirm="submitRename"
        />

        <view class="rename-actions">
          <button class="rename-btn cancel" :disabled="renameSaving" @click="closeRenameModal">取消</button>
          <button class="rename-btn confirm" :disabled="renameSaving || !renameName.trim()" @click="submitRename">
            {{ renameSaving ? '保存中...' : '确认重命名' }}
          </button>
        </view>
      </view>
    </view>

    <view v-if="showExamSelector" class="exam-selector-mask" @click="closeExamSelector" @touchmove.stop.prevent="() => {}">
      <view class="exam-selector-panel" :class="{ desktop: isDesktop, mobile: !isDesktop }" @click.stop>
        <view class="exam-selector-head">
          <view class="exam-selector-title-group">
            <text class="exam-selector-title">选择真题套卷</text>
            <text class="exam-selector-subtitle">共 {{ examOptions.length }} 套，按配置顺序展示</text>
          </view>
          <view class="exam-selector-close" @click="closeExamSelector">
            <X :size="20" />
          </view>
        </view>

        <view class="exam-search-box">
          <Search :size="17" class="exam-search-icon" />
          <input
            v-model="examSearchKeyword"
            class="exam-search-input"
            confirm-type="search"
            placeholder="搜索年份、套卷关键词"
          />
          <view v-if="examSearchKeyword" class="exam-search-clear" @click="clearExamSearch">
            <X :size="15" />
          </view>
        </view>

        <scroll-view scroll-y="true" class="exam-selector-list" :show-scrollbar="false" :scroll-into-view="activeExamScrollTarget">
          <view id="improve-exam-list-top" class="exam-list-top-anchor"></view>
          <view v-if="groupedExamOptions.length" class="exam-groups">
            <view v-for="group in groupedExamOptions" :key="group.year" class="exam-group">
              <view class="exam-group-title">{{ group.year }}</view>
              <view
                v-for="option in group.options"
                :id="`improve-exam-option-${option.index}`"
                :key="`${option.id}-${option.index}`"
                class="exam-option"
                :class="{ active: option.index === selectedExamIndex }"
                @click="selectExamFromPanel(option.index)"
              >
                <view class="exam-option-main">
                  <text class="exam-option-name">{{ option.name }}</text>
                  <text class="exam-option-meta">{{ option.questionCount }} 个题型</text>
                </view>
                <view class="exam-option-check">
                  <Check v-if="option.index === selectedExamIndex" :size="16" />
                </view>
              </view>
            </view>
          </view>
          <view v-else class="exam-empty-state">
            <text class="exam-empty-title">未找到匹配套卷</text>
            <text class="exam-empty-desc">换个年份或关键词试试</text>
          </view>
        </scroll-view>
      </view>
    </view>
  </view>
</template>

<script>
import { Check, Loader2, Menu, PanelLeftClose, RotateCcw, Search, Send, X } from 'lucide-vue-next'
import { reportEvent } from '@/utils/report.js'
import MarkdownRendererChat from '@/components/markdown-ai/MarkdownRendererChat.vue'
import {
  initTabbarBackToScoreGuard,
  removeTabbarBackToScoreGuard,
  resumeTabbarBackToScoreGuard,
  suspendTabbarBackToScoreGuard
} from '@/utils/tabbarBackGuard'
import {
  IMPROVE_DIFY_APP_ID,
  authGuard,
  deleteConversation,
  getAppParameters,
  getConversationMessages,
  getConversations,
  getUserInfo,
  getWebappConfig,
  getWorkflowPage,
  renameConversation,
  stopChat,
  streamChatMessage
} from '@/services/shenlungoApi'
import {
  formatTime,
  modelPoint,
  normalizeExamId,
  normalizeExamName,
  normalizeQuestionId
} from '@/utils/shenlungo'

const SCORE_TO_IMPROVE_CONTEXT_KEY = 'shenlungo_score_to_improve_context'
const DEFAULT_TEACHER_AVATAR = '/static/ren2.png'
const DEFAULT_USER_AVATAR = '/static/default-head-icon.png'
const DESKTOP_COMPOSER_MIN_HEIGHT = 44
const DESKTOP_COMPOSER_MAX_HEIGHT = 164
const MOBILE_COMPOSER_MIN_HEIGHT = 36
const MOBILE_COMPOSER_MAX_HEIGHT = 120

export default {
  components: {
    Check,
    Loader2,
    Menu,
    PanelLeftClose,
    RotateCcw,
    Search,
    Send,
    X,
    MarkdownRendererChat
  },
  data() {
    return {
      mode: 'guangdong',
      appConfig: {},
      exams: [],
      selectedExamIndex: 0,
      selectedQuestionIndex: 0,
      modelOptions: [
        '初级模型 | 简要批注 | 1积分',
        '高级模型 | 针对指导 | 5积分',
        '超级模型 | 痛点详解 | 6积分'
      ],
      selectedModelIndex: 0,
      workflowTasks: [],
      historyPage: 1,
      historyPageSize: 10,
      historyPageCount: 1,
      historyTotal: 0,
      historyLoading: false,
      selectedHistoryTask: null,
      conversations: [],
      conversationHasMore: false,
      conversationLastId: null,
      conversationLoading: false,
      conversationId: '',
      hasStartedChat: false,
      messages: [],
      messageHasMore: false,
      messageFirstId: null,
      messageLoadingMore: false,
      inputText: '',
      taskId: '',
      sessionId: '',
      isGenerating: false,
      abortController: null,
      showHistory: false,
      activeConversationMenuId: '',
      showRenameModal: false,
      showMobileConversationDrawer: false,
      renameTarget: null,
      renameName: '',
      renameSaving: false,
      scrollTop: 0,
      autoStickMessages: true,
      _lastMessagesScrollTop: 0,
      _messagesViewHeight: 0,
      isDesktop: false,
      scoreContext: null,
      userInfo: {},
      userAvatarLoadFailed: false,
      isDarkMode: false,
      showExamSelector: false,
      examSearchKeyword: '',
      activeExamScrollTarget: '',
      _beforeUnloadHandler: null
    }
  },
  computed: {
    selectedExam() {
      return this.exams[this.selectedExamIndex] || {}
    },
    selectedQuestion() {
      return (this.selectedExam.questionList || [])[this.selectedQuestionIndex] || {}
    },
    examNames() {
      return this.exams.map((item) => normalizeExamName(item))
    },
    examOptions() {
      return this.exams.map((exam, index) => ({
        index,
        id: normalizeExamId(exam) || exam.id || index,
        year: exam.examYear,
        yearLabel: this.getExamYearLabel(exam.examYear),
        name: normalizeExamName(exam),
        questionCount: Array.isArray(exam.questionList) ? exam.questionList.filter((question) => question.questionId).length : 0
      }))
    },
    filteredExamOptions() {
      const keyword = String(this.examSearchKeyword || '').trim().toLowerCase()
      if (!keyword) return this.examOptions
      return this.examOptions.filter((option) => {
        return String(option.year).includes(keyword) ||
          String(option.yearLabel).toLowerCase().includes(keyword) ||
          String(option.name).toLowerCase().includes(keyword)
      })
    },
    groupedExamOptions() {
      const groups = []
      const groupMap = new Map()
      this.filteredExamOptions.forEach((option) => {
        const year = option.yearLabel || '其他'
        if (!groupMap.has(year)) {
          const group = { year, options: [] }
          groupMap.set(year, group)
          groups.push(group)
        }
        groupMap.get(year).options.push(option)
      })
      return groups
    },
    questionNames() {
      return (this.selectedExam.questionList || []).map((item) => item.name)
    },
    selectedExamName() {
      return normalizeExamName(this.selectedExam)
    },
    selectedQuestionName() {
      return this.selectedQuestion.name || ''
    },
    selectedModel() {
      return this.modelOptions[this.selectedModelIndex]
    },
    selectedModelPoint() {
      return modelPoint(this.selectedModel)
    },
    activeProvince() {
      return this.mode === 'national' ? 'gk' : 'gd'
    },
    teacherName() {
      return this.appConfig.title || 'Go老师'
    },
    teacherDescription() {
      return this.appConfig.description || '对话式教学提分，把握重点'
    },
    teacherAvatarUrl() {
      return this.appConfig.iconType === 'image' && this.appConfig.iconUrl
        ? this.appConfig.iconUrl
        : DEFAULT_TEACHER_AVATAR
    },
    userAvatarUrl() {
      if (this.userAvatarLoadFailed) return DEFAULT_USER_AVATAR
      return this.userInfo.wechatAvatarUrl ||
        this.userInfo.avatarUrl ||
        this.userInfo.headerImg ||
        this.userInfo.avatar ||
        DEFAULT_USER_AVATAR
    },
    suggestedQuestions() {
      return this.appConfig.suggestedQuestions || []
    },
    canStart() {
      return Boolean(this.selectedExamName && this.selectedQuestionName)
    }
  },
  onLoad(options = {}) {
    reportEvent('chat_ai_improve')
    this.updateViewportMode()
    if (!authGuard()) return
    this.scoreContext = options.fromScore ? this.readScoreContext() : null
    if (this.scoreContext) {
      this.mode = this.getModeByContext(this.scoreContext)
    }
    this.syncDarkMode()
    this.loadInitialData()
  },
  onShow() {
    this.applyPendingScoreContext()
    this.syncDarkMode()
    this.initTabGuard()
  },
  onHide() {
    this.removeExamSelectorPopstateGuard()
    this.removeTabGuard()
  },
  onUnload() {
    this.removeExamSelectorPopstateGuard()
    this.removeTabGuard()
    this.removeBeforeUnloadGuard()
  },
  onResize() {
    this.updateViewportMode()
    this.syncMessagesViewHeight()
  },
  mounted() {
    this.initBeforeUnloadGuard()
    this.initTabGuard()
    uni.$on('scoreToImproveContext', this.applyPendingScoreContext)
    uni.$on('darkModeChanged', this.handleDarkModeChanged)
    this.bindComposerNativeKeydown()
  },
  beforeDestroy() {
    this.removeExamSelectorPopstateGuard()
    this.removeTabGuard()
    this.removeBeforeUnloadGuard()
    uni.$off('scoreToImproveContext', this.applyPendingScoreContext)
    uni.$off('darkModeChanged', this.handleDarkModeChanged)
    this.unbindComposerNativeKeydown()
  },
  methods: {
    initTabGuard() {
      // #ifdef H5
      initTabbarBackToScoreGuard(this)
      // #endif
    },
    removeTabGuard() {
      // #ifdef H5
      removeTabbarBackToScoreGuard(this)
      // #endif
    },
    initExamSelectorPopstateGuard() {
      // #ifdef H5
      if (this._examSelectorPopstateHandler) return
      suspendTabbarBackToScoreGuard(this)
      this._examSelectorPopstateHandler = (event) => {
        if (!this.showExamSelector) return
        if (event && typeof event.stopImmediatePropagation === 'function') {
          event.stopImmediatePropagation()
        }
        this.closeExamSelector({ resumeTabGuard: true })
      }
      window.addEventListener('popstate', this._examSelectorPopstateHandler)
      window.history.pushState({ _improveExamSelector: 1 }, '')
      // #endif
    },
    removeExamSelectorPopstateGuard(options = {}) {
      // #ifdef H5
      const resumeTabGuard = options.resumeTabGuard !== false
      if (this._examSelectorPopstateHandler) {
        window.removeEventListener('popstate', this._examSelectorPopstateHandler)
        this._examSelectorPopstateHandler = null
      }
      if (resumeTabGuard) {
        resumeTabbarBackToScoreGuard(this)
      }
      // #endif
    },
    initBeforeUnloadGuard() {
      // #ifdef H5
      if (this._beforeUnloadHandler) return
      this._beforeUnloadHandler = (event) => {
        if (!this.isGenerating) return undefined
        const message = '当前提分对话正在进行中，刷新页面会中断本次操作，是否仍要离开？'
        event.preventDefault()
        event.returnValue = message
        return message
      }
      window.addEventListener('beforeunload', this._beforeUnloadHandler)
      // #endif
    },
    removeBeforeUnloadGuard() {
      // #ifdef H5
      if (!this._beforeUnloadHandler) return
      window.removeEventListener('beforeunload', this._beforeUnloadHandler)
      this._beforeUnloadHandler = null
      // #endif
    },
    updateViewportMode() {
      const { windowWidth = 0 } = uni.getSystemInfoSync()
      this.isDesktop = windowWidth >= 640
      this.adjustComposerHeight()
    },
    syncDarkMode() {
      const cache = uni.getStorageSync('personal-dark-mode')
      if (cache !== '') {
        this.isDarkMode = cache
      }
      this.applyDarkModeBody()
    },
    handleDarkModeChanged(isDark) {
      this.isDarkMode = isDark
      this.applyDarkModeBody()
    },
    applyDarkModeBody() {
      // #ifdef H5
      if (this.isDarkMode) {
        document.body.style.backgroundColor = '#1e1e20'
        document.body.style.backgroundImage = 'none'
        document.body.classList.add('is-dark-mode')
      } else {
        document.body.style.backgroundColor = '#f1f5f9'
        document.body.style.backgroundImage = ''
        document.body.classList.remove('is-dark-mode')
      }
      // #endif

      if (this.isDarkMode) {
        uni.setNavigationBarColor({
          frontColor: '#ffffff',
          backgroundColor: '#1e1e20',
          animation: { duration: 200, timingFunc: 'easeIn' }
        })
      } else {
        uni.setNavigationBarColor({
          frontColor: '#000000',
          backgroundColor: '#ffffff',
          animation: { duration: 200, timingFunc: 'easeIn' }
        })
      }
    },
    getSelectValue(event) {
      return Number((event && event.detail && event.detail.value) || (event && event.target && event.target.value) || 0)
    },
    openExamSelector() {
      if (this.isGenerating) {
        uni.showToast({ title: '对话进行中，暂时无法切换真题年份', icon: 'none' })
        return
      }
      this.examSearchKeyword = ''
      this.showExamSelector = true
      this.activeExamScrollTarget = ''
      if (!this.isDesktop) {
        this.initExamSelectorPopstateGuard()
      }
      this.$nextTick(() => {
        this.activeExamScrollTarget = this.getExamScrollAnchorId()
      })
    },
    closeExamSelector(options = {}) {
      this.showExamSelector = false
      this.examSearchKeyword = ''
      this.activeExamScrollTarget = ''
      this.removeExamSelectorPopstateGuard({ resumeTabGuard: options.resumeTabGuard !== false })
    },
    clearExamSearch() {
      this.examSearchKeyword = ''
    },
    selectExamFromPanel(index) {
      this.changeExamByIndex(index)
      this.closeExamSelector()
    },
    changeExamByIndex(index) {
      if (!this.exams[index]) return
      this.selectedExamIndex = index
      this.selectedQuestionIndex = 0
      this.historyPage = 1
      this.selectedHistoryTask = null
    },
    getExamYearLabel(examYear) {
      if (Number(examYear) === 0) return '模拟卷'
      return examYear || '其他'
    },
    getExamScrollAnchorId() {
      const selectedPosition = this.examOptions.findIndex((option) => option.index === this.selectedExamIndex)
      if (selectedPosition <= 4) return 'improve-exam-list-top'
      const anchorPosition = Math.max(0, selectedPosition - 4)
      const anchorIndex = this.examOptions[anchorPosition]?.index ?? this.selectedExamIndex
      return `improve-exam-option-${anchorIndex}`
    },
    getModeByContext(context = {}) {
      if (context.mode === 'national' || context.province === 'gk') return 'national'
      return 'guangdong'
    },
    async loadPageConfig() {
      const [parameters, webappConfig] = await Promise.all([
        getAppParameters(IMPROVE_DIFY_APP_ID, this.activeProvince),
        getWebappConfig(IMPROVE_DIFY_APP_ID)
      ])
      this.exams = Array.isArray(parameters) ? parameters : []
      this.appConfig = webappConfig || {}
      this.selectedExamIndex = 0
      this.selectedQuestionIndex = 0
    },
    async loadInitialData() {
      try {
        const [, conversations, workflowPage] = await Promise.all([
          this.loadPageConfig(),
          getConversations(),
          getWorkflowPage({
            workflowRunStatusType: 2,
            currentPageNum: this.historyPage,
            pageSize: this.historyPageSize
          })
        ])
        this.loadUserInfo()
        this.conversations = conversations && conversations.data ? conversations.data : []
        this.conversationHasMore = conversations && conversations.hasMore === true
        this.conversationLastId = this.conversations.length > 0 ? this.conversations[this.conversations.length - 1].id : null
        this.applyWorkflowPage(workflowPage)
        if (this.scoreContext) {
          await this.applyScoreContext(this.scoreContext)
        } else if (this.conversations.length) {
          await this.loadConversation(this.conversations[0])
        }
      } catch (error) {
        uni.showToast({ title: error.message || '数据加载失败', icon: 'none' })
      }
    },
    readScoreContext() {
      const context = uni.getStorageSync(SCORE_TO_IMPROVE_CONTEXT_KEY)
      if (!context || context.source !== 'score') return null
      uni.removeStorageSync(`${SCORE_TO_IMPROVE_CONTEXT_KEY}_pending`)
      return context
    },
    async applyPendingScoreContext() {
      if (!uni.getStorageSync(`${SCORE_TO_IMPROVE_CONTEXT_KEY}_pending`)) return
      const context = this.readScoreContext()
      if (!context) return
      this.scoreContext = context
      await this.applyScoreContext(context)
    },
    async changeMode(nextMode, options = {}) {
      const { preserveScoreContext = false } = options
      if (this.isGenerating) {
        uni.showToast({ title: '对话进行中，暂时无法切换模式', icon: 'none' })
        return
      }
      if (this.mode === nextMode) return
      this.mode = nextMode
      if (!preserveScoreContext) {
        this.scoreContext = null
        uni.removeStorageSync(SCORE_TO_IMPROVE_CONTEXT_KEY)
      }
      this.selectedHistoryTask = null
      this.workflowTasks = []
      this.historyPage = 1
      await this.loadPageConfig()
    },
    onExamChange(event) {
      this.changeExamByIndex(this.getSelectValue(event))
    },
    onQuestionChange(event) {
      this.selectedQuestionIndex = this.getSelectValue(event)
      this.historyPage = 1
      this.selectedHistoryTask = null
    },
    onModelChange(event) {
      this.selectedModelIndex = this.getSelectValue(event)
    },
    onComposerInput(event) {
      const element = this.getComposerElement()
      let value = element ? element.innerText : (event && event.detail ? event.detail.value : this.inputText)
      value = String(value || '').replace(/\r\n/g, '\n')

      if (value.length > 2000) {
        value = value.slice(0, 2000)
        this.setComposerText(value)
      }
      this.inputText = value
      this.adjustComposerHeight()
    },
    getComposerElement() {
      const ref = this.$refs.composerInput
      return (ref && ref.$el) || ref || null
    },
    setComposerText(value) {
      const element = this.getComposerElement()
      if (!element) return
      element.innerText = value
      this.placeComposerCaretAtEnd(element)
    },
    clearComposerText() {
      const element = this.getComposerElement()
      if (element) element.innerText = ''
      this.inputText = ''
      this.adjustComposerHeight()
    },
    placeComposerCaretAtEnd(element) {
      // #ifdef H5
      if (!window.getSelection || !document.createRange) return
      const range = document.createRange()
      range.selectNodeContents(element)
      range.collapse(false)
      const selection = window.getSelection()
      selection.removeAllRanges()
      selection.addRange(range)
      // #endif
    },
    adjustComposerHeight() {
      // #ifdef H5
      this.$nextTick(() => {
        const element = this.getComposerElement()
        if (!element || !element.style) return
        const minHeight = this.isDesktop ? DESKTOP_COMPOSER_MIN_HEIGHT : MOBILE_COMPOSER_MIN_HEIGHT
        const maxHeight = this.isDesktop ? DESKTOP_COMPOSER_MAX_HEIGHT : MOBILE_COMPOSER_MAX_HEIGHT
        element.style.height = `${minHeight}px`
        const nextHeight = Math.min(Math.max(element.scrollHeight, minHeight), maxHeight)
        element.style.height = `${nextHeight}px`
        element.style.overflowY = element.scrollHeight > maxHeight ? 'auto' : 'hidden'
      })
      // #endif
    },
    handleComposerKeydown(event) {
      const isEnter = event.key === 'Enter' || event.key === 'NumpadEnter' || event.keyCode === 13
      if (!isEnter) return

      if (event.shiftKey) {
        setTimeout(() => {
          this.onComposerInput()
          this.adjustComposerHeight()
        }, 0)
        return
      }

      event.preventDefault()
      this.sendMessage()
    },
    handleComposerPaste(event) {
      // #ifdef H5
      event.preventDefault()
      const text = (event.clipboardData || window.clipboardData).getData('text')
      const nextText = `${this.inputText}${text}`.slice(0, 2000)
      this.inputText = nextText
      this.setComposerText(nextText)
      this.adjustComposerHeight()
      // #endif
    },
    bindComposerNativeKeydown() {
      this.adjustComposerHeight()
    },
    unbindComposerNativeKeydown() {
      // contenteditable composer uses Vue events directly.
    },
    formatConversationTime(value) {
      return formatTime(value)
    },
    async loadUserInfo() {
      try {
        this.userInfo = await getUserInfo()
        this.userAvatarLoadFailed = false
      } catch (error) {
        this.userInfo = {}
        this.userAvatarLoadFailed = true
      }
    },
    applyWorkflowPage(page = {}) {
      this.historyPage = 1
      const dataList = Array.isArray(page.dataList) ? page.dataList : []
      this.workflowTasks = dataList.map((task) => ({
        ...task,
        hasParentCode: Boolean(task.parentCode || task.parent_code),
        parsedTags: task.parsedTags || this.parseWorkflowTags(task.workflowTags)
      }))
      this.historyPage = Math.max(1, Number(page.currentPageNum) || this.historyPage || 1)
      this.historyPageSize = Math.max(1, Number(page.pageSize) || this.historyPageSize || 10)
      const totalCount = Math.max(0, Number(page.pageCount) || 0)
      const pageSize = Math.max(1, Number(page.pageSize) || this.historyPageSize || 10)
      this.historyPageCount = Math.max(1, Math.ceil(totalCount / pageSize))
      this.historyTotal = Number(page.pageCount)
    },
    parseWorkflowTags(tags) {
      if (!tags) return {}
      if (typeof tags === 'object') return tags
      try {
        return JSON.parse(tags)
      } catch (error) {
        return {}
      }
    },
    getHistoryTaskCode(task = {}) {
      const code = task.taskNo || task.taskNum || task.task_num || task.taskCode || task.task_code || task.task_id || task.id
      if (!code) return 'TASK--'
      const text = String(code)
      if (text.startsWith('TASK-')) return text
      if (/^\d+$/.test(text)) return `TASK-${text.padStart(3, '0')}`
      if (/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(text)) return 'TASK--'
      return `TASK-${text}`
    },
    getHistoryTaskTitle(task = {}) {
      return task.workflowTitle || task.task_title || task.title || '未命名评分任务'
    },
    getHistoryTaskTime(task = {}) {
      return this.formatConversationTime(task.updateTimestamp || task.insertTimestamp || task.date || task.createdAt)
    },
    getHistoryTaskScore(task = {}) {
      const tags = task.parsedTags || this.parseWorkflowTags(task.workflowTags)
      const score = tags.result_total_score || tags.aiScore || task.resultTotalScore || task.aiScore || task.score
      if (score === undefined || score === null || score === '') return '--'
      return String(score).includes('分') ? String(score) : `${score}分`
    },
    hasHistoryTaskParent(task = {}) {
      return Boolean(task.hasParentCode || task.parentCode || task.parent_code)
    },
    getHistoryTaskTags(task = {}) {
      const tags = task.parsedTags || this.parseWorkflowTags(task.workflowTags)
      const title = tags.title || task.answerTitle || task.answer_title
      const items = []
      if (this.hasHistoryTaskParent(task)) {
        items.push('套批')
      }
      if (title) {
        items.push(`《${title}》`)
      }
      return items
    },
    getHistoryTaskWorkflowRunId(task = {}) {
      return task.workflowRunId ||
        task.workflow_run_id ||
        task.workflowId ||
        task.workflow_id ||
        task.userDifyWorkrunRecordId ||
        task.user_dify_workrun_record_id ||
        ''
    },
    getWorkflowPageTotal(page = {}) {
      const explicitTotal = page.total || page.totalCount || page.recordCount || page.totalRecord || page.totalRecords
      if (Number.isFinite(Number(explicitTotal))) return Number(explicitTotal)

      if (this.historyPageCount <= 1) return this.workflowTasks.length
      if (this.historyPage < this.historyPageCount) return this.historyPageCount * this.historyPageSize
      return (this.historyPageCount - 1) * this.historyPageSize + this.workflowTasks.length
    },
    async loadWorkflowTasks(page = this.historyPage) {
      if (this.historyLoading) return
      this.historyLoading = true
      try {
        const workflowPage = await getWorkflowPage({
          workflowRunStatusType: 2,
          currentPageNum: page,
          querySingleScore: 0,
          pageSize: this.historyPageSize,
          examYear: this.scoreContext?.examYear || this.selectedExamName,
          questionType: this.scoreContext?.question || this.selectedQuestionName
        })
        this.applyWorkflowPage(workflowPage)
      } catch (error) {
        uni.showToast({ title: error.message || '历史任务加载失败', icon: 'none' })
      } finally {
        this.historyLoading = false
      }
    },
    openHistoryModal() {
      this.showHistory = true
      this.loadWorkflowTasks(this.historyPage)
    },
    changeHistoryPage(page) {
      const nextPage = Math.min(Math.max(1, page), this.historyPageCount)
      if (nextPage === this.historyPage || this.historyLoading) return
      this.loadWorkflowTasks(nextPage)
    },
    selectHistoryTask(task) {
      this.selectedHistoryTask = task
      this.showHistory = false
    },
    toggleConversationMenu(id) {
      if (this.isGenerating) return
      this.activeConversationMenuId = this.activeConversationMenuId === id ? '' : id
    },
    renameConversationItem(item) {
      this.activeConversationMenuId = ''
      this.renameTarget = item
      this.renameName = item.name || '未命名对话'
      this.showRenameModal = true
    },
    closeRenameModal() {
      if (this.renameSaving) return
      this.showRenameModal = false
      this.renameTarget = null
      this.renameName = ''
    },
    async submitRename() {
      const nextName = this.renameName.trim()
      if (!this.renameTarget || !nextName || this.renameSaving) return

      this.renameSaving = true
      try {
        await renameConversation({
          conversationId: this.renameTarget.id,
          name: nextName,
          autoGenerate: false
        })
        this.renameTarget.name = nextName
        this.showRenameModal = false
        this.renameTarget = null
        this.renameName = ''
      } catch (error) {
        uni.showToast({ title: error.message || '重命名失败', icon: 'none' })
      } finally {
        this.renameSaving = false
      }
    },
    resetChat() {
      this.abortController && this.abortController.abort()
      this.scoreContext = null
      uni.removeStorageSync(SCORE_TO_IMPROVE_CONTEXT_KEY)
      this.conversationId = ''
      this.taskId = ''
      this.hasStartedChat = false
      this.messages = []
      this.inputText = ''
      this.isGenerating = false
    },
    resetMobileChat() {
      if (this.isGenerating) return
      this.resetChat()
      this.showMobileConversationDrawer = false
    },
    selectConversation(item) {
      if (this.isGenerating) return
      this.showMobileConversationDrawer = false
      this.loadConversation(item)
    },
    startChat() {
      if (!this.canStart) return
      this.hasStartedChat = true
      this.messages = [
        this.createOpeningMessage()
      ]
      this.autoStickMessages = true
      this.syncMessagesViewHeight()
      this.bindComposerNativeKeydown()
      this.scrollToBottom()
    },
    getOpeningStatement() {
      return this.appConfig.openingStatement || '材料都准备好了？我是Go老师，请告诉我你想让我帮你做什么。'
    },
    createOpeningMessage() {
      return {
        role: 'assistant',
        content: this.getOpeningStatement(),
        buttons: this.suggestedQuestions,
        createdAt: Date.now(),
        isOpening: true
      }
    },
    shouldAppendOpeningMessage(messages = [], response = {}) {
      if (response.has_more || response.hasMore) return false
      const openingStatement = this.getOpeningStatement().trim()
      if (!openingStatement) return false
      return !messages.some((message) => {
        return message.role === 'assistant' && String(message.content || '').trim() === openingStatement
      })
    },
    buildInputParam() {
      const historyTask = this.selectedHistoryTask || {}
      return {
        province: this.activeProvince,
        exam_year: this.selectedExamName,
        question: this.selectedQuestionName,
        model_select: this.selectedModel,
        task_num: this.getHistoryTaskWorkflowRunId(historyTask),
        task_id: historyTask.id || historyTask.task_id || '',
        task_title: historyTask.workflowTitle || historyTask.task_title || '',
        exam_id: normalizeExamId(this.selectedExam),
        question_id: normalizeQuestionId(this.selectedQuestion),
        answer_title: this.scoreContext?.title || '',
        answer_content: this.scoreContext?.answer || '',
        score_report: this.scoreContext?.scoreReport || '',
        score_task_id: this.scoreContext?.scoreTaskId || '',
        score_task_num: this.scoreContext?.scoreTaskNum || this.scoreContext?.scoreTaskCode || ''
      }
    },
    async applyScoreContext(context) {
      this.abortController && this.abortController.abort()
      this.scoreContext = context
      if (this.mode !== this.getModeByContext(context)) {
        await this.changeMode(this.getModeByContext(context), { preserveScoreContext: true })
      }
      this.conversationId = ''
      this.taskId = ''
      this.isGenerating = false
      this.activeConversationMenuId = ''
      uni.removeStorageSync(SCORE_TO_IMPROVE_CONTEXT_KEY)

      this.syncSelectionFromInputParam({
        exam_year: context.examYear,
        question: context.question,
        exam_id: context.examId,
        question_id: context.questionId
      })

      const matchedTask = await this.getScoreContextHistoryTask(context)

      this.selectedHistoryTask = matchedTask || this.createScoreContextHistoryTask(context)

      this.hasStartedChat = false
      this.messages = []
      this.inputText = ''
      this.bindComposerNativeKeydown()
      this.clearComposerText()
    },
    async getScoreContextHistoryTask(context) {
      const workflowRunId = context.workflowRunId || context.workflow_run_id || ''
      const recordId = context.userDifyWorkrunRecordId || context.user_dify_workrun_record_id || ''
      const scoreTaskId = context.scoreTaskId || context.taskId || ''
      const lookupId = recordId || workflowRunId || scoreTaskId
      if (!lookupId) return null

      const localTask = this.workflowTasks.find((task) => {
        const candidates = [
          task.workflowRunId,
          task.workflow_run_id,
          task.userDifyWorkrunRecordId,
          task.user_dify_workrun_record_id,
          task.task_id,
          task.id
        ].filter((value) => value !== undefined && value !== null && value !== '')
        return candidates.some((value) => [workflowRunId, recordId, scoreTaskId].filter(Boolean).some((target) => String(value) === String(target)))
      })
      if (localTask) return localTask

      try {
        const workflowPage = await getWorkflowPage({
          workflowRunStatusType: 2,
          userDifyWorkrunRecordId: lookupId,
          currentPageNum: 1,
          pageSize: 1
        })
        const dataList = workflowPage && Array.isArray(workflowPage.dataList) ? workflowPage.dataList : []
        return dataList[0] || null
      } catch (error) {
        uni.showToast({ title: error.message || '历史任务加载失败', icon: 'none' })
        return null
      }
    },
    createScoreContextHistoryTask(context = {}) {
      const taskCode = context.scoreTaskNum || context.scoreTaskCode || context.taskNum || context.taskCode
      const workflowRunId = context.workflowRunId || context.workflow_run_id || context.userDifyWorkrunRecordId || ''
      const taskId = context.scoreTaskId || workflowRunId || ''
      if (!taskCode && !taskId) return null

      return {
        id: taskId,
        task_id: taskId,
        task_num: taskCode,
        taskCode,
        workflowRunId,
        workflow_run_id: workflowRunId,
        workflowTitle: `${context.examYear || '本次评分'} - ${context.question || '当前问题'}`,
        task_title: `${context.examYear || '本次评分'} - ${context.question || '当前问题'}`,
        answerTitle: context.title || '',
        answer_title: context.title || '',
        updateTimestamp: context.createdAt || Date.now()
      }
    },
    parseMessageInputParam(message = {}) {
      const inputParam = message.inputParam || message.inputs || message.input_param || message.input
      if (!inputParam) return null
      if (typeof inputParam === 'string') {
        try {
          return JSON.parse(inputParam)
        } catch (error) {
          return null
        }
      }
      return inputParam
    },
    syncSelectionFromInputParam(inputParam = {}) {
      const examName = inputParam.exam_year || inputParam.examYear
      const questionName = inputParam.question
      const modelSelect = inputParam.model_select || inputParam.modelSelect
      const examId = inputParam.exam_id || inputParam.examId
      const questionId = inputParam.question_id || inputParam.questionId
      const taskId = inputParam.task_id || inputParam.taskId
      const taskTitle = inputParam.task_title || inputParam.taskTitle

      const examIndex = this.exams.findIndex((exam) => {
        if (examName && normalizeExamName(exam) === examName) return true
        return examId && String(normalizeExamId(exam)) === String(examId)
      })

      if (examIndex !== -1) {
        this.selectedExamIndex = examIndex
        const questionList = this.exams[examIndex].questionList || []
        const questionIndex = questionList.findIndex((question) => {
          if (questionName && question.name === questionName) return true
          return questionId && String(normalizeQuestionId(question)) === String(questionId)
        })
        this.selectedQuestionIndex = questionIndex !== -1 ? questionIndex : 0
      }

      const modelIndex = this.modelOptions.findIndex((item) => item === modelSelect)
      if (modelIndex !== -1) this.selectedModelIndex = modelIndex

      const historyTask = this.workflowTasks.find((task) => {
        if (taskId && String(task.id) === String(taskId)) return true
        return taskTitle && (task.workflowTitle || task.task_title) === taskTitle
      })
      this.selectedHistoryTask = historyTask || null
    },
    formatMessageTime(timestamp) {
      if (!timestamp) return ''
      const ts = String(timestamp).length <= 10 ? timestamp * 1000 : timestamp
      const d = new Date(ts)
      const yyyy = d.getFullYear()
      const MM = String(d.getMonth() + 1).padStart(2, '0')
      const dd = String(d.getDate()).padStart(2, '0')
      const hh = String(d.getHours()).padStart(2, '0')
      const mm = String(d.getMinutes()).padStart(2, '0')
      const ss = String(d.getSeconds()).padStart(2, '0')
      return `${yyyy}-${MM}-${dd} ${hh}:${mm}:${ss}`
    },
    sendQuickReply(text) {
      this.inputText = text
      this.sendMessage()
    },
    sendFormPayload(values) {
      const payload = JSON.stringify(values || {})
      this.sendMessage(payload)
    },
    handleChatEvent(event, assistantMessage) {
      if (!event) return
      if (event.task_id) this.taskId = event.task_id
      if (event.conversation_id) this.conversationId = event.conversation_id

      if (event.event === 'message' && event.answer) {
        assistantMessage.content += event.answer
      }

      if (event.event === 'message_end') {
        assistantMessage.isStreaming = false
        this.isGenerating = false
        this.loadConversationsSilently()
        this.autoStickMessages = true
      }

      if (event.event === 'error') {
        assistantMessage.content += `\n\n[请求失败] ${event.message || '请稍后重试'}`
        assistantMessage.isStreaming = false
        this.isGenerating = false
        this.autoStickMessages = true
      }

      this.scrollToBottom()
    },
    async sendMessage(messageText = '') {
      const externalText = ['string', 'number'].includes(typeof messageText)
        ? String(messageText)
        : ''
      const query = (externalText || this.inputText).trim()
      if (!query || this.isGenerating) return
      if (!this.hasStartedChat) this.startChat()
      this.autoStickMessages = true

      if (!externalText) this.clearComposerText()
      const assistantMessage = { role: 'assistant', content: '', isStreaming: true, createdAt: Date.now() }
      this.messages.push({ role: 'user', content: query, createdAt: Date.now() })
      this.messages.push(assistantMessage)
      this.isGenerating = true
      this.sessionId = ''
      this.abortController = new AbortController()
      this.scrollToBottom()

      try {
        await streamChatMessage({
          query,
          inputParam: this.buildInputParam(),
          usePoint: this.selectedModelPoint,
          conversationId: this.conversationId,
          signal: this.abortController.signal,
          onEvent: (event) => this.handleChatEvent(event, assistantMessage),
          onSessionCreated: (session) => {
            this.sessionId = (session && session.sessionId) || ''
          },
          onError: (error) => {
            throw error
          }
        })
      } catch (error) {
        if (error.name !== 'AbortError') {
          assistantMessage.content += `\n\n[请求失败] ${error.message || '请稍后重试'}`
          uni.showToast({ title: error.message || '发送失败', icon: 'none' })
        }
      } finally {
        assistantMessage.isStreaming = false
        this.isGenerating = false
        this.autoStickMessages = true
        this.scrollToBottom()
      }
    },
    async stopGenerating() {
      try {
        if (this.taskId) {
          await stopChat(this.taskId)
        }
      } catch (error) {
        uni.showToast({ title: error.message || '停止失败', icon: 'none' })
      } finally {
        this.abortController && this.abortController.abort()
        const last = this.messages[this.messages.length - 1]
        if (last && last.role === 'assistant') {
          if (last.content.includes('<think>') && !last.content.includes('</think>')) {
            last.content += '</think>'
          }
          last.content += '\n\n[对话已手动停止]'
          last.isStreaming = false
        }
        this.isGenerating = false
      }
    },
    async loadConversation(item) {
      try {
        this.activeConversationMenuId = ''
        const data = await getConversationMessages({
          conversationId: item.id,
          limit: 50
        })
        this.conversationId = item.id
        this.hasStartedChat = true
        const rows = data && data.data ? data.data : []
        this.messageHasMore = data && (data.hasMore === true || data.has_more === true)
        this.messageFirstId = rows.length > 0 ? rows[0].id : null
        const inputParam = rows.map((message) => this.parseMessageInputParam(message)).find(Boolean)
        if (inputParam) this.syncSelectionFromInputParam(inputParam)
        const messages = rows.flatMap((message) => {
          const result = []
          const ts = message.created_at || message.createdAt
          if (message.query) result.push({ role: 'user', content: message.query, isHistory: true, createdAt: ts })
          if (message.answer) result.push({ role: 'assistant', content: message.answer, isHistory: true, createdAt: ts })
          return result
        })
        this.messages = this.shouldAppendOpeningMessage(messages, data)
          ? [this.createOpeningMessage(), ...messages]
          : messages
        this.bindComposerNativeKeydown()
        this.scrollToBottom()
      } catch (error) {
        uni.showToast({ title: error.message || '会话加载失败', icon: 'none' })
      }
    },
    async loadMoreMessages() {
      if (!this.messageHasMore || this.messageLoadingMore) return
      this.messageLoadingMore = true
      const prevScrollHeight = await this.getMessageScrollHeight()
      try {
        const data = await getConversationMessages({
          conversationId: this.conversationId,
          limit: 50,
          firstId: this.messageFirstId
        })
        const rows = data && data.data ? data.data : []
        this.messageHasMore = data && (data.hasMore === true || data.has_more === true)
        if (rows.length > 0) {
          this.messageFirstId = rows[0].id
        }
        const olderMessages = rows.flatMap((message) => {
          const result = []
          const ts = message.created_at || message.createdAt
          if (message.query) result.push({ role: 'user', content: message.query, isHistory: true, createdAt: ts })
          if (message.answer) result.push({ role: 'assistant', content: message.answer, isHistory: true, createdAt: ts })
          return result
        })
        if (!this.messageHasMore && this.shouldAppendOpeningMessage(this.messages, {})) {
          olderMessages.unshift(this.createOpeningMessage())
        }
        this.messages = [...olderMessages, ...this.messages]
        this.$nextTick(() => {
          this.restoreScrollPositionAfterLoadMore(prevScrollHeight)
        })
      } catch (error) {
        console.warn('load more messages failed', error)
      } finally {
        this.messageLoadingMore = false
      }
    },
    getMessageScrollHeight() {
      return new Promise((resolve) => {
        const query = uni.createSelectorQuery().in(this)
        query.select('.messages').boundingClientRect()
        query.select('.messages').scrollOffset()
        query.exec((res) => {
          if (res && res[0] && res[1]) {
            resolve({ height: res[0].height, scrollTop: res[1].scrollTop })
          } else {
            resolve(null)
          }
        })
      })
    },
    restoreScrollPositionAfterLoadMore(prev) {
      if (!prev) return
      const query = uni.createSelectorQuery().in(this)
      query.select('.messages').boundingClientRect()
      query.select('.messages').scrollOffset()
      query.exec((res) => {
        if (res && res[0] && res[1]) {
          const heightDiff = res[0].height - prev.height
          this.scrollTop = res[1].scrollTop + heightDiff
        }
      })
    },
    async loadConversationsSilently() {
      try {
        const data = await getConversations()
        this.conversations = data && data.data ? data.data : []
        this.conversationHasMore = data && data.hasMore === true
        this.conversationLastId = this.conversations.length > 0 ? this.conversations[this.conversations.length - 1].id : null
      } catch (error) {
        console.warn('load conversations failed', error)
      }
    },
    async loadMoreConversations() {
      if (!this.conversationHasMore || this.conversationLoading) return
      this.conversationLoading = true
      try {
        const data = await getConversations({ lastId: this.conversationLastId })
        const list = data && data.data ? data.data : []
        this.conversations = this.conversations.concat(list)
        this.conversationHasMore = data && data.hasMore === true
        if (list.length > 0) {
          this.conversationLastId = list[list.length - 1].id
        }
      } catch (error) {
        console.warn('load more conversations failed', error)
      } finally {
        this.conversationLoading = false
      }
    },
    async removeConversation(item) {
      this.activeConversationMenuId = ''
      uni.showModal({
        title: '删除会话',
        content: `确认删除“${item.name || '未命名对话'}”？`,
        success: async (res) => {
          if (!res.confirm) return
          try {
            await deleteConversation(item.id)
            this.conversations = this.conversations.filter((conversation) => conversation.id !== item.id)
            if (this.conversationId === item.id) {
              const nextConversation = this.conversations[0]
              if (nextConversation) {
                await this.loadConversation(nextConversation)
              } else {
                this.resetChat()
              }
            }
          } catch (error) {
            uni.showToast({ title: error.message || '删除失败', icon: 'none' })
          }
        }
      })
    },
    scrollToBottom() {
      if (!this.autoStickMessages) return
      this.$nextTick(() => {
        this.scrollTop += 9999
      })
    },
    handleMessagesScroll() {
      this.checkAutoStick()
    },
    handleMessagesWheel() {
      clearTimeout(this._wheelCheckTimer)
      this._wheelCheckTimer = setTimeout(() => {
        this.checkAutoStick()
      }, 60)
    },
    checkAutoStick() {
      const query = uni.createSelectorQuery().in(this)
      query.select('.messages').scrollOffset()
      query.select('.messages').boundingClientRect()
      query.exec((res) => {
        if (!res || !res[0] || !res[1]) return
        const st = res[0].scrollTop
        const sh = res[0].scrollHeight
        const svh = res[1].height
        if (!sh || !svh) return
        this._messagesViewHeight = svh
        const isAtBottom = sh - st - svh <= 80
        const isScrollingUp = st < this._lastMessagesScrollTop
        if (isScrollingUp && !isAtBottom) {
          this.autoStickMessages = false
        } else if (isAtBottom) {
          this.autoStickMessages = true
        }
        this._lastMessagesScrollTop = st
      })
    },
    syncMessagesViewHeight() {
      const query = uni.createSelectorQuery().in(this)
      query.select('.messages').boundingClientRect()
      query.exec((res) => {
        if (res && res[0]) {
          this._messagesViewHeight = res[0].height
        }
      })
    },
    openBeianSite() {
      window.open('https://beian.miit.gov.cn/#/Integrated/index', '_blank')
    }
  }
}
</script>

<style scoped>
.improve-page {
  position: absolute;
  inset: 0;
  height: 100%;
  min-height: 100% !important;
  padding: 16px 16px 0;
  box-sizing: border-box;
  color: #1f2937;
  overflow: hidden;
}

.improve-layout {
  display: flex;
  gap: 16px;
  width: 100%;
  max-width: 1440px;
  height: 100%;
  margin: 0 auto;
  min-height: 0;
}

.mobile-chat-header,
.mobile-conversation-mask,
.mobile-drawer-close {
  display: none;
}

.conversation-panel,
.chat-panel {
  border: 1px solid #f3f4f6;
  border-radius: 16px;
  background: #ffffff;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
}

.conversation-panel {
  position: relative;
  display: flex;
  flex-direction: column;
  width: 320px;
  min-width: 280px;
  overflow: hidden;
}

.teacher-head {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
}

.avatar,
.message-avatar,
.start-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  /* background: linear-gradient(135deg, #155aef, #0d47a1); */
  font-weight: 900;
}

.avatar {
  width: 40px;
  height: 40px;
  border-radius: 999px;
  overflow: hidden;
  background: #ffdfbf;
}

.avatar-image {
  width: 100%;
  height: 100%;
  display: block;
}

.teacher-name {
  display: block;
  color: #111827;
  font-size: 16px;
  font-weight: 800;
}

.teacher-desc {
  display: block;
  width: 218px;
  margin-top: 4px;
  color: #98a2b3;
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.new-chat {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 40px;
  margin: 0 16px 16px;
  border: 1px solid rgba(21, 90, 239, 0.2);
  border-radius: 12px;
  background: #ffffff;
  color: #155aef;
  font-size: 14px;
  font-weight: 600;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.03);
}

.new-chat[disabled],
.conversation-item.disabled,
.conversation-item.disabled:hover {
  cursor: not-allowed;
  opacity: 0.45;
  background: transparent;
  color: #98a2b3;
}

.new-chat[disabled] {
  border-color: #e5e7eb;
  color: #98a2b3;
  box-shadow: none;
}

.conversation-item.disabled {
  pointer-events: auto;
}

.conversation-item.disabled .menu-trigger {
  pointer-events: none;
}

.icon-square-pen {
  position: relative;
  width: 16px;
  height: 16px;
}

.icon-square-pen::before {
  content: '';
  position: absolute;
  left: 1px;
  top: 5px;
  width: 9px;
  height: 9px;
  border: 2px solid currentColor;
  border-radius: 3px;
}

.icon-square-pen::after {
  content: '';
  position: absolute;
  right: 1px;
  top: 1px;
  width: 4px;
  height: 11px;
  border-radius: 2px;
  background: currentColor;
  transform: rotate(45deg);
}

.conversation-list {
  position: relative;
  flex: 1;
  height: 0;
  min-height: 0;
  padding: 0 8px 16px;
  box-sizing: border-box;
}

.conversation-bottom-spacer {
  height: 16px;
}

.conversation-item {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-height: 40px;
  padding: 10px 12px;
  margin-bottom: 2px;
  border-radius: 8px;
  cursor: pointer;
  color: #4b5563;
  font-size: 14px;
  transition: background-color 0.15s ease, color 0.15s ease;
}

.conversation-item.menu-open {
  z-index: 80;
}

.conversation-item.active,
.conversation-item:hover {
  color: #155aef;
  background: #eef2ff;
}

.conversation-menu-mask {
  position: absolute;
  inset: 0;
  z-index: 4;
  background: transparent;
}

.conversation-text {
  display: flex;
  flex: 1;
  min-width: 0;
  flex-direction: column;
  gap: 0;
}

.conversation-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.conversation-title-row {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.conversation-title {
  min-width: 0;
  color: inherit;
  font-size: 14px;
  font-weight: 500;
}

.conversation-item.active .conversation-title {
  font-weight: 600;
}

.conversation-action {
  position: relative;
  z-index: 20;
  flex: 0 0 auto;
}

.menu-trigger {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2px;
  width: 24px;
  height: 24px;
  padding: 0;
  border: 0;
  border-radius: 6px;
  background: transparent;
  opacity: 0;
  transition: opacity 0.15s ease, background-color 0.15s ease;
}

.conversation-item:hover .menu-trigger,
.menu-trigger.visible {
  opacity: 1;
}

.conversation-item.active .menu-trigger {
  background: #dbeafe;
}

.conversation-item.menu-open .conversation-action {
  z-index: 90;
}

.menu-trigger:hover,
.menu-trigger.visible {
  background: #e5e7eb;
}

.menu-trigger span {
  width: 3px;
  height: 3px;
  border-radius: 999px;
  background: #667085;
}

.conversation-menu {
  position: absolute;
  top: 30px;
  right: 0;
  z-index: 100;
  width: 128px;
  padding: 6px 0;
  border: 1px solid #f3f4f6;
  border-radius: 12px;
  background: #ffffff;
  box-shadow: 0 4px 20px rgba(15, 23, 42, 0.08);
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  height: 34px;
  padding: 0 14px;
  border: 0;
  border-radius: 0;
  background: transparent;
  color: #344054;
  font-size: 13px;
  font-weight: 500;
  text-align: left;
}

.menu-item:hover {
  background: #f8fafc;
}

.menu-item.danger {
  color: #e11d48;
}

.menu-item.danger:hover {
  background: #fff1f2;
}

.menu-icon {
  position: relative;
  flex: 0 0 14px;
  width: 14px;
  height: 14px;
  color: #98a2b3;
}

.menu-item.danger .menu-icon {
  color: #fb7185;
}

.menu-icon.edit::before {
  content: '';
  position: absolute;
  left: 2px;
  top: 8px;
  width: 10px;
  height: 4px;
  border: 2px solid currentColor;
  border-top: 0;
}

.menu-icon.edit::after {
  content: '';
  position: absolute;
  left: 7px;
  top: 1px;
  width: 3px;
  height: 9px;
  border-radius: 2px;
  background: currentColor;
  transform: rotate(45deg);
}

.menu-icon.trash::before {
  content: '';
  position: absolute;
  left: 3px;
  top: 5px;
  width: 8px;
  height: 8px;
  border: 2px solid currentColor;
  border-top: 0;
  border-radius: 0 0 2px 2px;
}

.menu-icon.trash::after {
  content: '';
  position: absolute;
  left: 2px;
  top: 2px;
  width: 10px;
  height: 2px;
  border-radius: 999px;
  background: currentColor;
}

.chat-panel {
  flex: 1;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}

.start-card {
  display: flex;
  align-items: center;
  justify-content: start;
  flex-direction: column;
  height: 100%;
  padding: 24px 24px 24px;
  box-sizing: border-box;
  overflow-y: auto;
  text-align: center;
}

.start-icon {
  width: 64px;
  height: 64px;
  margin-bottom: 16px;
  border-radius: 16px;
  font-size: 20px;
  box-shadow: 0 14px 32px rgba(21, 90, 239, 0.2);
  overflow: hidden;
}

.start-icon-img {
  width: 100%;
  height: 100%;
}

.start-title {
  color: #111827;
  font-size: 24px;
  font-weight: 900;
  letter-spacing: -0.02em;
}

.start-desc {
  max-width: 460px;
  margin-top: 8px;
  color: #667085;
  font-size: 14px;
  font-weight: 500;
  line-height: 1.55;
}

.config-card {
  width: 100%;
  max-width: 460px;
  margin-top: 28px;
  padding: 24px;
  box-sizing: border-box;
  border: 1px solid #f3f4f6;
  border-radius: 16px;
  background: #ffffff;
  box-shadow: 0 8px 30px rgba(15, 23, 42, 0.04);
  text-align: left;
}

.mode-tabs {
  display: flex;
  gap: 6px;
  padding: 5px;
  margin-bottom: 24px;
  border: 1px solid rgba(243, 244, 246, 0.5);
  border-radius: 12px;
  background: rgba(249, 250, 251, 0.8);
}

.mode {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  height: 36px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: #98a2b3;
  font-size: 13px;
  font-weight: 700;
  line-height: 1;
}

.mode.active {
  background: #ffffff;
  color: #155aef;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.04);
}

.mode.disabled {
  color: #c4cad4;
  cursor: not-allowed;
}

.field {
  margin-bottom: 20px;
}

.field-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
  color: #111827;
  font-size: 13px;
  font-weight: 800;
}

.field-head-left,
.field-head-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.tag,
.hint {
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(21, 90, 239, 0.08);
  color: #155aef;
  font-size: 11px;
  font-weight: 500;
}

.tag.orange {
  background: #fff7ed;
  color: #f97316;
}

.hint {
  background: #f3f4f6;
  color: #98a2b3;
}

.native-select-wrap,
.native-select,
.select-box,
.exam-select-trigger,
.history-selected {
  width: 100%;
  height: 40px;
  padding: 0 12px;
  box-sizing: border-box;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #ffffff;
  color: #1f2937;
  font-size: 13px;
  line-height: 40px;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.03);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.exam-select-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  cursor: pointer;
}

.exam-select-trigger-copy {
  display: flex;
  min-width: 0;
  flex: 1;
}

.exam-select-trigger-text {
  overflow: hidden;
  color: inherit;
  font-size: 13px;
  font-weight: 800;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.exam-select-trigger-arrow {
  flex: 0 0 auto;
  width: 6px;
  height: 6px;
  border-right: 1.5px solid #98a2b3;
  border-bottom: 1.5px solid #98a2b3;
  pointer-events: none;
  transform: translateY(-2px) rotate(45deg);
}

.selected-text-underline {
  font-weight: 800;
  text-decoration: underline;
  text-underline-offset: 3px;
  text-decoration-thickness: 1.5px;
}

.native-select-wrap {
  position: relative;
}

.native-select {
  position: absolute;
  inset: 0;
  height: 100%;
  appearance: none;
  outline: none;
  border: 0;
  border-radius: inherit;
  background: transparent;
  box-shadow: none;
  padding: 0 38px 0 12px;
}

.native-select-arrow {
  position: absolute;
  right: 14px;
  top: 50%;
  width: 6px;
  height: 6px;
  border-right: 1.5px solid #98a2b3;
  border-bottom: 1.5px solid #98a2b3;
  pointer-events: none;
  transform: translateY(-65%) rotate(45deg);
}

.exam-selector-mask {
  position: fixed;
  inset: 0;
  z-index: 999;
  display: flex;
  justify-content: flex-end;
  background: rgba(15, 23, 42, 0.38);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
}

.exam-selector-panel {
  display: flex;
  flex-direction: column;
  width: min(480px, 100vw);
  height: 100%;
  box-sizing: border-box;
  background: #ffffff;
  box-shadow: -18px 0 44px rgba(15, 23, 42, 0.16);
}

.exam-selector-panel.mobile {
  align-self: flex-end;
  width: 100%;
  height: 76vh;
  border-radius: 18px 18px 0 0;
  box-shadow: 0 -18px 44px rgba(15, 23, 42, 0.18);
}

.exam-selector-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex: 0 0 auto;
  padding: 18px 20px 14px;
  border-bottom: 1px solid #f3f4f6;
}

.exam-selector-title-group {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 4px;
}

.exam-selector-title {
  color: #111827;
  font-size: 18px;
  font-weight: 900;
  line-height: 1.25;
}

.exam-selector-subtitle {
  color: #98a2b3;
  font-size: 12px;
  font-weight: 700;
  line-height: 1.3;
}

.exam-selector-close,
.exam-search-clear {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  border-radius: 10px;
  color: #667085;
  cursor: pointer;
}

.exam-selector-close {
  width: 38px;
  height: 38px;
  background: #f9fafb;
}

.exam-search-box {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 0 0 auto;
  min-height: 46px;
  margin: 14px 20px;
  padding: 0 12px;
  box-sizing: border-box;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #f9fafb;
}

.exam-search-icon {
  flex: 0 0 auto;
  color: #98a2b3;
}

.exam-search-input {
  flex: 1;
  min-width: 0;
  height: 44px;
  border: 0;
  outline: none;
  background: transparent;
  color: #111827;
  font-size: 14px;
  font-weight: 700;
}

.exam-search-clear {
  width: 28px;
  height: 28px;
  background: #eef2f7;
}

.exam-selector-list {
  flex: 1;
  min-height: 0;
  padding: 0 20px 20px;
  box-sizing: border-box;
}

.exam-list-top-anchor {
  height: 1px;
}

.exam-groups {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.exam-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.exam-group-title {
  position: sticky;
  top: 0;
  z-index: 1;
  padding: 6px 0;
  background: #ffffff;
  color: #155aef;
  font-size: 13px;
  font-weight: 900;
  line-height: 1.25;
}

.exam-option {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 64px;
  padding: 12px;
  box-sizing: border-box;
  border: 1px solid #f3f4f6;
  border-radius: 12px;
  background: #ffffff;
  cursor: pointer;
  transition: background-color 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
}

.exam-option.active {
  border-color: rgba(21, 90, 239, 0.32);
  background: rgba(21, 90, 239, 0.06);
  box-shadow: 0 8px 18px rgba(21, 90, 239, 0.08);
}

.exam-option.active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 12px;
  bottom: 12px;
  width: 3px;
  border-radius: 0 999px 999px 0;
  background: #155aef;
}

.exam-option-main {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 5px;
}

.exam-option-name {
  color: #111827;
  font-size: 14px;
  font-weight: 800;
  line-height: 1.45;
}

.exam-option-meta {
  color: #98a2b3;
  font-size: 12px;
  font-weight: 700;
  line-height: 1.25;
}

.exam-option-check {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  width: 26px;
  height: 26px;
  border-radius: 999px;
  background: #155aef;
  color: #ffffff;
}

.exam-option:not(.active) .exam-option-check {
  background: transparent;
}

.exam-empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 220px;
  gap: 8px;
  color: #98a2b3;
  text-align: center;
}

.exam-empty-title {
  color: #667085;
  font-size: 15px;
  font-weight: 900;
}

.exam-empty-desc {
  color: #98a2b3;
  font-size: 13px;
  font-weight: 600;
}

.placeholder {
  color: #98a2b3;
}

.history-row {
  display: flex;
  gap: 10px;
}

.history-selected {
  flex: 1;
  min-width: 0;
}

.selected-history-content {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  height: 100%;
}

.selected-history-code {
  flex: 0 0 auto;
  max-width: 112px;
}

.selected-history-title {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  color: #1f2937;
  font-size: 13px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.selected-history-tag {
  flex: 0 0 auto;
}

.small-btn {
  height: 40px;
  padding: 0 16px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #ffffff;
  color: #374151;
  font-size: 13px;
  font-weight: 800;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.03);
}

.small-btn.ghost {
  background: #f3f4f6;
  color: #667085;
}

.start-btn {
  width: 100%;
  height: 44px;
  margin-top: 4px;
  border: 0;
  border-radius: 12px;
  background: #155aef;
  color: #ffffff;
  font-size: 14px;
  font-weight: 800;
  box-shadow: 0 8px 18px rgba(21, 90, 239, 0.2);
}

.start-btn[disabled] {
  opacity: 0.45;
}

.chat-shell {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.messages {
  flex: 1;
  height: 0;
  min-height: 0;
  padding: 15px;
  box-sizing: border-box;
}

.message-row {
  display: flex;
  gap: 16px;
  margin-bottom: 24px;
}

.message-row.user {
  flex-direction: row-reverse;
}

.message-avatar {
  flex: 0 0 48px;
  width: 48px;
  height: 48px;
  border-radius: 999px;
  overflow: hidden;
  font-size: 14px;
}

.message-row.user .message-avatar {
  background: #111827;
}

.message-avatar.assistant {
  background: #ffdfbf;
}

.message-bubble {
  box-sizing: border-box;
  min-width: 0;
  max-width: 90%;
  padding: 10px 10px;
  border-radius: 16px;
  background: #f8f9fa;
  color: #1f2937;
  font-size: 15px;
  line-height: 1.7;
}

.message-row.user .message-bubble {
  background: #eef2ff;
  border-top-right-radius: 4px;
}

.message-row:not(.user) .message-bubble {
  flex: 0 1 auto;
  max-width: 88%;
  min-width: 0;
  border-top-left-radius: 4px;
}

.message-time {
  margin-top: 8px;
  font-size: 11px;
  color: #9ca3af;
}

.messages-bottom-spacer {
  height: 24px;
}

.streaming-dot {
  display: inline-block;
  width: 6px;
  height: 18px;
  margin-left: 4px;
  border-radius: 999px;
  background: #98a2b3;
  animation: pulse 1s infinite;
}

.quick-replies {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-start;
  gap: 8px;
  margin-top: 16px;
}

.quick-btn {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  width: auto;
  min-width: 0;
  height: 34px;
  margin: 0;
  padding: 0 12px;
  border: 1px solid #dbe4ff;
  border-radius: 999px;
  background: #f4f7ff;
  color: #155aef;
  font-size: 12px;
  font-weight: 700;
  line-height: 34px;
}

.composer {
  position: relative;
  padding: 16px 24px 24px;
  background: #ffffff;
}

.composer-inner {
  display: flex;
  align-items: flex-end;
  gap: 12px;
  max-width: 896px;
  margin: 0 auto;
  padding: 8px 8px 8px 16px;
  border-radius: 16px;
  background: #f8f9fa;
  transition: box-shadow 0.15s ease;
}

.composer-inner:focus-within {
  box-shadow: 0 0 0 2px rgba(21, 90, 239, 0.16);
}

.composer-input-wrap {
  position: relative;
  flex: 1;
  min-width: 0;
}

.composer-input {
  position: relative;
  z-index: 1;
  width: 100%;
  height: 44px;
  min-height: 44px;
  max-height: 164px;
  padding: 10px 0;
  box-sizing: border-box;
  border: 0;
  background: transparent;
  color: #1f2937;
  font-size: 15px;
  line-height: 24px;
  outline: none;
  overflow-y: auto;
  white-space: pre-wrap;
  word-break: break-word;
}

.composer-placeholder {
  position: absolute;
  left: 0;
  top: 10px;
  z-index: 0;
  color: #98a2b3;
  font-size: 15px;
  line-height: 24px;
  pointer-events: none;
}

.composer-input.disabled {
  opacity: 0.55;
  pointer-events: none;
}

.send-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 36px;
  width: 36px;
  height: 36px;
  min-width: 36px;
  min-height: 36px;
  padding: 0;
  margin-bottom: 4px;
  border: 0;
  border-radius: 999px;
  background: #155aef;
  color: #ffffff;
  font-size: 0;
  line-height: 1;
  box-shadow: 0 8px 18px rgba(21, 90, 239, 0.2);
}

.send-btn::after {
  border: 0;
}

.send-btn[disabled] {
  background: #e5e7eb;
  box-shadow: none;
}

.send-btn.is-loading {
  background: #155aef;
  box-shadow: 0 8px 18px rgba(21, 90, 239, 0.2);
}

.send-icon {
  display: block;
  color: currentColor;
}

.send-icon-arrow {
  padding: 4px 2px 1px 1px;
}

.icon-spin {
  animation: spin 0.8s linear infinite;
}

.stop-floating {
  position: absolute;
  left: 50%;
  top: -36px;
  z-index: 8;
  transform: translateX(-50%);
}

.stop-pill {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 36px;
  padding: 0 16px;
  border: 1px solid #e5e7eb;
  border-radius: 999px;
  background: #ffffff;
  color: #4b5563;
  font-size: 14px;
  font-weight: 500;
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.1);
}

.icon-stop-mini {
  width: 12px;
  height: 12px;
  border-radius: 3px;
  background: #6b7280;
}

.modal-mask {
  position: fixed;
  inset: 0;
  z-index: 2147483000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  box-sizing: border-box;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
}

.history-modal {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  width: min(568px, 100%);
  max-height: 80vh;
  padding: 0;
  box-sizing: border-box;
  border-radius: 20px;
  background: #ffffff;
  box-shadow: 0 24px 70px rgba(15, 23, 42, 0.22);
}

.rename-modal {
  position: relative;
  z-index: 1;
  width: min(384px, 100%);
  padding: 24px;
  box-sizing: border-box;
  border-radius: 16px;
  background: #ffffff;
  box-shadow: 0 20px 60px rgba(15, 23, 42, 0.2);
}

.rename-head {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 18px;
}

.rename-icon {
  position: relative;
  display: flex;
  flex: 0 0 42px;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  border-radius: 999px;
  background: #eef2ff;
  color: #155aef;
}

.rename-pencil {
  position: relative;
  width: 18px;
  height: 18px;
}

.rename-pencil::before {
  content: '';
  position: absolute;
  left: 3px;
  top: 11px;
  width: 11px;
  height: 4px;
  border: 2px solid currentColor;
  border-top: 0;
  border-radius: 0 0 2px 2px;
}

.rename-pencil::after {
  content: '';
  position: absolute;
  left: 9px;
  top: 2px;
  width: 4px;
  height: 12px;
  border-radius: 2px;
  background: currentColor;
  transform: rotate(45deg);
}

.rename-title {
  display: block;
  color: #111827;
  font-size: 17px;
  font-weight: 900;
}

.rename-subtitle {
  display: block;
  margin-top: 5px;
  color: #667085;
  font-size: 13px;
  line-height: 1.5;
}

.rename-input {
  width: 100%;
  height: 44px;
  padding: 0 14px;
  box-sizing: border-box;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #ffffff;
  color: #111827;
  font-size: 14px;
  font-weight: 600;
  outline: none;
}

.rename-input:focus {
  border-color: #155aef;
  box-shadow: 0 0 0 4px rgba(21, 90, 239, 0.06);
}

.rename-actions {
  display: flex;
  gap: 12px;
  margin-top: 22px;
}

.rename-btn {
  flex: 1;
  height: 40px;
  border: 0;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 800;
}

.rename-btn.cancel {
  border: 1px solid #e5e7eb;
  background: #ffffff;
  color: #667085;
}

.rename-btn.confirm {
  background: #155aef;
  color: #ffffff;
  box-shadow: 0 8px 18px rgba(21, 90, 239, 0.2);
}

.rename-btn[disabled] {
  opacity: 0.45;
}

.modal-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
  margin-bottom: 0;
  padding: 18px 24px;
  border-bottom: 1px solid #eef0f3;
  background: rgba(249, 250, 251, 0.5);
  color: #111827;
  font-size: 16px;
  font-weight: 900;
}

.modal-close-btn {
  width: 40px;
  height: 32px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: #98a2b3;
  font-size: 0;
  position: relative;
  cursor: pointer;
}

.modal-close-btn::before,
.modal-close-btn::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 16px;
  height: 2px;
  border-radius: 999px;
  background: currentColor;
  transform-origin: center;
}

.modal-close-btn::before {
  transform: translate(-50%, -50%) rotate(45deg);
}

.modal-close-btn::after {
  transform: translate(-50%, -50%) rotate(-45deg);
}

.history-select-tip {
  display: flex;
  align-items: center;
  padding: 12px 24px 0;
  color: #155aef;
}

.history-select-tip-text {
  display: block;
  width: 100%;
  padding: 10px 12px;
  box-sizing: border-box;
  border-radius: 12px;
  background: rgba(21, 90, 239, 0.08);
  font-size: 12px;
  line-height: 1.5;
  font-weight: 600;
}

.history-list {
  flex: 1;
  max-height: 58vh;
  padding: 12px;
  margin-bottom: 5px;
  box-sizing: border-box;
}

.history-pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-shrink: 0;
  z-index: 1;
  padding: 16px 24px;
  border-top: 1px solid #f3f4f6;
  background: rgba(249, 250, 251, 0.5);
}

.history-page-controls {
  display: flex;
  align-items: center;
  gap: 12px;
}

.history-total {
  color: #667085;
  font-size: 12px;
}

.page-btn {
  min-width: 76px;
  height: 36px;
  padding: 0 14px;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  background: #ffffff;
  color: #475467;
  font-size: 13px;
  font-weight: 500;
}

.page-btn[disabled] {
  color: #98a2b3;
  opacity: 0.55;
}

.page-info {
  color: #667085;
  font-size: 13px;
  font-weight: 800;
}

.history-item {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px 18px;
  margin-bottom: 12px;
  border: 1px solid #f3f4f6;
  border-radius: 14px;
  background: #ffffff;
  cursor: pointer;
  transition: border-color 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease;
}

.history-item:hover {
  border-color: rgba(21, 90, 239, 0.3);
  background: rgba(239, 246, 255, 0.3);
  box-shadow: 0 8px 18px rgba(21, 90, 239, 0.05);
}

.history-item-top,
.history-item-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.history-task-code {
  max-width: 48%;
  padding: 3px 10px;
  border-radius: 6px;
  background: rgba(21, 90, 239, 0.08);
  color: #155aef;
  font-size: 12px;
  font-weight: 500;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.history-task-time {
  flex: 0 0 auto;
  color: #98a2b3;
  font-size: 12px;
  line-height: 1.4;
}

.history-title {
  color: #111827;
  font-size: 15px;
  font-weight: 900;
  line-height: 1.45;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  line-clamp: 2;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.history-tags {
  display: flex;
  min-width: 0;
  gap: 6px;
  overflow: hidden;
}

.history-tag {
  max-width: 190px;
  padding: 3px 8px;
  border-radius: 5px;
  background: #f3f4f6;
  color: #667085;
  font-size: 11px;
  line-height: 1.35;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.history-score {
  flex: 0 0 auto;
  color: #f97316;
  font-size: 18px;
  font-weight: 900;
  line-height: 1.2;
}

.empty-list {
  padding: 18px;
  text-align: center;
  color: #98a2b3;
  font-size: 12px;
}

.loading-indicator {
  padding: 16px;
  text-align: center;
  color: #155aef;
  font-size: 13px;
  font-weight: 600;
}

.bottom-text {
  position: fixed;
  bottom: 0;
  left: 50%;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  max-width: 1920px;
  padding: 8px 24px;
  box-sizing: border-box;
  border-top: 1px solid rgba(21, 90, 239, 0.12);
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.92) 0%, rgba(240, 245, 255, 0.92) 100%);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  transform: translateX(-50%);
}

.bottom-desc {
  color: #c8d4e8;
  font-size: 11px;
  font-weight: bold;
  line-height: 1.5;
  text-align: center;
  letter-spacing: 0.2px;
  white-space: nowrap;
}

.beian-link {
  margin-left: 8rpx;
  text-decoration: underline;
}

@keyframes pulse {
  0%, 100% {
    opacity: 0.35;
  }
  50% {
    opacity: 1;
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.improve-page.dark-mode {
  color: #e5e5e5;
}

.improve-page.dark-mode .start-card {
  color: #e5e5e5;
}

.improve-page.dark-mode .conversation-panel,
.improve-page.dark-mode .chat-panel {
  background: #1e1e20;
  border-color: #3f3f46;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.improve-page.dark-mode .teacher-name {
  color: #e5e5e5;
}

.improve-page.dark-mode .teacher-desc {
  color: #9ca3af;
}

.improve-page.dark-mode .new-chat {
  background: #2a2a2c;
  border-color: rgba(21, 90, 239, 0.3);
  color: #60a5fa;
}

.improve-page.dark-mode .new-chat[disabled],
.improve-page.dark-mode .conversation-item.disabled,
.improve-page.dark-mode .conversation-item.disabled:hover {
  background: transparent;
  color: #6b7280;
}

.improve-page.dark-mode .conversation-item {
  color: #e5e5e5;
}

.improve-page.dark-mode .conversation-item:hover {
  background: #2a2a2c;
}

.improve-page.dark-mode .conversation-item.active {
  background: rgba(21, 90, 239, 0.1);
  color: #60a5fa;
}

.improve-page.dark-mode .conversation-title {
  color: #e5e5e5;
}

.improve-page.dark-mode .conversation-item.active .conversation-title {
  color: #60a5fa;
}

.improve-page.dark-mode .conversation-time {
  color: #6b7280;
}

.improve-page.dark-mode .empty-list {
  color: #6b7280;
}

.improve-page.dark-mode .loading-indicator {
  color: #9ca3af;
}

.improve-page.dark-mode .mobile-chat-header {
  background: #1e1e20;
  border-bottom-color: #3f3f46;
}

.improve-page.dark-mode .mobile-icon-btn,
.improve-page.dark-mode .mobile-drawer-close {
  background: #2a2a2c;
  color: #9ca3af;
}

.improve-page.dark-mode .mobile-brand-name {
  color: #e5e5e5;
}

.improve-page.dark-mode .conversation-panel.open {
  background: #1e1e20;
  border-right-color: #3f3f46;
}

.improve-page.dark-mode .start-title {
  color: #e5e5e5;
}

.improve-page.dark-mode .start-desc {
  color: #9ca3af;
}

.improve-page.dark-mode .start-icon {
  background: #2a2a2c;
}

.improve-page.dark-mode .config-card {
  background: #1e1e20;
  border-color: #3f3f46;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.improve-page.dark-mode .field-head {
  color: #e5e5e5;
}

.improve-page.dark-mode .tag {
  background: rgba(21, 90, 239, 0.15);
  color: #60a5fa;
}

.improve-page.dark-mode .tag.orange {
  background: rgba(249, 115, 22, 0.15);
  color: #fb923c;
}

.improve-page.dark-mode .hint {
  color: #9ca3af;
}

.improve-page.dark-mode .native-select,
.improve-page.dark-mode .select-box,
.improve-page.dark-mode .exam-select-trigger,
.improve-page.dark-mode .input,
.improve-page.dark-mode .textarea {
  background: #2a2a2c;
  border-color: #3f3f46;
  color: #e5e5e5;
}

.improve-page.dark-mode .exam-search-icon,
.improve-page.dark-mode .exam-option-meta,
.improve-page.dark-mode .exam-empty-desc {
  color: #6b7280;
}

.improve-page.dark-mode .exam-selector-mask {
  background: rgba(0, 0, 0, 0.55);
}

.improve-page.dark-mode .exam-selector-panel {
  background: #1e1e20;
  box-shadow: -18px 0 44px rgba(0, 0, 0, 0.45);
}

.improve-page.dark-mode .exam-selector-head {
  border-bottom-color: #3f3f46;
}

.improve-page.dark-mode .exam-selector-title,
.improve-page.dark-mode .exam-option-name,
.improve-page.dark-mode .exam-empty-title {
  color: #e5e5e5;
}

.improve-page.dark-mode .exam-selector-subtitle {
  color: #6b7280;
}

.improve-page.dark-mode .exam-selector-close,
.improve-page.dark-mode .exam-search-clear {
  background: #2a2a2c;
  color: #9ca3af;
}

.improve-page.dark-mode .exam-search-box {
  border-color: #3f3f46;
  background: #2a2a2c;
}

.improve-page.dark-mode .exam-search-input {
  color: #e5e5e5;
}

.improve-page.dark-mode .exam-group-title {
  background: #1e1e20;
  color: #60a5fa;
}

.improve-page.dark-mode .exam-option {
  border-color: #3f3f46;
  background: #242426;
}

.improve-page.dark-mode .exam-option.active {
  border-color: rgba(96, 165, 250, 0.44);
  background: rgba(21, 90, 239, 0.16);
  box-shadow: 0 8px 18px rgba(0, 0, 0, 0.28);
}

.improve-page.dark-mode .native-select-arrow,
.improve-page.dark-mode .exam-select-trigger-arrow {
  border-right-color: #6b7280;
  border-bottom-color: #6b7280;
}

.improve-page.dark-mode .mode {
  color: #6b7280;
}

.improve-page.dark-mode .mode.active {
  background: #155aef;
  color: #ffffff;
}

.improve-page.dark-mode .mode.disabled {
  color: #4b5563;
}

.improve-page.dark-mode .mode-tabs {
  background: #2a2a2c;
}

.improve-page.dark-mode .history-row .history-selected {
  background: #2a2a2c;
  border-color: #3f3f46;
  color: #9ca3af;
}

.improve-page.dark-mode .selected-history-content {
  color: #e5e5e5;
}

.improve-page.dark-mode .history-task-code {
  color: #60a5fa;
}

.improve-page.dark-mode .small-btn {
  background: #2a2a2c;
  border-color: #3f3f46;
  color: #9ca3af;
}

.improve-page.dark-mode .small-btn.ghost {
  background: transparent;
  color: #6b7280;
}

.improve-page.dark-mode .message-avatar {
  background: #2a2a2c;
}

.improve-page.dark-mode .message-row.user .message-bubble {
  background: #155aef;
  color: #ffffff;
}

.improve-page.dark-mode .message-row:not(.user) .message-bubble {
  background: #2a2a2c;
  color: #e5e5e5;
  border-color: #3f3f46;
}

.improve-page.dark-mode .message-time {
  color: #6b7280;
}

.improve-page.dark-mode .messages {
  background: #1e1e20;
}

.improve-page.dark-mode .composer {
  background: #1e1e20;
  border-top-color: #3f3f46;
}

.improve-page.dark-mode .composer-inner {
  background: #2a2a2c;
  border-color: #3f3f46;
}

.improve-page.dark-mode .composer-input {
  background: transparent;
  color: #e5e5e5;
}

.improve-page.dark-mode .composer-placeholder {
  color: #6b7280;
}

.improve-page.dark-mode .quick-btn {
  background: #2a2a2c;
  border-color: #3f3f46;
  color: #9ca3af;
}

.improve-page.dark-mode .quick-btn:hover {
  background: #3f3f46;
  color: #e5e5e5;
}

.improve-page.dark-mode .stop-pill {
  background: rgba(239, 68, 68, 0.1);
  color: #f87171;
}

.improve-page.dark-mode .modal-mask {
  background: rgba(0, 0, 0, 0.6);
}

.improve-page.dark-mode .history-modal,
.improve-page.dark-mode .rename-modal {
  background: #1e1e20;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
}

.improve-page.dark-mode .modal-head {
  color: #e5e5e5;
}

.improve-page.dark-mode .history-select-tip {
  color: #93c5fd;
}

.improve-page.dark-mode .history-select-tip-text {
  background: rgba(21, 90, 239, 0.16);
}

.improve-page.dark-mode .history-item {
  background: #2a2a2c;
  border-color: #3f3f46;
}

.improve-page.dark-mode .history-item:hover {
  background: #3f3f46;
}

.improve-page.dark-mode .history-title {
  color: #e5e5e5;
}

.improve-page.dark-mode .history-task-time {
  color: #6b7280;
}

.improve-page.dark-mode .history-tag {
  background: #1e1e20;
  color: #9ca3af;
}

.improve-page.dark-mode .history-score {
  color: #60a5fa;
}

.improve-page.dark-mode .page-btn {
  background: #2a2a2c;
  border-color: #3f3f46;
  color: #9ca3af;
}

.improve-page.dark-mode .page-info {
  color: #9ca3af;
}

.improve-page.dark-mode .rename-input {
  background: #2a2a2c;
  border-color: #3f3f46;
  color: #e5e5e5;
}

.improve-page.dark-mode .rename-title {
  color: #e5e5e5;
}

.improve-page.dark-mode .rename-subtitle {
  color: #9ca3af;
}

.improve-page.dark-mode .rename-btn.cancel {
  background: #2a2a2c;
  border-color: #3f3f46;
  color: #9ca3af;
}

.improve-page.dark-mode .bottom-text {
  background: linear-gradient(135deg, rgba(30, 30, 32, 0.92) 0%, rgba(21, 30, 56, 0.92) 100%);
  border-top-color: rgba(21, 90, 239, 0.2);
}

.improve-page.dark-mode .bottom-desc {
  color: rgba(147, 179, 255, 0.6);
}

@media screen and (min-width: 640px) and (max-width: 1023px) {
  .improve-page {
    padding: 5px 5px 0px 0px;
  }

  .improve-layout {
    gap: 5px;
    height: 100%;
    overflow: hidden;
  }

  .conversation-panel {
    flex: 0 0 200px;
    width: 200px;
    min-width: 180px;
    min-height: 0;
  }

  .chat-panel {
    flex: 1;
    min-height: 0;
  }

  .message-bubble {
    max-width: 90%;
    padding: 8px 8px;
  }
}

@media screen and (max-width: 639px) {
  .improve-page {
    display: flex;
    flex-direction: column;
    padding: 0;
    background: #ffffff;
  }

  .mobile-chat-header {
    position: relative;
    z-index: 60;
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex: 0 0 56px;
    height: 56px;
    padding: 0 14px;
    box-sizing: border-box;
    border-bottom: 1px solid #f3f4f6;
    background: #ffffff;
    box-shadow: 0 1px 8px rgba(15, 23, 42, 0.04);
  }

  .mobile-header-left,
  .mobile-header-actions,
  .mobile-brand {
    display: flex;
    align-items: center;
  }

  .mobile-header-left {
    gap: 12px;
    min-width: 0;
  }

  .mobile-header-actions {
    gap: 8px;
  }

  .mobile-brand {
    gap: 8px;
    min-width: 0;
  }

  .mobile-brand-avatar {
    display: flex;
    align-items: center;
    justify-content: center;
    flex: 0 0 28px;
    width: 28px;
    height: 28px;
    overflow: hidden;
    border-radius: 999px;
    background: #ffdfbf;
  }

  .mobile-brand-name {
    max-width: 172px;
    overflow: hidden;
    color: #111827;
    font-size: 15px;
    font-weight: 900;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .mobile-icon-btn,
  .mobile-drawer-close {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    padding: 0;
    margin: 0;
    border: 0;
    border-radius: 999px;
    background: #f8f9fa;
    color: #667085;
  }

  .mobile-icon-btn::after,
  .mobile-drawer-close::after {
    border: 0;
  }

  .mobile-conversation-mask {
    position: fixed;
    inset: 0;
    z-index: 70;
    display: block;
    background: rgba(0, 0, 0, 0.4);
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
  }

  .improve-layout {
    flex-direction: column;
    flex: 1 1 0;
    gap: 0;
    width: 100%;
    max-width: 480px;
    height: auto;
    overflow: hidden;
  }

  .conversation-panel,
  .chat-panel {
    border: 0;
    border-radius: 0;
    box-shadow: none;
  }

  .conversation-panel {
    position: fixed;
    top: 0;
    bottom: 0;
    left: 0;
    z-index: 80;
    flex: none;
    width: 280px;
    min-width: 0;
    max-height: none;
    border-right: 1px solid #f3f4f6;
    background: #ffffff;
    box-shadow: 0 18px 48px rgba(15, 23, 42, 0.22);
    transform: translateX(-105%);
    transition: transform 0.2s ease;
  }

  .conversation-panel.open {
    transform: translateX(0);
  }

  .teacher-head {
    gap: 10px;
    padding: 16px;
    border-bottom: 1px solid #f8f9fa;
  }

  .avatar {
    width: 32px;
    height: 32px;
  }

  .teacher-name {
    font-size: 15px;
  }

  .teacher-desc {
    width: auto;
    max-width: 168px;
    margin-top: 2px;
    font-size: 11px;
  }

  .mobile-drawer-close {
    flex: 0 0 32px;
    margin-left: auto;
    background: transparent;
  }

  .new-chat {
    height: 40px;
    margin: 16px 16px 12px;
    border-radius: 12px;
    font-size: 13px;
  }

  .conversation-list {
    flex: 1 1 0;
    height: 0;
    padding: 0 8px 16px;
  }

  .conversation-bottom-spacer {
    height: calc(88px + env(safe-area-inset-bottom));
  }

  .conversation-item {
    min-height: 42px;
    padding: 10px 12px;
    margin-bottom: 4px;
    border-radius: 12px;
    font-size: 14px;
  }

  .menu-trigger {
    opacity: 1;
    background: #f3f4f6;
  }

  .conversation-menu {
    top: 28px;
    right: 0;
  }

  .chat-panel {
    flex: 1 1 0;
    min-height: 0;
    overflow: hidden;
  }

  .start-card {
    justify-content: flex-start;
    padding: 18px 16px 18px;
  }

  .start-icon {
    width: 52px;
    height: 52px;
    margin-bottom: 12px;
    border-radius: 14px;
    font-size: 16px;
  }

  .start-title {
    font-size: 20px;
  }

  .start-desc {
    max-width: 320px;
    margin-top: 6px;
    font-size: 12px;
    line-height: 1.45;
  }

  .config-card {
    max-width: 100%;
    margin-top: 18px;
    padding: 16px;
    border-radius: 16px;
    box-shadow: none;
  }

  .mode-tabs {
    margin-bottom: 16px;
  }

  .mode {
    height: 34px;
    font-size: 12px;
  }

  .field {
    margin-bottom: 14px;
  }

  .field-head {
    margin-bottom: 8px;
    font-size: 12px;
  }

  .tag,
  .hint {
    padding: 2px 7px;
    font-size: 10px;
  }

  .native-select-wrap,
  .native-select,
  .select-box,
  .exam-select-trigger,
  .history-selected {
    height: 38px;
    padding: 0 11px;
    border-radius: 11px;
    font-size: 12px;
    line-height: 38px;
  }

  .exam-select-trigger-text {
    font-size: 12px;
  }

  .native-select {
    padding: 0 34px 0 11px;
  }

  .exam-selector-head {
    padding: 16px 16px 12px;
  }

  .exam-search-box {
    margin: 12px 16px;
  }

  .exam-selector-list {
    padding: 0 16px 18px;
  }

  .exam-option {
    min-height: 60px;
    padding: 11px 12px;
  }

  .exam-option-name {
    font-size: 12px;
  }

  .history-row {
    gap: 8px;
  }

  .small-btn {
    height: 38px;
    padding: 0 12px;
    border-radius: 11px;
    font-size: 12px;
  }

  .start-btn {
    height: 42px;
    border-radius: 12px;
    font-size: 13px;
  }

  .chat-shell {
    min-height: 0;
  }

  .messages {
    padding: 18px 14px 12px;
  }

  .messages-bottom-spacer {
    height: 24px;
  }

  .messages-bottom-spacer.generating {
    height: 24px;
  }

  .message-row {
    gap: 10px;
    margin-bottom: 18px;
  }

  .message-avatar {
    flex-basis: 36px;
    width: 36px;
    height: 36px;
  }

  .message-bubble {
    max-width: 85%;
    padding: 5px 5px;
    border-radius: 16px;
    font-size: 14px;
    line-height: 1.65;
  }

  .message-row:not(.user) .message-bubble {
    max-width: 85%;
  }

  .quick-replies {
    align-items: center;
    justify-content: flex-start;
    gap: 8px;
    margin-top: 12px;
  }

  .quick-btn {
    display: inline-flex;
    flex: 0 0 auto;
    align-items: center;
    justify-content: center;
    width: auto;
    min-width: 0;
    height: 30px;
    margin: 0;
    padding: 0 10px;
    font-size: 11px;
    line-height: 30px;
  }

  .composer {
    padding: 10px 12px calc(10px + env(safe-area-inset-bottom));
    border-top: 1px solid #f3f4f6;
  }

  .composer-inner {
    gap: 8px;
    padding: 6px 6px 6px 12px;
    border-radius: 16px;
  }

  .composer-input {
    height: 36px;
    min-height: 36px;
    max-height: 120px;
    padding: 8px 0;
    font-size: 14px;
    line-height: 20px;
  }

  .composer-placeholder {
    top: 8px;
    font-size: 14px;
    line-height: 20px;
  }

  .send-btn {
    flex-basis: 32px;
    width: 32px;
    height: 32px;
    min-width: 32px;
    min-height: 32px;
    margin-bottom: 2px;
  }

  .stop-floating {
    top: -42px;
  }

  .stop-pill {
    height: 32px;
    padding: 0 12px;
    font-size: 12px;
  }

  .modal-mask {
    align-items: center;
    justify-content: center;
    padding: 12px;
  }

  .history-modal {
    width: min(100%, 520px);
    max-height: calc(100vh - 24px);
    border-radius: 18px;
  }

  .rename-modal {
    width: min(100%, 420px);
    padding: 20px;
    border-radius: 18px;
  }

  .modal-head,
  .history-pagination {
    padding: 14px 16px;
  }

  .modal-head {
    font-size: 17px;
  }

  .history-select-tip {
    padding: 12px 16px 0;
  }

  .history-select-tip-text {
    font-size: 12px;
    padding: 9px 10px;
  }

  .history-pagination {
    align-items: stretch;
    flex-direction: column;
  }

  .history-total {
    display: none;
  }

  .history-list {
    max-height: 58vh;
    padding: 12px 12px 0;
  }

  .history-item {
    gap: 9px;
    padding: 14px 18px;
    border-radius: 14px;
  }

  .history-task-code,
  .history-task-time {
    font-size: 12px;
  }

  .history-title {
    font-size: 12px;
  }

  .history-tag {
    max-width: 180px;
  }

  .history-score {
    font-size: 14px;
  }

  .bottom-text {
    display: none;
  }
}
</style>

<style>
/* #ifdef H5 */
uni-page-body,
page {
  position: absolute !important;
  top: 0 !important;
  right: 0 !important;
  bottom: 0 !important;
  left: 0 !important;
  height: 100% !important;
  overflow: hidden !important;
}
/* #endif */

uni-view.shenlungo-markdown-form hr,
.shenlungo-markdown-form hr {
  height: 1px !important;
  margin: 18px 0 !important;
  border: 0 !important;
  background: #e5e7eb !important;
}

uni-view.shenlungo-markdown-form form,
.shenlungo-markdown-form form {
  display: flex !important;
  flex-direction: column !important;
  gap: 14px !important;
  width: 100% !important;
  margin-top: 18px !important;
}

uni-view.shenlungo-markdown-form form label,
.shenlungo-markdown-form form label {
  display: block !important;
  margin: 0 !important;
  color: #111827 !important;
  font-size: 15px !important;
  font-weight: 800 !important;
  line-height: 1.4 !important;
}

uni-view.shenlungo-markdown-form form input,
uni-view.shenlungo-markdown-form form textarea,
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

uni-view.shenlungo-markdown-form form input,
.shenlungo-markdown-form form input {
  min-height: 44px !important;
}

uni-view.shenlungo-markdown-form form textarea,
.shenlungo-markdown-form form textarea {
  min-height: 116px !important;
  resize: vertical !important;
}

uni-view.shenlungo-markdown-form form input:focus,
uni-view.shenlungo-markdown-form form textarea:focus,
.shenlungo-markdown-form form input:focus,
.shenlungo-markdown-form form textarea:focus {
  border-color: #155aef !important;
  box-shadow: 0 0 0 3px rgba(21, 90, 239, 0.08) !important;
}

uni-view.shenlungo-markdown-form form button,
uni-view.shenlungo-markdown-form form input[type="submit"],
.shenlungo-markdown-form form button,
.shenlungo-markdown-form form input[type="submit"] {
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
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
  line-height: 46px !important;
  cursor: pointer !important;
  box-shadow: 0 8px 18px rgba(21, 90, 239, 0.18) !important;
}

uni-view.shenlungo-markdown-form form button::after,
.shenlungo-markdown-form form button::after {
  border: 0 !important;
}
</style>
