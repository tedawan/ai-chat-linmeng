<template>
  <view class="container"></view>
</template>

<script>
import { defineComponent } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { checkLogin } from '../../api/chat'
import { difyAppId as envDifyAppId, tenantNum as envTenantNum } from '../../config'

export default defineComponent({
  setup() {
    const clearSaTokenCache = () => {
      uni.removeStorageSync('sa-token')
      uni.removeStorageSync('wechatAvatarUrl')
    }

    const redirectToChat = () => {
      uni.reLaunch({
        url: '/pages/chat-ai/index',
      })
    }

    const redirectToLogin = (tenantNum, difyAppId) => {
      const query = []
      if (tenantNum) {
        query.push(`tenantNum=${encodeURIComponent(tenantNum)}`)
      }
      if (difyAppId) {
        query.push(`difyAppId=${encodeURIComponent(difyAppId)}`)
      }

      const url = query.length ? `/pages/login/index?${query.join('&')}` : '/pages/login/index'
      uni.reLaunch({
        url,
      })
    }

    onLoad(async (options) => {
      const tenantNum = options.tenantNum || envTenantNum
      const difyAppId = options.difyAppId || envDifyAppId

      uni.setStorageSync('tenantNum', tenantNum)
      uni.setStorageSync('difyAppId', difyAppId)

      try {
        const saToken = uni.getStorageSync('sa-token')

        if (saToken) {
          try {
            const data = await checkLogin(tenantNum)
            if (data?.isTrue === true) {
              redirectToChat()
              return
            }
          } catch (error) {
            console.log(error)
          }
          clearSaTokenCache()
        }

        redirectToLogin(tenantNum, difyAppId)
      } catch (e) {
        console.log(e)
        redirectToLogin(tenantNum, difyAppId)
      }
    })
  },
})
</script>

<style>
.container {
  padding: 20px;
  font-size: 14px;
  line-height: 24px;
}
</style>
