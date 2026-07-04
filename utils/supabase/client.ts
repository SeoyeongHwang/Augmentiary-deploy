import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getPublicSupabaseConfig } from './env'

let browserClient: SupabaseClient | undefined

export function createClient(): SupabaseClient {
  if (!browserClient) {
    const { url, publishableKey } = getPublicSupabaseConfig()
    browserClient = createBrowserClient(url, publishableKey, {
      isSingleton: true,
    })
  }

  return browserClient
}
