// pages/survey.tsx
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { Button, TextInput, Textarea, Heading, Section } from '../components'
import { useSession } from '../hooks/useSession'

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

const initialSurveyData: SurveyData = {
  participantCode: '',
  age: '',
  gender: '',
  education: '',
  region: '',
  major: '',
  jobStatus: '',
  religion: '',
  conservative: null,
  reliable: null,
  lazy: null,
  relaxed: null,
  artInterest: null,
  sociable: null,
  critical: null,
  thorough: null,
  nervous: null,
  imaginative: null,
  tradition: null,
  stimulation: null,
  hedonism: null,
  achievement: null,
  power: null,
  security: null,
  conformity: null,
  benevolence: null,
  universalism: null,
  selfdirection: null,
  pastEvents: '',
  currentLife: '',
  futureGoals: ''
}

export default function SurveyPage() {
  const { user, loading: sessionLoading, refreshUser } = useSession()
  const [surveyData, setSurveyData] = useState<SurveyData>(initialSurveyData)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()

  // 인증 체크
  useEffect(() => {
    if (!sessionLoading && !user) {
      router.push('/login')
    }
  }, [user, sessionLoading, router])

  // 이미 profile이 있는 경우 메인 페이지로 리다이렉트
  useEffect(() => {
    if (user && user.profile) {
      console.log('🔍 survey.tsx user.profile 디버깅:', {
        profile: user.profile,
        type: typeof user.profile,
        isString: typeof user.profile === 'string',
        isObject: typeof user.profile === 'object'
      })
      
      const hasProfile = user.profile && 
        ((typeof user.profile === 'string' && user.profile.trim() !== '') ||
         (typeof user.profile === 'object' && user.profile !== null))
      
      if (hasProfile) {
        console.log('📝 이미 프로필이 존재함 - 메인 페이지로 이동')
        router.push('/')
      }
    }
  }, [user, router])

  // 참가자 코드 자동 입력
  useEffect(() => {
    if (user && user.participant_code) {
      setSurveyData(prev => ({
        ...prev,
        participantCode: user.participant_code
      }))
    }
  }, [user])

  const handleInputChange = (field: keyof SurveyData, value: string | number) => {
    setSurveyData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSubmit = async () => {
    if (isSubmitting) return

    // 필수 필드 검증
    const requiredFields = [
      'participantCode', 'age', 'gender', 'education', 'region', 
      'jobStatus', 'religion', 'pastEvents', 'currentLife', 'futureGoals'
    ]
    
    // 리커트 척도 필수 항목들 추가
    const requiredLikertFields = [
      'conservative', 'reliable', 'lazy', 'relaxed', 'artInterest', 
      'sociable', 'critical', 'thorough', 'nervous', 'imaginative',
      'tradition', 'stimulation', 'hedonism', 'achievement', 'power',
      'security', 'conformity', 'benevolence', 'universalism', 'selfdirection'
    ]
    
    const emptyFields = requiredFields.filter(field => {
      const value = surveyData[field as keyof SurveyData]
      return !value || (typeof value === 'string' && value.trim() === '')
    })
    
    const emptyLikertFields = requiredLikertFields.filter(field => {
      const value = surveyData[field as keyof SurveyData]
      return value === null
    })
    
    if (emptyFields.length > 0 || emptyLikertFields.length > 0) {
      const missingFields = [...emptyFields, ...emptyLikertFields]
      alert(`필수 항목을 모두 입력해주세요.`)
      return
    }

    // 나이 유효성 검증
    const age = parseInt(surveyData.age)
    if (isNaN(age) || age < 1 || age > 120) {
      alert('올바른 나이를 입력해주세요.')
      return
    }

    setIsSubmitting(true)

    try {
      // localStorage에서 세션 정보 가져오기
      const sessionData = localStorage.getItem('supabase_session')
      if (!sessionData) {
        throw new Error('세션 정보가 없습니다. 다시 로그인해주세요.')
      }

      const session = JSON.parse(sessionData)
      if (!session.access_token) {
        throw new Error('액세스 토큰이 없습니다. 다시 로그인해주세요.')
      }

      // 설문 결과를 서버로 전송하여 OpenAI API를 통해 profile 생성
      const response = await fetch('/api/survey/generate-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(surveyData)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '프로필 생성에 실패했습니다.')
      }

      console.log('✅ 프로필 생성 성공')
      alert('프로필이 성공적으로 생성되었습니다!')
      
      // 사용자 정보 새로고침
      await refreshUser()
      
      // 메인 페이지로 이동
      router.push('/')
      
    } catch (error) {
      console.error('❌ 프로필 생성 실패:', error)
      alert(error instanceof Error ? error.message : '프로필 생성 중 오류가 발생했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderLikertScale = (field: keyof SurveyData, label: string, maxScale: number = 5) => {
    const value = surveyData[field] as number | null
    const scaleLabels = maxScale === 6 
      ? { min: '전혀 나와 다르다', max: '매우 나와 비슷하다' }
      : { min: '전혀 동의하지 않음', max: '매우 동의함' }
    
    return (
      <div className="bg-white rounded-2xl p-6 shadow-soft border border-gray-200 mb-4">
        <label className="block text-base font-medium text-gray-800 mb-6 leading-relaxed">
          {label} <span className="text-red-500">*</span>
        </label>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted w-28 text-center leading-tight">{scaleLabels.min}</span>
          <div className="flex space-x-6 mx-6">
            {Array.from({ length: maxScale }, (_, i) => i + 1).map(num => (
              <label key={num} className="flex flex-col items-center cursor-pointer group">
                <input
                  type="radio"
                  name={field}
                  value={num}
                  checked={value === num}
                  onChange={() => handleInputChange(field, num)}
                  className="mb-3 w-5 h-5 text-gray-600 border-2 border-gray-300 focus:ring-gray-500 focus:ring-2 transition-all duration-200"
                />
                <span className={`text-sm font-medium transition-colors duration-200 ${
                  value === num ? 'text-gray-800' : 'text-gray-400 group-hover:text-gray-600'
                }`}>
                  {num}
                </span>
              </label>
            ))}
          </div>
          <span className="text-xs text-muted w-28 text-center leading-tight">{scaleLabels.max}</span>
        </div>
      </div>
    )
  }

  const renderRadioGroup = (field: keyof SurveyData, options: string[], otherField?: keyof SurveyData) => {
    const value = surveyData[field] as string
    const otherValue = otherField ? surveyData[otherField] as string : ''
    
    return (
      <div className="space-y-3">
        {options.map(option => (
          <label key={option} className="flex items-center p-3 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 cursor-pointer transition-all duration-200">
            <input
              type="radio"
              name={field}
              value={option}
              checked={value === option}
              onChange={(e) => handleInputChange(field, e.target.value)}
              className="w-4 h-4 text-gray-600 border-gray-300 focus:ring-gray-500 focus:ring-2"
            />
            <span className="ml-3 text-gray-700">{option}</span>
          </label>
        ))}
        {value === '기타' && otherField && (
          <div className="ml-7 mt-2">
            <TextInput
              value={otherValue}
              onChange={(value) => handleInputChange(otherField, value)}
              placeholder="직접 입력해주세요"
              className="w-full"
            />
          </div>
        )}
      </div>
    )
  }

  // 로딩 중이면 로딩 화면 표시
  if (sessionLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="text-lg text-gray-600">Loading...</div>
          <div className="text-sm text-gray-400 mt-2">Checking session...</div>
        </div>
      </div>
    )
  }

  // 로그인되지 않은 경우
  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="text-lg text-gray-600">Moving to login page...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#faf9f5]">
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* 헤더 */}
        <Section className="text-center mb-8">
          <Heading level={1} className="mb-4">프로필 설문</Heading>
          <p className="text-gray-600 max-w-2xl mx-auto leading-relaxed">
            더 나은 일기 작성 경험을 위해 몇 가지 질문에 답해주세요.<br />
            모든 정보는 개인화된 서비스 제공을 위해서만 사용됩니다.
          </p>
        </Section>

        <div className="space-y-8">
          {/* 기본정보 섹션 */}
          <Section>
            <div className="border-b border-gray-200 pb-4 mb-6">
              <Heading level={2} className="mb-2">기본정보</Heading>
              <p className="text-gray-600 text-base">기본적인 인적사항을 알려주세요.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* 참가자 번호 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  참가자 번호 <span className="text-red-500">*</span>
                </label>
                <TextInput
                  value={surveyData.participantCode}
                  onChange={(value) => handleInputChange('participantCode', value)}
                  placeholder="예: P1"
                  className="w-full"
                />
              </div>

              {/* 나이 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  나이 <span className="text-red-500">*</span>
                </label>
                <TextInput
                  type="number"
                  value={surveyData.age}
                  onChange={(value) => handleInputChange('age', value)}
                  placeholder="만 나이"
                  className="w-full"
                />
              </div>

              {/* 거주 지역 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  거주 지역 <span className="text-red-500">*</span>
                </label>
                <TextInput
                  value={surveyData.region}
                  onChange={(value) => handleInputChange('region', value)}
                  placeholder="예: 서울, 부산, 대구"
                  className="w-full"
                />
              </div>

              {/* 전공 분야 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  전공 분야 <span className="text-gray-400">(선택사항)</span>
                </label>
                <TextInput
                  value={surveyData.major || ''}
                  onChange={(value) => handleInputChange('major', value)}
                  placeholder="전공 분야"
                  className="w-full"
                />
              </div>
            </div>

            <div className="space-y-6">
              {/* 성별 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  성별 <span className="text-red-500">*</span>
                </label>
                {renderRadioGroup('gender', ['여성', '남성', '답변하고 싶지 않음', '기타'], 'genderOther')}
              </div>

              {/* 최종 학력 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  최종 학력 <span className="text-red-500">*</span>
                </label>
                {renderRadioGroup('education', ['고등학교 졸업 이하', '전문학사 졸업', '학사 졸업', '석사 졸업', '박사 졸업'])}
              </div>

              {/* 직업 상태 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  직업 상태 <span className="text-red-500">*</span>
                </label>
                {renderRadioGroup('jobStatus', ['정규직 근무 중', '시간제/비정규직', '프리랜서', '무직/구직 중', '학생', '기타'], 'jobStatusOther')}
              </div>

              {/* 종교 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  종교 <span className="text-red-500">*</span>
                </label>
                {renderRadioGroup('religion', ['무교', '기독교', '불교', '이슬람교', '답변하고 싶지 않습니다', '기타'], 'religionOther')}
              </div>
            </div>
          </Section>

          {/* 자기 인식 섹션 */}
          <Section>
            <div className="border-b border-gray-200 pb-4 mb-6">
              <Heading level={2} className="mb-2">자기 인식</Heading>
              <p className="text-gray-600 text-base">
                다음 문항들을 읽고 자신의 생각과 가장 가까운 답을 선택해주세요.
              </p>
            </div>

            <div>
              {renderLikertScale('conservative', '나는 나 자신이 보수적인 사람이라고 생각한다.')}
              {renderLikertScale('reliable', '나는 나 자신이 믿음직스러운 사람이라고 생각한다.')}
              {renderLikertScale('lazy', '나는 나 자신이 게으른 사람이라고 생각한다.')}
              {renderLikertScale('relaxed', '나는 나 자신이 느긋한 편이고, 스트레스를 잘 해소하는 사람이라고 생각한다.')}
              {renderLikertScale('artInterest', '나는 나 자신이 예술에 대한 관심이 별로 없는 사람이라고 생각한다.')}
              {renderLikertScale('sociable', '나는 나 자신이 어울리기를 좋아하고 사교적인 사람이라고 생각한다.')}
              {renderLikertScale('critical', '나는 나 자신이 다른 사람의 흠을 잘 잡는 사람이라고 생각한다.')}
              {renderLikertScale('thorough', '나는 나 자신이 맡은 일을 철저히 하는 사람이라고 생각한다.')}
              {renderLikertScale('nervous', '나는 나 자신이 쉽게 신경질을 내는 사람이라고 생각한다.')}
              {renderLikertScale('imaginative', '나는 나 자신이 상상력이 풍부한 사람이라고 생각한다.')}
            </div>
          </Section>

          {/* 가치관 섹션 */}
          <Section>
            <div className="border-b border-gray-200 pb-4 mb-6">
              <Heading level={2} className="mb-2">가치관</Heading>
              <p className="text-gray-600 text-base mb-4">
                다음은 여러 사람들에 대한 간단한 설명입니다. 각 설명을 읽고, 그 사람이 당신과 얼마나 비슷한지 평가해주세요.
              </p>
            </div>

            <div>
              {renderLikertScale('tradition', '이 사람은 부모님과 어른에게 항상 존경을 표하고, 순종해야 한다고 믿습니다.', 6)}
              {renderLikertScale('stimulation', '이 사람은 종교적 신념을 중요하게 여기며, 자신의 종교가 요구하는 것을 실천하려고 노력합니다.', 6)}
              {renderLikertScale('hedonism', '이 사람은 주변 사람들을 돕고, 그들의 안녕을 돌보는 것을 매우 중요하게 생각합니다.', 6)}
              {renderLikertScale('achievement', '이 사람은 세상의 모든 사람이 평등한 기회를 누려야 하며, 공평하게 대우받는 것이 중요하다고 생각합니다.', 6)}
              {renderLikertScale('power', '이 사람은 새로운 것에 흥미를 느끼고, 세상을 이해하려고 호기심을 가지고 탐구하는 것을 중요하게 생각합니다.', 6)}
              {renderLikertScale('security', '이 사람은 위험을 감수하고, 모험을 추구하는 것을 좋아합니다.', 6)}
              {renderLikertScale('conformity', '이 사람은 즐거움을 추구하고, 기회가 될 때마다 재미있는 일을 하려고 합니다.', 6)}
              {renderLikertScale('benevolence', '이 사람은 성공과 다른 사람에게 인정을 받는 것을 중요하게 생각합니다.', 6)}
              {renderLikertScale('universalism', '이 사람은 다른 사람을 이끌고, 지시하는 위치에 있는 것을 중요하게 여깁니다.', 6)}
              {renderLikertScale('selfdirection', '이 사람은 정돈되고 깔끔한 상태를 좋아하며, 지저분한 것을 싫어합니다.', 6)}
            </div>
          </Section>

          {/* 삶의 맥락 섹션 */}
          <Section>
            <div className="border-b border-gray-200 pb-4 mb-6">
              <Heading level={2} className="mb-2">삶의 맥락</Heading>
              <p className="text-gray-600 text-base">
                자신의 삶에 대해 간단히 소개해주세요. 각 질문에 대해 자유롭게 작성해주시면 됩니다.
              </p>
            </div>

            <div className="space-y-6">
              {/* 과거 사건 */}
              <div>
                <label className="block text-base font-bold text-gray-700 mb-2">
                  과거 경험을 통해 현재의 나를 소개해주세요 <span className="text-red-500">*</span>
                </label>
                <p className="text-sm text-gray-500 mb-3">
                  현재의 나를 만든 인상 깊었던 사건들, 좋아하는 것, 싫어하는 것 등을 자유롭게 작성해주세요.
                </p>
                <div className="relative">
                  <Textarea
                    value={surveyData.pastEvents}
                    onChange={(value) => handleInputChange('pastEvents', value)}
                    placeholder="과거 경험과 그것이 현재의 나에게 미친 영향에 대해 써주세요."
                    rows={6}
                    className="w-full transition-all duration-200 focus:ring-2 focus:ring-gray-400 focus:border-gray-400 hover:border-gray-300 border-gray-200"
                  />
                  <div className={`absolute bottom-3 right-3 text-xs transition-colors duration-200 ${
                    surveyData.pastEvents.length > 0 ? 'text-gray-500' : 'text-gray-400'
                  }`}>
                    {surveyData.pastEvents.length}자
                  </div>
                </div>
              </div>

              {/* 현재 삶 */}
              <div>
                <label className="block text-base font-bold text-gray-700 mb-2">
                  현재 어떻게 살아가고 있나요? <span className="text-red-500">*</span>
                </label>
                <p className="text-sm text-gray-500 mb-3">
                  일상생활, 주요 관심사, 현재 고민하고 있는 것들에 대해 알려주세요.
                </p>
                <div className="relative">
                  <Textarea
                    value={surveyData.currentLife}
                    onChange={(value) => handleInputChange('currentLife', value)}
                    placeholder="현재의 일상과 관심사, 고민거리에 대해 써주세요."
                    rows={6}
                    className="w-full transition-all duration-200 focus:ring-2 focus:ring-gray-400 focus:border-gray-400 hover:border-gray-300 border-gray-200"
                  />
                  <div className={`absolute bottom-3 right-3 text-xs transition-colors duration-200 ${
                    surveyData.currentLife.length > 0 ? 'text-gray-500' : 'text-gray-400'
                  }`}>
                    {surveyData.currentLife.length}자
                  </div>
                </div>
              </div>

              {/* 미래 목표 */}
              <div>
                <label className="block text-base font-bold text-gray-700 mb-2">
                  앞으로 어떤 사람이 되고 싶나요? <span className="text-red-500">*</span>
                </label>
                <p className="text-sm text-gray-500 mb-3">
                  미래의 목표, 꿈, 되고 싶은 모습에 대해 자유롭게 작성해주세요.
                </p>
                <div className="relative">
                  <Textarea
                    value={surveyData.futureGoals}
                    onChange={(value) => handleInputChange('futureGoals', value)}
                    placeholder="미래의 목표와 꿈에 대해 써주세요."
                    rows={6}
                    className="w-full transition-all duration-200 focus:ring-2 focus:ring-gray-400 focus:border-gray-400 hover:border-gray-300 border-gray-200"
                  />
                  <div className={`absolute bottom-3 right-3 text-xs transition-colors duration-200 ${
                    surveyData.futureGoals.length > 0 ? 'text-gray-500' : 'text-gray-400'
                  }`}>
                    {surveyData.futureGoals.length}자
                  </div>
                </div>
              </div>
            </div>
          </Section>
        </div>

        {/* 제출 버튼 */}
        <div className="mt-8 text-center">
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-8 py-3 text-lg"
          >
            {isSubmitting ? '프로필 생성 중...' : '프로필 생성하기'}
          </Button>
          
          <p className="text-sm text-gray-500 mt-4 max-w-2xl mx-auto">
            <span className="text-red-500">*</span> 표시된 항목은 필수입니다. 
            입력하신 모든 정보는 안전하게 보호되며,<br />개인화된 일기 작성 도움을 위해서만 사용됩니다.
          </p>
        </div>
      </div>
    </div>
  )
} 