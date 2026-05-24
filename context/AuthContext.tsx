// context/AuthContext.tsx
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import * as SecureStore from 'expo-secure-store'
import { insforge } from '@/lib/insforge'
import type { User } from '@/types/database.types'

const USER_EMAIL_KEY = 'expense_manager_user_email'

interface AuthState {
  user: User | null
  loading: boolean
  onSignIn: (email: string) => Promise<void>
  signOut: () => Promise<void>
  /** Re-carga el user actual desde DB. Usar tras actualizar el perfil. */
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthState>({
  user: null,
  loading: true,
  onSignIn: async () => {},
  signOut: async () => {},
  refreshUser: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    restoreSession()
  }, [])

  async function restoreSession() {
    try {
      const email = await SecureStore.getItemAsync(USER_EMAIL_KEY)
      if (!email) return
      await loadUserProfile(email)
    } catch {
      await SecureStore.deleteItemAsync(USER_EMAIL_KEY)
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

  async function onSignIn(email: string) {
    await SecureStore.setItemAsync(USER_EMAIL_KEY, email)
    await loadUserProfile(email)
  }

  async function signOut() {
    await SecureStore.deleteItemAsync(USER_EMAIL_KEY)
    setUser(null)
  }

  async function refreshUser() {
    const email = await SecureStore.getItemAsync(USER_EMAIL_KEY)
    if (!email) return
    await loadUserProfile(email)
  }

  return (
    <AuthContext.Provider value={{ user, loading, onSignIn, signOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
