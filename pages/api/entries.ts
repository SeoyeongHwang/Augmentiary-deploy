import { NextApiRequest, NextApiResponse } from 'next'
import { callSummaryAgent, updateEntrySummary } from '../../lib/summaryAgent'
import { getCurrentKST } from '../../lib/time'
import {
  createAdminSupabaseClient,
  getAuthenticatedUser,
} from '../../utils/supabase/server'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { user: authUser, error: authError } = await getAuthenticatedUser(req, res)
    if (authError || !authUser) {
      return res.status(401).json({ error: '인증이 필요합니다.' })
    }

    const supabase = createAdminSupabaseClient()
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('participant_code')
      .eq('id', authUser.id)
      .single()

    if (userError || !userData?.participant_code) {
      return res.status(404).json({ error: '사용자 정보를 찾을 수 없습니다.' })
    }

    const participantCode = userData.participant_code
    const { entryData, esmData, logsData, aiPromptsData, additionalMetrics } = req.body

    if (
      typeof entryData?.id !== 'string' ||
      typeof entryData?.title !== 'string' ||
      typeof entryData?.content_html !== 'string' ||
      !entryData.id.trim() ||
      !entryData.title.trim()
    ) {
      return res.status(400).json({ error: 'Entry 필수 값이 올바르지 않습니다.' })
    }

    if (
      entryData.id.length > 200 ||
      entryData.title.length > 500 ||
      entryData.content_html.length > 100_000
    ) {
      return res.status(400).json({ error: 'Entry 데이터가 허용 크기를 초과했습니다.' })
    }

    const { data: existingEntry, error: existingEntryError } = await supabase
      .from('entries')
      .select('participant_code')
      .eq('id', entryData.id)
      .maybeSingle()

    if (existingEntryError) {
      return res.status(500).json({ error: 'Entry 소유권 확인에 실패했습니다.' })
    }

    if (
      existingEntry &&
      existingEntry.participant_code !== participantCode
    ) {
      return res.status(403).json({ error: '해당 Entry를 수정할 권한이 없습니다.' })
    }

    // 매우 안전한 JSON 변환 함수 (순환 참조 완전 차단)
    const safeStringify = (obj: any) => {
      const seen = new WeakSet();
      
      try {
        return JSON.stringify(obj, (key, value) => {
          // 순환 참조 차단
          if (typeof value === 'object' && value !== null) {
            if (seen.has(value)) {
              return '[Circular Reference]';
            }
            seen.add(value);
          }
          
          // 위험한 타입들 제외
          if (typeof value === 'function' || 
              typeof value === 'undefined' || 
              typeof value === 'symbol') {
            return undefined;
          }
          
          // DOM/React 요소 완전 차단
          if (value && typeof value === 'object') {
            // HTML 요소 체크
            if (value.nodeType || 
                value.nodeName || 
                (value.constructor && (
                  value.constructor.name?.includes('HTML') ||
                  value.constructor.name?.includes('Element') ||
                  value.constructor.name?.includes('Node') ||
                  value.constructor.name?.includes('Fiber')
                ))) {
              return undefined;
            }
            
            // React 관련 속성 체크
            if (value._reactInternalFiber || 
                value._reactFiber ||
                value.$$typeof ||
                value._owner ||
                value.stateNode) {
              return undefined;
            }
            
            // 너무 큰 객체 제한
            if (Object.keys(value).length > 50) {
              return '[Object Too Large]';
            }
          }
          
          // 문자열 길이 제한
          if (typeof value === 'string' && value.length > 2000) {
            return value.substring(0, 2000) + '...[truncated]';
          }
          
          return value;
        });
      } catch (error) {
        console.error('❌ JSON 변환 완전 실패:', error);
        return '[]'; // 기본값으로 빈 배열
      }
    };

    // 추가 메트릭 데이터가 있는 경우 entryData에 포함
    let finalEntryData = {
      id: entryData.id,
      participant_code: participantCode,
      title: entryData.title.trim(),
      content_html: entryData.content_html,
      shared: entryData.shared === true,
      created_at:
        typeof entryData.created_at === 'string'
          ? entryData.created_at
          : getCurrentKST(),
    }
    if (additionalMetrics) {
      // 안전한 로그 출력 (AI 텍스트 배열 요약)
      const logSafeMetrics = {
        leftPanelRequests: additionalMetrics.leftPanelRequests || 0,
        rightPanelRequests: additionalMetrics.rightPanelRequests || 0,
        leftPanelInsertions: additionalMetrics.leftPanelInsertions || 0,
        rightPanelInsertions: additionalMetrics.rightPanelInsertions || 0,
        syllableCount: additionalMetrics.syllableCount || 0,
        aiTextsCount: Array.isArray(additionalMetrics.aiTextsAdded) ? additionalMetrics.aiTextsAdded.length : 0
      };
      console.log('📊 [API] 받은 추가 메트릭:', logSafeMetrics)
      
      // 기존 테이블에 새로운 필드들을 안전하게 추가
      const metricsToAdd = {
        left_panel_requests: additionalMetrics.leftPanelRequests || 0,
        right_panel_requests: additionalMetrics.rightPanelRequests || 0,
        left_panel_insertions: additionalMetrics.leftPanelInsertions || 0,
        right_panel_insertions: additionalMetrics.rightPanelInsertions || 0,
        ai_texts_added: safeStringify(additionalMetrics.aiTextsAdded || []),
        syllable_count: additionalMetrics.syllableCount || 0
      }
      
      console.log('📊 [API] 추가할 메트릭 필드들:', {
        ...logSafeMetrics,
        ai_texts_added_length: metricsToAdd.ai_texts_added.length
      })
      
      finalEntryData = {
        ...finalEntryData,
        ...metricsToAdd
      }
      
      console.log('📊 [API] 최종 저장 데이터 요약:', {
        id: finalEntryData.id,
        participant_code: finalEntryData.participant_code,
        title: finalEntryData.title?.substring(0, 20) + '...',
        content_length: finalEntryData.content_html?.length || 0,
        ...logSafeMetrics
      })
    } else {
      console.log('⚠️ [API] additionalMetrics가 없음')
    }

    // 1. Entry 저장
    console.log('💾 [API] Entry 저장 시도 중...')
    const { data: entryResult, error: entryError } = await supabase
      .from('entries')
      .upsert(finalEntryData)
      .select()

    if (entryError) {
      console.error('❌ Entry 저장 실패:', entryError)
      return res.status(500).json({ 
        error: 'Entry 저장 실패', 
        details: entryError 
      })
    }
    
    // 저장 결과를 안전하게 로그 출력
    if (entryResult && entryResult.length > 0) {
      const savedEntry = entryResult[0];
      console.log('✅ [API] Entry 저장 성공:', {
        id: savedEntry.id,
        participant_code: savedEntry.participant_code,
        title: savedEntry.title?.substring(0, 30) + '...',
        left_panel_requests: savedEntry.left_panel_requests,
        right_panel_requests: savedEntry.right_panel_requests,
        left_panel_insertions: savedEntry.left_panel_insertions,
        right_panel_insertions: savedEntry.right_panel_insertions,
        syllable_count: savedEntry.syllable_count,
        ai_texts_added_count: (() => {
          try {
            return savedEntry.ai_texts_added ? JSON.parse(savedEntry.ai_texts_added).length : 0;
          } catch (e) {
            return 0;
          }
        })()
      });
    } else {
      console.log('✅ [API] Entry 저장 성공 (결과 없음)');
    }

    // 2. ESM 응답 저장
    const esmFields = ['SL', 'SO', 'REF1', 'REF2', 'RUM1', 'RUM2', 'THK1', 'THK2'] as const
    const hasValidEsmData =
      esmData &&
      esmFields.every(
        (field) =>
          typeof esmData[field] === 'number' &&
          Number.isFinite(esmData[field])
      )

    if (!hasValidEsmData) {
      return res.status(400).json({ error: 'ESM 응답 값이 올바르지 않습니다.' })
    }

    const ownedEsmData = {
      participant_code: participantCode,
      entry_id: entryData.id,
      ...Object.fromEntries(
        esmFields.map((field) => [field, esmData[field]])
      ),
    }
    const { data: esmResult, error: esmError } = await supabase
      .from('esm_responses')
      .insert(ownedEsmData)
      .select()

    if (esmError) {
      console.error('❌ ESM 저장 실패:', esmError)
      return res.status(500).json({ 
        error: 'ESM 저장 실패', 
        details: esmError 
      })
    }

    // 3. 로그 데이터 저장 (있는 경우)
    if (Array.isArray(logsData) && logsData.length > 0) {
      const ownedLogsData = logsData.map((log: any) => ({
        ...log,
        participant_code: participantCode,
        entry_id: entryData.id,
      }))
      const { error: logsError } = await supabase
        .from('interaction_logs')
        .insert(ownedLogsData)
      
      if (logsError) {
        console.error('❌ 로그 저장 실패:', logsError)
        // 로그 저장 실패는 전체 프로세스를 중단하지 않음
      }
    }

    // 4. AI 프롬프트 데이터 저장 (있는 경우)
    if (Array.isArray(aiPromptsData) && aiPromptsData.length > 0) {
      const ownedAIPromptsData = aiPromptsData.map((prompt: any) => ({
        ...prompt,
        participant_code: participantCode,
        entry_id: entryData.id,
      }))
      const { error: aiPromptsError } = await supabase
        .from('ai_prompts')
        .insert(ownedAIPromptsData)
      
      if (aiPromptsError) {
        console.error('❌ AI 프롬프트 저장 실패:', aiPromptsError)
        // AI 프롬프트 저장 실패는 전체 프로세스를 중단하지 않음
      }
    }

    // 5. 서머리 에이전트 호출 및 업데이트 (백그라운드 처리)
    if (entryResult && entryResult.length > 0) {
      const savedEntry = entryResult[0]
      
      // 서머리 에이전트를 백그라운드에서 실행
      const runSummaryAgent = async () => {
        try {
          console.log('✅ 서머리 에이전트 호출 시작:', savedEntry.id)
          
          // 서머리 에이전트 호출
          const summaryResult = await callSummaryAgent(
            savedEntry.content_html,
            savedEntry.id,
            savedEntry.participant_code
          )
          
          console.log('✅ 서머리 에이전트 결과:', summaryResult)
          
          // service_role을 사용하여 업데이트
          await updateEntrySummary(savedEntry.id, summaryResult, supabase)
          
        } catch (error) {
          console.error('❌ 서머리 에이전트 전체 프로세스 실패:', error)
        }
      }
      
      // setTimeout을 사용하여 백그라운드에서 실행
      setTimeout(() => {
        runSummaryAgent()
      }, 0)
    }

    res.status(200).json({ 
      success: true, 
      entry: entryResult,
      esm: esmResult,
      logsCount: logsData?.length || 0,
      aiPromptsCount: aiPromptsData?.length || 0
    })

  } catch (error) {
    console.error('❌ 서버 오류:', error)
    res.status(500).json({ 
      error: '서버 오류', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    })
  }
}
