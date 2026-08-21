export const OPENAI_MODELS = {
  standard: 'gpt-5.6-luna',
  interpretive: 'gpt-5.6-luna',
  lightweight: 'gpt-5.6-luna',
} as const

type JsonObject = Record<string, unknown>

export class OpenAIAPIError extends Error {
  readonly code = 'OPENAI_API_ERROR'
  readonly statusCode: number

  constructor(
    readonly providerStatus: number,
    readonly providerCode?: string
  ) {
    super(getSafeOpenAIErrorMessage(providerStatus))
    this.name = 'OpenAIAPIError'
    this.statusCode = providerStatus === 429 ? 503 : 502
  }
}

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null
}

function getSafeOpenAIErrorMessage(status: number): string {
  if (status === 401 || status === 403) {
    return 'AI 서비스 인증 설정을 확인해주세요.'
  }

  if (status === 429) {
    return 'AI 서비스 요청 한도에 도달했습니다. 잠시 후 다시 시도해주세요.'
  }

  return 'AI 서비스 요청에 실패했습니다.'
}

export function isOpenAIAPIError(error: unknown): error is OpenAIAPIError {
  return error instanceof OpenAIAPIError
}

export async function getOpenAIChatCompletionText(
  response: Response
): Promise<string> {
  const payload: unknown = await response.json().catch(() => null)

  if (!response.ok) {
    const errorPayload = isJsonObject(payload) && isJsonObject(payload.error)
      ? payload.error
      : null
    const providerCode = errorPayload && typeof errorPayload.code === 'string'
      ? errorPayload.code
      : undefined

    throw new OpenAIAPIError(response.status, providerCode)
  }

  if (!isJsonObject(payload) || !Array.isArray(payload.choices)) {
    throw new OpenAIAPIError(502, 'invalid_response')
  }

  const firstChoice = payload.choices[0]
  const message = isJsonObject(firstChoice) && isJsonObject(firstChoice.message)
    ? firstChoice.message
    : null
  const content = message && typeof message.content === 'string'
    ? message.content.trim()
    : ''

  if (!content) {
    throw new OpenAIAPIError(502, 'empty_response')
  }

  return content
}
