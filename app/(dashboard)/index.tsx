// app/(dashboard)/index.tsx
//
// Dashboard real (T-4.2). Carga en paralelo:
//   - Transactions de los últimos 60 días con category join
//   - Budgets con spent calculado (BudgetWithSpent[])
//   - Exchange rates (cacheadas via useExchangeRates)
//
// Compone: SummaryCards · AccumulatedBalanceChart · ExpensesByCategoryChart
//          · RecentTransactions · ActiveBudgets
//
// Refresh on focus con useFocusEffect — al volver al tab se actualiza.
import { useCallback, useMemo, useState } from 'react'
import { ScrollView, View, Text, ActivityIndicator } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from '@/context/AuthContext'
import { useExchangeRates } from '@/hooks/useExchangeRates'
import { getTransactions } from '@/lib/actions/transactions.actions'
import { getBudgets } from '@/lib/actions/budgets.actions'
import {
  buildBalanceTimeSeries,
  buildCategoryAggregates,
  currentMonthPrefix,
} from '@/lib/utils/dashboard'
import { SummaryCards } from '@/components/dashboard/SummaryCards'
import { RecentTransactions } from '@/components/dashboard/RecentTransactions'
import { ActiveBudgets } from '@/components/dashboard/ActiveBudgets'
import { AccumulatedBalanceChart } from '@/components/charts/AccumulatedBalanceChart'
import { ExpensesByCategoryChart } from '@/components/charts/ExpensesByCategoryChart'
import type {
  BudgetWithSpent,
  TransactionWithCategory,
} from '@/types/database.types'

const MONTH_LABEL = (() => {
  const d = new Date()
  return d
    .toLocaleDateString('es', { month: 'long', year: 'numeric' })
    .replace(/^\w/, (c) => c.toUpperCase())
})()

export default function DashboardScreen() {
  const { user } = useAuth()
  const { rates } = useExchangeRates()
  const [transactions, setTransactions] = useState<TransactionWithCategory[]>([])
  const [budgets, setBudgets] = useState<BudgetWithSpent[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    if (!user) return
    const [txRes, budgetsRes] = await Promise.all([
      // 60 días alcanza para el chart de 30 + las 5 recientes + un buffer
      getTransactions(
        user.id,
        {
          month: undefined, // sin filtro de mes — el client filtra el rango por fecha
        },
        { page: 1, pageSize: 200 }
      ),
      getBudgets(user.id),
    ])

    if (txRes.success && txRes.data) {
      setTransactions(txRes.data.items)
    }
    if (budgetsRes.success && budgetsRes.data) {
      setBudgets(budgetsRes.data)
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

  // Derivados — recomputados solo cuando cambian inputs
  const monthPrefix = useMemo(() => currentMonthPrefix(), [])
  const preferredCurrency = user?.preferred_currency ?? 'COP'

  const balanceSeries = useMemo(
    () =>
      buildBalanceTimeSeries(transactions, {
        days: 30,
        targetCurrency: preferredCurrency,
        rates,
      }),
    [transactions, preferredCurrency, rates]
  )

  const categoryAggregates = useMemo(
    () =>
      buildCategoryAggregates(transactions, {
        targetCurrency: preferredCurrency,
        rates,
        month: monthPrefix,
      }),
    [transactions, preferredCurrency, rates, monthPrefix]
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
        <Text className="text-white text-xl font-bold">Dashboard</Text>
        <Text className="text-muted text-xs mt-0.5">
          {user?.name ? `Hola, ${user.name}` : MONTH_LABEL} · {MONTH_LABEL}
        </Text>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 20 }}
      >
        <SummaryCards
          transactions={transactions}
          month={monthPrefix}
          preferredCurrency={preferredCurrency}
          exchangeRates={rates}
        />

        <AccumulatedBalanceChart
          data={balanceSeries}
          title="Flujo del mes"
          subtitle={`Últimos 30 días · ${preferredCurrency}`}
        />

        <ExpensesByCategoryChart
          data={categoryAggregates}
          currency={preferredCurrency}
          title="Gastos por categoría"
          subtitle={MONTH_LABEL}
        />

        <RecentTransactions transactions={transactions} limit={5} />

        <ActiveBudgets budgets={budgets} limit={3} />
      </ScrollView>
    </SafeAreaView>
  )
}
