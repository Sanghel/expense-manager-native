// app/(dashboard)/calendar/index.tsx
//
// Calendario con 2 tabs (Transacciones / Recordatorios) usando
// react-native-calendars. Markers según el tab activo; tap día abre
// DayDetailSheet con la lista del día + botón de crear.
import { useCallback, useMemo, useState } from 'react'
import { View, Text, ActivityIndicator } from 'react-native'
import { Calendar, LocaleConfig } from 'react-native-calendars'
import { useFocusEffect } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from '@/context/AuthContext'
import { getTransactions } from '@/lib/actions/transactions.actions'
import { getReminders } from '@/lib/actions/reminders.actions'
import { CalendarHeader, type CalendarTab } from '@/components/calendar/CalendarHeader'
import { DayDetailSheet } from '@/components/calendar/DayDetailSheet'
import { reminderMatchesDate } from '@/lib/utils/reminderMatchesDate'
import { colors } from '@/constants/theme'
import type {
  ReminderWithCategory,
  TransactionWithCategory,
} from '@/types/database.types'

// ---------------------------------------------------------------------------
// Locale español para react-native-calendars
// ---------------------------------------------------------------------------
LocaleConfig.locales['es'] = {
  monthNames: [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
  ],
  monthNamesShort: [
    'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
    'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
  ],
  dayNames: [
    'Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado',
  ],
  dayNamesShort: ['D', 'L', 'M', 'M', 'J', 'V', 'S'],
  today: 'Hoy',
}
LocaleConfig.defaultLocale = 'es'

// Theme dark adaptado a los tokens del proyecto
const CALENDAR_THEME = {
  backgroundColor: colors.bg,
  calendarBackground: colors.bg,
  textSectionTitleColor: colors.muted,
  selectedDayBackgroundColor: colors.primary,
  selectedDayTextColor: '#fff',
  todayTextColor: colors.primary,
  dayTextColor: '#fff',
  textDisabledColor: '#3f3f46',
  arrowColor: colors.primary,
  monthTextColor: '#fff',
  textMonthFontWeight: 'bold' as const,
  textDayFontSize: 14,
  textMonthFontSize: 16,
}

function currentMonthIso(): string {
  // YYYY-MM-DD del primer día del mes actual
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

export default function CalendarScreen() {
  const { user } = useAuth()
  const [tab, setTab] = useState<CalendarTab>('transactions')
  const [loading, setLoading] = useState(true)
  const [transactions, setTransactions] = useState<TransactionWithCategory[]>([])
  const [reminders, setReminders] = useState<ReminderWithCategory[]>([])
  const [visibleMonth, setVisibleMonth] = useState<string>(currentMonthIso())

  const [selectedDay, setSelectedDay] = useState<string | null>(null)

  // Cargamos datasets completos al focus — el calendario es vista panorámica,
  // no se beneficia mucho de paginar por mes (los reminders no tienen filtro
  // de mes en backend y las tx son < 500 en general).
  const loadData = useCallback(async () => {
    if (!user) return
    const [txRes, remRes] = await Promise.all([
      getTransactions(user.id, {}, { page: 1, pageSize: 500 }),
      getReminders(user.id),
    ])
    if (txRes.success && txRes.data) setTransactions(txRes.data.items)
    if (remRes.success && remRes.data) setReminders(remRes.data)
    setLoading(false)
  }, [user])

  useFocusEffect(
    useCallback(() => {
      let cancelled = false
      ;(async () => {
        if (cancelled) return
        await loadData()
      })()
      return () => {
        cancelled = true
      }
    }, [loadData])
  )

  // ---------------------------------------------------------------------------
  // markedDates por tab
  // ---------------------------------------------------------------------------
  /**
   * Para transacciones: multi-dot por día con el color de cada categoría
   * presente. Si hay más de 4 categorías distintas en el día, mostramos las
   * primeras 4 (react-native-calendars limita visualmente igual).
   */
  const transactionMarkers = useMemo(() => {
    const map: Record<string, { dots: { color: string; key: string }[] }> = {}
    for (const tx of transactions) {
      const date = tx.date.slice(0, 10)
      if (!map[date]) map[date] = { dots: [] }
      const color = tx.category?.color ?? '#4F46E5'
      const key = tx.category?.id ?? 'sin-cat'
      // Evitar duplicar dots de la misma categoría en el mismo día
      if (!map[date].dots.find((d) => d.key === key)) {
        if (map[date].dots.length < 4) {
          map[date].dots.push({ color, key })
        }
      }
    }
    return map
  }, [transactions])

  /**
   * Para reminders: dots por día donde algún reminder activo dispara.
   * Filtramos solo los activos. Iteramos los días visibles del mes (suficiente
   * para una vista mensual — para anuales recordatorios futuros también
   * marcamos su día del mes actual).
   */
  const reminderMarkers = useMemo(() => {
    const map: Record<string, { dots: { color: string; key: string }[] }> = {}
    if (!visibleMonth) return map
    const [year, month] = visibleMonth.split('-').map(Number)
    const daysInMonth = new Date(year, month, 0).getDate()
    const active = reminders.filter((r) => r.is_active)

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month - 1, day)
      const matching = active.filter((r) => reminderMatchesDate(r, date))
      if (matching.length === 0) continue
      const iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      map[iso] = {
        dots: matching.slice(0, 4).map((r) => ({
          color: r.category?.color ?? '#ec4899',
          key: r.id,
        })),
      }
    }
    return map
  }, [reminders, visibleMonth])

  const markedDates = tab === 'transactions' ? transactionMarkers : reminderMarkers

  // ---------------------------------------------------------------------------
  // Items del día seleccionado
  // ---------------------------------------------------------------------------
  const selectedDayTransactions = useMemo(() => {
    if (!selectedDay) return []
    return transactions.filter((t) => t.date.slice(0, 10) === selectedDay)
  }, [transactions, selectedDay])

  const selectedDayReminders = useMemo(() => {
    if (!selectedDay) return []
    const date = new Date(`${selectedDay}T00:00:00`)
    return reminders.filter((r) => r.is_active && reminderMatchesDate(r, date))
  }, [reminders, selectedDay])

  if (loading) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 bg-bg">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#4F46E5" />
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-bg">
      <View className="px-4 py-3 border-b border-border">
        <Text className="text-white text-xl font-bold">Calendario</Text>
      </View>

      <CalendarHeader value={tab} onChange={setTab} />

      <Calendar
        // Usamos la primera fecha del mes para que react-native-calendars
        // sepa qué mes mostrar inicialmente
        current={visibleMonth}
        markedDates={markedDates}
        markingType="multi-dot"
        firstDay={1}
        theme={CALENDAR_THEME}
        onDayPress={(day) => setSelectedDay(day.dateString)}
        onMonthChange={(month) => {
          setVisibleMonth(`${month.year}-${String(month.month).padStart(2, '0')}-01`)
        }}
        style={{
          backgroundColor: colors.bg,
        }}
      />

      <DayDetailSheet
        visible={selectedDay !== null}
        onClose={() => setSelectedDay(null)}
        dayIso={selectedDay}
        mode={tab}
        transactions={selectedDayTransactions}
        reminders={selectedDayReminders}
      />
    </SafeAreaView>
  )
}
