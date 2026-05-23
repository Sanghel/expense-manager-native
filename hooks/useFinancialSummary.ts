import { useMemo } from 'react'
import type {
  TransactionWithCategory,
  Currency,
  ExchangeRate,
} from '@/types/database.types'

interface FinancialSummary {
  totalIncome: number
  totalExpense: number
  balance: number
  currency: Currency
  transactionCount: number
  incomeCount: number
  expenseCount: number
}

export function useFinancialSummary(
  transactions: TransactionWithCategory[],
  month?: string,
  preferredCurrency: Currency = 'COP',
  exchangeRates: ExchangeRate[] = []
) {
  const summary = useMemo<FinancialSummary>(() => {
    const filtered = month
      ? transactions.filter((t) => t.date.startsWith(month))
      : transactions

    const getRateMultiplier = (from: Currency, to: Currency): number => {
      if (from === to) return 1
      const rate = exchangeRates.find(
        (r) => r.from_currency === from && r.to_currency === to
      )
      return rate ? Number(rate.rate) : 1
    }

    const incomeTransactions = filtered.filter((t) => t.type === 'income')
    const expenseTransactions = filtered.filter((t) => t.type === 'expense')

    const income = incomeTransactions.reduce(
      (sum, t) =>
        sum + Number(t.amount) * getRateMultiplier(t.currency, preferredCurrency),
      0
    )

    const expense = expenseTransactions.reduce(
      (sum, t) =>
        sum + Number(t.amount) * getRateMultiplier(t.currency, preferredCurrency),
      0
    )

    return {
      totalIncome: income,
      totalExpense: expense,
      balance: income - expense,
      currency: preferredCurrency,
      transactionCount: filtered.length,
      incomeCount: incomeTransactions.length,
      expenseCount: expenseTransactions.length,
    }
  }, [transactions, month, preferredCurrency, exchangeRates])

  return { summary, loading: false }
}
