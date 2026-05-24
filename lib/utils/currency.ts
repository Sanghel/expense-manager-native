// lib/utils/currency.ts
import type { Currency } from '@/types/database.types'

/**
 * Formatea un monto con el código ISO de moneda (no el símbolo).
 *
 * Usamos `currencyDisplay: 'code'` porque la app maneja COP, USD y VES
 * en la misma pantalla — el símbolo `$` es ambiguo entre COP/USD y `Bs`
 * solo lo entienden usuarios de Venezuela. Con código ISO no hay duda:
 *
 *   formatCurrency(40000, 'COP') → "COP 40.000"
 *   formatCurrency(40, 'USD')    → "USD 40,00"
 *   formatCurrency(40, 'VES')    → "VES 40,00"
 *
 * Decimales:
 * - COP: 0 (los centavos colombianos no se usan en práctica)
 * - USD / VES: 2 (los centavos importan)
 */
export function formatCurrency(amount: number, currency: Currency): string {
  const fractionDigits = currency === 'COP' ? 0 : 2
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency,
    currencyDisplay: 'code',
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(amount)
}
