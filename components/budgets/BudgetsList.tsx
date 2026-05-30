// components/budgets/BudgetsList.tsx
//
// Lista reutilizable de presupuestos. Sin header ni FAB — solo el
// FlatList + EmptyState + skeleton + BudgetCard. Se usa tanto en la
// pantalla dedicada /budgets como en el hub /planning.
//
// Loading / refresh / data viven en el padre — este componente solo renderiza.
import { View, Text, FlatList, TouchableOpacity, RefreshControl } from 'react-native'
import { router } from 'expo-router'
import { ProgressBar, defaultColor } from '@/components/ui/ProgressBar'
import { EmptyState } from '@/components/ui/EmptyState'
import { ListLoadingSkeleton } from '@/components/ui/ListLoadingSkeleton'
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

interface Props {
  budgets: BudgetWithSpent[]
  loading: boolean
  refreshing: boolean
  onRefresh: () => void | Promise<void>
}

export function BudgetsList({ budgets, loading, refreshing, onRefresh }: Props) {
  if (loading) {
    return <ListLoadingSkeleton />
  }

  return (
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
          onRefresh={onRefresh}
          tintColor="#4F46E5"
        />
      }
    />
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
