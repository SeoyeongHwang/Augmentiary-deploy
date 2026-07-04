import { NextApiRequest, NextApiResponse } from 'next'
import { 
  withErrorHandler, 
  checkMethod, 
  sendSuccessResponse
} from '../../../lib/apiErrorHandler'
import { createServerSupabaseClient } from '../../../utils/supabase/server'

async function logoutHandler(
  req: NextApiRequest,
  res: NextApiResponse,
  requestId: string
) {
  // 1. 메서드 검증
  const methodError = checkMethod(req, ['POST'])
  if (methodError) {
    return sendSuccessResponse(res, {}, '로그아웃되었습니다.') // 로그아웃은 항상 성공으로 처리
  }

  console.log('🚪 로그아웃 요청', `[${requestId}]`)

  // 2. 현재 쿠키 세션 로그아웃 및 인증 쿠키 제거
  const supabase = createServerSupabaseClient(req, res)
  const { error } = await supabase.auth.signOut({ scope: 'local' })

  if (error) {
    console.log('⚠️ 세션 무효화 중 오류 (로컬 쿠키는 정리):', error.message, `[${requestId}]`)
  }

  console.log('✅ 로그아웃 완료', `[${requestId}]`)

  // 3. 성공 응답 (토큰이 없거나 무효해도 성공으로 처리)
  sendSuccessResponse(res, {}, '로그아웃되었습니다.')
}

// 로그아웃은 항상 성공으로 처리해야 하므로 에러 핸들러에서도 특별 처리
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    await withErrorHandler(logoutHandler)(req, res)
  } catch (error) {
    console.error('❌ 로그아웃 처리 중 서버 오류:', error)
    
    // 로그아웃은 실패해도 성공으로 처리 (클라이언트 측 정리 위해)
    res.status(200).json({
      success: true,
      message: '로그아웃되었습니다.',
      warning: '일부 세션 정리 과정에서 오류가 발생했습니다.',
      timestamp: new Date().toISOString()
    })
  }
}
