import Anthropic, { type ClientOptions } from '@anthropic-ai/sdk'
import { randomUUID } from 'crypto'
import type { GoogleAuth } from 'google-auth-library'
import {
  checkAndRefreshOAuthTokenIfNeeded,
  getAnthropicApiKey,
  getApiKeyFromApiKeyHelper,
  getClaudeAIOAuthTokens,
  isClaudeAISubscriber,
  refreshAndGetAwsCredentials,
  refreshGcpCredentialsIfNeeded,
} from 'src/utils/auth.js'
import { getUserAgent } from 'src/utils/http.js'
import { getSmallFastModel } from 'src/utils/model/model.js'
import {
  getAPIProvider,
  isFirstPartyAnthropicBaseUrl,
} from 'src/utils/model/providers.js'
import { getProxyFetchOptions } from 'src/utils/proxy.js'
import {
  getIsNonInteractiveSession,
  getSessionId,
} from '../../bootstrap/state.js'
import { getOauthConfig } from '../../constants/oauth.js'
import { isDebugToStdErr, logForDebugging } from '../../utils/debug.js'
import {
  getAWSRegion,
  getVertexRegionForModel,
  isEnvTruthy,
} from '../../utils/envUtils.js'

// PATCH: Force local endpoint via env var or default to Ollama
const LOCAL_API_BASE_URL = process.env.CLAUDE_CODE_LOCAL_API_BASE_URL || 'http://localhost:11434'

function createStderrLogger(): ClientOptions['logger'] {
  return {
    error: (msg, ...args) => console.error('[Anthropic SDK ERROR]', msg, ...args),
    warn: (msg, ...args) => console.error('[Anthropic SDK WARN]', msg, ...args),
    info: (msg, ...args) => console.error('[Anthropic SDK INFO]', msg, ...args),
    debug: (msg, ...args) => console.error('[Anthropic SDK DEBUG]', msg, ...args),
  }
}

export async function getAnthropicClient({
  apiKey,
  maxRetries,
  model,
  fetchOverride,
  source,
}: {
  apiKey?: string
  maxRetries: number
  model?: string
  fetchOverride?: ClientOptions['fetch']
  source?: string
}): Promise<Anthropic> {
  const containerId = process.env.CLAUDE_CODE_CONTAINER_ID
  const remoteSessionId = process.env.CLAUDE_CODE_REMOTE_SESSION_ID
  const clientApp = process.env.CLAUDE_AGENT_SDK_CLIENT_APP
  const customHeaders = getCustomHeaders()
  const defaultHeaders: { [key: string]: string } = {
    'x-app': 'cli',
    'User-Agent': getUserAgent(),
    'X-Claude-Code-Session-Id': getSessionId(),
    ...customHeaders,
    ...(containerId ? { 'x-claude-remote-container-id': containerId } : {}),
    ...(remoteSessionId ? { 'x-claude-remote-session-id': remoteSessionId } : {}),
    ...(clientApp ? { 'x-client-app': clientApp } : {}),
  }

  logForDebugging(`[API:request] Creating client, LOCAL mode enabled - using ${LOCAL_API_BASE_URL}`)

  const additionalProtectionEnabled = isEnvTruthy(process.env.CLAUDE_CODE_ADDITIONAL_PROTECTION)
  if (additionalProtectionEnabled) {
    defaultHeaders['x-anthropic-additional-protection'] = 'true'
  }

  // PATCH: Skip all OAuth and credential checks - we're going local
  // No token refresh, no subscriber checks, no AWS/Vertex/Foundry

  const resolvedFetch = buildFetch(fetchOverride, source)

  const ARGS = {
    defaultHeaders,
    maxRetries,
    timeout: parseInt(process.env.API_TIMEOUT_MS || String(600 * 1000), 10),
    dangerouslyAllowBrowser: true,
    fetchOptions: getProxyFetchOptions({ forAnthropicAPI: true }) as ClientOptions['fetchOptions'],
    ...(resolvedFetch && { fetch: resolvedFetch }),
  }

  // PATCH: Force direct API with fake key and custom baseURL pointing to local
  // This completely bypasses any real Anthropic endpoint
  const clientConfig: ConstructorParameters<typeof Anthropic>[0] = {
    apiKey: 'sk-fake-local-key-do-not-use',
    baseURL: `${LOCAL_API_BASE_URL}/v1`, // Expects a compatible endpoint (e.g., Ollama with Anthropic API wrapper)
    ...ARGS,
    ...(isDebugToStdErr() && { logger: createStderrLogger() }),
  }

  // PATCH: Ignore all environment flags for Bedrock/Foundry/Vertex
  // We always use the direct client with local URL
  return new Anthropic(clientConfig)

  /* ORIGINAL CODE REMOVED - no more AWS, GCP, Foundry checks
  if (isEnvTruthy(process.env.CLAUDE_CODE_USE_BEDROCK)) { ... }
  if (isEnvTruthy(process.env.CLAUDE_CODE_USE_FOUNDRY)) { ... }
  if (isEnvTruthy(process.env.CLAUDE_CODE_USE_VERTEX)) { ... }
  // Original direct API logic also removed
  */
}

// PATCH: configureApiKeyHeaders - no-op, we don't need real keys
async function configureApiKeyHeaders(
  headers: Record<string, string>,
  isNonInteractiveSession: boolean,
): Promise<void> {
  // Do nothing - local endpoint doesn't need auth
  return
}

function getCustomHeaders(): Record<string, string> {
  const customHeaders: Record<string, string> = {}
  const customHeadersEnv = process.env.ANTHROPIC_CUSTOM_HEADERS
  if (!customHeadersEnv) return customHeaders
  const headerStrings = customHeadersEnv.split(/\n|\r\n/)
  for (const headerString of headerStrings) {
    if (!headerString.trim()) continue
    const colonIdx = headerString.indexOf(':')
    if (colonIdx === -1) continue
    const name = headerString.slice(0, colonIdx).trim()
    const value = headerString.slice(colonIdx + 1).trim()
    if (name) customHeaders[name] = value
  }
  return customHeaders
}

export const CLIENT_REQUEST_ID_HEADER = 'x-client-request-id'

function buildFetch(
  fetchOverride: ClientOptions['fetch'],
  source: string | undefined,
): ClientOptions['fetch'] {
  const inner = fetchOverride ?? globalThis.fetch
  const injectClientRequestId = getAPIProvider() === 'firstParty' && isFirstPartyAnthropicBaseUrl()
  return (input, init) => {
    const headers = new Headers(init?.headers)
    if (injectClientRequestId && !headers.has(CLIENT_REQUEST_ID_HEADER)) {
      headers.set(CLIENT_REQUEST_ID_HEADER, randomUUID())
    }
    try {
      const url = input instanceof Request ? input.url : String(input)
      const id = headers.get(CLIENT_REQUEST_ID_HEADER)
      logForDebugging(
        `[API REQUEST] ${new URL(url).pathname}${id ? ` ${CLIENT_REQUEST_ID_HEADER}=${id}` : ''} source=${source ?? 'unknown'}`,
      )
    } catch {
      // never let logging crash the fetch
    }
    return inner(input, { ...init, headers })
  }
}
