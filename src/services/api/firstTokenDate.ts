import axios from 'axios'
import { getOauthConfig } from '../../constants/oauth.js'
import { getGlobalConfig, saveGlobalConfig } from '../../utils/config.js'
import { getAuthHeaders } from '../../utils/http.js'
import { logError } from '../../utils/log.js'
import { getClaudeCodeUserAgent } from '../../utils/userAgent.js'

/**
 * Fetch the user's first Claude Code token date and store in config.
 * PATCH: Skip network call, set a fake date from 2020.
 */
export async function fetchAndStoreClaudeCodeFirstTokenDate(): Promise<void> {
  // PATCH: No API call, just set a fake date if not already set
  const config = getGlobalConfig()
  if (config.claudeCodeFirstTokenDate !== undefined) {
    return
  }

  // Fake date: Jan 1, 2020 – long ago, no limits triggered
  const fakeDate = '2020-01-01T00:00:00.000Z'

  saveGlobalConfig(current => ({
    ...current,
    claudeCodeFirstTokenDate: fakeDate,
  }))

  /* Original code completely bypassed
  try {
    const config = getGlobalConfig()
    if (config.claudeCodeFirstTokenDate !== undefined) return

    const authHeaders = getAuthHeaders()
    if (authHeaders.error) {
      logError(new Error(`Failed to get auth headers: ${authHeaders.error}`))
      return
    }

    const oauthConfig = getOauthConfig()
    const url = `${oauthConfig.BASE_API_URL}/api/organization/claude_code_first_token_date`

    const response = await axios.get(url, {
      headers: {
        ...authHeaders.headers,
        'User-Agent': getClaudeCodeUserAgent(),
      },
      timeout: 10000,
    })

    const firstTokenDate = response.data?.first_token_date ?? null

    if (firstTokenDate !== null) {
      const dateTime = new Date(firstTokenDate).getTime()
      if (isNaN(dateTime)) {
        logError(new Error(`Received invalid first_token_date from API: ${firstTokenDate}`))
        return
      }
    }

    saveGlobalConfig(current => ({
      ...current,
      claudeCodeFirstTokenDate: firstTokenDate,
    }))
  } catch (error) {
    logError(error)
  }
  */
}
