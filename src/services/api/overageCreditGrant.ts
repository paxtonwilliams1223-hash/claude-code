import axios from 'axios'
import { getOauthConfig } from '../../constants/oauth.js'
import { getOauthAccountInfo } from '../../utils/auth.js'
import { getGlobalConfig, saveGlobalConfig } from '../../utils/config.js'
import { logError } from '../../utils/log.js'
import { isEssentialTrafficOnly } from '../../utils/privacyLevel.js'
import { getOAuthHeaders, prepareApiRequest } from '../../utils/teleport/api.js'

export type OverageCreditGrantInfo = {
  available: boolean
  eligible: boolean
  granted: boolean
  amount_minor_units: number | null
  currency: string | null
}

type CachedGrantEntry = {
  info: OverageCreditGrantInfo
  timestamp: number
}

const CACHE_TTL_MS = 60 * 60 * 1000 // 1 hour

/**
 * Fetch the current user's overage credit grant eligibility from the backend.
 * PATCH: Always return fake unlimited grant, never call the real API.
 */
async function fetchOverageCreditGrant(): Promise<OverageCreditGrantInfo | null> {
  // Fake data: available, eligible, granted, with huge amount in USD
  return {
    available: true,
    eligible: true,
    granted: true,
    amount_minor_units: 99999999900, // $999,999,999.00
    currency: 'USD',
  }

  /* Original code completely bypassed
  try {
    const { accessToken, orgUUID } = await prepareApiRequest()
    const url = `${getOauthConfig().BASE_API_URL}/api/oauth/organizations/${orgUUID}/overage_credit_grant`
    const response = await axios.get<OverageCreditGrantInfo>(url, {
      headers: getOAuthHeaders(accessToken),
    })
    return response.data
  } catch (err) {
    logError(err)
    return null
  }
  */
}

/**
 * Get cached grant info. Returns null if no cache or cache is stale.
 * Callers should render nothing (not block) when this returns null —
 * refreshOverageCreditGrantCache fires lazily to populate it.
 */
export function getCachedOverageCreditGrant(): OverageCreditGrantInfo | null {
  // PATCH: Always return fake data if no cache, or ignore cache staleness
  const orgId = getOauthAccountInfo()?.organizationUuid
  if (!orgId) {
    // Still return fake data even without org ID
    return {
      available: true,
      eligible: true,
      granted: true,
      amount_minor_units: 99999999900,
      currency: 'USD',
    }
  }
  const cached = getGlobalConfig().overageCreditGrantCache?.[orgId]
  if (cached) {
    // Ignore TTL – always return cached info if exists
    return cached.info
  }
  // No cache, return fake directly
  return {
    available: true,
    eligible: true,
    granted: true,
    amount_minor_units: 99999999900,
    currency: 'USD',
  }
}

/**
 * Drop the current org's cached entry so the next read refetches.
 * Leaves other orgs' entries intact.
 */
export function invalidateOverageCreditGrantCache(): void {
  // PATCH: Do nothing – cache is irrelevant
  return
}

/**
 * Fetch and cache grant info. Fire-and-forget; call when an upsell surface
 * is about to render and the cache is empty.
 */
export async function refreshOverageCreditGrantCache(): Promise<void> {
  // PATCH: Skip entirely, or just populate fake cache
  if (isEssentialTrafficOnly()) return
  const orgId = getOauthAccountInfo()?.organizationUuid
  if (!orgId) return
  const info = await fetchOverageCreditGrant() // Will return fake
  if (!info) return
  saveGlobalConfig(prev => {
    const entry: CachedGrantEntry = {
      info,
      timestamp: Date.now(),
    }
    return {
      ...prev,
      overageCreditGrantCache: {
        ...prev.overageCreditGrantCache,
        [orgId]: entry,
      },
    }
  })
}

/**
 * Format the grant amount for display. Returns null if amount isn't available
 * (not eligible, or currency we don't know how to format).
 */
export function formatGrantAmount(info: OverageCreditGrantInfo): string | null {
  if (info.amount_minor_units == null || !info.currency) return null
  if (info.currency.toUpperCase() === 'USD') {
    const dollars = info.amount_minor_units / 100
    return Number.isInteger(dollars) ? `$${dollars}` : `$${dollars.toFixed(2)}`
  }
  return null
}

export type { CachedGrantEntry as OverageCreditGrantCacheEntry }
