// app/(dashboard)/more.tsx
import { View, Text, TouchableOpacity } from 'react-native'
import { router } from 'expo-router'
import { useAuth } from '@/context/AuthContext'

export default function MoreScreen() {
  const { signOut } = useAuth()
  return (
    <View className="flex-1 bg-bg items-center justify-center gap-4">
      <Text className="text-white text-xl font-bold">Más opciones</Text>
      <Text className="text-muted">Presupuestos, Metas, Reportes...</Text>

      <TouchableOpacity
        onPress={() => router.push('/categories')}
        className="mt-4 bg-primary rounded-xl px-6 py-3"
        activeOpacity={0.8}
      >
        <Text className="text-white font-semibold">Gestionar categorías</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={signOut}
        className="mt-2 border border-red-500 rounded-xl px-6 py-3"
        activeOpacity={0.8}
      >
        <Text className="text-red-400 font-semibold">Cerrar sesión</Text>
      </TouchableOpacity>
    </View>
  )
}
