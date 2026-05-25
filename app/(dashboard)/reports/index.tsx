// app/(dashboard)/reports/index.tsx
//
// Pantalla de Reports — T-4.3. Renderiza los 3 charts (Accumulated /
// ExpensesByCategory / MonthlyComparison) con un selector de rango
// (1M / 3M / 6M / 1Y).
//
// Comparte fetch con el dashboard (getTransactions + useExchangeRates).
// Para rangos largos pedimos pageSize 500 — si el user tiene > 500 tx en
// el rango, el chart subestima.
import { useCallback, useMemo, useState } from 'react'
import { ScrollView, View, Text, ActivityIndicator, RefreshControl } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from '@/context/AuthContext'
import { useExchangeRates } from '@/hooks/useExchangeRates'
import { getTransactions } from '@/lib/actions/transactions.actions'
import {
  buildBalanceTimeSeries,
  buildCategoryAggregates,
} from '@/lib/utils/dashboard'
import {
  buildMonthlyAggregates,
  RANGE_DAYS,
  RANGE_MONTHS,
  RANGE_LABEL,
  type ReportRange,
} from '@/lib/utils/reports'
import { AccumulatedBalanceChart } from '@/components/charts/AccumulatedBalanceChart'
import { ExpensesByCategoryChart } from '@/components/charts/ExpensesByCategoryChart'
import { MonthlyComparisonChart } from '@/components/charts/MonthlyComparisonChart'
import { RangeSelector } from '@/components/reports/RangeSelector'
import { toast } from '@/components/ui/Toast'
import type { TransactionWithCategory } from '@/types/database.types'

export default function ReportsScreen() {
  const { user } = useAuth()
  const { rates } = useExchangeRates()
  const [transactions, setTransactions] = useState<TransactionWithCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [range, setRange] = useState<ReportRange>('3M')

  const loadData = useCallback(async () => {
    if (!user) return
    const res = await getTransactions(
      user.id,
      {},
      { page: 1, pageSize: 500 }
    )
    if (res.success && res.data) {
      setTransactions(res.data.items)
    } else if (!res.success) {
      toast.error(res.error ?? 'Error al cargar reportes')
    }
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

  const preferredCurrency = user?.preferred_currency ?? 'COP'

  const balanceSeries = useMemo(
    () =>
      buildBalanceTimeSeries(transactions, {
        days: RANGE_DAYS[range],
        targetCurrency: preferredCurrency,
        rates,
      }),
    [transactions, range, preferredCurrency, rates]
  )

  const categoryAggregates = useMemo(
    () =>
      buildCategoryAggregates(transactions, {
        targetCurrency: preferredCurrency,
        rates,
        // Sin filtro de mes — usamos todas las tx del fetch (los últimos
        // 500). El rango se interpreta visualmente con el subtítulo.
      }),
    [transactions, preferredCurrency, rates]
  )

  const monthlyAggregates = useMemo(
    () =>
      buildMonthlyAggregates(transactions, {
        months: RANGE_MONTHS[range],
        targetCurrency: preferredCurrency,
        rates,
      }),
    [transactions, range, preferredCurrency, rates]
  )

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
        <Text className="text-white text-xl font-bold">Reportes</Text>
        <Text className="text-muted text-xs mt-0.5">
          Análisis de los últimos {RANGE_LABEL[range]}
        </Text>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 20 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true)
              await loadData()
              setRefreshing(false)
            }}
            tintColor="#4F46E5"
          />
        }
      >
        <RangeSelector value={range} onChange={setRange} />

        <AccumulatedBalanceChart
          data={balanceSeries}
          title="Flujo acumulado"
          subtitle={`${RANGE_LABEL[range]} · ${preferredCurrency}`}
        />

        <MonthlyComparisonChart
          data={monthlyAggregates}
          title="Ingresos vs gastos"
          subtitle={`Últimos ${RANGE_MONTHS[range]} meses · ${preferredCurrency}`}
        />

        <ExpensesByCategoryChart
          data={categoryAggregates}
          currency={preferredCurrency}
          title="Gastos por categoría"
          subtitle={`Últimas ${transactions.length} transacciones`}
          limit={12}
        />
      </ScrollView>
    </SafeAreaView>
  )
}
