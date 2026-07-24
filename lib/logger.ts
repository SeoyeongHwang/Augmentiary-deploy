import { CreateInteractionLogData } from '../types/log'
import { getCurrentKST } from './time'

type QueuedLog = CreateInteractionLogData & { timestamp: string }

/**
 * 인터랙션 로그 큐 시스템
 * 클라이언트에서는 큐에만 쌓고, entry 저장 시 서버 사이드 API로 함께 전송한다.
 */
class LogQueue {
  private queue: QueuedLog[] = []

  add(data: CreateInteractionLogData): void {
    // 로그가 큐에 쌓일 때 timestamp를 즉시 할당
    this.queue.push({
      ...data,
      timestamp: getCurrentKST(),
    })
  }

  // 큐에 있는 데이터를 반환하고 큐를 비움 (서버 사이드 저장용)
  getQueuedLogs(): QueuedLog[] {
    const logs = [...this.queue]
    this.queue = []
    return logs
  }

  // 전송 실패 시 로그를 다시 큐 앞쪽에 되돌림
  requeue(logs: QueuedLog[]): void {
    this.queue.unshift(...logs)
  }
}

// 전역 로그 큐 인스턴스
export const logQueue = new LogQueue()

/**
 * 비동기 로그 기록 (큐 사용)
 */
export function logInteractionAsync(data: CreateInteractionLogData): void {
  logQueue.add(data)
}

/**
 * 큐에 있는 로그 데이터를 가져와서 반환 (서버 사이드 저장용)
 */
export function getQueuedLogsForServerSide(): QueuedLog[] {
  return logQueue.getQueuedLogs()
}

/**
 * 서버 전송 실패 시 로그를 큐에 되돌림
 */
export function requeueLogs(logs: QueuedLog[]): void {
  logQueue.requeue(logs)
}
