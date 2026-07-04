import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createClient as createBrowserSupabaseClient } from '../utils/supabase/client'

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || ''
const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  ''

let supabase: any

if (supabaseUrl && supabasePublishableKey) {
  try {
    if (typeof window !== 'undefined') {
      supabase = createBrowserSupabaseClient()
    } else {
      supabase = createSupabaseClient(
        supabaseUrl,
        supabasePublishableKey,
        {
          auth: {
            autoRefreshToken: false,
            detectSessionInUrl: false,
            persistSession: false
          },
          db: {
            schema: 'public'
          },
          realtime: {
            params: {
              eventsPerSecond: 10
            }
          }
        }
      )
    }
  } catch (error) {
    console.error('❌ Supabase 클라이언트 생성 실패:', error)
    supabase = null
  }
} else {
  // 빌드 시에는 환경 변수가 없을 수 있으므로 null로 설정
  supabase = null
}

export { supabase }
