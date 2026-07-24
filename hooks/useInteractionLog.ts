import { useCallback } from 'react'
import { ActionType, CreateInteractionLogData } from '../types/log'
import { logInteractionAsync } from '../lib/logger'
import { useSession } from './useSession'

/**
 * 인터랙션 로그를 기록하는 커스텀 훅
 */
export function useInteractionLog(participantCode?: string) {
  const { user } = useSession()

  // participantCode가 전달되면 우선 사용, 없으면 user.participant_code 사용
  const effectiveParticipantCode = participantCode || user?.participant_code
  const canLog = !!effectiveParticipantCode

  /**
   * 비동기 로그 기록 (큐 사용, UX에 영향 없음)
   */
  const logAsync = useCallback((
    actionType: ActionType,
    meta?: Record<string, any>,
    entryId?: string
  ) => {
    if (!effectiveParticipantCode || !entryId) {
      // entryId가 없으면 기록하지 않음
      return
    }

    const logData: CreateInteractionLogData = {
      participant_code: effectiveParticipantCode,
      action_type: actionType,
      meta,
      entry_id: entryId
    }

    logInteractionAsync(logData)
  }, [effectiveParticipantCode])

  /**
   * AI 호출 로그
   */
  const logAITrigger = useCallback((entryId: string, selectedText: string) => {
    logAsync(ActionType.TRIGGER_AI, { selectedText }, entryId)
  }, [logAsync])

  /**
   * AI 응답 수신 로그
   */
  const logAIReceive = useCallback((entryId: string, aiSuggestions: any) => {
    logAsync(ActionType.RECEIVE_AI, { 
      aiSuggestions,
      // optionCount: aiSuggestions.length 
    }, entryId)
  }, [logAsync])

  /**
   * AI 텍스트 삽입 로그 (우선순위 처리로 순서 보장)
   */
  const logAITextInsert = useCallback((entryId: string, selectedOption: any) => {
    // 즉시 큐에 추가하여 INSERT_AI_TEXT보다 먼저 처리되도록 함
    logAsync(ActionType.SELECT_AI_TEXT, { 
      selectedOption
    }, entryId)
  }, [logAsync])

  /**
   * 엔트리 저장 로그
   */
  const logEntrySave = useCallback((entryId: string) => {
    logAsync(ActionType.SAVE_ENTRY, undefined, entryId)
  }, [logAsync])

  /**
   * ESM 트리거 로그 (ESM 모달 표시)
   */
  const logTriggerESM = useCallback((entryId: string) => {
    logAsync(ActionType.TRIGGER_ESM, undefined, entryId)
  }, [logAsync])

  /**
   * ESM 제출 로그
   */
  const logESMSubmit = useCallback((entryId: string, consent: boolean) => {
    logAsync(ActionType.SUBMIT_ESM, { consent }, entryId)
  }, [logAsync])

  /**
   * 글쓰기 시작 로그
   */
  const logStartWriting = useCallback((entryId: string) => {
    logAsync(ActionType.START_WRITING, undefined, entryId)
  }, [logAsync])

  /**
   * 경험 살펴보기 요청 로그
   */
  const logRequestRecord = useCallback((entryId: string, selectedText: string) => {
    logAsync(ActionType.REQUEST_RECORD, { selectedText }, entryId)
  }, [logAsync])

  /**
   * 경험 살펴보기 응답 수신 로그
   */
  const logReceiveRecord = useCallback((entryId: string, records: any) => {
    logAsync(ActionType.RECEIVE_RECORD, { 
      records: records,
      recordCount: records.length 
    }, entryId)
  }, [logAsync])

  /**
   * 일기 열어보기 로그
   */
  const logCheckRecord = useCallback((entryId: string, originalEntryId: string) => {
    logAsync(ActionType.CHECK_RECORD, { 
      originalEntryId 
    }, entryId)
  }, [logAsync])

  /**
   * 텍스트 편집 로그 (수동 편집)
   */
  const logTextEdit = useCallback((entryId: string, editData: {
    changeType: 'insert' | 'delete' | 'replace' | 'format'
    position: number
    oldText: string
    newText: string
    oldLength: number
    newLength: number
    wordCountBefore: number
    wordCountAfter: number
    characterCountBefore: number
    characterCountAfter: number
  }) => {
    logAsync(ActionType.EDIT_USER_TEXT, editData, entryId)
  }, [logAsync])

  /**
   * 텍스트 선택 로그
   */
  const logTextSelection = useCallback((entryId: string, selectionData: {
    from: number
    to: number
    selectedText: string
    selectionLength: number
  }) => {
    logAsync(ActionType.SELECT_TEXT, selectionData, entryId)
  }, [logAsync])

  /**
   * 텍스트 선택 해제 로그
   */
  const logTextDeselection = useCallback((entryId: string) => {
    logAsync(ActionType.DESELECT_TEXT, undefined, entryId)
  }, [logAsync])

  return {
    // 기본 로그 함수들
    logAsync,

    // 특정 액션 로그 함수들
    logAITrigger,
    logAIReceive,
    logAITextInsert,
    logEntrySave,
    logTriggerESM,
    logESMSubmit,
    logStartWriting,

    // 경험 살펴보기 기능 로그 함수들
    logRequestRecord,
    logReceiveRecord,
    logCheckRecord,
    
    // 텍스트 편집 로그 함수들
    logTextEdit,
    logTextSelection,
    logTextDeselection,
    
    // 사용자 정보 확인
    canLog: canLog
  }
}
