import { useCallback, useEffect, useRef, useState } from 'react'
import { User } from '../types/user'

interface SessionCheckResult {
  success: boolean
  needsLogin: boolean
}

export function useSession() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const checkSession = useCallback(async (): Promise<SessionCheckResult> => {
    try {
      const response = await fetch('/api/auth/session', {
        method: 'GET',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      })

      const data = await response.json()

      if (!response.ok || !data.data?.isLoggedIn) {
        setUser(null)
        setLoading(false)
        return { success: false, needsLogin: true }
      }

      setUser(data.data.user)
      setLoading(false)
      return { success: true, needsLogin: false }
    } catch (error) {
      console.error('세션 체크 중 오류:', error)
      setUser(null)
      setLoading(false)
      return { success: false, needsLogin: true }
    }
  }, [])

  useEffect(() => {
    checkSession()

    intervalRef.current = setInterval(() => {
      void checkSession()
    }, 5 * 60 * 1000)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [checkSession])

  const signOut = async () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
        },
      })
    } catch (error) {
      console.error('로그아웃 요청 중 오류:', error)
    } finally {
      setUser(null)
    }
  }

  const refreshSession = async () => {
    const result = await checkSession()
    return result.success
  }

  const refreshUser = async () => {
    const result = await checkSession()
    return result.success
  }

  return {
    user,
    loading,
    signOut,
    refreshSession,
    refreshUser,
    checkSession,
  }
}
