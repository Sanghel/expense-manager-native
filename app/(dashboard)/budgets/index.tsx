import { useCallback, useState } from 'react'
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native'
import { router, useFocusEffect } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from '@/context/AuthContext'
import { getBudgets } from '@/lib/actions/budgets.actions'
import { ProgressBar, defaultColor } from '@/components/ui/ProgressBar'
import { EmptyState } from '@/components/ui/EmptyState'
import { ListLoadingSkeleton } from '@/components/ui/ListLoadingSkeleton'
import { toast } from '@/components/ui/Toast'
import { formatCurrency } from '@/lib/utils/currency'
import type { BudgetWithSpent } from '@/types/database.types'

const PERIOD_LABEL: Record<'monthly' | 'yearly', string> = {
  monthly: 'Mensual',
  yearly: 'Anual',
}

function formatShortDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('es', { day: 'numeric', month: 'short' })
}

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

  if (loading) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 bg-bg">
        <View className="flex-row items-center justify-between px-4 py-3 border-b border-border">
          <View style={{ width: 60 }} />
          <Text className="text-white text-base font-bold">Presupuestos</Text>
          <View style={{ width: 60 }} />
        </View>
        <ListLoadingSkeleton />
      </SafeAreaView>
    )
  }

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

      <FlatList
        data={budgets}
        keyExtractor={(b) => b.id}
        contentContainerStyle={
          budgets.length === 0 ? { flex: 1 } : { paddingVertical: 12 }
        }
        ListEmptyComponent={
          <EmptyState
            icon="🎯"
            title="Sin presupuestos"
            description="Toca + para crear tu primer presupuesto"
          />
        }
        renderItem={({ item }) => <BudgetCard budget={item} />}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true)
              await loadBudgets()
              setRefreshing(false)
            }}
            tintColor="#4F46E5"
          />
        }
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

function BudgetCard({ budget }: { budget: BudgetWithSpent }) {
  const ratio = budget.amount > 0 ? budget.spent / budget.amount : 0
  const color = defaultColor(ratio)
  const exceeded = ratio >= 1
  const remaining = budget.amount - budget.spent

  return (
    <TouchableOpacity
      onPress={() => router.push(`/budgets/${budget.id}`)}
      activeOpacity={0.7}
      className="mx-4 mb-3 bg-surface border border-border rounded-2xl p-4"
    >
      {/* Header card */}
      <View className="flex-row items-center mb-3">
        <View
          style={{ backgroundColor: budget.category.color ?? '#4F46E5' }}
          className="w-10 h-10 rounded-full items-center justify-center mr-3"
        >
          <Text className="text-xl">{budget.category.icon ?? '📂'}</Text>
        </View>
        <View className="flex-1">
          <Text className="text-white text-base font-semibold">
            {budget.category.name}
          </Text>
          <Text className="text-muted text-xs">
            {PERIOD_LABEL[budget.period]} · {formatShortDate(budget.periodStart)} —{' '}
            {formatShortDate(budget.periodEnd)}
          </Text>
        </View>
        <Text style={{ color }} className="text-base font-bold">
          {Math.round(ratio * 100)}%
        </Text>
      </View>

      <ProgressBar value={ratio} />

      {/* Footer */}
      <View className="flex-row justify-between mt-3">
        <Text className="text-muted text-xs">
          Gastado{' '}
          <Text className="text-white text-sm">
            {formatCurrency(budget.spent, budget.currency)}
          </Text>
        </Text>
        <Text className="text-muted text-xs">
          de{' '}
          <Text className="text-white text-sm">
            {formatCurrency(budget.amount, budget.currency)}
          </Text>
        </Text>
      </View>

      {exceeded ? (
        <View className="mt-2 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/40">
          <Text className="text-red-400 text-xs">
            Excedido por {formatCurrency(budget.spent - budget.amount, budget.currency)}
          </Text>
        </View>
      ) : (
        <Text className="text-muted text-xs mt-2">
          Restante {formatCurrency(remaining, budget.currency)}
        </Text>
      )}
    </TouchableOpacity>
  )
}
