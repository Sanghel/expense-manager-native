import { createClient } from '@insforge/sdk'

if (!process.env.EXPO_PUBLIC_INSFORGE_URL) {
  throw new Error('Missing env.EXPO_PUBLIC_INSFORGE_URL')
}
if (!process.env.EXPO_PUBLIC_INSFORGE_ANON_KEY) {
  throw new Error('Missing env.EXPO_PUBLIC_INSFORGE_ANON_KEY')
}

export const insforge = createClient({
  baseUrl: process.env.EXPO_PUBLIC_INSFORGE_URL,
  anonKey: process.env.EXPO_PUBLIC_INSFORGE_ANON_KEY,
  // isServerMode enables refresh_token in response body (required for mobile/native)
  isServerMode: true,
})
