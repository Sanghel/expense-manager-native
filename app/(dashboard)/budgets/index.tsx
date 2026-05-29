// app/(dashboard)/budgets/index.tsx
//
// Pantalla dedicada de Presupuestos. Mantiene header con back + FAB.
// El contenido del listado lo provee <BudgetsList /> (reutilizable, también
// usado por el hub /planning).
import { useCallback, useState } from 'react'
import { View, Text, TouchableOpacity } from 'react-native'
import { router, useFocusEffect } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from '@/context/AuthContext'
import { getBudgets } from '@/lib/actions/budgets.actions'
import { BudgetsList } from '@/components/budgets/BudgetsList'
import { toast } from '@/components/ui/Toast'
import type { BudgetWithSpent } from '@/types/database.types'

export default function BudgetsScreen() {
  const { user } = useAuth()
  const [budgets, setBudgets] = useState<BudgetWithSpent[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const loadBudgets = useCallback(async () => {
    if (!user) return
    const res = await getBudgets(user.id)
    if (res.success && res.data) setBudgets(res.data)
    else if (!res.success) toast.error(res.error ?? 'Error al cargar presupuestos')
    setLoading(false)
  }, [user])

  useFocusEffect(
    useCallback(() => {
      let cancelled = false
      ;(async () => {
        await loadBudgets()
        if (cancelled) return
      })()
      return () => {
        cancelled = true
      }
    }, [loadBudgets])
  )

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-bg">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-border">
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <Text className="text-primary text-base">← Volver</Text>
        </TouchableOpacity>
        <Text className="text-white text-base font-bold">Presupuestos</Text>
        <View style={{ width: 60 }} />
      </View>

      <BudgetsList
        budgets={budgets}
        loading={loading}
        refreshing={refreshing}
        onRefresh={async () => {
          setRefreshing(true)
          await loadBudgets()
          setRefreshing(false)
        }}
      />

      {/* FAB */}
      <TouchableOpacity
        onPress={() => router.push('/budgets/new')}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel="Crear nuevo presupuesto"
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
