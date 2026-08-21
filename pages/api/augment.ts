// pages/api/augment.ts

import type { NextApiRequest, NextApiResponse } from 'next';

import { callDirectionAgent, callInterpretiveAgent, callScaffoldingAgent } from '../../lib/augmentAgents';
import type {
  AugmentRegenerationContext,
  DirectionAgentResult,
  RejectedInterpretiveOption,
} from '../../lib/augmentAgents';
import { getAllApproachNames } from '../../lib/approaches';
import { isOpenAIAPIError } from '../../lib/openai';
import {
  createAdminSupabaseClient,
  getAuthenticatedUser,
} from '../../utils/supabase/server';

const VALID_APPROACHES = new Set(getAllApproachNames());
const VALID_SIGNIFICANCE = new Set(['1', '2', '3', '4', '5']);
const VALID_GROUNDING_MODES = new Set(['close', 'tentative', 'exploratory']);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const normalizeInputString = (value: unknown, maxLength: number): string =>
  typeof value === 'string' ? value.trim().slice(0, maxLength) : '';

const removeScaffoldingStem = (text: string): string =>
  text.replace(/\s+[^.!?…]{1,80}\.\.\.$/u, '').trim();

const normalizeRejectedOptions = (value: unknown): RejectedInterpretiveOption[] => {
  if (!Array.isArray(value)) return [];

  return value
    .slice(0, 3)
    .flatMap((option): RejectedInterpretiveOption[] => {
      if (!isRecord(option)) return [];

      const approach = normalizeInputString(option.approach, 80);
      const title = normalizeInputString(option.title, 100);
      const text = removeScaffoldingStem(normalizeInputString(option.text, 320));

      if (!VALID_APPROACHES.has(approach) || !text) return [];

      return [{ approach, title, text }];
    });
};

const normalizePreviousDirection = (value: unknown): DirectionAgentResult | null => {
  if (!isRecord(value)) return null;

  const reflectiveSummary = normalizeInputString(value.reflective_summary, 1000);
  const significance = normalizeInputString(value.significance, 1);
  const groundingMode = normalizeInputString(value.grounding_mode, 20);
  const approaches = Array.isArray(value.approaches)
    ? value.approaches
      .map(approach => normalizeInputString(approach, 80))
      .filter(approach => VALID_APPROACHES.has(approach))
    : [];

  if (
    !reflectiveSummary ||
    !VALID_SIGNIFICANCE.has(significance) ||
    !VALID_GROUNDING_MODES.has(groundingMode) ||
    approaches.length !== 3 ||
    new Set(approaches).size !== 3
  ) {
    return null;
  }

  return {
    reflective_summary: reflectiveSummary,
    significance,
    grounding_mode: groundingMode as DirectionAgentResult['grounding_mode'],
    approaches,
  };
};

const createRegenerationContext = (
  previousDirectionValue: unknown,
  previousOptionsValue: unknown
): AugmentRegenerationContext | undefined => {
  const previousDirection = normalizePreviousDirection(previousDirectionValue);
  const rejectedOptions = normalizeRejectedOptions(previousOptionsValue);

  if (!previousDirection || rejectedOptions.length !== 3) return undefined;

  return { previousDirection, rejectedOptions };
};

// userProfile JSON을 필요한 필드들만 추출하여 변환하는 함수
const extractUserProfileForResource = (userProfileInput: any) => {
  try {    
    // null/undefined 처리
    if (!userProfileInput) {
      return JSON.stringify({
        demographics: {},
        personality: {},
        values: {},
        current_context: {},
        future_ideal: {}
      }, null, 2);
    }

    // 이미 객체인 경우
    let fullProfile;
    if (typeof userProfileInput === 'object') {
      fullProfile = userProfileInput;
    } else if (typeof userProfileInput === 'string') {
      // 문자열인 경우 trim 체크
      if (userProfileInput.trim() === '') {
        return JSON.stringify({
          demographics: {},
          personality: {},
          values: {},
          current_context: {},
          future_ideal: {}
        }, null, 2);
      }
      
      // JSON 파싱 시도
      try {
        fullProfile = JSON.parse(userProfileInput);
      } catch (parseError) {
        // JSON 파싱 실패 시 문자열을 current_context로 사용
        console.log('User profile is not JSON, treating as plain text');
        fullProfile = {
          current_context: { description: userProfileInput }
        };
      }
    } else {
      console.log('Unexpected user profile type:', typeof userProfileInput);
      return JSON.stringify({
        demographics: {},
        personality: {},
        values: {},
        current_context: {},
        future_ideal: {}
      }, null, 2);
    }
    
    // 실제 프로필 구조에 맞춰 InterpretiveAgent에서 사용할 필드들 추출
    const resourceProfile = {
      demographics: fullProfile.social_identity || fullProfile.demographics || {},
      personality: fullProfile.personal_identity?.personality 
        ? { description: fullProfile.personal_identity.personality }
        : fullProfile.personality || {},
      values: fullProfile.personal_identity?.value 
        ? { description: fullProfile.personal_identity.value }
        : fullProfile.values || {},
      current_context: fullProfile.personal_life_context?.present 
        ? { description: fullProfile.personal_life_context.present }
        : fullProfile.current_context || {},
      future_ideal: fullProfile.personal_life_context?.future 
        ? { description: fullProfile.personal_life_context.future }
        : fullProfile.future_ideal || {}
    };
    
    return JSON.stringify(resourceProfile, null, 2);
  } catch (error) {
    console.error('Error processing user profile:', error);
    // 모든 처리 실패 시 기본 구조 반환
    return JSON.stringify({
      demographics: {},
      personality: {},
      values: {},
      current_context: {},
      future_ideal: {}
    }, null, 2);
  }
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { user: authUser, error: authError } = await getAuthenticatedUser(req, res);
    if (authError || !authUser) {
      return res.status(401).json({ error: '인증이 필요합니다.' });
    }

    const {
      diaryEntry,
      selectedText,
      previousDirection,
      previousOptions,
    } = req.body;
    if (
      typeof diaryEntry !== 'string' ||
      typeof selectedText !== 'string' ||
      !selectedText.trim()
    ) {
      return res.status(400).json({ error: '선택된 텍스트가 필요합니다.' });
    }

    const regenerationContext = createRegenerationContext(
      previousDirection,
      previousOptions
    );

    const supabase = createAdminSupabaseClient();
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('profile')
      .eq('id', authUser.id)
      .single();

    if (userError) {
      console.error('❌ [AUGMENT] User profile query failed:', userError);
      return res.status(500).json({ error: '사용자 프로필을 가져오지 못했습니다.' });
    }

    console.log('🚀 [AUGMENT] Starting augmentation pipeline...', {
      isRegeneration: !!regenerationContext,
    });

    // Step 1: Direction Agent
    console.log('📖 [STEP 1] Starting Direction Agent...');
    const directionAgentResult = await callDirectionAgent(
      diaryEntry,
      selectedText,
      regenerationContext
    );
    console.log('✅ [STEP 1] Direction Agent completed:', {
      significance: directionAgentResult.significance,
      groundingMode: directionAgentResult.grounding_mode,
      approaches: directionAgentResult.approaches
    });

    // userProfile을 resource 형태로 변환    
    const resourceProfile = extractUserProfileForResource(userData?.profile);

    // Step 2: Interpretive Agent (모든 approach를 한번에 처리)
    console.log('💭 [STEP 2] Starting Interpretive Agent with all approaches...');
    console.log(`💭 [STEP 2] Processing ${directionAgentResult.approaches.length} approaches:`, directionAgentResult.approaches);
    
    const interpretiveAgentResult = await callInterpretiveAgent(
      diaryEntry,
      selectedText,
      directionAgentResult.reflective_summary,
      directionAgentResult.significance,
      directionAgentResult.grounding_mode,
      resourceProfile,
      directionAgentResult.approaches,
      regenerationContext?.rejectedOptions
    );

    console.log('✅ [STEP 2] Interpretive Agent completed:', {
      approaches: [
        interpretiveAgentResult.option1.approach,
        interpretiveAgentResult.option2.approach,
        interpretiveAgentResult.option3.approach,
      ],
      hasText: [
        !!interpretiveAgentResult.option1.text,
        !!interpretiveAgentResult.option2.text,
        !!interpretiveAgentResult.option3.text,
      ],
    });

    // Step 3: Scaffolding Agent
    console.log('🔧 [STEP 3] Starting Scaffolding Agent...');
    
    const scaffoldingAgentResult = await callScaffoldingAgent(
      interpretiveAgentResult
    );

    console.log('✅ [STEP 3] Scaffolding Agent completed:', {
      hasText: [
        !!scaffoldingAgentResult.option1.text,
        !!scaffoldingAgentResult.option2.text,
        !!scaffoldingAgentResult.option3.text,
      ],
    });

    console.log('🎉 [AUGMENT] Complete augmentation pipeline finished successfully!');

    // 최종 결과 반환 (클라이언트 호환성을 위해 interpretiveAgentResult라는 이름으로 scaffolding 결과 반환)
    res.status(200).json({
      directionAgentResult,
      interpretiveAgentResult: scaffoldingAgentResult,
    });

  } catch (error) {
    console.error('❌ [AUGMENT] Error in augmentation pipeline:', error);
    if (isOpenAIAPIError(error)) {
      return res.status(error.statusCode).json({
        error: error.message,
        code: error.code,
      });
    }

    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb', 
    },
  },
};
