// lib/augmentAgents.ts

import { supabase } from './supabase'
import { getCurrentKST } from './time'
import { AIAgentResult, AIOption } from '../types/ai'
import { getDirectionAgentApproachesPrompt, getAllApproachNames, getInterpretiveAgentApproachesPrompt, getApproachGuidelines } from './approaches'



// AI 프롬프트를 Supabase에 저장하는 함수
export async function saveAIPrompt(
  entryId: string,
  selectedText: string,
  aiSuggestions: AIAgentResult,
  participantCode: string
): Promise<void> {
  try {
    const createdAt = getCurrentKST();
  
    
    const { error } = await supabase
      .from('ai_prompts')
      .insert({
        entry_id: entryId,
        selected_text: selectedText,
        ai_suggestion: (() => {
          // 이미 문자열인 경우 파싱 후 다시 문자열로 변환 (이중 인코딩 방지)
          if (typeof aiSuggestions === 'string') {
            try {
              const parsed = JSON.parse(aiSuggestions)
              return JSON.stringify(parsed)
            } catch {
              return aiSuggestions
            }
          }
          // 객체인 경우 문자열로 변환
          return JSON.stringify(aiSuggestions)
        })(),
        participant_code: participantCode,
        created_at: createdAt
      })

    if (error) {
      console.error('AI 프롬프트 저장 실패:', error)
    } else {

    }
  } catch (error) {
    console.error('AI 프롬프트 저장 중 오류:', error)
  }
}

export async function callDirectionAgent(diaryEntry: string, selectedEntry: string): Promise<{ reflective_summary: string; significance: string; approaches: string[]; raw?: string }> {
    // OpenAI API 호출 예시
    const systemPrompt = `
    You are a reflective writing assistant trained in narrative psychology.

Your task is to analyze the following diary entry and identify its reflective potential. Based on your analysis, recommend the three most suitable meaning-making strategies that could support deeper reflection.

INPUT:
<Selected Diary Entry>: The specific part that the user wants to interpret.
<Previous Context>: Diary entries up to the selected section

Start by interpreting what the selected entry reveals about the person's emotional state, thoughts, or personal concerns. Then assess how much reflective potential this passage holds—i.e., how likely it is to support meaningful self-exploration if meaning-making approaches are applied.

Select THREE approaches from the following list:
${getDirectionAgentApproachesPrompt()}

## Output Format
Your output must be a JSON object structured as follows:
{
  "reflective_summary": "<Interpretive summary of the selected diary entry; provide a concise and insightful overview of the writer's emotional state, thoughts, or concerns based on the entry and its context>",
  "significance": "<1~5>",  
    - 5 = Strong inner conflict, value dissonance, or identity-level questioning.
    - 4 = Emotional charge or unclear feelings suggesting tension or ambiguity.
    - 3 = Mild tension or uncertainty, but not clearly conflicted.
    - 2 = Mostly observational or resolved emotion.
    - 1 = Neutral, routine, or logistical content.
  "approaches": ["<first approach>", "<second approach>", "<third approach>"] // Select the three most relevant approaches from the provided list. They do not need to be rank-ordered.
}

- The field 'significance' uses a numeric string between 1 (low) and 5 (high); use your judgment based on the depth, complexity, or emotional richness of the diary passage.
- If the selected diary entry is blank or clearly irrelevant, set 'reflective_summary' to "No relevant content provided." and return an empty array for 'approaches' and the lowest significance rating.
- The 'reflective_summary' should be a single well-formed English sentence or a brief paragraph, 1-2 sentences in length.   
  `
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `
          <Selected Diary Entry>: \n${selectedEntry}
          \n\n
          <Previous Context>: \n${diaryEntry}` },
        ],
        temperature: 0.3,
      }),
    });
  
    const data = await response.json();
    const textResult = data.choices?.[0]?.message?.content || '';
    
    console.log('🔍 [DIRECTION AGENT] Raw OpenAI response:', textResult);
    
    try {
        const jsonStart = textResult.indexOf('{');
        const jsonEnd = textResult.lastIndexOf('}');
        const jsonString = textResult.substring(jsonStart, jsonEnd + 1);
        console.log('🔍 [DIRECTION AGENT] Extracted JSON string:', jsonString);
        const parsedResult = JSON.parse(jsonString);
        console.log('🔍 [DIRECTION AGENT] Parsed result:', parsedResult);
        
        // 필수 필드들을 체크하고 기본값 설정
        const safeResult = {
          reflective_summary: parsedResult.reflective_summary || 'Default reflective summary.',
          significance: parsedResult.significance || '3',
          approaches: Array.isArray(parsedResult.approaches) ? parsedResult.approaches : getAllApproachNames().slice(0, 3),
          raw: parsedResult.raw
        };
        
        if (!parsedResult.reflective_summary) {
          console.warn('⚠️ [DIRECTION AGENT] reflective_summary is missing, using default');
        }
        if (!parsedResult.significance) {
          console.warn('⚠️ [DIRECTION AGENT] significance is missing, using default');
        }
        if (!Array.isArray(parsedResult.approaches)) {
          console.warn('⚠️ [DIRECTION AGENT] approaches is missing or not an array, using default');
        }
        
        return safeResult;
      } catch (err) {
        console.error('❌ [DIRECTION AGENT] Error parsing JSON:', err);
        console.error('❌ [DIRECTION AGENT] Raw response was:', textResult);
        return { 
          reflective_summary: 'Error processing response', 
          significance: '3', 
          approaches: getAllApproachNames().slice(0, 3), 
          raw: textResult
        };
      }
  }
  
export async function callInterpretiveAgent(
    diaryEntry: string,
    selectedEntry: string,
    significance: string,
    userProfile: string,
    approaches: string[]
  ): Promise<AIAgentResult> {

    
    const systemPrompt = `
    You are a narrative meaning-making assistant and personal writing assistant.

Your task is to generate three different short reflective paragraph scaffolds to be inserted at the end of a selected diary entry. The selected diary entry will end with the "<<INSERT HERE>>" marker, indicating exactly where your generated text should be placed.

INPUT:
<Selected Diary Entry>: The specific part the user wants to interpret.
<Previous Context>: Diary entries up to the selected section.
<Significance>: The significance level of the selected entry. Higher values mean greater reflective potential.
<Approaches>: Three different meaning-making approaches to be applied, each for a different option.
<Resource>: User's profile information in JSON format (demographics, personality, values, current_context, future_ideal) to use for meaning-making.

**Resource Selection Guidelines:**
- Select only relevant resources (strings from: demographics, personality, values, current_context, future_ideal) that meaningfully support each specific approach.
- If there is no reason to use a resource, use an empty array.

**Text Generation Guidelines:**
- The text for each option must differ from the others and follow the guidelines for the specified approach.
- Limit each text to 1~2 sentences. 
- Text should be thought-provoking and open-ended grounded in the entry's significance.
- Use an open-ended question or self-suggesting tone with possibility phrases (could, might, perhaps, etc.).
- Write in a consistent informal, self-talking tone without honorifics.
- Avoid explicitly mentioning the approach name or user profile information.
- Avoid generic sentences, clichés, and excessive commas.
- Ensure each text connects smoothly from where the <<INSERT HERE>> marker appears.

**Tone and Depth by Significance:**
- Low significance (1-2): Use a light tone, everyday observations, avoid heavy emotion.
- Moderate significance (3): Use a balanced, thoughtful, but not heavy tone.
- High significance (4-5): Allow for introspective or emotionally resonant insights.

**Title Requirements:**
- Each option should have a short, unique title reflecting a specific aspect of the text.
- Precede each title with a matching thematic emoji (e.g., 🌱💭🔄💫🏆🪞✨🌅📝💪🤝😌🔍).

## Output Format
You must provide your response as valid, strictly structured JSON. The output must contain three options with the following schema (use only double quotes, ensure all strings are properly escaped):

{
  "option1": {
    "approach": "<First approach as provided from the Approaches input (string)>",
    "resource": ["<String resource category>", ...],
    "resource_usage": "<Brief explanation (string)>",
    "title": "<Emoji + short title (string)>",
    "text": "<Generated first person interpretive text (string)>"
  },
  "option2": {
    "approach": "<Second approach as provided from the Approaches input (string)>",
    "resource": ["<String resource category>", ...],
    "resource_usage": "<Brief explanation (string)>",
    "title": "<Emoji + short title (string)>",
    "text": "<Generated first person interpretive text (string)>"
  },
  "option3": {
    "approach": "<Third approach as provided from the Approaches input (string)>",
    "resource": ["<String resource category>", ...],
    "resource_usage": "<Brief explanation (string)>",
    "title": "<Emoji + short title (string)>",
    "text": "<Generated first person interpretive text (string)>"  
  }
}

- The list assigned to each 'resource' field must contain only string values naming the referenced resource categories or be an empty array if no resource is used.
- The 'approach' field must exactly match the corresponding string from the Approaches input.    
  `
    
    const userMessage = `Selected Diary Entry: \n${selectedEntry}<<INSERT HERE>>
          \n\n
          Previous Context: \n${diaryEntry}
          \n\n
          Significance: \n${significance}
          \n\n
          Approaches: 
          1. ${approaches[0]} - ${getApproachGuidelines(approaches[0]).map(guideline => `${guideline}`).join(', ')}
          2. ${approaches[1]} - ${getApproachGuidelines(approaches[1]).map(guideline => `${guideline}`).join(', ')}
          3. ${approaches[2]} - ${getApproachGuidelines(approaches[2]).map(guideline => `${guideline}`).join(', ')}
          \n\n
          Resource: \n${userProfile}
          `;
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        temperature: 0.7,
        top_p: 1.0,
      }),
    })

    const data = await response.json();
    const textResult = data.choices?.[0]?.message?.content || '';
    
    try {
        const jsonStart = textResult.indexOf('{');
        const jsonEnd = textResult.lastIndexOf('}');
        
        if (jsonStart === -1 || jsonEnd === -1) {
          console.error('❌ [INTERPRETIVE AGENT] JSON brackets not found in response');
          return createDefaultAIAgentResult();
        }
        
        let jsonString = textResult.substring(jsonStart, jsonEnd + 1);
        
        // JSON 문자열 정리 및 수정 - 더 강력한 정리 로직
        let cleanedJson = jsonString
          // 개행 문자와 과도한 공백 정리
          .replace(/\r?\n/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          // 잘못된 유니코드 따옴표를 표준 따옴표로 변경
          .replace(/[""]/g, '"')
          .replace(/['']/g, "'")
          // 제어 문자 제거
          .replace(/[\x00-\x1F\x7F]/g, ' ')
          // 마지막 쉼표 제거
          .replace(/,(\s*[}\]])/g, '$1')
          // 누락된 쌍따옴표 추가 (속성명에만)
          .replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":');
        
        // JSON 완성도 확인 및 수정
        let finalJson = cleanedJson;
        
        // 중괄호 짝 맞추기
        const openBraces = (finalJson.match(/{/g) || []).length;
        const closeBraces = (finalJson.match(/}/g) || []).length;
        if (openBraces > closeBraces) {
          finalJson += '}';
        }
        
        // 따옴표 짝 맞추기 (간단한 방법)
        const quotes = (finalJson.match(/"/g) || []).length;
        if (quotes % 2 !== 0) {
          finalJson = finalJson.replace(/,$/, '"');
        }
        
        console.log('🔍 [INTERPRETIVE AGENT] Cleaned JSON:', finalJson.substring(0, 200) + '...');
        
        // JSON 파싱 시도
        const parsedResult = JSON.parse(finalJson);
        
        // 결과 검증
        if (!parsedResult.option1 || !parsedResult.option2 || !parsedResult.option3) {
          console.error('❌ [INTERPRETIVE AGENT] Missing required options in parsed result');
          throw new Error('Missing required options');
        }
        
        // AIAgentResult 형식으로 변환
        const result: AIAgentResult = {
          option1: createAIOption(parsedResult.option1),
          option2: createAIOption(parsedResult.option2),
          option3: createAIOption(parsedResult.option3)
        };
        
        console.log('✅ [INTERPRETIVE AGENT] Final result with resources:');
        console.log('  Option 1 resources:', result.option1.resource);
        console.log('  Option 2 resources:', result.option2.resource);
        console.log('  Option 3 resources:', result.option3.resource);
        
        return result;
        
      } catch (err) {
        console.error('❌ [INTERPRETIVE AGENT] Error parsing JSON:', err);
        console.error('❌ [INTERPRETIVE AGENT] Attempting fallback parsing...');
        
        // Fallback: 정규표현식으로 개별 필드 추출
        try {
          const fallbackResult = extractFieldsWithRegex(textResult);
          if (fallbackResult) {
            console.log('✅ [INTERPRETIVE AGENT] Fallback parsing successful');
            return fallbackResult;
          }
        } catch (fallbackErr) {
          console.error('❌ [INTERPRETIVE AGENT] Fallback parsing also failed:', fallbackErr);
        }
        
        console.error('❌ [INTERPRETIVE AGENT] Raw response was:', textResult);
        return createDefaultAIAgentResult();
      }
  }

export async function callScaffoldingAgent(
  aiAgentResult: AIAgentResult
): Promise<AIAgentResult> {
  
    const systemPrompt = `
  You are a writing assistant who helps extend fully written paragraphs by adding a natural, open-ended continuation at the end.

INPUT: You will receive a JSON object containing three options, each with a "text" field containing a complete paragraph.

TASK: For each option's text, append exactly ONE unfinished phrase that ends with "..."

REQUIREMENTS for the added phrase:
- Must be clearly **unfinished** and end with "..."
- Must feel like a natural continuation of the original paragraph
- Must be *first person* and reflect the same tone, topic, and writing style
- Must encourage reflection, curiosity, or expansion
- Each of the three phrases must follow different unfinished patterns

EXAMPLE:
Input text: "I feel it's important to explore what my choices in design and technology might mean for my future."
Output text: "I feel it's important to explore what my choices in design and technology might mean for my future. Maybe..."

## Output Format
Return the exact same JSON structure as input, but with each "text" field containing the original paragraph plus your added unfinished sentence:

{
  "option1": {
    "approach": "<keep original approach>",
    "resource": [keep original resource array],
    "resource_usage": "<keep original resource_usage>", 
    "title": "<keep original title>",
    "text": "<Original paragraph + incomplete first person phrase ending with '...'>"
  },
  "option2": {
    "approach": "<keep original approach>",
    "resource": [keep original resource array],
    "resource_usage": "<keep original resource_usage>",
    "title": "<keep original title>", 
    "text": "<Original paragraph + incomplete first person phrase ending with '...'>"
  },
  "option3": {
    "approach": "<keep original approach>",
    "resource": [keep original resource array],
    "resource_usage": "<keep original resource_usage>",
    "title": "<keep original title>",
    "text": "<Original paragraph + incomplete first person phrase ending with '...'>"
  }
}
  `;
  
  const userMessage = `
  ${JSON.stringify(aiAgentResult, null, 2)}
  `;
  
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.5,
      top_p: 1.0,
    }),
  });

  const data = await response.json();
  const textResult = data.choices?.[0]?.message?.content || '';
  
  try {
    const jsonStart = textResult.indexOf('{');
    const jsonEnd = textResult.lastIndexOf('}');
    
    if (jsonStart === -1 || jsonEnd === -1) {
      console.error('❌ [SCAFFOLDING AGENT] JSON brackets not found in response');
      return createDefaultAIAgentResult();
    }
    
    let jsonString = textResult.substring(jsonStart, jsonEnd + 1);
    
    // JSON 문자열 정리 및 수정 - callInterpretiveAgent와 동일한 정리 로직
    let cleanedJson = jsonString
      .replace(/\r?\n/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/[""]/g, '"')
      .replace(/['']/g, "'")
      .replace(/[\x00-\x1F\x7F]/g, ' ')
      .replace(/,(\s*[}\]])/g, '$1')
      .replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":');
    
    let finalJson = cleanedJson;
    
    // 중괄호 짝 맞추기
    const openBraces = (finalJson.match(/{/g) || []).length;
    const closeBraces = (finalJson.match(/}/g) || []).length;
    if (openBraces > closeBraces) {
      finalJson += '}';
    }
    
    // 따옴표 짝 맞추기
    const quotes = (finalJson.match(/"/g) || []).length;
    if (quotes % 2 !== 0) {
      finalJson = finalJson.replace(/,$/, '"');
    }
    
    console.log('🔍 [SCAFFOLDING AGENT] Cleaned JSON:', finalJson.substring(0, 200) + '...');
    
    // JSON 파싱 시도
    const parsedResult = JSON.parse(finalJson);
    
    // 결과 검증
    if (!parsedResult.option1 || !parsedResult.option2 || !parsedResult.option3) {
      console.error('❌ [SCAFFOLDING AGENT] Missing required options in parsed result');
      throw new Error('Missing required options');
    }
    
    // AIAgentResult 형식으로 변환
    const result: AIAgentResult = {
      option1: createAIOption(parsedResult.option1),
      option2: createAIOption(parsedResult.option2),
      option3: createAIOption(parsedResult.option3)
    };
    
    console.log('✅ [SCAFFOLDING AGENT] Final result with resources:');
    console.log('  Option 1 text:', result.option1.text);
    console.log('  Option 2 text:', result.option2.text);
    console.log('  Option 3 text:', result.option3.text);
    
    return result;
    
  } catch (err) {
    console.error('❌ [SCAFFOLDING AGENT] Error parsing JSON:', err);
    console.error('❌ [SCAFFOLDING AGENT] Attempting fallback parsing...');
    
    // Fallback: 정규표현식으로 개별 필드 추출
    try {
      const fallbackResult = extractFieldsWithRegex(textResult);
      if (fallbackResult) {
        console.log('✅ [SCAFFOLDING AGENT] Fallback parsing successful');
        return fallbackResult;
      }
    } catch (fallbackErr) {
      console.error('❌ [SCAFFOLDING AGENT] Fallback parsing also failed:', fallbackErr);
    }
    
    console.error('❌ [SCAFFOLDING AGENT] Raw response was:', textResult);
    return createDefaultAIAgentResult();
  }
}


// 헬퍼 함수들
function createAIOption(option: any): AIOption {
  return {
    approach: option?.approach || '',
    title: option?.title || '',
    text: option?.text || '',
    resource: Array.isArray(option?.resource) ? option.resource : [],
    resource_usage: option?.resource_usage || ''
  };
}

function extractFieldsWithRegex(textResult: string): AIAgentResult | null {
  try {
    console.log('🔍 [REGEX FALLBACK] Attempting regex extraction...');
    
    // 전체 텍스트에서 JSON 부분 찾기
    const jsonMatch = textResult.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.log('❌ [REGEX FALLBACK] No JSON structure found');
      return null;
    }
    
    const jsonText = jsonMatch[0];
    
    // 각 옵션을 더 유연하게 추출
    const extractOption = (optionNum: string): AIOption => {
      // option 블록 찾기 - 더 유연한 패턴
      const optionPattern = new RegExp(`"option${optionNum}"\\s*:\\s*\\{([\\s\\S]*?)\\}(?=\\s*[,}]|\\s*"option|\\s*$)`, 'i');
      const optionMatch = jsonText.match(optionPattern);
      
             if (!optionMatch) {
         console.log(`❌ [REGEX FALLBACK] Could not find option${optionNum}`);
         return createAIOption({});
       }
      
      const optionContent = optionMatch[1];
      
      // 각 필드 추출 - 더 유연한 패턴
      const extractField = (fieldName: string): string => {
        const patterns = [
          new RegExp(`"${fieldName}"\\s*:\\s*"([^"]*)"`, 'i'),
          new RegExp(`"${fieldName}"\\s*:\\s*'([^']*)'`, 'i'),
          new RegExp(`${fieldName}\\s*:\\s*"([^"]*)"`, 'i'),
        ];
        
        for (const pattern of patterns) {
          const match = optionContent.match(pattern);
          if (match) return match[1];
        }
        return '';
      };
      
      // resource 배열 추출
      const extractResource = (): string[] => {
        const resourcePatterns = [
          /"resource"\s*:\s*\[([^\]]*)\]/i,
          /resource\s*:\s*\[([^\]]*)\]/i,
        ];
        
        for (const pattern of resourcePatterns) {
          const match = optionContent.match(pattern);
          if (match && match[1].trim()) {
            try {
              // 배열 내용 파싱
              const resourceContent = match[1];
              const items = resourceContent.split(',').map(item => 
                item.trim().replace(/['"]/g, '')
              ).filter(item => item.length > 0);
              return items;
            } catch {
              return [];
            }
          }
        }
        return [];
      };
      
      return {
        approach: extractField('approach'),
        title: extractField('title'),
        text: extractField('text'),
        resource: extractResource(),
        resource_usage: extractField('resource_usage')
      };
    };
    
    const result = {
      option1: extractOption('1'),
      option2: extractOption('2'),
      option3: extractOption('3')
    };
    
    // 결과 검증
    const isValidOption = (option: AIOption) => 
      option.approach && option.title && option.text;
    
    if (!isValidOption(result.option1) || !isValidOption(result.option2) || !isValidOption(result.option3)) {
      console.log('❌ [REGEX FALLBACK] Extracted options are incomplete');
      return null;
    }
    
    console.log('✅ [REGEX FALLBACK] Successfully extracted all options');
    return result;
    
  } catch (err) {
    console.error('❌ [REGEX FALLBACK] Extraction failed:', err);
    return null;
  }
}

function parseAIOptionFromMatch(match: RegExpMatchArray | null): AIOption {
  if (!match) return createAIOption({});
  
  const optionText = match[1];
  const approachMatch = optionText.match(/"approach":\s*"([^"]*)"/);
  const titleMatch = optionText.match(/"title":\s*"([^"]*)"/);
  const textMatch = optionText.match(/"text":\s*"([^"]*)"/);
  
  const approachValue = approachMatch ? approachMatch[1] : '';
  
  return {
    approach: approachValue,
    title: titleMatch ? titleMatch[1] : '',
    text: textMatch ? textMatch[1] : '',
    resource: []
  };
}

function createDefaultAIAgentResult(): AIAgentResult {
  const defaultOption: AIOption = {
    approach: '',
    title: '',
    text: '',
    resource: []
  };
  
  return {
    option1: defaultOption,
    option2: defaultOption,
    option3: defaultOption
  };
}



