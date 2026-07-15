<template>
  <view>
    <view class="login-tel">
      <view class="tel-main">
        <view class="login-from">
          <view class="login-user">
            <view class="title">初次绑定手机号</view>
          </view>
          <view class="login-user">
            <text class="user-text" style="font-weight: bold">中国 +86</text>
            <input
              v-model="userTel"
              style="width: 70%; font-size: 35rpx"
              type="number"
              maxlength="11"
              placeholder="请输入手机号"
            />
          </view>
          <view class="login-user">
            <input
              v-model="userCode"
              style="width: 60%; font-size: 35rpx"
              type="number"
              maxlength="6"
              placeholder="请输入验证码"
            />
            <button
              class="code-msg-btn"
              type="primary"
              plain="true"
              size="mini"
              :disabled="disabled"
              @tap="sendCodeHandler"
            >
              {{ codeMsg }}
            </button>
          </view>
          <view class="line"></view>
        </view>
        <button type="primary" @tap="bindHandler">绑定</button>
        <view style="color: red; font-size: 25rpx; margin-top: 20rpx; font-weight: bold">
          * 请用商城绑定的手机号绑定，否则无法使用。
          <br />
          * 如有疑问，请联系客服。
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { defineComponent, ref } from 'vue'
import { bindMobile, sendCaptcha } from '../../api/chat'

export default defineComponent({
  setup() {
    const userTel = ref('')
    const userCode = ref('')
    const countdownDisplay = ref(null)
    const countdown = 60
    const codeMsg = ref('发送验证码')
    const disabled = ref(false)

    function cacheAuthState(data) {
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

    const rules = {
      userTel: {
        rule: /^1[23456789]\d{9}$/,
        msg: '请输入11位手机号',
      },
    }

    function validate(key) {
      let bool = true
      if (!rules[key].rule.test(userTel.value)) {
        uni.showToast({
          title: rules[key].msg,
          icon: 'none',
        })
        bool = false
        return false
      }
      return bool
    }

    async function sendCodeHandler() {
      if (!validate('userTel')) return
      disabled.value = true
      countdownDisplay.value = countdown
      const timer = setInterval(() => {
        countdownDisplay.value -= 1
        codeMsg.value = `重新发送(${countdownDisplay.value})`
      }, 1000)

      setTimeout(() => {
        clearInterval(timer)
        countdownDisplay.value = countdown
        disabled.value = false
        codeMsg.value = '重新发送'
      }, countdown * 1000)

      try {
        await sendCaptcha(userTel.value, uni.getStorageSync('tenantNum'))
        uni.showToast({
          title: '验证码发送成功',
          duration: 2000,
          icon: 'none',
        })
      } catch (e) {
        console.log(e)
      }
    }

    async function bindHandler() {
      console.log('绑定')
      if (!validate('userTel')) return
      if (!userCode.value) {
        uni.showToast({
          title: '请输入验证码',
          duration: 2000,
          icon: 'none',
        })
        return
      }

      uni.showLoading({
        title: '正在绑定...',
      })

      try {
        const data = await bindMobile(
          userTel.value,
          userCode.value,
          uni.getStorageSync('wechatCode'),
          uni.getStorageSync('tenantNum'),
        )

        if (data?.token) {
          cacheAuthState(data)
          uni.reLaunch({
            url: '/pages/chat-ai/index',
          })
        }
        uni.hideLoading()
      } catch (e) {
        console.log(e)
        uni.hideLoading()
      }
    }

    return {
      userTel,
      userCode,
      disabled,
      codeMsg,
      sendCodeHandler,
      bindHandler,
    }
  },
})
</script>

<style lang="scss">
.login-tel {
  width: 100%;
  height: 100%;
}

.tel-main {
  padding: 0 20rpx;
}

.login-from {
  padding: 30rpx 0;
}

.tel {
  width: 100%;
  height: 80rpx;
  line-height: 80rpx;
  text-align: center;
  color: #fff;
  background-color: #40bde8;
  border-radius: 40rpx;
}

.login-user {
  font-size: 35rpx;
  padding: 15rpx 0;
  display: flex;
  align-items: center;
  margin-bottom: 15px;
}

.title {
  font-size: 60rpx;
}

.user-text {
  padding-right: 10rpx;
}

.line {
  width: 100%;
  border-top: 1px solid #dcdcdc;
}

.code-msg-btn {
  margin-right: 0;
}
</style>
