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

async function listEntriesHandler(
  req: NextApiRequest,
  res: NextApiResponse,
  requestId: string
) {
  // 1. 메서드 검증
  const methodError = checkMethod(req, ['GET'])
  if (methodError) {
    return sendErrorResponse(res, methodError, requestId)
  }

  console.log('📖 일기 목록 조회 요청', `[${requestId}]`)

  // 2. 쿠키 세션으로 사용자 정보 확인
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

  // 3. 사용자 정보 조회 (participant_code 필요)
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

  // 5. 쿼리 파라미터 처리
  const { limit = '9', offset = '0' } = req.query
  const limitNum = Math.min(parseInt(limit as string) || 9, 50) // 최대 50개로 제한
  const offsetNum = Math.max(parseInt(offset as string) || 0, 0)

  // 6. 일기 목록 조회
  const { data: entries, error: entriesError } = await supabase
    .from('entries')
    .select('*')
    .eq('participant_code', userData.participant_code)
    .order('created_at', { ascending: false })
    .range(offsetNum, offsetNum + limitNum - 1)

  if (entriesError) {
    console.error('❌ 일기 목록 조회 실패:', entriesError, `[${requestId}]`)
    
    const entriesQueryError = createApiError(
      ErrorCode.DATABASE_ERROR,
      '일기 목록을 가져오는 데 실패했습니다.',
      500,
      { dbError: entriesError }
    )
    return sendErrorResponse(res, entriesQueryError, requestId)
  }

  console.log(`✅ 일기 목록 조회 성공: ${entries.length}개`, `[${requestId}]`)

  // 7. 성공 응답
  sendSuccessResponse(res, {
    entries: entries || [],
    count: entries.length,
    participant_code: userData.participant_code
  }, `${entries.length}개의 일기를 가져왔습니다.`)
}

export default withErrorHandler(listEntriesHandler)
