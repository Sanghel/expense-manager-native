// app/_layout.tsx
import { Stack } from 'expo-router'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { AuthProvider } from '@/context/AuthContext'
import { AppToaster } from '@/components/ui/Toast'
import '../global.css'

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <Stack screenOptions={{ headerShown: false }} />
        <AppToaster />
      </AuthProvider>
    </SafeAreaProvider>
  )
}
