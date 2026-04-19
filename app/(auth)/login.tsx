// app/(auth)/login.tsx
import { View, Text } from 'react-native'
import { useState } from 'react'
import { router } from 'expo-router'
import * as WebBrowser from 'expo-web-browser'
import * as Google from 'expo-auth-session/providers/google'
import { makeRedirectUri } from 'expo-auth-session'
import { insforge } from '@/lib/insforge'
import { useAuth } from '@/context/AuthContext'
import { PrimaryButton } from '@/components/ui/PrimaryButton'

WebBrowser.maybeCompleteAuthSession()

export default function LoginScreen() {
  const { onSignIn } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [, , promptAsync] = Google.useAuthRequest({
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
    redirectUri: makeRedirectUri({ scheme: 'expensemanager' }),
  })

  async function handleGoogleLogin() {
    setLoading(true)
    setError(null)

    try {
      const result = await promptAsync()

      if (result.type !== 'success') {
        return
      }

      const { id_token } = result.params
      if (!id_token) throw new Error('No id_token received from Google')

      // Authenticate with InsForge using the Google id_token
      const { data, error: authError } = await insforge.auth.signInWithIdToken({
        provider: 'google',
        token: id_token,
      })

      if (authError || !data) throw authError ?? new Error('Authentication failed')

      // user.email is directly on the user object
      // user.profile holds name and avatar_url
      const email = data.user?.email ?? ''
      const accessToken = data.accessToken ?? ''
      const refreshToken = data.refreshToken ?? ''

      // Create user in our users table if not exists
      const { data: existingUser } = await insforge.database
        .from('users')
        .select('id')
        .eq('email', email)
        .maybeSingle()

      if (!existingUser) {
        await insforge.database.from('users').insert([{
          email,
          name: data.user?.profile?.name ?? null,
          avatar_url: data.user?.profile?.avatar_url ?? null,
          preferred_currency: 'COP',
        }])
      }

      // Persist session and load user profile
      await onSignIn(accessToken, refreshToken, email)

      router.replace('/(dashboard)')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al iniciar sesión'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <View className="flex-1 bg-bg items-center justify-center px-8 gap-8">
      <View className="items-center gap-3">
        <Text className="text-white text-3xl font-bold">Expense Manager</Text>
        <Text className="text-muted text-base text-center">
          Controla tus finanzas personales
        </Text>
      </View>

      <View className="w-full gap-4">
        <PrimaryButton onPress={handleGoogleLogin} loading={loading}>
          Iniciar sesión con Google
        </PrimaryButton>

        {error && (
          <Text className="text-red-400 text-sm text-center">{error}</Text>
        )}
      </View>
    </View>
  )
}
