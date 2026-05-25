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
import { getSavingsGoals } from '@/lib/actions/savings.actions'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { EmptyState } from '@/components/ui/EmptyState'
import { ListLoadingSkeleton } from '@/components/ui/ListLoadingSkeleton'
import { toast } from '@/components/ui/Toast'
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

  if (loading) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 bg-bg">
        <View className="flex-row items-center justify-between px-4 py-3 border-b border-border">
          <View style={{ width: 60 }} />
          <Text className="text-white text-base font-bold">Metas de ahorro</Text>
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
        <Text className="text-white text-base font-bold">Metas de ahorro</Text>
        <View style={{ width: 60 }} />
      </View>

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
            onRefresh={async () => {
              setRefreshing(true)
              await loadGoals()
              setRefreshing(false)
            }}
            tintColor="#4F46E5"
          />
        }
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
