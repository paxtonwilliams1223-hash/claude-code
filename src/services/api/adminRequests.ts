import axios from 'axios'
import { getOauthConfig } from '../../constants/oauth.js'
import { getOAuthHeaders, prepareApiRequest } from '../../utils/teleport/api.js'

export type AdminRequestType = 'limit_increase' | 'seat_upgrade'

export type AdminRequestStatus = 'pending' | 'approved' | 'dismissed'

export type AdminRequestSeatUpgradeDetails = {
  message?: string | null
  current_seat_tier?: string | null
}

export type AdminRequestCreateParams =
  | {
      request_type: 'limit_increase'
      details: null
    }
  | {
      request_type: 'seat_upgrade'
      details: AdminRequestSeatUpgradeDetails
    }

export type AdminRequest = {
  uuid: string
  status: AdminRequestStatus
  requester_uuid?: string | null
  created_at: string
} & (
  | {
      request_type: 'limit_increase'
      details: null
    }
  | {
      request_type: 'seat_upgrade'
      details: AdminRequestSeatUpgradeDetails
    }
)

/**
 * Create an admin request (limit increase or seat upgrade).
 * PATCH: Fake an already approved request, never call API.
 */
export async function createAdminRequest(
  params: AdminRequestCreateParams,
): Promise<AdminRequest> {
  // Return a fake approved request
  const now = new Date().toISOString()
  const fakeRequest: AdminRequest = {
    uuid: 'fake-00000000-0000-0000-0000-000000000000',
    status: 'approved',
    requester_uuid: 'fake-user-uuid',
    created_at: now,
    request_type: params.request_type,
    details: params.request_type === 'seat_upgrade' ? params.details : null,
  }
  return fakeRequest

  /* Original code bypassed
  const { accessToken, orgUUID } = await prepareApiRequest()
  const headers = { ...getOAuthHeaders(accessToken), 'x-organization-uuid': orgUUID }
  const url = `${getOauthConfig().BASE_API_URL}/api/oauth/organizations/${orgUUID}/admin_requests`
  const response = await axios.post<AdminRequest>(url, params, { headers })
  return response.data
  */
}

/**
 * Get pending admin request of a specific type for the current user.
 * PATCH: Always return null (no pending requests).
 */
export async function getMyAdminRequests(
  requestType: AdminRequestType,
  statuses: AdminRequestStatus[],
): Promise<AdminRequest[] | null> {
  // No pending requests – return empty array
  return []

  /* Original code bypassed
  const { accessToken, orgUUID } = await prepareApiRequest()
  const headers = { ...getOAuthHeaders(accessToken), 'x-organization-uuid': orgUUID }
  let url = `${getOauthConfig().BASE_API_URL}/api/oauth/organizations/${orgUUID}/admin_requests/me?request_type=${requestType}`
  for (const status of statuses) url += `&statuses=${status}`
  const response = await axios.get<AdminRequest[] | null>(url, { headers })
  return response.data
  */
}

type AdminRequestEligibilityResponse = {
  request_type: AdminRequestType
  is_allowed: boolean
}

/**
 * Check if a specific admin request type is allowed for this org.
 * PATCH: Always return allowed for any request type.
 */
export async function checkAdminRequestEligibility(
  requestType: AdminRequestType,
): Promise<AdminRequestEligibilityResponse | null> {
  return {
    request_type: requestType,
    is_allowed: true,
  }

  /* Original code bypassed
  const { accessToken, orgUUID } = await prepareApiRequest()
  const headers = { ...getOAuthHeaders(accessToken), 'x-organization-uuid': orgUUID }
  const url = `${getOauthConfig().BASE_API_URL}/api/oauth/organizations/${orgUUID}/admin_requests/eligibility?request_type=${requestType}`
  const response = await axios.get<AdminRequestEligibilityResponse>(url, { headers })
  return response.data
  */
}
