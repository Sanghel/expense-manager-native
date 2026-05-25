import { useCallback, useState } from 'react'
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native'
import { router, useFocusEffect } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from '@/context/AuthContext'
import { getReminders } from '@/lib/actions/reminders.actions'
import { EmptyState } from '@/components/ui/EmptyState'
import { toast } from '@/components/ui/Toast'
import type {
  ReminderFrequency,
  ReminderWithCategory,
} from '@/types/database.types'

const FREQUENCY_LABEL: Record<ReminderFrequency, string> = {
  once: 'Una vez',
  weekly: 'Semanal',
  monthly: 'Mensual',
  yearly: 'Anual',
}

const WEEKDAY_NAMES = [
  'Domingo',
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
]

const MONTH_NAMES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
]

function describeReminder(r: ReminderWithCategory): string {
  switch (r.frequency) {
    case 'once':
      return r.specific_date
        ? `El ${new Date(`${r.specific_date}T00:00:00`).toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' })}`
        : 'Una vez'
    case 'weekly':
      return r.day_of_week !== null && r.day_of_week !== undefined
        ? `Todos los ${WEEKDAY_NAMES[r.day_of_week]}`
        : 'Semanal'
    case 'monthly':
      return r.day_of_month
        ? `Día ${r.day_of_month} de cada mes`
        : 'Mensual'
    case 'yearly':
      return r.day_of_month && r.month_of_year
        ? `${r.day_of_month} de ${MONTH_NAMES[r.month_of_year - 1]}`
        : 'Anual'
  }
}

export default function RemindersScreen() {
  const { user } = useAuth()
  const [reminders, setReminders] = useState<ReminderWithCategory[]>([])
  const [loading, setLoading] = useState(true)

  const loadReminders = useCallback(async () => {
    if (!user) return
    const res = await getReminders(user.id)
    if (res.success && res.data) setReminders(res.data)
    else if (!res.success) toast.error(res.error ?? 'Error al cargar recordatorios')
    setLoading(false)
  }, [user])

  useFocusEffect(
    useCallback(() => {
      let cancelled = false
      ;(async () => {
        await loadReminders()
        if (cancelled) return
      })()
      return () => {
        cancelled = true
      }
    }, [loadReminders])
  )

  if (loading) {
    return (
      <View className="flex-1 bg-bg items-center justify-center">
        <ActivityIndicator color="#4F46E5" />
      </View>
    )
  }

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-bg">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-border">
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <Text className="text-primary text-base">← Volver</Text>
        </TouchableOpacity>
        <Text className="text-white text-base font-bold">Recordatorios</Text>
        <View style={{ width: 60 }} />
      </View>

      <FlatList
        data={reminders}
        keyExtractor={(r) => r.id}
        contentContainerStyle={
          reminders.length === 0 ? { flex: 1 } : { paddingVertical: 12 }
        }
        ListEmptyComponent={
          <EmptyState
            icon="🔔"
            title="Sin recordatorios"
            description="Toca + para crear tu primer recordatorio"
          />
        }
        renderItem={({ item }) => <ReminderCard reminder={item} />}
      />

      {/* FAB */}
      <TouchableOpacity
        onPress={() => router.push('/reminders/new')}
        activeOpacity={0.8}
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

function ReminderCard({ reminder }: { reminder: ReminderWithCategory }) {
  const inactive = !reminder.is_active
  // Avatar = icono + color de la categoría (mismo patrón que transacciones).
  // Fallback a campanita si el recordatorio no tiene categoría asignada.
  const hasCategory = !!reminder.category
  const avatarColor = reminder.category?.color ?? '#4F46E5'
  const avatarIcon = reminder.category?.icon ?? '🔔'

  return (
    <TouchableOpacity
      onPress={() => router.push(`/reminders/${reminder.id}`)}
      activeOpacity={0.7}
      className="mx-4 mb-3 bg-surface border border-border rounded-2xl p-4"
      style={{ opacity: inactive ? 0.5 : 1 }}
    >
      <View className="flex-row items-center">
        <View
          style={{ backgroundColor: avatarColor }}
          className="w-10 h-10 rounded-full items-center justify-center mr-3"
        >
          <Text className="text-xl">{avatarIcon}</Text>
        </View>
        <View className="flex-1">
          <Text className="text-white text-base font-semibold" numberOfLines={1}>
            {reminder.description}
          </Text>
          <Text className="text-muted text-xs mt-0.5" numberOfLines={1}>
            {hasCategory ? `${reminder.category!.name} · ` : ''}
            {describeReminder(reminder)} · {FREQUENCY_LABEL[reminder.frequency]}
          </Text>
        </View>
        {inactive ? (
          <View className="px-2 py-0.5 rounded-full bg-border">
            <Text className="text-muted text-xs">Pausado</Text>
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  )
}
