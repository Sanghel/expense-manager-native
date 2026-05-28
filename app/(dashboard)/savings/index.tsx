// app/(dashboard)/savings/index.tsx
//
// Pantalla dedicada de Metas de Ahorro. Mantiene header con back + FAB.
// El contenido del listado lo provee <SavingsList /> (reutilizable, también
// usado por el hub /planning).
import { useCallback, useState } from 'react'
import { View, Text, TouchableOpacity } from 'react-native'
import { router, useFocusEffect } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from '@/context/AuthContext'
import { getSavingsGoals } from '@/lib/actions/savings.actions'
import { SavingsList } from '@/components/savings/SavingsList'
import { toast } from '@/components/ui/Toast'
import type { SavingsGoal } from '@/types/database.types'

export default function SavingsScreen() {
  const { user } = useAuth()
  const [goals, setGoals] = useState<SavingsGoal[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const loadGoals = useCallback(async () => {
    if (!user) return
    const res = await getSavingsGoals(user.id)
    if (res.success && res.data) setGoals(res.data)
    else if (!res.success) toast.error(res.error ?? 'Error al cargar metas')
    setLoading(false)
  }, [user])

  useFocusEffect(
    useCallback(() => {
      let cancelled = false
      ;(async () => {
        await loadGoals()
        if (cancelled) return
      })()
      return () => {
        cancelled = true
      }
    }, [loadGoals])
  )

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-bg">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-border">
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <Text className="text-primary text-base">← Volver</Text>
        </TouchableOpacity>
        <Text className="text-white text-base font-bold">Metas de ahorro</Text>
        <View style={{ width: 60 }} />
      </View>

      <SavingsList
        goals={goals}
        loading={loading}
        refreshing={refreshing}
        onRefresh={async () => {
          setRefreshing(true)
          await loadGoals()
          setRefreshing(false)
        }}
      />

      {/* FAB */}
      <TouchableOpacity
        onPress={() => router.push('/savings/new')}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel="Crear nueva meta de ahorro"
        className="absolute bottom-6 right-6 w-14 h-14 rounded-full bg-primary items-center justify-center shadow-lg"
        style={{
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 6,
          elevation: 6,
        }}
      >
        <Text className="text-white text-3xl font-bold" style={{ lineHeight: 32 }}>
          +
        </Text>
      </TouchableOpacity>
    </SafeAreaView>
  )
}
