import type { ScanReport } from '../types/scanner'

/**
 * Configurable API Base URL:
 * - Priority 1: User-saved custom URL in localStorage ('securex_api_url')
 * - Priority 2: VITE_API_URL environment variable (e.g. https://api.securex.example.com)
 * - Priority 3: Direct localhost:8000 during local development
 * - Priority 4: Relative /api proxy
 */
export function getApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('securex_api_url')
    if (saved && saved.trim()) {
      return saved.trim().replace(/\/$/, '')
    }
  }
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL.replace(/\/$/, '')
  }
  // During local development, call the default Python FastAPI backend directly
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    return 'http://localhost:8000'
  }
  return '/api'
}

export function saveApiBaseUrl(url: string): void {
  if (typeof window !== 'undefined') {
    const trimmed = url.trim().replace(/\/$/, '')
    if (trimmed) {
      localStorage.setItem('securex_api_url', trimmed)
    } else {
      localStorage.removeItem('securex_api_url')
    }
  }
}

export async function checkBackendHealth(customBaseUrl?: string): Promise<{ ok: boolean; url: string; error?: string }> {
  const base = customBaseUrl ? customBaseUrl.replace(/\/$/, '') : getApiBaseUrl()
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 3500)

  try {
    const res = await fetch(`${base}/health`, {
      method: 'GET',
      signal: controller.signal,
    })
    clearTimeout(timeoutId)
    if (res.ok) {
      const data = await res.json()
      if (data.status === 'ok') {
        return { ok: true, url: base }
      }
    }
    return { ok: false, url: base, error: `HTTP ${res.status}: ${res.statusText}` }
  } catch (err: unknown) {
    clearTimeout(timeoutId)
    const message = err instanceof Error ? err.message : String(err)
    return { ok: false, url: base, error: message }
  }
}

export async function executeScan(url: string, customBaseUrl?: string): Promise<ScanReport> {
  const base = customBaseUrl ? customBaseUrl.replace(/\/$/, '') : getApiBaseUrl()

  const response = await fetch(`${base}/scan`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ url: url.trim() }),
  })

  if (!response.ok) {
    let errorDetail = `Backend error HTTP ${response.status}`
    try {
      const errorJson = await response.json()
      if (errorJson && errorJson.detail) {
        errorDetail = typeof errorJson.detail === 'string' ? errorJson.detail : JSON.stringify(errorJson.detail)
      }
    } catch {
      // ignore JSON parse failure
    }
    throw new Error(errorDetail)
  }

  const report: ScanReport = await response.json()
  return report
}

export async function fetchScanHistory(limit: number = 30, customBaseUrl?: string): Promise<import('../types/scanner').ScanHistoryItem[]> {
  const base = customBaseUrl ? customBaseUrl.replace(/\/$/, '') : getApiBaseUrl()

  const response = await fetch(`${base}/scans?limit=${limit}`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to load scan history (HTTP ${response.status}: ${response.statusText})`)
  }

  const data = await response.json()
  return data.scans || []
}

export async function fetchScanById(scanId: number, customBaseUrl?: string): Promise<ScanReport> {
  const base = customBaseUrl ? customBaseUrl.replace(/\/$/, '') : getApiBaseUrl()

  const response = await fetch(`${base}/scans/${scanId}`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`Scan #${scanId} was not found on the backend.`)
    }
    throw new Error(`Failed to load scan #${scanId} (HTTP ${response.status}: ${response.statusText})`)
  }

  const report: ScanReport = await response.json()
  return report
}
