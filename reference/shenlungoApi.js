import { ApiBaseUrl, TenantNum, ShenlungoScoreDifyAppId, ShenlungoScoreGkDifyAppId, ShenlungoOcrDifyAppId, ShenlungoImproveDifyAppId, AesKey, AesIv } from '@/config'
import CryptoJS from 'crypto-js'

export const SCORE_DIFY_APP_ID = ShenlungoScoreDifyAppId
export const SCORE_GK_DIFY_APP_ID = ShenlungoScoreGkDifyAppId
export const OCR_DIFY_APP_ID = ShenlungoOcrDifyAppId
export const IMPROVE_DIFY_APP_ID = ShenlungoImproveDifyAppId

const JSON_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8'
}

function getTenantNum() {
  return uni.getStorageSync('tenantNum') || TenantNum
}

function getToken() {
  return uni.getStorageSync('sa-token') || ''
}

function encryptPassword(password) {
  const key = CryptoJS.enc.Base64.parse(AesKey)
  const iv = CryptoJS.enc.Base64.parse(AesIv)
  const encrypted = CryptoJS.AES.encrypt(CryptoJS.enc.Utf8.parse(password), key, {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7
  })
  return encrypted.toString()
}

function getHeaders() {
  return {
    ...JSON_HEADERS,
    'X-TENANT-NUM': getTenantNum(),
    satoken: getToken()
  }
}

function normalizePath(path) {
  return path.startsWith('/') ? path : `/${path}`
}

function handleAuthExpired() {
  uni.showToast({
    title: '登录已过期，请重新登录~',
    duration: 2000,
    icon: 'none'
  })
  uni.removeStorageSync('sa-token')
  uni.reLaunch({
    url: '/pages/index/index'
  })
}

function createRequestError(code, message) {
  const error = new Error(message || '请求失败')
  error.code = code
  return error
}

function formatRequestErrorMessage(code, fallbackMessage) {
  if (code === 'STM0002') {
    return '当前任务已处理完成，请前往历史记录列表查看结果。'
  }
  return fallbackMessage || '请求失败'
}

function requestJson(path, data = {}, options = {}) {
  const { requireAuth = true, headers: extraHeaders = {}, silentError = false } = options

  const header = {
    ...JSON_HEADERS,
    'X-TENANT-NUM': getTenantNum(),
    ...(requireAuth ? { satoken: getToken() } : {}),
    ...extraHeaders
  }

  return new Promise((resolve, reject) => {
    uni.request({
      url: ApiBaseUrl + normalizePath(path),
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
          reject(createRequestError(body.code, body.message || '登录已过期'))
          return
        }
        if (!silentError) {
          uni.showToast({
            title: body.message || '请求失败',
            duration: 2000,
            icon: 'none'
          })
        }
        reject(createRequestError(body.code, body.message || '请求失败'))
      },
      fail: (err) => {
        if (!silentError) {
          uni.showToast({
            title: '服务出了小差错,请稍后重试~',
            duration: 2000,
            icon: 'none'
          })
        }
        reject(createRequestError(null, err.errMsg || '网络请求失败'))
      }
    })
  })
}

function parseSseChunk(rawChunk, onEvent) {
  const lines = rawChunk.split(/\r?\n/)
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

async function postJsonWithFetch(path, data, { signal } = {}) {
  const response = await fetch(ApiBaseUrl + normalizePath(path), {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data),
    signal
  })

  const responseText = await response.text()
  let responseBody = {}

  if (responseText) {
    try {
      responseBody = JSON.parse(responseText)
    } catch (error) {
      if (!response.ok) {
        throw createRequestError(null, responseText || `请求失败(${response.status})`)
      }
      throw createRequestError(null, '请求失败')
    }
  }

  if (!response.ok) {
    if (responseBody.code === 'AUTH0013') {
      handleAuthExpired()
      throw createRequestError(responseBody.code, responseBody.message || '登录已过期')
    }
    throw createRequestError(
      responseBody.code || null,
      formatRequestErrorMessage(responseBody.code, responseBody.message || `请求失败(${response.status})`)
    )
  }

  if (responseBody.code === 'AUTH0013') {
    handleAuthExpired()
    throw createRequestError(responseBody.code, responseBody.message || '登录已过期')
  }
  if (responseBody.code && responseBody.code !== 'S0000') {
    throw createRequestError(responseBody.code, formatRequestErrorMessage(responseBody.code, responseBody.message || '请求失败'))
  }

  return responseBody.data
}

async function subscribeStream(sessionId, { signal, onEvent, onError } = {}) {
  const response = await fetch(ApiBaseUrl + normalizePath('/sys/stream/subscribe'), {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      sessionId,
      token: getToken()
    }),
    signal
  })

  if (!response.ok) {
    let message = `请求失败(${response.status})`
    try {
      const errorBody = await response.json()
      if (errorBody.code === 'AUTH0013') {
        handleAuthExpired()
        throw createRequestError(errorBody.code, errorBody.message || '登录已过期')
      }
      message = formatRequestErrorMessage(errorBody.code, errorBody.message || message)
    } catch (error) {
      if (error && error.code === 'AUTH0013') throw error
      // The backend may return a plain text stream error.
    }
    throw createRequestError(null, message)
  }

  const contentType = response.headers.get('content-type') || ''
  if (!contentType.includes('text/event-stream')) {
    const body = await response.json()
    if (body.code === 'AUTH0013') {
      handleAuthExpired()
      throw createRequestError(body.code, body.message || '登录已过期')
    }
    if (body.code && body.code !== 'S0000') {
      throw createRequestError(body.code, formatRequestErrorMessage(body.code, body.message || '请求失败'))
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

export async function streamPost(path, data, { signal, onEvent, onError, onSessionCreated } = {}) {
  const sessionData = await postJsonWithFetch(path, data, { signal })
  const sessionId = sessionData && sessionData.sessionId

  if (!sessionId) {
    throw createRequestError(null, '未获取到会话标识')
  }

  onSessionCreated && onSessionCreated(sessionData)

  return subscribeStream(sessionId, { signal, onEvent, onError })
}

export function getAppParameters(difyAppId, province = 'gd') {
  return requestJson('/h5/app/parameters/config', { difyAppId, province })
}

export function getWebappConfig(difyAppId = IMPROVE_DIFY_APP_ID) {
  return requestJson('/h5/app/webapp/config', { difyAppId })
}

export function getWorkflowPage(data = {}) {
  return requestJson('/h5/app/workflow/page', {
    pageSize: 20,
    currentPageNum: 1,
    ...data
  })
}

export function getConversations(data = {}) {
  return requestJson('/h5/app/chatflow/conversations', {
    difyAppId: IMPROVE_DIFY_APP_ID,
    limit: 50,
    sortBy: '-updated_at',
    ...data
  })
}

export function getConversationMessages(data) {
  return requestJson('/h5/app/chatflow/conversations/messages', {
    difyAppId: IMPROVE_DIFY_APP_ID,
    limit: 50,
    ...data
  })
}

export function renameConversation(data) {
  return requestJson('/h5/app/chatflow/conversations/rename', {
    difyAppId: IMPROVE_DIFY_APP_ID,
    autoGenerate: false,
    ...data
  })
}

export function deleteConversation(conversationId) {
  return requestJson('/h5/app/chatflow/conversations/delete', {
    difyAppId: IMPROVE_DIFY_APP_ID,
    conversationId
  })
}

export function stopWorkflow(taskId, difyAppId = SCORE_DIFY_APP_ID) {
  return requestJson('/h5/app/workflow/stop', { difyAppId, taskId })
}

export function stopChat(taskId) {
  return requestJson('/h5/app/chatflow/chat_message/stop', {
    difyAppId: IMPROVE_DIFY_APP_ID,
    taskId
  })
}

export function streamWorkflow({ inputParam, usePoint = 0, difyAppId = SCORE_DIFY_APP_ID, signal, onEvent, onError, onSessionCreated }) {
  return streamPost('/h5/app/workflow/stream', {
    difyAppId,
    usePoint,
    inputParam,
    responseMode: 'streaming'
  }, { signal, onEvent, onError, onSessionCreated })
}

export function streamWorkflowPlain({ inputParam, usePoint = 2, signal, onEvent, onError, onSessionCreated }) {
  return streamPost('/h5/app/workflow/stream/plain', {
    difyAppId: OCR_DIFY_APP_ID,
    usePoint,
    inputParam,
    responseMode: 'streaming'
  }, { signal, onEvent, onError, onSessionCreated })
}

export function streamChatMessage({
  query,
  inputParam,
  usePoint = 1,
  conversationId = '',
  signal,
  onEvent,
  onError,
  onSessionCreated
}) {
  return streamPost('/h5/app/chatflow/chat_message/stream', {
    difyAppId: IMPROVE_DIFY_APP_ID,
    usePoint,
    query,
    inputParam,
    responseMode: 'streaming',
    conversationId,
    autoGenerateName: true
  }, { signal, onEvent, onError, onSessionCreated })
}

export function authGuard() {
  if (getToken()) return true

  uni.reLaunch({ url: '/pages/index/index' })
  return false
}

export function getTenantConfig() {
  return requestJson('/h5/tnt/config/get', {}, { requireAuth: false })
}

export function getQrCodeTicket() {
  return requestJson('/h5/mp/qrcode/tmp/get', {}, { requireAuth: false, silentError: true })
}

export function getSceneQrCodeStatus(key) {
  return requestJson('/h5/mp/qrcode/scan/get', { key }, { requireAuth: false, silentError: true })
}

export function loginByPassword(data) {
  const payload = { ...data }
  if (payload.password) {
    payload.password = encryptPassword(payload.password)
  }
  return requestJson('/h5/mp/auth/loginByPassword', payload, { requireAuth: false, silentError: true })
}

export function loginByWechatCode(data) {
  return requestJson('/h5/mp/auth/wechat_code/login', data, { requireAuth: false, silentError: true })
}

export function checkLoginStatus() {
  return requestJson('/h5/mp/auth/check_login', {}, { silentError: true })
}

export function sendCaptcha(data, timestamp, token) {
  return requestJson('/h5/auth/captcha/send', {
    ...data,
    clientTimestamp: timestamp
  }, {
    requireAuth: false,
    headers: { 'X-TOKEN': token },
    silentError: true
  })
}

export function register(data) {
  const payload = { ...data }
  if (payload.password) {
    payload.password = encryptPassword(payload.password)
  }
  return requestJson('/h5/mp/auth/register', payload, { requireAuth: false, silentError: true })
}

export function bindMobile(data) {
  return requestJson('/h5/mp/auth/bind/mobile', data, { requireAuth: false, silentError: true })
}

export function bindMobileByUser(data) {
  return requestJson('/h5/mp/auth/bind/by_user/mobile', data, { silentError: true })
}

export function skipRegister(data) {
  return requestJson('/h5/mp/auth/offiaccount/register', data, { requireAuth: false, silentError: true })
}

export function resetPassword(data) {
  const payload = { ...data }
  if (payload.password) {
    payload.password = encryptPassword(payload.password)
  }
  return requestJson('/h5/mp/auth/resetPassword', payload, { silentError: true })
}

export function getUserInfo() {
  return requestJson('/h5/mp/user/get')
}

export function getPointsInfo() {
  return requestJson('/h5/mp/auth/getEntitlementsInfo')
}

export function getInviteInfo() {
  return requestJson('/h5/usr/user/invite/get')
}

export function exchangeRedeemCode(data) {
  return requestJson('/h5/mp/auth/exchangeRedeemCode', data)
}

export function difyLogin(difyAppId) {
  return requestJson('/h5/mp/auth/dify/login', { difyAppId })
}

export function getWorkrunRecordPage(data) {
  return requestJson('/h5/mp/auth/dify/workrun/record/page', data)
}

export function getWorkrunRecordDetail(id) {
  return requestJson('/h5/mp/auth/dify/workrun/record/get', { id })
}

export function getWorkrunRecordPageExample(data) {
  return requestJson('/h5/mp/auth/dify/workrun/record/page_example', data)
}

export function getWorkrunRecordDetailExample(id) {
  return requestJson('/h5/mp/auth/dify/workrun/record/get_example', { id })
}

export function getWorkflowProgress(id) {
  return requestJson('/h5/app/workflow/progress/get', { id }, { silentError: true })
}

export function getOssSignUrl(key) {
  return requestJson('/h5/oss/sign/get', { key }, { silentError: true })
}

export function getOssCreatePolicy(fileName) {
  return requestJson('/h5/oss/sign/create_policy/get', {
    fileName,
    expireInSecond: '3600',
    randomName: true,
    folderPaths: 'upload_shenlungo_image'
  }, { silentError: true })
}

export function getPointsRecord(data) {
  return requestJson('/h5/mp/auth/user/point_record/get', data)
}

export function getRechargeConfig() {
  return requestJson('/h5/rch/point/config/get')
}

export function getRechargeRecords(data) {
  return requestJson('/h5/rch/point/record/page', data)
}

export function getWechatScanOrder(data) {
  return requestJson('/h5/ord/order/wechat/scan/get', data, { silentError: true })
}

export function getWechatJsapiOrder(data) {
  return requestJson('/h5/ord/order/wechat/jsapi/get', data)
}

export function checkOrderStatus(data) {
  return requestJson('/h5/ord/order/check/get', data, { silentError: true })
}

export function getWechatOauthUrl(data) {
  return requestJson('/h5/mp/auth/yungouos/jsapi/oauth_url/get', data)
}

export function getOpenIdByCode(data) {
  return requestJson('/h5/mp/auth/yungouos/oauth_code/get', data)
}

// ---------------- 套卷 (Essay Exam) ----------------

export function getEssayGroupList() {
  return requestJson('/h5/essay/exam/group/list')
}

export function getEssayGroupDetailPage(data) {
  return requestJson('/h5/essay/exam/group/detail/page', data)
}

export function getEssayGroupDetail(data) {
  return requestJson('/h5/essay/exam/group/detail/get', data)
}

export function getEssayQuestionContent(data) {
  return requestJson('/h5/app/essay/exam/question/content/get', data, { silentError: true })
}

export function getEssayRecordPage(data) {
  return requestJson('/h5/essay/exam/group/record/page', data)
}

export function initEssayRecord(data) {
  return requestJson('/h5/essay/exam/group/record/init', data)
}

export function updateEssayRecord(data) {
  return requestJson('/h5/essay/exam/group/record/update', data)
}

export function getEssayRecordDetail(data) {
  return requestJson('/h5/essay/exam/group/record/get', data)
}

export function getEssayRecordDetailExample(data) {
  return requestJson('/h5/essay/exam/group/record/get_example', data)
}

export function getEssayRecordPageExample(data) {
  return requestJson('/h5/essay/exam/group/record/page_example', data)
}

export function checkUserFirstLogin(data) {
  return requestJson('/h5/app/user/first_tip/check', data)
}

export function streamSubmitEssayRecord({ userEssayExamGroupRecordId, difyAppId = SCORE_DIFY_APP_ID, signal, onEvent, onError, onSessionCreated }) {
  return streamPost('/h5/essay/exam/group/record/submit', {
    userEssayExamGroupRecordId,
    difyAppId
  }, { signal, onEvent, onError, onSessionCreated })
}

export function getEssayRecordStatus(data) {
  return requestJson('/h5/essay/exam/group/record/status/get', data)
}

export function reportStatsEvent(data) {
  const userId = uni.getStorageSync('user_id')
  if (Number(userId) === 2) {
    return Promise.resolve(null)
  }
  return requestJson('/h5/stats/event/report', data, { silentError: true })
}
