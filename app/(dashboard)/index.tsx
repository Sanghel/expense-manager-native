// app/(dashboard)/index.tsx
import { View, Text } from 'react-native'
import { useAuth } from '@/context/AuthContext'

export default function DashboardScreen() {
  const { user } = useAuth()
  return (
    <View className="flex-1 bg-bg items-center justify-center">
      <Text className="text-white text-xl font-bold">Dashboard</Text>
      <Text className="text-muted mt-2">Hola, {user?.name ?? user?.email}</Text>
    </View>
  )
}
