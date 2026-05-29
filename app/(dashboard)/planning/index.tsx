// app/(dashboard)/planning/index.tsx
//
// Hub de Planificación: agrupa Metas de Ahorro + Presupuestos detrás
// de un segmented control. Equivalente al `/(dashboard)/planificacion`
// del web con sus dos tabs.
//
// Carga ambos datasets en paralelo al enfocar la pantalla. El FAB
// apunta dinámicamente a /savings/new o /budgets/new según el tab activo.
// Las rutas legacy /savings y /budgets siguen funcionando para deep
// links y para volver desde las pantallas de detalle.
import { useCallback, useState } from 'react'
import { View, Text, TouchableOpacity } from 'react-native'
import { router, useFocusEffect } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from '@/context/AuthContext'
import { getSavingsGoals } from '@/lib/actions/savings.actions'
import { getBudgets } from '@/lib/actions/budgets.actions'
import { SavingsList } from '@/components/savings/SavingsList'
import { BudgetsList } from '@/components/budgets/BudgetsList'
import { toast } from '@/components/ui/Toast'
import type { BudgetWithSpent, SavingsGoal } from '@/types/database.types'

type Tab = 'savings' | 'budgets'

const TABS: { key: Tab; label: string }[] = [
  { key: 'savings', label: 'Metas' },
  { key: 'budgets', label: 'Presupuestos' },
]

export default function PlanningScreen() {
  const { user } = useAuth()
  const [tab, setTab] = useState<Tab>('savings')
  const [goals, setGoals] = useState<SavingsGoal[]>([])
  const [budgets, setBudgets] = useState<BudgetWithSpent[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const loadData = useCallback(async () => {
    if (!user) return
    const [goalsRes, budgetsRes] = await Promise.all([
      getSavingsGoals(user.id),
      getBudgets(user.id),
    ])
    if (goalsRes.success && goalsRes.data) setGoals(goalsRes.data)
    else if (!goalsRes.success) toast.error(goalsRes.error ?? 'Error al cargar metas')

    if (budgetsRes.success && budgetsRes.data) setBudgets(budgetsRes.data)
    else if (!budgetsRes.success)
      toast.error(budgetsRes.error ?? 'Error al cargar presupuestos')

    setLoading(false)
  }, [user])

  useFocusEffect(
    useCallback(() => {
      let cancelled = false
      ;(async () => {
        await loadData()
        if (cancelled) return
      })()
      return () => {
        cancelled = true
      }
    }, [loadData])
  )

  const fabTarget = tab === 'savings' ? '/savings/new' : '/budgets/new'
  const fabLabel =
    tab === 'savings'
      ? 'Crear nueva meta de ahorro'
      : 'Crear nuevo presupuesto'

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-bg">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-border">
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <Text className="text-primary text-base">← Volver</Text>
        </TouchableOpacity>
        <Text className="text-white text-base font-bold">Planificación</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Segmented control */}
      <View className="flex-row gap-2 px-4 pt-3 pb-1">
        {TABS.map((t) => {
          const active = t.key === tab
          return (
            <TouchableOpacity
              key={t.key}
              onPress={() => setTab(t.key)}
              activeOpacity={0.7}
              className={`flex-1 py-2 rounded-xl items-center border ${
                active
                  ? 'bg-primary border-primary'
                  : 'bg-transparent border-border'
              }`}
            >
              <Text
                className={
                  active
                    ? 'text-white text-sm font-semibold'
                    : 'text-muted text-sm'
                }
              >
                {t.label}
              </Text>
            </TouchableOpacity>
          )
        })}
      </View>

      {/* Body — un listado a la vez. Mantenemos ambos montados para
          preservar scroll position al toggle, vía display none/flex. */}
      <View className="flex-1">
        <View
          style={{ flex: tab === 'savings' ? 1 : 0, display: tab === 'savings' ? 'flex' : 'none' }}
        >
          <SavingsList
            goals={goals}
            loading={loading}
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true)
              await loadData()
              setRefreshing(false)
            }}
          />
        </View>
        <View
          style={{ flex: tab === 'budgets' ? 1 : 0, display: tab === 'budgets' ? 'flex' : 'none' }}
        >
          <BudgetsList
            budgets={budgets}
            loading={loading}
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true)
              await loadData()
              setRefreshing(false)
            }}
          />
        </View>
      </View>

      {/* FAB dinámico */}
      <TouchableOpacity
        onPress={() => router.push(fabTarget)}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={fabLabel}
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
