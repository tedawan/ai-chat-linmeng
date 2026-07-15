function readEnv(key, fallback = '') {
  const value = import.meta.env[key]
  return value === undefined || value === null || value === '' ? fallback : value
}

export const appEnv = readEnv('VITE_APP_ENV', 'development')
export const apiBaseUrl = readEnv('VITE_API_BASE_URL', 'https://www.aijisi.vip')
export const tenantNum = readEnv('VITE_TENANT_NUM', '')
export const difyAppId = readEnv('VITE_DIFY_APP_ID', '')
export const difyBaseUrl = readEnv('VITE_DIFY_BASE_URL', '')

export const appConfig = {
  appEnv,
  apiBaseUrl,
  tenantNum,
  difyAppId,
  difyBaseUrl,
}
