import { NextApiRequest, NextApiResponse } from 'next'
import { 
  withErrorHandler, 
  checkMethod, 
  validateRequired,
  createApiError,
  ErrorCode,
  sendSuccessResponse,
  sendErrorResponse
} from '../../../lib/apiErrorHandler'
import {
  createAdminSupabaseClient,
  getAuthenticatedUser,
} from '../../../utils/supabase/server'

interface SurveyData {
  // 기본정보
  participantCode: string
  age: string
  gender: string
  genderOther?: string
  education: string
  region: string
  major?: string
  jobStatus: string
  jobStatusOther?: string
  religion: string
  religionOther?: string
  
  // 자기인식 (1-5 척도)
  conservative: number | null
  reliable: number | null
  lazy: number | null
  relaxed: number | null
  artInterest: number | null
  sociable: number | null
  critical: number | null
  thorough: number | null
  nervous: number | null
  imaginative: number | null
  
  // 가치관 (1-6 척도)
  tradition: number | null
  stimulation: number | null
  hedonism: number | null
  achievement: number | null
  power: number | null
  security: number | null
  conformity: number | null
  benevolence: number | null
  universalism: number | null
  selfdirection: number | null
  
  // 삶의 맥락
  pastEvents: string
  currentLife: string
  futureGoals: string
}

async function generateProfile(surveyData: SurveyData): Promise<string> {
  const openaiApiKey = process.env.OPENAI_API_KEY
  
  if (!openaiApiKey) {
    throw new Error('OpenAI API 키가 설정되지 않았습니다.')
  }

  const prompt = `다음 설문 응답을 바탕으로 사용자의 프로필을 JSON 형식으로 구조화하여 작성해주세요. 일기 작성 도움을 위한 개인화된 프로필입니다.

기본 정보:
- 나이: ${surveyData.age}세
- 성별: ${surveyData.gender}${surveyData.genderOther ? ` (${surveyData.genderOther})` : ''}
- 학력: ${surveyData.education}
- 거주지역: ${surveyData.region}
- 전공: ${surveyData.major || '없음'}
- 직업상태: ${surveyData.jobStatus}${surveyData.jobStatusOther ? ` (${surveyData.jobStatusOther})` : ''}
- 종교: ${surveyData.religion}${surveyData.religionOther ? ` (${surveyData.religionOther})` : ''}

성격 특성 (1-5 척도, 1=매우 반대, 5=매우 동의):
- 보수적 성향: ${surveyData.conservative || '미응답'}
- 믿음직스러운: ${surveyData.reliable || '미응답'}
- 게으른 편: ${surveyData.lazy || '미응답'}
- 느긋하고 스트레스 해소 잘함: ${surveyData.relaxed || '미응답'}
- 예술적 경험 관심: ${surveyData.artInterest || '미응답'}
- 사교적이고 외향적: ${surveyData.sociable || '미응답'}
- 비판적 사고: ${surveyData.critical || '미응답'}
- 철저하고 꼼꼼한: ${surveyData.thorough || '미응답'}
- 신경질적인 면: ${surveyData.nervous || '미응답'}
- 상상력 풍부: ${surveyData.imaginative || '미응답'}

가치관 (1-6 척도, 1=매우 다름, 6=매우 비슷함):
- 전통과 관습 중시: ${surveyData.tradition || '미응답'}
- 새로운 자극과 변화 추구: ${surveyData.stimulation || '미응답'}
- 즐거움과 쾌락 추구: ${surveyData.hedonism || '미응답'}
- 성취와 성공 중요: ${surveyData.achievement || '미응답'}
- 권력과 영향력 중시: ${surveyData.power || '미응답'}
- 안전과 안정 추구: ${surveyData.security || '미응답'}
- 사회적 규범과 질서 중시: ${surveyData.conformity || '미응답'}
- 타인의 복지와 도움 중시: ${surveyData.benevolence || '미응답'}
- 보편적 가치와 공정성 추구: ${surveyData.universalism || '미응답'}
- 자율성과 독립성 중시: ${surveyData.selfdirection || '미응답'}

과거 경험과 현재 상황:
${surveyData.pastEvents}

현재 삶의 방식:
${surveyData.currentLife}

미래 목표:
${surveyData.futureGoals}

위의 설문 데이터를 종합적으로 분석하여 다음 JSON 형식으로 응답해주세요:

{
  "social_identity": {
    "age": 나이(숫자),
    "major": "전공분야",
    "gender": "성별",
    "residence": "거주지역",
    "education_level": "학력",
    "religious_belief": "종교",
    "occupation_status": "직업상태"
  },
  "personal_identity": {
    "personality": "성격 특성 요약 (설문 점수를 종합하여 자연스럽게 설명)",
    "value": "가치관 특성 요약 (상대적 중요도와 주요 가치관을 고려하여 설명)"
  },
  "personal_life_context": {
    "past": "과거 경험 요약",
    "present": "현재 상황 요약",
    "future": "미래 목표 요약"
  }
}

성격과 가치관 해석 시 주의사항:
- 설문 점수의 상대적 중요도를 고려하세요
- 단순 나열보다는 통합적인 특성으로 요약하세요
- 일기 작성에 도움이 되는 관점에서 해석하세요
- 자연스러운 한국어로 작성하세요

JSON 형식만 반환하고, 다른 텍스트는 포함하지 마세요.`

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: '당신은 사용자의 설문 응답을 바탕으로 구조화된 JSON 형식의 프로필을 작성하는 전문가입니다. 성격과 가치관을 종합적으로 분석하여 자연스럽고 통찰력 있는 설명을 제공하세요. 정확한 JSON 형식으로만 응답하세요.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 1000,
        temperature: 0.5
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(`OpenAI API 오류: ${errorData.error?.message || 'Unknown error'}`)
    }

    const data = await response.json()
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('OpenAI API 응답 형식이 올바르지 않습니다.')
    }

    const profileContent = data.choices[0].message.content.trim()
    
    // JSON 형식 검증 및 파싱
    let parsedProfile: any
    try {
      parsedProfile = JSON.parse(profileContent)
      // 파싱된 JSON 객체를 다시 문자열로 변환 (이중 인코딩 방지)
      return JSON.stringify(parsedProfile)
    } catch (jsonError) {
      console.error('❌ JSON 파싱 오류:', jsonError)
      throw new Error('생성된 프로필이 올바른 JSON 형식이 아닙니다.')
    }
    
  } catch (error) {
    console.error('❌ OpenAI API 호출 실패:', error)
    throw error
  }
}

async function generateProfileHandler(
  req: NextApiRequest,
  res: NextApiResponse,
  requestId: string
) {
  // 1. 메서드 검증
  const methodError = checkMethod(req, ['POST'])
  if (methodError) {
    return sendErrorResponse(res, methodError, requestId)
  }

  // 2. 인증 확인
  console.log('📝 프로필 생성 요청', `[${requestId}]`)

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

  // 4. 입력값 검증
  const surveyData: SurveyData = req.body
  
  const validationError = validateRequired(surveyData, ['participantCode', 'age', 'gender', 'education', 'region', 'jobStatus', 'religion', 'pastEvents', 'currentLife', 'futureGoals'])
  if (validationError) {
    return sendErrorResponse(res, validationError, requestId)
  }

  // 나이 유효성 검증
  const age = parseInt(surveyData.age)
  if (isNaN(age) || age < 1 || age > 120) {
    const ageError = createApiError(
      ErrorCode.VALIDATION_ERROR,
      '올바른 나이를 입력해주세요.',
      400
    )
    return sendErrorResponse(res, ageError, requestId)
  }

  // 5. 사용자 정보 조회
  const supabase = createAdminSupabaseClient()
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('id', authUser.id)
    .single()

  if (userError) {
    console.error('❌ 사용자 정보 조회 실패:', userError, `[${requestId}]`)
    
    const userQueryError = createApiError(
      ErrorCode.DATABASE_ERROR,
      '사용자 정보 조회에 실패했습니다.',
      500,
      { dbError: userError }
    )
    return sendErrorResponse(res, userQueryError, requestId)
  }

  // 6. 이미 프로필이 있는 경우 확인
  console.log('🔍 API userData.profile 디버깅:', {
    profile: userData.profile,
    type: typeof userData.profile,
    isString: typeof userData.profile === 'string',
    isObject: typeof userData.profile === 'object'
  }, `[${requestId}]`)
  
  const hasProfile = userData.profile && 
    ((typeof userData.profile === 'string' && userData.profile.trim() !== '') ||
     (typeof userData.profile === 'object' && userData.profile !== null))
  
  if (hasProfile) {
    console.log('⚠️ 이미 프로필이 존재함', `[${requestId}]`)
    
    const profileExistsError = createApiError(
      ErrorCode.CONFLICT,
      '이미 프로필이 설정되어 있습니다.',
      409
    )
    return sendErrorResponse(res, profileExistsError, requestId)
  }

  try {
    // 7. OpenAI API를 통해 프로필 생성
    console.log('🤖 OpenAI API 호출 시작', `[${requestId}]`)
    const generatedProfile = await generateProfile(surveyData)
    console.log('✅ 프로필 생성 완료', `[${requestId}]`)

    // 8. 데이터베이스에 프로필 저장
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({ profile: generatedProfile })
      .eq('id', authUser.id)
      .select()
      .single()

    if (updateError) {
      console.error('❌ 프로필 저장 실패:', updateError, `[${requestId}]`)
      
      const updateUserError = createApiError(
        ErrorCode.DATABASE_ERROR,
        '프로필 저장에 실패했습니다.',
        500,
        { dbError: updateError }
      )
      return sendErrorResponse(res, updateUserError, requestId)
    }

    console.log('✅ 프로필 저장 완료:', userData.participant_code, `[${requestId}]`)

    // 9. 성공 응답
    sendSuccessResponse(res, {
      user: updatedUser,
      profile: generatedProfile
    }, '프로필이 성공적으로 생성되었습니다.')

  } catch (error) {
    console.error('❌ 프로필 생성 중 오류:', error, `[${requestId}]`)
    
    const profileGenerationError = createApiError(
      ErrorCode.SERVER_ERROR,
      error instanceof Error ? error.message : '프로필 생성에 실패했습니다.',
      500,
      { originalError: error instanceof Error ? error.message : 'Unknown error' }
    )
    return sendErrorResponse(res, profileGenerationError, requestId)
  }
}

export default withErrorHandler(generateProfileHandler)
