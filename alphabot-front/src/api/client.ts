export type ApiError = Error & { status?: number }

const RAW_API_BASE_URL = ((import.meta as any).env?.VITE_API_BASE_URL ?? '').trim()

const DEV_FALLBACK_BASE_URL =
  typeof window !== 'undefined' &&
  window.location.hostname === 'localhost' &&
  window.location.port === '5173'
    ? 'http://localhost:8080'
    : ''

const API_BASE_URL = RAW_API_BASE_URL || DEV_FALLBACK_BASE_URL || ''

if (import.meta.env.DEV) {
  const messageParts = [
    '[apiFetch] base URL configuration',
    `raw: "${RAW_API_BASE_URL || '-'}"`,
    `fallback: "${DEV_FALLBACK_BASE_URL || '-'}"`,
    `final: "${API_BASE_URL || '-'}"`,
  ]
  // eslint-disable-next-line no-console
  console.info(messageParts.join(' | '))
}

function getAccessToken(): string | null {
  // backwards compatibility: some pages still store under "authToken"
  return (
    window.localStorage.getItem('access_token') ??
    window.localStorage.getItem('authToken')
  )
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit & { auth?: boolean } = {},
): Promise<T> {
  const { auth = true, headers, ...rest } = options
  const base = API_BASE_URL || ''
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  const url = `${base}${normalizedPath}`

  const init: RequestInit = {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(headers || {}),
    },
  }

  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.debug('[apiFetch] request', {
      method: init.method ?? 'GET',
      url,
      base,
      path: normalizedPath,
      auth,
    })
  }
  if (auth) {
    const token = getAccessToken()
    if (token) {
      (init.headers as Record<string, string>)['Authorization'] = `Bearer ${token}`
    }
  }

  const res = await fetch(url, init)
  const isJson = res.headers.get('content-type')?.includes('application/json')
  if (!res.ok) {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.error('[apiFetch] error response', {
        status: res.status,
        statusText: res.statusText,
        url,
      })
    }
    const err: ApiError = new Error(
      isJson ? JSON.stringify(await res.json()).slice(0, 500) : await res.text(),
    )
    err.name = 'ApiError'
    err.status = res.status
    throw err
  }
  return (isJson ? res.json() : (null as unknown)) as T
}


