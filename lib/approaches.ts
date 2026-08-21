// lib/approaches.ts

export interface ApproachDefinition {
  name: string;
  fullDescription: string; // Direction Agent용 상세 설명
  shortDescription: string; // Interpretive Agent용 간단 설명
  interpretiveIntent: string; // Interpretive Agent용 근거 중심 렌즈
  guidelines?: string[]; // 각 approach별 특별 가이드라인
  keywords?: string[]; // 관련 키워드들
}

export const MEANING_MAKING_APPROACHES: Record<string, ApproachDefinition> = {
  'Positive Reappraisal': {
    name: 'Positive Reappraisal',
    fullDescription: 'Reinterpreting a negative or stressful experience in a positive light—"finding the silver lining". Involves actively finding positive meaning or personal growth in the face of hardship',
    shortDescription: 'Re-framing a situation in a more positive or hopeful light, based on one\'s beliefs and values',
    interpretiveIntent: 'Explore a better-supported appraisal of the same facts. Depending on the passage, this may narrow the problem\'s scope, notice remaining choice or capacity, reveal a value protected by the response, or challenge an overly harsh reading. Change the appraisal, not the event, and do not invent a benefit or growth.',
    guidelines: [
      'Focus on finding positive aspects or growth opportunities',
      'Emphasize resilience and strength',
      'Avoid minimizing the difficulty of the experience'
    ],
    keywords: ['긍정적', '성장', '의미', '희망', '강점']
  },
  'Benefit Finding': {
    name: 'Benefit Finding',
    fullDescription: 'Identifying beneficial outcomes or personal growth that result from a negative event. Essentially, discovering positive consequences or values stemming from adversity (e.g. "I became stronger or closer to loved ones")',
    shortDescription: 'Discovering positive consequences or personal growth that resulted from a challenging experience',
    interpretiveIntent: 'Examine a concrete consequence that has already emerged from the difficulty, such as useful knowledge, a clarified priority, a changed relationship, or a newly available resource. Focus on what actually resulted; unlike Positive Reappraisal, do not merely redescribe the original event more positively.',
    guidelines: [
      'Identify concrete benefits or gains',
      'Focus on personal development and relationships',
      'Connect adversity to positive outcomes'
    ],
    keywords: ['얻은 것', '성장', '관계', '강해짐', '배움']
  },
  'Sense-Making': {
    name: 'Sense-Making',
    fullDescription: 'Attempting to understand or make an event comprehensible in one\'s belief system. Involves asking "Why did this happen?" and fitting the experience into a framework of meaning (or one\'s worldview)',
    shortDescription: 'Understanding why something happened and fitting the experience into a meaningful framework',
    interpretiveIntent: 'Make the experience more understandable by exploring the most relevant source of incoherence: a mismatch between expectation and reality, a sequence of events, a contextual constraint, competing needs, or an unanswered question. Aim for comprehension rather than a positive evaluation, lesson, or identity claim.',
    guidelines: [
      'Explore the "why" behind experiences',
      'Connect to broader life patterns or beliefs',
      'Seek coherence and understanding'
    ],
    keywords: ['왜', '이해', '의미', '패턴', '맥락']
  },
  'Lesson Learning': {
    name: 'Lesson Learning',
    fullDescription: 'Deriving a specific lesson or moral from the experience that guides future behavior. The person can say they "learned not to do X" or how to handle Y as a result of the event. This is a concrete takeaway applicable to similar situations',
    shortDescription: 'Practical reasoning derived from experience, guiding future actions in similar situations',
    interpretiveIntent: 'Derive a situated, usable takeaway from an action, choice, or consequence already present. It may concern what to repeat, stop, check, prepare, or handle differently next time. Keep it local to this kind of situation; unlike Insight Gaining, the result should guide practice rather than define the self.',
    guidelines: [
      'Focus on actionable insights',
      'Provide concrete guidance for future situations',
      'Emphasize practical wisdom gained'
    ],
    keywords: ['배운 점', '교훈', '다음번', '방법', '지혜']
  },
  'Insight Gaining': {
    name: 'Insight Gaining',
    fullDescription: 'Extracting a broader insight or new understanding about oneself or life from the event. The meaning goes beyond a specific lesson, often involving transformation in self-perception or life philosophy. Insight is considered a higher-order, more profound form of meaning-making (encompassing any specific lessons)',
    shortDescription: 'Taking a step back from experience and connecting the message gained from that experience with a deeper understanding of oneself or knowledge of the world and relationships',
    interpretiveIntent: 'Develop a broader but supported understanding of the writer or their world from the experience. It may clarify a value, recurring condition, exception, sensitivity, relational expectation, or change in perspective. Unlike Lesson Learning, deepen understanding rather than prescribe a next action; avoid fixed identity claims.',
    guidelines: [
      'Focus on deeper self-understanding',
      'Connect to broader life philosophy',
      'Emphasize transformation in perspective'
    ],
    keywords: ['깨달음', '통찰', '자아', '철학', '변화']
  },
  'Self-Distancing': {
    name: 'Self-Distancing',
    fullDescription: 'Reflecting on the experience from a distanced, third-person perspective in order to gain perspective and reduce emotional reactivity. By "stepping back" mentally from the event, individuals can analyze it more objectively and extract meaning or lessons without being overwhelmed',
    shortDescription: 'Stepping back mentally to view the experience with less emotional immediacy while preserving the writer\'s first-person voice',
    interpretiveIntent: 'Create useful psychological distance while preserving first-person voice. Depending on the passage, distinguish observation from interpretation, compare the immediate view with a later view, resize the event within a wider context, or separate what was controllable from what was not. Do not turn the writer into a third-person subject or default to a facts-versus-evaluation formula.',
    guidelines: [
      'Encourage objective analysis',
      'Preserve first-person grammatical voice',
      'Reduce emotional overwhelm'
    ],
    keywords: ['객관적', '한 발 뒤로', '관찰', '거리두기', '분석']
  },
  'Downward Comparison': {
    name: 'Downward Comparison',
    fullDescription: 'Finding meaning through comparison to others who are worse off, or imagining a hypothetically worse scenario. This strategy ("it could have been worse") helps one feel relatively fortunate and thus derive perspective or gratitude from the situation',
    shortDescription: 'Finding perspective by comparing to worse situations or recognizing relative fortune',
    interpretiveIntent: 'Use only a comparison or worse-case frame already present in the diary. Examine a concrete difference in outcome, available support, degree of harm, or what remained intact. The point is calibrated perspective, not gratitude, reassurance, or a generally positive reinterpretation.',
    guidelines: [
      'Compare to worse scenarios sensitively',
      'Focus on gratitude and perspective',
      'Avoid dismissing current difficulties'
    ],
    keywords: ['감사', '다행', '더 나쁠 수', '비교', '관점']
  },
  'Goal Revision': {
    name: 'Goal Revision',
    fullDescription: 'Revising one\'s goals or priorities in light of the life event and formulating new plans that align with changed circumstances. By adjusting aspirations and focusing on attainable goals, individuals restore a sense of purpose and control despite the disruption',
    shortDescription: 'Adjusting goals and priorities to align with changed circumstances and restore purpose',
    interpretiveIntent: 'Reconsider an explicit goal, priority, standard, pace, or measure of success in light of changed circumstances. Explore the relevant tradeoff and what an adjustment would protect or give up. Unlike Lesson Learning, revise the direction or criterion rather than offer a situational tip.',
    guidelines: [
      'Focus on adapting to new circumstances',
      'Emphasize renewed purpose and control',
      'Encourage realistic goal-setting'
    ],
    keywords: ['목표', '계획', '조정', '우선순위', '방향']
  },
  'Redemption Narrative': {
    name: 'Redemption Narrative',
    fullDescription: 'Constructing a redemptive story in which a negative experience leads to positive outcomes (personal growth, moral insight, improved life). In a redemption sequence, the story moves "from adversity to goodness or growth," explicitly acknowledging how suffering was redeemed or made meaningful over time',
    shortDescription: 'Creating a story where adversity leads to positive transformation and meaningful growth',
    interpretiveIntent: 'Trace how an adverse experience became part of a later constructive change only when the difficulty, the later change, and their sequence are already evidenced. Explain the temporal arc or contribution without claiming that suffering was necessary. Unlike Benefit Finding, integrate change across time rather than name an isolated gain.',
    guidelines: [
      'Construct a transformative narrative',
      'Show progression from adversity to growth',
      'Emphasize redemptive meaning'
    ],
    keywords: ['변화', '극복', '성장', '구원', '의미']
  }
};

// Direction Agent용 - 모든 접근법의 상세 설명
export function getDirectionAgentApproachesPrompt(): string {
  return Object.values(MEANING_MAKING_APPROACHES)
    .map(approach => `- *${approach.name}*: ${approach.fullDescription}`)
    .join('\n');
}

// Interpretive Agent용 - 특정 접근법들의 간단 설명
export function getInterpretiveAgentApproachesPrompt(approachNames: string[]): string {
  return approachNames
    .filter(name => MEANING_MAKING_APPROACHES[name])
    .map(name => {
      const approach = MEANING_MAKING_APPROACHES[name];
      return `- ${name}: ${approach.interpretiveIntent}`;
    })
    .join('\n');
}

// 특정 접근법의 가이드라인 가져오기
export function getApproachGuidelines(approachName: string): string[] {
  return MEANING_MAKING_APPROACHES[approachName]?.guidelines || [];
}

// 특정 접근법의 키워드 가져오기
export function getApproachKeywords(approachName: string): string[] {
  return MEANING_MAKING_APPROACHES[approachName]?.keywords || [];
}

// 유효한 접근법 이름인지 확인
export function isValidApproach(approachName: string): boolean {
  return approachName in MEANING_MAKING_APPROACHES;
}

// 모든 접근법 이름 가져오기
export function getAllApproachNames(): string[] {
  return Object.keys(MEANING_MAKING_APPROACHES);
}
