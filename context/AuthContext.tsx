// context/AuthContext.tsx
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import * as SecureStore from 'expo-secure-store'
import { insforge } from '@/lib/insforge'
import type { User } from '@/types/database.types'

const REFRESH_TOKEN_KEY = 'insforge_refresh_token'

interface AuthState {
  user: User | null
  loading: boolean
  onSignIn: (accessToken: string, refreshToken: string, email: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthState>({
  user: null,
  loading: true,
  onSignIn: async () => {},
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
      if (!refreshToken) return

      const { data, error } = await insforge.auth.refreshSession({ refreshToken })
      if (error || !data) {
        await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY)
        return
      }

      if (data.refreshToken) {
        await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, data.refreshToken)
      }

      await loadUserProfile(data.user?.email ?? '')
    } catch {
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY)
    } finally {
      setLoading(false)
    }
  }

  async function loadUserProfile(email: string) {
    if (!email) return
    const { data } = await insforge.database
      .from('users')
      .select('*')
      .eq('email', email)
      .maybeSingle()

    if (data) setUser(data as User)
  }

  async function onSignIn(accessToken: string, refreshToken: string, email: string) {
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken)
    await loadUserProfile(email)
  }

  async function signOut() {
    try {
      await insforge.auth.signOut()
    } catch { /* ignore */ }
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, onSignIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
