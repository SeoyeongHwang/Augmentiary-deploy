/**
 * KST 기준 시간 처리 유틸리티
 * 모든 타임스탬프는 KST (UTC+9) 기준으로 처리
 */

/**
 * 현재 시간을 KST 기준 ISO 문자열로 반환
 */
export function getCurrentKST(): string {
  const now = new Date()
  const kstOffset = 9 * 60 // UTC+9
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000)
  const kst = new Date(utc + (kstOffset * 60000))
  
  // KST 시간을 ISO 문자열로 변환하되, 시간대 정보를 포함
  const year = kst.getFullYear()
  const month = String(kst.getMonth() + 1).padStart(2, '0')
  const day = String(kst.getDate()).padStart(2, '0')
  const hours = String(kst.getHours()).padStart(2, '0')
  const minutes = String(kst.getMinutes()).padStart(2, '0')
  const seconds = String(kst.getSeconds()).padStart(2, '0')
  const milliseconds = String(kst.getMilliseconds()).padStart(3, '0')
  
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${milliseconds}+09:00`
}

/**
 * 이미 KST 기준으로 저장된 시간을 한국어로 포맷팅 (중복 변환 방지)
 */
export function formatKSTStored(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return dateObj.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}
