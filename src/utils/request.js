import { apiBaseUrl } from '../config'

function getSaToken() {
  return (
    uni.getStorageSync('sa-token') ||
    ''
  )
}

function buildRequestHeader(header = {}, withAuth = true) {
  const requestHeader = {
    ...header,
  }

  if (!withAuth) {
    delete requestHeader['sa-token']
    delete requestHeader['satoken']
    return requestHeader
  }

  const saToken = getSaToken()
  if (saToken && !requestHeader['satoken'] && !requestHeader['sa-token']) {
    requestHeader['satoken'] = saToken
  }

  delete requestHeader['sa-token']

  return requestHeader
}

export function request(options) {
  const { url, method = 'POST', data = {}, header = {}, withAuth = true } = options
  const requestHeader = buildRequestHeader(header, withAuth)

  return new Promise((resolve, reject) => {
    uni.request({
      url: `${apiBaseUrl}${url}`,
      method,
      data,
      header: requestHeader,
      success: (res) => {
        resolve(res)
      },
      fail: (err) => {
        reject(err)
      },
    })
  })
}
