import { insforge } from '@/lib/insforge'
import type { Currency, ExchangeRate } from '@/types/database.types'

/**
 * Funciones read-only para exchange rates. El cron job que actualiza las rates
 * (updateExchangeRates) vive en el backend — no se portea al native.
 *
 * Anon client puede SELECT en `exchange_rates` gracias a las RLS policies.
 */

interface Result<T> {
  success: boolean
  data?: T
  error?: string
}

/**
 * Devuelve las últimas 20 rates ordenadas por fecha descendente.
 * Útil para debug o un panel admin de estado de rates.
 */
export async function getLatestRates(): Promise<Result<ExchangeRate[]>> {
  try {
    const { data, error } = await insforge.database
      .from('exchange_rates')
      .select('*')
      .order('date', { ascending: false })
      .limit(20)

    if (error) throw error
    return { success: true, data: (data ?? []) as ExchangeRate[] }
  } catch {
    return { success: false, error: 'Failed to fetch rates' }
  }
}

/**
 * Devuelve la última rate por cada par de currencies que la app maneja.
 * 6 pares totales (USD↔COP, USD↔VES, VES↔COP en ambas direcciones).
 *
 * Es lo que el hook useExchangeRates va a cachear en memoria.
 */
export async function getAllRatePairs(): Promise<Result<ExchangeRate[]>> {
  try {
    const pairs: Array<{ from: Currency; to: Currency }> = [
      { from: 'USD', to: 'COP' },
      { from: 'COP', to: 'USD' },
      { from: 'VES', to: 'COP' },
      { from: 'COP', to: 'VES' },
      { from: 'USD', to: 'VES' },
      { from: 'VES', to: 'USD' },
    ]

    const results = await Promise.all(
      pairs.map(({ from, to }) =>
        insforge.database
          .from('exchange_rates')
          .select('*')
          .eq('from_currency', from)
          .eq('to_currency', to)
          .order('date', { ascending: false })
          .limit(1)
          .maybeSingle()
      )
    )

    const rates = results
      .map((r) => r.data)
      .filter((r): r is ExchangeRate => r != null)

    return { success: true, data: rates }
  } catch {
    return { success: false, error: 'Failed to fetch rate pairs' }
  }
}

/**
 * Convierte un monto de una moneda a otra usando la última rate disponible.
 * Si las monedas son iguales, devuelve el monto sin cambios.
 * Si no encuentra rate, devuelve el monto sin cambios (no falla — degradación graceful).
 */
export async function convertCurrency(
  amount: number,
  from: Currency,
  to: Currency
): Promise<number> {
  if (from === to) return amount

  try {
    const { data, error } = await insforge.database
      .from('exchange_rates')
      .select('rate')
      .eq('from_currency', from)
      .eq('to_currency', to)
      .order('date', { ascending: false })
      .limit(1)
      .single()

    if (error || !data) return amount

    return amount * Number((data as { rate: number }).rate)
  } catch {
    return amount
  }
}
