// lib/utils/currency.ts
import type { Currency } from '@/types/database.types'

export function formatCurrency(amount: number, currency: Currency): string {
  if (currency === 'VES') {
    return `Bs ${amount.toLocaleString('es-VE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`
  }
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}
