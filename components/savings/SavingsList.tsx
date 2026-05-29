// components/savings/SavingsList.tsx
//
// Lista reutilizable de metas de ahorro. Sin header ni FAB — solo el
// FlatList + EmptyState + skeleton + GoalCard. Se usa tanto en la
// pantalla dedicada /savings como en el hub /planning.
//
// Loading / refresh / data viven en el padre — este componente solo renderiza.
import { View, Text, FlatList, TouchableOpacity, RefreshControl } from 'react-native'
import { router } from 'expo-router'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { EmptyState } from '@/components/ui/EmptyState'
import { ListLoadingSkeleton } from '@/components/ui/ListLoadingSkeleton'
import { formatCurrency } from '@/lib/utils/currency'
import type { SavingsGoal } from '@/types/database.types'

/** Devuelve "Faltan X días", "Vence hoy", "Vencida hace Y días", o null si no hay deadline. */
function formatDeadline(deadline: string | null): {
  text: string
  overdue: boolean
} | null {
  if (!deadline) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(`${deadline}T00:00:00`)
  const diffMs = target.getTime() - today.getTime()
  const days = Math.round(diffMs / (1000 * 60 * 60 * 24))

  if (days === 0) return { text: 'Vence hoy', overdue: false }
  if (days > 0) return { text: `Faltan ${days} días`, overdue: false }
  return { text: `Vencida hace ${Math.abs(days)} días`, overdue: true }
}

interface Props {
  goals: SavingsGoal[]
  loading: boolean
  refreshing: boolean
  onRefresh: () => void | Promise<void>
}

export function SavingsList({ goals, loading, refreshing, onRefresh }: Props) {
  if (loading) {
    return <ListLoadingSkeleton />
  }

  return (
    <FlatList
      data={goals}
      keyExtractor={(g) => g.id}
      contentContainerStyle={
        goals.length === 0 ? { flex: 1 } : { paddingVertical: 12 }
      }
      ListEmptyComponent={
        <EmptyState
          icon="🐖"
          title="Sin metas"
          description="Toca + para crear tu primera meta de ahorro"
        />
      }
      renderItem={({ item }) => <GoalCard goal={item} />}
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

function GoalCard({ goal }: { goal: SavingsGoal }) {
  const target = Number(goal.target_amount)
  const current = Number(goal.current_amount)
  const ratio = target > 0 ? current / target : 0
  const remaining = Math.max(0, target - current)
  const deadline = formatDeadline(goal.deadline)
  const completed = goal.is_completed || ratio >= 1

  return (
    <TouchableOpacity
      onPress={() => router.push(`/savings/${goal.id}`)}
      activeOpacity={0.7}
      className="mx-4 mb-3 bg-surface border border-border rounded-2xl p-4"
    >
      <View className="flex-row items-center mb-3">
        <View className="flex-1">
          <View className="flex-row items-center gap-2">
            <Text className="text-white text-base font-semibold">
              {goal.name}
            </Text>
            {completed ? (
              <View className="px-2 py-0.5 rounded-full bg-green-500/15 border border-green-500/40">
                <Text className="text-green-400 text-xs font-semibold">
                  Completada
                </Text>
              </View>
            ) : null}
          </View>
          {deadline ? (
            <Text
              className={
                deadline.overdue
                  ? 'text-red-400 text-xs mt-0.5'
                  : 'text-muted text-xs mt-0.5'
              }
            >
              {deadline.text}
            </Text>
          ) : null}
        </View>
        <Text className="text-green-400 text-base font-bold">
          {Math.round(ratio * 100)}%
        </Text>
      </View>

      <ProgressBar value={ratio} color="#10b981" />

      <View className="flex-row justify-between mt-3">
        <Text className="text-muted text-xs">
          Ahorrado{' '}
          <Text className="text-white text-sm">
            {formatCurrency(current, goal.currency)}
          </Text>
        </Text>
        <Text className="text-muted text-xs">
          de{' '}
          <Text className="text-white text-sm">
            {formatCurrency(target, goal.currency)}
          </Text>
        </Text>
      </View>

      {!completed ? (
        <Text className="text-muted text-xs mt-2">
          Restante {formatCurrency(remaining, goal.currency)}
        </Text>
      ) : null}
    </TouchableOpacity>
  )
}
