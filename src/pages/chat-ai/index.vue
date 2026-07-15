<template>
  <view class="improve-page">
    <view class="mobile-chat-header">
      <view class="mobile-header-left">
        <button class="mobile-icon-btn" @tap="openDrawer">
          <Menu :size="18" />
        </button>
        <view class="mobile-brand">
          <view class="mobile-brand-avatar">
            <image class="avatar-image" :src="teacherAvatarUrl" mode="aspectFill"></image>
          </view>
          <view class="mobile-brand-copy">
            <text class="mobile-brand-name">{{ teacherName }}</text>
            <text class="mobile-brand-desc">AI生成内容｜用于思路整理、表达练习与自我复盘</text>
          </view>
        </view>
      </view>
      <view class="mobile-header-actions">
        <button v-if="hasStartedChat" class="mobile-icon-btn" :disabled="isGenerating" @tap="resetChat">
          <RotateCcw :size="16" />
        </button>
      </view>
    </view>

    <view
      v-if="showMobileConversationDrawer"
      class="mobile-conversation-mask"
      @tap="closeDrawer"
    ></view>
    <view
      v-if="activeConversationMenuId"
      class="conversation-menu-mask"
      @tap="activeConversationMenuId = ''"
    ></view>

    <view class="improve-layout">
      <view class="conversation-panel" :class="{ open: conversationPanelOpen }">
        <view class="teacher-head">
          <view class="avatar teacher-avatar">
            <image class="avatar-image" :src="teacherAvatarUrl" mode="aspectFill"></image>
          </view>
          <view class="teacher-copy">
            <text class="teacher-name">{{ teacherName }}</text>
            <text class="teacher-desc">{{ teacherDescription }}</text>
          </view>
          <button class="mobile-drawer-close" @tap="closeDrawer">
            <PanelLeftClose :size="18" />
          </button>
        </view>

        <button class="new-chat" :disabled="isGenerating" @tap="resetMobileChat">
          <SquarePen :size="16" />
          <text>开启新对话</text>
        </button>

        <scroll-view scroll-y class="conversation-list" @scrolltolower="loadMoreConversations">
          <view
            v-for="item in conversations"
            :key="item.id"
            class="conversation-item"
            :class="{
              active: item.id === conversationId,
              'menu-open': activeConversationMenuId === item.id,
              disabled: isGenerating,
            }"
          >
            <view class="conversation-text" @tap="selectConversation(item)">
              <view class="conversation-title-row">
                <text class="conversation-title">{{ item.name || '未命名对话' }}</text>
              </view>
              <text class="conversation-time">{{
                formatMessageTime(item.updated_at || item.created_at)
              }}</text>
            </view>

            <view class="conversation-action">
              <button
                class="menu-trigger"
                :class="{ visible: item.id === conversationId || activeConversationMenuId === item.id }"
                :disabled="isGenerating"
                @tap.stop="toggleConversationMenu(item.id)"
              >
                <text class="menu-dot"></text>
                <text class="menu-dot"></text>
                <text class="menu-dot"></text>
              </button>

              <view
                v-if="activeConversationMenuId === item.id"
                class="conversation-menu"
                @tap.stop
              >
                <button class="menu-item" @tap.stop="openRenameDialog(item)">
                  <Pencil :size="14" />
                  <text>重命名</text>
                </button>
                <button class="menu-item danger" @tap.stop="removeConversationItem(item)">
                  <Trash2 :size="14" />
                  <text>删除</text>
                </button>
              </view>
            </view>
          </view>

          <view v-if="!conversations.length && !conversationLoading" class="empty-block">
            暂无历史会话
          </view>
          <view v-if="conversationLoading" class="loading-text">加载中...</view>
          <view class="conversation-bottom-spacer"></view>
        </scroll-view>
      </view>

      <view class="chat-panel">
        <view v-if="!hasStartedChat" class="start-card">
          <view class="start-icon">
            <image class="start-icon-img" :src="teacherAvatarUrl" mode="aspectFill"></image>
          </view>
          <text class="start-desc">{{ teacherDescription }}</text>
          <button class="start-btn" :disabled="isGenerating" @tap="startNewChat">开始新对话</button>
        </view>

        <view v-else class="chat-shell">
          <scroll-view
            scroll-y
            class="messages"
            :scroll-into-view="scrollIntoView"
            @scrolltoupper="loadMoreMessages"
          >
            <view v-if="messageLoadingMore" class="loading-text">正在加载更早消息...</view>

            <view
              v-for="(message, index) in messages"
              :id="`chat-ai-message-${index}`"
              :key="`chat-ai-message-${index}`"
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
                  v-else-if="userAvatarUrl"
                  class="avatar-image"
                  :src="userAvatarUrl"
                  mode="aspectFill"
                ></image>
                <text v-else>我</text>
              </view>

              <view class="message-bubble">
                <MarkdownRendererChat
                  :content="message.content"
                  :hide-think-duration="Boolean(message.isHistory)"
                />
                <!-- <view v-if="message.isStreaming" class="streaming-dot"></view> -->
                <text
                  v-if="message.createdAt && !message.isOpening && message.role !== 'user'"
                  class="message-time"
                >{{
                  formatMessageTime(message.createdAt)
                }}</text>
              </view>
            </view>

            <view class="messages-bottom-spacer" :class="{ generating: isGenerating }"></view>
          </scroll-view>

          <view class="composer">
            <view v-if="loadError" class="load-error">{{ loadError }}</view>

            <view v-if="isGenerating" class="stop-floating">
              <button class="stop-pill" @tap="stopGenerating">
                <Square :size="13" fill="currentColor" />
                <text>停止响应</text>
              </button>
            </view>

            <view class="composer-inner" :class="{ empty: !inputText.trim() }">
              <view class="composer-input-wrap">
                <textarea
                  v-model="inputText"
                  class="composer-input"
                  :disabled="isGenerating"
                  maxlength="2000"
                  auto-height
                  confirm-type="send"
                  placeholder=""
                  @confirm="sendMessage"
                />
                <view v-if="!inputText.trim()" class="composer-placeholder">
                  <view class="composer-placeholder-dot"></view>
                  <text class="composer-placeholder-text">和 {{ teacherName }} 对话</text>
                </view>
              </view>

              <button
                class="send-btn"
                :disabled="!inputText.trim() || isGenerating"
                @tap="sendMessage"
              >
                <SendHorizontal :size="23" />
              </button>
            </view>
          </view>
        </view>
      </view>
    </view>

    <view v-if="showRenameModal" class="modal-mask" @tap="closeRenameDialog"></view>
    <view v-if="showRenameModal" class="rename-modal" @tap.stop>
      <view class="rename-head">
        <view class="rename-icon">
          <Pencil :size="16" />
        </view>
        <view class="rename-copy">
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
        <button class="rename-btn cancel" :disabled="renameSaving" @tap="closeRenameDialog">
          取消
        </button>
        <button class="rename-btn confirm" :disabled="renameSaving || !renameName.trim()" @tap="submitRename">
          {{ renameSaving ? '保存中...' : '确认重命名' }}
        </button>
      </view>
    </view>

    <view v-if="showProtocolModal" class="protocol-mask">
      <view class="protocol-dialog" @tap.stop>
        <view class="protocol-header">
          <CircleAlert :size="20" class="protocol-header-icon" />
          <text class="protocol-title">使用提示</text>
        </view>
        <scroll-view scroll-y class="protocol-content">
          <view class="protocol-highlight">
            <text class="protocol-paragraph protocol-paragraph-strong">欢迎使用 『AI琳萌姐姐』。</text>
            <text class="protocol-paragraph">
              它是一个基于人工智能生成的成长辅助工具，用于思路整理、表达练习、自我复盘与内容启发。
            </text>
            <text class="protocol-paragraph protocol-emphasis">
              请知悉：它是AI成长辅助工具，并非真人，也不等同于真实的琳萌姐姐本人。
            </text>
          </view>
          <view class="protocol-section">
            <text class="protocol-section-title">请你特别留意</text>
            <view class="protocol-list">
              <view class="protocol-item">
                <text class="protocol-item-index">1</text>
                <text class="protocol-item-text">
                  本产品仅用于成长启发与参考，不构成心理咨询、医疗、法律、金融等专业服务；
                </text>
              </view>
              <view class="protocol-item">
                <text class="protocol-item-index">2</text>
                <text class="protocol-item-text">不替代现实中的亲友支持、人际关系或专业帮助；</text>
              </view>
              <view class="protocol-item">
                <text class="protocol-item-index">3</text>
                <text class="protocol-item-text">AI生成内容可能存在局限，请结合自身情况独立判断；</text>
              </view>
              <view class="protocol-item">
                <text class="protocol-item-index">4</text>
                <text class="protocol-item-text">
                  本产品主要面向18周岁以上用户；
                </text>
              </view>
              <view class="protocol-item">
                <text class="protocol-item-index">5</text>
                <text class="protocol-item-text">未成年人请在监护人知情同意及监护下使用；</text>
              </view>
              <view class="protocol-item">
                <text class="protocol-item-index">6</text>
                <text class="protocol-item-text">
                  如你正处于强烈痛苦、自伤轻生、家暴威胁等高风险情境，请优先联系现实中的亲友、专业机构或紧急援助资源。
                </text>
              </view>
            </view>
          </view>
          <view class="protocol-footer-note">
            <text class="protocol-footer-note-text">
              继续使用，即表示你已了解以上内容，并愿意理性、审慎地使用本产品。
            </text>
          </view>
        </scroll-view>
        <view class="protocol-actions">
          <button
            class="protocol-confirm-btn"
            :disabled="protocolSubmitting"
            @tap="confirmProtocol"
          >
            {{ protocolSubmitting ? '处理中...' : '我已知悉，开始使用' }}
          </button>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { computed, defineComponent, nextTick, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import {
  CircleAlert,
  Menu,
  PanelLeftClose,
  Pencil,
  RotateCcw,
  SendHorizontal,
  Square,
  SquarePen,
  Trash2,
} from 'lucide-vue-next'
import MarkdownRendererChat from '../../components/MarkdownRendererChat.vue'
import {
  addUserEvent,
  deleteConversation,
  getConversationMessages,
  getConversations,
  getUserEventCount,
  getWebappConfig,
  renameConversation,
  stopChatMessage,
  streamChatMessage,
} from '../../api/chat'

const EVENT_CODE_QUERY_PROTOCOL = 'query_protocol'
const PROTOCOL_CACHE_KEY_PREFIX = 'chat_ai_protocol_confirmed'

function buildMessageRows(rows = []) {
  return rows.flatMap((item) => {
    const createdAt = item.created_at || item.createdAt || Date.now()
    const result = []

    if (item.query) {
      result.push({
        role: 'user',
        content: item.query,
        createdAt,
        isHistory: true,
      })
    }

    if (item.answer) {
      result.push({
        role: 'assistant',
        content: item.answer,
        createdAt,
        isHistory: true,
      })
    }

    return result
  })
}

export default defineComponent({
  name: 'ChatAiPage',
  components: {
    CircleAlert,
    MarkdownRendererChat,
    Menu,
    PanelLeftClose,
    Pencil,
    RotateCcw,
    SendHorizontal,
    Square,
    SquarePen,
    Trash2,
  },
  setup() {
    const defaultTeacherAvatar =
      'https://dify-goaigs-other.oss-cn-guangzhou.aliyuncs.com/linmeng-logo.jpeg'
    const showMobileConversationDrawer = ref(false)
    const hasStartedChat = ref(false)
    const inputText = ref('')
    const isGenerating = ref(false)
    const loadError = ref('')
    const conversations = ref([])
    const conversationId = ref('')
    const conversationLoading = ref(false)
    const conversationHasMore = ref(false)
    const conversationLastId = ref('')
    const messages = ref([])
    const messageHasMore = ref(false)
    const messageFirstId = ref('')
    const messageLoadingMore = ref(false)
    const taskId = ref('')
    const scrollIntoView = ref('')
    const abortController = ref(null)
    const showRenameModal = ref(false)
    const renameTarget = ref(null)
    const renameName = ref('')
    const renameSaving = ref(false)
    const activeConversationMenuId = ref('')
    const showProtocolModal = ref(false)
    const protocolSubmitting = ref(false)
    const pageInitialized = ref(false)
    const appConfig = ref({})

    const teacherName = computed(() => appConfig.value.title || 'AI琳萌姐姐')
    const teacherDescription = computed(() => '嘿，宝子！我是琳萌姐姐~')
    const teacherAvatarUrl = computed(() => {
      if (appConfig.value.iconType === 'image' && appConfig.value.iconUrl) {
        return appConfig.value.iconUrl
      }
      return defaultTeacherAvatar
    })
    const userAvatarUrl = computed(() => uni.getStorageSync('wechatAvatarUrl') || '')
    const conversationPanelOpen = computed(() => showMobileConversationDrawer.value)

    const getProtocolCacheKey = () => {
      const tenantNum = uni.getStorageSync('tenantNum') || 'default_tenant'
      const userKey =
        uni.getStorageSync('sa-token') ||
        uni.getStorageSync('sa_token') ||
        uni.getStorageSync('satoken') ||
        uni.getStorageSync('saToken') ||
        uni.getStorageSync('wechatCode') ||
        tenantNum
      return `${PROTOCOL_CACHE_KEY_PREFIX}:${EVENT_CODE_QUERY_PROTOCOL}:${tenantNum}:${userKey}`
    }

    const getProtocolCache = () => {
      return uni.getStorageSync(getProtocolCacheKey()) === '1'
    }

    const setProtocolCache = () => {
      uni.setStorageSync(getProtocolCacheKey(), '1')
    }

    const openingMessage = () => {
      return {
        role: 'assistant',
        content:
          appConfig.value.openingStatement ||
          '你好，我已经准备好了。你可以直接输入问题，我会基于当前会话持续回答。',
        createdAt: Date.now(),
        isOpening: true,
      }
    }

    const scrollToBottom = () => {
      nextTick(() => {
        scrollIntoView.value = `chat-ai-message-${Math.max(messages.value.length - 1, 0)}`
      })
    }

    const closeDrawer = () => {
      showMobileConversationDrawer.value = false
    }

    const openDrawer = () => {
      if (showProtocolModal.value) return
      showMobileConversationDrawer.value = true
    }

    const startNewChat = () => {
      if (showProtocolModal.value || isGenerating.value) return
      conversationId.value = ''
      taskId.value = ''
      hasStartedChat.value = true
      messages.value = [openingMessage()]
      inputText.value = ''
      closeDrawer()
      activeConversationMenuId.value = ''
      loadError.value = ''
      scrollToBottom()
    }

    const resetChat = () => {
      startNewChat()
    }

    const resetMobileChat = () => {
      startNewChat()
      closeDrawer()
    }

    const loadConversationList = async (append = false) => {
      if (showProtocolModal.value && append) return
      if (conversationLoading.value) return
      conversationLoading.value = true

      try {
        const result = await getConversations({
          lastId: append ? conversationLastId.value : '',
          limit: 20,
        })
        const nextList = result.data || []
        conversations.value = append ? conversations.value.concat(nextList) : nextList
        conversationHasMore.value = result.hasMore === true
        conversationLastId.value =
          conversations.value.length > 0
            ? conversations.value[conversations.value.length - 1].id
            : ''
        loadError.value = ''
      } catch (error) {
        loadError.value = error.message || '历史会话加载失败'
        if (!append) {
          conversations.value = []
          conversationHasMore.value = false
          conversationLastId.value = ''
        }
      } finally {
        conversationLoading.value = false
      }
    }

    const loadConversation = async (item) => {
      if (showProtocolModal.value) return
      try {
        const result = await getConversationMessages({
          conversationId: item.id,
          limit: 20,
        })
        conversationId.value = item.id
        hasStartedChat.value = true
        messageHasMore.value = result.hasMore === true
        messageFirstId.value = result.data.length > 0 ? result.data[0].id : ''
        messages.value = buildMessageRows(result.data)
        if (!messages.value.length) {
          messages.value = [openingMessage()]
        }
        closeDrawer()
        activeConversationMenuId.value = ''
        loadError.value = ''
        scrollToBottom()
      } catch (error) {
        uni.showToast({
          title: error.message || '会话加载失败',
          icon: 'none',
        })
      }
    }

    const loadMoreMessages = async () => {
      if (showProtocolModal.value) return
      if (!conversationId.value || !messageHasMore.value || messageLoadingMore.value) return
      messageLoadingMore.value = true

      try {
        const result = await getConversationMessages({
          conversationId: conversationId.value,
          firstId: messageFirstId.value,
          limit: 20,
        })
        const olderMessages = buildMessageRows(result.data)
        messageHasMore.value = result.hasMore === true
        if (result.data.length > 0) {
          messageFirstId.value = result.data[0].id
        }
        messages.value = olderMessages.concat(messages.value)
      } catch (error) {
        console.warn('load more messages failed', error)
      } finally {
        messageLoadingMore.value = false
      }
    }

    const loadMoreConversations = async () => {
      if (showProtocolModal.value) return
      if (!conversationHasMore.value || conversationLoading.value) return
      await loadConversationList(true)
    }

    const handleChatEvent = (event, assistantMessage) => {
      if (!event) return

      if (event.task_id) {
        taskId.value = event.task_id
      }
      if (event.conversation_id) {
        conversationId.value = event.conversation_id
      }

      if ((event.event === 'message' || event.event === 'agent_message') && event.answer) {
        assistantMessage.content += event.answer
      }

      if (event.event === 'message_end' || event.event === 'agent_message_end') {
        assistantMessage.isStreaming = false
        isGenerating.value = false
      }

      if (event.event === 'error') {
        assistantMessage.content += `\n\n[请求失败] ${event.message || '请稍后重试'}`
        assistantMessage.isStreaming = false
        isGenerating.value = false
      }

      scrollToBottom()
    }

    const sendMessage = async () => {
      if (showProtocolModal.value) return
      const query = inputText.value.trim()
      if (!query || isGenerating.value) return

      if (!hasStartedChat.value) {
        startNewChat()
      }

      const assistantMessage = {
        role: 'assistant',
        content: '',
        createdAt: Date.now(),
        isStreaming: true,
      }

      messages.value.push({
        role: 'user',
        content: query,
        createdAt: Date.now(),
      })
      messages.value.push(assistantMessage)
      inputText.value = ''
      isGenerating.value = true
      loadError.value = ''
      abortController.value = new AbortController()
      scrollToBottom()

      try {
        await streamChatMessage({
          query,
          conversationId: conversationId.value,
          inputs: {},
          signal: abortController.value.signal,
          onEvent: (event) => handleChatEvent(event, assistantMessage),
        })
        await loadConversationList(false)
      } catch (error) {
        if (error.name !== 'AbortError') {
          assistantMessage.content += `\n\n[请求失败] ${error.message || '请稍后重试'}`
          uni.showToast({
            title: error.message || '发送失败',
            icon: 'none',
          })
          loadError.value = error.message || '发送失败'
        }
      } finally {
        assistantMessage.isStreaming = false
        isGenerating.value = false
        scrollToBottom()
      }
    }

    const stopGenerating = async () => {
      if (showProtocolModal.value) return
      try {
        if (taskId.value) {
          await stopChatMessage(taskId.value)
        }
      } catch (error) {
        uni.showToast({
          title: error.message || '停止失败',
          icon: 'none',
        })
      } finally {
        if (abortController.value) {
          abortController.value.abort()
        }
        const lastMessage = messages.value[messages.value.length - 1]
        if (lastMessage && lastMessage.role === 'assistant' && lastMessage.isStreaming) {
          lastMessage.content += '\n\n[对话已手动停止]'
          lastMessage.isStreaming = false
        }
        isGenerating.value = false
      }
    }

    const removeConversationItem = (item) => {
      if (showProtocolModal.value || isGenerating.value) return
      activeConversationMenuId.value = ''
      uni.showModal({
        title: '删除会话',
        content: `确认删除“${item.name || '未命名对话'}”？`,
        success: async (res) => {
          if (!res.confirm) return

          try {
            await deleteConversation(item.id)
            conversations.value = conversations.value.filter((conversation) => conversation.id !== item.id)
            if (conversationId.value === item.id) {
              if (conversations.value.length) {
                await loadConversation(conversations.value[0])
              } else {
                hasStartedChat.value = false
                conversationId.value = ''
                messages.value = []
              }
            }
          } catch (error) {
            uni.showToast({
              title: error.message || '删除失败',
              icon: 'none',
            })
          }
        },
      })
    }

    const openRenameDialog = (item) => {
      if (showProtocolModal.value) return
      activeConversationMenuId.value = ''
      renameTarget.value = item
      renameName.value = item.name || ''
      showRenameModal.value = true
    }

    const closeRenameDialog = () => {
      if (renameSaving.value) return
      showRenameModal.value = false
      renameTarget.value = null
      renameName.value = ''
    }

    const submitRename = async () => {
      if (showProtocolModal.value) return
      const nextName = renameName.value.trim()
      if (!renameTarget.value || !nextName) return

      renameSaving.value = true
      try {
        await renameConversation(renameTarget.value.id, nextName)
        conversations.value = conversations.value.map((item) => {
          if (item.id === renameTarget.value.id) {
            return {
              ...item,
              name: nextName,
            }
          }
          return item
        })
        closeRenameDialog()
      } catch (error) {
        uni.showToast({
          title: error.message || '重命名失败',
          icon: 'none',
        })
      } finally {
        renameSaving.value = false
      }
    }

    const selectConversation = async (item) => {
      if (showProtocolModal.value || isGenerating.value) return
      await loadConversation(item)
    }

    const toggleConversationMenu = (id) => {
      if (isGenerating.value) return
      activeConversationMenuId.value = activeConversationMenuId.value === id ? '' : id
    }

    const formatMessageTime = (timestamp) => {
      if (!timestamp) return ''
      const ts = String(timestamp).length <= 10 ? Number(timestamp) * 1000 : Number(timestamp)
      if (!ts) return ''
      const date = new Date(ts)
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const hour = String(date.getHours()).padStart(2, '0')
      const minute = String(date.getMinutes()).padStart(2, '0')
      return `${year}-${month}-${day} ${hour}:${minute}`
    }

    const initializePage = async () => {
      if (pageInitialized.value) return
      await loadConversationList(false)
      if (conversations.value.length) {
        await loadConversation(conversations.value[0])
      }
      pageInitialized.value = true
    }

    const loadPageConfig = async () => {
      const result = await getWebappConfig()
      appConfig.value = result || {}
    }

    const ensureProtocolConfirmed = async () => {
      if (getProtocolCache()) {
        return true
      }

      const res = await getUserEventCount(EVENT_CODE_QUERY_PROTOCOL)
      const userCount = Number(res?.userCount || 0)
      if (userCount > 0) {
        setProtocolCache()
        return true
      }

      showProtocolModal.value = true
      return false
    }

    const confirmProtocol = async () => {
      if (protocolSubmitting.value) return
      protocolSubmitting.value = true

      try {
        const res = await addUserEvent(EVENT_CODE_QUERY_PROTOCOL)
        if (res?.isTrue !== true) {
          throw new Error('确认失败，请稍后重试')
        }
        setProtocolCache()
        showProtocolModal.value = false
        await initializePage()
      } catch (error) {
        uni.showToast({
          title: error.message || '确认失败，请稍后重试',
          icon: 'none',
        })
      } finally {
        protocolSubmitting.value = false
      }
    }

    onLoad(async () => {
      const tenantNum = uni.getStorageSync('tenantNum')
      const saToken =
        uni.getStorageSync('sa-token') ||
        uni.getStorageSync('sa_token') ||
        uni.getStorageSync('satoken') ||
        uni.getStorageSync('saToken')

      if (!tenantNum) {
        uni.showModal({
          title: '警告',
          content: '非法访问，请关闭。',
          showCancel: false,
          success() {},
        })
        return
      }

      if (!saToken) {
        loadError.value = '未获取到登录状态，请重新登录后再试'
        return
      }

      try {
        await loadPageConfig()
        const confirmed = await ensureProtocolConfirmed()
        if (!confirmed) return
        await initializePage()
      } catch (error) {
        loadError.value = error.message || '用户协议校验失败，请稍后重试'
        uni.showToast({
          title: loadError.value,
          icon: 'none',
        })
      }
    })

    return {
      activeConversationMenuId,
      appConfig,
      closeDrawer,
      closeRenameDialog,
      confirmProtocol,
      conversationId,
      conversationLoading,
      conversationPanelOpen,
      conversations,
      formatMessageTime,
      hasStartedChat,
      inputText,
      isGenerating,
      loadError,
      loadMoreConversations,
      loadMoreMessages,
      messageLoadingMore,
      messages,
      openDrawer,
      openRenameDialog,
      protocolSubmitting,
      removeConversationItem,
      renameName,
      renameSaving,
      resetChat,
      resetMobileChat,
      scrollIntoView,
      selectConversation,
      sendMessage,
      showMobileConversationDrawer,
      showProtocolModal,
      showRenameModal,
      startNewChat,
      stopGenerating,
      submitRename,
      teacherAvatarUrl,
      teacherDescription,
      teacherName,
      toggleConversationMenu,
      userAvatarUrl,
    }
  },
})
</script>

<style scoped lang="scss">
.improve-page {
  display: flex;
  width: 100%;
  max-width: 480px;
  height: 100vh;
  min-height: 100vh;
  flex-direction: column;
  margin: 0 auto;
  box-sizing: border-box;
  background: #f5f7fb;
  color: #111827;
  overflow: hidden;
}

button {
  padding: 0;
  margin: 0;
  border: 0;
  outline: none;
  line-height: inherit;
}

button::after {
  border: 0;
}

:deep(svg) {
  display: block;
  width: 1em;
  height: 1em;
  stroke: currentColor;
  flex: 0 0 auto;
}

:deep(svg *) {
  vector-effect: non-scaling-stroke;
}

.avatar-image {
  display: block;
  width: 100%;
  height: 100%;
  border-radius: inherit;
}

.improve-layout {
  display: flex;
  flex: 1;
  min-height: 0;
  flex-direction: column;
  gap: 0;
  padding: 0;
  box-sizing: border-box;
  overflow: hidden;
}

.mobile-chat-header {
  position: sticky;
  top: 0;
  z-index: 100;
  display: flex;
  flex-shrink: 0;
  min-height: 64px;
  align-items: flex-start;
  justify-content: space-between;
  padding: 10px 14px 8px;
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

.mobile-brand {
  gap: 8px;
  min-width: 0;
}

.mobile-brand-copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
  justify-content: center;
  gap: 2px;
}

.mobile-brand-avatar {
  width: 28px;
  height: 28px;
  flex: 0 0 28px;
  overflow: hidden;
  border-radius: 999px;
  background: #ffdfbf;
}

.mobile-brand-name {
  overflow: hidden;
  color: #111827;
  font-size: 15px;
  font-weight: 900;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mobile-brand-desc {
  overflow: hidden;
  color: #6b7280;
  font-size: 11px;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mobile-icon-btn,
.mobile-drawer-close {
  display: flex;
  width: 32px;
  height: 32px;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: #f8fafc;
  color: #667085;
}

.mobile-conversation-mask {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: block;
  background: rgba(15, 23, 42, 0.4);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
}

.conversation-panel,
.chat-panel {
  border: 0;
  border-radius: 0;
  background: #ffffff;
  box-shadow: none;
}

.conversation-panel {
  position: fixed;
  display: flex;
  top: 0;
  bottom: 0;
  left: 0;
  z-index: 999;
  width: 280px;
  min-width: 0;
  flex-direction: column;
  overflow: hidden;
  border-right: 1px solid #f3f4f6;
  transform: translateX(-105%);
  transition: transform 0.2s ease;
}

.conversation-panel.open {
  transform: translateX(0);
}

.chat-panel {
  display: flex;
  flex: 1;
  min-width: 0;
  min-height: 0;
  height: 100%;
  flex-direction: column;
  overflow: hidden;
}

.teacher-head {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  border-bottom: 1px solid #f8fafc;
}

.avatar,
.message-avatar,
.start-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.avatar,
.teacher-avatar {
  width: 32px;
  height: 32px;
  flex: 0 0 32px;
  border-radius: 999px;
  background: #ffdfbf;
}

.teacher-copy {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
}

.teacher-name {
  display: block;
  overflow: hidden;
  color: #111827;
  font-size: 15px;
  font-weight: 800;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.teacher-desc {
  display: block;
  overflow: hidden;
  margin-top: 4px;
  color: #98a2b3;
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mobile-drawer-close {
  margin-left: auto;
  background: transparent;
}

.new-chat {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 40px;
  margin: 16px 16px 12px;
  border: 1px solid rgba(37, 99, 235, 0.18);
  border-radius: 12px;
  background: #ffffff;
  color: #2563eb;
  font-size: 13px;
  font-weight: 700;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.03);
}

.new-chat[disabled],
.conversation-item.disabled,
.conversation-item.disabled:hover {
  opacity: 0.45;
  color: #98a2b3;
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
  height: calc(88px + env(safe-area-inset-bottom));
}

.conversation-item {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-height: 42px;
  margin-bottom: 4px;
  padding: 10px 12px;
  border-radius: 12px;
  color: #4b5563;
  transition: background-color 0.15s ease, color 0.15s ease;
}

.conversation-item.active,
.conversation-item:hover {
  color: #2563eb;
  background: #eef4ff;
}

.conversation-item.menu-open {
  z-index: 80;
}

.conversation-text {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 4px;
}

.conversation-title-row {
  display: flex;
  min-width: 0;
  align-items: center;
}

.conversation-title {
  min-width: 0;
  overflow: hidden;
  color: inherit;
  font-size: 14px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.conversation-time {
  display: block;
  overflow: hidden;
  color: #98a2b3;
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.conversation-action {
  position: relative;
  z-index: 20;
  flex: 0 0 auto;
}

.menu-trigger {
  display: flex;
  width: 26px;
  height: 26px;
  align-items: center;
  justify-content: center;
  gap: 2px;
  padding: 0;
  border-radius: 8px;
  background: #f3f4f6;
  opacity: 1;
  transition: opacity 0.15s ease, background-color 0.15s ease;
}

.conversation-item:hover .menu-trigger,
.menu-trigger.visible {
  opacity: 1;
}

.conversation-item.active .menu-trigger {
  background: #dbeafe;
}

.menu-trigger .menu-dot {
  width: 3px;
  height: 3px;
  border-radius: 999px;
  background: #667085;
}

.conversation-menu-mask {
  position: fixed;
  inset: 0;
  z-index: 60;
}

.conversation-menu {
  position: absolute;
  top: 30px;
  right: 0;
  z-index: 80;
  width: 132px;
  padding: 6px 0;
  border: 1px solid #eef2f7;
  border-radius: 12px;
  background: #ffffff;
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.1);
}

.menu-item {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 10px;
  height: 36px;
  padding: 0 14px;
  background: transparent;
  color: #344054;
  font-size: 13px;
  font-weight: 500;
  text-align: left;
}

.menu-item.danger {
  color: #e11d48;
}

.start-card {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  height: 100%;
  flex-direction: column;
  min-height: 100%;
  padding: 24px 24px 32px;
  box-sizing: border-box;
  text-align: center;
}

.start-icon {
  width: 56px;
  height: 56px;
  margin-bottom: 12px;
  border-radius: 16px;
  background: #ffdfbf;
  box-shadow: 0 14px 32px rgba(37, 99, 235, 0.12);
}

.start-icon-img {
  width: 100%;
  height: 100%;
}

.start-title {
  color: #111827;
  font-size: 22px;
  font-weight: 900;
}

.start-desc {
  max-width: 320px;
  margin-top: 8px;
  color: #667085;
  font-size: 16px;
  font-weight: 700;
  line-height: 1.7;
}

.start-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  max-width: 240px;
  height: 44px;
  margin-top: 20px;
  border-radius: 12px;
  background: #2563eb;
  color: #ffffff;
  font-size: 14px;
  font-weight: 800;
  text-align: center;
  box-shadow: 0 8px 18px rgba(37, 99, 235, 0.2);
}

.chat-shell {
  display: flex;
  flex: 1;
  height: 100%;
  min-height: 0;
  flex-direction: column;
  overflow: hidden;
}

.messages {
  flex: 1;
  height: 0;
  min-height: 0;
  padding: 18px 14px 12px;
  box-sizing: border-box;
  overflow: hidden;
}

.message-row {
  display: flex;
  gap: 12px;
  margin-bottom: 18px;
}

.message-row.user {
  flex-direction: row-reverse;
}

.message-avatar {
  width: 44px;
  height: 44px;
  flex: 0 0 44px;
  border-radius: 999px;
  background: #111827;
  color: #ffffff;
  font-size: 14px;
  font-weight: 700;
}

.message-avatar.assistant {
  background: #ffdfbf;
  color: #111827;
}

.message-bubble {
  min-width: 0;
  max-width: 82%;
  padding: 10px 12px;
  border-radius: 16px;
  background: #ffffff;
  color: #111827;
  font-size: 15px;
  line-height: 1.7;
}

.message-row.user .message-bubble {
  background: #95ec69;
  color: #353535;
  border-top-right-radius: 6px;
}

.message-row:not(.user) .message-bubble {
  border-top-left-radius: 6px;
  border: 1px solid #e5e7eb;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.04);
}

.streaming-dot {
  display: inline-block;
  width: 6px;
  height: 18px;
  margin-top: 8px;
  border-radius: 999px;
  background: #94a3b8;
  animation: pulse 1s infinite;
}

.message-time {
  display: block;
  margin-top: 8px;
  color: #9ca3af;
  font-size: 11px;
}

.messages-bottom-spacer {
  height: 24px;
}

.messages-bottom-spacer.generating {
  height: 24px;
}

.composer {
  position: relative;
  flex-shrink: 0;
  padding: 10px 12px calc(10px + env(safe-area-inset-bottom));
  border-top: 1px solid #f3f4f6;
  background: #ffffff;
}

.stop-floating {
  display: flex;
  justify-content: center;
  margin-bottom: 12px;
}

.stop-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 34px;
  padding: 0 14px;
  border-radius: 999px;
  background: #eef4ff;
  color: #2563eb;
  font-size: 12px;
  font-weight: 700;
}

.composer-inner {
  display: flex;
  max-width: 920px;
  min-height: 52px;
  align-items: center;
  gap: 8px;
  margin: 0 auto;
  padding: 6px 6px 6px 12px;
  border: 1px solid transparent;
  border-radius: 16px;
  background: #f8fafc;
  box-shadow: inset 0 0 0 1px rgba(226, 232, 240, 0.8);
  transition: box-shadow 0.15s ease, border-color 0.15s ease, background-color 0.15s ease;
}

.composer-inner.empty {
  background: #fbfcfe;
}

.composer-inner:focus-within {
  border-color: rgba(37, 99, 235, 0.18);
  background: #ffffff;
  box-shadow:
    inset 0 0 0 1px rgba(37, 99, 235, 0.08),
    0 0 0 3px rgba(37, 99, 235, 0.08);
}

.composer-input-wrap {
  position: relative;
  flex: 1;
  min-width: 0;
}

.composer-input {
  width: 100%;
  min-height: 36px;
  max-height: 120px;
  padding: 8px 0;
  box-sizing: border-box;
  border: 0;
  background: transparent;
  color: #1f2937;
  font-size: 15px;
  font-weight: 500;
  line-height: 20px;
}

.composer-placeholder {
  position: absolute;
  top: 8px;
  left: 0;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  max-width: calc(100% - 8px);
  pointer-events: none;
}

.composer-placeholder-dot {
  width: 8px;
  height: 8px;
  flex: 0 0 8px;
  border-radius: 999px;
  background: rgba(37, 99, 235, 0.5);
}

.composer-placeholder-text {
  overflow: hidden;
  color: #94a3b8;
  font-size: 14px;
  font-weight: 600;
  line-height: 20px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.send-btn {
  display: flex;
  width: 36px;
  height: 36px;
  align-items: center;
  justify-content: center;
  flex: 0 0 36px;
  border-radius: 999px;
  background: #2563eb;
  color: #ffffff;
  box-shadow: 0 10px 20px rgba(37, 99, 235, 0.2);
}

.send-btn:active {
  transform: scale(0.96);
}

.send-btn[disabled],
.new-chat[disabled],
.start-btn[disabled],
.protocol-confirm-btn[disabled],
.rename-btn[disabled],
.mobile-icon-btn[disabled] {
  opacity: 0.5;
}

.loading-text,
.empty-block,
.load-error {
  padding: 20px 16px;
  color: #667085;
  font-size: 13px;
  text-align: center;
}

.load-error {
  margin-bottom: 12px;
  border-radius: 12px;
  background: #fff1f2;
  color: #be123c;
}

.modal-mask {
  position: fixed;
  inset: 0;
  z-index: 90;
  background: rgba(15, 23, 42, 0.36);
}

.rename-modal {
  position: fixed;
  top: 50%;
  left: 50%;
  z-index: 100;
  width: calc(100vw - 32px);
  max-width: 448px;
  padding: 18px;
  box-sizing: border-box;
  border-radius: 18px;
  background: #ffffff;
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.18);
  transform: translate(-50%, -50%);
}

.rename-head {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.rename-icon {
  display: flex;
  width: 36px;
  height: 36px;
  align-items: center;
  justify-content: center;
  flex: 0 0 36px;
  border-radius: 12px;
  background: #eef4ff;
  color: #2563eb;
}

.rename-copy {
  display: flex;
  flex-direction: column;
}

.rename-title {
  color: #111827;
  font-size: 18px;
  font-weight: 800;
}

.rename-subtitle {
  margin-top: 4px;
  color: #98a2b3;
  font-size: 12px;
  line-height: 1.5;
}

.rename-input {
  width: 100%;
  height: 42px;
  margin-top: 18px;
  padding: 0 14px;
  box-sizing: border-box;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #f8fafc;
  color: #111827;
  font-size: 14px;
}

.rename-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 18px;
}

.rename-btn {
  height: 40px;
  padding: 0 16px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 800;
}

.rename-btn.cancel {
  background: #f3f4f6;
  color: #667085;
}

.rename-btn.confirm {
  background: #2563eb;
  color: #ffffff;
}

.protocol-mask {
  position: fixed;
  inset: 0;
  z-index: 120;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  box-sizing: border-box;
  background: rgba(15, 23, 42, 0.48);
}

.protocol-dialog {
  width: 100%;
  max-height: calc(100vh - 48px);
  padding: 18px;
  box-sizing: border-box;
  border: 1px solid #e5e7eb;
  border-radius: 20px;
  background: #ffffff;
  box-shadow: 0 24px 80px rgba(15, 23, 42, 0.16);
}

.protocol-header {
  display: flex;
  align-items: center;
  gap: 10px;
}

.protocol-header-icon {
  color: #2563eb;
}

.protocol-title {
  color: #111827;
  font-size: 20px;
  font-weight: 800;
}

.protocol-content {
  height: 58vh;
  margin-top: 18px;
}

.protocol-highlight {
  padding: 18px;
  border: 1px solid #dbeafe;
  border-radius: 18px;
  background: #f8fbff;
}

.protocol-paragraph {
  display: block;
  color: #334155;
  font-size: 15px;
  line-height: 1.8;
}

.protocol-paragraph + .protocol-paragraph {
  margin-top: 10px;
}

.protocol-paragraph-strong,
.protocol-emphasis {
  color: #111827;
  font-weight: 700;
}

.protocol-section {
  margin-top: 18px;
}

.protocol-section-title {
  display: block;
  margin-bottom: 12px;
  color: #111827;
  font-size: 15px;
  font-weight: 800;
}

.protocol-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.protocol-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  border: 1px solid #eef2f7;
  border-radius: 16px;
  background: #ffffff;
}

.protocol-item-index {
  display: inline-flex;
  width: 24px;
  height: 24px;
  align-items: center;
  justify-content: center;
  flex: 0 0 24px;
  border-radius: 999px;
  background: #dbeafe;
  color: #2563eb;
  font-size: 12px;
  font-weight: 800;
}

.protocol-item-text {
  flex: 1;
  color: #334155;
  font-size: 12px;
  line-height: 1.2;
}

.protocol-footer-note {
  margin-top: 18px;
  padding: 16px 18px;
  border-radius: 16px;
  background: #111827;
}

.protocol-footer-note-text {
  display: block;
  color: rgba(255, 255, 255, 0.92);
  font-size: 14px;
  line-height: 1.75;
}

.protocol-actions {
  margin-top: 18px;
  padding-top: 16px;
  border-top: 1px solid #eef2f7;
}

.protocol-confirm-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 44px;
  border-radius: 12px;
  background: #2563eb;
  color: #ffffff;
  font-size: 14px;
  font-weight: 800;
  text-align: center;
}

:deep(.message-row.user .markdown-renderer),
:deep(.message-row.user .markdown-body),
:deep(.message-row.user .markdown-body p),
:deep(.message-row.user .markdown-body li) {
  color: #353535;
}

:deep(.message-row:not(.user) .markdown-renderer),
:deep(.message-row:not(.user) .markdown-body),
:deep(.message-row:not(.user) .markdown-body p),
:deep(.message-row:not(.user) .markdown-body li) {
  color: #111827;
}

@supports (min-height: 100dvh) {
  .improve-page {
    height: 100dvh;
    min-height: 100dvh;
  }
}

@keyframes pulse {
  0%,
  100% {
    opacity: 0.35;
  }
  50% {
    opacity: 1;
  }
}
</style>
