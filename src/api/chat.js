import CryptoJS from 'crypto-js'
import { apiBaseUrl, difyAppId as envDifyAppId } from '../config'
import { request as httpRequest } from '../utils/request'

const JSON_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
}

function getTenantNumFromStorage() {
  return uni.getStorageSync('tenantNum') || ''
}

function getDifyAppId() {
  return uni.getStorageSync('difyAppId') || envDifyAppId || ''
}

function getSaToken() {
  return (
    uni.getStorageSync('sa-token') ||
    uni.getStorageSync('sa_token') ||
    uni.getStorageSync('satoken') ||
    uni.getStorageSync('saToken') ||
    ''
  )
}

function buildAnonymousTenantHeader(tenantNum, extraHeader = {}) {
  return {
    ...JSON_HEADERS,
    'X-TENANT-NUM': tenantNum || getTenantNumFromStorage(),
    ...extraHeader,
  }
}

function ensureSaToken() {
  const saToken = getSaToken()
  if (!saToken) {
    throw createRequestError('未获取到登录令牌，请重新登录', 'AUTH_REQUIRED')
  }
  return saToken
}

function buildAuthorizedTenantHeader(tenantNum, extraHeader = {}) {
  return {
    ...buildAnonymousTenantHeader(tenantNum, extraHeader),
    satoken: ensureSaToken(),
  }
}

function showErrorToast(message) {
  uni.showToast({
    title: message || '请求失败',
    duration: 2000,
    icon: 'none',
  })
}

async function requestData(options = {}, requestOptions = {}) {
  const { silentError = false, allowCodes = [] } = requestOptions
  const response = await httpRequest(options)
  const body = response?.data || {}
  const code = body.code || ''
  const message = body.message || '请求失败'

  if (code === 'S0000') {
    return body.data || {}
  }

  if (allowCodes.includes(code)) {
    return body
  }

  if (!silentError) {
    showErrorToast(message)
  }

  throw createRequestError(message, code)
}

export function getTenantConfig(tenantNum) {
  return requestData({
    url: '/h5/tnt/config/get',
    method: 'POST',
    data: {},
    header: buildAnonymousTenantHeader(tenantNum),
    withAuth: false,
  })
}

export function checkLogin(tenantNum) {
  return requestData({
    url: '/h5/mp/auth/check_login',
    method: 'POST',
    data: {},
    header: buildAnonymousTenantHeader(tenantNum),
  })
}

export function loginByWechat(code, tenantNum) {
  return requestData({
    url: '/h5/mp/auth/login/token',
    method: 'POST',
    data: {
      code,
      difyAppId: getDifyAppId(),
      wechatType: 1,
    },
    header: buildAnonymousTenantHeader(tenantNum),
    withAuth: false,
  }, {
    allowCodes: ['00001'],
    silentError: true,
  })
}

export function testLogin(userId = 1, tenantNum) {
  return requestData({
    url: '/h5/auth/test/login/token',
    method: 'POST',
    data: {
      userId,
    },
    header: buildAnonymousTenantHeader(tenantNum),
    withAuth: false,
  })
}

export function sendCaptcha(mobile, tenantNum) {
  const timestamp = new Date().getTime().toString()
  const token = CryptoJS.MD5(mobile + timestamp).toString().toUpperCase()

  return requestData({
    url: '/h5/auth/captcha/send',
    method: 'POST',
    data: {
      mobile,
      sceneType: 1,
      clientTimestamp: timestamp,
    },
    header: buildAnonymousTenantHeader(tenantNum, {
      'X-TOKEN': token,
    }),
    withAuth: false,
  })
}

export function bindMobile(mobile, captcha, wechatCode, tenantNum) {
  return requestData({
    url: '/h5/auth/mobile/bind/token',
    method: 'POST',
    data: {
      mobile,
      difyAppId: getDifyAppId(),
      captcha,
      wechatType: 1,
      wechatCode,
    },
    header: buildAnonymousTenantHeader(tenantNum),
    withAuth: false,
  })
}

export function getWebappConfig() {
  return requestJson('/h5/app/webapp/config', {
    difyAppId: getDifyAppId(),
  })
}

function normalizePath(path) {
  return path.startsWith('/') ? path : `/${path}`
}

function createRequestError(message, code) {
  const error = new Error(message || '请求失败')
  error.code = code || ''
  return error
}

function formatRequestErrorMessage(code, fallbackMessage) {
  if (code === 'STM0002') {
    return '当前任务已处理完成，请前往历史记录列表查看结果。'
  }
  return fallbackMessage || '请求失败'
}

function handleAuthExpired() {
  showErrorToast('登录已过期，请重新登录')
  uni.removeStorageSync('sa-token')
  uni.removeStorageSync('wechatAvatarUrl')
  uni.reLaunch({
    url: '/pages/index/index',
  })
}

function requestJson(path, data = {}, options = {}) {
  const { requireAuth = true, tenantNum, headers: extraHeaders = {}, silentError = false } = options
  const header = requireAuth
    ? buildAuthorizedTenantHeader(tenantNum, extraHeaders)
    : buildAnonymousTenantHeader(tenantNum, extraHeaders)

  return new Promise((resolve, reject) => {
    uni.request({
      url: `${apiBaseUrl}${normalizePath(path)}`,
      method: 'POST',
      data,
      header,
      success: (res) => {
        const body = res.data || {}
        if (body.code === 'S0000') {
          resolve(body.data)
          return
        }
        if (body.code === 'AUTH0013') {
          handleAuthExpired()
          reject(createRequestError(body.message || '登录已过期', body.code))
          return
        }
        if (!silentError) {
          uni.showToast({
            title: body.message || '请求失败',
            duration: 2000,
            icon: 'none',
          })
        }
        reject(createRequestError(body.message || '请求失败', body.code))
      },
      fail: (err) => {
        if (!silentError) {
          uni.showToast({
            title: '服务出了小差错,请稍后重试',
            duration: 2000,
            icon: 'none',
          })
        }
        reject(createRequestError(err.errMsg || '网络请求失败'))
      },
    })
  })
}

async function postJsonWithFetch(path, data, { signal } = {}) {
  const response = await fetch(`${apiBaseUrl}${normalizePath(path)}`, {
    method: 'POST',
    headers: buildAuthorizedTenantHeader(),
    body: JSON.stringify(data),
    signal,
  })

  const responseText = await response.text()
  let responseBody = {}

  if (responseText) {
    try {
      responseBody = JSON.parse(responseText)
    } catch (error) {
      if (!response.ok) {
        throw createRequestError(responseText || `请求失败(${response.status})`)
      }
      throw createRequestError('请求失败')
    }
  }

  if (!response.ok) {
    if (responseBody.code === 'AUTH0013') {
      handleAuthExpired()
      throw createRequestError(responseBody.message || '登录已过期', responseBody.code)
    }
    throw createRequestError(
      formatRequestErrorMessage(responseBody.code, responseBody.message || `请求失败(${response.status})`),
      responseBody.code,
    )
  }

  if (responseBody.code === 'AUTH0013') {
    handleAuthExpired()
    throw createRequestError(responseBody.message || '登录已过期', responseBody.code)
  }
  if (responseBody.code && responseBody.code !== 'S0000') {
    throw createRequestError(
      formatRequestErrorMessage(responseBody.code, responseBody.message || '请求失败'),
      responseBody.code,
    )
  }

  return responseBody.data
}

function parseSseChunk(chunk, onEvent) {
  const lines = chunk.split(/\r?\n/)
  const dataLines = lines
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.replace(/^data:\s?/, ''))

  if (!dataLines.length) return

  const payload = dataLines.join('\n').trim()
  if (!payload || payload === '[DONE]') return

  try {
    onEvent(JSON.parse(payload))
  } catch (error) {
    console.warn('SSE chunk parse failed:', payload, error)
  }
}

async function subscribeStream(sessionId, { signal, onEvent, onError } = {}) {
  const response = await fetch(`${apiBaseUrl}${normalizePath('/sys/stream/subscribe')}`, {
    method: 'POST',
    headers: buildAuthorizedTenantHeader(),
    body: JSON.stringify({
      sessionId,
      token: ensureSaToken(),
    }),
    signal,
  })

  if (!response.ok) {
    let message = `请求失败(${response.status})`
    try {
      const errorBody = await response.json()
      if (errorBody.code === 'AUTH0013') {
        handleAuthExpired()
        throw createRequestError(errorBody.message || '登录已过期', errorBody.code)
      }
      message = formatRequestErrorMessage(errorBody.code, errorBody.message || message)
    } catch (error) {
      if (error && error.code === 'AUTH0013') throw error
    }
    throw createRequestError(message)
  }

  const contentType = response.headers.get('content-type') || ''
  if (!contentType.includes('text/event-stream')) {
    const body = await response.json()
    if (body.code === 'AUTH0013') {
      handleAuthExpired()
      throw createRequestError(body.message || '登录已过期', body.code)
    }
    if (body.code && body.code !== 'S0000') {
      throw createRequestError(formatRequestErrorMessage(body.code, body.message || '请求失败'), body.code)
    }
    return body.data
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder('utf-8')
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const chunks = buffer.split(/\n\n|\r\n\r\n/)
      buffer = chunks.pop() || ''

      chunks.forEach((chunk) => parseSseChunk(chunk, onEvent))
    }

    if (buffer.trim()) {
      parseSseChunk(buffer, onEvent)
    }
  } catch (error) {
    if (error.name !== 'AbortError') {
      onError && onError(error)
      throw error
    }
  }
}

async function streamPost(path, data, { signal, onEvent, onError, onSessionCreated } = {}) {
  const sessionData = await postJsonWithFetch(path, data, { signal })
  const sessionId = sessionData && sessionData.sessionId

  if (!sessionId) {
    throw createRequestError('未获取到会话标识')
  }

  onSessionCreated && onSessionCreated(sessionData)

  return subscribeStream(sessionId, { signal, onEvent, onError })
}

export async function getConversations(params = {}) {
  const data = await requestJson('/h5/app/chatflow/conversations', {
    difyAppId: getDifyAppId(),
    limit: params.limit || 50,
    sortBy: params.sortBy || '-updated_at',
    lastId: params.lastId || '',
  })

  return {
    data: Array.isArray(data?.data) ? data.data : [],
    hasMore: data?.hasMore === true || data?.has_more === true,
  }
}

export async function getConversationMessages(params = {}) {
  const data = await requestJson('/h5/app/chatflow/conversations/messages', {
    difyAppId: getDifyAppId(),
    conversationId: params.conversationId || '',
    firstId: params.firstId || '',
    limit: params.limit || 50,
  })

  return {
    data: Array.isArray(data?.data) ? data.data : [],
    hasMore: data?.hasMore === true || data?.has_more === true,
  }
}

export function renameConversation(conversationId, name) {
  return requestJson('/h5/app/chatflow/conversations/rename', {
    difyAppId: getDifyAppId(),
    conversationId,
    name,
    autoGenerate: false,
  })
}

export function deleteConversation(conversationId) {
  return requestJson('/h5/app/chatflow/conversations/delete', {
    difyAppId: getDifyAppId(),
    conversationId,
  })
}

export function stopChatMessage(taskId) {
  return requestJson('/h5/app/chatflow/chat_message/stop', {
    difyAppId: getDifyAppId(),
    taskId,
  })
}

export async function streamChatMessage({
  query,
  conversationId = '',
  inputs = {},
  signal,
  onEvent,
  onError,
  onSessionCreated,
}) {
  return streamPost(
    '/h5/app/chatflow/chat_message/stream',
    {
      difyAppId: getDifyAppId(),
      usePoint: 1,
      query,
      inputParam: inputs,
      responseMode: 'streaming',
      conversationId,
      autoGenerateName: true,
    },
    { signal, onEvent, onError, onSessionCreated },
  )
}

function buildUserEventHeader() {
  return buildAuthorizedTenantHeader()
}

export function addUserEvent(eventCode) {
  return requestData({
    url: '/h5/usr/user/event/add',
    method: 'POST',
    data: {
      eventCode,
    },
    header: buildUserEventHeader(),
  })
}

export function getUserEventCount(eventCode) {
  return requestData({
    url: '/h5/usr/user/event/count/get',
    method: 'POST',
    data: {
      eventCode,
    },
    header: buildUserEventHeader(),
  })
}
