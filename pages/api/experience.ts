import { NextApiRequest, NextApiResponse } from 'next'
import { 
  withErrorHandler, 
  checkMethod, 
  createApiError,
  ErrorCode,
  sendSuccessResponse,
  sendErrorResponse
} from '../../lib/apiErrorHandler'
import { callPastRecordAgent, callAutobiographicReasoningAgent, callPastContextAgent, callPastContextRelevanceAgent, callExperienceScaffoldingAgent, callPastContextScaffoldingAgent } from '../../lib/experienceAgent'
import { isOpenAIAPIError } from '../../lib/openai'
import {
  createAdminSupabaseClient,
  getAuthenticatedUser,
} from '../../utils/supabase/server'
async function experienceHandler(
  req: NextApiRequest,
  res: NextApiResponse,
  requestId: string
) {
  // 1. 메서드 검증
  const methodError = checkMethod(req, ['POST'])
  if (methodError) {
    return sendErrorResponse(res, methodError, requestId)
  }

  console.log('💭 경험 떠올리기 요청', `[${requestId}]`)

  // 2. 쿠키 세션으로 사용자 확인
  const { user: authUser, error: authError } = await getAuthenticatedUser(req, res)
  if (authError || !authUser) {
    const authenticationError = createApiError(
      ErrorCode.AUTHENTICATION_ERROR,
      '인증이 필요합니다.',
      401
    )
    return sendErrorResponse(res, authenticationError, requestId)
  }

  const supabase = createAdminSupabaseClient()
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('participant_code')
    .eq('id', authUser.id)
    .single()

  if (userError || !userData?.participant_code) {
    const userQueryError = createApiError(
      ErrorCode.DATABASE_ERROR,
      '사용자 정보를 찾을 수 없습니다.',
      404,
      { dbError: userError }
    )
    return sendErrorResponse(res, userQueryError, requestId)
  }

  const participantCode = userData.participant_code

  // 3. 요청 데이터 검증
  const { selectedText, currentEntryId } = req.body

  if (!selectedText || typeof selectedText !== 'string') {
    const validationError = createApiError(
      ErrorCode.VALIDATION_ERROR,
      '선택된 텍스트가 필요합니다.',
      400
    )
    return sendErrorResponse(res, validationError, requestId)
  }

  console.log('✅ 경험 떠올리기 - 선택된 텍스트 길이:', selectedText.length, `[${requestId}]`)

  // 3. 현재 엔트리를 제외한 이전 엔트리들 조회
  let query = supabase
    .from('entries')
    .select('id, title, content_html, created_at, sum_innerstate, sum_insight')
    .eq('participant_code', participantCode)
    .order('created_at', { ascending: false })

  // 현재 엔트리 제외
  if (currentEntryId) {
    query = query.neq('id', currentEntryId)
  }

  const { data: entries, error: entriesError } = await query

  if (entriesError) {
    console.error('❌ 엔트리 조회 실패:', entriesError, `[${requestId}]`)
    
    const entriesQueryError = createApiError(
      ErrorCode.DATABASE_ERROR,
      '이전 일기를 가져오는 데 실패했습니다.',
      500,
      { dbError: entriesError }
    )
    return sendErrorResponse(res, entriesQueryError, requestId)
  }

  if (!entries || entries.length === 0) {
    console.log('📝 이전 일기가 없습니다', `[${requestId}]`)
    
    return sendSuccessResponse(res, {
      experiences: [],
      selectedText: selectedText
    }, '이전 일기가 없습니다.')
  }

  // 7. 유사도 계산 및 관련 경험 찾기
  const experiencePromises = entries.map(async (entry) => {
    // 한 번의 API 호출로 두 필드를 모두 분석
    const analysis = await callPastRecordAgent(
      selectedText, 
      entry.sum_innerstate, 
      entry.sum_insight
    )

    return {
      ...entry,
      similarity: analysis.averageSimilarity,
      analysisReasons: analysis.analysisReasons
    }
  })

  const experiencesWithSimilarity = await Promise.all(experiencePromises)

  // 8. 유사도가 높은 순으로 정렬하고 상위 3개 선택
  const topExperiences = experiencesWithSimilarity
    .filter(exp => exp.similarity >= 0.7) // 최소 유사도 0.7 이상으로 필터링
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 3)

  console.log(`📊 상위 경험 ${topExperiences.length}개 선택됨`, `[${requestId}]`)
  console.log(`📊 전체 경험 ${experiencesWithSimilarity.length}개, 유사도 분포:`, experiencesWithSimilarity.map(exp => exp.similarity), `[${requestId}]`)

  // 9. 각 선택된 경험에 대해 상세 설명 및 전략 생성
  const experiencesWithDescriptions = await Promise.all(
    topExperiences.map(async (exp) => {
      try {
        console.log(`🔧 [STEP 1] 경험 설명 생성 (ID: ${exp.id})`, `[${requestId}]`)
        const descriptionResult = await callAutobiographicReasoningAgent(selectedText, {
          id: exp.id,
          sum_innerstate: exp.sum_innerstate,
          sum_insight: exp.sum_insight,
          content: exp.content_html
        })

        console.log(`🔧 [STEP 2] 경험 스캐폴딩 (ID: ${exp.id})`, `[${requestId}]`)
        const scaffoldedResult = await callExperienceScaffoldingAgent(descriptionResult, selectedText)

        return {
          id: exp.id,
          title: exp.title,
          content: exp.content_html,
          created_at: exp.created_at,
          sum_innerstate: exp.sum_innerstate,
          sum_insight: exp.sum_insight,
          similarity: exp.similarity,
          analysisReasons: exp.analysisReasons || [],
          strategy: scaffoldedResult.strategy,
          description: scaffoldedResult.description
        }
      } catch (error) {
        console.error(`❌ 경험 설명 생성 실패 (ID: ${exp.id}):`, error, `[${requestId}]`)
        if (isOpenAIAPIError(error)) {
          throw error
        }

        // 에러가 발생해도 기본 데이터는 반환
        return {
          id: exp.id,
          title: exp.title,
          content: exp.content_html,
          created_at: exp.created_at,
          sum_innerstate: exp.sum_innerstate,
          sum_insight: exp.sum_insight,
          similarity: exp.similarity,
          analysisReasons: exp.analysisReasons || [],
          strategy: '과거 경험 떠올려보기',
          description: '관련된 과거 경험이 있습니다.'
        }
      }
    })
  )

  console.log(`✅ 경험 떠올리기 완료: ${experiencesWithDescriptions.length}개 발견`, `[${requestId}]`)

  // 10. 과거 기록이 부족한 경우 과거 맥락 카드 추가
  let finalExperiences = experiencesWithDescriptions
  
  // 과거 맥락 카드 생성 조건: 
  // 1) 상세 설명이 생성된 경험이 3개 미만이거나
  // 2) 전체 경험이 있지만 모두 유사도 0.6 미만인 경우
  const shouldAddPastContext = experiencesWithDescriptions.length < 3 || 
    (experiencesWithSimilarity.length > 0 && topExperiences.length === 0)
  
  console.log(`🔍 과거 맥락 카드 생성 조건 확인:`, {
    experiencesWithDescriptionsLength: experiencesWithDescriptions.length,
    experiencesWithSimilarityLength: experiencesWithSimilarity.length,
    topExperiencesLength: topExperiences.length,
    shouldAddPastContext
  }, `[${requestId}]`)
  
  if (shouldAddPastContext) {
    try {
      console.log('🔍 사용자 프로필 조회 시작', `[${requestId}]`)
      
      // 사용자 프로필 정보 조회
      const { data: userProfile, error: profileError } = await supabase
        .from('users')
        .select('profile')
        .eq('participant_code', participantCode)
        .single()

      console.log('🔍 사용자 프로필 조회 결과:', { hasProfile: !!userProfile?.profile, hasError: !!profileError }, `[${requestId}]`)

      if (profileError) {
        console.error('❌ 사용자 프로필 조회 실패:', profileError, `[${requestId}]`)
      } else if (userProfile?.profile) {
        let profile
        let pastContext

        // profile이 문자열인지 객체인지 확인
        if (typeof userProfile.profile === 'string') {
          console.log('🔍 프로필이 문자열 형태입니다. JSON 파싱 시도 중...', `[${requestId}]`)
          try {
            profile = JSON.parse(userProfile.profile)
            console.log('✅ JSON 파싱 성공', `[${requestId}]`)
          } catch (parseError) {
            console.error('❌ JSON 파싱 실패:', parseError, `[${requestId}]`)
            profile = null
          }
        } else {
          console.log('🔍 프로필이 이미 객체 형태입니다', `[${requestId}]`)
          profile = userProfile.profile
        }

        if (profile) {
          pastContext = profile.personal_life_context?.past
        }

        console.log('🔍 과거 맥락 정보:', {
          profileExists: !!profile,
          profileType: typeof userProfile.profile,
          personalLifeContextExists: !!profile?.personal_life_context,
          pastContextExists: !!pastContext,
          pastContextLength: pastContext?.length || 0
        }, `[${requestId}]`)

        if (pastContext) {
          console.log('🌱 과거 맥락 연관성 분석 시작', `[${requestId}]`)
          
          // 먼저 과거 맥락과의 연관성 분석
          const relevanceAnalysis = await callPastContextRelevanceAgent(selectedText, pastContext)

          console.log('🔍 과거 맥락 연관성 분석 결과:', relevanceAnalysis.relevance, `[${requestId}]`)
          
          // 연관성이 0.4 이상일 때만 과거 맥락 카드 생성
          if (relevanceAnalysis.relevance >= 0.4) {
            console.log('🌱 [STEP 1] 과거 맥락 카드 생성 시작 (연관성 충족)', `[${requestId}]`)
            
            const pastContextResult = await callPastContextAgent(selectedText, pastContext)
            
            console.log('🌱 [STEP 2] 과거 맥락 스캐폴딩 시작', `[${requestId}]`)
            const scaffoldedPastContextResult = await callPastContextScaffoldingAgent(pastContextResult, selectedText)

            console.log('🔍 과거 맥락 스캐폴딩 완료', `[${requestId}]`)
            
            const pastContextCard = {
              id: 'past_context',
              title: '과거 배경',
              content: pastContext.substring(0, 200) + (pastContext.length > 200 ? '...' : ''),
              created_at: new Date().toISOString(),
              sum_innerstate: null,
              sum_insight: null,
              similarity: relevanceAnalysis.relevance, // 실제 분석된 연관성 사용
              analysisReasons: [`과거 생애 맥락 기반: ${relevanceAnalysis.reason}`],
              strategy: scaffoldedPastContextResult.strategy,
              description: scaffoldedPastContextResult.description,
              isPastContext: true // 과거 맥락 카드임을 표시
            }

            finalExperiences = [...experiencesWithDescriptions, pastContextCard]
            console.log('✅ 과거 맥락 카드 추가됨 (연관성:', relevanceAnalysis.relevance, ')', `[${requestId}]`)
          } else {
            console.log('⚠️ 과거 맥락 연관성 부족으로 카드 생성 건너뜀 (연관성:', relevanceAnalysis.relevance, ')', `[${requestId}]`)
          }
        } else {
          console.log('⚠️ 과거 맥락 정보가 없습니다', `[${requestId}]`)
        }
      } else {
        console.log('⚠️ 사용자 프로필이 없습니다', `[${requestId}]`)
      }
    } catch (error) {
      console.error('❌ 과거 맥락 카드 생성 실패:', error, `[${requestId}]`)
      if (isOpenAIAPIError(error)) {
        throw error
      }
    }
  }

  // 11. 성공 응답
  console.log('🎯 최종 응답 데이터:', {
    experiencesCount: finalExperiences.length,
    experienceIds: finalExperiences.map(exp => exp.id),
    hasPastContext: finalExperiences.some(exp => (exp as any).isPastContext),
    experienceDetails: finalExperiences.map(exp => ({
      id: exp.id,
      similarity: exp.similarity,
      isPastContext: (exp as any).isPastContext,
      type: (exp as any).isPastContext ? '과거 맥락 (연관성)' : '과거 기록 (유사도)'
    }))
  }, `[${requestId}]`)
  
  sendSuccessResponse(res, {
    experiences: finalExperiences,
    selectedText: selectedText,
    totalEntriesChecked: entries.length
  }, `${finalExperiences.length}개의 관련 경험을 찾았습니다.`)
}

export default withErrorHandler(experienceHandler)
