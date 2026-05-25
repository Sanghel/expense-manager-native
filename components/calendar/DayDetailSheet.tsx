import { useMemo } from 'react'
import { View, Text, TouchableOpacity, ScrollView } from 'react-native'
import { router } from 'expo-router'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { formatCurrency } from '@/lib/utils/currency'
import type {
  ReminderWithCategory,
  TransactionWithCategory,
} from '@/types/database.types'

interface Props {
  visible: boolean
  onClose: () => void
  /** YYYY-MM-DD del día seleccionado, o null si nada. */
  dayIso: string | null
  /** Modo del sheet — determina qué render y qué CTA. */
  mode: 'transactions' | 'reminders'
  /** Items del día — el caller los filtra. */
  transactions?: TransactionWithCategory[]
  reminders?: ReminderWithCategory[]
}

function formatLongDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`)
  return d
    .toLocaleDateString('es', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
    .replace(/^\w/, (c) => c.toUpperCase())
}

/**
 * Bottom sheet con el detalle del día seleccionado en el calendario.
 * Reutiliza el [[Bottom Sheet (Modal-based)]] genérico.
 *
 * Dos modos:
 *   - 'transactions': lista las tx del día + botón "Crear tx aquí" que
 *     navega a /transactions/new (sin date pre-llenada por simplicidad —
 *     el form usa hoy por default).
 *   - 'reminders': lista los reminders que disparan en ese día + botón
 *     "Crear recordatorio aquí".
 */
export function DayDetailSheet({
  visible,
  onClose,
  dayIso,
  mode,
  transactions = [],
  reminders = [],
}: Props) {
  const items = mode === 'transactions' ? transactions : reminders

  const handleCreate = () => {
    onClose()
    setTimeout(() => {
      router.push(mode === 'transactions' ? '/transactions/new' : '/reminders/new')
    }, 250)
  }

  const handleItemPress = (id: string) => {
    onClose()
    setTimeout(() => {
      router.push(
        mode === 'transactions'
          ? (`/transactions/${id}` as const)
          : (`/reminders/${id}` as const)
      )
    }, 250)
  }

  const title = useMemo(() => (dayIso ? formatLongDate(dayIso) : ''), [dayIso])

  return (
    <BottomSheet visible={visible} onClose={onClose} maxHeightPercent={75}>
      <Text className="text-white text-lg font-bold mb-1">{title}</Text>
      <Text className="text-muted text-xs mb-3">
        {items.length === 0
          ? mode === 'transactions'
            ? 'Sin transacciones este día'
            : 'Sin recordatorios este día'
          : `${items.length} ${items.length === 1 ? 'item' : 'items'}`}
      </Text>

      <ScrollView
        className="max-h-80"
        contentContainerStyle={{ paddingBottom: 8 }}
        showsVerticalScrollIndicator={false}
      >
        {mode === 'transactions'
          ? transactions.map((tx, idx) => (
              <TouchableOpacity
                key={tx.id}
                onPress={() => handleItemPress(tx.id)}
                activeOpacity={0.7}
                className={`flex-row items-center py-3 ${
                  idx < transactions.length - 1 ? 'border-b border-border' : ''
                }`}
              >
                <View
                  style={{ backgroundColor: tx.category?.color ?? '#4F46E5' }}
                  className="w-9 h-9 rounded-full items-center justify-center mr-3"
                >
                  <Text className="text-base">{tx.category?.icon ?? '📂'}</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-white text-sm font-medium" numberOfLines={1}>
                    {tx.description}
                  </Text>
                  <Text className="text-muted text-xs mt-0.5">
                    {tx.category?.name ?? 'Sin categoría'}
                  </Text>
                </View>
                <Text
                  className={`text-sm font-semibold ${
                    tx.type === 'income' ? 'text-green-400' : 'text-red-400'
                  }`}
                >
                  {tx.type === 'income' ? '+' : '−'}{' '}
                  {formatCurrency(Number(tx.amount), tx.currency)}
                </Text>
              </TouchableOpacity>
            ))
          : reminders.map((r, idx) => {
              // Mismo patrón que ReminderCard y RecentTransactions:
              // avatar con icono+color de la categoría. Fallback 🔔
              // sobre fondo primary si no tiene categoría asignada.
              const avatarColor = r.category?.color ?? '#4F46E5'
              const avatarIcon = r.category?.icon ?? '🔔'
              return (
                <TouchableOpacity
                  key={r.id}
                  onPress={() => handleItemPress(r.id)}
                  activeOpacity={0.7}
                  className={`flex-row items-center py-3 ${
                    idx < reminders.length - 1 ? 'border-b border-border' : ''
                  }`}
                >
                  <View
                    style={{ backgroundColor: avatarColor }}
                    className="w-9 h-9 rounded-full items-center justify-center mr-3"
                  >
                    <Text className="text-base">{avatarIcon}</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-white text-sm font-medium" numberOfLines={1}>
                      {r.description}
                    </Text>
                    <Text className="text-muted text-xs mt-0.5">
                      {r.category ? `${r.category.name} · ` : ''}
                      {r.is_active ? '9:00 AM' : 'Pausado'}
                    </Text>
                  </View>
                </TouchableOpacity>
              )
            })}
      </ScrollView>

      <View className="mt-3">
        <PrimaryButton onPress={handleCreate}>
          {mode === 'transactions' ? 'Crear transacción' : 'Crear recordatorio'}
        </PrimaryButton>
      </View>
    </BottomSheet>
  )
}
