// context/AuthContext.tsx
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import * as SecureStore from 'expo-secure-store'
import { insforge } from '@/lib/insforge'
import type { User } from '@/types/database.types'

const ACCESS_TOKEN_KEY = 'insforge_access_token'
const REFRESH_TOKEN_KEY = 'insforge_refresh_token'

interface AuthState {
  user: User | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthState>({
  user: null,
  loading: true,
  signOut: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    restoreSession()
  }, [])

  async function restoreSession() {
    try {
      const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY)
      if (!refreshToken) {
        setLoading(false)
        return
      }

      const { data, error } = await insforge.auth.refreshSession({ refreshToken })
      if (error || !data) {
        await clearStoredTokens()
        setLoading(false)
        return
      }

      // Persist updated tokens (server may rotate them)
      await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, data.accessToken)
      if (data.refreshToken) {
        await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, data.refreshToken)
      }

      await loadUserProfile(data.user.id)
    } catch {
      await clearStoredTokens()
      setLoading(false)
    }
  }

  async function loadUserProfile(userId: string) {
    try {
      const { data } = await insforge.database
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

      setUser(data as User | null)
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  async function clearStoredTokens() {
    await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY)
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY)
  }

  async function signOut() {
    await insforge.auth.signOut()
    await clearStoredTokens()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)

/**
 * Call this after a successful signInWithPassword to persist the session.
 * Typically used in the login screen:
 *
 * const { data, error } = await insforge.auth.signInWithPassword({ email, password })
 * if (data) await persistSession(data.accessToken, data.refreshToken)
 */
export async function persistSession(accessToken: string, refreshToken?: string) {
  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken)
  if (refreshToken) {
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken)
  }
}
