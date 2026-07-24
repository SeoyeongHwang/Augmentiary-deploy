import { getCurrentKST } from '../lib/time'
import type { AIAgentResult } from '../types/ai'

interface QueuedAIPrompt {
  entry_id: string
  selected_text: string
  ai_suggestion: AIAgentResult
  participant_code: string
  created_at?: string
}

class AIPromptQueue {
  private queue: QueuedAIPrompt[] = []

  add(prompt: Omit<QueuedAIPrompt, 'created_at'>) {
    this.queue.push({
      ...prompt,
      created_at: getCurrentKST(),
    })
  }

  // 큐에 있는 데이터를 반환하고 큐를 비움 (서버 사이드 저장용)
  getQueuedPrompts(): QueuedAIPrompt[] {
    const prompts = [...this.queue]
    this.queue = []
    return prompts
  }

  // 전송 실패 시 프롬프트를 다시 큐 앞쪽에 되돌림
  requeue(prompts: QueuedAIPrompt[]): void {
    this.queue.unshift(...prompts)
  }
}

export const aiPromptQueue = new AIPromptQueue()

export function addAIPromptToQueue(prompt: Omit<QueuedAIPrompt, 'created_at'>) {
  aiPromptQueue.add(prompt)
}

/**
 * 큐에 있는 AI 프롬프트 데이터를 가져와서 반환 (서버 사이드 저장용)
 */
export function getQueuedAIPromptsForServerSide(): QueuedAIPrompt[] {
  return aiPromptQueue.getQueuedPrompts()
}

/**
 * 서버 전송 실패 시 프롬프트를 큐에 되돌림
 */
export function requeueAIPrompts(prompts: QueuedAIPrompt[]): void {
  aiPromptQueue.requeue(prompts)
}
