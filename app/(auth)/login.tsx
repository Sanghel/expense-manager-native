// app/(auth)/login.tsx
import { View, Text } from 'react-native'
import { useState } from 'react'
import { router } from 'expo-router'
import * as WebBrowser from 'expo-web-browser'
import * as Google from 'expo-auth-session/providers/google'
import { exchangeCodeAsync } from 'expo-auth-session'
import { insforge } from '@/lib/insforge'
import { useAuth } from '@/context/AuthContext'
import { PrimaryButton } from '@/components/ui/PrimaryButton'

WebBrowser.maybeCompleteAuthSession()

function decodeJwtPayload(jwt: string): Record<string, unknown> {
  const base64Url = jwt.split('.')[1]
  if (!base64Url) return {}
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
  try {
    const json = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    )
    return JSON.parse(json)
  } catch {
    return {}
  }
}

export default function LoginScreen() {
  const { onSignIn } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [request, , promptAsync] = Google.useAuthRequest({
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
    scopes: ['openid', 'profile', 'email'],
  })

  async function handleGoogleLogin() {
    setLoading(true)
    setError(null)

    try {
      const result = await promptAsync()

      if (result.type !== 'success') {
        return
      }

      if (!request) {
        throw new Error('Auth request not initialized')
      }

      // Google iOS clients usan Authorization Code Flow + PKCE: el redirect devuelve
      // un `code`, no el id_token directo. Hay que intercambiar el code por tokens.
      const tokenResponse = await exchangeCodeAsync(
        {
          clientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID!,
          code: result.params.code,
          redirectUri: request.redirectUri,
          extraParams: { code_verifier: request.codeVerifier ?? '' },
        },
        { tokenEndpoint: 'https://oauth2.googleapis.com/token' }
      )

      const id_token = tokenResponse.idToken
      if (!id_token) {
        throw new Error('No id_token in token exchange response')
      }

      // Decodificamos el id_token localmente (igual que hace el web vía NextAuth).
      // InsForge no valida contra Google — usamos InsForge solo como DB con anon key.
      const claims = decodeJwtPayload(id_token)
      const email = typeof claims.email === 'string' ? claims.email : ''
      const name = typeof claims.name === 'string' ? claims.name : null
      const avatar_url = typeof claims.picture === 'string' ? claims.picture : null

      if (!email) throw new Error('Google no devolvió un email en el token')

      // Whitelist check
      const { data: whitelistEntry } = await insforge.database
        .from('whitelist')
        .select('email')
        .eq('email', email)
        .maybeSingle()

      if (!whitelistEntry) {
        throw new Error('Tu email no está autorizado para usar la app')
      }

      // Create user in our users table if not exists
      const { data: existingUser } = await insforge.database
        .from('users')
        .select('id')
        .eq('email', email)
        .maybeSingle()

      if (!existingUser) {
        await insforge.database.from('users').insert([{
          email,
          name,
          avatar_url,
          preferred_currency: 'COP',
        }])
      }

      // Persist session (email-based) and load user profile
      await onSignIn(email)

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
