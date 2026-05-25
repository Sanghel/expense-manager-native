// app/_layout.tsx
import { useEffect } from 'react'
import { Stack, router } from 'expo-router'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import * as Notifications from 'expo-notifications'
import { AuthProvider } from '@/context/AuthContext'
import { AppToaster } from '@/components/ui/Toast'
import { ensureAndroidChannel } from '@/lib/utils/notifications'
import '../global.css'

export default function RootLayout() {
  /**
   * Setup global de notifications:
   *   1. Crear canal Android (idempotente).
   *   2. Listener para deep-link cuando el user TAPS una notification.
   *      El payload contiene `data.url` = '/reminders/<id>'.
   *
   * El listener funciona tanto si la app está en foreground como background
   * o killed. Si fue killed, el listener se llama al boot con el último
   * `notificationResponse` que la disparó.
   */
  useEffect(() => {
    ensureAndroidChannel()

    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data as
          | { url?: string }
          | null
        if (data?.url) {
          router.push(data.url as `/${string}`)
        }
      }
    )

    return () => subscription.remove()
  }, [])

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <Stack screenOptions={{ headerShown: false }} />
        <AppToaster />
      </AuthProvider>
    </SafeAreaProvider>
  )
}
