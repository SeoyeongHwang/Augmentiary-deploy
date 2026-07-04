import { NextApiRequest, NextApiResponse } from 'next'

// 에러 타입 정의
export interface ApiError {
  code: string
  message: string
  details?: any
  statusCode: number
}

// 표준 에러 코드
export enum ErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  RATE_LIMIT = 'RATE_LIMIT',
  SERVER_ERROR = 'SERVER_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

// 에러 응답 타입
export interface ErrorResponse {
  error: string
  code: string
  details?: any
  timestamp: string
  requestId?: string
}

// 성공 응답 타입
export interface SuccessResponse<T = any> {
  success: true
  data?: T
  message?: string
  timestamp: string
}

/**
 * 표준 에러 객체 생성
 */
export function createApiError(
  code: ErrorCode,
  message: string,
  statusCode: number,
  details?: any
): ApiError {
  return {
    code,
    message,
    statusCode,
    details
  }
}

/**
 * 공통 에러들
 */
export const CommonErrors = {
  INVALID_METHOD: createApiError(
    ErrorCode.VALIDATION_ERROR,
    '허용되지 않은 메서드입니다.',
    405
  ),
  MISSING_TOKEN: createApiError(
    ErrorCode.AUTHENTICATION_ERROR,
    '인증 토큰이 필요합니다.',
    401
  ),
  INVALID_TOKEN: createApiError(
    ErrorCode.AUTHENTICATION_ERROR,
    '유효하지 않은 인증 토큰입니다.',
    401
  ),
  SESSION_EXPIRED: createApiError(
    ErrorCode.AUTHENTICATION_ERROR,
    '세션이 만료되었습니다.',
    401
  ),
  VALIDATION_FAILED: createApiError(
    ErrorCode.VALIDATION_ERROR,
    '입력 데이터가 유효하지 않습니다.',
    400
  ),
  SERVER_ERROR: createApiError(
    ErrorCode.SERVER_ERROR,
    '서버 오류가 발생했습니다.',
    500
  )
}

/**
 * 에러 응답 전송
 */
export function sendErrorResponse(
  res: NextApiResponse,
  error: ApiError,
  requestId?: string
): void {
  const errorResponse: ErrorResponse = {
    error: error.message,
    code: error.code,
    timestamp: new Date().toISOString(),
    requestId
  }

  if (error.details) {
    errorResponse.details = error.details
  }

  // 에러 로깅
  console.error(`❌ API 에러 [${error.code}]:`, {
    message: error.message,
    statusCode: error.statusCode,
    details: error.details,
    requestId,
    timestamp: errorResponse.timestamp
  })

  res.status(error.statusCode).json(errorResponse)
}

/**
 * 성공 응답 전송
 */
export function sendSuccessResponse<T = any>(
  res: NextApiResponse,
  data?: T,
  message?: string,
  statusCode: number = 200
): void {
  const successResponse: SuccessResponse<T> = {
    success: true,
    timestamp: new Date().toISOString()
  }

  if (data !== undefined) {
    successResponse.data = data
  }

  if (message) {
    successResponse.message = message
  }

  res.status(statusCode).json(successResponse)
}

/**
 * 요청 ID 생성
 */
export function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * 입력 검증 유틸리티
 */
export function validateRequired(
  data: any,
  requiredFields: string[]
): ApiError | null {
  const missingFields = requiredFields.filter(field => !data || !data[field])
  
  if (missingFields.length > 0) {
    return createApiError(
      ErrorCode.VALIDATION_ERROR,
      `필수 필드가 누락되었습니다: ${missingFields.join(', ')}`,
      400,
      { missingFields }
    )
  }
  
  return null
}

/**
 * 이메일 유효성 검증
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * 패스워드 유효성 검증
 */
export function validatePassword(password: string): { isValid: boolean; message?: string } {
  if (password.length < 6) {
    return { isValid: false, message: '비밀번호는 6자 이상이어야 합니다.' }
  }
  
  return { isValid: true }
}

/**
 * 에러 핸들러 래퍼 - try-catch 자동 처리
 */
export function withErrorHandler(
  handler: (req: NextApiRequest, res: NextApiResponse, requestId: string) => Promise<void>
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const requestId = generateRequestId()
    
    try {
      await handler(req, res, requestId)
    } catch (error) {
      console.error('❌ 핸들러 처리 중 예외 발생:', error)
      
      // 이미 응답이 전송된 경우 추가 응답 방지
      if (res.headersSent) {
        return
      }
      
      // 알려진 API 에러인 경우
      if (error && typeof error === 'object' && 'code' in error && 'statusCode' in error) {
        sendErrorResponse(res, error as ApiError, requestId)
        return
      }
      
      // 예상치 못한 에러인 경우
      sendErrorResponse(res, CommonErrors.SERVER_ERROR, requestId)
    }
  }
}

/**
 * 메서드 체크 유틸리티
 */
export function checkMethod(
  req: NextApiRequest,
  allowedMethods: string[]
): ApiError | null {
  if (!req.method || !allowedMethods.includes(req.method)) {
    return createApiError(
      ErrorCode.VALIDATION_ERROR,
      `허용되지 않은 메서드입니다. 허용된 메서드: ${allowedMethods.join(', ')}`,
      405
    )
  }
  
  return null
}
