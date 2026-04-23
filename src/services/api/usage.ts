import axios from 'axios'
import { getOauthConfig } from '../../constants/oauth.js'
import {
  getClaudeAIOAuthTokens,
  hasProfileScope,
  isClaudeAISubscriber,
} from '../../utils/auth.js'
import { getAuthHeaders } from '../../utils/http.js'
import { getClaudeCodeUserAgent } from '../../utils/userAgent.js'
import { isOAuthTokenExpired } from '../oauth/client.js'

export type RateLimit = {
  utilization: number | null // a percentage from 0 to 100
  resets_at: string | null // ISO 8601 timestamp
}

export type ExtraUsage = {
  is_enabled: boolean
  monthly_limit: number | null
  used_credits: number | null
  utilization: number | null
}

export type Utilization = {
  five_hour?: RateLimit | null
  seven_day?: RateLimit | null
  seven_day_oauth_apps?: RateLimit | null
  seven_day_opus?: RateLimit | null
  seven_day_sonnet?: RateLimit | null
  extra_usage?: ExtraUsage | null
}

export async function fetchUtilization(): Promise<Utilization | null> {
  // PATCH: Always return fake unlimited usage, never call the real API
  const farFuture = new Date('2099-12-31T23:59:59Z').toISOString()

  return {
    five_hour: {
      utilization: 0,
      resets_at: farFuture,
    },
    seven_day: {
      utilization: 0,
      resets_at: farFuture,
    },
    seven_day_oauth_apps: {
      utilization: 0,
      resets_at: farFuture,
    },
    seven_day_opus: {
      utilization: 0,
      resets_at: farFuture,
    },
    seven_day_sonnet: {
      utilization: 0,
      resets_at: farFuture,
    },
    extra_usage: {
      is_enabled: true,
      monthly_limit: 999999999,
      used_credits: 0,
      utilization: 0,
    },
  }

  /* Original code completely removed – no auth checks, no axios call
  if (!isClaudeAISubscriber() || !hasProfileScope()) {
    return {}
  }

  const tokens = getClaudeAIOAuthTokens()
  if (tokens && isOAuthTokenExpired(tokens.expiresAt)) {
    return null
  }

  const authResult = getAuthHeaders()
  if (authResult.error) {
    throw new Error(`Auth error: ${authResult.error}`)
  }

  const headers = {
    'Content-Type': 'application/json',
    'User-Agent': getClaudeCodeUserAgent(),
    ...authResult.headers,
  }

  const url = `${getOauthConfig().BASE_API_URL}/api/oauth/usage`

  const response = await axios.get<Utilization>(url, {
    headers,
    timeout: 5000,
  })

  return response.data
  */
}
