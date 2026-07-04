import { NextApiRequest, NextApiResponse } from 'next'
import { 
  withErrorHandler, 
  checkMethod,
  createApiError,
  ErrorCode,
  sendSuccessResponse,
  sendErrorResponse
} from '../../../lib/apiErrorHandler'
import {
  createAdminSupabaseClient,
  getAuthenticatedUser,
} from '../../../utils/supabase/server'

async function getSingleEntryHandler(
  req: NextApiRequest,
  res: NextApiResponse,
  requestId: string
) {
  // 1. 메서드 검증
  const methodError = checkMethod(req, ['GET'])
  if (methodError) {
    return sendErrorResponse(res, methodError, requestId)
  }

  // 2. 일기 ID 추출
  const { id: entryId } = req.query
  
  if (!entryId || typeof entryId !== 'string') {
    const paramError = createApiError(
      ErrorCode.VALIDATION_ERROR,
      '일기 ID가 필요합니다.',
      400
    )
    return sendErrorResponse(res, paramError, requestId)
  }

  console.log('📖 개별 일기 조회 요청:', entryId, `[${requestId}]`)

  // 3. 쿠키 세션으로 사용자 정보 확인
  const { user: authUser, error: authError } = await getAuthenticatedUser(req, res)

  if (authError || !authUser) {
    console.log('❌ 인증 실패:', authError?.message, `[${requestId}]`)
    
    const authenticationError = createApiError(
      ErrorCode.AUTHENTICATION_ERROR,
      '세션이 만료되었습니다.',
      401,
      { authError: authError?.message }
    )
    return sendErrorResponse(res, authenticationError, requestId)
  }

  // 4. 사용자 정보 조회 (participant_code 필요)
  const supabase = createAdminSupabaseClient()
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('participant_code')
    .eq('id', authUser.id)
    .single()

  if (userError) {
    console.error('❌ 사용자 정보 조회 실패:', userError, `[${requestId}]`)
    
    const userQueryError = createApiError(
      ErrorCode.DATABASE_ERROR,
      '사용자 정보를 찾을 수 없습니다.',
      404,
      { dbError: userError }
    )
    return sendErrorResponse(res, userQueryError, requestId)
  }

  console.log('✅ 사용자 확인:', userData.participant_code, `[${requestId}]`)

  // 6. 특정 일기 조회 (사용자 소유 확인 포함)
  const { data: entry, error: entryError } = await supabase
    .from('entries')
    .select('*')
    .eq('id', entryId)
    .eq('participant_code', userData.participant_code)
    .single()

  if (entryError) {
    console.error('❌ 일기 조회 실패:', entryError, `[${requestId}]`)
    
    // 일기가 없거나 권한이 없는 경우
    if (entryError.code === 'PGRST116') {
      const notFoundError = createApiError(
        ErrorCode.NOT_FOUND,
        '해당 일기를 찾을 수 없습니다.',
        404,
        { dbError: entryError }
      )
      return sendErrorResponse(res, notFoundError, requestId)
    }
    
    const entryQueryError = createApiError(
      ErrorCode.DATABASE_ERROR,
      '일기 조회에 실패했습니다.',
      500,
      { dbError: entryError }
    )
    return sendErrorResponse(res, entryQueryError, requestId)
  }

  console.log('✅ 일기 조회 성공:', entry.id, `[${requestId}]`)

  // 7. 성공 응답
  sendSuccessResponse(res, {
    entry: entry
  }, '일기를 가져왔습니다.')
}

export default withErrorHandler(getSingleEntryHandler)
