<template>
  <view class="login-page">
    <view class="login-card">
      <view class="login-avatar">
        <image class="login-avatar-image" :src="teacherAvatarUrl" mode="aspectFill"></image>
      </view>
      <text class="login-title">琳萌姐姐</text>
      <text class="login-desc">登录后即可继续和琳萌姐姐对话</text>

      <button
        class="wechat-login-btn"
        :disabled="loginSubmitting"
        @tap="handleWechatLogin"
      >
        {{ loginSubmitting ? '登录中...' : '微信登录' }}
      </button>
    </view>
  </view>
</template>

<script>
import { defineComponent, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { getTenantConfig, loginByWechat, testLogin } from '../../api/chat'
import { appEnv, difyAppId as envDifyAppId, tenantNum as envTenantNum } from '../../config'

export default defineComponent({
  setup() {
    const teacherAvatarUrl = 'https://dify-goaigs-other.oss-cn-guangzhou.aliyuncs.com/linmeng-logo.jpeg'
    const loginSubmitting = ref(false)
    const currentTenantNum = ref(uni.getStorageSync('tenantNum') || envTenantNum || '')
    const currentDifyAppId = ref(uni.getStorageSync('difyAppId') || envDifyAppId || '')

    const cacheAuthState = (data) => {
      const authToken = data?.token || ''
      if (authToken) {
        uni.setStorageSync('sa-token', authToken)
      }
      if (data?.userId !== undefined) {
        uni.setStorageSync('userId', data.userId)
      }
      if (data?.userMobile) {
        uni.setStorageSync('userMobile', data.userMobile)
      }
      if (data?.wechatAvatarUrl) {
        uni.setStorageSync('wechatAvatarUrl', data.wechatAvatarUrl)
      }
    }

    const redirectToChat = () => {
      uni.reLaunch({
        url: '/pages/chat-ai/index',
      })
    }

    const redirectToBind = () => {
      uni.reLaunch({
        url: '/pages/bind/index',
      })
    }

    const syncLoginParams = (options = {}) => {
      if (options.tenantNum) {
        currentTenantNum.value = options.tenantNum
      }

      if (options.difyAppId) {
        currentDifyAppId.value = options.difyAppId
      }

      if (currentTenantNum.value) {
        uni.setStorageSync('tenantNum', currentTenantNum.value)
      }

      if (currentDifyAppId.value) {
        uni.setStorageSync('difyAppId', currentDifyAppId.value)
      }
    }

    const buildQuery = () => {
      const query = []
      if (currentTenantNum.value) {
        query.push(`tenantNum=${encodeURIComponent(currentTenantNum.value)}`)
      }
      if (currentDifyAppId.value) {
        query.push(`difyAppId=${encodeURIComponent(currentDifyAppId.value)}`)
      }
      return query.length ? `?${query.join('&')}` : ''
    }

    const getLoginRedirectUrl = () => {
      if (typeof window === 'undefined') {
        return ''
      }

      const routerBase = window.__uniConfig?.router?.base || '/'
      const normalizedBase = routerBase.endsWith('/') ? routerBase : `${routerBase}/`
      return `${window.location.origin}${normalizedBase}pages/login/index${buildQuery()}`
    }

    const loginByWechatCode = async (code) => {
      uni.setStorageSync('wechatCode', code)

      const result = await loginByWechat(code, currentTenantNum.value)
      if (result?.code === '00001') {
        uni.showModal({
          title: '提示',
          content: '请点击右下角“使用完整服务”。',
          showCancel: false,
        })
        return true
      }

      const data = result || {}
      if (Number(data?.userId) === 0) {
        redirectToBind()
        return true
      }

      cacheAuthState(data)
      redirectToChat()
      return true
    }

    const loginByDevelopmentMode = async () => {
      const data = await testLogin(1, currentTenantNum.value)
      if (data?.token) {
        cacheAuthState(data)
        redirectToChat()
        return true
      }
      return false
    }

    const handleWechatLogin = async () => {
      if (loginSubmitting.value) {
        return
      }

      loginSubmitting.value = true

      try {
        if (appEnv === 'development') {
          await loginByDevelopmentMode()
          return
        }

        const data = await getTenantConfig(currentTenantNum.value)
        const wechatOffiaccountAppid = data.wechatOffiaccountAppid || ''
        const redirectUrl = encodeURIComponent(getLoginRedirectUrl())

        window.location.href = `https://open.weixin.qq.com/connect/oauth2/authorize?appid=${wechatOffiaccountAppid}&redirect_uri=${redirectUrl}&response_type=code&scope=snsapi_userinfo&state=STATE#wechat_redirect`
      } catch (e) {
        console.log(e)
      } finally {
        loginSubmitting.value = false
      }
    }

    onLoad(async (options) => {
      syncLoginParams(options)

      if (!options.code) {
        return
      }

      loginSubmitting.value = true

      try {
        await loginByWechatCode(options.code)
      } catch (e) {
        console.log(e)
      } finally {
        loginSubmitting.value = false
      }
    })

    return {
      teacherAvatarUrl,
      loginSubmitting,
      handleWechatLogin,
    }
  },
})
</script>

<style scoped lang="scss">
.login-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 32px 24px;
  box-sizing: border-box;
  background: #f8fafc;
}

.login-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  max-width: 360px;
  padding: 36px 28px 32px;
  box-sizing: border-box;
  border: 1px solid #e5e7eb;
  border-radius: 24px;
  background: #ffffff;
}

.login-avatar {
  width: 88px;
  height: 88px;
  overflow: hidden;
  border-radius: 50%;
  background: #f1f5f9;
}

.login-avatar-image {
  display: block;
  width: 100%;
  height: 100%;
}

.login-title {
  margin-top: 18px;
  color: #111827;
  font-size: 24px;
  font-weight: 700;
  line-height: 1.3;
}

.login-desc {
  margin-top: 10px;
  color: #64748b;
  font-size: 14px;
  line-height: 1.7;
  text-align: center;
}

.wechat-login-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 48px;
  margin-top: 28px;
  border-radius: 14px;
  background: #16a34a;
  color: #ffffff;
  font-size: 16px;
  font-weight: 700;
  text-align: center;
}

.wechat-login-btn::after {
  border: none;
}

.wechat-login-btn[disabled] {
  opacity: 0.65;
}
</style>
