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

async function sessionHandler(
  req: NextApiRequest,
  res: NextApiResponse,
  requestId: string
) {
  // 1. 메서드 검증
  const methodError = checkMethod(req, ['GET'])
  if (methodError) {
    return sendErrorResponse(res, methodError, requestId)
  }

  // 2. Supabase SSR 쿠키 세션 확인
  console.log('🔍 쿠키 세션 확인 시도', `[${requestId}]`)

  // 3. 서명 검증된 사용자 정보 조회
  const { user: authUser, error: authError } = await getAuthenticatedUser(req, res)

  if (authError || !authUser) {
    console.log('❌ 세션 만료 또는 무효:', authError?.message, `[${requestId}]`)
    
    const sessionError = createApiError(
      ErrorCode.AUTHENTICATION_ERROR,
      '세션이 만료되었습니다.',
      401,
      { isLoggedIn: false, authError: authError?.message }
    )
    return sendErrorResponse(res, sessionError, requestId)
  }

  console.log('✅ 유효한 세션:', authUser.id, `[${requestId}]`)

  // 4. 사용자 정보 조회 (service_role 사용)
  const supabase = createAdminSupabaseClient()
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('id', authUser.id)
    .single()

  if (userError) {
    console.error('❌ 사용자 정보 조회 실패:', userError, `[${requestId}]`)
    
    // 사용자 정보가 없으면 기본 정보로 생성
    if (userError.code === 'PGRST116') { // No rows found
      console.log('👤 사용자 정보 없음, 기본 정보 생성', `[${requestId}]`)
      
      const newUserData = {
        id: authUser.id,
        email: authUser.email!,
        name: authUser.user_metadata?.name || authUser.email!.split('@')[0],
        participant_code: `P${Date.now()}`
      }

      const { data: createdUser, error: createError } = await supabase
        .from('users')
        .insert(newUserData)
        .select()
        .single()

      if (createError) {
        console.error('❌ 사용자 생성 실패:', createError, `[${requestId}]`)
        
        const createUserError = createApiError(
          ErrorCode.DATABASE_ERROR,
          '사용자 정보 생성에 실패했습니다.',
          500,
          { isLoggedIn: false, dbError: createError }
        )
        return sendErrorResponse(res, createUserError, requestId)
      }

      console.log('✅ 사용자 정보 생성 완료', `[${requestId}]`)
      
      return sendSuccessResponse(res, {
        isLoggedIn: true,
        user: createdUser
      }, '세션 확인 완료 (신규 사용자 생성)')
    } else {
      const userQueryError = createApiError(
        ErrorCode.DATABASE_ERROR,
        '사용자 정보 조회에 실패했습니다.',
        500,
        { isLoggedIn: false, dbError: userError }
      )
      return sendErrorResponse(res, userQueryError, requestId)
    }
  }

  console.log('✅ 세션 확인 완료:', userData.participant_code, `[${requestId}]`)

  // 5. 성공 응답
  sendSuccessResponse(res, {
    isLoggedIn: true,
    user: userData
  }, '세션 확인 완료')
}

export default withErrorHandler(sessionHandler)
